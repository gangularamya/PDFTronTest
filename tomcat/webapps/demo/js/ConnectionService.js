function ConnectionService(outerUrl, outerTarget) {
    function HttpConnection(constructorBaseURL, constructorTarget) {
        var xmlHttp;
        var baseURL = processBaseURL(constructorBaseURL);
        var thisID = 0;
        var idPromise = createPromiseCapability();
        var hasCloseSignal = false;
        var mDataCallback = null;
        var reqCounter = 0;

        function processBaseURL(inBaseURL) {
            var end = inBaseURL.lastIndexOf('/');
            if (end < 0) {
                end = inBaseURL.length;
            }
            return inBaseURL.slice(0, end);
        }

        function send(inData) {
            idPromiseFunc().then(function(connectionID) {
                var xmlHttp = new XMLHttpRequest();
                var url = baseURL + constructorTarget + '?id=' + connectionID;
                var formData = new FormData();
                formData.append('data', JSON.stringify(inData));
                xmlHttp.open('POST', url);
                xmlHttp.withCredentials = true;
                xmlHttp.send(formData);
            });
        }

        function idPromiseFunc() {
            if (idPromise) {
                return idPromise.promise;
            }
            return Promise.resolve(thisID);
        }

        function close() {
            resetID();
            hasCloseSignal = true;
            xmlHttp.close();
        }

        function dataToJsonChunks(inputJson) {
            var splitStrings = inputJson.split('\n');
            var last = splitStrings[splitStrings.length - 1];
            if (last) {
                splitStrings.pop();
            }
            // get rid of the trailing ]
            while (splitStrings.length > 0 && splitStrings[splitStrings.length - 1].length < 3) {
                if (splitStrings.pop() === ']') {
                    resetID();
                }
            }
            // or the leading [
            if (splitStrings.length > 0 && splitStrings[0].length < 3) {
                splitStrings.shift();
            }
            for (var i = 0; i < splitStrings.length; ++i) {
                if (splitStrings[i].endsWith(',')) {
                    splitStrings[i] = splitStrings[i].substr(0, splitStrings[i].length - 1);
                }
            }
            return splitStrings;
        }

        function processStrings(stringArray) {
            var data = null;
            for (var i = 0; i < stringArray.length; ++i) {
                data = JSON.parse(stringArray[i]);
                if (data && data['end']) {
                    close();
                } else if (data && data['hb'] && data['id'] === thisID) {
                    send({ 'hb': true });
                } else {
                    mDataCallback(data);
                }
            }
        }

        function resetID() {
            thisID = 0;
            if (!idPromise) {
                idPromise = createPromiseCapability();
            }
        }

        function resolveID(data) {
            thisID = data['id'];
            var prom = idPromise;
            idPromise = null;
            prom.resolve(thisID);
        }

        function onReadyStateChange(request, requestContext) {
            var thisSize;
            if (request.readyState >= 3 && !requestContext.done) {
                try {
                    thisSize = request.responseText.length;
                } catch (e) {
                    console.log('caught exception');
                    // send({t:"ignore", except:true});
                    return;
                }
                if (thisSize > 0) {
                    // send({t:"ignore", state:request.readyState, size:thisSize});
                    try {
                        var stringArray = dataToJsonChunks(request.responseText);
                        if (thisID === 0 && stringArray.length > 0) {
                            resolveID(JSON.parse(stringArray.shift()));
                        }
                        processStrings(stringArray);
                        // send({t:"ignore", processed:true});
                    } catch (e) {
                        // send({t:"ignore", processex:e});
                    }
                }
                if (!hasCloseSignal) {
                    requestContext.done = true;
                    // send({t:"ignore", requestContext:requestContext});
                    fireOffRequest();
                } else {
                    // send({t:"ignore", closed:true});
                    mCloseCallback();
                    console.log('dead');
                }
            }
        }

        function fireOffRequest() {
            xmlHttp = new XMLHttpRequest();
            var url = baseURL + constructorTarget;
            if (thisID !== 0) {
                url += '?id=' + thisID + '&uc=' + reqCounter;
            } else {
                url += '?uc=' + reqCounter;
            }
            reqCounter++;
            xmlHttp.open('GET', url, true);
            xmlHttp.setRequestHeader('Cache-Control', 'no-cache');
            xmlHttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xmlHttp.withCredentials = true;
            var currentRequest = xmlHttp;
            var requestContext = {
                done: false
            };
            xmlHttp.onreadystatechange = function() {
                onReadyStateChange(currentRequest, requestContext);
            };

            xmlHttp.send();
        }

        function startConnection(openCallback, dataCallback, closeCallback) {
            mDataCallback = dataCallback;
            mCloseCallback = closeCallback;
            hasCloseSignal = false;
            resetID();
            fireOffRequest();
            openCallback();
            return Promise.resolve();
        }

        return {
            send: send,
            startConnection: startConnection,
            close: close
        };
    }

    function WebsocketConnection(constructorBaseURL, constructorTarget) {
        var wsPromise = createPromiseCapability();
        var wsClosePromise = null;
        var baseURL = wsBaseURL(constructorBaseURL);
        var mDataCallback = null;
        var mConnectionClosed = false;
        var mHasError = false;

        function wsBaseURL(inBaseURL) {
            var start = inBaseURL.indexOf('://');
            var protocol = 'ws://';
            if (start < 0) {
                start = 0;
            } else {
                if (start === 5) {
                    protocol = 'wss://';
                }
                start += 3;
            }
            var end = inBaseURL.lastIndexOf('/');
            if (end < 0) {
                end = inBaseURL.length;
            }
            return protocol + inBaseURL.slice(start, end);
        }

        function send(jsObject) {
            getWSPromise().then(function(ws) {
                if (mConnectionClosed && !mHasError) {
                    setTimeout(function() {
                        send(jsObject);
                    }, 1);
                } else if (mConnectionClosed) {
                    ws.send(JSON.stringify(jsObject));
                } else {
                    ws.send(JSON.stringify(jsObject));
                }
            });
        }

        function startConnection(onOpen, onMessage, onClose) {
            var startRet = createPromiseCapability();
            var outerRet = startRet;
            mDataCallback = onMessage;
            try {
                var initWS = new WebSocket(joinPaths(baseURL + constructorTarget));
                initWS.onopen = function() {
                    startRet.resolve();
                    startRet = null;
                    mConnectionClosed = false;
                    onOpen();
                    wsPromise.resolve(initWS);
                };
                initWS.onerror = function(err) {
                    mHasError = true;
                    mConnectionClosed = true;
                    if (startRet) {
                        startRet.reject(err);
                    }
                    if (wsClosePromise) {
                        wsClosePromise.reject();
                    }
                };
                initWS.onclose = function() {
                    wsPromise = createPromiseCapability();
                    mConnectionClosed = true;
                    onClose();
                    if (wsClosePromise) {
                        var ret = wsClosePromise;
                        wsClosePromise = null;
                        ret.resolve();
                    }
                };
                initWS.onmessage = function(message) {
                    if (message && message.data) {
                        var json = JSON.parse(message.data);
                        if (json['hb']) {
                            send({ 'hb': true });
                        } else if (json['end']) {
                            close();
                        } else {
                            mDataCallback(json);
                        }
                    }
                };
            } catch (e) {
                startRet.reject(e);
                startRet = null;
            }
            return outerRet.promise;
        }

        function getWSPromise() {
            if (mConnectionClosed && mDataCallback) {
                startConnection(mDataCallback);
            }
            return wsPromise.promise;
        }

        function close() {
            return getWSPromise().then(function(ws) {
                wsClosePromise = createPromiseCapability();
                ws.close();
                return wsClosePromise.promise;
            });
        }

        return {
            send: send,
            startConnection: startConnection,
            close: close
        };
    }

    if (window.WebSocket) {
      return WebsocketConnection(outerUrl, outerTarget);
    }

    return HttpConnection(outerUrl, outerTarget);
}

