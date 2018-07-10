window.authors = {};
function NullFunc(){};

var global_timer = {
    start: window.performance.timing.fetchStart,
    times: []
}

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(search, pos) {
        return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
    };
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(search, this_len) {
        if (this_len === undefined || this_len > this.length) {
            this_len = this.length;
        }
        return this.substring(this_len - search.length, this_len) === search;
    };
}

function joinPaths(){
    var lhs, rhs;
    var arr = [];
    arr[arguments.length-1] = null;
    var i = 0;
    if(arguments.length > 0) {
        rhs = arguments[i].endsWith('/') ? arguments[i].length - 1 : arguments[i].length;
        arr[i] = arguments[i].substring(0, rhs);
    }
    for (i = 1; i < arguments.length - 1; ++i) {
        lhs = arguments[i].startsWith('/') ? 1 : 0;
        rhs = arguments[i].endsWith('/') ? arguments[i].length - 1 : arguments[i].length;
        arr[i] = arguments[i].substring(lhs, rhs);
    }
    if(arguments.length > 1) {
        lhs = arguments[i].startsWith('/') ? 1 : 0;
        arr[i] = arguments[i].substring(lhs, arguments[i].length);
    }
    return arr.join('/');
}

function RestartTimer()
{
    global_timer.times = [];
    global_timer.start = Date.now();
}

function MarkTime(label){
    var time = Date.now();
    var timersLength = global_timer.times.length;
    var last = global_timer.start;

    if (timersLength > 0) {
        last = global_timer.times[timersLength - 1].time;
    }

    global_timer.times.push({label:label, time: time});
    console.log(label, ": ", (time - last));
}

MarkTime("Timer init");

function PrintTimes(){
    var str_array = [];
    var first_time = global_timer.start;
    var dif = 0;
    var last = 0;
    for (var i = 0; i < global_timer.times.length; i++) {
        dif = global_timer.times[i].time - first_time;

        str_array.push('<span>');
        str_array.push(global_timer.times[i].label);
        str_array.push(": ");
        str_array.push(''+ dif);
        str_array.push("ms (+" + (dif - last));
        str_array.push(')</span><br>');
        last = dif;
    }
    document.getElementById("timeoverlay").innerHTML = str_array.join('');
}

// polyfill for element.isConnected
(function (supported){
  if (supported) return;
  Object.defineProperty(window.Node.prototype, 'isConnected', {get: function() {
    return document.body.contains(this);
  }});

})('isConnected' in window.Node.prototype);

function getAndSetUser(cb) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.addEventListener("load", dataListener);
    xmlHttp.open("GET", joinPaths(g_api_root, "SessionInfo.jsp"));
    xmlHttp.withCredentials = true;
    xmlHttp.send();

    function dataListener() {
        if (xmlHttp.status === 200 && xmlHttp.responseText.length > 0) {
            try {
                var data = JSON.parse(xmlHttp.responseText);
                window.userId = data.id;
                window.authors[data.id] = data.user_name;
                window.myWebViewer.getInstance().docViewer.getAnnotationManager().setCurrentUser(data.id);
                var title_element = document.getElementById('user-header');
                title_element.innerHTML = data.user_name;
                cb();
            } catch (err) {
                console.error(err.message);
            }
        }
    }
}

function clearUser() {
    window.userId = null;
    window.authors = {};
    window.myWebViewer.getInstance().docViewer.getAnnotationManager().setCurrentUser('Guest');
    var title_element = document.getElementById('user-header');
    title_element.innerHTML = '';
}

function GetQueryVariable(a) {
    var b = window.location.search.substring(1);
    var c = b.split("&");
    for (var d = 0; d < c.length; d++) {
        var e = c[d].split("=");
        if (e[0] == a) {
            return e.length > 1 ? e[1] : true;
        }
    }
    return null;
}

function DoLog(thing)
{
    console.log(thing);
}
