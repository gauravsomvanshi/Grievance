# AI-Based Public Grievance Redressal System (UP Police AI-PGRS)

This project is an advanced AI-powered Public Grievance Redressal System (PGRS) custom-designed for the **Uttar Pradesh Police (UP Police)**. It serves as an intelligent, modernized overlay for traditional systems like the IGRS or Jan Sunwai Portal, incorporating smart routing, automated escalation, and crime hotspot predictive modeling.

## Core Features

1.  **Citizen Desk (नागरिक डेस्क)**: Citizens can file grievances in **Hindi (हिन्दी)**, **English**, or **Hinglish**. The built-in AI NLP Engine:
    *   Detects language/dialect automatically.
    *   Classifies the crime category (Cyber Fraud, Women Safety, Land Dispute, Theft, Assault).
    *   Extracts location details and matches it to the correct local Police Station (Thana).
    *   Computes an Urgency Score (1-10) and Sentiment.
    *   Generates a secure CCTNS-compatible Ticket ID.
2.  **SHO Desk (थानाध्यक्ष वर्कस्टेशन)**: Allows the Inspector/Station House Officer to see incoming grievances routed to their station in real time.
    *   Features a live ticking SLA countdown timer.
    *   Provides status updates (e.g., Pending ➔ Under Investigation ➔ Resolved) and diary logs.
3.  **District SP Dashboard (पुलिस अधीक्षक कमांड)**: Renders predictive analytics for District Commanders:
    *   **Interactive Crime Hotmap Overlay**: Dynamically renders glowing hotspot nodes over a district map representing complaint volumes per station.
    *   **Critical Alerts Feed**: Shows auto-escalated issues that breached the SLA timeframe (set to 1 minute for demonstration).
    *   **Fake / Spam Filter**: Demonstrates AI sorting out automated marketing spam and duplicate complaints to save investigative time.

---

## Technical Stack

*   **Backend**: Python, FastAPI, SQLite (CCTNS mock database)
*   **NLP Processing**: Multilingual Dialect Keyword Engine (`nlp_engine.py`)
*   **Frontend**: Responsive Single-Page Application (SPA) designed using Google Fonts (Outfit), CSS Glassmorphism, CSS Custom bar graphs, and SVG Map layers.

---

## Folder Structure

```text
Grievance/
├── backend/
│   ├── tests/
│   │   └── test_nlp.py       # Automated test suite
│   ├── cctns_mock.db         # Auto-generated SQLite Database
│   ├── db.py                 # SQLite configuration & pre-seeded records
│   ├── main.py               # FastAPI application server
│   └── nlp_engine.py         # Bilingual NLP parser module
├── app.js                    # Frontend SPA controller and SLA monitors (Dual-Mode: Local API & Offline Mock)
├── index.html                # Citizen & Commander portals structure (GitHub Pages Entry Point)
├── styles.css                # Dark mode glassmorphism UI styles
└── README.md                 # Setup instructions
```

---

## Getting Started

### Prerequisites

Ensure you have **Python 3.8+** installed on your system if you wish to run the local backend server. (Note: If you do not run the Python server, the system automatically detects this and runs in **Offline Demo Mode** using local browser storage).

### 1. Setup Backend & Run Server (Optional)

First, install the required dependencies:
```bash
pip install fastapi uvicorn pydantic
```

Navigate to the `backend/` directory and run the initialization script to seed the CCTNS mock database:
```bash
python backend/db.py
```
This will create `cctns_mock.db` pre-populated with active station parameters (Lucknow Hazratganj, Kanpur Kalyanpur, Varanasi Sigra, Agra Tajganj) and mock complaints.

Start the FastAPI application server:
```bash
python -m uvicorn backend.main:app --reload
```
The backend API server will run at `http://127.0.0.1:8000`.

### 2. Launch the Frontend UI

Since the frontend is built using standard static assets, you can launch it in one of two ways:

*   **Option A**: Simply double-click and open `index.html` in the root folder of the project in any web browser.
*   **Option B**: Start a simple HTTP server from the project directory:
    ```bash
    python -m http.server 8080
    ```
    Then navigate to `http://localhost:8080/` in your browser.

---

## Running Automated Verification

To run the automated NLP classification unit tests, execute:
```bash
python backend/tests/test_nlp.py
```
This verifies:
*   Language classification (Hindi, English, Hinglish).
*   Correct police station and district extraction.
*   Spam filter capabilities.
