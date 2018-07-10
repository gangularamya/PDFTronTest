package com.pdftron.blackboxservlet;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class CookieKiller extends HttpServlet {

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
       String cookie_name = request.getParameter("c");
       String subpath = request.getParameter("p");
       if(subpath == null) {
           subpath = "/";
       }
       if(cookie_name != null) {
           response.setHeader("Set-Cookie", cookie_name + "=cleared; path="+subpath+"; expires=Thu, 01 Jan 1970 00:00:00 GMT");
       }
       response.setContentLength(0);
    }
}
