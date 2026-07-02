const API_BASE = "http://127.0.0.1:8000/api";

// System state
let isOfflineMode = false;
let activeTab = "citizen";
let selectedGrievanceId = null;
let countdownIntervals = {};

// Role-based Session State
let currentUserRole = null; // citizen, sho, io, sp
let currentUserSession = null; // { name: ..., details: ... }
let currentPublicImageBase64 = null;
let currentIOEvidenceImageBase64 = null;
let selectedIOCaseId = null;

// Cascading Offices Mappings
const SP_OFFICES = ["Lucknow SP Office", "Kanpur SP Office", "Varanasi SP Office", "Agra SP Office"];

const CIRCLE_OFFICES = {
    "Lucknow SP Office": ["Hazratganj Circle", "Aliganj Circle", "Gomti Nagar Circle"],
    "Kanpur SP Office": ["Kalyanpur Circle", "Kakadeo Circle"],
    "Varanasi SP Office": ["Sigra Circle", "Lanka Circle"],
    "Agra SP Office": ["Tajganj Circle", "Hariparwat Circle"]
};

const STATIONS_BY_CIRCLE = {
    "Hazratganj Circle": ["Hazratganj"],
    "Aliganj Circle": ["Aliganj"],
    "Gomti Nagar Circle": ["Gomti Nagar"],
    "Kalyanpur Circle": ["Kalyanpur"],
    "Kakadeo Circle": ["Kakadeo"],
    "Sigra Circle": ["Sigra"],
    "Lanka Circle": ["Lanka"],
    "Tajganj Circle": ["Tajganj"],
    "Hariparwat Circle": ["Hariparwat"]
};

// Mock Data for Offline Demo Mode
const MOCK_STATIONS = [
    { id: 1, name: "Hazratganj", district: "Lucknow", latitude: 26.8504, longitude: 80.9499, sho_name: "Inspector Akhilesh Singh", phone: "+91 9454403801" },
    { id: 2, name: "Aliganj", district: "Lucknow", latitude: 26.8894, longitude: 80.9413, sho_name: "Inspector Rajesh Kumar", phone: "+91 9454403802" },
    { id: 3, name: "Gomti Nagar", district: "Lucknow", latitude: 26.8478, longitude: 80.9984, sho_name: "Inspector Pramod Mishra", phone: "+91 9454403803" },
    { id: 4, name: "Kalyanpur", district: "Kanpur", latitude: 26.5186, longitude: 80.2505, sho_name: "Inspector Devendra Singh", phone: "+91 9454403901" },
    { id: 5, name: "Kakadeo", district: "Kanpur", latitude: 26.4789, longitude: 80.3015, sho_name: "Inspector Sanjay Yadav", phone: "+91 9454403902" },
    { id: 6, name: "Sigra", district: "Varanasi", latitude: 25.3176, longitude: 82.9876, sho_name: "Inspector Vinay Verma", phone: "+91 9454404001" },
    { id: 7, name: "Lanka", district: "Varanasi", latitude: 25.2677, longitude: 82.9975, sho_name: "Inspector Ashutosh Tiwari", phone: "+91 9454404002" },
    { id: 8, name: "Tajganj", district: "Agra", latitude: 27.1643, longitude: 78.0421, sho_name: "Inspector Shailendra Giri", phone: "+91 9454404101" },
    { id: 9, name: "Hariparwat", district: "Agra", latitude: 27.1994, longitude: 78.0069, sho_name: "Inspector V.K. Singh", phone: "+91 9454404102" }
];

// Initialize on Load
document.addEventListener("DOMContentLoaded", async () => {
    // Start Clock
    setInterval(updateClock, 1000);
    updateClock();
    
    // Check connection to backend
    await checkBackendConnection();
    
    // Load station dropdown lists
    await loadAllStations();
    
    // Start background tick loop
    setInterval(systemHeartbeat, 3000);
    
    // Initialize session state
    initSession();
});

