from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import json
import random
from datetime import datetime, timedelta
import os

from db import init_db, get_db_connection
from nlp_engine import parse_grievance

app = FastAPI(title="UP Police AI Grievance Redressal System API")

# Setup CORS for frontend to interact with API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

class GrievanceSubmission(BaseModel):
    text: str
    custom_district: Optional[str] = None  # Optional user override
    custom_station: Optional[str] = None   # Optional user override
    sp_office: Optional[str] = None
    circle_office: Optional[str] = None
    public_image: Optional[str] = None

class ActionUpdate(BaseModel):
    sho_name: str
    message: str
    status: str  # Pending, Under Investigation, Resolved

class IOAllotment(BaseModel):
    allotted_io: str
    sho_name: str

class InvestigationReportSubmission(BaseModel):
    investigation_report: str
    investigation_image: Optional[str] = None
    io_name: str
    status: str

class UserSignup(BaseModel):
    username: str
    password: str
    full_name: str
    phone: str
    aadhaar: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

def check_sla_escalations():
    """
    Checks for any pending grievances that have breached their SLA (1 minute for demo)
    and updates their escalation status.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Select pending grievances that have not been escalated yet but are past their escalation time
    cursor.execute("""
        SELECT ticket_id, action_diary FROM grievances 
        WHERE status = 'Pending' AND escalated = 0 AND is_spam = 0 AND escalation_time <= ?
    """, (now_str,))
    
    breached_tickets = cursor.fetchall()
    
    for row in breached_tickets:
        ticket_id = row["ticket_id"]
        diary = json.loads(row["action_diary"])
        
        diary.append({
            "time": now_str,
            "message": "⚠️ SLA BREACH WARNING: Action not initiated within SLA. Grievance escalated to District SP dashboard."
        })
        
        cursor.execute("""
            UPDATE grievances 
            SET escalated = 1, action_diary = ?
            WHERE ticket_id = ?
        """, (json.dumps(diary), ticket_id))
        
    conn.commit()
    conn.close()

@app.post("/api/auth/signup")
def auth_signup(user: UserSignup):
    username = user.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    
    # Aadhaar must be 12 digits
    aadhaar_cleaned = "".join(filter(str.isdigit, user.aadhaar))
    if len(aadhaar_cleaned) != 12:
        raise HTTPException(status_code=400, detail="Aadhaar Card Number must be exactly 12 digits")
        
    # Phone must be 10 digits
    phone_cleaned = "".join(filter(str.isdigit, user.phone))
    if len(phone_cleaned) != 10:
        raise HTTPException(status_code=400, detail="Phone Number must be exactly 10 digits")
        
    import hashlib
    password_hash = hashlib.sha256(user.password.encode()).hexdigest()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if username already exists
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already registered")
        
    try:
        cursor.execute("""
            INSERT INTO users (username, password_hash, full_name, phone, aadhaar, email, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (username, password_hash, user.full_name, phone_cleaned, aadhaar_cleaned, user.email, created_at))
        conn.commit()
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    conn.close()
    return {"status": "success", "message": "User registered successfully"}

