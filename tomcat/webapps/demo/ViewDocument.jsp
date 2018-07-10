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
<%@ page import="com.pdftron.server.DocReference" %>
<%@ page import="com.pdftron.demoservlet.SessionHelper" %>
<%@ page import="com.pdftron.demoservlet.Info" %>
<%!
    public void writeJson(String jsonContent, OutputStream stream_a, OutputStream stream_b) throws UnsupportedEncodingException, IOException
    {
        byte[] json_buf = jsonContent.getBytes("UTF-8");
        if(stream_a != null)
        {
            stream_a.write(json_buf, 0, json_buf.length);
            stream_a.flush();
        }
        if(stream_b != null)
        {
            stream_b.write(json_buf, 0, json_buf.length);
            stream_b.flush();
        }
    }
    public void writeToFile(String fileName, byte[] buffer) throws IOException
    {
        File xodOutFile = new File(fileName);
        java.io.FileOutputStream xodOutStream = new java.io.FileOutputStream(xodOutFile);
        xodOutStream.write(buffer);
        xodOutStream.flush();
        xodOutStream.close();
        xodOutStream = null;
    }
%>
<%   
    // we have three output streams: 
    // 1) streaming xod to multiple files
    // 2) streaming the json output to disk
    // 3) sending the json output to the reciever

    String incoming_uri  = request.getParameter("file");
    if(incoming_uri == null)
    {
        incoming_uri = request.getParameter("uri");
    }
    
    DocReference doc_ref = new DocReference(incoming_uri, SessionHelper.getShareID(request, session), request.getParameter("ext"));
    
    
    String reqFileName = doc_ref.localPDFPath();

    java.io.FileOutputStream jsonFStream = null;
    boolean hasMarker = false;
    File outDir = null;
    try {
        response.setContentType("application/json");
        doc_ref.fetchLocalBlocking(request);
        File inputFile = new File(reqFileName);
        if (!inputFile.exists() || !inputFile.isFile()) {
            System.err.printf("File not found: \"%s\"\n", inputFile.getAbsolutePath());
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "File not found");
            return;
        }
        long modDate = inputFile.lastModified();
        long inputSize = inputFile.length();

        String randomId = UUID.randomUUID().toString();
        String outDirBase = doc_ref.streamingURL();
        outDir = new File(Util.mapToStaticLocation(outDirBase));
        File doneMarker = new File(outDir + "/done.marker");
        Info.countViewed(doc_ref.fileType());
        File jsonOutFile = new File(outDir + "/ranges.json");
        // if the file exists already
        if(outDir.exists()){
            if(!doneMarker.exists()){
                outDirBase = "Streaming/" + randomId;
                outDir = new File(Util.mapToStaticLocation(outDirBase));
                doneMarker = new File(outDir + "/done.marker");
            }
            else{
                hasMarker = true;
                SessionHelper.addDocToList(session, doc_ref);
                byte[] buffer = new byte[64*1024];
                OutputStream responseOut = response.getOutputStream();
                Util.copyStream(new java.io.FileInputStream(jsonOutFile), responseOut, buffer);
                responseOut.close();
                return;
            }
        }

        System.out.println("Working Directory = " + System.getProperty("user.dir"));

        outDir.mkdirs();

        
        StringBuilder jsonTempSB = new StringBuilder();
        jsonFStream = new java.io.FileOutputStream(jsonOutFile);
        OutputStream responseOut = response.getOutputStream();

        String xodChunkPrefix = outDirBase + "/xod_out";

        System.out.printf("Converting and streaming file: \"%s\"...\n", inputFile.getAbsolutePath());

        // set the conversion option to not create thumbnails on XOD files because
        // they will not be streamed back to the client.
        Convert.XODOutputOptions xodOptions = new Convert.XODOutputOptions();
        xodOptions.setDPI(200);
        xodOptions.setOutputThumbnails(false);
        
        com.pdftron.filters.Filter filter = Convert.toXod(inputFile.getAbsolutePath(), xodOptions);
        int available_at_start = (int)filter.size();
        System.out.println("Initially sending " + available_at_start + " bytes.");

        com.pdftron.filters.FilterReader fReader = new com.pdftron.filters.FilterReader(filter);

        byte[] buffer = new byte[available_at_start];
        int bytesRead = 0;
        bytesRead = (int)fReader.read(buffer);

        jsonTempSB.append("[\n");
        writeJson(jsonTempSB.toString(), jsonFStream, responseOut);

        int totalBytes = 0;
        int chunkCount = 0;
        SessionHelper.addDocToList(session, doc_ref);
        System.out.println("Start streaming...");

        int desired_buffer_length = (int) 16 * 1024 * 1024;

        while (bytesRead > 0) {
            String xodOutUrl = xodChunkPrefix + chunkCount + ".bin";
            String xodFullPath = Util.mapToStaticLocation(xodOutUrl);
            writeToFile(xodFullPath, buffer);
            chunkCount += 1;

            jsonTempSB.setLength(0);
            jsonTempSB.append("{\"url\":\"../data/");
            jsonTempSB.append(xodOutUrl);
            jsonTempSB.append("\",\"size\":");
            jsonTempSB.append(bytesRead);
            jsonTempSB.append(",\"pos\":" + 0 + "},\n");
            writeJson(jsonTempSB.toString(), jsonFStream, responseOut);

            totalBytes += bytesRead;
            // read next bytes
            if (buffer.length != desired_buffer_length)
            {
                buffer = new byte[desired_buffer_length];
            }
            bytesRead = (int)fReader.read(buffer);
        }

        jsonTempSB.setLength(0);
        jsonTempSB.append("{\"end\":true}\n]");
        writeJson(jsonTempSB.toString(), jsonFStream, responseOut);
   
        System.out.println("Done.");
        responseOut.close();
        responseOut = null;
        jsonFStream.close();
        jsonFStream = null;
        java.io.FileOutputStream markerOutStream = new java.io.FileOutputStream(doneMarker);
        markerOutStream.write(0xFF & (totalBytes));
        markerOutStream.write(0xFF & (totalBytes >> 8));
        markerOutStream.write(0xFF & (totalBytes >> 16));
        markerOutStream.write(0xFF & (totalBytes >> 24));
        markerOutStream.flush();
        markerOutStream.close();
        hasMarker = true;
    }
    catch (Exception ex) {
        System.out.println(ex.getMessage());
        ex.printStackTrace(System.err);
        if(jsonFStream != null)
        {
            jsonFStream.close();
            jsonFStream = null;
        }
        if(outDir != null && !hasMarker)
        {
            Util.deleteDir(outDir);
        }
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
    }

    


%>
