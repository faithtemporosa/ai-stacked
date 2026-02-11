#!/usr/bin/env python3
"""
AdsPower TikTok Direct Commenter v2
===================================
Directly comments on TikTok videos using JavaScript injection for reliability.

SETUP:
    pip install requests flask playwright
    playwright install chromium

RUN:
    python tiktok_commenter.py

Open http://localhost:9090
"""

import requests
import time
import json
import csv
import io
import threading
import random
import traceback
from datetime import datetime
from flask import Flask, render_template_string, jsonify, request

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    print("ERROR: Install playwright: pip install playwright && playwright install chromium")

# =============================================================================
# CONFIGURATION
# =============================================================================
ADSPOWER_API = "http://localhost:50325"
GOOGLE_SHEET_ID = "1cgjxB09nXSsKMEFwNxQlDzl8xVDyQgT0o8aKm6YOJ-o"
SHEET_NAMES = ["Bump Connect", "Bump Syndicate", "Kollabsy"]

MIN_DELAY_BETWEEN_COMMENTS = 30
MAX_DELAY_BETWEEN_COMMENTS = 60
VIDEOS_PER_PROFILE = 10

# =============================================================================
# GLOBAL STATE
# =============================================================================
app = Flask(__name__)
profiles = []
comments_cache = {}
commented_videos = set()

settings = {
    "min_delay": MIN_DELAY_BETWEEN_COMMENTS,
    "max_delay": MAX_DELAY_BETWEEN_COMMENTS,
    "videos_per_profile": VIDEOS_PER_PROFILE,
}

automation_status = {
    "running": False,
    "current_profile": None,
    "progress": 0,
    "total": 0,
    "logs": [],
    "completed": [],
    "comments_posted": 0,
    "report": []
}

def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    automation_status["logs"].append(log_entry)
    print(log_entry)
    if len(automation_status["logs"]) > 200:
        automation_status["logs"] = automation_status["logs"][-200:]

def fetch_adspower_profiles():
    global profiles
    try:
        response = requests.get(f"{ADSPOWER_API}/api/v1/user/list?page_size=100", timeout=5)
        data = response.json()
        if data.get("code") == 0:
            profiles = data.get("data", {}).get("list", [])
            log(f"✓ Loaded {len(profiles)} profiles from AdsPower")
            return True
        log(f"✗ AdsPower error: {data.get('msg')}")
    except requests.exceptions.ConnectionError:
        log("✗ Cannot connect to AdsPower - is it running?")
    except Exception as e:
        log(f"✗ Error: {e}")
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
            log(f"✓ Loaded {len(comments)} comments from '{sheet_name}'")
            return comments
    except Exception as e:
        log(f"✗ Error loading comments: {e}")
    return []

def open_browser(profile_id):
    try:
        response = requests.get(f"{ADSPOWER_API}/api/v1/browser/start?user_id={profile_id}", timeout=60)
        data = response.json()
        if data.get("code") == 0:
            return data.get("data", {})
        log(f"  ✗ Error: {data.get('msg')}")
    except Exception as e:
        log(f"  ✗ Error opening browser: {e}")
    return None

def close_browser(profile_id):
    try:
        requests.get(f"{ADSPOWER_API}/api/v1/browser/stop?user_id={profile_id}", timeout=10)
    except:
        pass

def get_random_comment(sheet_name):
    comments = comments_cache.get(sheet_name, [])
    if comments:
        return random.choice(comments)
    return None

