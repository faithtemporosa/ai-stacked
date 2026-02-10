from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import csv
import io
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

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