// Update Header Clock
function updateClock() {
    const clock = document.getElementById("live-clock");
    if (clock) {
        const now = new Date();
        clock.textContent = "⏱️ " + now.toLocaleString('en-US', { 
            hour12: false, 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
}

// Check Backend connectivity to decide whether to run in Local Mock DB Mode or API Mode
async function checkBackendConnection() {
    const indicator = document.getElementById("sync-indicator");
    const title = document.getElementById("sync-status-title");
    const desc = document.getElementById("sync-status-desc");
    
    try {
        const res = await fetch(`${API_BASE}/stations`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
            isOfflineMode = false;
            indicator.className = "status-indicator online";
            title.textContent = "CCTNS Sync Online";
            desc.textContent = "SLA Monitor: Active";
            console.log("Connected to local Python server. Running in Live SQL mode.");
        } else {
            throw new Error();
        }
    } catch (e) {
        isOfflineMode = true;
        indicator.className = "status-indicator offline";
        title.textContent = "AI Demo Mode (Offline)";
        desc.textContent = "Running in LocalStorage Mode";
        console.warn("FastAPI server offline. Switched automatically to browser Offline Demo Mode.");
        
        // Seed local storage with default grievances on first launch
        initializeLocalStorageGrievances();
    }
}

// Seed mock grievances in LocalStorage for Offline Mode
function initializeLocalStorageGrievances() {
    if (!localStorage.getItem("up_police_grievances")) {
        const now = new Date();
        
        const formatTime = (date) => {
            return date.toISOString().replace('T', ' ').substring(0, 19);
        };
        
        const initialGrievances = [
            {
                ticket_id: "TKT-20260701-0001",
                text: "एक लड़का पिछले 3 दिनों से गोमती नगर पार्क के पास लड़कियों का पीछा कर रहा है और फब्तियां कस रहा है। कृपया कार्रवाई करें।",
                language: "Hindi",
                category: "Women Safety",
                urgency_score: 9,
                sentiment: "Negative",
                district: "Lucknow",
                assigned_station_id: 3, // Gomti Nagar
                station_name: "Gomti Nagar",
                sho_name: "Inspector Pramod Mishra",
                station_phone: "+91 9454403803",
                status: "Under Investigation",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 7200000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 5400000)), message: "[Inspector Pramod Mishra] Acknowledged. Dispatching patrol vehicle." }
                ],
                created_at: formatTime(new Date(now.getTime() - 7200000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 7140000))
            },
            {
                ticket_id: "TKT-20260701-0002",
                text: "Dear Sir, I received an SMS saying my electricity bill is unpaid. I clicked the link and Rs 45,000 was debited from my SBI account. Please block the transaction.",
                language: "English",
                category: "Cyber Fraud",
                urgency_score: 8,
                sentiment: "Negative",
                district: "Kanpur",
                assigned_station_id: 4, // Kalyanpur
                station_name: "Kalyanpur",
                sho_name: "Inspector Devendra Singh",
                station_phone: "+91 9454403901",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 2700000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 2700000)),
                escalated: true, // Escalated (> 1 min)
                escalation_time: formatTime(new Date(now.getTime() - 2640000))
            },
            {
                ticket_id: "TKT-20260701-0003",
                text: "सिगरा के महमूरगंज इलाके में मेरे पुश्तैनी खेत पर पड़ोसी जबरन बाउंड्री वॉल बना रहा है। रोकने पर मारपीट करने की धमकी दे रहा है।",
                language: "Hindi",
                category: "Land Dispute",
                urgency_score: 6,
                sentiment: "Negative",
                district: "Varanasi",
                assigned_station_id: 6, // Sigra
                station_name: "Sigra",
                sho_name: "Inspector Vinay Verma",
                station_phone: "+91 9454404001",
                status: "Resolved",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 172800000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 150000000)), message: "[Inspector Vinay Verma] Summoned both parties to police station." },
                    { time: formatTime(new Date(now.getTime() - 86400000)), message: "[Inspector Vinay Verma] Dispute amicably resolved. Peace bond signed by both parties. Status closed." }
                ],
                created_at: formatTime(new Date(now.getTime() - 172800000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 172740000))
            },
            {
                ticket_id: "TKT-20260701-0004",
                text: "Hazratganj metro station ke paas se mera black color ka Hero Splendor bike chori ho gaya hai. Frame number UP32-AA-9999.",
                language: "Hinglish",
                category: "Theft/Robbery",
                urgency_score: 7,
                sentiment: "Negative",
                district: "Lucknow",
                assigned_station_id: 1, // Hazratganj
                station_name: "Hazratganj",
                sho_name: "Inspector Akhilesh Singh",
                station_phone: "+91 9454403801",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 600000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 600000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 540000))
            },
            {
                ticket_id: "TKT-20260701-0005",
                text: "free iphone 15 cash prize click now www.fake-win.com win free gold coin call support",
                language: "English",
                category: "General Inquiry",
                urgency_score: 1,
                sentiment: "Neutral",
                district: "Lucknow",
                assigned_station_id: 2, // Aliganj
                station_name: "Aliganj",
                sho_name: "Inspector Rajesh Kumar",
                station_phone: "+91 9454403802",
                status: "Pending",
                is_spam: true,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 43200000)), message: "Grievance registered. AI filtered as SPAM due to duplicate nonsense text." }
                ],
                created_at: formatTime(new Date(now.getTime() - 43200000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 43140000))
            },
            {
                ticket_id: "TKT-20260701-0006",
                text: "Tajganj market me parking space ko lekar do paksho me lathi danda chal gaya hai. Tension badh rahi hai, turant police force bhejein.",
                language: "Hinglish",
                category: "Assault/Violence",
                urgency_score: 10,
                sentiment: "Negative",
                district: "Agra",
                assigned_station_id: 8, // Tajganj
                station_name: "Tajganj",
                sho_name: "Inspector Shailendra Giri",
                station_phone: "+91 9454404101",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 480000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 480000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 420000))
            },
            {
                ticket_id: "TKT-20260701-0007",
                text: "काकादेव में नवीन मार्केट के पास हमारे कमर्शियल प्लॉट पर कल रात कुछ असामाजिक तत्वों ने जबरन कब्जा कर लिया है और विरोध करने पर जान से मारने की धमकी दी है।",
                language: "Hindi",
                category: "Land Dispute",
                urgency_score: 8,
                sentiment: "Negative",
                district: "Kanpur",
                assigned_station_id: 5, // Kakadeo
                station_name: "Kakadeo",
                sho_name: "Inspector Sanjay Yadav",
                station_phone: "+91 9454403902",
                status: "Under Investigation",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 14400000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 12000000)), message: "[Inspector Sanjay Yadav] Police patrol inspected the site. Halted work. Investigating registry documents." }
                ],
                created_at: formatTime(new Date(now.getTime() - 14400000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 14340000))
            },
            {
                ticket_id: "TKT-20260701-0008",
                text: "My credit card was cloned at a fuel station in Hariparwat, and Rs 80,000 has been debited. Transaction alert is showing international purchase.",
                language: "English",
                category: "Cyber Fraud",
                urgency_score: 7,
                sentiment: "Negative",
                district: "Agra",
                assigned_station_id: 9, // Hariparwat
                station_name: "Hariparwat",
                sho_name: "Inspector V.K. Singh",
                station_phone: "+91 9454404102",
                status: "Resolved",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 86400000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 70000000)), message: "[Inspector V.K. Singh] Raised dispute with merchant gateway. Card blocked." },
                    { time: formatTime(new Date(now.getTime() - 50000000)), message: "[Inspector V.K. Singh] Cyber cell traced the gateway, money refunded to victim account. Case closed." }
                ],
                created_at: formatTime(new Date(now.getTime() - 86400000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 86340000))
            },
            {
                ticket_id: "TKT-20260701-0009",
                text: "पिछले 1 हफ्ते से व्हाट्सएप पर अंजान नंबर से अश्लील तस्वीरें और धमकी भरे मैसेज आ रहे हैं। शिकायतकर्ता लंका वाराणसी क्षेत्र की निवासी है।",
                language: "Hindi",
                category: "Women Safety",
                urgency_score: 9,
                sentiment: "Negative",
                district: "Varanasi",
                assigned_station_id: 7, // Lanka
                station_name: "Lanka",
                sho_name: "Inspector Ashutosh Tiwari",
                station_phone: "+91 9454404002",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 900000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 900000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 840000))
            },
            {
                ticket_id: "TKT-20260701-0010",
                text: "Hazratganj market me shopping ke dauran mera brown leather wallet chori ho gaya. Aadhaar card and Rs 4000 cash details contained.",
                language: "Hinglish",
                category: "Theft/Robbery",
                urgency_score: 5,
                sentiment: "Negative",
                district: "Lucknow",
                assigned_station_id: 1, // Hazratganj
                station_name: "Hazratganj",
                sho_name: "Inspector Akhilesh Singh",
                station_phone: "+91 9454403801",
                status: "Resolved",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 21600000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 18000000)), message: "[Inspector Akhilesh Singh] Traced suspect using market CCTV footage." },
                    { time: formatTime(new Date(now.getTime() - 10000000)), message: "[Inspector Akhilesh Singh] Suspect apprehended, wallet recovered with documents. Wallet handed back to owner." }
                ],
                created_at: formatTime(new Date(now.getTime() - 21600000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 21540000))
            },
            {
                ticket_id: "TKT-20260701-0011",
                text: "Gomti Nagar Patrakar Puram chauraha ke paas kuch ladke shaam ko bullet se stunting karte hain aur wahan khadi ladkiyon par comments pass karte hain. Please patrolling badhayein.",
                language: "Hinglish",
                category: "Women Safety",
                urgency_score: 8,
                sentiment: "Negative",
                district: "Lucknow",
                assigned_station_id: 3, // Gomti Nagar
                station_name: "Gomti Nagar",
                sho_name: "Inspector Pramod Mishra",
                station_phone: "+91 9454403803",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 900000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 900000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 840000))
            },
            {
                ticket_id: "TKT-20260701-0012",
                text: "My uncle got a call from an unknown number claiming to be from Bank of Baroda. They asked for card details for KYC verification, and immediately 35,000 INR was debited from his account. Please register a complaint.",
                language: "English",
                category: "Cyber Fraud",
                urgency_score: 7,
                sentiment: "Negative",
                district: "Varanasi",
                assigned_station_id: 7, // Lanka
                station_name: "Lanka",
                sho_name: "Inspector Ashutosh Tiwari",
                station_phone: "+91 9454404002",
                status: "Under Investigation",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 10800000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 9000000)), message: "[Inspector Ashutosh Tiwari] Registered Case under Cyber Act. Sent details to Cyber Cell." }
                ],
                created_at: formatTime(new Date(now.getTime() - 10800000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 10740000))
            },
            {
                ticket_id: "TKT-20260701-0013",
                text: "हरीपर्वत थाना क्षेत्र के अंतर्गत संजय पैलेस में हमारी पैतृक दुकान की पिछली दीवार को पड़ोसी दुकानदार रात के समय जबरन तोड़कर अपना रास्ता निकालने की कोशिश कर रहा है। रोकने पर हाथापाई करता है।",
                language: "Hindi",
                category: "Land Dispute",
                urgency_score: 6,
                sentiment: "Negative",
                district: "Agra",
                assigned_station_id: 9, // Hariparwat
                station_name: "Hariparwat",
                sho_name: "Inspector V.K. Singh",
                station_phone: "+91 9454404102",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 2700000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 2700000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 2640000))
            },
            {
                ticket_id: "TKT-20260701-0014",
                text: "Kakadeo Coaching area se kal dopahar me mera mobile (Redmi Note 12) kisi ne pocket se nikal liya jab main bus me chadha tha. Location Kakadeo bypass ke paas ki hai.",
                language: "Hinglish",
                category: "Theft/Robbery",
                urgency_score: 5,
                sentiment: "Negative",
                district: "Kanpur",
                assigned_station_id: 5, // Kakadeo
                station_name: "Kakadeo",
                sho_name: "Inspector Sanjay Yadav",
                station_phone: "+91 9454403902",
                status: "Resolved",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 86400000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 64800000)), message: "[Inspector Sanjay Yadav] Police tracked the IMEI location. Device found with local dealer." },
                    { time: formatTime(new Date(now.getTime() - 43200000)), message: "[Inspector Sanjay Yadav] Mobile recovered and handed back to the complainant. Case closed." }
                ],
                created_at: formatTime(new Date(now.getTime() - 86400000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 86340000))
            },
            {
                ticket_id: "TKT-20260701-0015",
                text: "हजरतगंज चौराहे के पास स्थित एक रेस्टोरेंट में कल रात कुछ नशेड़ी युवकों ने बिल मांगने पर वेटर के साथ गंभीर मारपीट की और काउंटर पर तोड़फोड़ की। सीसीटीवी फुटेज उपलब्ध है।",
                language: "Hindi",
                category: "Assault/Violence",
                urgency_score: 9,
                sentiment: "Negative",
                district: "Lucknow",
                assigned_station_id: 1, // Hazratganj
                station_name: "Hazratganj",
                sho_name: "Inspector Akhilesh Singh",
                station_phone: "+91 9454403801",
                status: "Under Investigation",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 36000000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 32400000)), message: "[Inspector Akhilesh Singh] Dispatched team. Took restaurant CCTV footage into custody." },
                    { time: formatTime(new Date(now.getTime() - 28800000)), message: "[Inspector Akhilesh Singh] Two suspects identified. Police raids are underway." }
                ],
                created_at: formatTime(new Date(now.getTime() - 36000000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 35940000))
            },
            {
                ticket_id: "TKT-20260701-0016",
                text: "सिगरा क्षेत्र में नए किराएदारों के पुलिस वेरिफिकेशन के लिए कौन-कौन से दस्तावेजों की आवश्यकता होती है और इसका ऑनलाइन आवेदन कैसे किया जाता है?",
                language: "Hindi",
                category: "General Inquiry",
                urgency_score: 3,
                sentiment: "Neutral",
                district: "Varanasi",
                assigned_station_id: 6, // Sigra
                station_name: "Sigra",
                sho_name: "Inspector Vinay Verma",
                station_phone: "+91 9454404001",
                status: "Resolved",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 50400000)), message: "Grievance registered. Routed automatically by UP Police AI." },
                    { time: formatTime(new Date(now.getTime() - 43200000)), message: "[Inspector Vinay Verma] Provided step-by-step instructions for UP Cop App tenant verification." }
                ],
                created_at: formatTime(new Date(now.getTime() - 50400000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 50340000))
            },
            {
                ticket_id: "TKT-20260701-0017",
                text: "Yesterday evening, while visiting the Taj Mahal east gate, a pickpocket stole my handbag containing my passport, wallet with 500 USD, and keys. Tajganj area.",
                language: "English",
                category: "Theft/Robbery",
                urgency_score: 7,
                sentiment: "Negative",
                district: "Agra",
                assigned_station_id: 8, // Tajganj
                station_name: "Tajganj",
                sho_name: "Inspector Shailendra Giri",
                station_phone: "+91 9454404101",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 300000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 300000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 240000))
            },
            {
                ticket_id: "TKT-20260701-0018",
                text: "Aliganj resident. Maine ek OLX pe second hand laptop ka advertisement dekha tha. Seller ne advance delivery charges ke naam par 12,000 transfer karwa liye aur ab uska phone switched off aa raha hai.",
                language: "Hinglish",
                category: "Cyber Fraud",
                urgency_score: 7,
                sentiment: "Negative",
                district: "Lucknow",
                assigned_station_id: 2, // Aliganj
                station_name: "Aliganj",
                sho_name: "Inspector Rajesh Kumar",
                station_phone: "+91 9454403802",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 1800000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 1800000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 1740000))
            },
            {
                ticket_id: "TKT-20260701-0019",
                text: "कल्याणपुर में यूनिवर्सिटी रोड पर रात 8 बजे के बाद स्ट्रीट लाइट्स न जलने के कारण अंधेरा रहता है, जिससे coaching से लौटने वाली छात्राओं को असुरक्षित महसूस होता है। असामाजिक तत्व वहां जमा रहते हैं।",
                language: "Hindi",
                category: "Women Safety",
                urgency_score: 8,
                sentiment: "Negative",
                district: "Kanpur",
                assigned_station_id: 4, // Kalyanpur
                station_name: "Kalyanpur",
                sho_name: "Inspector Devendra Singh",
                station_phone: "+91 9454403901",
                status: "Pending",
                is_spam: false,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 3000000)), message: "Grievance registered. Routed automatically by UP Police AI." }
                ],
                created_at: formatTime(new Date(now.getTime() - 3000000)),
                escalated: true,
                escalation_time: formatTime(new Date(now.getTime() - 2940000))
            },
            {
                ticket_id: "TKT-20260701-0020",
                text: "CONGRATULATIONS! You have been selected for a free $1000 Amazon gift card. Click this link immediately to claim: www.freegiftcard-scam.com",
                language: "English",
                category: "General Inquiry",
                urgency_score: 1,
                sentiment: "Neutral",
                district: "Kanpur",
                assigned_station_id: 4, // Kalyanpur
                station_name: "Kalyanpur",
                sho_name: "Inspector Devendra Singh",
                station_phone: "+91 9454403901",
                status: "Pending",
                is_spam: true,
                action_diary: [
                    { time: formatTime(new Date(now.getTime() - 79200000)), message: "Grievance registered. AI filtered as SPAM due to lottery scam patterns." }
                ],
                created_at: formatTime(new Date(now.getTime() - 79200000)),
                escalated: false,
                escalation_time: formatTime(new Date(now.getTime() - 79140000))
            }
        ];
        
        localStorage.setItem("up_police_grievances", JSON.stringify(initialGrievances));
    }
}

