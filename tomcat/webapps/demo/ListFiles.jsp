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
<%@ page import="com.pdftron.server.Util" %>
<%@ page import="com.pdftron.server.DocReference" %>
<%@ page import="com.pdftron.demoservlet.SessionHelper" %>
<%   
    try {
        String sort = request.getParameter("sort");
        String list_json = null;
        boolean shared_list = request.getParameter("shared") != null;
        if(sort != null && sort.contains("access"))
        {
            list_json = shared_list ? SessionHelper.sharedDocListJsonByAccess(session) : SessionHelper.docListJsonByAccess(session);
        }
        else
        {
            list_json = shared_list ? SessionHelper.sharedDocListJsonByCreation(session) : SessionHelper.docListJsonByCreation(session);
        }

        // reset response headers to indicate a json file will be served
        response.setContentType("application/json");

        OutputStream os = response.getOutputStream();
        os.write(list_json.getBytes("UTF8"));
        os.close();
    }
    catch (Exception ex) {
        System.err.println(ex.getMessage());
        ex.printStackTrace(System.err);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
    }
%>