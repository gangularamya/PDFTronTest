<%--
//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2014 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
--%>

<%@ page import="java.io.File" %>
<%@ page import="java.io.OutputStream" %>
<%@ page import="java.io.BufferedOutputStream" %>
<%@ page import="java.io.DataOutputStream" %>
<%@ page import="java.nio.ByteBuffer" %>
<%@ page import="java.nio.channels.FileChannel" %>
<%@ page import="java.nio.channels.FileLock" %>
<%@ page import="java.nio.channels.SeekableByteChannel" %>
<%@ page import="java.nio.file.Files" %>
<%@ page import="java.nio.file.Path" %>
<%@ page import="java.nio.file.StandardOpenOption" %>
<%@ page import="java.util.EnumSet" %>
<%@ page import="com.pdftron.common.PDFNetException" %>
<%@ page import="com.pdftron.pdf.*" %>
<%   
    String in_fileName = "static_data/Uploaded/" + request.getParameter("file");
    String in_opts  = request.getParameter("options");

    if (null == in_opts)
    {
        in_opts = "";
        System.out.println("in opts is empty");
    }

    if (in_fileName == null || in_fileName.isEmpty())
        in_fileName = "big.pdf";

    String out_file = "Streaming/" + in_fileName;

    String abs_out_file = request.getServletContext().getRealPath("Streaming/" + in_fileName);

    System.out.println("Working Directory = " + System.getProperty("user.dir"));
    System.out.println("in_fileName= " + in_fileName);
    System.out.println("out_file= " + out_file);
    System.out.println("abs_out_file= " + abs_out_file);

    try {
        // check if file exists (relative to where Tomcat's startup.bat was ran, usually the Tomcat's bin directory)
        File file = new File(in_fileName);
        if (!file.exists()) {
            System.err.printf("File not found: \"%s\"\n", file.getAbsolutePath());
            String realFilePath = request.getServletContext().getRealPath(in_fileName);
            //check if the file exists (relative to this jsp file)
            file = new File(realFilePath); 
        }
        if (!file.exists()) {
            System.err.printf("File not found: \"%s\"\n", file.getAbsolutePath());
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "File not found");
            return;
        }
        System.out.printf("Converting and streaming file: \"%s\"...\n", file.getAbsolutePath());

        // reset response headers to indicate an XOD file will be streamed instead of serving HTML file

        response.setContentType("application/vnd.ms-xpsdocument");
        
        // set the conversion option to not create thumbnails on XOD files because
        // they will not be streamed back to the client.
        Convert.XODOutputOptions xodOptions = new Convert.XODOutputOptions();
        xodOptions.setOutputThumbnails(false);
        
        com.pdftron.filters.Filter filter = Convert.toXod(file.getAbsolutePath(), xodOptions);
        int available_at_start = (int)filter.size();
        System.out.println("Initially sending " + available_at_start + " bytes.");
        com.pdftron.filters.FilterReader fReader = new com.pdftron.filters.FilterReader(filter);

        OutputStream os = response.getOutputStream();

        byte[] buffer = new byte[available_at_start];
        int bytesRead = 0;
        bytesRead = (int)fReader.read(buffer);

        int totalBytes = 0;

        System.out.println("Start streaming...");

        int desired_buffer_length = (int) 1024 * 1024;

        while (bytesRead > 0) {
            System.out.println("Server sent total " + totalBytes + " bytes. \n");
            os.write(buffer, 0, bytesRead);
            os.flush();

            totalBytes += bytesRead;
            // read next bytes
            if (buffer.length != desired_buffer_length)
            {
                buffer = new byte[desired_buffer_length];
            }
            bytesRead = (int)fReader.read(buffer);
        }
   
        System.out.println("Done.");
        os.close();
    }
    catch (Exception ex) {
        System.err.println(ex.getMessage());
        System.out.println(ex.getMessage());
        ex.printStackTrace(System.err);
        ex.printStackTrace(System.out);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
    }
%>
