<%--
//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2014 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
--%>
<%@ page trimDirectiveWhitespaces="true" %>
<%@ page import="java.io.OutputStream" %>
<%@ page import="java.io.DataOutputStream" %>
<%@ page import="java.util.TreeMap" %>
<%@ page import="java.util.Map" %>
<%@ page import="java.io.UnsupportedEncodingException" %>
<%@ page import="java.io.IOException" %>
<%@ page import="com.pdftron.pdf.*" %>
<%@ page import="java.lang.Runtime" %>
<%@ page import="com.pdftron.server.Util" %>
<%@ page import="com.pdftron.demoservlet.Info" %>
<%   
    try {
    
        StringBuilder sb = new StringBuilder();
        boolean need_comma = false;
        int num_params = 0;
        boolean get_system = request.getParameter("system") != null;
        boolean get_usage = request.getParameter("usage") != null;
        boolean get_server = request.getParameter("server") != null;
        if(!get_system && !get_usage && !get_server)
        {
            get_system = true;
            get_usage = true;
            get_server = true;
        }
        
        sb.append("{");

        if(get_system)
        {
            sb.append("\"system\":");
            sb.append(Info.systemInfo());
            need_comma = true;
        }

        if(get_server)
        {
            if (need_comma) sb.append(",");
            sb.append("\"server\":");
            sb.append(Info.serverInfo());
            need_comma = true;
        }
        if(get_usage)
        {
            if (need_comma) sb.append(",");
            sb.append("\"usage\":");
            sb.append(Info.usageInfo());
            need_comma = true;
        }

        sb.append("}");

        response.setContentType("application/json");

        OutputStream os = response.getOutputStream();
        os.write(sb.toString().getBytes("UTF8"));
        os.close();
    }
    catch (Exception ex) {
        System.out.println(ex.getMessage());
        ex.printStackTrace(System.err);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
    }
%>
