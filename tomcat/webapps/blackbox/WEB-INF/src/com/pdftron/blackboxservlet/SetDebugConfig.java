package com.pdftron.blackboxservlet;

import com.pdftron.server.BlackBoxServerJobs;
import com.pdftron.server.ServerConfig;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import java.io.File;
import javax.servlet.http.HttpServletResponse;
import java.util.Map;
import java.io.IOException;

public class SetDebugConfig extends HttpServlet {
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if(!ServerConfig.inDebugMode()){
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
        }
        else {
            try {
                Map config_map = request.getParameterMap();
                if (config_map.containsKey("renameUpload")) {
                    String original = request.getParameter("original");
                    String newName = request.getParameter("new");
                    renameUpload(original, newName);          
                }
                String forceHealth = request.getParameter("setHealth");
                if(forceHealth != null) {
                    if (forceHealth.equals("healthy")) {
                        BlackBoxServerJobs.forceHealthCheck(true);
                    }
                    else if (forceHealth.equals("unhealthy")) {
                        BlackBoxServerJobs.forceHealthCheck(false);
                    }
                    else {
                        BlackBoxServerJobs.forceHealthCheck(null);
                    }
                }
                ServerConfig.setDebugConfig(config_map);
            } catch (Exception ex) {
                System.err.println(ex.getMessage());
                ex.printStackTrace(System.err);
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, ex.getMessage());
            }
        }
    }

    private void renameUpload(String original, String newName) { 
        if (original != null && newName != null) {
            String path = "/usr/local/tomcat/static_data/Uploaded/";
            File originalFile = new File(path + original);

            if (originalFile.exists()){
                File newFile = new File(path + newName); 
                originalFile.renameTo(newFile);
            }
        }
    }
}
