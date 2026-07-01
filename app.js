const API_BASE = "http://127.0.0.1:8000/api";

// System state
let isOfflineMode = false;
let activeTab = "citizen";
let selectedGrievanceId = null;
let countdownIntervals = {};

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
    
    // Initial view
    switchTab("citizen");
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
    const dist = document.getElementById("citizen-district").value;
    const station = document.getElementById("citizen-station").value;
    
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
            const finalDist = dist || analysis.district;
            const finalStation = station || analysis.assigned_station;
            
            const stationObj = MOCK_STATIONS.find(s => s.name === finalStation && s.district === finalDist) || MOCK_STATIONS[0];
            
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
                created_at: createdStr
            };
            
            // Save to localStorage
            const localGrievances = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            localGrievances.unshift({
                ...outputData,
                assigned_station_id: stationObj.id,
                station_name: stationObj.name,
                sho_name: stationObj.sho_name,
                station_phone: stationObj.phone,
                district: finalDist,
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
                    custom_district: dist || null,
                    custom_station: station || null
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
        metaDiv.innerHTML = `
            <div style="margin-bottom: 0.5rem;"><strong>Category:</strong> ${ticket.category} | <strong>Assigned Thana:</strong> ${ticket.station_name}</div>
            <div><strong>Assigned Officer (SHO):</strong> ${ticket.sho_name} (${ticket.station_phone})</div>
        `;
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
    const status = document.getElementById("action-status-select").value;
    const message = document.getElementById("action-message").value.trim();
    
    try {
        if (isOfflineMode) {
            const list = JSON.parse(localStorage.getItem("up_police_grievances") || "[]");
            const idx = list.findIndex(g => g.ticket_id === selectedGrievanceId);
            
            if (idx !== -1) {
                const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
                list[idx].status = status;
                list[idx].action_diary.push({
                    time: nowStr,
                    message: `[${shoName}] ${message}`
                });
                
                localStorage.setItem("up_police_grievances", JSON.stringify(list));
            }
        } else {
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
