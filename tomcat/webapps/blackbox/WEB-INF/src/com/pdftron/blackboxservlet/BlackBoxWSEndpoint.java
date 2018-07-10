package com.pdftron.blackboxservlet;

import com.pdftron.server.ConnectionService;
import com.pdftron.server.BlackBoxMessenger;

import javax.websocket.EndpointConfig;
import javax.websocket.OnClose;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

@ServerEndpoint(value = "/ws")
public class BlackBoxWSEndpoint {

    @OnOpen
    @SuppressWarnings("unchecked")
    public synchronized void onOpen(Session session, EndpointConfig config){
        System.out.println("Creating WS connection at endpoint ...");
        ConnectionService.WebsocketConnection connection = new ConnectionService.WebsocketConnection(session);
        new BlackBoxMessenger(connection);
    }

    @OnClose
    public void onClose(){
        System.out.println("Close ws connection ...");
    }

}
