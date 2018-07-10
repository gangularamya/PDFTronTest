package com.pdftron.demoservlet;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Date;
import java.sql.Statement;
import java.sql.PreparedStatement;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import com.pdftron.server.ServerConfig;

import java.util.ArrayList;

import java.util.TreeMap;

public class Database {
    static DataChunkFactory chunkFactory = new DataChunkFactory();
	private static Connection connection = null;
    private static final Gson gson = new GsonBuilder().create();

    public interface DBWritable{
        Object getColumnValue(int index) throws Exception;
        String getColumnName(int index) throws Exception;
        int getNumColumns();
        String getColumnType(int index) throws Exception;
        void setColumnValue(int index, Object val) throws Exception;
    }

    // transmitted annot object on changes
    static class Annotation {
        String dId; // documentid
        String aId; // annotid
        String parent; // parentAuthor
        String author; // author
        String aName; // authorname
        String xfdf; // xfdf
        String at; // status

        Annotation(String dId, String aId, String author, String aName, String parent, String xfdf) {
            this.at = "create";
            this.dId = dId;
            this.aId = aId;
            this.author = author;
            this.aName = aName;
            this.parent = parent;
            this.xfdf = xfdf;
        }

        Annotation(String dId, String aId, String xfdf) {
            this.at = "modify";
            this.dId = dId;
            this.aId = aId;
            this.xfdf = xfdf;
        }

        Annotation(String did, String aId) {
            this.at = "delete";
            this.dId = dId;
            this.aId = aId;
        }

        public String toString() {
            return "{ at: " + at + ", dId: " + dId + ", aId: " + aId + ", author: " + author + ", aName: " + aName + ", parent: " + parent + ", xfdf: " + xfdf;
        }
    }

    static void initialize() throws Exception
	{
        String new_db = "";
        switch(ServerConfig.getDatabaseType()) {
            case "POSTGRES":
                Class.forName("org.postgresql.Driver");
                new_db = "jdbc:postgresql://" + ServerConfig.getDatabasePath();
                break;
            default:
                Class.forName("org.sqlite.JDBC");
                new_db = "jdbc:sqlite:"+ ServerConfig.getDatabasePath();
        }
        
        System.out.println("initializing Database \"" + new_db + "\"");
        connection = DriverManager.getConnection(new_db);
        System.out.println("initialized Database");
	}

	static void initDBForType(DBWritable writable, String table_name) throws Exception{
        Statement stmt = connection.createStatement();
        StringBuilder sb = new StringBuilder();
        int num_col = writable.getNumColumns();
        sb.append("CREATE TABLE IF NOT EXISTS \"").append(table_name).append("\"(\n");
        for (int i = 0; i < num_col; ++i) {
            sb.append("\"" + writable.getColumnName(i) + "\"");
            sb.append(" ");
            sb.append(writable.getColumnType(i) + "\n");
            if(i == 0) {
                sb.append(" PRIMARY KEY");
            }
            if(i != num_col - 1) {
                sb.append(",");
            }
        }
        sb.append(");");
        stmt.executeUpdate(sb.toString());
        stmt.close();
        initDBObject(writable, table_name);
    }

    static void insertNewObject(DBWritable counter, String table) throws Exception{
        StringBuilder sb = new StringBuilder();
        sb.append("INSERT INTO ").append(table).append(" VALUES(");
        for (int i = 0; i < counter.getNumColumns(); ++i){
            sb.append(counter.getColumnValue(i));
            sb.append(",");
        }
        sb.replace(sb.length()-1, sb.length(), ");");
        Statement stmt = connection.createStatement();
        System.out.println(sb.toString());
        stmt.executeUpdate(sb.toString());
    }

    private static void initDBObject(DBWritable writable, String table_name) throws Exception {
        String sql = "SELECT * FROM \"" + table_name + "\" ORDER BY \""+ writable.getColumnName(0) +"\" DESC LIMIT 1";
        try (Statement stmt = connection.createStatement()) {
            ResultSet result = stmt.executeQuery(sql);
            if (result.next()) {
                for (int i = 1; i < writable.getNumColumns(); ++i) {
                    writable.setColumnValue(i, result.getLong(i + 1));
                }
            }
        }
    }

