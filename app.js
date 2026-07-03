// Initial Seed Data (Loaded if LocalStorage is empty)
const SEED_COMPLAINTS = [
    {
        id: "PRH-2026-1001",
        name: "रमेश यादव / Ramesh Yadav",
        phone: "9876543210",
        aadhaar: "123456789012",
        station: "Kotwali",
        category: "चोरी / Theft",
        subject: "घर में ताला तोड़कर चोरी / House Theft",
        description: "गत रात्रि जब हम परिवार सहित बाहर गए हुए थे, अज्ञात चोरों ने ताला तोड़कर तिजोरी से जेवरात व नकदी चुरा ली। कृपया रिपोर्ट दर्ज कर कार्रवाई करें।",
        date: "2026-06-30T10:30:00.000Z",
        status: "Resolved",
        assignedIo: "Sub-Inspector Amit Kumar",
        reportText: "घटनास्थल का निरीक्षण किया गया। संदिग्धों से पूछताछ की गई और चोरी का सामान बरामद कर लिया गया है। केस को निस्तारित किया गया।",
        reportDate: "2026-07-02T12:00:00.000Z"
    },
    {
        id: "PRH-2026-1002",
        name: "सुनीता शर्मा / Sunita Sharma",
        phone: "9123456789",
        aadhaar: "987654321098",
        station: "Sadar",
        category: "भूमि विवाद / Land Dispute",
        subject: "पड़ोसी द्वारा भूमि पर अवैध कब्जा / Land Encroachment",
        description: "पड़ोसी ने हमारी पैतृक भूमि की बाड़ को जबरन 2 फीट खिसका कर अवैध निर्माण शुरू कर दिया है। बार-बार मना करने पर मारपीट की धमकी दे रहे हैं।",
        date: "2026-07-01T08:15:00.000Z",
        status: "Under Investigation",
        assignedIo: "Sub-Inspector Sunita Devi",
        reportText: "दोनों पक्षों को बुलाकर भूमि के दस्तावेज जांचे जा रहे हैं। पैमाइश हेतु राजस्व टीम को पत्र लिखा गया है।",
        reportDate: "2026-07-02T16:30:00.000Z"
    },
    {
        id: "PRH-2026-1003",
        name: "आदित्य वर्मा / Aditya Verma",
        phone: "8877665544",
        aadhaar: "",
        station: "Cantt",
        category: "धोखाधड़ी / Cyber Fraud",
        subject: "क्रेडिट कार्ड फ्रॉड / Credit Card Fraud",
        description: "मेरे बैंक खाते से बिना किसी ओटीपी के 45,000 रुपये काट लिए गए। बैंक से संपर्क करने पर साइबर सेल में शिकायत करने को कहा गया है।",
        date: "2026-07-02T14:45:00.000Z",
        status: "Pending",
        assignedIo: "",
        reportText: "",
        reportDate: ""
    },
    {
        id: "PRH-2026-1004",
        name: "राजेश सिंह / Rajesh Singh",
        phone: "7766554433",
        aadhaar: "554433221100",
        station: "Kotwali",
        category: "अन्य / Other",
        subject: "दुकान के सामने अवैध पार्किंग / Illegal Parking",
        description: "दुकान के सामने लोग गाड़ियां खड़ी कर चले जाते हैं, जिससे व्यापार प्रभावित हो रहा है। टोकने पर अभद्र व्यवहार करते हैं।",
        date: "2026-07-03T09:00:00.000Z",
        status: "Pending",
        assignedIo: "",
        reportText: "",
        reportDate: ""
    }
];

// Investigating Officers (IO) Repository
const IO_LIST = {
    "Kotwali": ["Sub-Inspector Amit Kumar", "Sub-Inspector Rajesh Singh"],
    "Sadar": ["Sub-Inspector Sunita Devi", "Sub-Inspector Manoj Tiwari"],
    "Cantt": ["Sub-Inspector Vinay Gupta", "Sub-Inspector Anita Rao"]
};

