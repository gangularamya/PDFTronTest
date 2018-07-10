var g_drop_target_icon = "cloud-upload"
var g_url_root = joinPaths(window.location.origin, "/");
var demo_loc = window.location.pathname.indexOf("/demo", 0)
if (demo_loc !== 0) {
    g_url_root = joinPaths(g_url_root, window.location.pathname.substring(0, demo_loc), "/");    
}

var g_api_root = joinPaths(g_url_root, "demo/");
var g_data_root = joinPaths(g_url_root, "data/");
var g_id_map = {};
var g_last_id = 1;
var g_uploads = {};
var g_doc_uri_obj_map = {};
var g_doc_thumb_name_map = {};
var g_recent_list = [];
var g_max_recent_list = 10;
var g_doc_thumb_list = {};
var g_doc_thumb_counter = 1;
var g_file_picker_armed = false;
var g_doc_manager = DocManager();
var g_viewer_page = ViewerPage();
var g_annot_manager = AnnotManager();
var last_selected = null;
var first_doc = null;
var g_current_doc_obj = null;
var g_doc_initial_load_complete = false;
var g_use_blackbox_interface = true;

$.ajaxSetup({
    xhrFields: {
        withCredentials: true
    }
});

window.g_doc_manager = g_doc_manager;
function DisplayIcons(element, icons)
{
    if(!element)
    {
        return;
    }
    if(icons.length >= 5)
    {
        icons = ["files-o"];
    }
    for (var i = 0; i < icons.length; i++) {
        icons[i] = '<i class="fa fa-' + icons[i] + ' bigicon"></i>'
            + '<i class="fa fa-' + icons[i] + ' bigicon overlay"></i>';
    }
    if(icons.length > 0)
    {
        var new_icons = icons.join("<span class=\"iconsep\">&emsp;</span>");
        if(element.innerHTML != new_icons)
        {
            element.innerHTML = new_icons;
        }

    }
}

function SetupDropTarget(drag_area, drop_el, icon_container, open_func, pre_open_func)
{
    var $drop = $(drop_el);

    var landing_drop_options = {
        enter_ok_func: function(icons){$drop.addClass('dragok anim'); DisplayIcons(icon_container, icons);},
        enter_bad_func: function(icons){$drop.addClass('dragbad anim'); DisplayIcons(icon_container, icons);},
        enter_maybe_func : function(icons){$drop.addClass('dragmaybe anim'); DisplayIcons(icon_container, icons);},
        leave_func: function(){
            $drop.removeClass('dragnotok dragok dragbad dragmaybe'); DisplayIcons(icon_container, [g_drop_target_icon]);
        },
        thumb_func: OnThumbComplete,
        pre_open_func: pre_open_func ? pre_open_func : NullFunc,
        open_func: open_func ? open_func : function(doc_obj){
            g_viewer_page.Show();
            OpenDoc(doc_obj);
        }
    }
    if (!isIE10) {
        g_doc_manager.AddDragHandler(drag_area, landing_drop_options);
    }
}

function RefreshRecentObj(doc_obj)
{
    if(!doc_obj)
    {
        return;
    }
    for (var i = 0; doc_obj && i < g_recent_list.length; ++i) {
        if(g_recent_list[i].uri == doc_obj.uri)
        {
            g_recent_list[i] = doc_obj;
            RenderRecentList();
            return;
        }
    }
}

function AddToRecentList(doc_obj)
{
    if(doc_obj && !(doc_obj.uri in g_doc_uri_obj_map))
    {
        g_doc_uri_obj_map[doc_obj.uri] = doc_obj;
    }
    if(g_recent_list.length > 0)
    {
        if(g_recent_list[g_recent_list.length -1] === null)
        {
            g_recent_list.pop();
        }
        else if(doc_obj && g_recent_list[g_recent_list.length -1].uri == doc_obj.uri)
        {
            return false;
        }
    }

    for (var i = 0; doc_obj && i < g_recent_list.length; ++i) {
        if(g_recent_list[i].uri == doc_obj.uri)
        {
            if(!doc_obj.thumb){
                doc_obj.thumb = g_recent_list[i].thumb;
            }
            g_recent_list.splice(i, 1);
        }
    }

    if(g_recent_list.length === g_max_recent_list)
    {
        g_recent_list.shift();
    }
    g_recent_list.push(doc_obj);
    var title_element = document.getElementById('topbar_landingrecentlist');
    title_element.innerHTML = doc_obj ? doc_obj.name : "";
    RenderRecentList();
    return true;
}

