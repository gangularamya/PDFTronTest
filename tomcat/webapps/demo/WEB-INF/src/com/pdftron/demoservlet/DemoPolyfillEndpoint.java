package com.pdftron.demoservlet;

import com.pdftron.server.Util;
import com.pdftron.server.ConnectionService;
import com.pdftron.demoservlet.DemoMessenger;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class DemoPolyfillEndpoint extends HttpServlet {

    protected void doGet(HttpServletRequest request, HttpServletResponse response) {
        ConnectionService.HttpConnection cs = null;
        String id = request.getParameter("id");
        if(id != null){
            cs = ConnectionService.GetHttpConnection(Long.parseLong(id));
        }
        if(cs == null){
            try {
                cs = new ConnectionService.HttpConnection();
                DemoMessenger messenger = new DemoMessenger(cs);
                messenger.initialize();
            } catch (Exception e){
                Util.reportException(e);
                throw e;
            }
        }
        response.setContentType("text/plain");
        System.out.println("Polyfill get!" );
        try {
            byte[] to_send = cs.waitForData();
            if(to_send != null) {
                response.setContentLengthLong(to_send.length);
                OutputStream out = response.getOutputStream();
                out.write(to_send);
                out.close();
                System.out.println("Set PF contentLength to " + to_send.length+ ". Current status: " + response.getStatus());
            }
            else {
                response.setContentLengthLong(0);
                System.out.println("PF empty response. Current status: " + response.getStatus());
            }
        } catch (Exception e){
            System.err.println("Polyfill get error: " + e.getMessage());
        }
    }

    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String id = request.getParameter("id");
        if(id != null) {
            ByteArrayOutputStream incoming_data = new ByteArrayOutputStream();
            ConnectionService.HttpConnection cs = ConnectionService.GetHttpConnection(Long.parseLong(id));
            Part data = request.getPart("data");
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
