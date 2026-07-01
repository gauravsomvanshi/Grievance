import re

def detect_language(text):
    text_lower = text.lower()
    # Check for Devanagari Unicode Range
    if re.search(r'[\u0900-\u097F]', text):
        return "Hindi"
    
    # If standard English letters, check for Hinglish indicators
    hinglish_keywords = [
        "mera", "meri", "ho gaya", "paas", "hai", "pe", "chori", "maar", "peet", "ladai", 
        "khet", "jameen", "kabza", "paisa", "kat", "gaya", "chhedkhani", "ladka", "karwao", "bhago"
    ]
    
    words = text_lower.split()
    matches = sum(1 for word in words if word in hinglish_keywords)
    if matches >= 1:
        return "Hinglish"
    
    return "English"

def classify_category(text, language):
    text_lower = text.lower()
    
    # Keywords dictionaries
    categories = {
        "Women Safety": {
            "keywords": [
                "chhedkhani", "harassment", "abuse", "ladki", "mahila", "suraksha", "safety",
                "stalking", "peechha", " छेड़खानी", "उत्पीड़न", "महिला", "सुरक्षा", "बदतमीजी", 
                "छेड़छाड़", "rape", "molestation", "eve teasing", "girl", "woman"
            ],
            "weight": 0
        },
        "Cyber Fraud": {
            "keywords": [
                "otp", "link click", "bank account", "card blocked", "fraud", "upi", "paise", "paytm",
                "debit", "credit card", "cyber", "phishing", "account hacked", "hack", "ओटीपी",
                "बैंक खाता", "धोखाधड़ी", "साइबर", "पैसे कट गए", "ट्रांजैक्शन"
            ],
            "weight": 0
        },
        "Land Dispute": {
            "keywords": [
                "jameen", "land", "kabza", "khet", "boundary", "registry", "vivad", "plot", " قبضہ",
                "जमीन", "भूमि विवाद", "खेत", "रजिस्ट्री", "मेढ़", "property dispute", "illegal construction"
            ],
            "weight": 0
        },
        "Theft/Robbery": {
            "keywords": [
                "chori", "loot", "dacaiti", "stolen", "stole", "robbery", "theft", "missing", "ghayab",
                "purse", "mobile", "bike", "cycle", "tala", "चोरी", "लूट", "डकैती", "गायब", "ताला टूट"
            ],
            "weight": 0
        },
        "Assault/Violence": {
            "keywords": [
                "maar peet", "lathi", "chaku", "goli", "ladai", "jhagda", "danga", "violence", "beat",
                "fight", "weapon", "kill", "threat", "मारपीट", "लाठी", "चाकू", "गोली", "लड़ाई", "झगड़ा",
                "जान से मारने की धमकी", "हमला"
            ],
            "weight": 0
        }
    }
    
    # Calculate scores
    for cat, data in categories.items():
        for keyword in data["keywords"]:
            if keyword in text_lower:
                data["weight"] += 2
                # Exact matches in native script get extra weight
                if language == "Hindi" and re.search(r'[\u0900-\u097F]', keyword):
                    data["weight"] += 1

    # Find category with highest weight
    max_cat = "General Inquiry"
    max_weight = 1  # Threshold
    for cat, data in categories.items():
        if data["weight"] > max_weight:
            max_weight = data["weight"]
            max_cat = cat
            
    return max_cat

def extract_entities(text):
    text_lower = text.lower()
    
    # District mappings
    districts = {
        "lucknow": ["lucknow", "लखनऊ", "lko"],
        "kanpur": ["kanpur", "कानपुर", "knp"],
        "varanasi": ["varanasi", "वाराणसी", "banaras", "काशी"],
        "agra": ["agra", "आगरा"]
    }
    
    detected_district = "Lucknow" # Default
    for dist, aliases in districts.items():
        for alias in aliases:
            if alias in text_lower:
                detected_district = dist.capitalize()
                break
                
    # Station mappings (based on our DB seed)
    stations = {
        "Hazratganj": ["hazratganj", "हजरतगंज", "hazrat ganj"],
        "Aliganj": ["aliganj", "अलीगंज"],
        "Gomti Nagar": ["gomti nagar", "गोमती नगर", "gomtinagar"],
        "Kalyanpur": ["kalyanpur", "कल्याणपुर"],
        "Kakadeo": ["kakadeo", "काकादेव"],
        "Sigra": ["sigra", "सिगरा"],
        "Lanka": ["lanka", "लंका"],
        "Tajganj": ["tajganj", "ताजगंज"],
        "Hariparwat": ["hariparwat", "हरीपर्वत", "hari parwat"]
    }
    
    detected_station = None
    for station, aliases in stations.items():
        for alias in aliases:
            if alias in text_lower:
                detected_station = station
                break
                
    # Fallback to map station based on district if not explicitly mentioned
    if not detected_station:
        if detected_district == "Lucknow":
            detected_station = "Hazratganj"
        elif detected_district == "Kanpur":
            detected_station = "Kalyanpur"
        elif detected_district == "Varanasi":
            detected_station = "Sigra"
        elif detected_district == "Agra":
            detected_station = "Tajganj"
            
    return detected_district, detected_station