@app.post("/api/auth/login")
def auth_login(credentials: UserLogin):
    username = credentials.username.strip()
    
    import hashlib
    password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT username, full_name, phone, aadhaar, email 
        FROM users 
        WHERE username = ? AND password_hash = ?
    """, (username, password_hash))
    user_row = cursor.fetchone()
    conn.close()
    
    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    return {
        "status": "success",
        "user": {
            "username": user_row["username"],
            "full_name": user_row["full_name"],
            "phone": user_row["phone"],
            "aadhaar": user_row["aadhaar"],
            "email": user_row["email"]
        }
    }

@app.post("/api/grievance/submit")
def submit_grievance(submission: GrievanceSubmission):
    if not submission.text.strip():
        raise HTTPException(status_code=400, detail="Complaint text cannot be empty.")
        
    # Analyze text with AI NLP Engine
    analysis = parse_grievance(submission.text)
    
    # Support manual overrides from frontend, otherwise use AI prediction
    district = submission.custom_district if submission.custom_district else analysis["district"]
    station_name = submission.custom_station if submission.custom_station else analysis["assigned_station"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Retrieve assigned station details from DB
    cursor.execute("SELECT id FROM police_stations WHERE name = ? AND district = ?", (station_name, district))
    station_row = cursor.fetchone()
    
    station_id = None
    if station_row:
        station_id = station_row["id"]
    else:
        # Fallback to general station if mapping fails
        cursor.execute("SELECT id FROM police_stations WHERE district = ? LIMIT 1", (district,))
        fallback_row = cursor.fetchone()
        if fallback_row:
            station_id = fallback_row["id"]
            
    # Generate unique ticket ID: TKT-YYYYMMDD-RAND4
    now = datetime.now()
    ticket_id = f"TKT-{now.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    
    # SLA duration: 1 minute for demo purposes, 24 hours in real life
    escalation_time = (now + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
    created_at_str = now.strftime("%Y-%m-%d %H:%M:%S")
    
    # Initialize Action Diary log
    action_diary = [{
        "time": created_at_str,
        "message": f"Grievance filed. Language detected: {analysis['language']}. Routed to station: {station_name} under category '{analysis['category']}'."
    }]
    
    if analysis["is_spam"]:
        action_diary.append({
            "time": created_at_str,
            "message": "System alert: Flagged as potential Spam/Fake. Routed to spam queue."
        })
        status = "Pending"
    else:
        status = "Pending"
        
    sp_office = submission.sp_office if submission.sp_office else f"{district} SP Office"
    circle_office = submission.circle_office if submission.circle_office else f"{station_name} Circle"

    try:
        cursor.execute("""
            INSERT INTO grievances (
                ticket_id, text, language, category, urgency_score, sentiment,
                district, assigned_station_id, status, is_spam, action_diary,
                created_at, escalated, escalation_time, sp_office, circle_office, public_image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ticket_id, submission.text, analysis["language"], analysis["category"],
            analysis["urgency_score"], analysis["sentiment"], district, station_id,
            status, 1 if analysis["is_spam"] else 0, json.dumps(action_diary),
            created_at_str, 0, escalation_time, sp_office, circle_office, submission.public_image
        ))
        conn.commit()
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    conn.close()
    
    return {
        "ticket_id": ticket_id,
        "category": analysis["category"],
        "assigned_station": station_name,
        "urgency_score": analysis["urgency_score"],
        "sentiment": analysis["sentiment"],
        "language": analysis["language"],
        "status": status,
        "is_spam": analysis["is_spam"],
        "created_at": created_at_str,
        "sp_office": sp_office,
        "circle_office": circle_office,
        "public_image": submission.public_image
    }


