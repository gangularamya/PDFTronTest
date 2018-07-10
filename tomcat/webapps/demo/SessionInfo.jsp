<%--
//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2014 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
--%>
<%@ page trimDirectiveWhitespaces="true" %>
<%@ page import="java.io.OutputStream" %>
<%@ page import="java.io.DataOutputStream" %>
<%@ page import="java.io.UnsupportedEncodingException" %>
<%@ page import="java.io.IOException" %>
<%@ page import="com.pdftron.demoservlet.SessionHelper" %>
<%   
    try {
        SessionHelper.initSession(session);
        String session_json = SessionHelper.toJson(session);
        response.setContentType("application/json");

        OutputStream os = response.getOutputStream();
        os.write(session_json.getBytes("UTF8"));
        os.close();
    }
    catch (Exception ex) {
        System.out.println(ex.getMessage());
        ex.printStackTrace(System.err);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
    }
%>
