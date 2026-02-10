#!/usr/bin/env python3
"""
AdsPower Rebotou Automation Dashboard
=====================================
Run Rebotou across all your AdsPower browsers with one click.

SETUP:
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
from datetime import datetime
from flask import Flask, render_template_string, jsonify, request

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0.5
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False
    print("ERROR: pyautogui not installed. Run: pip install pyautogui")

# =============================================================================
# CONFIGURATION
# =============================================================================
ADSPOWER_API = "http://localhost:50325"
GOOGLE_SHEET_ID = "1cgjxB09nXSsKMEFwNxQlDzl8xVDyQgT0o8aKm6YOJ-o"
SHEET_NAMES = ["Bump Connect", "Bump Syndicate", "Kollabsy"]

# Click positions (will be calibrated)
# For MacBook Air M2 13", extension icon is usually around:
EXTENSION_ICON_X = 1350  # Near right side
EXTENSION_ICON_Y = 45    # Top toolbar
RUN_ALL_BUTTON_X = 85    # In Rebotou popup
RUN_ALL_BUTTON_Y = 100   # In Rebotou popup

# =============================================================================
# GLOBAL STATE
# =============================================================================
app = Flask(__name__)
profiles = []
comments_cache = {}
click_positions = {
    "extension_x": EXTENSION_ICON_X,
    "extension_y": EXTENSION_ICON_Y,
    "run_all_x": RUN_ALL_BUTTON_X,
    "run_all_y": RUN_ALL_BUTTON_Y
}
automation_status = {
    "running": False,
    "current_profile": None,
    "progress": 0,
    "total": 0,
    "logs": [],
    "completed": []
}

def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    automation_status["logs"].append(log_entry)
    print(log_entry)
    if len(automation_status["logs"]) > 100:
        automation_status["logs"] = automation_status["logs"][-100:]

def fetch_adspower_profiles():
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
    except requests.exceptions.ConnectionError:
        log("ERROR: Cannot connect to AdsPower. Make sure it's running!")
    except Exception as e:
        log(f"ERROR: {e}")
    return False

def fetch_google_sheet_comments(sheet_name):
    global comments_cache
    try:
        encoded_name = sheet_name.replace(" ", "%20")
        url = f"https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            reader = csv.reader(io.StringIO(response.text))
            next(reader, None)
            comments = [row[0].strip() for row in reader if row and row[0].strip()]
            comments_cache[sheet_name] = comments
            log(f"Loaded {len(comments)} comments from '{sheet_name}'")
            return comments
    except Exception as e:
        log(f"ERROR loading comments: {e}")
    return []

def open_browser(profile_id):
    try:
        response = requests.get(f"{ADSPOWER_API}/api/v1/browser/start?user_id={profile_id}", timeout=60)
        data = response.json()
        if data.get("code") == 0:
            return True
        log(f"  Error: {data.get('msg')}")
    except Exception as e:
        log(f"  Error opening browser: {e}")
    return False

def close_browser(profile_id):
    try:
        requests.get(f"{ADSPOWER_API}/api/v1/browser/stop?user_id={profile_id}", timeout=10)
    except:
        pass

def run_rebotou_automation(profile_name):
    """Click Rebotou extension and Run All button"""
    if not HAS_PYAUTOGUI:
        log("  ERROR: pyautogui not installed!")
        return False
    
    try:
        # Wait for browser to fully load
        time.sleep(4)
        
        # Step 1: Click on the Rebotou extension icon
        ext_x = click_positions["extension_x"]
        ext_y = click_positions["extension_y"]
        
        log(f"  Clicking Rebotou extension at ({ext_x}, {ext_y})...")
        pyautogui.click(ext_x, ext_y)
        time.sleep(2)
        
        # Step 2: Click the Run All button in the popup
        run_x = click_positions["run_all_x"]
        run_y = click_positions["run_all_y"]
        
        log(f"  Clicking Run All at ({run_x}, {run_y})...")
        pyautogui.click(run_x, run_y)
        time.sleep(2)
        
        log(f"  Rebotou started for {profile_name}!")
        
        # Step 3: Wait for Rebotou to finish
        # Rebotou typically runs for a few minutes
        wait_time = 180  # 3 minutes default
        log(f"  Waiting {wait_time}s for Rebotou to complete...")
        
        for i in range(wait_time // 10):
            if not automation_status["running"]:
                log("  Stopped by user")
                return False
            time.sleep(10)
            log(f"  Running... ({(i+1)*10}s / {wait_time}s)")
        
        log(f"  Completed: {profile_name}")
        return True
        
    except Exception as e:
        log(f"  Error: {e}")
        return False

def run_automation_thread(profile_ids, sheet_mapping):
    global automation_status
    
    automation_status["running"] = True
    automation_status["progress"] = 0
    automation_status["total"] = len(profile_ids)
    automation_status["completed"] = []
    automation_status["logs"] = []
    
    log(f"Starting automation for {len(profile_ids)} profiles")
    log(f"Extension icon position: ({click_positions['extension_x']}, {click_positions['extension_y']})")
    log(f"Run All button position: ({click_positions['run_all_x']}, {click_positions['run_all_y']})")
    
    for i, profile_id in enumerate(profile_ids):
        if not automation_status["running"]:
            log("Stopped by user")
            break
        
        profile = next((p for p in profiles if p.get("user_id") == profile_id), None)
        if not profile:
            continue
        
        profile_name = profile.get("name", profile_id)
        sheet_name = sheet_mapping.get(profile_id, SHEET_NAMES[0])
        
        automation_status["current_profile"] = profile_name
        automation_status["progress"] = i + 1
        
        log(f"\n[{i+1}/{len(profile_ids)}] {profile_name}")
        log(f"  Sheet: {sheet_name}")
        
        # Load comments for this sheet
        if sheet_name not in comments_cache:
            fetch_google_sheet_comments(sheet_name)
        
        # Open browser
        log(f"  Opening browser...")
        if not open_browser(profile_id):
            log(f"  Failed to open browser")
            continue
        
        log(f"  Browser opened!")
        
        # Run Rebotou
        success = run_rebotou_automation(profile_name)
        
        # Close browser
        log(f"  Closing browser...")
        close_browser(profile_id)
        
        if success:
            automation_status["completed"].append(profile_id)
        
        # Wait between profiles
        if i < len(profile_ids) - 1 and automation_status["running"]:
            log("  Waiting 5s before next profile...")
            time.sleep(5)
    
    automation_status["running"] = False
    automation_status["current_profile"] = None
    log(f"\n{'='*50}")
    log(f"Done! {len(automation_status['completed'])}/{len(profile_ids)} completed")

# =============================================================================
# WEB DASHBOARD HTML
# =============================================================================
DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>AdsPower Rebotou Automation</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0b; color: #e4e4e7; }
        .container { max-width: 1100px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #71717a; font-size: 14px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; }
        .card-title { font-weight: 600; margin-bottom: 12px; display: flex; justify-content: space-between; }
        .btn { padding: 8px 16px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        .btn-secondary { background: #27272a; color: #e4e4e7; }
        .btn-secondary:hover { background: #3f3f46; }
        .btn-success { background: #16a34a; color: white; font-size: 15px; padding: 12px 24px; }
        .btn-success:hover { background: #15803d; }
        .btn-danger { background: #dc2626; color: white; }
        .profile { display: flex; align-items: center; padding: 10px; background: #27272a; border-radius: 6px; margin-bottom: 6px; cursor: pointer; }
        .profile:hover { background: #3f3f46; }
        .profile.selected { background: #4c1d95; border: 1px solid #7c3aed; }
        .profile input { margin-right: 10px; }
        .profile-info { flex: 1; }
        .profile-name { font-weight: 500; font-size: 13px; }
        .profile-id { color: #71717a; font-size: 11px; }
        .profile-list { max-height: 350px; overflow-y: auto; }
        select { padding: 4px 8px; background: #18181b; border: 1px solid #3f3f46; color: #e4e4e7; border-radius: 4px; font-size: 11px; }
        .stats { display: flex; gap: 24px; justify-content: center; margin: 16px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 28px; font-weight: 700; color: #7c3aed; }
        .stat-label { color: #71717a; font-size: 12px; }
        .progress { width: 100%; height: 6px; background: #27272a; border-radius: 3px; margin: 12px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a855f7); border-radius: 3px; transition: width 0.3s; }
        .logs { background: #0f0f10; border-radius: 6px; padding: 12px; height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; line-height: 1.5; }
        .log-entry { color: #a1a1aa; }
        .log-entry.error { color: #f87171; }
        .log-entry.success { color: #4ade80; }
        .actions { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .calibration { background: #1e1b4b; border: 1px solid #4c1d95; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
        .calibration h4 { font-size: 13px; margin-bottom: 8px; color: #a78bfa; }
        .calibration-row { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
        .calibration input { width: 70px; padding: 4px 8px; background: #27272a; border: 1px solid #3f3f46; color: white; border-radius: 4px; }
        .calibration label { font-size: 12px; color: #a1a1aa; min-width: 120px; }
        .center { text-align: center; }
        .mouse-pos { position: fixed; bottom: 10px; right: 10px; background: #27272a; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>AdsPower Rebotou Automation</h1>
        <p class="subtitle">One-click automation for all your browser profiles</p>
        
        <div class="grid">
            <div class="card">
                <div class="card-title">
                    <span>Browser Profiles</span>
                    <span id="profile-count" style="color:#71717a; font-weight:normal;">0 profiles</span>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary" onclick="syncProfiles()">🔄 Sync Profiles</button>
                    <button class="btn btn-secondary" onclick="loadComments()">📄 Load Comments</button>
                    <button class="btn btn-secondary btn-sm" onclick="selectAll()">Select All</button>
                </div>
                <div class="profile-list" id="profile-list">
                    <div style="text-align:center; color:#71717a; padding:40px;">
                        Click "Sync Profiles" to load from AdsPower
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">Automation Control</div>
                
                <!-- Calibration Section -->
                <div class="calibration">
                    <h4>📍 Click Position Calibration</h4>
                    <p style="font-size:11px; color:#71717a; margin-bottom:10px;">
                        Move your mouse to find correct positions, then enter them below:
                    </p>
                    <div class="calibration-row">
                        <label>Extension Icon (X, Y):</label>
                        <input type="number" id="ext-x" value="1350" onchange="updatePositions()">
                        <input type="number" id="ext-y" value="45" onchange="updatePositions()">
                        <button class="btn btn-secondary btn-sm" onclick="testExtClick()">Test</button>
                    </div>
                    <div class="calibration-row">
                        <label>Run All Button (X, Y):</label>
                        <input type="number" id="run-x" value="85" onchange="updatePositions()">
                        <input type="number" id="run-y" value="100" onchange="updatePositions()">
                        <button class="btn btn-secondary btn-sm" onclick="testRunClick()">Test</button>
                    </div>
                </div>
                
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value" id="stat-total">0</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value" id="stat-selected">0</div>
                        <div class="stat-label">Selected</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value" id="stat-done">0</div>
                        <div class="stat-label">Done</div>
                    </div>
                </div>
                
                <div class="progress"><div class="progress-fill" id="progress" style="width:0%"></div></div>
                <p class="center" style="color:#71717a; font-size:12px;" id="status-text">Ready</p>
                
                <div class="center" style="margin-top:16px;">
                    <button class="btn btn-success" id="start-btn" onclick="startAutomation()">▶ Run Selected Profiles</button>
                    <button class="btn btn-danger" id="stop-btn" onclick="stopAutomation()" style="display:none;">⏹ Stop</button>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top:20px;">
            <div class="card-title">
                <span>Activity Log</span>
                <button class="btn btn-secondary btn-sm" onclick="clearLogs()">Clear</button>
            </div>
            <div class="logs" id="logs">Waiting to start...</div>
        </div>
    </div>
    
    <div class="mouse-pos" id="mouse-pos">Mouse: (0, 0)</div>
    
    <script>
        let profiles = [];
        let selected = new Set();
        let sheetMap = {};
        const SHEETS = ['Bump Connect', 'Bump Syndicate', 'Kollabsy'];
        
        // Track mouse position
        document.addEventListener('mousemove', (e) => {
            document.getElementById('mouse-pos').textContent = `Mouse: (${e.screenX}, ${e.screenY})`;
        });
        
        // Poll status
        setInterval(updateStatus, 1000);
        
        async function syncProfiles() {
            const res = await fetch('/api/sync-profiles', {method: 'POST'});
            const data = await res.json();
            profiles = data.profiles || [];
            renderProfiles();
        }
        
        async function loadComments() {
            const res = await fetch('/api/load-comments', {method: 'POST'});
            const data = await res.json();
            alert('Comments loaded:\\n' + Object.entries(data.counts).map(([k,v]) => k + ': ' + v).join('\\n'));
        }
        
        function renderProfiles() {
            const el = document.getElementById('profile-list');
            if (!profiles.length) {
                el.innerHTML = '<div style="text-align:center;color:#71717a;padding:40px;">No profiles found</div>';
                return;
            }
            el.innerHTML = profiles.map(p => `
                <div class="profile ${selected.has(p.user_id) ? 'selected' : ''}" onclick="toggle('${p.user_id}')">
                    <input type="checkbox" ${selected.has(p.user_id) ? 'checked' : ''} onclick="event.stopPropagation();toggle('${p.user_id}')">
                    <div class="profile-info">
                        <div class="profile-name">${p.name || p.user_id}</div>
                        <div class="profile-id">${p.user_id}</div>
                    </div>
                    <select onclick="event.stopPropagation()" onchange="sheetMap['${p.user_id}']=this.value">
                        ${SHEETS.map(s => `<option ${sheetMap[p.user_id]===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
            `).join('');
            document.getElementById('profile-count').textContent = profiles.length + ' profiles';
            updateStats();
        }
        
        function toggle(id) {
            selected.has(id) ? selected.delete(id) : selected.add(id);
            if (!sheetMap[id]) sheetMap[id] = SHEETS[0];
            renderProfiles();
        }
        
        function selectAll() {
            if (selected.size === profiles.length) {
                selected.clear();
            } else {
                profiles.forEach(p => { selected.add(p.user_id); sheetMap[p.user_id] = sheetMap[p.user_id] || SHEETS[0]; });
            }
            renderProfiles();
        }
        
        function updateStats() {
            document.getElementById('stat-total').textContent = profiles.length;
            document.getElementById('stat-selected').textContent = selected.size;
        }
        
        function updatePositions() {
            fetch('/api/set-positions', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    extension_x: parseInt(document.getElementById('ext-x').value),
                    extension_y: parseInt(document.getElementById('ext-y').value),
                    run_all_x: parseInt(document.getElementById('run-x').value),
                    run_all_y: parseInt(document.getElementById('run-y').value)
                })
            });
        }
        
        async function testExtClick() {
            updatePositions();
            await fetch('/api/test-click?type=extension', {method: 'POST'});
        }
        
        async function testRunClick() {
            updatePositions();
            await fetch('/api/test-click?type=run_all', {method: 'POST'});
        }
        
        async function startAutomation() {
            if (!selected.size) { alert('Select at least one profile'); return; }
            updatePositions();
            await fetch('/api/start', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ profile_ids: Array.from(selected), sheet_mapping: sheetMap })
            });
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('stop-btn').style.display = 'inline';
        }
        
        async function stopAutomation() {
            await fetch('/api/stop', {method: 'POST'});
        }
        
        async function updateStatus() {
            const res = await fetch('/api/status');
            const data = await res.json();
            
            const pct = data.total ? (data.progress / data.total * 100) : 0;
            document.getElementById('progress').style.width = pct + '%';
            document.getElementById('stat-done').textContent = data.completed.length;
            
            if (data.running) {
                document.getElementById('status-text').textContent = `Running: ${data.current_profile} (${data.progress}/${data.total})`;
            } else if (data.progress > 0) {
                document.getElementById('status-text').textContent = `Completed ${data.completed.length}/${data.total}`;
                document.getElementById('start-btn').style.display = 'inline';
                document.getElementById('stop-btn').style.display = 'none';
            }
            
            if (data.logs.length) {
                document.getElementById('logs').innerHTML = data.logs.map(l => {
                    let cls = 'log-entry';
                    if (l.includes('ERROR')) cls += ' error';
                    if (l.includes('Completed') || l.includes('Done')) cls += ' success';
                    return `<div class="${cls}">${l}</div>`;
                }).join('');
                document.getElementById('logs').scrollTop = 99999;
            }
        }
        
        function clearLogs() {
            fetch('/api/clear-logs', {method:'POST'});
            document.getElementById('logs').innerHTML = 'Cleared';
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

@app.route('/api/sync-profiles', methods=['POST'])
def api_sync():
    fetch_adspower_profiles()
    return jsonify({"profiles": profiles})

@app.route('/api/load-comments', methods=['POST'])
def api_load_comments():
    counts = {}
    for sheet in SHEET_NAMES:
        comments = fetch_google_sheet_comments(sheet)
        counts[sheet] = len(comments)
    return jsonify({"counts": counts})

@app.route('/api/status')
def api_status():
    return jsonify(automation_status)

@app.route('/api/set-positions', methods=['POST'])
def api_set_positions():
    global click_positions
    data = request.json
    click_positions.update(data)
    return jsonify({"ok": True})

@app.route('/api/test-click', methods=['POST'])
def api_test_click():
    click_type = request.args.get('type', 'extension')
    if HAS_PYAUTOGUI:
        if click_type == 'extension':
            pyautogui.click(click_positions['extension_x'], click_positions['extension_y'])
        else:
            pyautogui.click(click_positions['run_all_x'], click_positions['run_all_y'])
    return jsonify({"ok": True})

@app.route('/api/start', methods=['POST'])
def api_start():
    if automation_status["running"]:
        return jsonify({"error": "Already running"}), 400
    data = request.json
    t = threading.Thread(target=run_automation_thread, args=(data['profile_ids'], data['sheet_mapping']))
    t.daemon = True
    t.start()
    return jsonify({"ok": True})

@app.route('/api/stop', methods=['POST'])
def api_stop():
    automation_status["running"] = False
    return jsonify({"ok": True})

@app.route('/api/clear-logs', methods=['POST'])
def api_clear_logs():
    automation_status["logs"] = []
    return jsonify({"ok": True})

if __name__ == "__main__":
    print("=" * 50)
    print("  AdsPower Rebotou Automation")
    print("  Open: http://localhost:9090")
    print("=" * 50)
    
    if not HAS_PYAUTOGUI:
        print("\n⚠️  Install pyautogui: pip install pyautogui\n")
    
    app.run(host="0.0.0.0", port=9090, debug=False)
