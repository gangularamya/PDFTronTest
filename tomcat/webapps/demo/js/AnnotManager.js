function AnnotManager() {
    var connection = null;
    var g_watch_func = null;
    var docId = null;

    function updateAnnotations(data) {
        var annotationManager = window.myWebViewer.getInstance().docViewer.getAnnotationManager();
        for (var i = 0; i < data.length; ++i) {
            var annot = data[i];
            switch(annot.at) {
                case 'create':
                    if (!window.authors[annot.author]) {
                        window.authors[annot.author] = annot.aName;
                    }

                    var annotation = annotationManager.importAnnotCommand(annot.xfdf)[0];
                    annotation.authorId = annot.author;
                    annotationManager.redrawAnnotation(annotation);
                    window.myWebViewer.getInstance().fireEvent('updateAnnotationPermission', [annotation]);
                    break;
                case 'modify':
                    var annotation = annotationManager.importAnnotCommand(annot.xfdf)[0];
                    annotationManager.redrawAnnotation(annotation);
                    break;
                case 'delete':
                    var command = '<delete><id>' + annot.aId + '</id></delete>';
                    annotationManager.importAnnotCommand(command);
                    break;
            }
        }
    }

    function initiateCollaboration(docId) {
        if (!docId) {
            console.error("Document ID required for collaboration");
            return;
        }

        function openConnection() {
            var target = window.WebSocket ? '/demo/wsannot' : '/demo/pf';
            connection = ConnectionService(g_url_root, target);
            watchAnnotations(docId);
            var onOpen = function() {
                var request = { t: "a_retrieve", dId: docId };
                connection.send(request);
                $('.topbar').removeClass('hideshare');
            };

            var onMessage = function (event) {
                if (event.t && event.t.startsWith('a_') && event.data) {
                    updateAnnotations(event.data);
                }
            }

            var onClose = function () {
                clearUser();
                $('.topbar').addClass('hideshare');
            }

            connection.startConnection(onOpen, onMessage, onClose);
        }

        getAndSetUser(openConnection);
    }

    function disableCollaboration() {
        g_watch_func = null;
        connection.close();
    }

    function pushAnnotations(annotationData) {
        connection.send(annotationData);
    }

    function watchFunc(e, annotations, type){
        if(g_watch_func)
        {
            g_watch_func(e, annotations, type);
        }
    }

    // Watches for annotation changes from the user side, if the user authors or changes a new annotations
    // this will trigger and create/delete/update the annotation on the server.
    function watchAnnotations(documentId) {
        var annotationManager = window.myWebViewer.getInstance().docViewer.getAnnotationManager();
        var new_watch_func = function(e, annotations, type) {
            // if the annotation is not created by the user, ignore it (the server polling call will
            // have inserted them already)
            if (e.imported) {
                return;
            }

            var annotData = {
                t: "a_" + type,
                dId: documentId,
                annots: [] 
            };

            var xfdf = annotationManager.getAnnotCommand();
            var parsedXfdf;
            var serializer;
            if (type !== 'delete') {
                parsedXfdf = new DOMParser().parseFromString(xfdf, 'text/xml')
                serializer = new XMLSerializer();
            }

            annotations.forEach(function(annotation) {
                if (type === 'add') {
                    var xfdfAnnotData = parsedXfdf.querySelector('[name="' + annotation.Id + '"]');
                    var rawXfdf = serializer.serializeToString(xfdfAnnotData);
                    var parentAuthorId = null;

                    if (annotation.InReplyTo) {
                        var parentAuthorId = annotationManager.getAnnotationById(annotation.InReplyTo).authorId || 'default';
                    }
                    annotData.annots.push({ 
                        at: "create",
                        aId: annotation.Id, 
                        author: window.userId,
                        aName: window.authors[window.userId],
                        parent: parentAuthorId, 
                        xfdf: '<add>' + rawXfdf + '</add>'
                    }); 
                } else if (type === 'modify'){
                    var xfdfAnnotData = parsedXfdf.querySelector('[name="' + annotation.Id + '"]');
                    var rawXfdf = serializer.serializeToString(xfdfAnnotData);
                    annotData.annots.push({ at: "modify", aId: annotation.Id, xfdf: '<modify>' + rawXfdf + '</modify>' });
                } else if (type === 'delete') {
                    annotData.annots.push({ at: "delete", aId: annotation.Id });
                }

            });

            if (annotData.annots.length > 0) {
                pushAnnotations(annotData);
            }
        }
        if(!g_watch_func)
        {
            annotationManager.on('annotationChanged', watchFunc);
        }
        g_watch_func = new_watch_func;
    }

    return {
        initiateCollaboration: initiateCollaboration,
        disableCollaboration: disableCollaboration
    };
}