// Tab Switching
function switchTab(tabName) {
    activeTab = tabName;
    
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });
    document.getElementById(`tab-${tabName}`).classList.add("active");
    
    document.querySelectorAll(".content-section").forEach(sec => {
        sec.classList.remove("active");
    });
    document.getElementById(`view-${tabName}`).classList.add("active");
    
    if (tabName === "sho") {
        loadSHOGrievances();
    } else if (tabName === "sp") {
        loadSPDashboard();
    }
}

// Toggle manual accordion
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const arrow = document.getElementById("accordion-arrow");
    if (content.style.display === "block") {
        content.style.display = "none";
        arrow.textContent = "▼";
    } else {
        content.style.display = "block";
        arrow.textContent = "▲";
    }
}

// Load stations dropdowns
async function loadAllStations() {
    let stations = [];
    if (isOfflineMode) {
        stations = MOCK_STATIONS;
    } else {
        try {
            const res = await fetch(`${API_BASE}/stations`);
            if (res.ok) stations = await res.json();
            else stations = MOCK_STATIONS;
        } catch (e) {
            stations = MOCK_STATIONS;
        }
    }
    
    // Populate SHO Workspace Select Options
    const shoSelect = document.getElementById("sho-station-select");
    if (shoSelect) {
        shoSelect.innerHTML = "";
        stations.forEach(st => {
            const opt = document.createElement("option");
            opt.value = st.id;
            opt.textContent = `${st.name} Thana (${st.district})`;
            shoSelect.appendChild(opt);
        });
    }
    
    loadCitizenStations(stations);
}

// Filter citizen manual overrides based on district selection
async function loadCitizenStations(preloadedStations = null) {
    const distSelect = document.getElementById("citizen-district");
    const stSelect = document.getElementById("citizen-station");
    if (!stSelect) return;
    
    const selectedDist = distSelect.value;
    stSelect.innerHTML = '<option value="">AI automatic detection</option>';
    
    if (!selectedDist) return;
    
    let stations = [];
    if (preloadedStations) {
        stations = preloadedStations.filter(s => s.district === selectedDist);
    } else if (isOfflineMode) {
        stations = MOCK_STATIONS.filter(s => s.district === selectedDist);
    } else {
        try {
            const res = await fetch(`${API_BASE}/stations?district=${selectedDist}`);
            if (res.ok) stations = await res.json();
        } catch (e) {
            stations = MOCK_STATIONS.filter(s => s.district === selectedDist);
        }
    }
    
    stations.forEach(st => {
        const opt = document.createElement("option");
        opt.value = st.name;
        opt.textContent = st.name;
        stSelect.appendChild(opt);
    });
}

// -------------------------------------------------------------
// IN-BROWSER MOCK NLP ENGINE FOR OFFLINE DEMO MODE
// -------------------------------------------------------------

function runMockNLPAnalysis(text) {
    const textLower = text.toLowerCase();
    
    // 1. Language Detection
    let language = "English";
    if (/[\u0900-\u097F]/.test(text)) {
        language = "Hindi";
    } else {
        const hinglishKeywords = ["mera", "meri", "ho gaya", "paas", "hai", "pe", "chori", "maar", "peet", "ladai", "khet", "jameen", "kabza", "paisa", "kat", "gaya", "chhedkhani", "ladka", "karwao"];
        const matches = textLower.split(/\s+/).filter(word => hinglishKeywords.includes(word)).length;
        if (matches >= 1) language = "Hinglish";
    }
    
    // 2. Spam Check
    let isSpam = false;
    const spamPatterns = [
        /(win|cash|prize|money|lottery|free|iphone|gold|gift)/i,
        /(click here|visit website|link below|viagra|invest now|earn daily)/i,
        /(ads|casino|betting|lotto|subscribe|crypto)/i
    ];
    let spamHits = 0;
    spamPatterns.forEach(pat => {
        if (pat.test(textLower)) spamHits++;
    });
    const words = textLower.split(/\s+/);
    if (words.length > 10) {
        const uniqueWords = new Set(words);
        if (uniqueWords.size / words.length < 0.35) isSpam = true;
    }
    if (spamHits >= 2) isSpam = true;
    
    // 3. Category Classification
    let category = "General Inquiry";
    const categories = {
        "Women Safety": ["chhedkhani", "harassment", "abuse", "ladki", "mahila", "suraksha", "stalking", "peechha", " छेड़खानी", "उत्पीड़न", "महिला", "बदतमीजी", "छेड़छाड़", "rape", "girl", "woman"],
        "Cyber Fraud": ["otp", "link click", "bank account", "card blocked", "fraud", "upi", "paise", "debit", "credit", "hack", "ओटीपी", "खाता", "धोखाधड़ी", "साइबर", "पैसे कट"],
        "Land Dispute": ["jameen", "land", "kabza", "khet", "boundary", "registry", "vivad", "plot", "कब्जा", "जमीन", "भूमि विवाद", "खेत", "रजिस्ट्री"],
        "Theft/Robbery": ["chori", "loot", "stolen", "robbery", "theft", "missing", "ghayab", "purse", "mobile", "bike", "चोरी", "लूट", "डकैती", "गायब"],
        "Assault/Violence": ["maar peet", "lathi", "chaku", "goli", "ladai", "jhagda", "violence", "beat", "fight", "kill", "threat", "मारपीट", "लाठी", "चाकू", "गोली", "लड़ाई", "झगड़ा", "धमकी"]
    };
    
    let maxWeight = 0;
    Object.entries(categories).forEach(([cat, keywords]) => {
        let weight = 0;
        keywords.forEach(keyword => {
            if (textLower.includes(keyword)) weight += 2;
        });
        if (weight > maxWeight) {
            maxWeight = weight;
            category = cat;
        }
    });
    
    // 4. District and Station NER extraction
    const districtMappings = {
        "Lucknow": ["lucknow", "लखनऊ", "lko"],
        "Kanpur": ["kanpur", "कानपुर", "knp"],
        "Varanasi": ["varanasi", "वाराणसी", "banaras", "काशी"],
        "Agra": ["agra", "आगरा"]
    };
    
    let district = "Lucknow";
    Object.entries(districtMappings).forEach(([dist, aliases]) => {
        aliases.forEach(alias => {
            if (textLower.includes(alias)) district = dist;
        });
    });
    
    const stationMappings = {
        "Hazratganj": ["hazratganj", "हजरतगंज"],
        "Aliganj": ["aliganj", "अलीगंज"],
        "Gomti Nagar": ["gomti nagar", "गोमती नगर", "gomtinagar"],
        "Kalyanpur": ["kalyanpur", "कल्याणपुर"],
        "Kakadeo": ["kakadeo", "काकादेव"],
        "Sigra": ["sigra", "सिगरा"],
        "Lanka": ["lanka", "लंका"],
        "Tajganj": ["tajganj", "ताजगंज"],
        "Hariparwat": ["hariparwat", "हरीपर्वत"]
    };
    
    let station = null;
    Object.entries(stationMappings).forEach(([st, aliases]) => {
        aliases.forEach(alias => {
            if (textLower.includes(alias)) station = st;
        });
    });
    
    if (!station) {
        if (district === "Lucknow") station = "Hazratganj";
        else if (district === "Kanpur") station = "Kalyanpur";
        else if (district === "Varanasi") station = "Sigra";
        else if (district === "Agra") station = "Tajganj";
    }
    
    // 5. Urgency scoring
    const baseUrgency = { "Women Safety": 8, "Cyber Fraud": 7, "Land Dispute": 5, "Theft/Robbery": 5, "Assault/Violence": 8, "General Inquiry": 3 };
    let urgency = baseUrgency[category] || 4;
    const severityBoosters = ["weapon", "chaku", "goli", "gun", "knife", "pistol", "attack", "murder", "kidnap", "rape", "blood", "जान से मारने"];
    severityBoosters.forEach(booster => {
        if (textLower.includes(booster)) urgency += 2;
    });
    urgency = Math.min(Math.max(urgency, 1), 10);
    
    // 6. Sentiment
    let sentiment = "Negative";
    if (["thank you", "dhanyawad", "good", "धन्यवाद"].some(ind => textLower.includes(ind))) sentiment = "Positive";
    else if (["inquiry", "status", "पूछताछ"].some(ind => textLower.includes(ind))) sentiment = "Neutral";
    
    return {
        language,
        category: isSpam ? "General Inquiry" : category,
        district,
        assigned_station: station,
        urgency_score: isSpam ? 1 : urgency,
        sentiment: isSpam ? "Neutral" : sentiment,
        is_spam: isSpam
    };
}

// -------------------------------------------------------------
// CITIZEN ACTIONS
// -------------------------------------------------------------

