function DocManager(){

var m_log_func = function(){};
var m_doc_name_obj_map = {};
var m_pdf_regex = /\/pdf/ig;
var m_word_regex = /(openxml.+word|\/msword)/ig;
var m_excel_regex = /openxml.+spreadsheet/ig;
var m_powerpoint_regex = /openxml.+presentation/ig;
var m_ppt_regex = /ms-powerpoint/ig;
var m_xls_regex = /ms-excel/ig;
var m_odf_regex = /opendocument/ig;
var m_image_regex = /image\//ig;
var m_allowed_files_regex = /(\/pdf|\/[\w\.]+openxml|image\/|opendocument|\/msword|ms-powerpoint|ms-excel)/ig;

function NullFunc(){}

function GetFileIcon(filetype)
{
    if(filetype.search(m_pdf_regex) != -1)
    {
        return "file-pdf-o";
    }
    else if(filetype.search(m_image_regex) != -1)
    {
        return "file-image-o";
    }
    else if(filetype.search(m_word_regex) != -1)
    {
        return "file-word-o";
    }
    else if(filetype.search(m_odf_regex) != -1)
    {
        return "file-text-o";
    }
    else if(filetype.search(m_powerpoint_regex) != -1)
    {
        return "file-powerpoint-o";
    }
    else if(filetype.search(m_ppt_regex) != -1)
    {
        return "file-powerpoint-o";
    }
    else if(filetype.search(m_excel_regex) != -1)
    {
        return "file-excel-o";
    }
    else if(filetype.search(m_xls_regex) != -1)
    {
        return "file-excel-o";
    }
    else if(filetype === "unknown")
    {
        return "question-circle-o";
    }
    return "frown-o";
}

function SetLogFunc(new_log_func)
{
    m_log_func = new_log_func;
}

function DocReference(in_obj)
{
    var dot_loc = in_obj.name.lastIndexOf(".");
    return {
        uri: in_obj.uri,
        name: in_obj.name,
        share_id: in_obj.share_id,
        ext: dot_loc > 0 ? in_obj.name.substring(dot_loc) : null,
        doc_id: in_obj.doc_id,
        thumb: in_obj.thumb ? in_obj.thumb : null
    };
}

function GetServerDocList(callback)
{
    GetServerDocListImpl(callback);
}

function GetServerSharedDocList(callback)
{
    GetServerDocListImpl(callback, {shared:true});
}

function GetServerDocListByAccess(callback)
{
    GetServerDocListImpl(callback, {sort:"access"});
}

function GetServerDocListImpl(callback, options)
{
    var params = {};
    if(options.sort)
    {
        params.sort = options.sort;
    }
    if(options.shared)
    {
        params.shared = 1;
    }
    $.ajax({
        url: joinPaths(g_api_root, 'ListFiles'),
        type: 'get',
        dataType: 'json',
        data: params,
        success: callback,
        error: function(xhr, textStatus, errorThrown) {
            console.log(textStatus);
        },
        async:true
    });
}

function AddDragHandler(element, options)
{
    options.enter_ok_func = options.enter_ok_func || NullFunc;
    options.enter_bad_func = options.enter_bad_func || NullFunc;
    options.enter_maybe_func = options.enter_maybe_func || NullFunc;
    options.leave_func = options.leave_func || NullFunc;
    options.open_func = options.open_func || NullFunc;
    options.error_func = options.error_func || NullFunc;
    options.pre_open_func = options.pre_open_func || NullFunc;
    options.thumb_func = options.thumb_func || null;
    options.progress_func = options.progress_func || SetProgress;

    var everything_ok = false;
    var $form = $(element);
    $form.on('drag dragend dragstart dragover dragenter dragleave drop', function(e) {
        e.stopPropagation();
        e.preventDefault();
    })
    .on('dragenter', function(e) {
        if (isIE10) {
            return;
        }
        var items = e.originalEvent.dataTransfer.items;
        var item_types = items ? [] : ["unknown"];
        var type = "";
        var ok_count = items ? 0 : 1;
        var bad_count = 0;
        var unknown_count = 0;
        for (var i = 0; items && i < items.length; i++) {
            if(items[i].kind == 'file')
            {

                type = items[i].type || "unknown";
                if(!items[i].type)
                {
                    ++unknown_count;
                    item_types.push(GetFileIcon(type));
                }
                else if(type.search(m_allowed_files_regex) != -1)
                {
                    ++ok_count;
                    item_types.push(GetFileIcon(type));
                }
                else
                {
                    ++bad_count;
                }
            }
        }
        if(ok_count > 0)
        {
            options.enter_ok_func(item_types);
            everything_ok = true;
        }
        else if(unknown_count > 0)
        {
            options.enter_maybe_func(item_types);
            everything_ok = false;
        }
        else
        {
            options.enter_bad_func(item_types);
            everything_ok = false;
        }
    })
    .on('dragleave dragend', function(e) {
        if(e.target === element)
        {
            if(!$.contains(element, e.relatedTarget) && (!e.relatedTarget || e.relatedTarget.isConnected))
            {
                options.leave_func();
            }
        }
    })
    .on('drop', function(e) {
        options.leave_func();
        if(!everything_ok)
        {
            return;
        }
        options.pre_open_func();
        document.getElementById("progresstext").innerHTML = "Uploading...";
        $("#droptarget").addClass("notshown");
        $("#overlay,#uploadprogress").removeClass("notshown");
        everything_ok = false;
        var droppedFiles = e.originalEvent.dataTransfer.files;
        for (var i = 0; i < droppedFiles.length; i++) {
            if(droppedFiles[i].type.search(m_allowed_files_regex) != -1)
            {
                CreateFromUpload(droppedFiles[i], options);
            }
        }
    });
}

function OptionStruct(in_obj)
{
    return {
        open_func: in_obj.open_func,
        pre_request_func: in_obj.pre_request_func || NullFunc,
        progress_func: in_obj.progress_func || NullFunc,
        error_func: in_obj.error_func || NullFunc,
        share_id: in_obj.share_id ? in_obj.share_id : null,
        ext: in_obj.ext || null,
        thumb_func: in_obj.thumb_func ? in_obj.thumb_func : null
    };
}

function CreateFromURI(uri, callbacks)
{
    var cb = OptionStruct(callbacks);
    if(!uri)
    {
        cb.error_func("empty URI");
        return;
    }
    if(uri in m_doc_name_obj_map)
    {
        cb.open_func(m_doc_name_obj_map[uri]);
        return;
    }

    var server_comm = function(){
        m_log_func("url ready for upload\n");

         var data = {uri:uri};
        if(cb.share_id)
        {
            data["share"] = cb.share_id;
        }
        if(cb.ext)
        {
            data["ext"] = cb.ext;
        }
        $.ajax({
        type: "POST",
        url: joinPaths(g_api_root, "UploadFromURI.jsp"),
        data: data,
        dataType: 'json',
        success: function (data) {
            var doc_obj = DocReference(data);
            cb.open_func(doc_obj);
            MakeThumbsLater(doc_obj, cb.thumb_func);
        },
        error: function(e){
            m_log_func("URI error!\n");
            cb.error_func(e);
        }
        });
    }

    // check if this is a valid URL before doing anything else.
    // actually don't, because we're going to run into CORS problems :(
    // (server is not sensitive to CORS, but the browser will often fail
    //  this request because of it)
    if(false && /https?:/.test(uri))
    {
        $.ajax({
            type: "HEADER",
            url: uri,
            success: function (data) {
                server_comm();
            },
            error: function(e){
                var error_code = e.statusCode;
                m_log_func("URI error!\n");
                cb.error_func(e);
            }
        });
    }
    else
    {
        server_comm();
    }

}

function CreateFromUpload(file, callbacks)
{
    var dot_loc = file.name.lastIndexOf(".");
    callbacks.ext = dot_loc > 0 ? file.name.substring(dot_loc) : null;
    var cb = OptionStruct(callbacks);
    if(file.name in m_doc_name_obj_map)
    {
        cb.open_func(m_doc_name_obj_map[file.name]);
        return;
    }
    cb.pre_request_func();
    var form = new FormData();
    form.append("file", file, file.name);
    m_log_func("File selected\n");
    $.ajax({
        type: "POST",
        url:joinPaths(g_api_root, "Upload.jsp" + (cb.ext ? ("?ext="+cb.ext) : "")),
        contentType: false, // results in multipart/form-data, with the correct boundary data settings
        data: form,
        processData: false,
        dataType: 'json',
        success: function (data) {
            var doc_obj = DocReference(data);
            cb.open_func(doc_obj);
            MakeThumbsLater(doc_obj, cb.thumb_func);
        },
        error: function(e){
            m_log_func("Upload error!\n");
            cb.error_func(e);
        },
        xhr: function(){
            var xhr = $.ajaxSettings.xhr() ;
            xhr.upload.onprogress = function(evt) {
                if (evt.total === 0) {
                    return;
                }
                var fraction = evt.loaded / evt.total;
                var percent_text = parseInt(fraction*100) + "." + parseInt(fraction * 0.1) % 10 + "%"
                cb.progress_func(fraction, percent_text);

                m_log_func("Upload progress: " + evt.loaded + " / "
                        + evt.total + " (" + percent_text + ")\n");
            };
            // set the onload event handler
            xhr.upload.onload = function(){
                m_log_func("File upload complete\n");
            };
            return xhr;
        }
    });
}

function MakeThumbsLater(doc_obj, callback, trial)
{
    if(!trial) {
        trial = 0;
        if(g_use_blackbox_interface) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open('GET', joinPaths(g_url_root, "blackbox/PreloadURL?url="
                + encodeURIComponent(doc_obj.uri) +"&ext=" + doc_obj.ext));
            xmlHttp.withCredentials = true;
            xmlHttp.send();
        }
    }
    if(trial > 4 ) {
        return;
    }
    if(!callback)
    {
        console.log("Skipping thumb generation, no callback");
        return;
    }
    setTimeout(function(){
        $.ajax({
            url: joinPaths(g_api_root, 'MakeThumbs.jsp'),
            type: 'get',
            dataType: 'json',
            cache: false,
            data: {
                uri: doc_obj.uri,
                share: doc_obj.share_id
            },
            success: function(doc_object) {
                if(!doc_object.thumb) {
                    MakeThumbsLater(doc_obj, callback, trial + 1);
                }
                else {
                    callback(doc_object);
                }
            },
            error: function(xhr, textStatus, errorThrown) {
                m_log_func("Thumbnail generation error: \n" + textStatus);
            },
            async:true
        });
    }, trial*1000 + 500);
}

return {
    CreateFromURI: CreateFromURI,
    CreateFromUpload: CreateFromUpload,
    SetLogFunc: SetLogFunc,
    GetServerDocList: GetServerDocList,
    GetServerDocListByAccess: GetServerDocListByAccess,
    GetServerSharedDocList : GetServerSharedDocList,
    AddDragHandler: AddDragHandler
};

}
