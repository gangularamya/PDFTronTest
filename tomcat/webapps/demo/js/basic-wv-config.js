(function() {
    function NullFunc(){}

    var parent_page = this.parent.document;
    var show_side_window = null;
    parent_page.wvCloseDoc = NullFunc;
    // Prevents server url message when implementing custom annotation solution.
    ReaderControl.config.serverURL = null;

    function CloseDoc(){
        var doc = current_viewer.getDocument();
        if(doc)
        {
            doc.unloadResources();
        }
        show_side_window = readerControl.getShowSideWindow();
        readerControl.setShowSideWindow(false);
        readerControl.closeDocument();
        readerControl.setShowSideWindow()
        parent_page.wvCloseDoc = NullFunc;
        $("#customclosegroup").remove();
    }

    $(document).on('documentLoaded', function(event) {
        if ($('#customclosegroup').length === 0) {
            $("#control .right-aligned").append('<div class="group" id="customclosegroup">'
                +'<span class="glyphicons remove closebutton"  title="Close Document"></span></div>');
            var $closebutton = $("span.closebutton");
            $closebutton.css("padding-right","1px");
            $closebutton.click(parent_page.trnCloseDoc);
        }

        if(show_side_window !== null && show_side_window !== readerControl.getShowSideWindow())
        {
            readerControl.setShowSideWindow(show_side_window);
        }
        current_viewer = readerControl.docViewer;
        parent_page.wvCloseDoc = CloseDoc;

        var annotManager = readerControl.docViewer.getAnnotationManager();

        function hideAnnotations() {
            $('#toggleNotesPanel').parent().hide();
            readerControl.showNotesPanel(false);
            $('#notesPanelWrapper').hide();
            readerControl.setToolMode(window.PDFTron.WebViewer.ToolMode.AnnotationEdit);
            readerControl.setReadOnly(true)
            annotManager.toggleAnnotations();
            $('.annotTool, #overflowTools').hide()
        }

        function showAnnotations() {
            annotManager.toggleAnnotations();
            $('.annotTool, #overflowTools').show();
            $('#toggleNotesPanel').parent().show();
            $('#notesPanelWrapper').show();
            readerControl.setReadOnly(false);
        }
        window.parent.hideAnnotations = hideAnnotations;
        window.parent.showAnnotations = showAnnotations;

    });
    if(parent_page.trn_dragenter_handler){
        $(document).on('dragenter', parent_page.trn_dragenter_handler);
    }

    $(document).on('viewerLoaded', function() {
        readerControl.userPreferences.showSideWindow = false;
        readerControl.docViewer.on('fitModeUpdated', function(e, fitMode) {
            if (fitMode !== readerControl.docViewer.FitMode.Zoom) {
                readerControl.docViewer.defaults.FitMode = fitMode;
            }
            else{
                readerControl.docViewer.defaults.FitMode = fitMode;
            }
        });

        readerControl.docViewer.on('zoomUpdated', function(e, zoom_level) {
            readerControl.docViewer.defaults.Zoom = zoom_level;
        });

        readerControl.docViewer.on('displayModeUpdated', function() {
            var displayMode = readerControl.docViewer.getDisplayModeManager().getDisplayMode();
            readerControl.docViewer.defaults.DisplayMode = displayMode;
        });
    });

    $(document).on('noteCreated', function(e, annotation, noteElement) {
        if (window.parent.authors && window.parent.authors[annotation.Author]) {
            var authorName = window.parent.authors[annotation.Author];
            $(noteElement).find('.noteAuthor').text(authorName);
        }
    });

})();