def check_spam(text):
    text_lower = text.lower()
    spam_patterns = [
        r"(win|cash|prize|money|lottery|free|iphone|gold|gift)",
        r"(click here|visit website|link below|viagra|invest now|earn daily)",
        r"(ads|casino|betting|lotto|subscribe|crypto)"
    ]
    
    # Check patterns
    spam_hits = 0
    for pattern in spam_patterns:
        if re.search(pattern, text_lower):
            spam_hits += 1
            
    # Repetitive character/word spam
    words = text_lower.split()
    if len(words) > 0:
        unique_ratio = len(set(words)) / len(words)
        if unique_ratio < 0.35 and len(words) > 10:
            return True
            
    return spam_hits >= 2

def calculate_urgency(text, category):
    text_lower = text.lower()
    base_urgency = {
        "Women Safety": 8,
        "Cyber Fraud": 7,
        "Land Dispute": 5,
        "Theft/Robbery": 5,
        "Assault/Violence": 8,
        "General Inquiry": 3
    }
    
    score = base_urgency.get(category, 4)
    
    # Check severity boosters
    boosters = [
        "weapon", "chaku", "goli", "gun", "knife", "pistol", "lathi", "talwar", "जान से मारने",
        "attack", "murder", "apaharan", "kidnap", "rape", "acid", "blood", "khoon", "physical"
    ]
    
    for booster in boosters:
        if booster in text_lower:
            score += 2
            break
            
    # Cap score between 1 and 10
    return min(max(score, 1), 10)

def analyze_sentiment(text):
    text_lower = text.lower()
    # Most grievances are negative. Let's look for indicators of positive/neutral text.
    positive_indicators = ["thank you", "dhanyawad", "shukriya", "good work", "helpful", "धन्यवाद", "बधाई"]
    neutral_indicators = ["inquiry", "information", "how to", "status query", "पूछताछ", "जानकारी"]
    
    for ind in positive_indicators:
        if ind in text_lower:
            return "Positive"
            
    for ind in neutral_indicators:
        if ind in text_lower:
            return "Neutral"
            
    return "Negative"

def parse_grievance(text):
    """
    Main entry point for AI analysis of incoming grievance.
    """
    is_spam = check_spam(text)
    if is_spam:
        return {
            "language": detect_language(text),
            "category": "General Inquiry",
            "district": "Lucknow",
            "assigned_station": "Aliganj",
            "urgency_score": 1,
            "sentiment": "Neutral",
            "is_spam": True
        }
        
    lang = detect_language(text)
    category = classify_category(text, lang)
    district, station = extract_entities(text)
    urgency = calculate_urgency(text, category)
    sentiment = analyze_sentiment(text)
    
    return {
        "language": lang,
        "category": category,
        "district": district,
        "assigned_station": station,
        "urgency_score": urgency,
        "sentiment": sentiment,
        "is_spam": False
    }

if __name__ == "__main__":
    # Test cases
    test_cases = [
        "Mera phone Gomti Nagar metro station ke paas se chori ho gaya hai.",
        "एक लड़का पिछले 3 दिनों से लड़कियों का पीछा कर रहा है और बदतमीजी करता है गोमती नगर में।",
        "Kalyanpur area me mere plot pe padosi ne jabarjasti kabza kiya hai aur ladne ko taiyar hai lathi leke.",
        "win free cash prize click www.scamlink.com to claim your reward now win cash",
        "How can I apply for character certificate online?"
    ]
    for tc in test_cases:
        print(f"Text: {tc}")
        print(f"Result: {parse_grievance(tc)}")
        print("-" * 50)