def run_tiktok_commenter(ws_endpoint, profile_name, sheet_name):
    """Connect to browser and comment on TikTok videos using JS injection"""
    global commented_videos
    
    if not HAS_PLAYWRIGHT:
        log("  ✗ Playwright not installed!")
        return False
    
    videos_commented = 0
    target_videos = settings["videos_per_profile"]
    
    try:
        with sync_playwright() as p:
            # Connect to AdsPower browser
            log(f"  → Connecting to browser...")
            browser = p.chromium.connect_over_cdp(ws_endpoint)
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()
            
            log(f"  ✓ Connected")
            
            # Go to TikTok
            log(f"  → Opening TikTok...")
            try:
                page.goto("https://www.tiktok.com/foryou", timeout=60000)
            except Exception as e:
                log(f"  ✗ Navigation failed: {e}")
                browser.close()
                return False
            
            time.sleep(5)
            
            # Check if logged in
            current_url = page.url
            log(f"  📍 URL: {current_url}")
            
            if "login" in current_url.lower():
                log(f"  ⚠ Not logged in!")
                browser.close()
                return False
            
            # Wait for video
            try:
                page.wait_for_selector('video', timeout=15000)
                log(f"  ✓ TikTok loaded")
            except:
                log(f"  ⚠ No video found")
            
            # Process videos
            for video_num in range(target_videos):
                if not automation_status["running"]:
                    log(f"  ⏹ Stopped")
                    break
                
                log(f"  📹 Video {video_num + 1}/{target_videos}")
                
                try:
                    current_url = page.url
                    video_id = f"video_{video_num}_{int(time.time())}"
                    
                    if video_id in commented_videos:
                        log(f"    ⏭ Skip")
                        page.keyboard.press("ArrowDown")
                        time.sleep(2)
                        continue
                    
                    # STEP 1: Click comment icon using JavaScript
                    log(f"    → Opening comments...")
                    
                    result = page.evaluate('''() => {
                        // Find comment button
                        const selectors = [
                            '[data-e2e="comment-icon"]',
                            'button[class*="comment" i]',
                            '[class*="CommentIcon"]',
                            '[class*="DivCommentIconContainer"]'
                        ];
                        
                        for (let sel of selectors) {
                            const el = document.querySelector(sel);
                            if (el) {
                                el.click();
                                return {success: true, method: sel};
                            }
                        }
                        
                        // Fallback: find by SVG path
                        const svgs = document.querySelectorAll('svg');
                        for (let svg of svgs) {
                            const parent = svg.closest('button') || svg.parentElement;
                            if (parent && parent.offsetParent) {
                                const rect = parent.getBoundingClientRect();
                                // Comment button is usually on the right side
                                if (rect.right > window.innerWidth - 200) {
                                    parent.click();
                                    return {success: true, method: 'svg-parent'};
                                }
                            }
                        }
                        
                        return {success: false};
                    }''')
                    
                    if result.get('success'):
                        log(f"    ✓ Comments opened ({result.get('method')})")
                    else:
                        log(f"    ⚠ Could not open comments")
                        page.keyboard.press("ArrowDown")
                        time.sleep(2)
                        continue
                    
                    time.sleep(2)
                    
                    # STEP 2: Find and click comment input
                    log(f"    → Finding input...")
                    
                    result = page.evaluate('''() => {
                        // Find comment input
                        const selectors = [
                            '[data-e2e="comment-input"]',
                            'div[contenteditable="true"]',
                            '[class*="DraftEditor"]',
                            '[class*="CommentInput"]'
                        ];
                        
                        for (let sel of selectors) {
                            const el = document.querySelector(sel);
                            if (el && el.offsetParent) {
                                el.click();
                                el.focus();
                                return {success: true, method: sel};
                            }
                        }
                        
                        return {success: false};
                    }''')
                    
                    if result.get('success'):
                        log(f"    ✓ Input found ({result.get('method')})")
                    else:
                        log(f"    ⚠ Input not found")
                        page.keyboard.press("Escape")
                        page.keyboard.press("ArrowDown")
                        time.sleep(2)
                        continue
                    
                    time.sleep(0.5)
                    
                    # Get comment
                    comment_text = get_random_comment(sheet_name)
                    if not comment_text:
                        log(f"    ⚠ No comments in sheet")
                        continue
                    
                    # STEP 3: Type comment
                    log(f"    → Typing...")
                    page.keyboard.type(comment_text, delay=50)
                    time.sleep(1)
                    
                    # STEP 4: Post comment
                    log(f"    → Posting...")
                    
                    result = page.evaluate('''() => {
                        // Find post button
                        const selectors = [
                            '[data-e2e="comment-post"]',
                            '[class*="PostButton"]',
                            '[class*="DivPostButton"]'
                        ];
                        
                        for (let sel of selectors) {
                            const el = document.querySelector(sel);
                            if (el && el.offsetParent) {
                                el.click();
                                return {success: true, method: sel};
                            }
                        }
                        
                        // Find by text content
                        const elements = document.querySelectorAll('button, span, div');
                        const postWords = ['post', 'pubblica', 'publicar', 'publier', 'posten', 'enviar', 'отправить', '发布', '게시'];
                        
                        for (let el of elements) {
                            const text = el.textContent.toLowerCase().trim();
                            if (postWords.includes(text) && el.offsetParent) {
                                el.click();
                                return {success: true, method: 'text:' + text};
                            }
                        }
                        
                        return {success: false};
                    }''')
                    
                    if result.get('success'):
                        log(f"    ✓ Posted ({result.get('method')})")
                    else:
                        log(f"    → Trying Enter...")
                        page.keyboard.press("Enter")
                    
                    time.sleep(2)
                    
                    # Success!
                    commented_videos.add(video_id)
                    videos_commented += 1
                    automation_status["comments_posted"] += 1
                    
                    automation_status["report"].append({
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "profile": profile_name,
                        "video_url": current_url,
                        "video_id": video_id,
                        "comment": comment_text,
                        "sheet": sheet_name
                    })
                    
                    log(f"    ✓ SUCCESS: {comment_text[:40]}...")
                    
                    # Close comments
                    page.keyboard.press("Escape")
                    time.sleep(1)
                    
                    # Wait
                    delay = random.randint(settings["min_delay"], settings["max_delay"])
                    log(f"    ⏳ Waiting {delay}s...")
                    for _ in range(delay):
                        if not automation_status["running"]:
                            break
                        time.sleep(1)
                
                except Exception as e:
                    log(f"    ✗ Error: {e}")
                
                # Next video
                page.keyboard.press("ArrowDown")
                time.sleep(2)
            
            log(f"  ✓ Done: {videos_commented} comments")
            browser.close()
            return videos_commented > 0
            
    except Exception as e:
        log(f"  ✗ Error: {e}")
        log(f"  📋 {traceback.format_exc()}")
        return False

