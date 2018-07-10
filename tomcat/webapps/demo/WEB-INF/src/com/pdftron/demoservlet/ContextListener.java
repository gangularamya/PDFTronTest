package com.pdftron.demoservlet;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

import com.pdftron.server.DocReference;
import com.pdftron.server.ServerConfig;
import com.pdftron.server.SharedPDFNet;
import com.pdftron.server.Util;

import java.io.*;


@WebListener
public class ContextListener implements ServletContextListener {
	private class ThumbGenThread extends Thread {
	    @Override
	    public void run() {
	    	
	        File folder = new File(Util.mapToStaticLocation("Uploaded"));
		    File[] listOfFiles = folder.listFiles();

	    }
	}

	private void cleanupTempDir(){
	    try {
            File temp_dir = File.createTempFile("startmarker", null).getParentFile();
            File[] listOfFiles = temp_dir.listFiles();
            if(listOfFiles == null){
                return;
            }
            System.out.println("Trying to clean up temp files in " + temp_dir);
            int delete_count = 0;
            for (File listOfFile : listOfFiles) {
                String str = listOfFile.getName();
                if ((str.startsWith("pdftron") && str.endsWith("tmp"))
                        || str.startsWith("sqlite-3")
                        || str.startsWith("startmarker")) {
                    if (listOfFile.delete()) ++delete_count;
                }
            }
            System.out.println("deleted "+ delete_count +" files");

        } catch(Exception e){
            System.err.println("Error cleaning up temp files:");
            System.out.println("Error cleaning up temp files:");
            System.err.println(e.getMessage());
        }
    }

    private void dealWithPreloadedFiles(){
        try {
            File preloadedDir = new File(Util.mapToStaticLocation("Preloaded"));
            preloadedDir.mkdirs();
            File[] listOfFiles = preloadedDir.listFiles();
            if(listOfFiles == null){
                return;
            }
            byte[] buffer = new byte[64*1024];
            for (File listOfFile : listOfFiles) {
                String fileName = listOfFile.getName();
                DocReference doc_ref = new DocReference("http://www.pdftron.com/downloads/pl/"+fileName, null, ".pdf");
                File fetchedFile = doc_ref.localFile();
                fetchedFile.getParentFile().mkdirs();
                if(!fetchedFile.exists()) {
                    OutputStream destStream = new FileOutputStream(fetchedFile);
                    InputStream fileContent = new FileInputStream(listOfFile);
                    System.out.println("Copying " + listOfFile.toString() + " to " + fetchedFile.toString());
                    Util.copyStream(fileContent, destStream, buffer);
                    destStream.close();
                    fileContent.close();
                }
                doc_ref.generateThumb();
            }

        } catch(Exception e){
            System.err.println("Error dealing with preloads:");
            System.out.println("Error dealing with preloads:");
            System.err.println(e.getMessage());
            System.out.println(e.getMessage());
        }
    }

    private static String beginStage(String stage_name){
        System.out.println("Docker Initializing " + stage_name);
        return stage_name;
    }

    @Override
    public void contextInitialized(ServletContextEvent servletContextEvent){
    	String stage = beginStage("ServerConfig");
	    try {
	    	ServerConfig.initialize();
            stage = beginStage("SessionHelper");
	    	SessionHelper.initialize();

            stage = beginStage("cleanupTempDir");
            cleanupTempDir();

            stage = beginStage("PDFNet");
            SharedPDFNet.initialize();

	    	// must come after ServerConfig
            stage = beginStage("Database");
	    	Database.initialize();

            stage = beginStage("Preloads");
            dealWithPreloadedFiles();

            stage = beginStage("Info");
	    	Info.initialize(servletContextEvent.getServletContext());

            stage = beginStage("Thumb thread");
	    	Thread thumb_gen_thread = new ThumbGenThread();
	    	thumb_gen_thread.start();
	    	
	        System.out.println("PDFTron app has been started.");
	        Info.countInit();
    	}
    	catch (Exception e)
    	{
    		System.out.println("PDFTron WV server app failed to init at the "+ stage +" stage:");
    		System.out.println(e.getMessage());
			e.printStackTrace(System.out);
    	}
    	
    }

    @Override
    public void contextDestroyed(ServletContextEvent servletContextEvent) {
	    Info.terminate();
	    SharedPDFNet.terminate();
		ServerConfig.terminate();
        System.out.println("Servlet has been stopped.");
    }

}