// Official User Directory
const USER_DIRECTORY = {
    sho: {
        "sho_kotwali": { password: "sho123", station: "Kotwali" },
        "sho_sadar": { password: "sho123", station: "Sadar" },
        "sho_cantt": { password: "sho123", station: "Cantt" }
    },
    io: {
        "io_amit": { password: "io123", name: "Sub-Inspector Amit Kumar", station: "Kotwali" },
        "io_sunita": { password: "io123", name: "Sub-Inspector Sunita Devi", station: "Sadar" },
        "io_vinay": { password: "io123", name: "Sub-Inspector Vinay Gupta", station: "Cantt" }
    },
    sp: {
        "sp_district": { password: "sp123", district: "Gorakhpur" }
    }
};

// State Variables
let currentRole = "";
let currentUserSession = null; // Stores login session data
let complaints = [];
let activeComplaintForAction = null; // Used for Modals

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    // Load from LocalStorage or Seed Data
    if (!localStorage.getItem("prahari_complaints")) {
        localStorage.setItem("prahari_complaints", JSON.stringify(SEED_COMPLAINTS));
    }
    complaints = JSON.parse(localStorage.getItem("prahari_complaints"));

    // Check if session is already active
    const savedSession = sessionStorage.getItem("prahari_session");
    if (savedSession) {
        currentUserSession = JSON.parse(savedSession);
        currentRole = currentUserSession.role;
        document.getElementById("logout-btn").classList.remove("hidden");
        loadDashboard(currentRole);
    }

    // Set up form submission handlers and close buttons
    window.addEventListener("click", (e) => {
        const modal = document.getElementById("details-modal");
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Switch role view on main login container
function switchLoginRole(role) {
    currentRole = role;
    const credBox = document.getElementById("login-credentials-box");
    const title = document.getElementById("login-title");
    const phoneGroup = document.getElementById("citizen-phone-group");
    const otpGroup = document.getElementById("citizen-otp-group");
    const userGroup = document.getElementById("official-username-group");
    const passGroup = document.getElementById("official-password-group");
    const demoCreds = document.getElementById("demo-creds-hint");

    // Reset login forms
    document.getElementById("citizen-phone").value = "";
    document.getElementById("citizen-otp").value = "";
    document.getElementById("official-username").value = "";
    document.getElementById("official-password").value = "";
    otpGroup.classList.add("hidden");

    credBox.classList.remove("hidden");
    credBox.scrollIntoView({ behavior: 'smooth' });

    if (role === 'citizen') {
        title.innerHTML = '<i class="fa-solid fa-users"></i> नागरिक लागिन / Citizen Login';
        phoneGroup.classList.remove("hidden");
        userGroup.classList.add("hidden");
        passGroup.classList.add("hidden");
        demoCreds.innerHTML = "💡 <b>टेस्टिंग गाइड:</b> अपना 10 अंकों का मोबाइल नंबर डालें, फिर <b>OTP '1234'</b> का उपयोग करें।";
    } else {
        phoneGroup.classList.add("hidden");
        userGroup.classList.remove("hidden");
        passGroup.classList.remove("hidden");

        if (role === 'sho') {
            title.innerHTML = '<i class="fa-solid fa-user-shield"></i> थाना प्रभारी लागिन / SHO Login';
            demoCreds.innerHTML = "💡 <b>क्रेडेंशियल्स:</b> User: <code>sho_kotwali</code> | Pass: <code>sho123</code>";
        } else if (role === 'io') {
            title.innerHTML = '<i class="fa-solid fa-user-tie"></i> जाँच अधिकारी लागिन / IO Login';
            demoCreds.innerHTML = "💡 <b>क्रेडेंशियल्स:</b> User: <code>io_amit</code> | Pass: <code>io123</code>";
        } else if (role === 'sp') {
            title.innerHTML = '<i class="fa-solid fa-building-shield"></i> पुलिस अधीक्षक लागिन / SP Login';
            demoCreds.innerHTML = "💡 <b>क्रेडेंशियल्स:</b> User: <code>sp_district</code> | Pass: <code>sp123</code>";
        }
    }
}

function hideLoginBox() {
    document.getElementById("login-credentials-box").classList.add("hidden");
}

// Login Process
function handleLogin() {
    if (currentRole === 'citizen') {
        const phone = document.getElementById("citizen-phone").value.trim();
        const otpGroup = document.getElementById("citizen-otp-group");
        
        if (!/^\d{10}$/.test(phone)) {
            alert("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें | Please enter a valid 10-digit mobile number.");
            return;
        }

        if (otpGroup.classList.contains("hidden")) {
            // First step: Trigger Mock OTP
            otpGroup.classList.remove("hidden");
            alert("ओ.टी.पी. भेज दिया गया है (जांच हेतु '1234' दर्ज करें) | OTP sent (Use '1234' to verify).");
        } else {
            const otp = document.getElementById("citizen-otp").value.trim();
            if (otp === "1234") {
                currentUserSession = { role: 'citizen', phone: phone };
                sessionStorage.setItem("prahari_session", JSON.stringify(currentUserSession));
                document.getElementById("logout-btn").classList.remove("hidden");
                loadDashboard('citizen');
            } else {
                alert("गलत ओ.टी.पी. | Invalid OTP.");
            }
        }
    } else {
        // Official Login
        const username = document.getElementById("official-username").value.trim();
        const password = document.getElementById("official-password").value.trim();

        if (!username || !password) {
            alert("कृपया यूजरनेम और पासवर्ड दोनों दर्ज करें | Please fill both username and password.");
            return;
        }

        const userRepo = USER_DIRECTORY[currentRole];
        if (userRepo && userRepo[username] && userRepo[username].password === password) {
            currentUserSession = { role: currentRole, username: username, ...userRepo[username] };
            sessionStorage.setItem("prahari_session", JSON.stringify(currentUserSession));
            document.getElementById("logout-btn").classList.remove("hidden");
            loadDashboard(currentRole);
        } else {
            alert("गलत यूजरनेम या पासवर्ड | Invalid username or password.");
        }
    }
}

// Global View Switching
function showSection(sectionId) {
    document.querySelectorAll(".view-section").forEach(sec => {
        sec.classList.remove("active");
        sec.classList.add("hidden");
    });
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
    }
}

// Dashboard Setup router
function loadDashboard(role) {
    hideLoginBox();
    showSection(`${role}-dashboard`);

    if (role === 'citizen') {
        document.getElementById("citizen-phone-display").innerText = currentUserSession.phone;
        renderCitizenComplaints();
    } else if (role === 'sho') {
        document.getElementById("sho-station-display").innerText = `थाना: ${currentUserSession.station} / Police Station: ${currentUserSession.station}`;
        renderShoDashboard();
    } else if (role === 'io') {
        document.getElementById("io-name-display").innerText = `${currentUserSession.name} (${currentUserSession.station})`;
        renderIoDashboard();
    } else if (role === 'sp') {
        document.getElementById("sp-district-display").innerText = `${currentUserSession.district} / District: ${currentUserSession.district}`;
        renderSpDashboard();
    }
}

// LOGOUT EVENT
document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("prahari_session");
    currentUserSession = null;
    currentRole = "";
    document.getElementById("logout-btn").classList.add("hidden");
    showSection("login-container");
});

