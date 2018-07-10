package com.pdftron.demoservlet;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.pdftron.server.DocReference;
import com.pdftron.server.Util;

import java.io.File;
import java.util.TreeMap;
import java.util.Map;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.Random;

public class SessionHelper {
	
	static private final ArrayList<String> defaultNames = new ArrayList<>();
	static private final Random rng = new Random();
	static private final String session_info_version = "0.11";
	
	private static class SessionDocRecord implements java.io.Serializable
	{
		long accessed = 0;
		long created = 0;
		String uri = null;
		String share_id = null;
		String ext = null;
	}

	public synchronized static void initSession (HttpSession session) {
		initSessionUnLocked(session);
	}

	private static void initSessionUnLocked(HttpSession session){
		boolean newDocList = false;
		if(session.getAttribute("share_id") == null)
		{
			String share_id = Util.randomString(12);
			session.setAttribute("share_id", share_id);
		}
		if(session.getAttribute("share_list") == null)
		{
			session.setAttribute("share_list", new TreeMap<String, SessionDocRecord>());
		}
		if(session.getAttribute("doc_list") == null)
		{
			session.setAttribute("doc_list", new TreeMap<String, SessionDocRecord>());
			newDocList = true;
		}
		String version = (String)session.getAttribute("version");
		if(session.isNew() || session.getAttribute("user_name") == null 
			|| version == null || version.compareTo(session_info_version) < 0)
		{
			System.err.println("Creating new session");
			String random_name = defaultNames.get(rng.nextInt(defaultNames.size()));
			session.setAttribute("user_name", random_name);
			session.setAttribute("doc_list", new TreeMap<String, SessionDocRecord>());
			session.setAttribute("version", session_info_version);
			session.setAttribute("share_list", new TreeMap<String, SessionDocRecord>());
		}
		if(newDocList){
            System.out.println("Creating new doclist");
			String newShareID = (String)session.getAttribute("share_id");
			try {
				File preloaded = new File(Util.mapToStaticLocation("Preloaded"));
				File[] listOfFiles = preloaded.listFiles();
				long accessShift = 0;
				for (File file : listOfFiles) {
					String name = "http://www.pdftron.com/downloads/pl/" + file.getName();
					DocReference docRef = new DocReference(name, newShareID, null);
					addDocToListImpl(session, docRef, accessShift);
					accessShift += 1;
				}
			}
			catch(Exception e){
				Util.reportException(e);
			}
		}

	}

	@SuppressWarnings("unchecked")
	public static synchronized void addDocToList(HttpSession session, DocReference doc_ref){
		initSessionUnLocked(session);
		addDocToListImpl(session, doc_ref, 0);
	}


	@SuppressWarnings("unchecked")
	private static void addDocToListImpl(HttpSession session, DocReference doc_ref, long accessShiftMillis){
		TreeMap<String, SessionDocRecord> my_map;
		String my_share_id = (String)session.getAttribute("share_id");
		if(my_share_id.equals(doc_ref.share_id))
		{
			my_map = (TreeMap<String, SessionDocRecord>)session.getAttribute("doc_list");
		}
		else
		{
			my_map = (TreeMap<String, SessionDocRecord>)session.getAttribute("share_list");
		}

		if(my_map != null)
		{
			SessionDocRecord found = my_map.get(doc_ref.doc_id);
			long current_time = System.currentTimeMillis() + accessShiftMillis;
			if(found == null)
			{
				Info.countSession();
				found = new SessionDocRecord();
				found.created = current_time;
				found.share_id = doc_ref.share_id;
				found.uri = doc_ref.uri;
				found.ext = doc_ref.getFileExtension();
				my_map.put(doc_ref.doc_id, found);
			}
			found.accessed = current_time;
		}
		else{
            System.out.println("Null doc list");
        }
	}
	
	public static String docListJsonByAccess(HttpSession session) throws Exception
	{
		return docListJsonByAccessImpl(session, "doc_list");
	}
	