async function handleGrievanceSubmit(e) {
    e.preventDefault();
    
    const text = document.getElementById("complaint-text").value;
    const spOffice = document.getElementById("citizen-sp-office").value;
    const circleOffice = document.getElementById("citizen-circle-office").value;
    const policeStation = document.getElementById("citizen-police-station").value;
    const publicImage = currentPublicImageBase64;
    
    const district = spOffice.split(" ")[0]; // "Lucknow SP Office" -> "Lucknow"
    
    const btn = document.getElementById("btn-submit-grievance");
    const spinner = document.getElementById("submit-spinner");
    const loader = document.getElementById("ai-processing-loader");
    const resultCard = document.getElementById("submission-result-card");
    
    btn.disabled = true;
    spinner.style.display = "inline-block";
    resultCard.style.display = "none";
    loader.style.display = "block";
    
    const stepLang = document.getElementById("step-lang");
    const stepCat = document.getElementById("step-cat");
    const stepLoc = document.getElementById("step-loc");
    const stepUrgency = document.getElementById("step-urgency");
    
    [stepLang, stepCat, stepLoc, stepUrgency].forEach(step => {
        step.className = "step";
    });
    
    try {
        // AI animation steps
        await sleep(650);
        stepLang.className = "step active";
        await sleep(550);
        stepLang.className = "step completed";
        stepCat.className = "step active";
        await sleep(550);
        stepCat.className = "step completed";
        stepLoc.className = "step active";
        await sleep(550);
        stepLoc.className = "step completed";
        stepUrgency.className = "step active";
        await sleep(450);
        stepUrgency.className = "step completed";
        
        let outputData;
        
        if (isOfflineMode) {
            // Process NLP in JS
            const analysis = runMockNLPAnalysis(text);
            const stationObj = MOCK_STATIONS.find(s => s.name === policeStation && s.district === district) || MOCK_STATIONS[0];
            
            const now = new Date();
            const ticketId = `TKT-${now.toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(1000 + Math.random() * 9000)}`;
            const escTime = new Date(now.getTime() + 60000); // 1 minute SLA
            
            const createdStr = now.toISOString().replace('T', ' ').substring(0, 19);
            const escStr = escTime.toISOString().replace('T', ' ').substring(0, 19);
            
            const mockDiary = [{
                time: createdStr,
                message: `Grievance filed. Language detected: ${analysis.language}. Routed to station: ${stationObj.name} under category '${analysis.category}'.`
            }];
            
            if (analysis.is_spam) {
                mockDiary.push({
                    time: createdStr,
                    message: "System alert: Flagged as potential Spam/Fake. Routed to spam queue."
                });
            }
            
            outputData = {
                ticket_id: ticketId,
                category: analysis.category,
                assigned_station: stationObj.name,
                urgency_score: analysis.urgency_score,
                sentiment: analysis.sentiment,
                language: analysis.language,
                status: "Pending",
                is_spam: analysis.is_spam,
                created_at: createdStr,
                sp_office: spOffice,
                circle_office: circleOffice,
                public_image: publicImage,
                allotted_io: null,
                investigation_report: null,
                investigation_image: null
            };
            
            // Save to localStorage
            const localGrievances = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            localGrievances.unshift({
                ...outputData,
                assigned_station_id: stationObj.id,
                station_name: stationObj.name,
                sho_name: stationObj.sho_name,
                station_phone: stationObj.phone,
                district: district,
                action_diary: mockDiary,
                escalated: false,
                escalation_time: escStr
            });
            localStorage.setItem("up_police_grievances", JSON.stringify(localGrievances));
            
        } else {
            // Live Server submit
            const response = await fetch(`${API_BASE}/grievance/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text,
                    custom_district: district,
                    custom_station: policeStation,
                    sp_office: spOffice,
                    circle_office: circleOffice,
                    public_image: publicImage
                })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Error connecting to CCTNS database");
            }
            outputData = await response.json();
        }
        
        // Show result output
        document.getElementById("res-ticket-id").textContent = outputData.ticket_id;
        document.getElementById("res-lang").textContent = outputData.language;
        
        const catBadge = document.getElementById("res-category");
        catBadge.textContent = outputData.category;
        catBadge.className = "value badge " + getCategoryBadgeClass(outputData.category);
        
        document.getElementById("res-station").textContent = `${outputData.assigned_station} Thana`;
        document.getElementById("res-urgency").innerHTML = `<strong style="color: ${getUrgencyColor(outputData.urgency_score)}">${outputData.urgency_score}/10</strong>`;
        document.getElementById("res-sentiment").textContent = outputData.sentiment;
        
        const statusVal = document.getElementById("res-status");
        statusVal.textContent = outputData.status;
        statusVal.className = "value " + getStatusColorClass(outputData.status);
        
        loader.style.display = "none";
        resultCard.style.display = "block";
        
        // Set tracking ID
        document.getElementById("track-ticket-id").value = outputData.ticket_id;
        trackGrievance(outputData.ticket_id);
        
        document.getElementById("complaint-text").value = "";
        document.getElementById("citizen-sp-office").value = "";
        document.getElementById("citizen-circle-office").innerHTML = '<option value="">Select Circle Office</option>';
        document.getElementById("citizen-circle-office").disabled = true;
        document.getElementById("citizen-police-station").innerHTML = '<option value="">Select Police Station</option>';
        document.getElementById("citizen-police-station").disabled = true;
        clearComplaintImage();
        
    } catch (err) {
        alert("Submission Failed: " + err.message);
        loader.style.display = "none";
    } finally {
        btn.disabled = false;
        spinner.style.display = "none";
    }
}

// Track Status Timeline Search
async function trackGrievance(ticketId = null) {
    const tktInput = document.getElementById("track-ticket-id");
    const id = ticketId || tktInput.value.trim();
    
    if (!id) {
        alert("Please enter a Ticket ID");
        return;
    }
    
    const container = document.getElementById("track-timeline-container");
    container.innerHTML = "<p>Searching CCTNS database index...</p>";
    
    try {
        let ticket = null;
        
        if (isOfflineMode) {
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            ticket = list.find(g => g.ticket_id === id);
            if (!ticket) throw new Error("Ticket not found in local index");
        } else {
            const res = await fetch(`${API_BASE}/grievance/${id}`);
            if (!res.ok) throw new Error("Ticket not found in central SQL index");
            ticket = await res.json();
        }
        
        container.innerHTML = "";
        
        const metaDiv = document.createElement("div");
        metaDiv.className = "timeline-meta";
        
        let metaHtml = `
            <div style="margin-bottom: 0.5rem;"><strong>Category:</strong> ${ticket.category} | <strong>Assigned Thana:</strong> ${ticket.station_name}</div>
            <div style="margin-bottom: 0.5rem;"><strong>SP Office:</strong> ${ticket.sp_office || '-'} | <strong>Circle Office:</strong> ${ticket.circle_office || '-'}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Assigned Officer (SHO):</strong> ${ticket.sho_name} (${ticket.station_phone})</div>
        `;
        
        if (ticket.allotted_io) {
            metaHtml += `<div style="margin-bottom: 0.5rem; color: var(--accent-blue);"><strong>Allotted IO Officer:</strong> ${ticket.allotted_io}</div>`;
        }
        
        if (ticket.public_image) {
            metaHtml += `
                <div style="margin-bottom: 0.5rem;">
                    <strong>Complainant Attachment:</strong><br>
                    <img src="${ticket.public_image}" alt="Attachment" style="max-height: 100px; border-radius: 6px; border: 1px solid var(--gold); margin-top: 0.3rem; cursor: pointer; display: block;" onclick="window.open(this.src)">
                </div>
            `;
        }
        
        if (ticket.investigation_report) {
            metaHtml += `
                <div style="margin-top: 0.8rem; padding: 0.8rem; background: rgba(0, 230, 118, 0.05); border: 1px solid var(--accent-green); border-radius: 8px;">
                    <strong style="color: var(--accent-green); font-size: 0.85rem;">🔍 Investigation Report Filed:</strong>
                    <p style="font-size: 0.85rem; margin-top: 0.3rem; white-space: pre-wrap; color: var(--text-main);">${ticket.investigation_report}</p>
            `;
            if (ticket.investigation_image) {
                metaHtml += `
                    <img src="${ticket.investigation_image}" alt="Evidence Photo" style="max-height: 80px; border-radius: 4px; border: 1px solid var(--accent-blue); margin-top: 0.5rem; cursor: pointer; display: block;" onclick="window.open(this.src)">
                `;
            }
            metaHtml += `</div>`;
        }
        
        metaDiv.innerHTML = metaHtml;
        container.appendChild(metaDiv);
        
        ticket.action_diary.forEach(event => {
            const evDiv = document.createElement("div");
            evDiv.className = "timeline-event";
            if (event.message.includes("SLA BREACH")) {
                evDiv.classList.add("urgent");
            }
            evDiv.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-time">${event.time}</div>
                <div class="timeline-desc">${event.message}</div>
            `;
            container.appendChild(evDiv);
        });
        
    } catch (e) {
        container.innerHTML = `<p style="color: var(--accent-red)">⚠️ Error: ${e.message}</p>`;
    }
}

// -------------------------------------------------------------
// SHO ACTIONS
// -------------------------------------------------------------