function selectDoc(doc) {
    var id = g_doc_thumb_name_map[doc];

    if (id === last_selected) {
        return;
    }

    if (last_selected !== null) {
        $('#' + last_selected).removeClass('active');
    }

    $('#' + id).addClass('active');
    last_selected = id;
    OpenDoc(g_doc_uri_obj_map[doc]);
}

function OnThumbComplete(doc_obj)
{
    displayInGallery([doc_obj]);
    RefreshRecentObj(doc_obj);
}

function displayInGallery(doc_list)
{
    var $ul = $('#thumbnails');
    var append = true;
    if(doc_list.length === 1)
    {
        append = false;
    }
    for(var i = 0; i < doc_list.length; i++){
        if(!doc_list[i].thumb)
        {
            continue;
        }
        //$('#sparethumb').remove();
        var doc_name = doc_list[i].name;
        var doc_id = doc_list[i].doc_id;
        var share_id = doc_list[i].share_id;
        var uri = doc_list[i].uri;
        var id = 'thumb' + g_doc_thumb_counter;
        if(uri in g_doc_thumb_name_map)
        {
            id = g_doc_thumb_name_map[uri];
            $('#'+id).remove();
        }
        else{
            g_doc_thumb_name_map[uri] = id;
            ++g_doc_thumb_counter;
        }
        g_doc_uri_obj_map[uri] = doc_list[i];
        var element = '<img class="thumb selectionglow" src="' + g_data_root
                + (doc_list[i].thumb ? doc_list[i].thumb: 'Thumbs/waiting_thumb.png')
                + '" alt="">';
        var $element = $(element);

        var $thumbContainer = $('<div id="' +id + '"class="thumb-container" onclick="selectDoc(\'' + uri + '\')"></div>');
        $thumbContainer.append($element);

        var $docName = $('<div class="gallery-doc-name" title="' + doc_name + '">' + doc_name + '</div>');
        $thumbContainer.append($docName);

        if(doc_list.length === 1)
        {
            $ul.prepend($thumbContainer);
        }
        else
        {
            $ul.append($thumbContainer);
        }

    }
}

function RenderRecentList()
{
    var element = document.getElementById("landingrecentlist");
    element.onchange = null;
    var string_list = []
    string_list.push('<div class="recenttitle" id="recenttitle">Recently opened files</div>');
    for (i = g_recent_list.length - 1; i >= 0; i--) {
        if(g_recent_list[i] === null)
        {
            continue;
        }
        var doc_obj = g_recent_list[i];
        string_list.push('<div class="flexrow recentitem" index="'+ i +'">'
        + '<div class="recentspacer"></div>'
        +'<div class="col text">'
        +'<div class="recentname">'
        +doc_obj.name+'</div></div>'
        +'<div class="thumbnail">'
        +(doc_obj && doc_obj.thumb ? '<img src="' + g_data_root + doc_obj.thumb+'"/>' : "")
        +'</div>'
        +'<div class="recentoverlay"></div></div>');
    }
    element.innerHTML = string_list.join('');
    $(".recentitem .text, .recentitem .thumbnail").click(OnRecentListSelect);
}

function OnRecentListSelect(evt)
{
    var parent_el = evt.currentTarget.parentNode;
    var index = parseInt(parent_el.getAttribute("index"));
    document.getElementById("settingsrightpanel").scrollTop = 0;
    g_landing_page.Hide(true);
    OpenDoc(g_recent_list[index]);
    ClearProgressOverlay();
}

function SetProgress(fraction, percent_text)
{
    document.getElementById("progresstext").innerHTML = "Uploading: " + percent_text;
}