@app.get("/api/grievances")
def get_grievances(
    district: str = None,
    station_id: int = None,
    status: str = None,
    is_spam: int = 0,
    allotted_io: str = None
):
    check_sla_escalations()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT g.*, p.name as station_name, p.sho_name, p.phone as station_phone 
        FROM grievances g
        LEFT JOIN police_stations p ON g.assigned_station_id = p.id
        WHERE g.is_spam = ?
    """
    params = [is_spam]
    
    if district:
        query += " AND g.district = ?"
        params.append(district)
    if station_id:
        query += " AND g.assigned_station_id = ?"
        params.append(station_id)
    if status:
        query += " AND g.status = ?"
        params.append(status)
    if allotted_io:
        query += " AND g.allotted_io = ?"
        params.append(allotted_io)
        
    query += " ORDER BY g.created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    results = []
    for r in rows:
        results.append({
            "ticket_id": r["ticket_id"],
            "text": r["text"],
            "language": r["language"],
            "category": r["category"],
            "urgency_score": r["urgency_score"],
            "sentiment": r["sentiment"],
            "district": r["district"],
            "assigned_station_id": r["assigned_station_id"],
            "station_name": r["station_name"],
            "sho_name": r["sho_name"],
            "station_phone": r["station_phone"],
            "status": r["status"],
            "is_spam": bool(r["is_spam"]),
            "action_diary": json.loads(r["action_diary"]),
            "created_at": r["created_at"],
            "escalated": bool(r["escalated"]),
            "escalation_time": r["escalation_time"],
            "sp_office": r["sp_office"],
            "circle_office": r["circle_office"],
            "public_image": r["public_image"],
            "allotted_io": r["allotted_io"],
            "investigation_report": r["investigation_report"],
            "investigation_image": r["investigation_image"]
        })
        
    conn.close()
    return results

@app.get("/api/grievance/{ticket_id}")
def get_grievance_details(ticket_id: str):
    check_sla_escalations()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT g.*, p.name as station_name, p.sho_name, p.phone as station_phone 
        FROM grievances g
        LEFT JOIN police_stations p ON g.assigned_station_id = p.id
        WHERE g.ticket_id = ?
    """, (ticket_id,))
    
    r = cursor.fetchone()
    conn.close()
    
    if not r:
        raise HTTPException(status_code=404, detail="Grievance ticket not found.")
        
    return {
        "ticket_id": r["ticket_id"],
        "text": r["text"],
        "language": r["language"],
        "category": r["category"],
        "urgency_score": r["urgency_score"],
        "sentiment": r["sentiment"],
        "district": r["district"],
        "assigned_station_id": r["assigned_station_id"],
        "station_name": r["station_name"],
        "sho_name": r["sho_name"],
        "station_phone": r["station_phone"],
        "status": r["status"],
        "is_spam": bool(r["is_spam"]),
        "action_diary": json.loads(r["action_diary"]),
        "created_at": r["created_at"],
        "escalated": bool(r["escalated"]),
        "escalation_time": r["escalation_time"],
        "sp_office": r["sp_office"],
        "circle_office": r["circle_office"],
        "public_image": r["public_image"],
        "allotted_io": r["allotted_io"],
        "investigation_report": r["investigation_report"],
        "investigation_image": r["investigation_image"]
    }


@app.put("/api/grievance/{ticket_id}/action")
def update_grievance_action(ticket_id: str, action: ActionUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT action_diary, status FROM grievances WHERE ticket_id = ?", (ticket_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Grievance ticket not found.")
        
    diary = json.loads(row["action_diary"])
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    diary.append({
        "time": now_str,
        "message": f"[{action.sho_name}] {action.message}"
    })
    
    # If moving from Pending to Under Investigation or Resolved, escalation is resolved or avoided
    # (If already escalated, we keep escalated flag, but it's no longer 'Pending')
    cursor.execute("""
        UPDATE grievances 
        SET status = ?, action_diary = ?
        WHERE ticket_id = ?
    """, (action.status, json.dumps(diary), ticket_id))
    
    conn.commit()
    conn.close()
    
    return {"message": "Action diary and status updated successfully."}

@app.put("/api/grievance/{ticket_id}/allot")
def allot_grievance_io(ticket_id: str, allotment: IOAllotment):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT action_diary FROM grievances WHERE ticket_id = ?", (ticket_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Grievance ticket not found.")
        
    diary = json.loads(row["action_diary"])
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    diary.append({
        "time": now_str,
        "message": f"[SHO {allotment.sho_name}] Allotted to IO {allotment.allotted_io} for investigation."
    })
    
    cursor.execute("""
        UPDATE grievances 
        SET allotted_io = ?, status = 'Under Investigation', action_diary = ?
        WHERE ticket_id = ?
    """, (allotment.allotted_io, json.dumps(diary), ticket_id))
    
    conn.commit()
    conn.close()
    
    return {"message": "IO allotted and status updated successfully."}

