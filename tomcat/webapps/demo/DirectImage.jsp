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
<%@ page import="java.io.UnsupportedEncodingException" %>
<%@ page import="java.io.IOException" %>
<%@ page import="java.util.UUID" %>
<%@ page import="java.nio.ByteBuffer" %>
<%@ page import="java.nio.channels.FileChannel" %>
<%@ page import="java.nio.channels.FileLock" %>
<%@ page import="java.nio.channels.SeekableByteChannel" %>
<%@ page import="java.nio.file.Files" %>
<%@ page import="java.nio.file.Path" %>
<%@ page import="java.nio.file.StandardOpenOption" %>
<%@ page import="com.pdftron.common.PDFNetException" %>
<%@ page import="com.pdftron.pdf.*" %>
<%@ page import="com.pdftron.server.Util" %>
<%   

    String reqFileName = request.getParameter("file");
    reqFileName = "Uploaded/" + reqFileName;

    try {
        
        File inputFile = new File(Util.mapToStaticLocation(reqFileName));
        if (!inputFile.exists() || !inputFile.isFile()) {
            System.err.printf("File not found: \"%s\"\n", inputFile.getAbsolutePath());
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "File not found");
            return;
        }
        long modDate = inputFile.lastModified();
        long inputSize = inputFile.length();

        String randomId = UUID.randomUUID().toString();
        String filename = randomId + ".jpeg";
        String outDirURL = "DirectImage/";
        File outDir = new File(Util.mapToStaticLocation(outDirURL));

        System.out.println("Working Directory = " + System.getProperty("user.dir"));

        outDir.mkdirs();
        File outFileActual = new File(outDir +"/"+ filename);
        Util.makeThumb(inputFile, outFileActual, 2048, "JPEG", 1);
        response.setContentType("image/jpeg");
        response.sendRedirect("../data/" +outDirURL+filename);
        
    }
    catch (Exception ex) {
        System.out.println(ex.getMessage());
        ex.printStackTrace(System.err);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
    }

    


%>
