package com.pdftron.demoservlet;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.util.TreeMap;

public class DataChunkFactory {
    public static final String TYPE_UPDATE = "u";
    public static final String TYPE_CREATE = "c";
    public static final String TYPE_DELETE = "d";
    Gson gson = new GsonBuilder().create();

    public DataChunk produceChunk(String type, String... data) {
        switch (type) {
            case TYPE_CREATE:
                return new CreateDataChunk(data[0], data[1], data[2], data[3]);
            case TYPE_UPDATE:
                return new UpdateDataChunk(data[0]);
            case TYPE_DELETE:
                return new DeleteDataChunk(data[0]);
            default:
                System.err.println("Invalid chunk type: " + type);
                return null;
        }
    }

    public interface DataChunk {
        String getChunk();
    }

    private class CreateDataChunk implements DataChunk {
        String authorName = null;
        String authorId = null;
        String parentAuthorId = null;
        String xfdf = null;

        public CreateDataChunk(String authorId, String authorName, String parentAuthorId, String xfdf) {
            this.authorName = authorName;
            this.authorId = authorId;
            this.parentAuthorId = parentAuthorId;
            this.xfdf = xfdf;
        }
        
        @Override
        public String getChunk() {
            TreeMap<String, Object> json = new TreeMap<String, Object>();

            json.put("status", TYPE_CREATE);
            json.put("authorName", this.authorName);
            json.put("authorId", this.authorId);
            json.put("xfdf", this.xfdf);

            return gson.toJson(json);
        }
    }

    private class UpdateDataChunk implements DataChunk {
        String xfdf = null;

        public UpdateDataChunk(String xfdf) {
            this.xfdf = xfdf;
        }
        
        @Override
        public String getChunk() {
            TreeMap<String, Object> json= new TreeMap<String, Object>();

            json.put("status", TYPE_UPDATE);
            json.put("xfdf", xfdf);

            return gson.toJson(json);
        }
    }
    
    private class DeleteDataChunk implements DataChunk {
        String annotationId = null;

        public DeleteDataChunk(String annotationId) {
            this.annotationId = annotationId;
        }

        @Override
        public String getChunk() {
            TreeMap<String, Object> json = new TreeMap<String, Object>();

            json.put("status", TYPE_DELETE);
            json.put("annotationId", this.annotationId);

            return gson.toJson(json);
        }
    }
};