async function loadSHOGrievances() {
    const stationSelect = document.getElementById("sho-station-select");
    if (!stationSelect || !stationSelect.value) return;
    
    const stationId = parseInt(stationSelect.value);
    const tbody = document.getElementById("sho-table-body");
    tbody.innerHTML = '<tr><td colspan="7">Loading assigned cases...</td></tr>';
    
    Object.keys(countdownIntervals).forEach(k => {
        clearInterval(countdownIntervals[k]);
    });
    countdownIntervals = {};
    
    try {
        let cases = [];
        
        if (isOfflineMode) {
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            cases = list.filter(g => g.assigned_station_id === stationId && !g.is_spam);
        } else {
            const res = await fetch(`${API_BASE}/grievances?station_id=${stationId}`);
            if (res.ok) cases = await res.json();
        }
        
        document.getElementById("sho-cases-count").textContent = `${cases.length} Case(s) Active`;
        tbody.innerHTML = "";
        
        if (cases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No grievances currently assigned to this police station.</td></tr>';
            return;
        }
        
        cases.forEach(g => {
            const tr = document.createElement("tr");
            tr.id = `sho-row-${g.ticket_id}`;
            const textPreview = g.text.length > 80 ? g.text.substring(0, 80) + "..." : g.text;
            const timerId = `timer-${g.ticket_id}`;
            
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--gold);">${g.ticket_id}</td>
                <td title="${g.text}">${textPreview}</td>
                <td><span class="badge ${getCategoryBadgeClass(g.category)}">${g.category}</span></td>
                <td><span style="color: ${getUrgencyColor(g.urgency_score)}; font-weight:700;">${g.urgency_score}/10</span></td>
                <td id="${timerId}">Checking SLA...</td>
                <td><span class="badge ${g.status === 'Resolved' ? 'badge-success' : (g.status === 'Under Investigation' ? 'badge-info' : 'badge-gold')}">${g.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openSHODrawer('${g.ticket_id}', '${g.status}')">Action</button>
                </td>
            `;
            tbody.appendChild(tr);
            
            if (g.status === "Pending") {
                startSLACountdown(g.ticket_id, g.escalation_time, timerId, g.escalated);
            } else {
                document.getElementById(timerId).innerHTML = `<span style="color: var(--text-muted)">N/A (Investigation Started)</span>`;
            }
        });
        
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color: var(--accent-red)">Error: ${e.message}</td></tr>`;
    }
}

function startSLACountdown(ticketId, escalationTimeStr, cellId, alreadyEscalated) {
    // Standardize sqlite date string spaces for Safari compatibility
    const escTime = new Date(escalationTimeStr.replace(' ', 'T')).getTime();
    const cell = document.getElementById(cellId);
    
    function tick() {
        const now = new Date().getTime();
        const diff = escTime - now;
        
        if (diff <= 0 || alreadyEscalated) {
            if (cell) cell.innerHTML = `<span class="badge badge-danger" style="animation: pulse-red 1.5s infinite">🚨 Escalated to SP</span>`;
            clearInterval(countdownIntervals[ticketId]);
        } else {
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            if (cell) cell.innerHTML = `⏳ SLA Escalates in <strong>${seconds}s</strong>`;
        }
    }
    
    tick();
    countdownIntervals[ticketId] = setInterval(tick, 1000);
}

function openSHODrawer(ticketId, currentStatus) {
    selectedGrievanceId = ticketId;
    document.getElementById("action-tkt-display").textContent = ticketId;
    document.getElementById("action-status-select").value = currentStatus;
    document.getElementById("action-allot-io").value = "";
    
    const select = document.getElementById("sho-station-select");
    const stText = select.options[select.selectedIndex].text;
    
    // Find name of SHO
    const matchedStation = MOCK_STATIONS.find(s => stText.includes(s.name));
    document.getElementById("action-sho-name").value = matchedStation ? matchedStation.sho_name : "Officer in Charge";
    document.getElementById("action-message").value = "";
    
    const drawer = document.getElementById("sho-action-drawer");
    drawer.classList.remove("hidden");
    drawer.scrollIntoView({ behavior: 'smooth' });
}

function closeSHODrawer() {
    document.getElementById("sho-action-drawer").classList.add("hidden");
    selectedGrievanceId = null;
}

async function submitSHOAction(e) {
    e.preventDefault();
    if (!selectedGrievanceId) return;
    
    const shoName = document.getElementById("action-sho-name").value.trim();
    const allottedIo = document.getElementById("action-allot-io").value;
    let status = document.getElementById("action-status-select").value;
    const message = document.getElementById("action-message").value.trim();
    
    if (allottedIo && status === "Pending") {
        status = "Under Investigation";
    }
    
    try {
        if (isOfflineMode) {
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            const idx = list.findIndex(g => g.ticket_id === selectedGrievanceId);
            
            if (idx !== -1) {
                const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
                list[idx].status = status;
                
                if (allottedIo) {
                    list[idx].allotted_io = allottedIo;
                    list[idx].action_diary.push({
                        time: nowStr,
                        message: `[SHO ${shoName}] Allotted to IO ${allottedIo} for investigation.`
                    });
                }
                
                list[idx].action_diary.push({
                    time: nowStr,
                    message: `[${shoName}] ${message}`
                });
                
                localStorage.setItem("up_police_grievances", JSON.stringify(list));
            }
        } else {
            // Live Server submit
            if (allottedIo) {
                const allotRes = await fetch(`${API_BASE}/grievance/${selectedGrievanceId}/allot`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        allotted_io: allottedIo,
                        sho_name: shoName
                    })
                });
                if (!allotRes.ok) throw new Error("Failed to allot IO on central CCTNS");
            }
            
            const res = await fetch(`${API_BASE}/grievance/${selectedGrievanceId}/action`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sho_name: shoName,
                    message: message,
                    status: status
                })
            });
            if (!res.ok) throw new Error("Failed to update status on server CCTNS");
        }
        
        loadSHOGrievances();
        closeSHODrawer();
        
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// -------------------------------------------------------------
// SP DASHBOARD ACTIONS
// -------------------------------------------------------------

async function loadSPDashboard() {
    const distSelect = document.getElementById("sp-district-select");
    const spamToggle = document.getElementById("sp-spam-toggle");
    if (!distSelect) return;
    
    const district = distSelect.value;
    const isSpamOnly = spamToggle.checked ? 1 : 0;
    
    try {
        let kpis, categories, escalatedFeed, stationsData, spamFeed = [];
        
        if (isOfflineMode) {
            // Compute aggregates locally from localStorage grievances
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            const dList = list.filter(g => g.district === district);
            
            const total = dList.length;
            const pending = dList.filter(g => g.status === 'Pending' && !g.is_spam).length;
            const active = dList.filter(g => g.status === 'Under Investigation' && !g.is_spam).length;
            const resolved = dList.filter(g => g.status === 'Resolved' && !g.is_spam).length;
            const spam = dList.filter(g => g.is_spam).length;
            const escalated = dList.filter(g => g.escalated && g.status === 'Pending' && !g.is_spam).length;
            
            kpis = { total, pending, active, resolved, spam, escalated };
            
            // Category count
            categories = {};
            dList.filter(g => !g.is_spam).forEach(g => {
                categories[g.category] = (categories[g.category] || 0) + 1;
            });
            
            // Escalation alerts feed
            escalatedFeed = dList
                .filter(g => g.escalated && g.status === 'Pending' && !g.is_spam)
                .sort((a,b) => b.urgency_score - a.urgency_score)
                .slice(0, 10);
                
            spamFeed = dList.filter(g => g.is_spam).slice(0, 10);
            
            // Station map nodes mapping
            const dStations = MOCK_STATIONS.filter(s => s.district === district);
            stationsData = dStations.map(st => {
                const stG = dList.filter(g => g.assigned_station_id === st.id);
                return {
                    id: st.id,
                    name: st.name,
                    latitude: st.latitude,
                    longitude: st.longitude,
                    sho_name: st.sho_name,
                    phone: st.phone,
                    total_cases: stG.length,
                    pending_cases: stG.filter(g => g.status === 'Pending' && !g.is_spam).length,
                    active_cases: stG.filter(g => g.status === 'Under Investigation' && !g.is_spam).length,
                    resolved_cases: stG.filter(g => g.status === 'Resolved' && !g.is_spam).length,
                    escalated_cases: stG.filter(g => g.escalated && g.status === 'Pending' && !g.is_spam).length
                };
            });
            
        } else {
            // Load live SQL aggregates from server
            const res = await fetch(`${API_BASE}/analytics?district=${district}`);
            if (!res.ok) throw new Error("Failed to load server analytics");
            const data = await res.json();
            
            kpis = data.kpis;
            categories = data.categories;
            escalatedFeed = data.escalated_feed;
            stationsData = data.stations;
            
            if (isSpamOnly) {
                const gRes = await fetch(`${API_BASE}/grievances?district=${district}&is_spam=1`);
                if (gRes.ok) spamFeed = await gRes.json();
            }
        }
        
        // Update KPI Counters
        document.getElementById("kpi-total").textContent = isSpamOnly ? spamFeed.length : kpis.total;
        document.getElementById("kpi-pending").textContent = isSpamOnly ? spamFeed.filter(g => g.status === 'Pending').length : kpis.pending;
        document.getElementById("kpi-active").textContent = isSpamOnly ? 0 : kpis.active;
        document.getElementById("kpi-resolved").textContent = isSpamOnly ? 0 : kpis.resolved;
        
        const escKpi = document.getElementById("kpi-escalated");
        escKpi.textContent = isSpamOnly ? 0 : kpis.escalated;
        
        const escCard = escKpi.parentElement;
        if (kpis.escalated > 0 && !isSpamOnly) {
            escCard.classList.add("alert-active");
        } else {
            escCard.classList.remove("alert-active");
        }
        
        // Inject map hotspots
        renderMapHotspots(stationsData, isSpamOnly);
        
        // Inject categories graph
        renderCategoryBreakdown(categories, kpis.total, isSpamOnly);
        
        // Inject notifications feed
        renderSPAlertFeed(escalatedFeed, spamFeed, isSpamOnly);
        
        // Inject Police Station Level Overview table
        renderSPStationTable(stationsData, isSpamOnly);
        
    } catch (e) {
        console.error("SP Dashboard load failed:", e);
    }
}