// Citizen: Render Complaints
function renderCitizenComplaints() {
    const listContainer = document.getElementById("citizen-complaint-list");
    listContainer.innerHTML = "";

    const userComplaints = complaints.filter(c => c.phone === currentUserSession.phone);

    if (userComplaints.length === 0) {
        listContainer.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">कोई शिकायत नहीं मिली | No complaints found.</td></tr>`;
        return;
    }

    userComplaints.forEach(c => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><b>${c.id}</b></td>
            <td>${c.subject}</td>
            <td>थाना ${c.station}</td>
            <td>${new Date(c.date).toLocaleDateString()}</td>
            <td><span class="badge ${getStatusBadgeClass(c.status)}">${getStatusInHindi(c.status)}</span></td>
            <td><button class="btn btn-secondary btn-sm" onclick="openDetailsModal('${c.id}')"><i class="fa-solid fa-eye"></i> देखें / View</button></td>
        `;
        listContainer.appendChild(row);
    });
}

// Citizen: Submit Complaint
function submitComplaint(e) {
    e.preventDefault();

    const name = document.getElementById("comp-name").value.trim();
    const phone = document.getElementById("comp-phone").value.trim();
    const aadhaar = document.getElementById("comp-aadhaar").value.trim();
    const station = document.getElementById("comp-station").value;
    const category = document.getElementById("comp-category").value;
    const subject = document.getElementById("comp-subject").value.trim();
    const description = document.getElementById("comp-description").value.trim();

    const newId = `PRH-2026-${1000 + complaints.length + 1}`;
    
    const newGrievance = {
        id: newId,
        name,
        phone,
        aadhaar,
        station,
        category,
        subject,
        description,
        date: new Date().toISOString(),
        status: "Pending",
        assignedIo: "",
        reportText: "",
        reportDate: ""
    };

    complaints.push(newGrievance);
    localStorage.setItem("prahari_complaints", JSON.stringify(complaints));

    // Reset Form and Redirect
    document.getElementById("new-complaint-form").reset();
    alert(`शिकायत सफलतापूर्वक दर्ज की गई! आपकी शिकायत संख्या है: ${newId} \nComplaint registered successfully! ID: ${newId}`);
    loadDashboard('citizen');
}

// Trigger Complaint Form Preparation
function prepareNewComplaintForm() {
    document.getElementById("comp-phone").value = currentUserSession.phone;
}

// Intercept show section for custom setup
const originalShowSection = showSection;
showSection = function(sectionId) {
    if (sectionId === 'citizen-new-complaint-view') {
        prepareNewComplaintForm();
    }
    originalShowSection(sectionId);
};

// SHO: Render Dashboard
function renderShoDashboard() {
    const station = currentUserSession.station;
    const stationComplaints = complaints.filter(c => c.station === station);

    // Calculate metrics
    const total = stationComplaints.length;
    const pending = stationComplaints.filter(c => c.status === "Pending").length;
    const investigating = stationComplaints.filter(c => c.status === "Under Investigation").length;
    const resolved = stationComplaints.filter(c => c.status === "Resolved").length;

    document.getElementById("sho-stat-total").innerText = total;
    document.getElementById("sho-stat-pending").innerText = pending;
    document.getElementById("sho-stat-investigating").innerText = investigating;
    document.getElementById("sho-stat-resolved").innerText = resolved;

    // Render table
    const tableBody = document.getElementById("sho-complaint-list");
    tableBody.innerHTML = "";

    if (stationComplaints.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">इस थाने में कोई शिकायत दर्ज नहीं है | No complaints recorded at this station.</td></tr>`;
        return;
    }

    stationComplaints.forEach(c => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><b>${c.id}</b></td>
            <td>${c.name}</td>
            <td>${c.category}</td>
            <td>${new Date(c.date).toLocaleDateString()}</td>
            <td>${c.assignedIo ? `<i class="fa-solid fa-user-check"></i> ${c.assignedIo}` : `<span style="color:var(--color-pending);"><i class="fa-solid fa-triangle-exclamation"></i> आवंटित नहीं / Not Assigned</span>`}</td>
            <td><span class="badge ${getStatusBadgeClass(c.status)}">${getStatusInHindi(c.status)}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="openDetailsModal('${c.id}')">
                    <i class="fa-solid fa-gears"></i> ${c.assignedIo ? "विवरण / Details" : "अधिकारी आवंटित करें / Assign"}
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// IO: Render Dashboard
function renderIoDashboard() {
    const ioName = currentUserSession.name;
    const ioComplaints = complaints.filter(c => c.assignedIo === ioName);

    // Calculate metrics
    const total = ioComplaints.length;
    const pending = ioComplaints.filter(c => c.status === "Under Investigation").length;
    const resolved = ioComplaints.filter(c => c.status === "Resolved").length;

    document.getElementById("io-stat-total").innerText = total;
    document.getElementById("io-stat-pending").innerText = pending;
    document.getElementById("io-stat-resolved").innerText = resolved;

    // Render table
    const tableBody = document.getElementById("io-complaint-list");
    tableBody.innerHTML = "";

    if (ioComplaints.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">आपको अभी तक कोई केस आवंटित नहीं हुआ है | No cases assigned to you.</td></tr>`;
        return;
    }

    ioComplaints.forEach(c => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><b>${c.id}</b></td>
            <td>${c.name}</td>
            <td>${c.category}</td>
            <td>${c.subject}</td>
            <td>${new Date(c.date).toLocaleDateString()}</td>
            <td><span class="badge ${getStatusBadgeClass(c.status)}">${getStatusInHindi(c.status)}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openDetailsModal('${c.id}')">
                    <i class="fa-solid fa-file-signature"></i> जाँच रिपोर्ट दर्ज करें / Update Report
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// SP: Render Dashboard
function renderSpDashboard() {
    // High level metrics
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === "Pending" || c.status === "Under Investigation").length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    document.getElementById("sp-stat-total").innerText = total;
    document.getElementById("sp-stat-pending").innerText = pending;
    document.getElementById("sp-stat-resolved").innerText = resolved;
    document.getElementById("sp-stat-rate").innerText = `${rate}%`;

    // Render Analytics per Station
    const stations = ["Kotwali", "Sadar", "Cantt"];
    const analyticsContainer = document.getElementById("sp-station-analytics-container");
    analyticsContainer.innerHTML = "";

    stations.forEach(st => {
        const list = complaints.filter(c => c.station === st);
        const resolvedCount = list.filter(c => c.status === "Resolved").length;
        const totalCount = list.length;
        const pct = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

        const row = document.createElement("div");
        row.className = "station-metric-row";
        row.innerHTML = `
            <div class="station-metric-header">
                <span>थाना ${st} / PS ${st}</span>
                <span>${resolvedCount}/${totalCount} निस्तारित (${pct}%)</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${pct}%"></div>
            </div>
        `;
        analyticsContainer.appendChild(row);
    });

    // Render overdue pending cases (Any case that is Pending or has been under investigation)
    const pendingList = complaints.filter(c => c.status !== "Resolved");
    const listBody = document.getElementById("sp-pending-complaints-list");
    listBody.innerHTML = "";

    if (pendingList.length === 0) {
        listBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">कोई लंबित मामला नहीं है | No pending cases.</td></tr>`;
        return;
    }

    pendingList.forEach(c => {
        const days = Math.floor((new Date() - new Date(c.date)) / (1000 * 60 * 60 * 24));
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><b>${c.id}</b></td>
            <td>थाना ${c.station}</td>
            <td>${c.category}</td>
            <td><span style="color: var(--color-pending); font-weight:600;">${days} दिन पूर्व / ${days} Days Ago</span></td>
            <td><span class="badge ${getStatusBadgeClass(c.status)}">${getStatusInHindi(c.status)}</span></td>
        `;
        listBody.appendChild(row);
    });
}

// Modal Management
function openDetailsModal(id) {
    const comp = complaints.find(c => c.id === id);
    if (!comp) return;

    activeComplaintForAction = comp;

    // Fill Modal Information
    document.getElementById("modal-id").innerText = comp.id;
    document.getElementById("modal-name").innerText = comp.name;
    document.getElementById("modal-phone").innerText = comp.phone;
    document.getElementById("modal-aadhaar").innerText = comp.aadhaar || "N/A";
    document.getElementById("modal-station").innerText = `थाना ${comp.station}`;
    document.getElementById("modal-date").innerText = new Date(comp.date).toLocaleString();
    document.getElementById("modal-category").innerText = comp.category;
    document.getElementById("modal-subject").innerText = comp.subject;
    document.getElementById("modal-desc").innerText = comp.description;

    // Action view resets
    document.getElementById("modal-sho-action-box").classList.add("hidden");
    document.getElementById("modal-io-action-box").classList.add("hidden");
    document.getElementById("modal-investigation-report-box").classList.add("hidden");

    // Display appropriate actions depending on logged-in role
    if (currentUserSession.role === 'sho') {
        if (comp.status === 'Pending') {
            document.getElementById("modal-sho-action-box").classList.remove("hidden");
            // Populate IO dropdown
            const ioSelect = document.getElementById("select-io-assign");
            ioSelect.innerHTML = `<option value="">अधिकारी चुनें / Select Officer...</option>`;
            (IO_LIST[comp.station] || []).forEach(io => {
                const opt = document.createElement("option");
                opt.value = io;
                opt.innerText = io;
                ioSelect.appendChild(opt);
            });
        } else {
            // Already assigned, show report if present
            showReportDetails(comp);
        }
    } else if (currentUserSession.role === 'io') {
        document.getElementById("modal-io-action-box").classList.remove("hidden");
        document.getElementById("select-status-update").value = comp.status;
        document.getElementById("investigation-report-text").value = comp.reportText || "";
    } else {
        // Citizen / SP - just show the investigation status
        showReportDetails(comp);
    }

    document.getElementById("details-modal").classList.remove("hidden");
}

function showReportDetails(comp) {
    if (comp.assignedIo) {
        document.getElementById("modal-investigation-report-box").classList.remove("hidden");
        document.getElementById("modal-report-officer").innerText = comp.assignedIo;
        document.getElementById("modal-report-date").innerText = comp.reportDate ? new Date(comp.reportDate).toLocaleString() : "N/A";
        document.getElementById("modal-report-text").innerText = comp.reportText || "जाँच शुरू कर दी गई है। अंतिम रिपोर्ट की प्रतीक्षा है। / Investigation started. Waiting for final report.";
    }
}

function closeModal() {
    document.getElementById("details-modal").classList.add("hidden");
    activeComplaintForAction = null;
}

// SHO Action: Assign Investigating Officer
function assignIO() {
    const ioName = document.getElementById("select-io-assign").value;
    if (!ioName) {
        alert("कृपया एक जाँच अधिकारी का चयन करें | Please select an Investigating Officer.");
        return;
    }

    const index = complaints.findIndex(c => c.id === activeComplaintForAction.id);
    if (index !== -1) {
        complaints[index].assignedIo = ioName;
        complaints[index].status = "Under Investigation";
        localStorage.setItem("prahari_complaints", JSON.stringify(complaints));
        
        alert("जाँच अधिकारी सफलतापूर्वक आवंटित किया गया | Officer assigned successfully.");
        closeModal();
        loadDashboard('sho');
    }
}

// IO Action: Submit Investigation Report
function submitInvestigationReport() {
    const status = document.getElementById("select-status-update").value;
    const reportText = document.getElementById("investigation-report-text").value.trim();

    if (!reportText) {
        alert("कृपया जाँच रिपोर्ट का विवरण दर्ज करें | Please enter details of the investigation report.");
        return;
    }

    const index = complaints.findIndex(c => c.id === activeComplaintForAction.id);
    if (index !== -1) {
        complaints[index].status = status;
        complaints[index].reportText = reportText;
        complaints[index].reportDate = new Date().toISOString();
        localStorage.setItem("prahari_complaints", JSON.stringify(complaints));

        alert("जाँच रिपोर्ट सफलतापूर्वक सहेज ली गई है | Investigation report submitted successfully.");
        closeModal();
        loadDashboard('io');
    }
}

// Export / Print Report Function
function exportReports(role) {
    let reportData = [];
    let title = "";

    if (role === 'SHO') {
        title = `थाना ${currentUserSession.station} - शिकायत रिपोर्ट / PS ${currentUserSession.station} Complaint Report`;
        reportData = complaints.filter(c => c.station === currentUserSession.station);
    } else {
        title = `जनपद ${currentUserSession.district} - समस्त थाना शिकायत रिपोर्ट / District ${currentUserSession.district} Overview Report`;
        reportData = complaints;
    }

    // Build plain text printable representation of report data
    let reportWindow = window.open("", "_blank");
    let content = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p>रिपोर्ट तैयार होने की तिथि / Generated Date: ${new Date().toLocaleString()}</p>
            <table>
                <thead>
                    <tr>
                        <th>संख्या / Grievance ID</th>
                        <th>थाना / Station</th>
                        <th>शिकायतकर्ता / Applicant</th>
                        <th>श्रेणी / Category</th>
                        <th>विषय / Subject</th>
                        <th>स्थिति / Status</th>
                        <th>जाँच अधिकारी / IO</th>
                    </tr>
                </thead>
                <tbody>
    `;

    reportData.forEach(c => {
        content += `
            <tr>
                <td>${c.id}</td>
                <td>${c.station}</td>
                <td>${c.name}</td>
                <td>${c.category}</td>
                <td>${c.subject}</td>
                <td>${getStatusInHindi(c.status)} (${c.status})</td>
                <td>${c.assignedIo || "N/A"}</td>
            </tr>
        `;
    });

    content += `
                </tbody>
            </table>
            <br>
            <button onclick="window.print()" style="padding: 10px 20px; cursor:pointer;">प्रिंट करें / Print Report</button>
        </body>
        </html>
    `;

    reportWindow.document.write(content);
    reportWindow.document.close();
}

// Translation Helpers
function getStatusInHindi(status) {
    switch (status) {
        case "Pending": return "लंबित / Pending";
        case "Under Investigation": return "जाँच जारी / Under Investigation";
        case "Resolved": return "निस्तारित / Resolved";
        default: return status;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case "Pending": return "badge-pending";
        case "Under Investigation": return "badge-assigned";
        case "Resolved": return "badge-resolved";
        default: return "";
    }
}
