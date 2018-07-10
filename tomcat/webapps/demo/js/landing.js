function LandingPage(docId, shareId){
	var m_log_func = function(){};
	var m_is_init = false;
	var m_buttons_init = false;
	var m_buttons_ok = false;
	var m_is_shown = false;
	var m_usage_poller = null;
	var m_current_doc_uri = null;
	var m_current_doc_share = null;
	var m_doc_is_incoming = false;
	var m_history_marked = false;
	var m_should_back_out = false;
	var m_uri_enabled = true;
	var m_pre_net_func = function(){
        document.getElementById("progresstext").innerHTML = "Uploading...";
        $("#droptarget").addClass("notshown");
        $("#overlay,#uploadprogress").removeClass("notshown");
        Hide();
    };
    var m_open_func = function(doc_obj){
    	Hide();
		OpenDoc(doc_obj);
    }

	var m_checkboxes = {
		is_standalone: false,
		is_checkbox_obj: true,
		feat_collab: true,
		feat_collab_user: true,
		feat_toolbar: true,
		feat_gallery: true,
		feat_annots_user: true,
		feat_annots: true
	};

	function InitImpl()
	{
		if(m_is_init)
		{
			return;
		}
		var storage = (typeof(Storage) !== "undefined") ? window.localStorage : null;

		$(".optionrow.landingrow .optiontarget").click(function(e){
			var selector = $(e.currentTarget.parentElement);
			if(selector.hasClass("collapsed"))
			{
				selector.removeClass("collapsed");
				if(storage && e.currentTarget.id) storage.setItem(e.currentTarget.id, "expanded");
			}
			else
			{
				selector.addClass("collapsed");
				if(storage && e.currentTarget.id) storage.setItem(e.currentTarget.id, "collapsed");
			}
		});
		function onFileInputChange(e) {
			m_doc_is_incoming = true;

		    var options = {
		        pre_request_func: m_pre_net_func,
		        open_func: m_open_func,
		        thumb_func: OnThumbComplete,
		        progress_func: SetProgress
		    };
		    g_doc_manager.CreateFromUpload(e.target.files[0], options);
		}
		var fileinput = document.getElementById("landingfileinput");
		fileinput.onchange = onFileInputChange;
		$(".featurecolumn .feature").click(function(event){
			ToggleFeature(event.currentTarget);
		});
		m_current_doc_uri = GetQueryVariable("doc") || null;
		m_current_doc_share = GetQueryVariable("share") || null;
		var opts = GetQueryVariable("o") || GetQueryVariable("options");
		ToggleFeature(document.getElementById("feat_gallery"));
		ToggleFeature(document.getElementById("feat_collab"));
		if(opts)
		{
			flags = {
				gallery: opts[0] === '1' ? true : false,
				toolbar: opts[1] === '1' ? true : false,
				annots: opts[2] === '1' ? true : false,
				collab: opts[3] === '1' ? true : false,
			};
			if(flags.gallery != m_checkboxes.feat_gallery) ToggleFeature(document.getElementById("feat_gallery"));
			if(flags.toolbar != m_checkboxes.feat_toolbar) ToggleFeature(document.getElementById("feat_toolbar"));
			if(flags.annots != m_checkboxes.feat_annots) ToggleFeature(document.getElementById("feat_annots"));
			if(flags.collab != m_checkboxes.feat_collab) ToggleFeature(document.getElementById("feat_collab"));
    	}
    	MarkHistory();
		GetServerInfo(ShowServerData);
		m_is_init = true;
		EnableButtons();
	}

	function Show(standalone)
	{
		if(m_is_shown)
		{
			return;
		}
		$("#landingcontainer").removeClass("invisible");
		$("#landingpane").addClass("standalone");
		$("#landingcontainer").addClass("standalone").bind("click", ClickOutsideStandalone);

		m_checkboxes.is_standalone = true;

		if(!m_is_init)
		{
			InitImpl();
		}
		if(!m_usage_poller)
		{
			CreateUsagePoller();
		}
		m_is_shown = true;
	}

	function PushState(doc_obj)
	{

	}

	function MarkHistory()
	{
		var uri_param =  m_checkboxes.is_standalone ? "?s" : "?landing=true";
		var label = m_checkboxes.is_standalone ? "Settings Page" : "Landing Page";
		history.replaceState(JSON.parse(JSON.stringify(m_checkboxes)), label, uri_param);
	}

	function Hide(doc_incoming)
	{
		if(!m_is_shown)
		{
			return;
		}

		if(m_usage_poller)
		{
			clearTimeout(m_usage_poller);
			m_usage_poller = null;
		}

		g_viewer_page.Show(m_checkboxes.feat_gallery,
			 m_checkboxes.feat_toolbar, m_checkboxes.feat_collab, m_checkboxes.feat_annots);
		if(!doc_incoming && !m_doc_is_incoming && !g_disable_state_push)
		{
			g_state_pusher(g_current_doc_obj);
		}
		m_doc_is_incoming = false;
		$("#landingcontainer").addClass("invisible").removeClass("standalone").unbind("click", ClickOutsideStandalone);
		$("#landingpane").addClass("standalone");
		m_checkboxes.is_standalone = false;
		m_is_shown = false;
	}

	function SelectTab(in_id)
	{
		$("div.menuselector").removeClass("selected");
		var start_i = in_id.indexOf("_")
		var id = in_id.slice(start_i+1);
		var storage = (typeof(Storage) !== "undefined") ? window.localStorage : null;
		if(id==="last"){
			id = "landingdroptarget";
			if(storage){
				id = storage.getItem("last-setting-menu") || id;
			}
		}
		else {
			if(storage) {
				storage.setItem("last-setting-menu", id);
			}
		}
		$("#left_"+id).addClass("selected");
		$(".hideable").addClass("notselected");
		$(".notselected .anim").removeClass("anim");
		$(document.getElementById(id)).removeClass("notselected anim");
	}

	function EnableButtons()
	{
		m_buttons_ok = true;
		if(!m_is_init || m_buttons_init)
		{
			return;
		}
		var clickfunc = function(e) {
			e.stopPropagation();
		    $("#landingfileinput").click();
		};
		$('#landinguploadbutton').on("touchend click", clickfunc).removeClass("disabled");

		$("#landinguributton").click(OnURIClick);
		$("#landinguriinput").on("input", OnURIText).on("keypress", function(e){
			if(e.originalEvent.key === "Enter")
			{
				OnURIClick();
			}
		});

		// initialize the state of the button
		OnURIText(null);

		$("#launchbutton").click(function(){
			Hide();
		});
		var land_target = document.getElementById("landingdroptarget");
		SetupDropTarget(land_target, land_target,
		document.getElementById("landingdroptargeticons"), m_open_func, function(){
		 	m_doc_is_incoming = true;
		 	Hide();
		});
		m_buttons_init = true;
	}

	function OnURIClick()
	{
		if(!m_uri_enabled)
		{
			return;
		}
		m_doc_is_incoming = true;
		var options = {
            pre_request_func: m_pre_net_func,
            open_func: m_open_func,
            thumb_func: OnThumbComplete,
            progress_func: SetProgress
        };
        var uri = document.getElementById("landinguriinput").value;
        if(!/^(https?|ftp|file):\/\//.test(uri)){
        	uri = "http://" + uri;
        }
        g_doc_manager.CreateFromURI(uri, options);
	}

	function OnURIText(e)
	{
		var is_ok = e !== null
			&& /^((https?|ftp|file):\/\/)?[\w\d$-_.+!*'(),]+(:\d+\/)?[\w]\.[\-A-Za-z0-9+&@#\/%=~_|]+$/.test(e.target.value);
		var uri_button_selector = $("#landinguributton");
		if(is_ok)
		{
			uri_button_selector.removeClass("disabled");
			m_uri_enabled = true;
		}
		else
		{
			uri_button_selector.addClass("disabled");
			m_uri_enabled = false;
		}
	}

	function ToggleFeature(element){
		var id = element.id;
		var current_val = m_checkboxes[id];
		var feat_name = id.slice(5, id.length);
		var gallery_user = m_checkboxes.feat_gallery_user;
		m_checkboxes[id] = !current_val;
		if(current_val)
		{
			$("#"+id+" .check")[0].innerHTML = "";
			$("svg ." + feat_name + "_line_color").addClass("fadeout");
			$("." + feat_name + "_line_color + .overidable" ).addClass("fadeout_overide");
			if(feat_name === "annots")
			{
				if(m_checkboxes.feat_collab)
				{
					ToggleFeature(document.getElementById("feat_collab"));
					m_checkboxes.feat_collab_user = true;
				}
				m_checkboxes.feat_annots_user = false;
			}
			else if(feat_name === "collab")
			{
				m_checkboxes.feat_collab_user = false;
				if(!m_checkboxes.feat_annots_user && m_checkboxes.feat_annots)
				{
					ToggleFeature(document.getElementById("feat_annots"));
				}
			}
		}
		else
		{
			$("#"+id+" .check")[0].innerHTML = '<i class="fa fa-check"></i>';
			$("svg ." + feat_name + "_line_color").removeClass("fadeout");
			$("." + feat_name + "_line_color + .overidable" ).removeClass("fadeout_overide");
			if(feat_name === "annots")
			{
				if(m_checkboxes.feat_collab_user && !m_checkboxes.feat_collab)
				{
					ToggleFeature(document.getElementById("feat_collab"));
				}
				m_checkboxes.feat_annots_user = true;
			}
			else if(feat_name === "collab")
			{
				if(!m_checkboxes.feat_annots)
				{
					ToggleFeature(document.getElementById("feat_annots"));
					m_checkboxes.feat_annots_user = false;
				}
				m_checkboxes.feat_collab_user = true;

			}
		}
	}

	function CreateUsagePoller()
	{
		m_usage_poller = setTimeout(UsagePollFunc, 2000);
	}

	function UsagePollFunc(){
		GetServerInfo( function(server_data){
			ShowUsageData(server_data.usage);
			CreateUsagePoller();
		}, "?usage=true");
	}

	function ShowUsageData(usage)
	{
		var el = document.getElementById("info_process_load");
		if(el && usage.process_load)
		{
			var usage_num = Math.random()*0.05*usage.process_load + 0.95*usage.process_load;
			el.innerHTML =  (usage_num*100).toFixed(3) +"%";
			$("#cpuusagebar").width((usage_num*100).toFixed(1)+"%");
		}
		var el = document.getElementById("info_mem_load");
		if(el && usage.phys_mem && usage.free_mem)
		{
			var mem_frac_num =  (usage.phys_mem - usage.free_mem)/usage.phys_mem;
			el.innerHTML =  ((usage.phys_mem - usage.free_mem)/1024.0).toFixed(1) +"GB / " + ((usage.phys_mem)/1024.0).toFixed(1) +"GB";
			$("#memusagebar").width((mem_frac_num*100).toFixed(1)+"%");
		}
	}

	function ShowServerData(sys_info)
	{

		var el = document.getElementById("info_PDFNet_version");
		if(el && sys_info.system.PDFNet_version) el.innerHTML = sys_info.system.PDFNet_version;

		el = document.getElementById("info_server_version");
		if(el && sys_info.system.server_version) el.innerHTML = sys_info.system.server_version;

		el = document.getElementById("info_num_cpu");
		if(el && sys_info.system.num_cpu) el.innerHTML = "" + sys_info.system.num_cpu;

		el = document.getElementById("info_os_arch");
		if(el && sys_info.system.os_arch) el.innerHTML = sys_info.system.os_arch;

		el = document.getElementById("info_os_name");
		if(el && sys_info.system.os_name) el.innerHTML = sys_info.system.os_name;

		ShowUsageData(sys_info.usage)
	}


	function GetServerInfo(callback, args)
	{
		args = args || "";
		$.ajax({
	        type: "GET",
	        url: joinPaths(g_api_root, "SysInfo.jsp" + args),
	        dataType: 'json',
	        success: function (data) {
	           callback(data);
	        },
	        error: function(e){
	            m_log_func("URI error!\n");
	        }
    	});
	}

	function ClickOutsideStandalone(e)
	{
		if(e.target && e.target.id && (e.target.id == "landingcontainer"))
		{
			// will call Hide on it's own;
			LeaveStandalone();
		}
	}
	// called when clicking outside the dialog.
	function LeaveStandalone()
	{
		if(m_should_back_out){
			m_should_back_out = false;
			history.back();
		}
		else{
			Hide();
		}
	}

	$("#landingpagebutton").click(function(){
		m_checkboxes.is_standalone = true;
		history.pushState(JSON.parse(JSON.stringify(m_checkboxes)), "Settings Page", "?s");
		m_should_back_out = true;
		Show(true);
        g_viewer_page.toggleHamburger()
	});

	$("#closepanebutton").click(LeaveStandalone);


	$("div.menuselector, .topbar .setting-button, .topbar .title, #midbar_last").click(function(event){
		SelectTab(event.currentTarget.id);
		Show(true);
	});

	return {
		Show: Show,
		Hide: Hide,
		EnableButtons: EnableButtons
	};
}
