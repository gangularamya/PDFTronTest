package com.pdftron.blackboxservlet;

import com.pdftron.server.JsonOutStream;
import com.pdftron.server.BlackBoxServerJobs;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class GetPerfInfo extends HttpServlet {
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            response.setContentType("application/json");
            JsonOutStream out_stream = new JsonOutStream(response.getOutputStream(), false);
            out_stream.sendObject(BlackBoxServerJobs.getPerfInfo());
            out_stream.close();
        }
        catch(Exception ex)
        {
            System.err.println(ex.getMessage());
            ex.printStackTrace(System.err);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
        }
    }
}