function NullFunc(){}
function PushState(doc_obj)
{
    if(g_disable_state_push)
    {
        return;
    }
    var params = "?o=" + g_viewer_page.GetFlags()
        + (doc_obj ? ("&doc=" + encodeURIComponent(doc_obj.uri)) : "")
        + (doc_obj ? ("&share=" + encodeURIComponent(doc_obj.share_id)) : "")
        + (!g_use_blackbox_interface ? "&bbi=true" : "");
    history.pushState(doc_obj, doc_obj ? doc_obj.name : "WebViewer", params);
}

function ReplaceState(doc_obj)
{
    var params = "?o=" + g_viewer_page.GetFlags()
        + (doc_obj ? ("&doc=" + encodeURIComponent(doc_obj.uri)) : "")
        + (doc_obj ? ("&share=" + encodeURIComponent(doc_obj.share_id)) : "");
    history.replaceState(doc_obj, doc_obj ? doc_obj.name : "WebViewer", params);
}


var g_state_pusher = PushState;
var g_disable_state_push = false;

function ClearProgressOverlay(){
    $("#overlay,#uploadprogress").addClass("notshown");
    $("#droptarget").removeClass("notshown");
}

function OpenDoc(doc_obj)
{
    if(!doc_obj)
    {
        g_current_doc_obj = null;

        if(window.document.wvCloseDoc)
        {
            window.document.wvCloseDoc();
            AddToRecentList(null);
            $("#overlay,#droptarget").removeClass("notshown");
            $("#overlay").removeClass("hasdoc");
        }
        return;
    }
    if(!doc_obj.name)
    {
        return;
    }

    if(g_current_doc_obj && doc_obj.uri == g_current_doc_obj.uri)
    {
        $("#overlay,#uploadprogress").addClass("notshown");
        $("#droptarget").removeClass("notshown");
        g_state_pusher(doc_obj);
        return;
    }
    AddToRecentList(doc_obj);
    setTimeout(ClearProgressOverlay, 1000)

    g_doc_uri_obj_map[doc_obj.uri] = doc_obj;

    g_state_pusher(doc_obj); // add current doc to URL and browser history
    var options = {
        documentId: doc_obj.doc_id,
        filename: doc_obj.name
    };
    g_current_doc_obj = doc_obj;

    var uri = g_use_blackbox_interface ? doc_obj.uri : g_api_root + 'ViewDocument.jsp?file='+encodeURIComponent(doc_obj.uri);
    window.myWebViewer.loadDocument(uri, options);
}

function PopulateDocList(doc_list)
{
    var existing =  g_recent_list.slice(0);
    var avail = g_max_recent_list - g_recent_list.length;
    if(avail > 0)
    {
        g_recent_list = doc_list.slice(Math.max(0, doc_list.length-avail), doc_list.length);
        for (var i = 0; i < g_recent_list.length; i++) {
            g_doc_uri_obj_map[g_recent_list[i].uri] = g_recent_list[i];
        }
    }

    var list_rendered = false;
    for (var i = 0; i < existing.length; i++) {
        list_rendered |= AddToRecentList(existing[i]);
    }

    if(!list_rendered)
    {
        RenderRecentList();
    }

    displayInGallery(doc_list);
    //selectDoc(first_doc);
}

