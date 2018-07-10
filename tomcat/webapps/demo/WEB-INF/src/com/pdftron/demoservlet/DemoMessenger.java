package com.pdftron.demoservlet;

import com.google.gson.*;

import com.pdftron.server.ConnectionService;
import com.pdftron.server.JobSubscriber;
import com.pdftron.server.Util;

import java.util.ArrayList;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.awt.geom.Rectangle2D;
import java.util.logging.Logger;
import java.util.logging.Level;

@SuppressWarnings("MismatchedQueryAndUpdateOfCollection")
public class DemoMessenger implements ConnectionService.MessageHandler, JobSubscriber{
    private static final ConcurrentHashMap<Long, DemoMessenger> sMessengers = new ConcurrentHashMap<>();
    private static final Logger sLogger = Logger.getLogger("demo");
    public String currentDocument = null;

    @SuppressWarnings("unused")
    class WebResult{
        final String t;
        Object data = null;
        Object err = null;
        WebResult(String type) {
            t = type;
        }
    }

    private final ConnectionService.Connection mConnection;
    public DemoMessenger(ConnectionService.Connection connection) {
        mConnection = connection;
        mConnection.setHandler(this);
        sMessengers.put(connection.getID(), this);
    }

    public void initialize(){
        mConnection.initialize();
    }

    private void myLog(String toLog){
        sLogger.log(Level.FINE, Long.toString(mConnection.getID()) + ": " + toLog);
    }

    @Override
    public void onResult(String type, Object to_send) {
        WebResult result = new WebResult(type);
        result.data = to_send;
        mConnection.send(Util.objectToJson(result));
    }

    @Override
    public void onError(String type, Object to_send, Object data) {
        WebResult result = new WebResult(type);
        result.err = to_send;
        result.data = data;
        mConnection.send(Util.objectToJson(result));
    }

    @Override
    public void onMessage(String json_string) {
        String op_type = "unknown";
        try {
            myLog("About to process incoming json");
            JsonElement jelement = new JsonParser().parse(json_string);
            if(jelement == null){
                throw new Exception("Unable to parse incoming message. Malformed json?");
            }
            myLog("Getting json object");
            JsonObject jobject = jelement.getAsJsonObject();
            if(jobject == null){
                throw new Exception("Json message must be an object");
            }
            myLog("Getting type object");
            JsonElement op_type_obj = jobject.get("t");
            if(op_type_obj != null) {
                myLog("Getting type object as string");
                op_type = op_type_obj.getAsString();
                myLog("Handling message " + op_type);
                sLogger.log(Level.FINE, "operation " + op_type);
                switch (op_type) {
                    case "a_add":
                        handleAnnotCreate(jobject);
                        return;
                    case "a_modify":
                        handleAnnotModify(jobject);
                        return;
                    case "a_delete":
                        handleAnnotDelete(jobject);
                        return;
                    case "a_retrieve":
                        handleAnnotRetrieval(jobject);
                        return;
                    case "ignore":
                        return;
                }
            }
            mConnection.send("{\"echo\":" + json_string +"}" );
        } catch(Exception e){
            // this block will handle errors when creating the task.
            // these are usually due to malformed requests
            e.printStackTrace();
            String msg = e.getMessage();
            if(msg.equals("null")) {
                msg = "Internal server error: null reference";
            }
            mConnection.send("{\"t\":\""+ op_type +"\",\"err\":\"" + msg  + "\"}");
        }
    }

    private ArrayList<TreeMap<String, String>> processObject(String[] argMap, JsonArray aData) throws Exception{
        ArrayList<TreeMap<String, String>> dataList = new ArrayList<>();
        for (JsonElement j : aData) {
            if (!j.isJsonNull()) {
                JsonObject obj = j.getAsJsonObject();
                TreeMap<String, String> annot = new TreeMap<>();
                for (String key : argMap) {
                    if (obj.has(key)) {
                        JsonElement newItem = obj.get(key);        
                        if (!newItem.isJsonNull()) {
                            annot.put(key, newItem.getAsString());
                        }
                    }
                }
                dataList.add(annot);
            }
        }

        return dataList;
    }

    private void handleAnnotRetrieval(JsonObject argsObj) throws Exception {
        this.currentDocument = argsObj.get("dId").getAsString();
        this.onResult("a_retrieve", Database.retrieveAnnotations(this.currentDocument)); 
    }

    private void handleAnnotCreate(JsonObject argsObj) throws Exception {
        this.currentDocument = argsObj.get("dId").getAsString();
        String[] argMap = { "at", "aId", "parent", "author", "parent", "aName", "xfdf" };
        
        JsonArray createJson = argsObj.getAsJsonArray("annots");
        ArrayList<TreeMap<String, String>> createData = processObject(argMap, createJson);
        
        if (createData.size() > 0) {
            Database.createAnnotations(this.currentDocument, createData);
            updateClients("a_create", createJson);
        }
    }
    
    private void handleAnnotModify(JsonObject argsObj) throws Exception {
        this.currentDocument = argsObj.get("dId").getAsString();
        String[] argMap = { "at", "aId", "xfdf" };

        JsonArray updateJson = argsObj.getAsJsonArray("annots");
        ArrayList<TreeMap<String, String>> updateData = processObject(argMap, updateJson);

        if (updateData.size() > 0) { 
            Database.updateAnnotations(this.currentDocument, updateData);
            updateClients("a_modify", updateJson);
        }
    }

    private void handleAnnotDelete(JsonObject argsObj) throws Exception {
        this.currentDocument = argsObj.get("dId").getAsString();
        String[] argMap = { "at", "aId" };

        JsonArray deleteJson = argsObj.getAsJsonArray("annots");
        ArrayList<TreeMap<String, String>> deleteData = processObject(argMap, deleteJson);

        if (deleteData.size() > 0) {
            Database.deleteAnnotations(this.currentDocument, deleteData);
            updateClients("a_delete", deleteJson);
        }
    }

    private void updateClients(String type, Object data) {
        if (this.currentDocument != null) {
            for (Map.Entry<Long, DemoMessenger> entry : sMessengers.entrySet()) {
                DemoMessenger current = entry.getValue();
                String currentId = current.currentDocument;
                if (currentId != null && currentId.equals(this.currentDocument)) {
                    current.onResult(type, data);
                }
            }
        }
    }

    @Override
    public void onClose(long id) {
        sMessengers.remove(id);
    }
}