@app.put("/api/grievance/{ticket_id}/report")
def submit_investigation_report(ticket_id: str, report: InvestigationReportSubmission):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT action_diary FROM grievances WHERE ticket_id = ?", (ticket_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Grievance ticket not found.")
        
    diary = json.loads(row["action_diary"])
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    diary.append({
        "time": now_str,
        "message": f"[IO {report.io_name}] Filed investigation report. Status: {report.status}."
    })
    
    cursor.execute("""
        UPDATE grievances 
        SET investigation_report = ?, investigation_image = ?, status = ?, action_diary = ?
        WHERE ticket_id = ?
    """, (report.investigation_report, report.investigation_image, report.status, json.dumps(diary), ticket_id))
    
    conn.commit()
    conn.close()
    
    return {"message": "Investigation report submitted successfully."}

@app.get("/api/stations")
def get_stations(district: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM police_stations"
    params = []
    if district:
        query += " WHERE district = ?"
        params.append(district)
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.get("/api/analytics")
def get_analytics(district: str = "Lucknow"):
    check_sla_escalations()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Total KPI counters (Filtered by district if requested)
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Pending' AND is_spam = 0 THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'Under Investigation' AND is_spam = 0 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'Resolved' AND is_spam = 0 THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN is_spam = 1 THEN 1 ELSE 0 END) as spam,
            SUM(CASE WHEN escalated = 1 AND status = 'Pending' AND is_spam = 0 THEN 1 ELSE 0 END) as escalated
        FROM grievances
        WHERE district = ?
    """, (district,))
    kpis = dict(cursor.fetchone())
    
    # 2. Case Categories breakdown
    cursor.execute("""
        SELECT category, COUNT(*) as count 
        FROM grievances 
        WHERE district = ? AND is_spam = 0
        GROUP BY category
    """, (district,))
    categories = {r["category"]: r["count"] for r in cursor.fetchall()}
    
    # 3. Escalated alert feed (top 10 urgent/escalated issues)
    cursor.execute("""
        SELECT g.ticket_id, g.text, g.category, g.urgency_score, g.created_at, p.name as station_name
        FROM grievances g
        LEFT JOIN police_stations p ON g.assigned_station_id = p.id
        WHERE g.district = ? AND g.escalated = 1 AND g.status = 'Pending' AND g.is_spam = 0
        ORDER BY g.urgency_score DESC, g.created_at DESC
        LIMIT 10
    """, (district,))
    escalated_list = [dict(r) for r in cursor.fetchall()]
    
    # 4. Station performance and heatmaps (Coordinates + status breakdown)
    cursor.execute("""
        SELECT 
            p.id, p.name, p.latitude, p.longitude, p.sho_name, p.phone,
            COUNT(g.ticket_id) as total_cases,
            SUM(CASE WHEN g.status = 'Pending' AND g.is_spam = 0 THEN 1 ELSE 0 END) as pending_cases,
            SUM(CASE WHEN g.status = 'Under Investigation' AND g.is_spam = 0 THEN 1 ELSE 0 END) as active_cases,
            SUM(CASE WHEN g.status = 'Resolved' AND g.is_spam = 0 THEN 1 ELSE 0 END) as resolved_cases,
            SUM(CASE WHEN g.escalated = 1 AND g.status = 'Pending' AND g.is_spam = 0 THEN 1 ELSE 0 END) as escalated_cases
        FROM police_stations p
        LEFT JOIN grievances g ON p.id = g.assigned_station_id
        WHERE p.district = ?
        GROUP BY p.id
    """, (district,))
    stations_data = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    
    return {
        "kpis": kpis,
        "categories": categories,
        "escalated_feed": escalated_list,
        "stations": stations_data
    }

@app.post("/api/system/tick")
def system_tick():
    """
    Force check for SLA breaches (triggered by frontend timer to keep UI reactive)
    """
    check_sla_escalations()
    return {"status": "ok", "message": "Checked SLA escalations."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
