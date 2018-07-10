package com.pdftron.blackboxservlet;


import com.pdftron.server.DocReference;
import com.pdftron.server.JsonOutStream;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class GetPDF extends HttpServlet {

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException{
        try {
            String uri = request.getParameter("uri");
            String fmt = request.getParameter("fmt");
            DocReference doc_ref = new DocReference(uri, request.getParameter("share"), request.getParameter("ext"));
            String credentials = null;
            doc_ref.fetchLocalBlocking(request);
            if(fmt != null && fmt.equals("data"))
            {
                response.setContentType("application/pdf");
                response.sendRedirect("../" + doc_ref.publicPDFURL());
            }
            else{
                response.setContentType("application/json");
                JsonOutStream out_stream = new JsonOutStream(response.getOutputStream());
                out_stream.sendURI("../" + doc_ref.publicPDFURL());
                out_stream.close();
            }
        }
        catch(Exception ex)
        {
            System.err.println(ex.getMessage());
            ex.printStackTrace(System.err);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR , ex.getMessage());
        }
    }
}
