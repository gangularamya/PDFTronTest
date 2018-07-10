package com.pdftron.blackboxservlet;

import com.pdftron.server.Util;
import com.pdftron.server.ConnectionService;
import com.pdftron.server.BlackBoxMessenger;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.logging.Level;
import java.util.logging.Logger;

public class BlackBoxPolyfillEndpoint extends HttpServlet {
    private static final Logger sLogger = Logger.getLogger("BlackBoxPolyfill");

    protected void doGet(HttpServletRequest request, HttpServletResponse response) {
        ConnectionService.HttpConnection cs = null;
        String id = request.getParameter("id");
        if(id != null){
            sLogger.fine("Looking for existing polyfill" );
            cs = ConnectionService.GetHttpConnection(Long.parseLong(id));
        }
        if(cs == null){
            sLogger.info("Creating new polyfill" );
            try {
                cs = new ConnectionService.HttpConnection();
                BlackBoxMessenger messenger = new BlackBoxMessenger(cs);
                messenger.initialize();
            } catch (Exception e){
                Util.reportException(e);
                throw e;
            }
        }
        response.setContentType("text/plain");

        try {
            byte[] to_send = cs.waitForData();
            if(to_send != null) {
                response.setContentLengthLong(to_send.length);
                OutputStream out = response.getOutputStream();
                out.write(to_send);
                out.close();
                sLogger.fine("Set PF contentLength to " + to_send.length+ ". Current status: " + response.getStatus());
            }
            else {
                response.setContentLengthLong(0);
                sLogger.fine("PF empty response. Current status: " + response.getStatus());
            }
        } catch (Exception e){
            sLogger.log(Level.WARNING,"Polyfill get error: " + e.getMessage(), e);
        }
    }

    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String id = request.getParameter("id");
        if(id != null) {
            ByteArrayOutputStream incoming_data = new ByteArrayOutputStream();
            ConnectionService.HttpConnection cs = ConnectionService.GetHttpConnection(Long.parseLong(id));
            if(cs == null) {
                sLogger.warning("cs is null");
            }
            Part data = request.getPart("data");
            if(data == null) {
                sLogger.warning("data is null");
            }
            InputStream partContent = data.getInputStream();
            byte[] buf = new byte[64 * 1024];
            Util.copyStream(partContent, incoming_data, buf);
            String data_string = incoming_data.toString("UTF-8");
            cs.onMessageImpl(data_string);
        }
    }

    @Override
    protected  void finalize(){
        System.out.println("finalizing Polyfill");
    }
}
