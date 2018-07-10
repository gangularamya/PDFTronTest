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
<%@ page import="com.pdftron.server.JsonOutStream" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html>
<head>
<title>Reflected Request</title>
<style>
body {
    background-color: linen;
}

.json {
    line-height: 120%;
    margin-left: 30px;
} 
</style>
</head>
<body style="width:100%;height:100%;margin:0px;padding:0px">
<pre class="json">
<%
	try {
		%>
<%=Util.requestToJson(request)%>
		<%
	}
	catch(Exception ex)
	{
		System.err.println(ex.getMessage());
        ex.printStackTrace(System.err);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
	}
%>
</pre>
</body>
</html>