def run_automation_thread(profile_ids, sheet_mapping):
    global automation_status
    
    automation_status["running"] = True
    automation_status["progress"] = 0
    automation_status["total"] = len(profile_ids)
    automation_status["completed"] = []
    automation_status["logs"] = []
    automation_status["comments_posted"] = 0
    automation_status["report"] = []
    
    log(f"{'='*50}")
    log(f"Starting for {len(profile_ids)} profiles")
    log(f"{'='*50}")
    
    # Load comments
    for sheet in set(sheet_mapping.values()):
        if sheet not in comments_cache:
            fetch_google_sheet_comments(sheet)
    
    for i, profile_id in enumerate(profile_ids):
        if not automation_status["running"]:
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
        
        # Open browser
        log(f"  Opening browser...")
        browser_data = open_browser(profile_id)
        if not browser_data:
            continue
        
        ws_endpoint = browser_data.get("ws", {}).get("puppeteer")
        if not ws_endpoint:
            log(f"  ✗ No WebSocket")
            close_browser(profile_id)
            continue
        
        # Run
        success = run_tiktok_commenter(ws_endpoint, profile_name, sheet_name)
        
        # Close
        log(f"  Closing browser...")
        close_browser(profile_id)
        
        if success:
            automation_status["completed"].append(profile_id)
        
        if i < len(profile_ids) - 1 and automation_status["running"]:
            wait = random.randint(10, 20)
            log(f"  Waiting {wait}s...")
            time.sleep(wait)
    
    automation_status["running"] = False
    automation_status["current_profile"] = None
    log(f"\n{'='*50}")
    log(f"✓ DONE! {automation_status['comments_posted']} comments")
    log(f"{'='*50}")