function InitWV()
{
    g_use_blackbox_interface = g_use_blackbox_interface && !GetQueryVariable('bbi');
    var viewerElement = document.getElementById('viewer');
    var my_url = g_url_root;

    // for wv config to use
    document.trnCloseDoc = function(){
        OpenDoc(null);
    }

    var options = {
        type: "html5",
        documentType: 'xod',
        path: 'WebViewer/lib',
        mobileRedirect: false,
        enableAnnotations: true,
        serverUrl: null,
        streaming: "range",
        l: 'demo:demo@pdftron.com:73b0e0bd01e77b55b3c29607184e8750c2d5e94da67da8f1d0',
        config: "js/basic-wv-config.js"
    };
    if(g_use_blackbox_interface){
        options.pdftronServer = g_use_blackbox_interface ? my_url : null;
    }
    window.myWebViewer = new PDFTron.WebViewer(options, viewerElement);
    // make sure this is always the right height -- 100% is not quite reliable
    // because of the flexbox growth
    var iframe = viewerElement.querySelector('iframe');
    iframe.setAttribute('height', 'auto');
    iframe.style.flex = 1;
    iframe.style.display = 'flex';
    
    var initial_uri = GetQueryVariable('doc');
    var initial_share_id = GetQueryVariable('share');

    var on_viewer_ready = function(){
        var clickfunc = function(e) {
            e.stopPropagation();
            $('#fileinput').click();
        }
        $('#uploadbutton').on("touchend click", clickfunc);
    };
    if(initial_uri)
    {
        var doc_obj = null;
        var viewer_ready = false;

        var open_when_ready = function(){
            if(doc_obj && viewer_ready)
            {
                OpenDoc(doc_obj);
                first_doc = doc_obj.uri;
                g_doc_manager.GetServerDocListByAccess(PopulateDocList);
                g_landing_page.EnableButtons();
            }
        }
        var options = {
            open_func: function(new_doc_obj){
                doc_obj = new_doc_obj;
                open_when_ready();
            },
            share_id: initial_share_id ? decodeURIComponent(initial_share_id) : null
        };
        var ext = GetQueryVariable('ext');
        if(ext){
            options.ext = ext;
        }
        g_doc_manager.CreateFromURI(decodeURIComponent(initial_uri), options);

        // the div where webviewer will be rendered
        $('#viewer').bind("ready", function(){
            viewer_ready = true;
            on_viewer_ready()
            open_when_ready();
        });
    }
    else{
        $('#viewer').bind("ready", function(){
            $("#overlay").removeClass("notshown");
            AddToRecentList(null);
            g_doc_manager.GetServerDocListByAccess(PopulateDocList);
            on_viewer_ready();
            g_landing_page.EnableButtons();
        });
    }

    $('#viewer').bind('documentLoaded', function() {
        g_doc_initial_load_complete = true;
        $("#overlay").addClass("hasdoc");
        ClearProgressOverlay();
        // Call to initiate real time collab if annotations are enabled
        if (g_viewer_page.settings.collabEnabled === true) {
            g_annot_manager.initiateCollaboration(g_current_doc_obj.doc_id);
            g_viewer_page.EnableButtons();
        }
    });
}

function onFileInputChange(e) {
    var fileinput = document.getElementById("fileinput");
    var pre_net_func = function(){
        document.getElementById("progresstext").innerHTML = "Uploading...";
        $("#droptarget").addClass("notshown");
        $("#overlay,#uploadprogress").removeClass("notshown");
    }
    var options = {
        pre_request_func: pre_net_func,
        open_func: OpenDoc,
        thumb_func: OnThumbComplete,
        progress_func: SetProgress
    };
    g_doc_manager.CreateFromUpload(e.target.files[0], options);
}

var g_landing_page = LandingPage();
var options = GetQueryVariable('options') || GetQueryVariable('o');

if(GetQueryVariable("landing"))
{
    g_landing_page.Show();
}
else if(GetQueryVariable("settings") || GetQueryVariable("s"))
{
    g_landing_page.Show(true);
}

var overlay_el = document.getElementById("overlay");

document.trn_dragenter_handler = function(){
    console.log("showing from dragenter");
    $(overlay_el).removeClass("notshown");
};

document.trn_dragleave_handler = function(e){
    e.stopPropagation();
    e.preventDefault();
    if(overlay_el === e.target && (!e.relatedTarget || !$.contains(overlay_el, e.relatedTarget)))
    {
        if(g_current_doc_obj)
        {
            $(overlay_el).addClass("notshown");
        }
    }
}

$(overlay_el).on("dragleave", document.trn_dragleave_handler );

SetupDropTarget(document.getElementById("overlay"), document.getElementById("droptarget"), document.getElementById("droptargeticons"));

var fileinput = document.getElementById("fileinput");
fileinput.onchange = function (e, force) {
    onFileInputChange(e);
};

window.onpopstate = function(event){
    if(event && event.state && event.state.is_checkbox_obj)
    {
        g_landing_page.Show(event.state.is_standalone);
        return;
    }
    g_disable_state_push = true;
    g_landing_page.Hide();
    OpenDoc(event.state);
    ReplaceState(g_current_doc_obj);
    g_disable_state_push = false;
}

// This call starts webviewer in the viewer div.
InitWV();
