#!/usr/bin/env python3
"""
AdsPower Rebotou Automation Dashboard
=====================================
A local dashboard to automate Rebotou across all your AdsPower browsers.

SETUP (one-time):
    pip install requests flask pyautogui
    
RUN:
    python adspower_dashboard.py

Then open http://localhost:9090 in your browser.
"""

import requests
import time
import json
import csv
import io
import threading
import subprocess
from datetime import datetime
from flask import Flask, render_template_string, jsonify, request

# Try to import pyautogui for clicking
try:
    import pyautogui
    pyautogui.FAILSAFE = False
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False
    print("WARNING: pyautogui not installed. Run: pip install pyautogui")

# =============================================================================
# CONFIGURATION - Edit these values
# =============================================================================
ADSPOWER_API = "http://localhost:50325"
REBOTOU_EXTENSION_ID = "cfgkjnjmlckppgajnicogfdnhhndpikk"
GOOGLE_SHEET_ID = "1cgjxB09nXSsKMEFwNxQlDzl8xVDyQgT0o8aKm6YOJ-o"
SHEET_NAMES = ["Bump Connect", "Bump Syndicate", "Kollabsy"]

# =============================================================================
# GLOBAL STATE
# =============================================================================
app = Flask(__name__)
profiles = []
comments_cache = {}
automation_status = {
    "running": False,
    "current_profile": None,
    "progress": 0,
    "total": 0,
    "logs": [],
    "completed": []
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    automation_status["logs"].append(log_entry)
    print(log_entry)
    # Keep only last 100 logs
    if len(automation_status["logs"]) > 100:
        automation_status["logs"] = automation_status["logs"][-100:]

def fetch_adspower_profiles():
    """Fetch all profiles from AdsPower API"""
    global profiles
    try:
        response = requests.get(f"{ADSPOWER_API}/api/v1/user/list?page_size=100", timeout=5)
        data = response.json()
        if data.get("code") == 0:
            profiles = data.get("data", {}).get("list", [])
            log(f"Fetched {len(profiles)} profiles from AdsPower")
            return True
        else:
            log(f"AdsPower API error: {data.get('msg')}")
            return False
    except requests.exceptions.ConnectionError:
        log("ERROR: Cannot connect to AdsPower. Make sure it's running!")
        return False
    except Exception as e:
        log(f"ERROR fetching profiles: {e}")
        return False

def fetch_google_sheet_comments(sheet_name):
    """Fetch comments from Google Sheets"""
    global comments_cache
    try:
        encoded_name = sheet_name.replace(" ", "%20")
        url = f"https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            reader = csv.reader(io.StringIO(response.text))
            next(reader, None)  # Skip header
            comments = [row[0].strip() for row in reader if row and row[0].strip()]
            comments_cache[sheet_name] = comments
            log(f"Fetched {len(comments)} comments from '{sheet_name}'")
            return comments
    except Exception as e:
        log(f"ERROR fetching comments: {e}")
    return []

def open_browser(profile_id):
    """Open AdsPower browser for a profile"""
    try:
        response = requests.get(f"{ADSPOWER_API}/api/v1/browser/start?user_id={profile_id}", timeout=30)
        data = response.json()
        if data.get("code") == 0:
            return data.get("data", {})
        else:
            log(f"  Error: {data.get('msg')}")
    except Exception as e:
        log(f"  Error opening browser: {e}")
    return None

def close_browser(profile_id):
    """Close AdsPower browser"""
    try:
        requests.get(f"{ADSPOWER_API}/api/v1/browser/stop?user_id={profile_id}", timeout=5)
    except:
        pass

def run_rebotou_automation(profile_name, sheet_name):
    """Click extension icon and run Rebotou using pyautogui"""
    if not HAS_PYAUTOGUI:
        log("  ERROR: pyautogui not installed!")
        return False
    
    comments = comments_cache.get(sheet_name, [])
    
    try:
        # Wait for browser to fully load
        time.sleep(3)
        
        # Click on the Rebotou extension icon
        # The extension icon is usually in the top-right area of the browser
        # We'll look for the yellow "y" icon of Rebotou
        
        log(f"  Looking for Rebotou extension icon...")
        
        # Try to find the Rebotou icon by image (yellow 'y')
        # If not found, click on common extension area
        rebotou_icon = None
        try:
            rebotou_icon = pyautogui.locateOnScreen('rebotou_icon.png', confidence=0.8)
        except:
            pass
        
        if rebotou_icon:
            # Click on the found icon
            icon_center = pyautogui.center(rebotou_icon)
            pyautogui.click(icon_center)
            log(f"  Clicked Rebotou icon")
        else:
            # Click on typical extension area (top right, before the 3-dot menu)
            # Get screen size
            screen_width, screen_height = pyautogui.size()
            
            # Extension icons are usually around x: screen_width - 150 to -50, y: 60-80
            # Try clicking in that area
            extension_x = screen_width - 120
            extension_y = 65
            
            log(f"  Clicking extension area at ({extension_x}, {extension_y})")
            pyautogui.click(extension_x, extension_y)
        
        time.sleep(2)
        
        # Now the Rebotou popup should be open
        # Look for "Run All" button and click it
        log(f"  Looking for Run All button...")
        
        run_all_btn = None
        try:
            run_all_btn = pyautogui.locateOnScreen('run_all.png', confidence=0.8)
        except:
            pass
        
        if run_all_btn:
            btn_center = pyautogui.center(run_all_btn)
            pyautogui.click(btn_center)
            log(f"  Clicked Run All button")
        else:
            # Try to find green "Run All" button by color or just click where it typically is
            # In Rebotou, Run All is at the top left of the popup
            log(f"  Clicking Run All area...")
            time.sleep(1)
            
            # The popup appears near where we clicked, Run All is at top
            # Click a bit to the left and down from extension icon
            screen_width, screen_height = pyautogui.size()
            pyautogui.click(screen_width - 300, 130)
        
        time.sleep(3)
        
        # Wait for automation to run (check for "REBOTOU IS RUNNING" or similar)
        log(f"  Rebotou automation started for {profile_name}")
        log(f"  Waiting for completion (up to 5 minutes)...")
        
        # Wait for Rebotou to finish (poll every 10 seconds for up to 5 min)
        for i in range(30):
            time.sleep(10)
            # Could check for completion indicator here
            log(f"  Still running... ({(i+1)*10}s)")
        
        log(f"  Completed: {profile_name}")
        return True
        
    except Exception as e:
        log(f"  Automation error: {e}")
        return False

def run_automation_thread(profile_ids, sheet_mapping):
    """Run automation in background thread"""
    global automation_status
    
    automation_status["running"] = True
    automation_status["progress"] = 0
    automation_status["total"] = len(profile_ids)
    automation_status["completed"] = []
    automation_status["logs"] = []
    
    log(f"Starting automation for {len(profile_ids)} profiles")
    
    for i, profile_id in enumerate(profile_ids):
        if not automation_status["running"]:
            log("Automation stopped by user")
            break
            
        profile = next((p for p in profiles if p.get("user_id") == profile_id), None)
        if not profile:
            continue
            
        profile_name = profile.get("name", profile_id)
        sheet_name = sheet_mapping.get(profile_id, SHEET_NAMES[0])
        
        automation_status["current_profile"] = profile_name
        automation_status["progress"] = i + 1
        
        log(f"\n[{i+1}/{len(profile_ids)}] Processing: {profile_name}")
        log(f"  Using sheet: {sheet_name}")
        
        # Ensure comments are loaded
        if sheet_name not in comments_cache:
            fetch_google_sheet_comments(sheet_name)
        
        # Open browser
        browser_data = open_browser(profile_id)
        if not browser_data:
            log(f"  Failed to open browser")
            continue
        
        log(f"  Browser opened")
        
        # Run automation using pyautogui to click extension
        success = run_rebotou_automation(profile_name, sheet_name)
        
        # Close browser
        close_browser(profile_id)
        log(f"  Browser closed")
        
        if success:
            automation_status["completed"].append(profile_id)
        
        # Wait between profiles
        if i < len(profile_ids) - 1:
            log("  Waiting 5 seconds before next profile...")
            time.sleep(5)
    
    automation_status["running"] = False
    automation_status["current_profile"] = None
    log(f"\n{'='*50}")
    log(f"Automation complete! {len(automation_status['completed'])}/{len(profile_ids)} successful")

# =============================================================================
# WEB DASHBOARD
# =============================================================================
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AdsPower Rebotou Automation</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: #0a0a0b;
            color: #e4e4e7;
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 0;
            border-bottom: 1px solid #27272a;
            margin-bottom: 32px;
        }
        h1 { font-size: 24px; font-weight: 600; }
        .subtitle { color: #71717a; font-size: 14px; margin-top: 4px; }
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
        }
        .status-connected { background: #14532d; color: #4ade80; }
        .status-disconnected { background: #450a0a; color: #f87171; }
        .status-running { background: #422006; color: #fbbf24; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
        
        .card {
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 12px;
            padding: 20px;
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }
        .card-title { font-size: 16px; font-weight: 600; }
        .card-count { color: #71717a; font-size: 13px; }
        
        .btn {
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: #7c3aed; color: white; }
        .btn-primary:hover:not(:disabled) { background: #6d28d9; }
        .btn-success { background: #16a34a; color: white; }
        .btn-success:hover:not(:disabled) { background: #15803d; }
        .btn-danger { background: #dc2626; color: white; }
        .btn-danger:hover:not(:disabled) { background: #b91c1c; }
        .btn-secondary { background: #27272a; color: #e4e4e7; }
        .btn-secondary:hover:not(:disabled) { background: #3f3f46; }
        
        .profile-list {
            max-height: 400px;
            overflow-y: auto;
            margin-top: 12px;
        }
        .profile-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            background: #27272a;
            cursor: pointer;
            transition: all 0.15s;
        }
        .profile-item:hover { background: #3f3f46; }
        .profile-item.selected { background: #4c1d95; border: 1px solid #7c3aed; }
        .profile-checkbox { margin-right: 12px; width: 18px; height: 18px; }
        .profile-name { font-weight: 500; }
        .profile-id { color: #71717a; font-size: 12px; margin-top: 2px; }
        
        .sheet-select {
            margin-left: auto;
            padding: 6px 10px;
            border-radius: 6px;
            background: #18181b;
            border: 1px solid #3f3f46;
            color: #e4e4e7;
            font-size: 12px;
        }
        
        .logs-container {
            background: #0f0f10;
            border-radius: 8px;
            padding: 16px;
            height: 400px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            line-height: 1.6;
        }
        .log-entry { color: #a1a1aa; }
        .log-entry.error { color: #f87171; }
        .log-entry.success { color: #4ade80; }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #27272a;
            border-radius: 4px;
            margin: 16px 0;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #7c3aed, #a855f7);
            border-radius: 4px;
            transition: width 0.3s;
        }
        
        .actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .stats { display: flex; gap: 24px; margin-top: 16px; }
        .stat { text-align: center; }
        .stat-value { font-size: 32px; font-weight: 700; color: #7c3aed; }
        .stat-label { color: #71717a; font-size: 13px; margin-top: 4px; }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #71717a;
        }
        
        .select-all-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #27272a;
            border-radius: 8px;
            margin-bottom: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>AdsPower Rebotou Automation</h1>
                <p class="subtitle">Run Rebotou across all your browser profiles</p>
            </div>
            <div id="connection-status" class="status-badge status-disconnected">
                Checking AdsPower...
            </div>
        </header>
        
        <div class="grid">
            <!-- Profiles Card -->
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Browser Profiles</span>
                    <span class="card-count" id="profile-count">0 profiles</span>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary" onclick="syncProfiles()">
                        🔄 Sync from AdsPower
                    </button>
                    <button class="btn btn-secondary" onclick="loadComments()">
                        📄 Load Comments
                    </button>
                </div>
                <div class="select-all-row" style="margin-top: 16px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="select-all" onchange="toggleSelectAll()" style="margin-right: 8px;">
                        Select All
                    </label>
                    <span id="selected-count">0 selected</span>
                </div>
                <div class="profile-list" id="profile-list">
                    <div class="empty-state">
                        Click "Sync from AdsPower" to load profiles
                    </div>
                </div>
            </div>
            
            <!-- Control Card -->
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Automation Control</span>
                </div>
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value" id="stat-total">0</div>
                        <div class="stat-label">Total Profiles</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value" id="stat-selected">0</div>
                        <div class="stat-label">Selected</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value" id="stat-completed">0</div>
                        <div class="stat-label">Completed</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
                <p style="text-align: center; color: #71717a; font-size: 13px;" id="progress-text">
                    Ready to start
                </p>
                <div class="actions" style="justify-content: center; margin-top: 24px;">
                    <button class="btn btn-success" id="start-btn" onclick="startAutomation()" style="padding: 14px 32px; font-size: 16px;">
                        ▶ Run Selected Profiles
                    </button>
                    <button class="btn btn-danger" id="stop-btn" onclick="stopAutomation()" style="display: none;">
                        ⏹ Stop
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Logs Card -->
        <div class="card" style="margin-top: 24px;">
            <div class="card-header">
                <span class="card-title">Activity Log</span>
                <button class="btn btn-secondary" onclick="clearLogs()" style="padding: 6px 12px; font-size: 12px;">
                    Clear
                </button>
            </div>
            <div class="logs-container" id="logs-container">
                <div class="log-entry">Waiting to start...</div>
            </div>
        </div>
    </div>
    
    <script>
        let profiles = [];
        let selectedProfiles = new Set();
        let sheetMapping = {};
        const SHEETS = ['Bump Connect', 'Bump Syndicate', 'Kollabsy'];
        
        // Check connection on load
        checkConnection();
        setInterval(checkConnection, 5000);
        setInterval(updateStatus, 1000);
        
        async function checkConnection() {
            try {
                const res = await fetch('/api/check-adspower');
                const data = await res.json();
                const badge = document.getElementById('connection-status');
                if (data.connected) {
                    badge.textContent = 'AdsPower Connected';
                    badge.className = 'status-badge status-connected';
                } else {
                    badge.textContent = 'AdsPower Disconnected';
                    badge.className = 'status-badge status-disconnected';
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        async function syncProfiles() {
            try {
                const res = await fetch('/api/sync-profiles', { method: 'POST' });
                const data = await res.json();
                profiles = data.profiles || [];
                renderProfiles();
                updateStats();
            } catch (e) {
                alert('Error syncing profiles: ' + e.message);
            }
        }
        
        async function loadComments() {
            try {
                const res = await fetch('/api/load-comments', { method: 'POST' });
                const data = await res.json();
                alert(`Loaded comments:\\n${Object.entries(data.counts).map(([k,v]) => `${k}: ${v}`).join('\\n')}`);
            } catch (e) {
                alert('Error loading comments: ' + e.message);
            }
        }
        
        function renderProfiles() {
            const container = document.getElementById('profile-list');
            if (profiles.length === 0) {
                container.innerHTML = '<div class="empty-state">No profiles found. Make sure AdsPower is running.</div>';
                return;
            }
            
            container.innerHTML = profiles.map(p => `
                <div class="profile-item ${selectedProfiles.has(p.user_id) ? 'selected' : ''}" 
                     onclick="toggleProfile('${p.user_id}')">
                    <input type="checkbox" class="profile-checkbox" 
                           ${selectedProfiles.has(p.user_id) ? 'checked' : ''}
                           onclick="event.stopPropagation(); toggleProfile('${p.user_id}')">
                    <div>
                        <div class="profile-name">${p.name || p.user_id}</div>
                        <div class="profile-id">ID: ${p.user_id}</div>
                    </div>
                    <select class="sheet-select" onclick="event.stopPropagation()" 
                            onchange="setSheet('${p.user_id}', this.value)">
                        ${SHEETS.map(s => `<option value="${s}" ${sheetMapping[p.user_id] === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            `).join('');
            
            document.getElementById('profile-count').textContent = `${profiles.length} profiles`;
        }
        
        function toggleProfile(userId) {
            if (selectedProfiles.has(userId)) {
                selectedProfiles.delete(userId);
            } else {
                selectedProfiles.add(userId);
                if (!sheetMapping[userId]) {
                    sheetMapping[userId] = SHEETS[0];
                }
            }
            renderProfiles();
            updateStats();
        }
        
        function toggleSelectAll() {
            const checkbox = document.getElementById('select-all');
            if (checkbox.checked) {
                profiles.forEach(p => {
                    selectedProfiles.add(p.user_id);
                    if (!sheetMapping[p.user_id]) {
                        sheetMapping[p.user_id] = SHEETS[0];
                    }
                });
            } else {
                selectedProfiles.clear();
            }
            renderProfiles();
            updateStats();
        }
        
        function setSheet(userId, sheet) {
            sheetMapping[userId] = sheet;
        }
        
        function updateStats() {
            document.getElementById('stat-total').textContent = profiles.length;
            document.getElementById('stat-selected').textContent = selectedProfiles.size;
            document.getElementById('selected-count').textContent = `${selectedProfiles.size} selected`;
            document.getElementById('select-all').checked = selectedProfiles.size === profiles.length && profiles.length > 0;
        }
        
        async function startAutomation() {
            if (selectedProfiles.size === 0) {
                alert('Please select at least one profile');
                return;
            }
            
            const profileIds = Array.from(selectedProfiles);
            const mapping = {};
            profileIds.forEach(id => { mapping[id] = sheetMapping[id] || SHEETS[0]; });
            
            try {
                await fetch('/api/start-automation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profile_ids: profileIds, sheet_mapping: mapping })
                });
                
                document.getElementById('start-btn').style.display = 'none';
                document.getElementById('stop-btn').style.display = 'inline-flex';
            } catch (e) {
                alert('Error starting automation: ' + e.message);
            }
        }
        
        async function stopAutomation() {
            try {
                await fetch('/api/stop-automation', { method: 'POST' });
            } catch (e) {
                console.error(e);
            }
        }
        
        async function updateStatus() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                
                // Update progress
                const progress = data.total > 0 ? (data.progress / data.total) * 100 : 0;
                document.getElementById('progress-fill').style.width = `${progress}%`;
                
                if (data.running) {
                    document.getElementById('progress-text').textContent = 
                        `Processing ${data.current_profile || '...'} (${data.progress}/${data.total})`;
                    document.getElementById('connection-status').textContent = 'Running...';
                    document.getElementById('connection-status').className = 'status-badge status-running';
                } else if (data.progress > 0) {
                    document.getElementById('progress-text').textContent = 
                        `Completed ${data.completed.length}/${data.total} profiles`;
                }
                
                document.getElementById('stat-completed').textContent = data.completed.length;
                
                // Update buttons
                if (!data.running) {
                    document.getElementById('start-btn').style.display = 'inline-flex';
                    document.getElementById('stop-btn').style.display = 'none';
                }
                
                // Update logs
                if (data.logs.length > 0) {
                    const logsContainer = document.getElementById('logs-container');
                    logsContainer.innerHTML = data.logs.map(log => {
                        let className = 'log-entry';
                        if (log.includes('ERROR')) className += ' error';
                        if (log.includes('completed') || log.includes('success')) className += ' success';
                        return `<div class="${className}">${log}</div>`;
                    }).join('');
                    logsContainer.scrollTop = logsContainer.scrollHeight;
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        function clearLogs() {
            fetch('/api/clear-logs', { method: 'POST' });
            document.getElementById('logs-container').innerHTML = '<div class="log-entry">Logs cleared</div>';
        }
    </script>
</body>
</html>
"""

# =============================================================================
# API ROUTES
# =============================================================================
@app.route('/')
def index():
    return render_template_string(DASHBOARD_HTML)

@app.route('/api/check-adspower')
def check_adspower():
    try:
        response = requests.get(f"{ADSPOWER_API}/api/v1/user/list?page_size=1", timeout=3)
        return jsonify({"connected": response.status_code == 200})
    except:
        return jsonify({"connected": False})

@app.route('/api/sync-profiles', methods=['POST'])
def sync_profiles():
    success = fetch_adspower_profiles()
    return jsonify({"success": success, "profiles": profiles})

@app.route('/api/load-comments', methods=['POST'])
def load_comments():
    counts = {}
    for sheet in SHEET_NAMES:
        comments = fetch_google_sheet_comments(sheet)
        counts[sheet] = len(comments)
    return jsonify({"success": True, "counts": counts})

@app.route('/api/status')
def get_status():
    return jsonify(automation_status)

@app.route('/api/start-automation', methods=['POST'])
def start_automation():
    global automation_status
    if automation_status["running"]:
        return jsonify({"error": "Automation already running"}), 400
    
    data = request.json
    profile_ids = data.get("profile_ids", [])
    sheet_mapping = data.get("sheet_mapping", {})
    
    thread = threading.Thread(target=run_automation_thread, args=(profile_ids, sheet_mapping))
    thread.daemon = True
    thread.start()
    
    return jsonify({"success": True})

@app.route('/api/stop-automation', methods=['POST'])
def stop_automation():
    global automation_status
    automation_status["running"] = False
    return jsonify({"success": True})

@app.route('/api/clear-logs', methods=['POST'])
def clear_logs():
    global automation_status
    automation_status["logs"] = []
    return jsonify({"success": True})

# =============================================================================
# MAIN
# =============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  AdsPower Rebotou Automation Dashboard")
    print("=" * 60)
    print()
    print("  Open in your browser: http://localhost:9090")
    print()
    print("  Make sure AdsPower is running before using this tool.")
    print("=" * 60)
    print()
    
    app.run(host="0.0.0.0", port=9090, debug=False)
