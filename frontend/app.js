const API_BASE = "http://127.0.0.1:8000/api";

// Active status state
let activeTab = "citizen";
let selectedGrievanceId = null;
let countdownIntervals = {};

// On Load
document.addEventListener("DOMContentLoaded", () => {
    // Start Clock
    setInterval(updateClock, 1000);
    updateClock();
    
    // Load station lists for select elements
    loadAllStations();
    
    // Start background tick loop (every 3 seconds to trigger SLA changes and refresh views)
    setInterval(systemHeartbeat, 3000);
    
    // Initial load
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

// Tab switcher
function switchTab(tabName) {
    activeTab = tabName;
    
    // Update menu buttons
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });
    document.getElementById(`tab-${tabName}`).classList.add("active");
    
    // Show correct section
    document.querySelectorAll(".content-section").forEach(sec => {
        sec.classList.remove("active");
    });
    document.getElementById(`view-${tabName}`).classList.add("active");
    
    // Trigger appropriate updates
    if (tabName === "sho") {
        loadSHOGrievances();
    } else if (tabName === "sp") {
        loadSPDashboard();
    }
}

// Toggle Accordion for manual overrides
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

// Fetch all police stations to populate SHO and Citizen select options
async function loadAllStations() {
    try {
        const res = await fetch(`${API_BASE}/stations`);
        if (!res.ok) throw new Error("Could not fetch stations");
        const stations = await res.json();
        
        // Populate SHO select
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
        
        // Populate Citizen manual override stations (Lucknow by default)
        loadCitizenStations(stations);
        
    } catch (e) {
        console.error("Error loading stations:", e);
    }
}

// Filter citizen override station selection based on chosen district
async function loadCitizenStations(preloadedStations = null) {
    const distSelect = document.getElementById("citizen-district");
    const stSelect = document.getElementById("citizen-station");
    if (!stSelect) return;
    
    const selectedDist = distSelect.value;
    
    stSelect.innerHTML = '<option value="">AI automatic detection</option>';
    
    if (!selectedDist) return;
    
    try {
        let stations = preloadedStations;
        if (!stations) {
            const res = await fetch(`${API_BASE}/stations?district=${selectedDist}`);
            stations = await res.json();
        } else {
            stations = preloadedStations.filter(s => s.district === selectedDist);
        }
        
        stations.forEach(st => {
            const opt = document.createElement("option");
            opt.value = st.name;
            opt.textContent = st.name;
            stSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading stations for district:", e);
    }
}

// -------------------------------------------------------------
// CITIZEN INTERACTIVITY
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
    
    // Show spinner & reset visibility
    btn.disabled = true;
    spinner.style.display = "inline-block";
    resultCard.style.display = "none";
    loader.style.display = "block";
    
    // Reset steps
    const stepLang = document.getElementById("step-lang");
    const stepCat = document.getElementById("step-cat");
    const stepLoc = document.getElementById("step-loc");
    const stepUrgency = document.getElementById("step-urgency");
    
    [stepLang, stepCat, stepLoc, stepUrgency].forEach(step => {
        step.className = "step";
    });
    
    // Simulate steps of AI workflow visually
    try {
        await sleep(600);
        stepLang.className = "step active";
        await sleep(500);
        stepLang.className = "step completed";
        stepCat.className = "step active";
        await sleep(500);
        stepCat.className = "step completed";
        stepLoc.className = "step active";
        await sleep(500);
        stepLoc.className = "step completed";
        stepUrgency.className = "step active";
        await sleep(400);
        stepUrgency.className = "step completed";
        
        // Actually call backend
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
            throw new Error(err.detail || "Server error submitting grievance");
        }
        
        const data = await response.json();
        
        // Populate Result
        document.getElementById("res-ticket-id").textContent = data.ticket_id;
        document.getElementById("res-lang").textContent = data.language;
        
        const catBadge = document.getElementById("res-category");
        catBadge.textContent = data.category;
        catBadge.className = "value badge " + getCategoryBadgeClass(data.category);
        
        document.getElementById("res-station").textContent = `${data.assigned_station} Thana`;
        document.getElementById("res-urgency").innerHTML = `<strong style="color: ${getUrgencyColor(data.urgency_score)}">${data.urgency_score}/10</strong>`;
        document.getElementById("res-sentiment").textContent = data.sentiment;
        
        const statusVal = document.getElementById("res-status");
        statusVal.textContent = data.status;
        statusVal.className = "value " + getStatusColorClass(data.status);
        
        // Hide loader and show result card
        loader.style.display = "none";
        resultCard.style.display = "block";
        
        // Pre-fill tracking ID search field for convenience
        document.getElementById("track-ticket-id").value = data.ticket_id;
        trackGrievance(data.ticket_id);
        
        // Clear textarea
        document.getElementById("complaint-text").value = "";
        
    } catch (err) {
        alert("Submit error: " + err.message);
        loader.style.display = "none";
    } finally {
        btn.disabled = false;
        spinner.style.display = "none";
    }
}