	public static String sharedDocListJsonByAccess(HttpSession session) throws Exception
	{
		return docListJsonByAccessImpl(session, "share_list");
	}
	
	public static String docListJsonByCreation(HttpSession session) throws Exception
	{
		return docListJsonByCreationImpl(session, "doc_list");
	}
	
	public static String sharedDocListJsonByCreation(HttpSession session) throws Exception
	{
		return docListJsonByCreationImpl(session, "share_list");
	}
	
	@SuppressWarnings("unchecked")
	private synchronized static String docListJsonByAccessImpl(HttpSession session, String list_id) throws Exception
	{
		initSessionUnLocked(session);
		TreeMap<Long, DocReference> temp_map = new TreeMap<>();
		System.out.println("getting access sorted list " + list_id);
		TreeMap<String, SessionDocRecord> my_map = (TreeMap<String, SessionDocRecord>)session.getAttribute(list_id);
		for (Map.Entry<String, SessionDocRecord> entry : my_map.entrySet())
		{
		   DocReference doc_ref = new DocReference(entry.getValue().uri, entry.getValue().share_id, entry.getValue().ext);
		   temp_map.put(entry.getValue().accessed, doc_ref);
		}
		Gson gson = new GsonBuilder().create();
		return gson.toJson(temp_map.values());
	}

	@SuppressWarnings("unchecked")
	private synchronized static String docListJsonByCreationImpl(HttpSession session, String list_id) throws Exception
	{
		initSessionUnLocked(session);
		TreeMap<Long, DocReference> temp_map = new TreeMap<>();
		System.out.println("getting creation sorted  list " + list_id);
		TreeMap<String, SessionDocRecord> my_map = (TreeMap<String, SessionDocRecord>)session.getAttribute(list_id);
		for (Map.Entry<String, SessionDocRecord> entry : my_map.entrySet())
		{
			DocReference doc_ref = new DocReference(entry.getValue().uri, entry.getValue().share_id, entry.getValue().ext);
		   	temp_map.put(entry.getValue().created, doc_ref);
		}
		Gson gson = new GsonBuilder().create();
		return gson.toJson(temp_map.values());
	}
	
	public static String toJson(HttpSession session){
		Gson gson = new GsonBuilder().create();
		TreeMap <String, Object> temp = new TreeMap<>();
		temp.put("id", session.getId());
		temp.put("created", session.getCreationTime());
		temp.put("is_new", session.isNew());
		for (Enumeration<String> e = session.getAttributeNames(); e.hasMoreElements();)
		{
			String attr_name = e.nextElement();
			//if(!attr_name.equals("doc_list"))
			{
				temp.put(attr_name, session.getAttribute(attr_name));
			}
		}
		return gson.toJson(temp);
	}

