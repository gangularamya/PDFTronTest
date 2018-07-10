package com.pdftron.demoservlet;

import javax.servlet.ServletContext;
import java.util.Timer;
import java.util.TimerTask;
import java.util.TreeMap;
import java.lang.Runtime;

import com.pdftron.demoservlet.Database;
import com.pdftron.pdf.*;
import com.pdftron.server.ServerConfig;
import com.pdftron.server.Util;

import java.lang.management.ManagementFactory;
import java.util.concurrent.atomic.AtomicLong;

public class Info {
	static TreeMap<String, Object> m_initial_attributes = new TreeMap<String, Object>();
	static DocCounter m_all_counter = null;
	static Timer m_persist_timer = null;
	static CountPersistTask m_persist_task = null;

	public static class DocCounter implements Database.DBWritable {
	    DocCounter(String ftype){
            if(ftype == null){
                m_ftype = "null";
            }
            else if (ftype.length() > 255){
                m_ftype = ftype.substring(0, 255);
            }
            else {
                m_ftype = ftype;
            }
        }

        @Override
        public int getNumColumns(){
	        return 9;
        }

        @Override
        public String getColumnName(int index) throws Exception{
	        switch (index){
                case 0: return "time";
                case 1: return "upload";
                case 2: return "fetch";
                case 3: return "convert";
                case 4: return "render";
                case 5: return "view";
                case 6: return "error";
                case 7: return "init";
                case 8: return "session";
            }
            throw new Exception("invalid counter index " + index);
        }
        public String getColumnType(int index) throws Exception{
            switch (index){
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                // integer types are all the same in sqllite, but not in postgres
                case 8: return "BIGINT";
            }
            throw new Exception("invalid counter index " + index);
        }

        public Object getColumnValue(int index) throws Exception{
            switch (index){
                case 0: return (new java.util.Date()).getTime();
                case 1: return m_uploaded.get();
                case 2: return m_fetched.get();
                case 3: return m_converted.get();
                case 4: return m_rendered.get();
                case 5: return m_viewed.get();
                case 6: return m_errors.get();
                case 7: return m_inits.get();
                case 8: return m_sessions.get();
            }
            throw new Exception("invalid counter index " + index);
        }

        public void setColumnValue(int index, Object val) throws Exception{
            switch (index){
                case 0: return;
                case 1: m_uploaded.set((long)val); return;
                case 2: m_fetched.set((long)val); return;
                case 3: m_converted.set((long)val); return;
                case 4: m_rendered.set((long)val); return;
                case 5: m_viewed.set((long)val); return;
                case 6: m_errors.set((long)val); return;
                case 7: m_inits.set((long)val); return;
                case 8: m_sessions.set((long)val); return;
            }
            throw new Exception("invalid counter index " + index);
        }

        public final String m_ftype;
        public AtomicLong m_uploaded = new AtomicLong(0);
        public AtomicLong m_fetched = new AtomicLong(0);
        public AtomicLong m_converted = new AtomicLong(0);
        public AtomicLong m_rendered = new AtomicLong(0);
        public AtomicLong m_viewed = new AtomicLong(0);
        public AtomicLong m_errors = new AtomicLong(0);
        public AtomicLong m_inits = new AtomicLong(0);
        public AtomicLong m_sessions = new AtomicLong(0);
        public AtomicLong m_num_changes = new AtomicLong(0);
    };

	static class CountPersistTask extends TimerTask{
        @Override
        public void run() {
            long orig_count = m_all_counter.m_num_changes.getAndSet(0);
            if(orig_count > 0) {
                System.out.println("Persisting counter changes. Changes: " + orig_count);
                try {
                    Database.insertNewObject(m_all_counter, "counts");
                } catch (Exception e) {
                    System.err.println("Error updating counts: " + e.getMessage());
                    m_all_counter.m_num_changes.addAndGet(orig_count);
                }
            }
        }
    };

	public static void initialize(ServletContext ctx) throws Exception
	{
		m_initial_attributes.put("info", ctx.getServerInfo());
		m_initial_attributes.put("path", ctx.getContextPath());
		m_initial_attributes.put("version_minor", ctx.getMinorVersion());
		m_initial_attributes.put("version_major", ctx.getMajorVersion());
		m_initial_attributes.put("name", ctx.getServletContextName());
		m_all_counter = new DocCounter("all");
		Database.initDBForType(m_all_counter, "counts");
		m_persist_timer = new Timer(true);
		m_persist_task = new CountPersistTask();
        m_persist_timer.schedule(m_persist_task, 1*1000, 10*1000);
        System.out.println("initialized Info");
	}

	public static void terminate(){
	    if(m_persist_timer != null) {
            m_persist_timer.cancel();
            CountPersistTask shutdown_persist = new CountPersistTask();
            shutdown_persist.run();
        }
    }

	public static String usageInfo(){
		com.sun.management.OperatingSystemMXBean os_bean = (com.sun.management.OperatingSystemMXBean)ManagementFactory.getOperatingSystemMXBean();
		TreeMap<String, Object> map = new TreeMap<String, Object>();
		map.put("free_mem", os_bean.getFreePhysicalMemorySize()/(1024*1024.0));
		map.put("process_load", os_bean.getProcessCpuLoad());
		map.put("phys_mem", os_bean.getTotalPhysicalMemorySize()/(1024*1024.0));
		String ret = Util.toJson(map);
		System.out.println(ret);
		return ret;
	}

	public static String systemInfo() throws Exception{
		TreeMap<String, Object> map = new TreeMap<String, Object>();
        Runtime rt = Runtime.getRuntime();
        map.put("PDFNet_version", PDFNet.getVersion());
        map.put("server_version", ServerConfig.getVersion());
        map.put("total_memory", rt.totalMemory()/(1024*1024.0));
        map.put("num_cpu", rt.availableProcessors());
        map.put("os_arch", System.getProperty("os.arch"));
        map.put("os_name", System.getProperty("os.name"));
        map.put("os_version", System.getProperty("os.version"));
        return Util.toJson(map);
	}


	static public void countViewed(String ftype){
        m_all_counter.m_viewed.incrementAndGet();
        m_all_counter.m_num_changes.incrementAndGet();
    }

    static public void countUploaded(String ftype){
        m_all_counter.m_uploaded.incrementAndGet();
        m_all_counter.m_num_changes.incrementAndGet();
    }

    static public void countConverted(String ftype){
        m_all_counter.m_converted.incrementAndGet();
        m_all_counter.m_num_changes.incrementAndGet();
    }

    static public void countFetched(String ftype){
        m_all_counter.m_fetched.incrementAndGet();
        m_all_counter.m_num_changes.incrementAndGet();
    }

    static public void countInit(){
        m_all_counter.m_inits.incrementAndGet();
        m_all_counter.m_num_changes.incrementAndGet();
    }

    static public void countRendered(String ftype){
        m_all_counter.m_rendered.incrementAndGet();
        m_all_counter.m_num_changes.incrementAndGet();
    }

    static public void countSession(){
        m_all_counter.m_sessions.incrementAndGet();
        m_all_counter.m_num_changes.incrementAndGet();
    }

	public static String serverInfo(){
		return Util.toJson(m_initial_attributes);
	}
}