function renderMapHotspots(stations, isSpamOnly) {
    const group = document.getElementById("map-stations-group");
    if (!group) return;
    group.innerHTML = "";
    
    stations.forEach(st => {
        const casesCount = isSpamOnly ? 0 : st.pending_cases + st.active_cases;
        const radius = 15 + Math.min(casesCount * 8, 40);
        
        let glowColor = "url(#glow-green)";
        let strokeColor = "var(--accent-green)";
        
        if (st.escalated_cases > 0 && !isSpamOnly) {
            glowColor = "url(#glow-red)";
            strokeColor = "var(--accent-red)";
        } else if (casesCount >= 3) {
            glowColor = "url(#glow-orange)";
            strokeColor = "var(--accent-orange)";
        }
        
        const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nodeG.setAttribute("class", "map-node");
        nodeG.setAttribute("transform", `translate(${st.latitude * 15 - 350}, ${st.longitude * 5 - 350})`);
        
        nodeG.innerHTML = `
            <circle cx="0" cy="0" r="${radius}" fill="${glowColor}" class="pulse-ring" />
            <circle cx="0" cy="0" r="8" fill="var(--navy-deep)" stroke="${strokeColor}" stroke-width="2.5" />
            <text x="0" y="24" class="map-node-label">${st.name}</text>
            <title>${st.name} Thana\nPending: ${st.pending_cases}\nActive: ${st.active_cases}\nResolved: ${st.resolved_cases}\nEscalated: ${st.escalated_cases}</title>
        `;
        
        nodeG.addEventListener("click", () => {
            const shoSelect = document.getElementById("sho-station-select");
            if (shoSelect) {
                for (let i = 0; i < shoSelect.options.length; i++) {
                    if (shoSelect.options[i].text.includes(st.name)) {
                        shoSelect.selectedIndex = i;
                        break;
                    }
                }
                switchTab("sho");
            }
        });
        
        group.appendChild(nodeG);
    });
}