	public static synchronized String getShareID(HttpServletRequest request, HttpSession session){
	    String ret = request.getParameter("share");
	    if(ret == null){
            initSessionUnLocked(session);
            ret = (String)session.getAttribute("share_id");
        }
        return ret;
    }
	
	
	static void initialize(){
		defaultNames.clear();
		defaultNames.add("Aardvark");
		defaultNames.add("Albatross");
		defaultNames.add("Alligator");
		defaultNames.add("Alpaca");
		defaultNames.add("Ant");
		defaultNames.add("Anteater");
		defaultNames.add("Antelope");
		defaultNames.add("Ape");
		defaultNames.add("Armadillo");
		defaultNames.add("Baboon");
		defaultNames.add("Badger");
		defaultNames.add("Barracuda");
		defaultNames.add("Bat");
		defaultNames.add("Bear");
		defaultNames.add("Beaver");
		defaultNames.add("Bee");
		defaultNames.add("Bison");
		defaultNames.add("Boar");
		defaultNames.add("Buffalo");
		defaultNames.add("Galago");
		defaultNames.add("Butterfly");
		defaultNames.add("Camel");
		defaultNames.add("Caribou");
		defaultNames.add("Cat");
		defaultNames.add("Caterpillar");
		defaultNames.add("Cattle");
		defaultNames.add("Chamois");
		defaultNames.add("Cheetah");
		defaultNames.add("Chicken");
		defaultNames.add("Chimpanzee");
		defaultNames.add("Chinchilla");
		defaultNames.add("Chough");
		defaultNames.add("Clam");
		defaultNames.add("Cobra");
		defaultNames.add("Cockroach");
		defaultNames.add("Cod");
		defaultNames.add("Cormorant");
		defaultNames.add("Coyote");
		defaultNames.add("Crab");
		defaultNames.add("Crane");
		defaultNames.add("Crocodile");
		defaultNames.add("Crow");
		defaultNames.add("Curlew");
		defaultNames.add("Deer");
		defaultNames.add("Dinosaur");
		defaultNames.add("Dog");
		defaultNames.add("Dogfish");
		defaultNames.add("Dolphin");
		defaultNames.add("Donkey");
		defaultNames.add("Dotterel");
		defaultNames.add("Dove");
		defaultNames.add("Dragonfly");
		defaultNames.add("Duck");
		defaultNames.add("Dugong");
		defaultNames.add("Dunlin");
		defaultNames.add("Eagle");
		defaultNames.add("Echidna");
		defaultNames.add("Eel");
		defaultNames.add("Eland");
		defaultNames.add("Elephant");
		defaultNames.add("Elephant seal");
		defaultNames.add("Elk");
		defaultNames.add("Emu");
		defaultNames.add("Falcon");
		defaultNames.add("Ferret");
		defaultNames.add("Finch");
		defaultNames.add("Fish");
		defaultNames.add("Flamingo");
		defaultNames.add("Fly");
		defaultNames.add("Fox");
		defaultNames.add("Frog");
		defaultNames.add("Gaur");
		defaultNames.add("Gazelle");
		defaultNames.add("Gerbil");
		defaultNames.add("Giant Panda");
		defaultNames.add("Giraffe");
		defaultNames.add("Gnat");
		defaultNames.add("Gnu");
		defaultNames.add("Goat");
		defaultNames.add("Goose");
		defaultNames.add("Goldfinch");
		defaultNames.add("Goldfish");
		defaultNames.add("Gorilla");
		defaultNames.add("Goshawk");
		defaultNames.add("Grasshopper");
		defaultNames.add("Grouse");
		defaultNames.add("Guanaco");
		defaultNames.add("Guinea fowl");
		defaultNames.add("Guinea pig");
		defaultNames.add("Gull");
		defaultNames.add("Hamster");
		defaultNames.add("Hare");
		defaultNames.add("Hawk");
		defaultNames.add("Hedgehog");
		defaultNames.add("Heron");
		defaultNames.add("Herring");
		defaultNames.add("Hippopotamus");
		defaultNames.add("Hornet");
		defaultNames.add("Horse");
		defaultNames.add("Human");
		defaultNames.add("Hummingbird");
		defaultNames.add("Hyena");
		defaultNames.add("Jackal");
		defaultNames.add("Jaguar");
		defaultNames.add("Jay");
		defaultNames.add("Blue Jay");
		defaultNames.add("Jellyfish");
		defaultNames.add("Kangaroo");
		defaultNames.add("Koala");
		defaultNames.add("Komodo dragon");
		defaultNames.add("Kouprey");
		defaultNames.add("Kudu");
		defaultNames.add("Lapwing");
		defaultNames.add("Lark");
		defaultNames.add("Lemur");
		defaultNames.add("Leopard");
		defaultNames.add("Lion");
		defaultNames.add("Llama");
		defaultNames.add("Lobster");
		defaultNames.add("Locust");
		defaultNames.add("Loris");
		defaultNames.add("Louse");
		defaultNames.add("Lyrebird");
		defaultNames.add("Magpie");
		defaultNames.add("Mallard");
		defaultNames.add("Manatee");
		defaultNames.add("Marten");
		defaultNames.add("Meerkat");
		defaultNames.add("Mink");
		defaultNames.add("Mole");
		defaultNames.add("Monkey");
		defaultNames.add("Moose");
		defaultNames.add("Mouse");
		defaultNames.add("Mosquito");
		defaultNames.add("Mule");
		defaultNames.add("Narwhal");
		defaultNames.add("Newt");
		defaultNames.add("Nightingale");
		defaultNames.add("Octopus");
		defaultNames.add("Okapi");
		defaultNames.add("Opossum");
		defaultNames.add("Oryx");
		defaultNames.add("Ostrich");
		defaultNames.add("Otter");
		defaultNames.add("Owl");
		defaultNames.add("Ox");
		defaultNames.add("Oyster");
		defaultNames.add("Panther");
		defaultNames.add("Parrot");
		defaultNames.add("Partridge");
		defaultNames.add("Peafowl");
		defaultNames.add("Pelican");
		defaultNames.add("Penguin");
		defaultNames.add("Pheasant");
		defaultNames.add("Pig");
		defaultNames.add("Pigeon");
		defaultNames.add("Pony");
		defaultNames.add("Porcupine");
		defaultNames.add("Porpoise");
		defaultNames.add("Prairie Dog");
		defaultNames.add("Quail");
		defaultNames.add("Quelea");
		defaultNames.add("Rabbit");
		defaultNames.add("Raccoon");
		defaultNames.add("Rail");
		defaultNames.add("Ram");
		defaultNames.add("Rat");
		defaultNames.add("Raven");
		defaultNames.add("Red deer");
		defaultNames.add("Red panda");
		defaultNames.add("Reindeer");
		defaultNames.add("Rhinoceros");
		defaultNames.add("Rook");
		defaultNames.add("Ruff");
		defaultNames.add("Salamander");
		defaultNames.add("Salmon");
		defaultNames.add("Sand Dollar");
		defaultNames.add("Sandpiper");
		defaultNames.add("Sardine");
		defaultNames.add("Scorpion");
		defaultNames.add("Sea lion");
		defaultNames.add("Sea Urchin");
		defaultNames.add("Seahorse");
		defaultNames.add("Seal");
		defaultNames.add("Shark");
		defaultNames.add("Sheep");
		defaultNames.add("Shrew");
		defaultNames.add("Shrimp");
		defaultNames.add("Skunk");
		defaultNames.add("Snail");
		defaultNames.add("Snake");
		defaultNames.add("Spider");
		defaultNames.add("Squid");
		defaultNames.add("Squirrel");
		defaultNames.add("Starling");
		defaultNames.add("Stingray");
		defaultNames.add("Stinkbug");
		defaultNames.add("Stork");
		defaultNames.add("Swallow");
		defaultNames.add("Swan");
		defaultNames.add("Tapir");
		defaultNames.add("Tarsier");
		defaultNames.add("Termite");
		defaultNames.add("Tiger");
		defaultNames.add("Toad");
		defaultNames.add("Trout");
		defaultNames.add("Turkey");
		defaultNames.add("Turtle");
		defaultNames.add("Vicuña");
		defaultNames.add("Viper");
		defaultNames.add("Vulture");
		defaultNames.add("Wallaby");
		defaultNames.add("Walrus");
		defaultNames.add("Wasp");
		defaultNames.add("Water buffalo");
		defaultNames.add("Weasel");
		defaultNames.add("Whale");
		defaultNames.add("Wolf");
		defaultNames.add("Wolverine");
		defaultNames.add("Wombat");
		defaultNames.add("Woodcock");
		defaultNames.add("Woodpecker");
		defaultNames.add("Worm");
		defaultNames.add("Wren");
		defaultNames.add("Yak");
		defaultNames.add("Zebra");
		System.out.println("initialized SessionHelper");
	}
	
}