# =============================================================================
# WEB DASHBOARD
# =============================================================================
DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>TikTok Commenter</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0b; color: #e4e4e7; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #71717a; font-size: 14px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; }
        .card-title { font-weight: 600; margin-bottom: 16px; display: flex; justify-content: space-between; }
        .btn { padding: 10px 20px; border-radius: 8px; border: none; font-size: 14px; cursor: pointer; }
        .btn-secondary { background: #27272a; color: #e4e4e7; }
        .btn-success { background: #16a34a; color: white; font-size: 16px; padding: 14px 32px; }
        .btn-danger { background: #dc2626; color: white; }
        .btn-primary { background: #7c3aed; color: white; }
        .profile { display: flex; align-items: center; padding: 12px; background: #27272a; border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
        .profile.selected { background: #4c1d95; border: 1px solid #7c3aed; }
        .profile input { margin-right: 12px; }
        .profile-list { max-height: 300px; overflow-y: auto; margin-top: 12px; }
        select { padding: 6px; background: #18181b; border: 1px solid #3f3f46; color: #e4e4e7; border-radius: 4px; }
        .stats { display: flex; gap: 24px; justify-content: center; margin: 20px 0; }
        .stat-value { font-size: 32px; font-weight: 700; color: #7c3aed; }
        .stat-label { color: #71717a; font-size: 12px; }
        .progress { width: 100%; height: 8px; background: #27272a; border-radius: 4px; margin: 16px 0; }
        .progress-fill { height: 100%; background: #7c3aed; border-radius: 4px; }
        .logs { background: #0f0f10; border-radius: 8px; padding: 16px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; }
        .settings { background: #1a1a2e; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .setting-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .setting-row label { font-size: 13px; color: #a1a1aa; min-width: 140px; }
        .setting-row input { width: 80px; padding: 8px; background: #27272a; border: 1px solid #3f3f46; color: white; border-radius: 6px; }
        .center { text-align: center; }
        .tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #18181b; padding: 4px; border-radius: 10px; width: fit-content; }
        .tab { padding: 10px 20px; border-radius: 8px; cursor: pointer; }
        .tab.active { background: #7c3aed; }
        .report-table { width: 100%; font-size: 13px; }
        .report-table th { text-align: left; padding: 12px; background: #27272a; }
        .report-table td { padding: 12px; border-bottom: 1px solid #27272a; }
        .report-table a { color: #a78bfa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 TikTok Direct Commenter</h1>
        <p class="subtitle">Auto-comment on TikTok videos</p>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('main')">🎮 Control</div>
            <div class="tab" onclick="showTab('report')">📊 Report</div>
        </div>
        
        <div id="tab-main">
            <div class="grid">
                <div class="card">
                    <div class="card-title"><span>Profiles</span><span id="pc" style="color:#71717a">0</span></div>
                    <div style="display:flex;gap:8px;margin-bottom:12px;">
                        <button class="btn btn-secondary" onclick="sync()">🔄 Sync</button>
                        <button class="btn btn-secondary" onclick="loadC()">📄 Comments</button>
                        <button class="btn btn-secondary" onclick="selAll()">Select All</button>
                    </div>
                    <div class="profile-list" id="pl"></div>
                </div>
                <div class="card">
                    <div class="card-title">Control</div>
                    <div class="settings">
                        <div class="setting-row"><label>Min delay (s):</label><input type="number" id="mind" value="30"></div>
                        <div class="setting-row"><label>Max delay (s):</label><input type="number" id="maxd" value="60"></div>
                        <div class="setting-row"><label>Videos/profile:</label><input type="number" id="vpp" value="10"></div>
                    </div>
                    <div class="stats">
                        <div class="stat"><div class="stat-value" id="sp">0</div><div class="stat-label">Profiles</div></div>
                        <div class="stat"><div class="stat-value" id="sc">0</div><div class="stat-label">Comments</div></div>
                    </div>
                    <div class="progress"><div class="progress-fill" id="prog" style="width:0%"></div></div>
                    <p class="center" style="color:#71717a" id="st">Ready</p>
                    <div class="center" style="margin-top:20px;">
                        <button class="btn btn-success" id="startb" onclick="start()">▶ Start</button>
                        <button class="btn btn-danger" id="stopb" onclick="stop()" style="display:none">⏹ Stop</button>
                    </div>
                </div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-title"><span>Log</span><button class="btn btn-secondary" style="padding:4px 8px" onclick="clrLog()">Clear</button></div>
                <div class="logs" id="logs">Ready...</div>
            </div>
        </div>
        
        <div id="tab-report" style="display:none">
            <div class="card">
                <div class="card-title"><span>Report</span><span id="rc" style="color:#71717a">0</span></div>
                <button class="btn btn-primary" onclick="expCSV()" style="margin-bottom:16px">📥 Export CSV</button>
                <div style="max-height:400px;overflow:auto">
                    <table class="report-table"><thead><tr><th>Time</th><th>Profile</th><th>Comment</th><th>Link</th></tr></thead><tbody id="rb"></tbody></table>
                </div>
            </div>
        </div>
    </div>
    <script>
        let profiles=[],selected=new Set(),sheetMap={},report=[];
        const SHEETS=['Bump Connect','Bump Syndicate','Kollabsy'];
        setInterval(upd,1000);
        function showTab(t){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));event.target.classList.add('active');document.getElementById('tab-main').style.display=t=='main'?'block':'none';document.getElementById('tab-report').style.display=t=='report'?'block':'none';}
        async function sync(){const r=await fetch('/api/sync-profiles',{method:'POST'});profiles=(await r.json()).profiles||[];render();}
        async function loadC(){const r=await fetch('/api/load-comments',{method:'POST'});const d=await r.json();alert('Loaded:\\n'+Object.entries(d.counts).map(([k,v])=>k+': '+v).join('\\n'));}
        function render(){const e=document.getElementById('pl');if(!profiles.length){e.innerHTML='<div style="text-align:center;color:#71717a;padding:40px">Click Sync</div>';return;}e.innerHTML=profiles.map(p=>'<div class="profile '+(selected.has(p.user_id)?'selected':'')+'" onclick="tog(\\''+p.user_id+'\\')"><input type="checkbox" '+(selected.has(p.user_id)?'checked':'')+' onclick="event.stopPropagation();tog(\\''+p.user_id+'\\')"><div style="flex:1"><div style="font-weight:500">'+(p.name||p.user_id)+'</div><div style="font-size:11px;color:#71717a">'+p.user_id+'</div></div><select onclick="event.stopPropagation()" onchange="sheetMap[\\''+p.user_id+'\\']=this.value">'+SHEETS.map(s=>'<option'+(sheetMap[p.user_id]==s?' selected':'')+'>'+s+'</option>').join('')+'</select></div>').join('');document.getElementById('pc').textContent=profiles.length;}
        function tog(id){selected.has(id)?selected.delete(id):selected.add(id);if(!sheetMap[id])sheetMap[id]=SHEETS[0];render();}
        function selAll(){if(selected.size==profiles.length)selected.clear();else profiles.forEach(p=>{selected.add(p.user_id);sheetMap[p.user_id]=sheetMap[p.user_id]||SHEETS[0];});render();}
        async function start(){if(!selected.size){alert('Select profiles');return;}await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({min_delay:+document.getElementById('mind').value,max_delay:+document.getElementById('maxd').value,videos_per_profile:+document.getElementById('vpp').value})});await fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile_ids:[...selected],sheet_mapping:sheetMap})});document.getElementById('startb').style.display='none';document.getElementById('stopb').style.display='inline';}
        async function stop(){await fetch('/api/stop',{method:'POST'});}
        async function upd(){try{const r=await fetch('/api/status');const d=await r.json();document.getElementById('prog').style.width=(d.total?(d.progress/d.total*100):0)+'%';document.getElementById('sp').textContent=d.completed.length;document.getElementById('sc').textContent=d.comments_posted||0;document.getElementById('st').textContent=d.running?'Running: '+d.current_profile:'Ready';if(!d.running){document.getElementById('startb').style.display='inline';document.getElementById('stopb').style.display='none';}if(d.logs.length)document.getElementById('logs').innerHTML=d.logs.map(l=>'<div style="color:'+(l.includes('✗')?'#f87171':l.includes('✓')?'#4ade80':'#a1a1aa')+'">'+l+'</div>').join('');if(d.report){report=d.report;document.getElementById('rc').textContent=report.length;document.getElementById('rb').innerHTML=report.length?report.map(r=>'<tr><td>'+r.timestamp+'</td><td>'+r.profile+'</td><td>'+r.comment.substring(0,40)+'</td><td><a href="'+r.video_url+'" target="_blank">🔗</a></td></tr>').join(''):'<tr><td colspan="4" style="text-align:center;color:#71717a">No data</td></tr>';}}catch(e){}}
        function clrLog(){fetch('/api/clear-logs',{method:'POST'});document.getElementById('logs').innerHTML='Cleared';}
        function expCSV(){if(!report.length)return alert('No data');const csv='Time,Profile,Comment,URL\\n'+report.map(r=>r.timestamp+','+r.profile+',"'+r.comment.replace(/"/g,'""')+'",'+r.video_url).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv]));a.download='comments.csv';a.click();}
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

@app.route('/api/settings', methods=['POST'])
def api_settings():
    global settings
    settings.update(request.json)
    return jsonify({"ok": True})

@app.route('/api/start', methods=['POST'])
def api_start():
    if automation_status["running"]:
        return jsonify({"error": "Running"}), 400
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
    print("  TikTok Commenter - http://localhost:9090")
    print("=" * 50)
    app.run(host="0.0.0.0", port=9090, debug=False)
