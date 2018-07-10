<%@ page trimDirectiveWhitespaces="true" %>
<%@ page import="java.io.File" %>
<%@ page import="java.io.OutputStream" %>
<%@ page import="java.io.InputStream" %>
<%@ page import="java.io.BufferedOutputStream" %>
<%@ page import="java.io.DataOutputStream" %>
<%@ page import="java.nio.file.Paths" %>
<%@ page import="com.pdftron.common.PDFNetException" %>
<%@ page import="com.pdftron.pdf.*" %>
<%@ page import="com.pdftron.sdf.ObjSet" %>
<%@ page import="com.pdftron.server.Util" %>
<%@ page import="com.pdftron.server.DocReference" %>
<%@ page import="com.pdftron.demoservlet.SessionHelper" %>
<%@ page import="com.pdftron.demoservlet.Info" %>

<%
	try {
		String description = request.getParameter("description");
		String share_id = request.getParameter("share");
		String ext = request.getParameter("ext");
		if(ext != null && !ext.startsWith(".")){
			ext = "." + ext;
		}
		else if(ext == null) {
			ext = ".pdf";
		}
	    Part filePart = request.getPart("file"); // Retrieves <input type="file" name="file">
	    String fileName = Paths.get(filePart.getSubmittedFileName()).getFileName().toString(); // MSIE fix.
	    System.out.println("Processing upload of file " + fileName);
	    File tempLocation = File.createTempFile("pdftron", null, null);
	    InputStream fileContent = filePart.getInputStream();
	    java.io.FileOutputStream temp_save = new java.io.FileOutputStream(tempLocation);
	    byte[] buffer = new byte[64*1024];
	    
	    String fileHash = Util.copyStreamWithHash(fileContent, temp_save, buffer);
	    // add the hash to the filename in order to ensure uniqueness.
	    int dot_loc = fileName.lastIndexOf('.');
	    if(dot_loc != -1)
	    {
	    	fileName = fileName.substring(0, dot_loc) + fileHash + fileName.substring(dot_loc);
	    	if(!fileName.endsWith(ext)){
	    		fileName = fileName + ext;
	    	}
	    }
	    else
	    {
	    	fileName = fileName + fileHash + ext;
	    }
	    DocReference ret = new DocReference("cid://"+fileName, SessionHelper.getShareID(request, session), ext);
	    File saveLocation = ret.localFile();
	    saveLocation.getParentFile().mkdirs();
	    
	    tempLocation.renameTo(saveLocation);
	    long modDate = saveLocation.lastModified();
        ret.initFetch(request);
        Info.countUploaded(ret.fileType());
        SessionHelper.addDocToList(session, ret);
        
        response.setContentType("application/json");

        OutputStream os = response.getOutputStream();
        os.write(ret.toJson().getBytes("UTF8"));
        os.close();
	}
	catch(Exception ex)
	{
		System.err.println(ex.getMessage());
        ex.printStackTrace(System.err);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
	}
    
%>
