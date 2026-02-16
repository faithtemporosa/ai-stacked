from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Query, Depends, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import csv
import io
import json
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'tiktok-commenter-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Create the main app without a prefix
app = FastAPI(title="TikTok Comments Dashboard API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configuration
GOOGLE_SHEET_ID = "1cgjxB09nXSsKMEFwNxQlDzl8xVDyQgT0o8aKm6YOJ-o"
REBOTOU_EXTENSION_ID = "cfgkjnjmlckppgajnicogfdnhhndpikk"
ADSPOWER_API_PORT = 50325

# Models
class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str  # AdsPower profile ID
    profile_name: str
    sheet_name: str  # Which sheet to use for comments (Bump Connect, Bump Syndicate, etc.)
    status: str = "idle"  # idle, running, completed, error
    last_run: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProfileCreate(BaseModel):
    profile_id: str
    profile_name: str
    sheet_name: str

class ProfileUpdate(BaseModel):
    sheet_name: Optional[str] = None
    status: Optional[str] = None

class AutomationRun(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    profile_name: str
    status: str = "pending"  # pending, running, completed, error
    comments_loaded: int = 0
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    error_message: Optional[str] = None

class Comment(BaseModel):
    text: str
    brand: str

# ==============================================================================
# PUBLIC REPORTING MODELS - For real-time team dashboard
# ==============================================================================
class CommentReport(BaseModel):
    """A single comment report from the local TikTok commenter"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str
    profile: str
    video_url: str
    video_id: str
    comment: str
    sheet: str  # Which brand (Bump Connect, Kollabsy, Bump Syndicate)
    received_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CommentReportCreate(BaseModel):
    """Input model for creating a comment report"""
    timestamp: str
    profile: str
    video_url: str
    video_id: str
    comment: str
    sheet: str

class BulkReportCreate(BaseModel):
    """For syncing multiple reports at once"""
    reports: List[CommentReportCreate]

class ReportStats(BaseModel):
    """Statistics for the dashboard"""
    total_comments: int
    today_comments: int
    week_comments: int
    unique_profiles: int
    unique_videos: int
    by_brand: Dict[str, int]

# Google Sheets Functions
async def fetch_sheet_data(sheet_name: str) -> List[Comment]:
    """Fetch comments from a specific sheet in Google Sheets"""
    # URL encode the sheet name
    encoded_sheet_name = sheet_name.replace(" ", "%20")
    url = f"https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_sheet_name}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch sheet: {sheet_name}")
        
        # Parse CSV
        content = response.text
        reader = csv.reader(io.StringIO(content))
        comments = []
        
        # Skip header row
        next(reader, None)
        
        for row in reader:
            if len(row) >= 2 and row[0].strip():
                comments.append(Comment(text=row[0].strip(), brand=row[1].strip() if row[1] else sheet_name))
        
        return comments

async def get_all_sheet_names() -> List[str]:
    """Get list of available sheet names"""
    return ["Bump Connect", "Bump Syndicate", "Kollabsy"]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "AdsPower Automation API"}

# Profiles endpoints
@api_router.get("/profiles", response_model=List[Profile])
async def get_profiles():
    profiles = await db.profiles.find({}, {"_id": 0}).to_list(100)
    return profiles

@api_router.post("/profiles", response_model=Profile)
async def create_profile(profile_data: ProfileCreate):
    profile = Profile(**profile_data.model_dump())
    doc = profile.model_dump()
    await db.profiles.insert_one(doc)
    return profile

@api_router.put("/profiles/{profile_id}")
async def update_profile(profile_id: str, update_data: ProfileUpdate):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_dict:
        await db.profiles.update_one(
            {"profile_id": profile_id},
            {"$set": update_dict}
        )
    return {"status": "updated"}

@api_router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str):
    await db.profiles.delete_one({"profile_id": profile_id})
    return {"status": "deleted"}

# Google Sheets endpoints
@api_router.get("/sheets")
async def get_sheets():
    """Get list of available sheets"""
    sheets = await get_all_sheet_names()
    return {"sheets": sheets}

@api_router.get("/sheets/{sheet_name}/comments")
async def get_sheet_comments(sheet_name: str):
    """Get comments from a specific sheet"""
    comments = await fetch_sheet_data(sheet_name)
    return {"sheet_name": sheet_name, "comments": [c.model_dump() for c in comments], "count": len(comments)}

# Automation runs endpoints
@api_router.get("/runs", response_model=List[AutomationRun])
async def get_runs():
    runs = await db.automation_runs.find({}, {"_id": 0}).sort("started_at", -1).to_list(50)
    return runs

@api_router.post("/runs")
async def create_run(profile_ids: List[str]):
    """Start automation for selected profiles"""
    runs = []
    for pid in profile_ids:
        profile = await db.profiles.find_one({"profile_id": pid}, {"_id": 0})
        if profile:
            run = AutomationRun(
                profile_id=pid,
                profile_name=profile.get("profile_name", pid)
            )
            doc = run.model_dump()
            await db.automation_runs.insert_one(doc)
            runs.append(run)
    return {"runs": [r.model_dump() for r in runs], "count": len(runs)}

@api_router.put("/runs/{run_id}/status")
async def update_run_status(run_id: str, status: str, error_message: Optional[str] = None):
    update_dict = {"status": status}
    if status == "completed" or status == "error":
        update_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
    if error_message:
        update_dict["error_message"] = error_message
    await db.automation_runs.update_one({"id": run_id}, {"$set": update_dict})
    return {"status": "updated"}

# Download standalone dashboard
@api_router.get("/download-dashboard")
async def download_dashboard():
    """Download the standalone Python dashboard app"""
    dashboard_path = Path(__file__).parent.parent / "downloads" / "adspower_dashboard.py"
    if dashboard_path.exists():
        content = dashboard_path.read_text()
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/x-python",
            headers={"Content-Disposition": "attachment; filename=adspower_dashboard.py"}
        )
    raise HTTPException(status_code=404, detail="Dashboard file not found")

# Download TikTok commenter
@api_router.get("/download-tiktok-commenter")
async def download_tiktok_commenter():
    """Download the TikTok direct commenter app"""
    commenter_path = Path(__file__).parent.parent / "downloads" / "tiktok_commenter.py"
    if commenter_path.exists():
        content = commenter_path.read_text()
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/x-python",
            headers={"Content-Disposition": "attachment; filename=tiktok_commenter.py"}
        )
    raise HTTPException(status_code=404, detail="TikTok commenter file not found")

# Script generation endpoint
@api_router.get("/generate-script")
async def generate_automation_script():
    """Generate Python script for local execution"""
    profiles = await db.profiles.find({}, {"_id": 0}).to_list(100)
    
    # Fetch comments for each unique sheet
    sheet_comments = {}
    for profile in profiles:
        sheet_name = profile.get("sheet_name", "Bump Connect")
        if sheet_name not in sheet_comments:
            try:
                comments = await fetch_sheet_data(sheet_name)
                sheet_comments[sheet_name] = [c.model_dump() for c in comments]
            except:
                sheet_comments[sheet_name] = []
    
    script = f'''#!/usr/bin/env python3
"""
AdsPower Browser Automation Script
Generated at: {datetime.now(timezone.utc).isoformat()}

Requirements:
    pip install requests playwright
    playwright install chromium

Run this script on the machine where AdsPower is installed.
"""

import requests
import time
import json
from playwright.sync_api import sync_playwright

# Configuration
ADSPOWER_API = "http://localhost:{ADSPOWER_API_PORT}"
REBOTOU_EXTENSION_ID = "{REBOTOU_EXTENSION_ID}"

# Profile configurations
PROFILES = {json.dumps(profiles, indent=4)}

# Comments by sheet
SHEET_COMMENTS = {json.dumps(sheet_comments, indent=4)}

def get_adspower_profiles():
    """Fetch all profiles from AdsPower"""
    try:
        response = requests.get(f"{{ADSPOWER_API}}/api/v1/user/list?page_size=100")
        data = response.json()
        if data.get("code") == 0:
            return data.get("data", {{}}).get("list", [])
    except Exception as e:
        print(f"Error fetching profiles: {{e}}")
    return []

def open_browser(profile_id):
    """Open AdsPower browser for a profile"""
    try:
        response = requests.get(f"{{ADSPOWER_API}}/api/v1/browser/start?user_id={{profile_id}}")
        data = response.json()
        if data.get("code") == 0:
            return data.get("data", {{}})
        else:
            print(f"Error opening browser: {{data.get('msg')}}")
    except Exception as e:
        print(f"Error: {{e}}")
    return None

def close_browser(profile_id):
    """Close AdsPower browser"""
    try:
        requests.get(f"{{ADSPOWER_API}}/api/v1/browser/stop?user_id={{profile_id}}")
    except:
        pass

def run_rebotou_automation(ws_endpoint, profile_config):
    """Connect to browser and automate Rebotou"""
    sheet_name = profile_config.get("sheet_name", "Bump Connect")
    comments = SHEET_COMMENTS.get(sheet_name, [])
    
    with sync_playwright() as p:
        # Connect to the existing browser
        browser = p.chromium.connect_over_cdp(ws_endpoint)
        
        try:
            context = browser.contexts[0]
            
            # Open Rebotou extension page
            rebotou_url = f"chrome-extension://{{REBOTOU_EXTENSION_ID}}/popup.html"
            page = context.new_page()
            page.goto(rebotou_url)
            time.sleep(2)
            
            print(f"  Rebotou opened. Comments to add: {{len(comments)}}")
            
            # TODO: Add logic to interact with Rebotou interface
            # This depends on Rebotou's DOM structure
            # For now, we click Run All if visible
            
            try:
                # Look for Run All button
                run_all_btn = page.locator('button:has-text("Run All"), [class*="run"]')
                if run_all_btn.count() > 0:
                    run_all_btn.first.click()
                    print("  Clicked Run All")
                    time.sleep(5)
            except Exception as e:
                print(f"  Could not find Run All button: {{e}}")
            
            page.close()
            
        except Exception as e:
            print(f"  Error during automation: {{e}}")
        finally:
            browser.close()

def main():
    print("=" * 50)
    print("AdsPower Rebotou Automation")
    print("=" * 50)
    
    if not PROFILES:
        print("No profiles configured. Please add profiles in the dashboard.")
        return
    
    print(f"\\nProfiles to process: {{len(PROFILES)}}")
    
    for i, profile in enumerate(PROFILES, 1):
        profile_id = profile.get("profile_id")
        profile_name = profile.get("profile_name", profile_id)
        
        print(f"\\n[{{i}}/{{len(PROFILES)}}] Processing: {{profile_name}}")
        
        # Open browser
        browser_data = open_browser(profile_id)
        if not browser_data:
            print(f"  Failed to open browser for {{profile_name}}")
            continue
        
        ws_endpoint = browser_data.get("ws", {{}}).get("puppeteer")
        if not ws_endpoint:
            print(f"  No WebSocket endpoint for {{profile_name}}")
            close_browser(profile_id)
            continue
        
        print(f"  Browser opened. WebSocket: {{ws_endpoint[:50]}}...")
        
        try:
            run_rebotou_automation(ws_endpoint, profile)
            print(f"  Completed: {{profile_name}}")
        except Exception as e:
            print(f"  Error: {{e}}")
        
        # Close browser
        close_browser(profile_id)
        print(f"  Browser closed")
        
        # Wait before next profile
        if i < len(PROFILES):
            print("  Waiting 5 seconds before next profile...")
            time.sleep(5)
    
    print("\\n" + "=" * 50)
    print("Automation completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()
'''
    
    return StreamingResponse(
        io.BytesIO(script.encode()),
        media_type="text/x-python",
        headers={"Content-Disposition": "attachment; filename=adspower_automation.py"}
    )

# Configuration endpoint
@api_router.get("/config")
async def get_config():
    return {
        "google_sheet_id": GOOGLE_SHEET_ID,
        "rebotou_extension_id": REBOTOU_EXTENSION_ID,
        "adspower_api_port": ADSPOWER_API_PORT
    }

@api_router.put("/config")
async def update_config(
    google_sheet_id: Optional[str] = None,
    rebotou_extension_id: Optional[str] = None,
    adspower_api_port: Optional[int] = None
):
    # Store config in database for persistence
    config = {}
    if google_sheet_id:
        config["google_sheet_id"] = google_sheet_id
    if rebotou_extension_id:
        config["rebotou_extension_id"] = rebotou_extension_id
    if adspower_api_port:
        config["adspower_api_port"] = adspower_api_port
    
    if config:
        await db.config.update_one({}, {"$set": config}, upsert=True)
    
    return {"status": "updated", "config": config}

# ==============================================================================
# PUBLIC REPORTING ENDPOINTS - For real-time team dashboard
# ==============================================================================

@api_router.post("/reports")
async def receive_report(report: CommentReportCreate):
    """
    Receive a single comment report from the local TikTok commenter script.
    Called by tiktok_commenter.py when a comment is successfully posted.
    """
    try:
        # Create the report document
        report_doc = CommentReport(**report.model_dump())
        doc = report_doc.model_dump()
        
        # Insert into MongoDB
        await db.comment_reports.insert_one(doc)
        
        logger.info(f"Received comment report: {report.profile} - {report.comment[:30]}...")
        return {"status": "success", "id": report_doc.id}
    except Exception as e:
        logger.error(f"Error saving report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/reports/bulk")
async def receive_bulk_reports(data: BulkReportCreate):
    """
    Receive multiple comment reports at once.
    Useful for syncing historical data or batch updates.
    """
    try:
        inserted_count = 0
        for report in data.reports:
            report_doc = CommentReport(**report.model_dump())
            doc = report_doc.model_dump()
            await db.comment_reports.insert_one(doc)
            inserted_count += 1
        
        logger.info(f"Received {inserted_count} bulk reports")
        return {"status": "success", "inserted": inserted_count}
    except Exception as e:
        logger.error(f"Error saving bulk reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reports")
async def get_reports(
    filter: Optional[str] = Query(None, description="Filter: today, week, month, all"),
    profile: Optional[str] = Query(None, description="Filter by profile name"),
    sheet: Optional[str] = Query(None, description="Filter by brand/sheet"),
    limit: int = Query(500, ge=1, le=2000),
    skip: int = Query(0, ge=0)
):
    """
    Get comment reports for the public dashboard.
    Supports filtering by date range, profile, and brand.
    """
    try:
        # Build query
        query = {}
        
        # Date filter
        now = datetime.now(timezone.utc)
        if filter == "today":
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query["timestamp"] = {"$gte": today_start.strftime("%Y-%m-%d")}
        elif filter == "week":
            week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
            query["timestamp"] = {"$gte": week_ago}
        elif filter == "month":
            month_ago = (now - timedelta(days=30)).strftime("%Y-%m-%d")
            query["timestamp"] = {"$gte": month_ago}
        
        # Profile filter
        if profile:
            query["profile"] = {"$regex": profile, "$options": "i"}
        
        # Brand/sheet filter
        if sheet:
            query["sheet"] = sheet
        
        # Fetch reports
        reports = await db.comment_reports.find(
            query, 
            {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        
        # Get total count
        total = await db.comment_reports.count_documents(query)
        
        return {
            "reports": reports,
            "total": total,
            "limit": limit,
            "skip": skip,
            "filter": filter or "all"
        }
    except Exception as e:
        logger.error(f"Error fetching reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reports/stats")
async def get_report_stats():
    """
    Get statistics for the dashboard overview.
    Returns total comments, today's count, unique profiles, etc.
    """
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d")
        week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Total comments
        total_comments = await db.comment_reports.count_documents({})
        
        # Today's comments
        today_comments = await db.comment_reports.count_documents({
            "timestamp": {"$gte": today_start}
        })
        
        # This week's comments
        week_comments = await db.comment_reports.count_documents({
            "timestamp": {"$gte": week_ago}
        })
        
        # Unique profiles
        unique_profiles = await db.comment_reports.distinct("profile")
        
        # Unique videos
        unique_videos = await db.comment_reports.distinct("video_id")
        
        # By brand
        pipeline = [
            {"$group": {"_id": "$sheet", "count": {"$sum": 1}}}
        ]
        brand_counts = await db.comment_reports.aggregate(pipeline).to_list(10)
        by_brand = {item["_id"]: item["count"] for item in brand_counts if item["_id"]}
        
        return ReportStats(
            total_comments=total_comments,
            today_comments=today_comments,
            week_comments=week_comments,
            unique_profiles=len(unique_profiles),
            unique_videos=len(unique_videos),
            by_brand=by_brand
        )
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/reports")
async def clear_reports():
    """
    Clear all reports (admin function).
    """
    try:
        result = await db.comment_reports.delete_many({})
        return {"status": "cleared", "deleted_count": result.deleted_count}
    except Exception as e:
        logger.error(f"Error clearing reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/reports/import")
async def import_reports_from_file(data: dict):
    """
    Import reports from the local tiktok_comments_history.json file format.
    Accepts the JSON structure: {"report": [...], "last_updated": "..."}
    """
    try:
        reports = data.get("report", [])
        if not reports:
            raise HTTPException(status_code=400, detail="No reports found in data")
        
        inserted_count = 0
        skipped_count = 0
        
        for report in reports:
            # Check if this report already exists (by timestamp + profile + video_id)
            existing = await db.comment_reports.find_one({
                "timestamp": report.get("timestamp"),
                "profile": report.get("profile"),
                "video_id": report.get("video_id")
            })
            
            if existing:
                skipped_count += 1
                continue
            
            # Create report document
            report_doc = CommentReport(
                timestamp=report.get("timestamp", ""),
                profile=report.get("profile", "Unknown"),
                video_url=report.get("video_url", ""),
                video_id=report.get("video_id", str(uuid.uuid4())),
                comment=report.get("comment", ""),
                sheet=report.get("sheet", "Unknown")
            )
            
            await db.comment_reports.insert_one(report_doc.model_dump())
            inserted_count += 1
        
        logger.info(f"Imported {inserted_count} reports, skipped {skipped_count} duplicates")
        return {
            "status": "success",
            "inserted": inserted_count,
            "skipped": skipped_count,
            "total_in_file": len(reports)
        }
    except Exception as e:
        logger.error(f"Error importing reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# LIVE LOGS ENDPOINTS - Stream logs from local script to cloud dashboard
# ==============================================================================

class LogEntry(BaseModel):
    timestamp: str
    message: str
    level: str = "info"  # info, success, error, warning

class LogBatch(BaseModel):
    logs: List[LogEntry]
    status: dict = {}  # Current automation status

@api_router.post("/logs")
async def receive_logs(data: LogBatch):
    """
    Receive logs from the local TikTok commenter script.
    Stores the latest logs and status in the database.
    """
    try:
        # Store logs (keep only last 200)
        log_doc = {
            "type": "live_logs",
            "logs": [log.model_dump() for log in data.logs[-200:]],
            "status": data.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.live_logs.update_one(
            {"type": "live_logs"},
            {"$set": log_doc},
            upsert=True
        )
        
        return {"status": "success", "received": len(data.logs)}
    except Exception as e:
        logger.error(f"Error receiving logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/logs")
async def get_logs():
    """
    Get the latest logs for the dashboard.
    """
    try:
        log_doc = await db.live_logs.find_one({"type": "live_logs"}, {"_id": 0})
        
        if not log_doc:
            return {
                "logs": [],
                "status": {
                    "running": False,
                    "current_profile": None,
                    "progress": 0,
                    "total": 0,
                    "comments_posted": 0
                },
                "updated_at": None
            }
        
        return {
            "logs": log_doc.get("logs", []),
            "status": log_doc.get("status", {}),
            "updated_at": log_doc.get("updated_at")
        }
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/logs")
async def clear_logs():
    """Clear all logs."""
    try:
        await db.live_logs.delete_many({"type": "live_logs"})
        return {"status": "cleared"}
    except Exception as e:
        logger.error(f"Error clearing logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
