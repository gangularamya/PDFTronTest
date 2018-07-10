package com.pdftron.blackboxservlet;

import com.pdftron.server.Util;
import com.pdftron.server.ConnectionService;
import com.pdftron.server.BlackBoxMessenger;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import java.io.*;
import java.util.ArrayList;
import java.util.Map;

public class AuxUpload extends HttpServlet {

    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String id = request.getParameter("id");
        if(id != null) {
            ByteArrayOutputStream incoming_data = new ByteArrayOutputStream();
            ConnectionService.Connection cs = ConnectionService.GetAnyConnection(Long.parseLong(id));
            Part data = request.getPart("msg");
            InputStream partContent = data.getInputStream();
            byte[] buf = new byte[64 * 1024];
            Util.copyStream(partContent, incoming_data, buf);
            String data_string = incoming_data.toString("UTF-8");
            Map<String, String> extra_parts = Util.jsonItemToStringMap(data_string, "parts");
            ArrayList<String> file_list = new ArrayList<>();
            for(Map.Entry<String, String> e: extra_parts.entrySet()) {
                OutputStream os = null;
                try {
                    data = request.getPart(e.getKey());
                    if(data == null) {
                        System.err.println("Cannot find part " + e.getKey());
                    }
                    partContent = data.getInputStream();
                    File temp = File.createTempFile("aul", e.getValue());
                    os = new FileOutputStream(temp);
                    String hashstring = Util.copyStreamWithHash(partContent, os, buf);
                    File save_loc = new File(Util.mapToInternalLocation("AuxUpload/" + hashstring + "." + e.getValue()));
                    if(!save_loc.exists()) {
                        save_loc.getParentFile().mkdirs();
                        os.close();
                        os = null;
                        temp.renameTo(save_loc);
                    }
                    file_list.add(save_loc.toString().replace("\\", "/"));

                } catch (Exception ex) {
                    Util.reportException(ex);
                }
                finally{
                    if(os != null) os.close();
                }
            }
            if(!file_list.isEmpty()) {
                data_string = Util.addToJsonObj(data_string, "merge", file_list);
            }
            System.out.println(data_string);
            cs.onMessageImpl(data_string);
        }
        response.setContentLengthLong(0);
    }

}