function renderCategoryBreakdown(categories, total, isSpamOnly) {
    const container = document.getElementById("category-chart-container");
    if (!container) return;
    container.innerHTML = "";
    
    if (isSpamOnly || total === 0) {
        container.innerHTML = "<p class='card-desc'>Category metrics are only shown for valid police grievances.</p>";
        return;
    }
    
    Object.entries(categories).forEach(([category, count]) => {
        const pct = Math.round((count / total) * 100);
        const row = document.createElement("div");
        row.className = "chart-bar-row";
        row.innerHTML = `
            <div class="chart-bar-info">
                <span>${category}</span>
                <span><strong>${count} Cases</strong> (${pct}%)</span>
            </div>
            <div class="chart-bar-bg">
                <div class="chart-bar-fill" style="width: ${pct}%"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderSPAlertFeed(escalatedFeed, spamFeed, isSpamOnly) {
    const list = document.getElementById("sp-alerts-list");
    if (!list) return;
    list.innerHTML = "";
    
    if (isSpamOnly) {
        if (spamFeed.length === 0) {
            list.innerHTML = "<p class='card-desc'>No spam submissions filtered currently.</p>";
            return;
        }
        
        spamFeed.forEach(g => {
            const item = document.createElement("div");
            item.className = "sp-alert-item";
            item.style.borderColor = "var(--accent-orange)";
            item.style.background = "rgba(255,145,0,0.03)";
            
            item.innerHTML = `
                <div class="alert-header">
                    <span class="alert-tkt" style="color: var(--accent-orange)">${g.ticket_id} (SPAM FLAG)</span>
                    <span class="alert-station">${g.station_name}</span>
                </div>
                <div class="alert-text">${g.text}</div>
                <div class="alert-time">Flagged at: ${g.created_at}</div>
            `;
            list.appendChild(item);
        });
        return;
    }
    
    if (escalatedFeed.length === 0) {
        list.innerHTML = "<p class='card-desc'>✅ All SLAs are compliant. No pending escalations in district.</p>";
        return;
    }
    
    escalatedFeed.forEach(g => {
        const item = document.createElement("div");
        item.className = "sp-alert-item";
        
        item.innerHTML = `
            <div class="alert-header">
                <span class="alert-tkt">🚨 SLA BREACH (${g.urgency_score}/10)</span>
                <span class="alert-station">${g.station_name} Thana</span>
            </div>
            <div class="alert-text">${g.text}</div>
            <div class="alert-time">Submitted: ${g.created_at}</div>
        `;
        list.appendChild(item);
    });
}

// -------------------------------------------------------------
// TIMER HEARTBEATS & SCHEDULERS
// -------------------------------------------------------------

async function systemHeartbeat() {
    try {
        if (isOfflineMode) {
            // Local Mock SLA checker tick
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            const now = new Date();
            let changed = false;
            
            list.forEach((g, idx) => {
                if (g.status === "Pending" && !g.is_spam && !g.escalated) {
                    const escTime = new Date(g.escalation_time.replace(' ', 'T')).getTime();
                    if (now.getTime() >= escTime) {
                        list[idx].escalated = true;
                        list[idx].action_diary.push({
                            time: now.toISOString().replace('T', ' ').substring(0, 19),
                            message: "⚠️ SLA BREACH WARNING: Action not initiated within SLA. Grievance escalated to District SP dashboard."
                        });
                        changed = true;
                    }
                }
            });
            
            if (changed) {
                localStorage.setItem("up_police_grievances", JSON.stringify(list));
            }
            
            // Refresh visible table or charts
            if (activeTab === "sho" && selectedGrievanceId === null) {
                loadSHOGrievances();
            } else if (activeTab === "sp") {
                loadSPDashboard();
            }
        } else {
            // Send tick to Server check
            const tickRes = await fetch(`${API_BASE}/system/tick`, { method: "POST" });
            if (tickRes.ok) {
                if (activeTab === "sho" && selectedGrievanceId === null) {
                    loadSHOGrievances();
                } else if (activeTab === "sp") {
                    loadSPDashboard();
                }
            }
        }
    } catch (e) {
        console.warn("Heartbeat connection check failed.");
    }
}

// Helper badge styles
function getCategoryBadgeClass(cat) {
    switch (cat) {
        case "Women Safety": return "badge-danger";
        case "Cyber Fraud": return "badge-info";
        case "Land Dispute": return "badge-gold";
        case "Theft/Robbery": return "badge-gold";
        case "Assault/Violence": return "badge-danger";
        default: return "badge-info";
    }
}

function getStatusColorClass(status) {
    switch (status) {
        case "Pending": return "text-orange";
        case "Under Investigation": return "text-blue";
        case "Resolved": return "text-green";
        default: return "";
    }
}

function getUrgencyColor(score) {
    if (score >= 8) return "var(--accent-red)";
    if (score >= 5) return "var(--accent-orange)";
    return "var(--accent-green)";
}

// Sleep util
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------------------------------------------------
// SESSION CONTROL & MOCK ROLE SIGN IN
// -------------------------------------------------------------

function initSession() {
    const sessionStr = localStorage.getItem("up_police_session");
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            currentUserRole = session.role;
            currentUserSession = session;
            hideLoginOverlay();
            applyRoleLayout();
            switchTab(currentUserRole);
            return;
        } catch (e) {
            console.error("Session parse failed, clearing.");
            localStorage.removeItem("up_police_session");
        }
    }
    showLoginOverlay();
}

function showLoginOverlay() {
    document.getElementById("login-overlay").style.display = "flex";
    selectLoginRole("citizen");
}

function hideLoginOverlay() {
    document.getElementById("login-overlay").style.display = "none";
}

let selectedLoginRoleVal = "citizen";

function selectLoginRole(role) {
    selectedLoginRoleVal = role;
    
    // Toggle active role button class
    document.querySelectorAll(".role-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    document.getElementById(`role-btn-${role}`).classList.add("active");
    
    const container = document.getElementById("login-fields-container");
    const passInput = document.getElementById("login-password");
    const passStar = document.getElementById("login-pass-req");
    
    container.innerHTML = "";
    
    // Enable password field for all roles
    passInput.disabled = false;
    passInput.required = true;
    passStar.style.display = "inline";
    
    if (role === "citizen") {
        passInput.placeholder = "Enter Password (demo: citizen123)";
        container.innerHTML = `
            <div class="form-group">
                <label for="login-username">यूज़रनेम (Citizen Username) <span class="required">*</span></label>
                <input type="text" id="login-username" placeholder="Enter your registered username" required>
            </div>
        `;
    } else {
        passInput.placeholder = "Enter Password (demo: " + role + "123)";
        
        if (role === "sho") {
            container.innerHTML = `
                <div class="form-group">
                    <label for="login-station">कार्यरत थाना (Select Police Station) <span class="required">*</span></label>
                    <select id="login-station" required>
                        ${MOCK_STATIONS.map(s => `<option value="${s.id}">${s.name} Thana (${s.district})</option>`).join("")}
                    </select>
                </div>
            `;
        } else if (role === "io") {
            container.innerHTML = `
                <div class="form-group">
                    <label for="login-io-name">जांच अधिकारी (Select IO Officer) <span class="required">*</span></label>
                    <select id="login-io-name" required>
                        <option value="SI Ramesh Kumar">SI Ramesh Kumar (Lucknow)</option>
                        <option value="SI Amit Singh">SI Amit Singh (Kanpur)</option>
                        <option value="SI Vineet Yadav">SI Vineet Yadav (Varanasi)</option>
                        <option value="SI Sanjay Yadav">SI Sanjay Yadav (Kanpur)</option>
                        <option value="SI Rajesh Kumar">SI Rajesh Kumar (Lucknow)</option>
                        <option value="SI Vinay Verma">SI Vinay Verma (Varanasi)</option>
                    </select>
                </div>
            `;
        } else if (role === "sp") {
            container.innerHTML = `
                <div class="form-group">
                    <label for="login-sp-district">ज़िला मुख्यालय (Select District) <span class="required">*</span></label>
                    <select id="login-sp-district" required>
                        <option value="Lucknow">Lucknow SP Office</option>
                        <option value="Kanpur">Kanpur SP Office</option>
                        <option value="Varanasi">Varanasi SP Office</option>
                        <option value="Agra">Agra SP Office</option>
                    </select>
                </div>
            `;
        }
    }
}

async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    
    const role = selectedLoginRoleVal;
    const password = document.getElementById("login-password").value.trim();
    
    // Verify password for officials
    if (role !== "citizen") {
        const expectedPass = role + "123";
        if (password !== expectedPass && password !== "admin123") {
            alert(`Incorrect password. For testing, please use password: ${expectedPass}`);
            return;
        }
    }
    
    let username = "";
    let details = {};
    
    if (role === "citizen") {
        const citizenUsername = document.getElementById("login-username").value.trim();
        let authenticatedUser = null;
        
        try {
            if (isOfflineMode) {
                await initializeLocalStorageUsers();
                const users = JSON.parse(localStorage.getItem("up_police_users") || "[]");
                const passwordHash = await sha256(password);
                
                authenticatedUser = users.find(u => u.username === citizenUsername && u.password_hash === passwordHash);
            } else {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: citizenUsername,
                        password: password
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    authenticatedUser = data.user;
                }
            }
        } catch (err) {
            console.error(err);
        }
        
        if (!authenticatedUser) {
            alert("Authentication failed! Invalid username or password.");
            return;
        }
        
        // Link details to logged-in user identity
        username = authenticatedUser.full_name;
        details = { citizenUsername: authenticatedUser.username, phone: authenticatedUser.phone, aadhaar: authenticatedUser.aadhaar };
        
    } else if (role === "sho") {
        const selectEl = document.getElementById("login-station");
        const stationId = parseInt(selectEl.value);
        const station = MOCK_STATIONS.find(s => s.id === stationId);
        username = station.sho_name;
        details = { stationId: station.id, stationName: station.name, district: station.district };
    } else if (role === "io") {
        username = document.getElementById("login-io-name").value;
        let stationId = 1;
        if (username.includes("Ramesh") || username.includes("Rajesh")) {
            stationId = 1; 
        } else if (username.includes("Amit") || username.includes("Sanjay")) {
            stationId = 4; 
        } else {
            stationId = 6; 
        }
        const station = MOCK_STATIONS.find(s => s.id === stationId);
        details = { stationId: station.id, stationName: station.name, district: station.district };
    } else if (role === "sp") {
        const dist = document.getElementById("login-sp-district").value;
        username = `SP ${dist}`;
        details = { district: dist };
    }
    
    currentUserRole = role;
    currentUserSession = { role, username, ...details };
    localStorage.setItem("up_police_session", JSON.stringify(currentUserSession));
    
    hideLoginOverlay();
    applyRoleLayout();
    switchTab(role);
}

async function quickLogin(role, detail) {
    selectedLoginRoleVal = role;
    
    // Make sure selectLoginRole is evaluated so markup exists
    selectLoginRole(role);
    
    if (role === "citizen") {
        document.getElementById("login-username").value = detail || "citizen1";
        document.getElementById("login-password").value = "citizen123";
    } else {
        document.getElementById("login-password").value = role + "123";
        
        if (role === "sho" && detail) {
            const station = MOCK_STATIONS.find(s => s.name.includes(detail));
            if (station) document.getElementById("login-station").value = station.id;
        } else if (role === "io" && detail) {
            document.getElementById("login-io-name").value = detail;
        } else if (role === "sp" && detail) {
            document.getElementById("login-sp-district").value = detail;
        }
    }
    
    await handleLoginSubmit();
}

function handleLogout() {
    currentUserRole = null;
    currentUserSession = null;
    localStorage.removeItem("up_police_session");
    
    // Clear state
    document.getElementById("login-password").value = "";
    currentPublicImageBase64 = null;
    currentIOEvidenceImageBase64 = null;
    selectedIOCaseId = null;
    
    showLoginOverlay();
}

function applyRoleLayout() {
    // Hide all tabs by default
    document.querySelectorAll(".nav-item").forEach(item => {
        item.style.display = "none";
    });
    
    // Show corresponding tab
    if (currentUserRole === "citizen") {
        document.getElementById("tab-citizen").style.display = "flex";
    } else if (currentUserRole === "sho") {
        document.getElementById("tab-sho").style.display = "flex";
        // Lock station workspace
        const stationSelect = document.getElementById("sho-station-select");
        if (stationSelect) {
            stationSelect.value = currentUserSession.stationId;
            stationSelect.disabled = true; 
        }
    } else if (currentUserRole === "io") {
        document.getElementById("tab-io").style.display = "flex";
        document.getElementById("io-officer-info").textContent = `Logged in as: ${currentUserSession.username} (${currentUserSession.stationName} Thana)`;
    } else if (currentUserRole === "sp") {
        document.getElementById("tab-sp").style.display = "flex";
        // Lock SP district
        const distSelect = document.getElementById("sp-district-select");
        if (distSelect) {
            distSelect.value = currentUserSession.district;
            distSelect.disabled = true;
        }
    }
}

// Tab Switching Override
function switchTab(tabName) {
    if (currentUserRole && currentUserRole !== tabName) {
        tabName = currentUserRole;
    }
    
    activeTab = tabName;
    
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) activeBtn.classList.add("active");
    
    document.querySelectorAll(".content-section").forEach(sec => {
        sec.classList.remove("active");
    });
    const activeSec = document.getElementById(`view-${tabName}`);
    if (activeSec) activeSec.classList.add("active");
    
    if (tabName === "sho") {
        loadSHOGrievances();
    } else if (tabName === "io") {
        loadIOGrievances();
    } else if (tabName === "sp") {
        loadSPDashboard();
    }
}

// -------------------------------------------------------------
// CASCADING DISTRICT -> CIRCLE -> STATION SELECTORS
// -------------------------------------------------------------

function filterCircleOffices() {
    const spSelect = document.getElementById("citizen-sp-office");
    const circleSelect = document.getElementById("citizen-circle-office");
    const stationSelect = document.getElementById("citizen-police-station");
    
    circleSelect.innerHTML = '<option value="">Select Circle Office</option>';
    stationSelect.innerHTML = '<option value="">Select Police Station</option>';
    stationSelect.disabled = true;
    
    const selectedSp = spSelect.value;
    if (!selectedSp) {
        circleSelect.disabled = true;
        return;
    }
    
    const circles = CIRCLE_OFFICES[selectedSp] || [];
    circles.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        circleSelect.appendChild(opt);
    });
    
    circleSelect.disabled = false;
}

function filterPoliceStations() {
    const circleSelect = document.getElementById("citizen-circle-office");
    const stationSelect = document.getElementById("citizen-police-station");
    
    stationSelect.innerHTML = '<option value="">Select Police Station</option>';
    
    const selectedCircle = circleSelect.value;
    if (!selectedCircle) {
        stationSelect.disabled = true;
        return;
    }
    
    const stations = STATIONS_BY_CIRCLE[selectedCircle] || [];
    stations.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = `${s} Police Station`;
        stationSelect.appendChild(opt);
    });
    
    stationSelect.disabled = false;
}

// -------------------------------------------------------------
// IMAGE FILES TO BASE64 PREVIEW HANDLERS
// -------------------------------------------------------------

function previewComplaintImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert("Image size should not exceed 2MB");
        event.target.value = "";
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentPublicImageBase64 = e.target.result;
        const previewImg = document.getElementById("complaint-image-preview-img");
        previewImg.src = currentPublicImageBase64;
        document.getElementById("complaint-image-preview").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

function clearComplaintImage() {
    document.getElementById("complaint-image").value = "";
    const previewImg = document.getElementById("complaint-image-preview-img");
    if (previewImg) previewImg.src = "";
    const container = document.getElementById("complaint-image-preview");
    if (container) container.classList.add("hidden");
    currentPublicImageBase64 = null;
}

function previewIOEvidenceImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert("Image size should not exceed 2MB");
        event.target.value = "";
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentIOEvidenceImageBase64 = e.target.result;
        const previewImg = document.getElementById("io-report-image-preview-img");
        previewImg.src = currentIOEvidenceImageBase64;
        document.getElementById("io-report-image-preview").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

function clearIOEvidenceImage() {
    document.getElementById("io-report-image").value = "";
    const previewImg = document.getElementById("io-report-image-preview-img");
    if (previewImg) previewImg.src = "";
    const container = document.getElementById("io-report-image-preview");
    if (container) container.classList.add("hidden");
    currentIOEvidenceImageBase64 = null;
}

function checkIOAllotmentStatus() {
    const ioSelect = document.getElementById("action-allot-io");
    const statusSelect = document.getElementById("action-status-select");
    if (ioSelect.value && statusSelect.value === "Pending") {
        statusSelect.value = "Under Investigation";
    }
}

// -------------------------------------------------------------
// INVESTIGATING OFFICER (IO) WORKSTATION ACTIONS
// -------------------------------------------------------------

async function loadIOGrievances() {
    const listContainer = document.getElementById("io-cases-list");
    listContainer.innerHTML = "<p>Loading allotted cases...</p>";
    
    document.getElementById("io-detail-placeholder").style.display = "block";
    document.getElementById("io-detail-content").classList.add("hidden");
    selectedIOCaseId = null;
    
    try {
        let cases = [];
        const ioName = currentUserSession.username;
        
        if (isOfflineMode) {
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            cases = list.filter(g => g.allotted_io === ioName);
        } else {
            const res = await fetch(`${API_BASE}/grievances?allotted_io=${encodeURIComponent(ioName)}`);
            if (res.ok) cases = await res.json();
        }
        
        document.getElementById("io-cases-count").textContent = `${cases.length} Assigned Case(s)`;
        listContainer.innerHTML = "";
        
        if (cases.length === 0) {
            listContainer.innerHTML = "<p style='color:var(--text-muted); text-align:center; padding: 2rem 0;'>No cases currently allotted to you.</p>";
            return;
        }
        
        cases.forEach(g => {
            const card = document.createElement("div");
            card.className = "card io-case-card";
            card.style.cursor = "pointer";
            card.style.padding = "1rem";
            card.style.borderLeft = `4px solid ${getUrgencyColor(g.urgency_score)}`;
            card.style.marginBottom = "0.5rem";
            card.style.background = "rgba(15, 28, 63, 0.25)";
            
            const textPreview = g.text.length > 60 ? g.text.substring(0, 60) + "..." : g.text;
            
            card.innerHTML = `
                <div class="flex-between" style="margin-bottom:0.4rem;">
                    <strong style="color:var(--gold); font-size:0.85rem;">${g.ticket_id}</strong>
                    <span class="badge ${g.status === 'Resolved' ? 'badge-success' : 'badge-gold'}" style="font-size:0.6rem; padding:0.15rem 0.4rem;">${g.status}</span>
                </div>
                <p style="font-size:0.85rem; margin-bottom:0.4rem; color:var(--text-main);">${textPreview}</p>
                <div class="flex-between" style="font-size:0.7rem; color:var(--text-muted);">
                    <span>${g.category}</span>
                    <span>Urgency: ${g.urgency_score}/10</span>
                </div>
            `;
            
            card.addEventListener("click", () => {
                document.querySelectorAll(".io-case-card").forEach(c => {
                    c.style.background = "rgba(15, 28, 63, 0.25)";
                    c.style.borderColor = "var(--glass-border)";
                });
                card.style.background = "rgba(240, 195, 67, 0.08)";
                card.style.borderColor = "var(--gold)";
                
                selectIOCase(g);
            });
            
            listContainer.appendChild(card);
        });
    } catch (e) {
        listContainer.innerHTML = `<p style="color: var(--accent-red)">Error: ${e.message}</p>`;
    }
}

let selectedIOCaseObj = null;

function selectIOCase(g) {
    selectedIOCaseId = g.ticket_id;
    selectedIOCaseObj = g;
    
    document.getElementById("io-detail-placeholder").style.display = "none";
    document.getElementById("io-detail-content").classList.remove("hidden");
    
    document.getElementById("io-detail-tkt").textContent = g.ticket_id;
    document.getElementById("io-detail-category").textContent = g.category;
    
    const statusEl = document.getElementById("io-detail-status");
    statusEl.textContent = g.status;
    statusEl.className = "badge " + (g.status === 'Resolved' ? 'badge-success' : 'badge-gold');
    
    document.getElementById("io-detail-text").textContent = g.text;
    
    document.getElementById("io-detail-sp").textContent = g.sp_office || "-";
    document.getElementById("io-detail-circle").textContent = g.circle_office || "-";
    document.getElementById("io-detail-station").textContent = `${g.station_name || g.assigned_station || '-'} Police Station`;
    document.getElementById("io-detail-date").textContent = g.created_at;
    
    const imageSec = document.getElementById("io-detail-image-sec");
    const imageEl = document.getElementById("io-detail-image");
    
    if (g.public_image) {
        imageEl.src = g.public_image;
        imageSec.style.display = "block";
    } else {
        imageSec.style.display = "none";
        imageEl.src = "";
    }
    
    // Set report form values if already filled
    document.getElementById("io-report-text").value = g.investigation_report || "";
    document.getElementById("io-report-status").value = g.status;
    
    if (g.investigation_image) {
        currentIOEvidenceImageBase64 = g.investigation_image;
        const previewImg = document.getElementById("io-report-image-preview-img");
        previewImg.src = g.investigation_image;
        document.getElementById("io-report-image-preview").classList.remove("hidden");
    } else {
        clearIOEvidenceImage();
    }
}

function downloadGrievanceDocument() {
    if (!selectedIOCaseObj) return;
    
    const g = selectedIOCaseObj;
    
    const content = `=========================================================
                    UTTAR PRADESH POLICE
               OFFICIAL COMPLAINT MEMORANDUM
=========================================================
TICKET REF ID   : ${g.ticket_id}
CREATED AT      : ${g.created_at}
LANGUAGE        : ${g.language}
CATEGORY        : ${g.category}
URGENCY SCORE   : ${g.urgency_score}/10
SENTIMENT       : ${g.sentiment}
CURRENT STATUS  : ${g.status}

---------------------------------------------------------
JURISDICTION DETAILS:
SP OFFICE       : ${g.sp_office || (g.district + " SP Office")}
CIRCLE OFFICE   : ${g.circle_office || '-'}
POLICE STATION  : ${g.station_name || g.assigned_station || '-'} Police Station
OFFICER (SHO)   : ${g.sho_name || 'Inspector In-charge'}

---------------------------------------------------------
PUBLIC COMPLAINT STATEMENT:
${g.text}

=========================================================
                 UP POLICE CCTNS ARCHIVE COPY
=========================================================
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Grievance_${g.ticket_id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function submitIOInvestigationReport(e) {
    e.preventDefault();
    if (!selectedIOCaseId) return;
    
    const reportText = document.getElementById("io-report-text").value.trim();
    const status = document.getElementById("io-report-status").value;
    const evidenceImage = currentIOEvidenceImageBase64;
    const ioName = currentUserSession.username;
    
    try {
        if (isOfflineMode) {
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            const idx = list.findIndex(g => g.ticket_id === selectedIOCaseId);
            if (idx !== -1) {
                const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
                list[idx].status = status;
                list[idx].investigation_report = reportText;
                list[idx].investigation_image = evidenceImage;
                list[idx].action_diary.push({
                    time: nowStr,
                    message: `[IO ${ioName}] Filed investigation report. Status: ${status}.`
                });
                localStorage.setItem("up_police_grievances", JSON.stringify(list));
            }
        } else {
            const res = await fetch(`${API_BASE}/grievance/${selectedIOCaseId}/report`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    investigation_report: reportText,
                    investigation_image: evidenceImage,
                    io_name: ioName,
                    status: status
                })
            });
            if (!res.ok) throw new Error("Failed to file investigation report on CCTNS server");
        }
        
        alert("Investigation report submitted successfully.");
        
        // Reset report form
        document.getElementById("io-report-text").value = "";
        clearIOEvidenceImage();
        
        // Reload IO workstation
        loadIOGrievances();
        
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// -------------------------------------------------------------
// SP DASHBOARD POLICE STATION LEVEL RENDERER
// -------------------------------------------------------------

function renderSPStationTable(stations, isSpamOnly) {
    const tbody = document.getElementById("sp-ps-table-body");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    if (stations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No station data available for this district.</td></tr>';
        return;
    }
    
    stations.forEach(st => {
        const tr = document.createElement("tr");
        
        let statusGlow = `<span class="badge badge-success">Compliant</span>`;
        if (st.escalated_cases > 0 && !isSpamOnly) {
            statusGlow = `<span class="badge badge-danger" style="animation: pulse-red 1.5s infinite">Breach Alert</span>`;
        } else if (st.pending_cases > 0 && !isSpamOnly) {
            statusGlow = `<span class="badge badge-gold">Pending Actions</span>`;
        }
        
        tr.innerHTML = `
            <td style="font-weight: 700; color: var(--gold); cursor: pointer;" onclick="quickFilterStation('${st.name}')">${st.name} Thana</td>
            <td>${st.sho_name || 'Inspector In-charge'}</td>
            <td>${statusGlow}</td>
            <td style="text-align:center; font-weight:600;">${st.total_cases}</td>
            <td style="text-align:center; color: var(--accent-orange); font-weight:600;">${isSpamOnly ? 0 : st.pending_cases}</td>
            <td style="text-align:center; color: var(--accent-blue); font-weight:600;">${isSpamOnly ? 0 : st.active_cases}</td>
            <td style="text-align:center; color: var(--accent-green); font-weight:600;">${isSpamOnly ? 0 : st.resolved_cases}</td>
            <td style="text-align:center; color: var(--accent-red); font-weight:600;">${isSpamOnly ? 0 : st.escalated_cases}</td>
        `;
        tbody.appendChild(tr);
    });
}

function quickFilterStation(stationName) {
    // Allows SP to drill down into a station workspace directly
    const shoSelect = document.getElementById("sho-station-select");
    if (shoSelect) {
        for (let i = 0; i < shoSelect.options.length; i++) {
            if (shoSelect.options[i].text.includes(stationName)) {
                shoSelect.selectedIndex = i;
                break;
            }
        }
        const prevRole = currentUserRole;
        currentUserRole = "sho";
        switchTab("sho");
        currentUserRole = prevRole; // Restore SP context
    }
}

// -------------------------------------------------------------
// USER SIGNUP & AUTH HELPERS
// -------------------------------------------------------------

function toggleLoginView(view) {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const roleSelector = document.getElementById("login-role-selector");
    const helperContainer = document.getElementById("demo-login-helper");
    
    if (view === "signup") {
        loginForm.style.display = "none";
        signupForm.style.display = "block";
        roleSelector.style.display = "none";
        helperContainer.style.display = "none";
    } else {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
        roleSelector.style.display = "flex";
        helperContainer.style.display = "block";
        selectLoginRole(selectedLoginRoleVal);
    }
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function initializeLocalStorageUsers() {
    if (!localStorage.getItem("up_police_users")) {
        const hash = await sha256("citizen123");
        const defaultUsers = [
            {
                username: "citizen1",
                password_hash: hash,
                full_name: "Rajesh Citizen",
                phone: "9876543210",
                aadhaar: "123456789012",
                email: "citizen1@gmail.com"
            }
        ];
        localStorage.setItem("up_police_users", JSON.stringify(defaultUsers));
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById("signup-username").value.trim();
    const fullName = document.getElementById("signup-fullname").value.trim();
    const phone = document.getElementById("signup-phone").value.trim();
    const aadhaar = document.getElementById("signup-aadhaar").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;
    
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }
    
    if (phone.length !== 10) {
        alert("Phone Number must be exactly 10 digits!");
        return;
    }
    
    if (aadhaar.length !== 12) {
        alert("Aadhaar Card Number must be exactly 12 digits!");
        return;
    }
    
    try {
        if (isOfflineMode) {
            await initializeLocalStorageUsers();
            
            const users = JSON.parse(localStorage.getItem("up_police_users") || "[]");
            if (users.some(u => u.username === username)) {
                alert("Username is already registered!");
                return;
            }
            
            const passwordHash = await sha256(password);
            users.push({
                username: username,
                password_hash: passwordHash,
                full_name: fullName,
                phone: phone,
                aadhaar: aadhaar,
                email: email || null
            });
            localStorage.setItem("up_police_users", JSON.stringify(users));
        } else {
            // Live Server signup post
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    full_name: fullName,
                    phone: phone,
                    aadhaar: aadhaar,
                    email: email || null
                })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Signup failed on CCTNS server");
            }
        }
        
        alert("Account registered successfully! You can now sign in.");
        toggleLoginView("login");
        
        // Populate credentials in form
        selectedLoginRoleVal = "citizen";
        selectLoginRole("citizen");
        
        const uInput = document.getElementById("login-username");
        if (uInput) uInput.value = username;
        document.getElementById("login-password").value = password;
        
    } catch (err) {
        alert("Registration failed: " + err.message);
    }
}
