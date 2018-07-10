function ViewerPage() {
    var flags = checkFlags(GetQueryVariable('options') || GetQueryVariable('o'));
    var settings = {
        topbarEnabled: false,
        galleryEnabled: false,
        collabEnabled: false,
        annotsEnabled: true,
    };

    function copyLink() {
        var $temp = $('<input>');
        $("body").append($temp);
        $temp.val(window.location.href).select();
        document.execCommand("copy");
        $temp.remove();
        $('#clickthrough-overlay, #notification').removeClass('notshown');
        $("#notification").fadeOut(3000, function() {
            $('#clickthrough-overlay, #notification').addClass('notshown');
            $('#notification').fadeIn();
        });
    }

    function uploadUrl() {
        var pre_net_func = function(){
            document.getElementById("progresstext").innerHTML = "Uploading...";
            $("#droptarget").addClass("notshown");
            $("#overlay,#uploadprogress").removeClass("notshown");
        }
        //g_doc_manager.CreateFromUpload(e.target.files[0], pre_net_func, SetProgress, OpenDoc);
        var options = {
            pre_request_func: pre_net_func,
            open_func: OpenDoc,
            thumb_func: OnThumbComplete,
            progress_func: SetProgress
        };
        g_doc_manager.CreateFromURI(document.getElementById("uriinput").value, options);
    }

    function checkFlags(options) {
        options = options || "0000";
        var flags = { gallery: false, topbar: false, annots: false, collab: false };
        if (options === null || options === undefined) {
            return flags;
        }

        flags.gallery = options[0] === '1' ? true : false;
        flags.topbar = options[1] === '1' ? true : false;
        flags.annots = options[2] === '1' ? true : false;
        flags.collab = options[3] === '1' ? true : false;

        return flags;
    }

    function toggleGallery(val) {
        if(val === false) {
            $('#gallery').addClass('invisible');
            settings.galleryEnabled = false;
        } else {
            if ($('#gallery').hasClass('invisible')) {
                $('#gallery').removeClass('invisible');
            }
            settings.galleryEnabled = true;
        }
    }

    function toggleTopBar(val) {
        if(val === false) {
            $('#topbar').addClass('invisible');
            settings.topbarEnabled = false;
        } else {
            if ($('#topbar').hasClass('invisible')) {
                $('#topbar').removeClass('invisible');
            }
            settings.topbarEnabled = true;
        }
    }

    function toggleCollab(val) {
        settings.collabEnabled = val;
        if (g_doc_initial_load_complete === true) {
            if (val === true) {
                g_annot_manager.initiateCollaboration(g_current_doc_obj.doc_id);
                if (settings.annotsEnabled === false) {
                    toggleAnnotations(true);
                }
            } else {
                g_annot_manager.disableCollaboration();
                if (settings.annotsEnabled === true) {
                    toggleAnnotations(false);
                }
            }
        }
    }

    function toggleAnnotations(val) {
        settings.annotsEnabled = val;
        if (g_doc_initial_load_complete === true) {
            if (val === true) {
                window.showAnnotations();
            } else {
                window.hideAnnotations();
            }
        }
    }

    function getOptionsString() {
        return (settings.galleryEnabled ? "1" : "0")
            + (settings.topbarEnabled ? "1" : "0")
            + (settings.annotsEnabled ? "1" : "0")
            + (settings.collabEnabled ? "1" : "0");
    }

    function Show(gallery, topbar, collab, annots) {

        $("#vertcontainer").removeClass("invisible");
        $("#overlay").removeClass("invisible");

        if (gallery !== null && gallery !== undefined && gallery !== settings.galleryEnabled) {
            toggleGallery(gallery);
        }

        if (topbar !== null && topbar !== undefined && topbar !== settings.topbarEnabled) {
            toggleTopBar(topbar);
        }

        if (annots !== null && annots !== undefined && annots !== settings.annotsEnabled) {
            toggleAnnotations(annots);
        }

        if (collab !== null && collab !== undefined && collab !== settings.collabEnabled) {
            toggleCollab(collab);
        }
    }

    function EnableButtons() {
        $('#share-section').removeClass('notshown');
    }

    function Hide() {
        $('#vertcontainer').addClass('invisible');
        $('#overlay').addClass('invisible');

        $('#landingcontainer').removeClass('invisible');
        $('#landingpane').removeClass('invisible');
        $('#titlerow').removeClass('invisible');
    }

    $('#uploadurlic').click(function() {
        uploadUrl();
    });

    $('#uploadurlname').click(function() {
        uploadUrl();
    });

    $('.share #share-link-button').click(function() {
        copyLink();
    });

    $('#more-information').click(function() {
        window.open('https://www.pdftron.com/webviewer');
    });

    toggleGallery(flags.gallery);
    toggleTopBar(flags.topbar);
    settings.annotsEnabled = flags.annots;
    settings.collabEnabled = flags.collab;

    return {
        settings: settings,
        GetFlags: getOptionsString,
        Show: Show,
        Hide: Hide,
        EnableButtons: EnableButtons,
        toggleAnnotations: toggleAnnotations,
        toggleCollab: toggleCollab,
        toggleTopBar: toggleTopBar,
        toggleGallery: toggleGallery,
    }
}
