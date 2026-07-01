import sqlite3
import os
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "cctns_mock.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create police stations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS police_stations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            district TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            sho_name TEXT NOT NULL,
            phone TEXT NOT NULL
        )
    """)
    
    # Create grievances table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS grievances (
            ticket_id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            language TEXT NOT NULL,
            category TEXT NOT NULL,
            urgency_score INTEGER NOT NULL,
            sentiment TEXT NOT NULL,
            district TEXT NOT NULL,
            assigned_station_id INTEGER,
            status TEXT DEFAULT 'Pending',
            is_spam INTEGER DEFAULT 0,
            action_diary TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            escalated INTEGER DEFAULT 0,
            escalation_time TEXT NOT NULL,
            FOREIGN KEY(assigned_station_id) REFERENCES police_stations(id)
        )
    """)
    
    # Check if police stations are seeded, if not seed them
    cursor.execute("SELECT COUNT(*) FROM police_stations")
    if cursor.fetchone()[0] == 0:
        stations = [
            ("Hazratganj", "Lucknow", 26.8504, 80.9499, "Inspector Akhilesh Singh", "+91 9454403801"),
            ("Aliganj", "Lucknow", 26.8894, 80.9413, "Inspector Rajesh Kumar", "+91 9454403802"),
            ("Gomti Nagar", "Lucknow", 26.8478, 80.9984, "Inspector Pramod Mishra", "+91 9454403803"),
            ("Kalyanpur", "Kanpur", 26.5186, 80.2505, "Inspector Devendra Singh", "+91 9454403901"),
            ("Kakadeo", "Kanpur", 26.4789, 80.3015, "Inspector Sanjay Yadav", "+91 9454403902"),
            ("Sigra", "Varanasi", 25.3176, 82.9876, "Inspector Vinay Verma", "+91 9454404001"),
            ("Lanka", "Varanasi", 25.2677, 82.9975, "Inspector Ashutosh Tiwari", "+91 9454404002"),
            ("Tajganj", "Agra", 27.1643, 78.0421, "Inspector Shailendra Giri", "+91 9454404101"),
            ("Hariparwat", "Agra", 27.1994, 78.0069, "Inspector V.K. Singh", "+91 9454404102"),
        ]
        cursor.executemany("""
            INSERT INTO police_stations (name, district, latitude, longitude, sho_name, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        """, stations)
        
    # Check if grievances are seeded, if not seed some mock data for beautiful dashboard loading
    cursor.execute("SELECT COUNT(*) FROM grievances")
    if cursor.fetchone()[0] == 0:
        # Base time for seeded cases
        now = datetime.now()
        
        # 1. Women Safety complaint (Urgent, Gomti Nagar)
        diary_1 = json.dumps([
            {"time": (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."},
            {"time": (now - timedelta(minutes=90)).strftime("%Y-%m-%d %H:%M:%S"), "message": "SHO Gomti Nagar acknowledged. Dispatching patrol vehicle."}
        ])
        
        # 2. Cyber fraud complaint (Pending, Kalyanpur)
        diary_2 = json.dumps([
            {"time": (now - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."}
        ])
        
        # 3. Land Dispute (Resolved, Sigra)
        diary_3 = json.dumps([
            {"time": (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."},
            {"time": (now - timedelta(days=2, hours=2)).strftime("%Y-%m-%d %H:%M:%S"), "message": "SHO Sigra summoned both parties to police station."},
            {"time": (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Dispute amicably resolved. Peace bond signed by both parties. Status closed."}
        ])
        
        # 4. Theft (Pending, Hazratganj - Escalated since it's older than 1 min demo SLA)
        diary_4 = json.dumps([
            {"time": (now - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."}
        ])

        # 5. Spam complaint (Spam, Aliganj)
        diary_5 = json.dumps([
            {"time": (now - timedelta(hours=12)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. AI filtered as SPAM due to duplicate nonsense text."}
        ])

        # 6. Assault/Violence complaint (Pending, Tajganj)
        diary_6 = json.dumps([
            {"time": (now - timedelta(minutes=8)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."}
        ])

        # 7. Land Dispute (Under Investigation, Kakadeo)
        diary_7 = json.dumps([
            {"time": (now - timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."},
            {"time": (now - timedelta(hours=3, minutes=20)).strftime("%Y-%m-%d %H:%M:%S"), "message": "SHO Kakadeo patrol team inspected the site. Halted work. Investigating registry documents."}
        ])

        # 8. Cyber Fraud (Resolved, Hariparwat)
        diary_8 = json.dumps([
            {"time": (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."},
            {"time": (now - timedelta(hours=19)).strftime("%Y-%m-%d %H:%M:%S"), "message": "SHO Hariparwat raised dispute with merchant gateway. Card blocked."},
            {"time": (now - timedelta(hours=14)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Cyber cell traced the gateway, money refunded to victim account. Case closed."}
        ])

        # 9. Women Safety (Pending, Lanka)
        diary_9 = json.dumps([
            {"time": (now - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."}
        ])

        # 10. Theft (Resolved, Hazratganj)
        diary_10 = json.dumps([
            {"time": (now - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Grievance registered. Routed automatically by UP Police AI."},
            {"time": (now - timedelta(hours=5)).strftime("%Y-%m-%d %H:%M:%S"), "message": "SHO Hazratganj traced suspect using market CCTV footage."},
            {"time": (now - timedelta(hours=2, minutes=46)).strftime("%Y-%m-%d %H:%M:%S"), "message": "Suspect apprehended, wallet recovered with documents. Wallet handed back to owner."}
        ])

        mock_grievances = [
            (
                "TKT-20260701-0001",
                "एक लड़का पिछले 3 दिनों से गोमती नगर पार्क के पास लड़कियों का पीछा कर रहा है और फब्तियां कस रहा है। कृपया कार्रवाई करें।",
                "Hindi",
                "Women Safety",
                9,
                "Negative",
                "Lucknow",
                3, # Gomti Nagar
                "Under Investigation",
                0,
                diary_1,
                (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
                0,
                (now - timedelta(hours=2) + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0002",
                "Dear Sir, I received an SMS saying my electricity bill is unpaid. I clicked the link and Rs 45,000 was debited from my SBI account. Please block the transaction.",
                "English",
                "Cyber Fraud",
                8,
                "Negative",
                "Kanpur",
                4, # Kalyanpur
                "Pending",
                0,
                diary_2,
                (now - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
                1, # Escalated because pending > 1 min
                (now - timedelta(minutes=44)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0003",
                "सिगरा के महमूरगंज इलाके में मेरे पुश्तैनी खेत पर पड़ोसी जबरन बाउंड्री वॉल बना रहा है। रोकने पर मारपीट करने की धमकी दे रहा है।",
                "Hindi",
                "Land Dispute",
                6,
                "Negative",
                "Varanasi",
                6, # Sigra
                "Resolved",
                0,
                diary_3,
                (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"),
                0,
                (now - timedelta(days=2) + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0004",
                "Hazratganj metro station ke paas se mera black color ka Hero Splendor bike chori ho gaya hai. Frame number UP32-AA-9999.",
                "Hinglish",
                "Theft/Robbery",
                7,
                "Negative",
                "Lucknow",
                1, # Hazratganj
                "Pending",
                0,
                diary_4,
                (now - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
                1, # Escalated
                (now - timedelta(minutes=9)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0005",
                "free iphone 15 cash prize click now www.fake-win.com win free gold coin call support",
                "English",
                "General Inquiry",
                1,
                "Neutral",
                "Lucknow",
                2, # Aliganj
                "Pending",
                1, # Spam
                diary_5,
                (now - timedelta(hours=12)).strftime("%Y-%m-%d %H:%M:%S"),
                0,
                (now - timedelta(hours=12) + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0006",
                "Tajganj market me parking space ko lekar do paksho me lathi danda chal gaya hai. Tension badh rahi hai, turant police force bhejein.",
                "Hinglish",
                "Assault/Violence",
                10,
                "Negative",
                "Agra",
                8, # Tajganj
                "Pending",
                0,
                diary_6,
                (now - timedelta(minutes=8)).strftime("%Y-%m-%d %H:%M:%S"),
                1, # Escalated
                (now - timedelta(minutes=7)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0007",
                "काकादेव में नवीन मार्केट के पास हमारे कमर्शियल प्लॉट पर कल रात कुछ असामाजिक तत्वों ने जबरन कब्जा कर लिया है और विरोध करने पर जान से मारने की धमकी दी है।",
                "Hindi",
                "Land Dispute",
                8,
                "Negative",
                "Kanpur",
                5, # Kakadeo
                "Under Investigation",
                0,
                diary_7,
                (now - timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S"),
                0,
                (now - timedelta(hours=4) + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0008",
                "My credit card was cloned at a fuel station in Hariparwat, and Rs 80,000 has been debited. Transaction alert is showing international purchase.",
                "English",
                "Cyber Fraud",
                7,
                "Negative",
                "Agra",
                9, # Hariparwat
                "Resolved",
                0,
                diary_8,
                (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"),
                0,
                (now - timedelta(days=1) + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0009",
                "पिछले 1 हफ्ते से व्हाट्सएप पर अंजान नंबर से अश्लील तस्वीरें और धमकी भरे मैसेज आ रहे हैं। शिकायतकर्ता लंका वाराणसी क्षेत्र की निवासी है।",
                "Hindi",
                "Women Safety",
                9,
                "Negative",
                "Varanasi",
                7, # Lanka
                "Pending",
                0,
                diary_9,
                (now - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
                1, # Escalated
                (now - timedelta(minutes=14)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "TKT-20260701-0010",
                "Hazratganj market me shopping ke dauran mera brown leather wallet chori ho gaya. Aadhaar card and Rs 4000 cash details contained.",
                "Hinglish",
                "Theft/Robbery",
                5,
                "Negative",
                "Lucknow",
                1, # Hazratganj
                "Resolved",
                0,
                diary_10,
                (now - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S"),
                0,
                (now - timedelta(hours=6) + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
            )
        ]
        
        cursor.executemany("""
            INSERT INTO grievances (
                ticket_id, text, language, category, urgency_score, sentiment,
                district, assigned_station_id, status, is_spam, action_diary,
                created_at, escalated, escalation_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, mock_grievances)
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized and mock data seeded.")
