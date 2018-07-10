package com.pdftron.blackboxservlet;

import com.pdftron.server.BlackBoxServerJobs;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.logging.Logger;

public class HealthCheck extends HttpServlet {
    private static final Logger sLogger = Logger.getLogger("HealthCheck");

    protected void doGet(HttpServletRequest request, HttpServletResponse response) {
        if(BlackBoxServerJobs.getHealthCheck()) {
            response.setContentLength(0);
        }
        else {
            sLogger.info("Reporting failed health check");
            response.setContentLength(0);
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        }
    }
}
