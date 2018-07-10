package com.pdftron.blackboxservlet;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

import com.pdftron.server.*;

import java.io.File;
import java.util.logging.Level;
import java.util.logging.Logger;


@WebListener
public class ContextListener implements ServletContextListener {
    private static final Logger sLogger = Logger.getLogger("BlackboxContextListener");
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
            sLogger.info("Trying to clean up temp files in " + temp_dir);
            int delete_count = 0;
            for (File listOfFile : listOfFiles) {
                String str = listOfFile.getName();
                if ((str.startsWith("pdftron") && str.endsWith("tmp"))
                        || str.startsWith("sqlite-3")
                        || str.startsWith("startmarker")) {
                    if (listOfFile.delete()) ++delete_count;
                }
            }
            sLogger.info("deleted "+ delete_count +" files");

        } catch(Exception e){
            sLogger.log(Level.WARNING, "Error cleaning up temp files", e);
        }
    }

    private static String beginStage(String stage_name){
        sLogger.info("Initializing " + stage_name);
        return stage_name;
    }

    @Override
    public void contextInitialized(ServletContextEvent servletContextEvent){
    	String stage = beginStage("ServerConfig");
	    try {
	    	ServerConfig.initialize();

            stage = beginStage("cleanupTempDir");
            cleanupTempDir();

            stage = beginStage("PDFNet");
	    	// must come after ServerConfig
	    	SharedPDFNet.initialize();

            stage = beginStage("CacheManager");
            CacheManager.initialize();

            stage = beginStage("ConnectionService");
            ConnectionService.initialize();

            stage = beginStage("BlackBoxMonitor");
            BlackBoxMonitor.initialize();

            stage = beginStage("BlackBox");
            BlackBoxServerJobs.initialize();

            sLogger.info("Done Init.");
    	}
    	catch (Exception e)
    	{
            sLogger.log(Level.SEVERE, "Error during init sequence", e);
    	}
    	
    }

    @Override
    public void contextDestroyed(ServletContextEvent servletContextEvent) {
	    BlackBoxServerJobs.terminate();
	    CacheManager.terminate();
        SharedPDFNet.terminate();
		ServerConfig.terminate();
        sLogger.info("Servlet has been stopped.");
    }

}
