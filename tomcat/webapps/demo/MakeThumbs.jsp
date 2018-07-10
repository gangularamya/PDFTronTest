<%--
//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2014 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
--%>
<%@ page trimDirectiveWhitespaces="true" %>
<%@ page import="java.io.File" %>
<%@ page import="java.io.OutputStream" %>
<%@ page import="java.io.BufferedOutputStream" %>
<%@ page import="java.io.DataOutputStream" %>
<%@ page import="com.pdftron.common.PDFNetException" %>
<%@ page import="com.pdftron.sdf.ObjSet" %>
<%@ page import="com.pdftron.server.Util" %>
<%@ page import="com.pdftron.server.DocReference" %>
<%@ page import="com.pdftron.demoservlet.SessionHelper" %>
<%   
    String req_uri = request.getParameter("file");
    if(req_uri == null)
    {
        req_uri = request.getParameter("uri");
    }

    try {
        DocReference doc_ref = new DocReference(req_uri, SessionHelper.getShareID(request, session), request.getParameter("ext"));
        //doc_ref.generateThumb();

        response.setContentType("application/json");
        OutputStream os = response.getOutputStream();
        
        os.write(doc_ref.toJson().getBytes("UTF8"));
        os.close();
    }
    catch (Exception ex) {
        System.err.println(ex.getMessage());
        ex.printStackTrace(System.err);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
    }

%>