    // Create annotation and its corresponding document table
    public static void createAnnotations(String did, ArrayList<TreeMap<String, String>> annotationData) throws Exception {
        Statement stmt = connection.createStatement();
        String sql = "CREATE TABLE IF NOT EXISTS \"" + did + "\" (" +
                    "ID TEXT PRIMARY KEY     NOT NULL," +
                    "AUTHOR         TEXT," +
                    "AUTHOR_NAME    TEXT," +
                    "PARENT_AUTHOR  TEXT," +
                    "CREATED_AT     BIGINT," +
                    "MODIFIED_AT    BIGINT," + 
                    "XFDF           TEXT," +
                    "IS_ARCHIVED    BOOLEAN)"; 
        stmt.executeUpdate(sql);
        stmt.close();

        sql = "INSERT INTO \"" + did +
                 "\"(ID,AUTHOR,AUTHOR_NAME,PARENT_AUTHOR,CREATED_AT,MODIFIED_AT,XFDF,IS_ARCHIVED) " +
                 "VALUES (?,?,?,?,?,?,?,?)";
        PreparedStatement pstmt = connection.prepareStatement(sql);

        for (TreeMap<String, String> annot : annotationData) {
            pstmt.setString(1, annot.get("aId"));
            pstmt.setString(2, annot.get("author"));
            pstmt.setString(3, annot.get("aName"));
            pstmt.setString(4, annot.get("parent"));
            long currentTime = System.currentTimeMillis();
            pstmt.setLong(5, currentTime);
            pstmt.setLong(6, currentTime);
            pstmt.setString(7, annot.get("xfdf"));
            pstmt.setBoolean(8, false);
            pstmt.addBatch();
        }

        pstmt.executeBatch();  
    }

    // Update XFDF and modified at on annotation changed
    public static void updateAnnotations(String did, ArrayList<TreeMap<String, String>> annotationData) throws Exception {
        String sql = "UPDATE \"" + did + "\" SET XFDF = ?, MODIFIED_AT = ? " + "WHERE ID = ?";
        PreparedStatement pstmt = connection.prepareStatement(sql);

        for (TreeMap<String, String> annot : annotationData) {
            pstmt.setString(1, annot.get("xfdf"));
            pstmt.setLong(2, System.currentTimeMillis());
            pstmt.setString(3, annot.get("aId"));
            pstmt.addBatch();
        }

        pstmt.executeBatch();
    }

    // Mark the annotation as archived
    public static void deleteAnnotations(String did, ArrayList<TreeMap<String, String>> annotationData) throws Exception {
        String sql = "UPDATE \"" + did + "\" SET MODIFIED_AT = ?, IS_ARCHIVED = ? " + "WHERE ID = ?";
        PreparedStatement pstmt = connection.prepareStatement(sql);

        for (TreeMap<String, String> annot : annotationData) {
            pstmt.setLong(1, System.currentTimeMillis());
            pstmt.setBoolean(2, true);
            pstmt.setString(3, annot.get("aId"));
            pstmt.addBatch();
        }

        pstmt.executeBatch();
    }

    public static ArrayList<Annotation> retrieveAnnotations(String did) throws Exception {
        String sql = "SELECT * FROM \"" + did + "\"";
        ResultSet rs;

        try {
            PreparedStatement pstmt = connection.prepareStatement(sql);
            rs = pstmt.executeQuery();
        } catch (SQLException e) {
            // should error out if table does not exist
            // this is fine
            return null;
        }

        ArrayList<Annotation> annotations = new ArrayList<>();
        while(rs != null && rs.next()) {
            // Find the status of the annotation for the client.
            Boolean archivedAt = rs.getBoolean("IS_ARCHIVED");
            String annotId = rs.getString("ID");
            if (!archivedAt) {
                annotations.add(new Annotation(did, annotId, rs.getString("AUTHOR"), rs.getString("AUTHOR_NAME"), rs.getString("PARENT_AUTHOR"), rs.getString("XFDF")));
            } 
        }

        return annotations;
    }
}
