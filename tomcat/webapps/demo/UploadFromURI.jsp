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
<%
	try {
		String uri = request.getParameter("uri");
		DocReference ret = new DocReference(uri, SessionHelper.getShareID(request, session), request.getParameter("ext"));
		String credentials = null;
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
