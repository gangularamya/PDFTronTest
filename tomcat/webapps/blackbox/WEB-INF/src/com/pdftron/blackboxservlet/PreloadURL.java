package com.pdftron.blackboxservlet;

import com.pdftron.server.BlackBoxServerJobs;
import com.pdftron.server.JsonOutStream;

import javax.servlet.http.HttpServlet;
import java.io.OutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.logging.Logger;

import com.pdftron.server.DocReference;


public class PreloadURL  extends HttpServlet {
    private static final Logger sLogger = Logger.getLogger("PreloadURL");

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            String uri = request.getParameter("url");
            DocReference ret = new DocReference(uri, null, request.getParameter("ext"));
            String credentials = null;
            sLogger.info("Preloading " +  uri);
            BlackBoxServerJobs.getRenderSubscribe(ret, 0, null);

            response.setContentType("application/json");

            OutputStream os = response.getOutputStream();
            os.write(ret.toJson().getBytes("UTF8"));
            os.close();
        }
        catch(Exception ex)
        {
            System.err.println(ex.getMessage());
            ex.printStackTrace(System.err);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
        }
    }

}
