#!/usr/bin/env python3
"""
AdsPower TikTok Direct Commenter
================================
Directly comments on TikTok videos without Rebotou.

Features:
- Random delays between comments (avoid detection)
- Skips videos already commented on
- Gets comments from Google Sheets
- Works with all your AdsPower profiles

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

# Timing settings (in seconds)
MIN_DELAY_BETWEEN_COMMENTS = 30  # Minimum wait between comments
MAX_DELAY_BETWEEN_COMMENTS = 60  # Maximum wait between comments
VIDEOS_PER_PROFILE = 10          # How many videos to comment on per profile

# =============================================================================
# GLOBAL STATE
# =============================================================================
app = Flask(__name__)
profiles = []
comments_cache = {}
commented_videos = set()  # Track videos we've already commented on

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
    "comments_posted": 0
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
            next(reader, None)  # Skip header
            comments = [row[0].strip() for row in reader if row and row[0].strip()]
            comments_cache[sheet_name] = comments
            log(f"✓ Loaded {len(comments)} comments from '{sheet_name}'")
            return comments
    except Exception as e:
        log(f"✗ Error loading comments: {e}")
    return []

def open_browser(profile_id):
    """Open AdsPower browser and return connection info"""
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
    """Get a random comment from the sheet"""
    comments = comments_cache.get(sheet_name, [])
    if comments:
        return random.choice(comments)
    return None

def run_tiktok_commenter(ws_endpoint, profile_name, sheet_name):
    """Connect to browser and comment on TikTok videos"""
    global commented_videos
    
    if not HAS_PLAYWRIGHT:
        log("  ✗ Playwright not installed!")
        return False
    
    videos_commented = 0
    target_videos = settings["videos_per_profile"]
    
    with sync_playwright() as p:
        try:
            # Connect to AdsPower browser
            browser = p.chromium.connect_over_cdp(ws_endpoint)
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()
            
            log(f"  ✓ Connected to browser")
            
            # Go to TikTok For You page
            log(f"  → Navigating to TikTok...")
            page.goto("https://www.tiktok.com/foryou", timeout=60000)
            time.sleep(5)
            
            # Wait for page to be ready
            try:
                page.wait_for_selector('video', timeout=15000)
                log(f"  ✓ TikTok loaded")
            except:
                log(f"  ⚠ Page loaded but no video found yet, continuing...")
            
            # Process videos
            for video_num in range(target_videos):
                if not automation_status["running"]:
                    log(f"  ⏹ Stopped by user")
                    break
                
                log(f"  📹 Video {video_num + 1}/{target_videos}")
                
                try:
                    # Get current video URL/ID
                    current_url = page.url
                    video_id = current_url.split("/")[-1].split("?")[0] if "/video/" in current_url else f"fyp_{video_num}"
                    
                    # Check if we already commented on this video
                    if video_id in commented_videos:
                        log(f"    ⏭ Already commented, skipping...")
                        page.keyboard.press("ArrowDown")
                        time.sleep(2)
                        continue
                    
                    # Step 1: Click the comment icon (speech bubble)
                    log(f"    → Looking for comment icon...")
                    comment_clicked = False
                    
                    # The comment icon is near the like count, has a speech bubble shape
                    comment_selectors = [
                        '[data-e2e="comment-icon"]',
                        'button[aria-label*="comment" i]',
                        'span[data-e2e="comment-icon"]',
                        # Try clicking by the number pattern (52, etc)
                        '//button[contains(@class, "comment")]',
                    ]
                    
                    # Try to find comment button by looking for elements with comment-related attributes
                    try:
                        # Look for the comment button near the action buttons
                        comment_btn = page.locator('button').filter(has=page.locator('svg')).nth(1)  # Usually 2nd button after like
                        if comment_btn.is_visible(timeout=2000):
                            comment_btn.click()
                            comment_clicked = True
                            log(f"    ✓ Clicked comment icon")
                    except:
                        pass
                    
                    if not comment_clicked:
                        # Alternative: Try clicking any element that looks like comment section opener
                        try:
                            page.click('[class*="comment" i]', timeout=3000)
                            comment_clicked = True
                            log(f"    ✓ Clicked comment area")
                        except:
                            pass
                    
                    time.sleep(2)
                    
                    # Step 2: Find the comment input ("Aggiungi commento..." or similar)
                    log(f"    → Looking for comment input...")
                    
                    input_selectors = [
                        '[data-e2e="comment-input"]',
                        'div[contenteditable="true"]',
                        '[placeholder*="comment" i]',
                        '[placeholder*="commento" i]',
                        '[placeholder*="Aggiungi" i]',
                        'div[data-contents="true"]',
                        '[class*="DraftEditor"]',
                        '[class*="CommentInput"]',
                    ]
                    
                    comment_input = None
                    for selector in input_selectors:
                        try:
                            el = page.locator(selector).first
                            if el.is_visible(timeout=2000):
                                comment_input = el
                                log(f"    ✓ Found input with: {selector}")
                                break
                        except:
                            continue
                    
                    if not comment_input:
                        # Try finding by placeholder text
                        try:
                            comment_input = page.get_by_placeholder("Aggiungi", exact=False).first
                            if comment_input.is_visible(timeout=2000):
                                log(f"    ✓ Found input by placeholder")
                        except:
                            pass
                    
                    if comment_input and comment_input.is_visible():
                        # Get random comment
                        comment_text = get_random_comment(sheet_name)
                        if not comment_text:
                            log(f"    ⚠ No comments available")
                            page.keyboard.press("ArrowDown")
                            time.sleep(2)
                            continue
                        
                        # Click the input to focus it
                        comment_input.click()
                        time.sleep(0.5)
                        
                        # Type the comment
                        log(f"    → Typing comment...")
                        page.keyboard.type(comment_text, delay=30)
                        time.sleep(1)
                        
                        # Step 3: Click "Pubblica" button or press Enter
                        log(f"    → Posting comment...")
                        posted = False
                        
                        # Look for Pubblica/Post button
                        post_selectors = [
                            'button:has-text("Pubblica")',
                            'button:has-text("Post")',
                            '[data-e2e="comment-post"]',
                            'div:has-text("Pubblica")',
                            'span:has-text("Pubblica")',
                        ]
                        
                        for selector in post_selectors:
                            try:
                                btn = page.locator(selector).first
                                if btn.is_visible(timeout=1500):
                                    btn.click()
                                    posted = True
                                    log(f"    ✓ Clicked Pubblica")
                                    break
                            except:
                                continue
                        
                        if not posted:
                            # Try clicking by text
                            try:
                                page.get_by_text("Pubblica", exact=True).click()
                                posted = True
                                log(f"    ✓ Clicked Pubblica by text")
                            except:
                                # Fallback: press Ctrl+Enter or just Enter
                                page.keyboard.press("Control+Enter")
                                log(f"    → Pressed Ctrl+Enter")
                        
                        time.sleep(2)
                        
                        # Mark as commented
                        commented_videos.add(video_id)
                        videos_commented += 1
                        automation_status["comments_posted"] += 1
                        
                        log(f"    ✓ Posted: \"{comment_text[:40]}...\"")
                        
                        # Close comment panel by pressing Escape
                        page.keyboard.press("Escape")
                        time.sleep(1)
                        
                        # Random delay before next video
                        delay = random.randint(settings["min_delay"], settings["max_delay"])
                        log(f"    ⏳ Waiting {delay}s...")
                        
                        for i in range(delay):
                            if not automation_status["running"]:
                                break
                            time.sleep(1)
                    else:
                        log(f"    ⚠ Comment input not found")
                    
                except Exception as e:
                    log(f"    ✗ Error on video: {e}")
                
                # Scroll to next video
                log(f"    → Scrolling to next video...")
                page.keyboard.press("ArrowDown")
                time.sleep(2)
            
            log(f"  ✓ Finished: {videos_commented} comments posted")
            browser.close()
            return videos_commented > 0
            
        except Exception as e:
            log(f"  ✗ Error: {e}")
            return False

def run_automation_thread(profile_ids, sheet_mapping):
    global automation_status
    
    automation_status["running"] = True
    automation_status["progress"] = 0
    automation_status["total"] = len(profile_ids)
    automation_status["completed"] = []
    automation_status["logs"] = []
    automation_status["comments_posted"] = 0
    
    log(f"{'='*50}")
    log(f"Starting TikTok Commenter for {len(profile_ids)} profiles")
    log(f"Videos per profile: {settings['videos_per_profile']}")
    log(f"Delay between comments: {settings['min_delay']}-{settings['max_delay']}s")
    log(f"{'='*50}")
    
    # Pre-load all comments
    for sheet in set(sheet_mapping.values()):
        if sheet not in comments_cache:
            fetch_google_sheet_comments(sheet)
    
    for i, profile_id in enumerate(profile_ids):
        if not automation_status["running"]:
            log("⏹ Stopped by user")
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
            log(f"  ✗ Failed to open browser, skipping...")
            continue
        
        ws_endpoint = browser_data.get("ws", {}).get("puppeteer")
        if not ws_endpoint:
            log(f"  ✗ No WebSocket endpoint, skipping...")
            close_browser(profile_id)
            continue
        
        log(f"  ✓ Browser opened")
        
        # Run commenter
        success = run_tiktok_commenter(ws_endpoint, profile_name, sheet_name)
        
        # Close browser
        log(f"  Closing browser...")
        close_browser(profile_id)
        log(f"  ✓ Browser closed")
        
        if success:
            automation_status["completed"].append(profile_id)
        
        # Wait between profiles
        if i < len(profile_ids) - 1 and automation_status["running"]:
            wait = random.randint(10, 20)
            log(f"  Waiting {wait}s before next profile...")
            time.sleep(wait)
    
    automation_status["running"] = False
    automation_status["current_profile"] = None
    log(f"\n{'='*50}")
    log(f"✓ DONE!")
    log(f"  Profiles completed: {len(automation_status['completed'])}/{len(profile_ids)}")
    log(f"  Total comments posted: {automation_status['comments_posted']}")
    log(f"{'='*50}")

# =============================================================================
# WEB DASHBOARD
# =============================================================================
DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>TikTok Direct Commenter</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0b; color: #e4e4e7; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #71717a; font-size: 14px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; }
        .card-title { font-weight: 600; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .btn { padding: 10px 20px; border-radius: 8px; border: none; font-size: 14px; cursor: pointer; transition: all 0.15s; }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-secondary { background: #27272a; color: #e4e4e7; }
        .btn-success { background: #16a34a; color: white; font-size: 16px; padding: 14px 32px; }
        .btn-danger { background: #dc2626; color: white; }
        .profile { display: flex; align-items: center; padding: 12px; background: #27272a; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
        .profile:hover { background: #3f3f46; }
        .profile.selected { background: #4c1d95; border: 1px solid #7c3aed; }
        .profile input[type="checkbox"] { margin-right: 12px; width: 18px; height: 18px; }
        .profile-info { flex: 1; }
        .profile-name { font-weight: 500; font-size: 14px; }
        .profile-id { color: #71717a; font-size: 12px; }
        .profile-list { max-height: 350px; overflow-y: auto; margin-top: 12px; }
        select { padding: 6px 10px; background: #18181b; border: 1px solid #3f3f46; color: #e4e4e7; border-radius: 6px; font-size: 12px; }
        .stats { display: flex; gap: 24px; justify-content: center; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 32px; font-weight: 700; color: #7c3aed; }
        .stat-label { color: #71717a; font-size: 12px; margin-top: 4px; }
        .progress { width: 100%; height: 8px; background: #27272a; border-radius: 4px; margin: 16px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a855f7); border-radius: 4px; transition: width 0.3s; }
        .logs { background: #0f0f10; border-radius: 8px; padding: 16px; height: 300px; overflow-y: auto; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; line-height: 1.7; }
        .log-entry { color: #a1a1aa; white-space: pre-wrap; }
        .log-entry.error { color: #f87171; }
        .log-entry.success { color: #4ade80; }
        .actions { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .settings { background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .settings h4 { font-size: 14px; margin-bottom: 12px; color: #a78bfa; }
        .setting-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .setting-row label { font-size: 13px; color: #a1a1aa; min-width: 140px; }
        .setting-row input { width: 80px; padding: 8px; background: #27272a; border: 1px solid #3f3f46; color: white; border-radius: 6px; font-size: 13px; }
        .center { text-align: center; }
        .warning { background: #422006; border: 1px solid #854d0e; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #fbbf24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 TikTok Direct Commenter</h1>
        <p class="subtitle">Automatically comment on TikTok videos with random delays</p>
        
        <div class="grid">
            <!-- Left: Profiles -->
            <div class="card">
                <div class="card-title">
                    <span>Browser Profiles</span>
                    <span id="profile-count" style="color:#71717a; font-weight:normal; font-size:13px;">0 profiles</span>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary" onclick="syncProfiles()">🔄 Sync Profiles</button>
                    <button class="btn btn-secondary" onclick="loadComments()">📄 Load Comments</button>
                    <button class="btn btn-secondary" onclick="selectAll()">Select All</button>
                </div>
                <div class="profile-list" id="profile-list">
                    <div style="text-align:center; color:#71717a; padding:50px 20px;">
                        Click "Sync Profiles" to load your AdsPower profiles
                    </div>
                </div>
            </div>
            
            <!-- Right: Control -->
            <div class="card">
                <div class="card-title">Settings & Control</div>
                
                <div class="warning">
                    ⚠️ Use random delays to avoid detection. Don't comment too fast or TikTok may flag your account.
                </div>
                
                <div class="settings">
                    <h4>⚙️ Timing Settings</h4>
                    <div class="setting-row">
                        <label>Min delay (seconds):</label>
                        <input type="number" id="min-delay" value="30" min="10">
                    </div>
                    <div class="setting-row">
                        <label>Max delay (seconds):</label>
                        <input type="number" id="max-delay" value="60" min="20">
                    </div>
                    <div class="setting-row">
                        <label>Videos per profile:</label>
                        <input type="number" id="videos-per-profile" value="10" min="1" max="50">
                    </div>
                    <button class="btn btn-secondary" onclick="saveSettings()" style="margin-top:8px;">💾 Save Settings</button>
                </div>
                
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value" id="stat-profiles">0</div>
                        <div class="stat-label">Profiles Done</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value" id="stat-comments">0</div>
                        <div class="stat-label">Comments Posted</div>
                    </div>
                </div>
                
                <div class="progress"><div class="progress-fill" id="progress" style="width:0%"></div></div>
                <p class="center" style="color:#71717a; font-size:13px;" id="status-text">Ready to start</p>
                
                <div class="center" style="margin-top:20px;">
                    <button class="btn btn-success" id="start-btn" onclick="startAutomation()">▶ Start Commenting</button>
                    <button class="btn btn-danger" id="stop-btn" onclick="stopAutomation()" style="display:none;">⏹ Stop</button>
                </div>
            </div>
        </div>
        
        <!-- Logs -->
        <div class="card" style="margin-top:20px;">
            <div class="card-title">
                <span>📋 Activity Log</span>
                <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="clearLogs()">Clear</button>
            </div>
            <div class="logs" id="logs">Waiting to start...</div>
        </div>
    </div>
    
    <script>
        let profiles = [];
        let selected = new Set();
        let sheetMap = {};
        const SHEETS = ['Bump Connect', 'Bump Syndicate', 'Kollabsy'];
        
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
                el.innerHTML = '<div style="text-align:center;color:#71717a;padding:50px 20px;">No profiles found. Is AdsPower running?</div>';
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
                        ${SHEETS.map(s => `<option value="${s}" ${sheetMap[p.user_id]===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
            `).join('');
            document.getElementById('profile-count').textContent = profiles.length + ' profiles';
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
        
        async function saveSettings() {
            await fetch('/api/settings', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    min_delay: parseInt(document.getElementById('min-delay').value),
                    max_delay: parseInt(document.getElementById('max-delay').value),
                    videos_per_profile: parseInt(document.getElementById('videos-per-profile').value)
                })
            });
            alert('Settings saved!');
        }
        
        async function startAutomation() {
            if (!selected.size) { alert('Select at least one profile'); return; }
            await saveSettings();
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
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                
                const pct = data.total ? (data.progress / data.total * 100) : 0;
                document.getElementById('progress').style.width = pct + '%';
                document.getElementById('stat-profiles').textContent = data.completed.length;
                document.getElementById('stat-comments').textContent = data.comments_posted || 0;
                
                if (data.running) {
                    document.getElementById('status-text').textContent = `Running: ${data.current_profile} (${data.progress}/${data.total})`;
                    document.getElementById('start-btn').style.display = 'none';
                    document.getElementById('stop-btn').style.display = 'inline';
                } else {
                    document.getElementById('start-btn').style.display = 'inline';
                    document.getElementById('stop-btn').style.display = 'none';
                    if (data.comments_posted > 0) {
                        document.getElementById('status-text').textContent = `Done! ${data.comments_posted} comments posted`;
                    }
                }
                
                if (data.logs.length) {
                    const logsEl = document.getElementById('logs');
                    logsEl.innerHTML = data.logs.map(l => {
                        let cls = 'log-entry';
                        if (l.includes('✗') || l.includes('Error')) cls += ' error';
                        if (l.includes('✓') || l.includes('Posted')) cls += ' success';
                        return `<div class="${cls}">${l}</div>`;
                    }).join('');
                    logsEl.scrollTop = logsEl.scrollHeight;
                }
            } catch(e) {}
        }
        
        function clearLogs() {
            fetch('/api/clear-logs', {method:'POST'});
            document.getElementById('logs').innerHTML = 'Logs cleared';
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
def api_check():
    try:
        response = requests.get(f"{ADSPOWER_API}/api/v1/user/list?page_size=1", timeout=3)
        return jsonify({"connected": response.status_code == 200})
    except:
        return jsonify({"connected": False})

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
    data = request.json
    settings.update(data)
    log(f"Settings updated: {settings}")
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
    log("⏹ Stop requested")
    return jsonify({"ok": True})

@app.route('/api/clear-logs', methods=['POST'])
def api_clear_logs():
    automation_status["logs"] = []
    return jsonify({"ok": True})

# =============================================================================
# MAIN
# =============================================================================
if __name__ == "__main__":
    print("=" * 50)
    print("  TikTok Direct Commenter")
    print("  Open: http://localhost:9090")
    print("=" * 50)
    print()
    
    if not HAS_PLAYWRIGHT:
        print("⚠️  Install playwright:")
        print("   pip install playwright")
        print("   playwright install chromium")
        print()
    
    app.run(host="0.0.0.0", port=9090, debug=False)