// Search and Track Grievance Status Details
async function trackGrievance(ticketId = null) {
    const tktInput = document.getElementById("track-ticket-id");
    const id = ticketId || tktInput.value.trim();
    
    if (!id) {
        alert("Please enter a Ticket ID");
        return;
    }
    
    const container = document.getElementById("track-timeline-container");
    container.innerHTML = "<p>Retrieving case records...</p>";
    
    try {
        const res = await fetch(`${API_BASE}/grievance/${id}`);
        if (!res.ok) throw new Error("Ticket not found in local CCTNS index");
        const ticket = await res.json();
        
        container.innerHTML = "";
        
        // Show metadata header
        const metaDiv = document.createElement("div");
        metaDiv.className = "timeline-meta";
        metaDiv.innerHTML = `
            <div style="margin-bottom: 0.5rem;"><strong>Category:</strong> ${ticket.category} | <strong>Assigned Thana:</strong> ${ticket.station_name}</div>
            <div><strong>Assigned Officer (SHO):</strong> ${ticket.sho_name} (${ticket.station_phone})</div>
        `;
        container.appendChild(metaDiv);
        
        // Render timeline nodes
        ticket.action_diary.forEach((event, idx) => {
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

// Helper badge builders
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

// -------------------------------------------------------------
// SHO WORKSTATION INTERACTIVITY
// -------------------------------------------------------------

async function loadSHOGrievances() {
    const stationSelect = document.getElementById("sho-station-select");
    if (!stationSelect || !stationSelect.value) return;
    
    const stationId = stationSelect.value;
    const tbody = document.getElementById("sho-table-body");
    tbody.innerHTML = '<tr><td colspan="7">Loading assigned cases...</td></tr>';
    
    // Clear old timer intervals to prevent leaks
    Object.keys(countdownIntervals).forEach(k => {
        clearInterval(countdownIntervals[k]);
    });
    countdownIntervals = {};
    
    try {
        const res = await fetch(`${API_BASE}/grievances?station_id=${stationId}`);
        if (!res.ok) throw new Error("Failed to fetch cases");
        const grievances = await res.json();
        
        document.getElementById("sho-cases-count").textContent = `${grievances.length} Case(s) Active`;
        tbody.innerHTML = "";
        
        if (grievances.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No grievances currently assigned to this police station.</td></tr>';
            return;
        }
        
        grievances.forEach(g => {
            const tr = document.createElement("tr");
            tr.id = `sho-row-${g.ticket_id}`;
            
            // Format complaint preview text (truncate if long)
            const textPreview = g.text.length > 80 ? g.text.substring(0, 80) + "..." : g.text;
            
            // Create timer column element
            const timerId = `timer-${g.ticket_id}`;
            
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--gold);">${g.ticket_id}</td>
                <td title="${g.text}">${textPreview}</td>
                <td><span class="badge ${getCategoryBadgeClass(g.category)}">${g.category}</span></td>
                <td><span style="color: ${getUrgencyColor(g.urgency_score)}; font-weight:700;">${g.urgency_score}/10</span></td>
                <td id="${timerId}" class="sla-timer-cell">Checking SLA...</td>
                <td><span class="badge ${g.status === 'Resolved' ? 'badge-success' : (g.status === 'Under Investigation' ? 'badge-info' : 'badge-gold')}">${g.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openSHODrawer('${g.ticket_id}', '${g.status}')">Action</button>
                </td>
            `;
            tbody.appendChild(tr);
            
            // Start real-time timer countdown for this specific grievance
            if (g.status === "Pending" && !g.is_spam) {
                startSLACountdown(g.ticket_id, g.escalation_time, timerId, g.escalated);
            } else if (g.status !== "Pending") {
                document.getElementById(timerId).innerHTML = `<span style="color: var(--text-muted)">N/A (Investigation Started)</span>`;
            } else if (g.is_spam) {
                document.getElementById(timerId).innerHTML = `<span style="color: var(--accent-orange)">Spam Filtered</span>`;
            }
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color: var(--accent-red);">Error loading cases: ${e.message}</td></tr>`;
    }
}

// Real-time tick for SLA timers inside SHO table
function startSLACountdown(ticketId, escalationTimeStr, cellId, alreadyEscalated) {
    const escTime = new Date(escalationTimeStr).getTime();
    const cell = document.getElementById(cellId);
    
    function tick() {
        const now = new Date().getTime();
        const diff = escTime - now;
        
        if (diff <= 0 || alreadyEscalated) {
            cell.innerHTML = `<span class="badge badge-danger" style="animation: pulse-red 1.5s infinite">🚨 Escalated to SP</span>`;
            clearInterval(countdownIntervals[ticketId]);
        } else {
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            cell.innerHTML = `⏳ SLA Escalates in <strong>${seconds}s</strong>`;
        }
    }
    
    tick(); // Run immediately
    countdownIntervals[ticketId] = setInterval(tick, 1000);
}

// SHO Drawer Actions
function openSHODrawer(ticketId, currentStatus) {
    selectedGrievanceId = ticketId;
    document.getElementById("action-tkt-display").textContent = ticketId;
    document.getElementById("action-status-select").value = currentStatus;
    
    // Retrieve correct SHO name based on station dropdown
    const select = document.getElementById("sho-station-select");
    const stText = select.options[select.selectedIndex].text;
    
    let defaultSho = "Officer in Charge";
    if (stText.includes("Hazratganj")) defaultSho = "Inspector Akhilesh Singh";
    else if (stText.includes("Aliganj")) defaultSho = "Inspector Rajesh Kumar";
    else if (stText.includes("Gomti Nagar")) defaultSho = "Inspector Pramod Mishra";
    else if (stText.includes("Kalyanpur")) defaultSho = "Inspector Devendra Singh";
    else if (stText.includes("Kakadeo")) defaultSho = "Inspector Sanjay Yadav";
    else if (stText.includes("Sigra")) defaultSho = "Inspector Vinay Verma";
    else if (stText.includes("Lanka")) defaultSho = "Inspector Ashutosh Tiwari";
    else if (stText.includes("Tajganj")) defaultSho = "Inspector Shailendra Giri";
    else if (stText.includes("Hariparwat")) defaultSho = "Inspector V.K. Singh";
    
    document.getElementById("action-sho-name").value = defaultSho;
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
        const res = await fetch(`${API_BASE}/grievance/${selectedGrievanceId}/action`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sho_name: shoName,
                message: message,
                status: status
            })
        });
        
        if (!res.ok) throw new Error("Could not update grievance action log");
        
        // Refresh Table
        loadSHOGrievances();
        closeSHODrawer();
        
    } catch (err) {
        alert("Action error: " + err.message);
    }
}

// -------------------------------------------------------------
// SP DASHBOARD COMMAND CENTER
// -------------------------------------------------------------

async function loadSPDashboard() {
    const distSelect = document.getElementById("sp-district-select");
    const spamToggle = document.getElementById("sp-spam-toggle");
    if (!distSelect) return;
    
    const district = distSelect.value;
    const isSpamOnly = spamToggle.checked ? 1 : 0;
    
    try {
        // Fetch SP analytics endpoint
        const res = await fetch(`${API_BASE}/analytics?district=${district}`);
        if (!res.ok) throw new Error("Failed to load analytics");
        const data = await res.json();
        
        // If showing SPAM view, we load spam grievances separately to display in SP alert lists
        let grievancesList = [];
        if (isSpamOnly) {
            const gRes = await fetch(`${API_BASE}/grievances?district=${district}&is_spam=1`);
            grievancesList = await gRes.json();
        }
        
        // Update KPIs
        document.getElementById("kpi-total").textContent = isSpamOnly ? grievancesList.length : data.kpis.total;
        document.getElementById("kpi-pending").textContent = isSpamOnly ? grievancesList.filter(g => g.status === 'Pending').length : data.kpis.pending;
        document.getElementById("kpi-active").textContent = isSpamOnly ? 0 : data.kpis.active;
        document.getElementById("kpi-resolved").textContent = isSpamOnly ? 0 : data.kpis.resolved;
        
        const escKpi = document.getElementById("kpi-escalated");
        escKpi.textContent = isSpamOnly ? 0 : data.kpis.escalated;
        const escCard = escKpi.parentElement;
        if (data.kpis.escalated > 0 && !isSpamOnly) {
            escCard.classList.add("alert-active");
        } else {
            escCard.classList.remove("alert-active");
        }
        
        // Render Heatmap overlay map nodes
        renderMapHotspots(data.stations, isSpamOnly);
        
        // Render Category bars
        renderCategoryBreakdown(data.categories, data.kpis.total, isSpamOnly);
        
        // Render SP alert feed list
        renderSPAlertFeed(data.escalated_feed, grievancesList, isSpamOnly);
        
    } catch (e) {
        console.error("Error loading SP dashboard:", e);
    }
}

// Injects SVG nodes dynamically based on active case counts to build the Real-time Heatmap
function renderMapHotspots(stations, isSpamOnly) {
    const group = document.getElementById("map-stations-group");
    if (!group) return;
    group.innerHTML = "";
    
    stations.forEach(st => {
        // Active/total complaints determines the hotspot circle size (radius)
        const casesCount = isSpamOnly ? 0 : st.pending_cases + st.active_cases;
        const radius = 15 + Math.min(casesCount * 8, 40);
        
        // Heatmap color rating
        let glowColor = "url(#glow-green)";
        let strokeColor = "var(--accent-green)";
        
        if (st.escalated_cases > 0 && !isSpamOnly) {
            glowColor = "url(#glow-red)";
            strokeColor = "var(--accent-red)";
        } else if (casesCount >= 3) {
            glowColor = "url(#glow-orange)";
            strokeColor = "var(--accent-orange)";
        }
        
        // Node elements group
        const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nodeG.setAttribute("class", "map-node");
        nodeG.setAttribute("transform", `translate(${st.latitude * 15 - 350}, ${st.longitude * 5 - 350})`); // Mapping mock scales to fit 500x500 box
        
        // Add interactive hover details tag
        nodeG.innerHTML = `
            <circle cx="0" cy="0" r="${radius}" fill="${glowColor}" class="pulse-ring" />
            <circle cx="0" cy="0" r="8" fill="var(--navy-deep)" stroke="${strokeColor}" stroke-width="2.5" />
            <text x="0" y="24" class="map-node-label">${st.name}</text>
            <title>${st.name} Thana\nPending: ${st.pending_cases}\nActive: ${st.active_cases}\nResolved: ${st.resolved_cases}\nEscalated: ${st.escalated_cases}</title>
        `;
        
        // Clicking on a station node automatically moves SHO workspace view or filters dashboard focus
        nodeG.addEventListener("click", () => {
            const shoSelect = document.getElementById("sho-station-select");
            if (shoSelect) {
                // Find matching option and select it
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

// Draw HTML bars based on categories percentage
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

// Render SP alerting feed list
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
// SYSTEM TICK & MISC
// -------------------------------------------------------------

// System Heartbeat sends tick and refreshes active layout views without blinking
async function systemHeartbeat() {
    try {
        // Send tick to let backend check SLA escalation timer
        const tickRes = await fetch(`${API_BASE}/system/tick`, { method: "POST" });
        if (!tickRes.ok) return;
        
        // Refresh active views
        if (activeTab === "sho") {
            // Keep SHO list fresh (but only when not currently interacting with the action modal)
            if (selectedGrievanceId === null) {
                loadSHOGrievances();
            }
        } else if (activeTab === "sp") {
            loadSPDashboard();
        }
    } catch (e) {
        console.warn("Heartbeat lost. API offline.");
    }
}

// sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
