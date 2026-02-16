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
from concurrent.futures import ThreadPoolExecutor, as_completed
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
SHEET_NAMES = ["Bump Connect", "Kollabsy", "Bump Syndicate"]

# Cloud API for real-time reporting (update this URL after deployment)
CLOUD_API_URL = "https://profile-reports-sync.preview.emergentagent.com/api"

MIN_DELAY_BETWEEN_COMMENTS = 30
MAX_DELAY_BETWEEN_COMMENTS = 60
VIDEOS_PER_PROFILE = 100  # Target: 100 videos per profile per day

# =============================================================================
# GLOBAL STATE
# =============================================================================
app = Flask(__name__)
profiles = []
comments_cache = {}
commented_videos = set()

REPORT_FILE = "tiktok_comments_history.json"

settings = {
    "min_delay": MIN_DELAY_BETWEEN_COMMENTS,
    "max_delay": MAX_DELAY_BETWEEN_COMMENTS,
    "videos_per_profile": VIDEOS_PER_PROFILE,
    "parallel_browsers": 2,  # Fixed at 2 browsers at a time
    "target_hashtag": "",  # Target hashtag to search (e.g., #socialmedia)
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

def load_report_history():
    """Load past reports from file on startup"""
    global automation_status
    try:
        with open(REPORT_FILE, 'r') as f:
            data = json.load(f)
            automation_status["report"] = data.get("report", [])
            automation_status["comments_posted"] = len(automation_status["report"])
            print(f"✓ Loaded {len(automation_status['report'])} comments from history")
    except FileNotFoundError:
        print("No history file found, starting fresh")
        automation_status["report"] = []
        automation_status["comments_posted"] = 0
    except Exception as e:
        print(f"Error loading history: {e}")
        automation_status["report"] = []
        automation_status["comments_posted"] = 0

def save_report_history():
    """Save ALL reports to file for persistence"""
    try:
        with open(REPORT_FILE, 'w') as f:
            json.dump({
                "report": automation_status["report"],
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }, f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

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

# Promotional comments - natural with website links
PROMO_COMMENTS = {
    "Bump Connect": [
        "omg this reminds me of something I saw on Bump Connect 😂 bumpconnect.xyz",
        "the creator community on Bump Connect would love this - bumpconnect.xyz",
        "giving Bump Connect vibes fr fr ✨ bumpconnect.xyz",
        "this is the type of content we share on Bump Connect 🔥 bumpconnect.xyz",
        "you should post this on Bump Connect too! bumpconnect.xyz",
        "I found so many creators like you on Bump Connect - check bumpconnect.xyz",
        "Bump Connect creators are doing stuff like this 👀 bumpconnect.xyz",
        "love this! the Bump Connect community needs to see this - bumpconnect.xyz",
        "this is why I love Bump Connect bumpconnect.xyz 🙌",
        "just shared this with my Bump Connect group - join at bumpconnect.xyz",
        "Bump Connect vibes ✨ bumpconnect.xyz",
        "anyone else here from Bump Connect? 🙋 bumpconnect.xyz",
        "this would blow up on Bump Connect - bumpconnect.xyz",
        "Bump Connect creators doing it right 💯 bumpconnect.xyz",
        "found you through Bump Connect btw! bumpconnect.xyz",
        "Bump Connect fam where you at 🔥 bumpconnect.xyz",
        "this creator gets it, Bump Connect type content - bumpconnect.xyz",
        "saving this for my Bump Connect friends 😂 bumpconnect.xyz",
        "if you're a creator check out bumpconnect.xyz 🚀",
        "creators supporting creators 🙌 bumpconnect.xyz",
    ],
    "Kollabsy": [
        "this is the collab energy we need ✨ kollabsy.xyz",
        "found amazing collabs like this on Kollabsy - kollabsy.xyz",
        "Kollabsy creators would love to collab with you! kollabsy.xyz",
        "giving me Kollabsy collab ideas rn 😂 kollabsy.xyz",
        "the Kollabsy community appreciates this 🙌 kollabsy.xyz",
        "this is what Kollabsy collabs look like - kollabsy.xyz",
        "you should check out Kollabsy for collabs! kollabsy.xyz",
        "Kollabsy energy right here ✨ kollabsy.xyz",
        "I found my collab partner on Kollabsy 🔥 kollabsy.xyz",
        "looking for collabs? check kollabsy.xyz",
        "collab with creators like this at kollabsy.xyz 🤝",
        "Kollabsy is where the real collabs happen - kollabsy.xyz",
    ],
    "Bump Syndicate": [
        "this is what we talk about in Bump Syndicate 😂 bumpsyndicate.xyz",
        "Bump Syndicate community would appreciate this - bumpsyndicate.xyz",
        "giving Bump Syndicate group chat energy 🔥 bumpsyndicate.xyz",
        "just shared this in Bump Syndicate - join at bumpsyndicate.xyz",
        "the Bump Syndicate fam needs to see this 👀 bumpsyndicate.xyz",
        "this is Bump Syndicate approved content 💯 bumpsyndicate.xyz",
        "Bump Syndicate creators doing it different - bumpsyndicate.xyz",
        "love finding content like this ✨ bumpsyndicate.xyz",
        "Bump Syndicate gang where you at 🔥 bumpsyndicate.xyz",
        "posting this to Bump Syndicate rn - bumpsyndicate.xyz",
        "join the best creator community at bumpsyndicate.xyz 🙌",
        "creator growth tips at bumpsyndicate.xyz",
    ]
}

def get_random_comment(sheet_name):
    """Get a random promotional comment for one of the brands"""
    # Pick a random brand
    brand = random.choice(list(PROMO_COMMENTS.keys()))
    comments = PROMO_COMMENTS[brand]
    
    if comments:
        comment = random.choice(comments)
        return comment, brand
    return None, None

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
            
            # Close extra TikTok tabs only, keep AdsPower tab
            log(f"  → Cleaning up TikTok tabs...")
            pages = context.pages
            tiktok_tabs = []
            
            for p in pages:
                try:
                    if "tiktok" in p.url.lower():
                        tiktok_tabs.append(p)
                except:
                    pass
            
            # Close all TikTok tabs except keep first one (or close all if multiple)
            if len(tiktok_tabs) > 1:
                for p in tiktok_tabs[1:]:  # Keep first, close rest
                    try:
                        p.close()
                    except:
                        pass
                log(f"  ✓ Closed {len(tiktok_tabs)-1} extra TikTok tab(s)")
                page = tiktok_tabs[0]  # Use existing TikTok tab
            elif len(tiktok_tabs) == 1:
                page = tiktok_tabs[0]  # Use existing TikTok tab
            else:
                # No TikTok tab, create new one (keeps AdsPower tab open)
                page = context.new_page()
            
            # Go to TikTok - either For You or target hashtag
            target_hashtag = settings.get("target_hashtag", "").strip()
            
            if target_hashtag:
                # Clean hashtag (remove # if present)
                hashtag = target_hashtag.replace("#", "").strip()
                tiktok_url = f"https://www.tiktok.com/tag/{hashtag}"
                log(f"  → Opening TikTok #{hashtag}...")
            else:
                tiktok_url = "https://www.tiktok.com/foryou"
                log(f"  → Opening TikTok For You...")
            
            try:
                page.goto(tiktok_url, wait_until="domcontentloaded", timeout=90000)
            except Exception as e:
                log(f"  ⚠ Slow load, continuing anyway...")
            
            time.sleep(8)  # Give more time for content to load
            
            # Check if logged in
            current_url = page.url
            log(f"  📍 URL: {current_url}")
            
            # Check if redirected to login
            if "login" in current_url.lower() or "signup" in current_url.lower():
                log(f"  ⚠ NOT LOGGED IN - Closing browser automatically")
                browser.close()
                return False
            
            # Also check page content for login prompts
            try:
                login_check = page.evaluate('''() => {
                    const text = document.body.innerText.toLowerCase();
                    if (text.includes('log in') && text.includes('sign up')) return true;
                    if (document.querySelector('[data-e2e="login-button"]')) return true;
                    if (document.querySelector('a[href*="login"]')) return true;
                    return false;
                }''')
                if login_check:
                    log(f"  ⚠ LOGIN REQUIRED - Closing browser automatically")
                    browser.close()
                    return False
            except:
                pass
            
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
                    # Check if login popup appeared
                    current_url = page.url
                    if "login" in current_url.lower():
                        log(f"  ⚠ Login page detected - closing browser")
                        browser.close()
                        return videos_commented > 0
                    
                    # Check if on hashtag/search page (grid view) - need to click video first
                    if "/tag/" in current_url or "/search" in current_url:
                        log(f"    → Grid view - clicking video to open...")
                        
                        # Scroll down a bit to load videos
                        page.evaluate('window.scrollBy(0, 300)')
                        time.sleep(1)
                        
                        # Click on a video in the grid
                        clicked_video = page.evaluate('''(videoIndex) => {
                            // Find all video cards/thumbnails
                            const videoSelectors = [
                                '[data-e2e="search_top-item"]',
                                '[data-e2e="search-card-user-link"]',
                                '[class*="DivItemCardContainer"]',
                                '[class*="ItemCard"]',
                                '[class*="video-feed-item"]',
                                '[class*="DivWrapper"]',
                                'a[href*="/video/"]'
                            ];
                            
                            for (let selector of videoSelectors) {
                                const videos = document.querySelectorAll(selector);
                                if (videos.length > videoIndex) {
                                    // Click on the video at the given index
                                    const video = videos[videoIndex];
                                    if (video) {
                                        video.click();
                                        return {success: true, method: selector, count: videos.length};
                                    }
                                }
                            }
                            
                            // Fallback: click any video thumbnail
                            const allLinks = document.querySelectorAll('a[href*="/video/"]');
                            if (allLinks.length > videoIndex) {
                                allLinks[videoIndex].click();
                                return {success: true, method: 'video-link', count: allLinks.length};
                            }
                            
                            // Last resort: click the video element itself
                            const videoElements = document.querySelectorAll('video');
                            if (videoElements.length > 0) {
                                videoElements[0].click();
                                return {success: true, method: 'video-element'};
                            }
                            
                            return {success: false, count: 0};
                        }''', video_num % 10)  # Cycle through first 10 videos
                        
                        if clicked_video and clicked_video.get('success'):
                            log(f"    ✓ Opened video ({clicked_video.get('method')}, {clicked_video.get('count')} found)")
                            time.sleep(4)  # Wait for video to load in full view
                            
                            # Check if video opened (URL should change to /video/)
                            new_url = page.url
                            if "/video/" not in new_url:
                                log(f"    ⚠ Video didn't open, trying direct navigation...")
                                # Try to find and navigate to video URL
                                video_url = page.evaluate('''() => {
                                    const link = document.querySelector('a[href*="/video/"]');
                                    return link ? link.href : null;
                                }''')
                                if video_url:
                                    page.goto(video_url, timeout=30000)
                                    time.sleep(3)
                        else:
                            log(f"    ⚠ Could not click video, scrolling to load more...")
                            page.keyboard.press("ArrowDown")
                            page.keyboard.press("ArrowDown")
                            time.sleep(2)
                            continue
                    
                    video_id = f"video_{video_num}_{int(time.time())}"
                    
                    if video_id in commented_videos:
                        log(f"    ⏭ Skip")
                        page.keyboard.press("ArrowDown")
                        time.sleep(2)
                        continue
                    
                    # STEP 1: Click comment icon using JavaScript (avoid share button!)
                    log(f"    → Opening comments...")
                    
                    # First close any share dialogs that might be open
                    page.evaluate('''() => {
                        const closeBtn = document.querySelector('[class*="Close"], [aria-label="Close"], [aria-label*="schließen" i]');
                        if (closeBtn) closeBtn.click();
                    }''')
                    time.sleep(0.5)
                    
                    result = page.evaluate('''() => {
                        // Find comment button specifically - NOT share button
                        
                        // Method 1: data-e2e attribute (most reliable)
                        let btn = document.querySelector('[data-e2e="comment-icon"]');
                        if (btn) { btn.click(); return {success: true, method: 'data-e2e'}; }
                        
                        // Method 2: aria-label with comment in various languages
                        const commentLabels = ['comment', 'kommentar', 'commenti', 'comentar', 'commenter'];
                        for (let label of commentLabels) {
                            btn = document.querySelector('[aria-label*="' + label + '" i]');
                            if (btn && !btn.closest('[class*="share" i]')) { 
                                btn.click(); 
                                return {success: true, method: 'aria-label'}; 
                            }
                        }
                        
                        // Method 3: Find speech bubble icon (comment) vs arrow icon (share)
                        // Look at the action bar on the right side
                        const actionItems = document.querySelectorAll('[class*="DivActionItemContainer"], [class*="ActionItem"]');
                        let itemIndex = 0;
                        for (let item of actionItems) {
                            itemIndex++;
                            // Comment is usually 2nd item (after like), share is usually 4th or 5th
                            if (itemIndex === 2) {
                                const clickable = item.querySelector('button, [role="button"]') || item;
                                clickable.click();
                                return {success: true, method: 'action-item-2'};
                            }
                        }
                        
                        // Method 4: Find by looking at sibling structure
                        const likeBtn = document.querySelector('[data-e2e="like-icon"]');
                        if (likeBtn) {
                            const parent = likeBtn.closest('[class*="Container"]') || likeBtn.parentElement;
                            const nextSibling = parent.nextElementSibling;
                            if (nextSibling) {
                                const btn = nextSibling.querySelector('button, [role="button"]') || nextSibling;
                                btn.click();
                                return {success: true, method: 'like-sibling'};
                            }
                        }
                        
                        return {success: false};
                    }''')
                    
                    if result.get('success'):
                        log(f"    ✓ Comments opened ({result.get('method')})")
                    else:
                        log(f"    ⚠ Could not open comments")
                        page.keyboard.press("Escape")
                        page.keyboard.press("ArrowDown")
                        time.sleep(2)
                        continue
                    
                    time.sleep(2)
                    
                    # Check if share dialog opened instead (close it)
                    share_check = page.evaluate('''() => {
                        const shareDialog = document.querySelector('[class*="Share"], [class*="share"]');
                        if (shareDialog && shareDialog.innerText.toLowerCase().includes('copy')) {
                            const close = document.querySelector('[aria-label="Close"], [class*="Close"]');
                            if (close) close.click();
                            return true;
                        }
                        return false;
                    }''')
                    
                    if share_check:
                        log(f"    ⚠ Share dialog opened, trying again...")
                        time.sleep(1)
                        continue
                    
                    # STEP 2: Find and click comment input
                    log(f"    → Finding input...")
                    
                    result = page.evaluate('''() => {
                        // Find comment input - look for the input area at bottom of comment section
                        const selectors = [
                            '[data-e2e="comment-input"]',
                            '[placeholder*="commento" i]',
                            '[placeholder*="comment" i]',
                            '[placeholder*="Aggiungi" i]',
                            '[placeholder*="Add" i]',
                            '[class*="CommentInput"]',
                            '[class*="DivInputContainer"] [contenteditable="true"]',
                            'div[contenteditable="true"]'
                        ];
                        
                        for (let sel of selectors) {
                            const el = document.querySelector(sel);
                            if (el && el.offsetParent) {
                                el.click();
                                el.focus();
                                return {success: true, method: sel};
                            }
                        }
                        
                        // Try finding by text content
                        const allDivs = document.querySelectorAll('div[contenteditable], input, textarea');
                        for (let div of allDivs) {
                            const placeholder = div.getAttribute('placeholder') || div.innerText || '';
                            if (placeholder.toLowerCase().includes('comment') || 
                                placeholder.toLowerCase().includes('commento') ||
                                placeholder.toLowerCase().includes('aggiungi')) {
                                div.click();
                                div.focus();
                                return {success: true, method: 'text-search'};
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
                    
                    # Get comment from ALL sheets combined
                    comment_text, from_sheet = get_random_comment(sheet_name)
                    if not comment_text:
                        log(f"    ⚠ No comments loaded")
                        continue
                    
                    # STEP 3: Type comment
                    log(f"    → Typing ({from_sheet})...")
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
                        "sheet": from_sheet  # Track which sheet the comment came from
                    })
                    
                    # Save to file after each comment
                    save_report_history()
                    
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
                
                # Close any extra TikTok tabs that might have opened (keep AdsPower tab)
                try:
                    current_pages = context.pages
                    tiktok_pages = [p for p in current_pages if "tiktok" in p.url.lower()]
                    if len(tiktok_pages) > 1:
                        for p in tiktok_pages:
                            if p != page:
                                p.close()
                except:
                    pass
                
                # Navigate to next video
                current_url = page.url
                if "/video/" in current_url:
                    # In video view - go back to grid or scroll to next
                    log(f"    → Going to next video...")
                    page.keyboard.press("Escape")  # Close any dialogs
                    time.sleep(0.5)
                    
                    # Check if we should go back to hashtag grid
                    target_hashtag = settings.get("target_hashtag", "").strip()
                    if target_hashtag:
                        # Go back to hashtag page to pick another video
                        page.keyboard.press("Escape")  # Close video
                        time.sleep(1)
                        # If still on video page, navigate back
                        if "/video/" in page.url:
                            hashtag = target_hashtag.replace("#", "").strip()
                            page.goto(f"https://www.tiktok.com/tag/{hashtag}", wait_until="domcontentloaded", timeout=30000)
                            time.sleep(3)
                            # Scroll to load more videos
                            for _ in range(video_num // 3 + 1):
                                page.keyboard.press("ArrowDown")
                                time.sleep(0.3)
                    else:
                        # On For You page - just scroll down
                        page.keyboard.press("ArrowDown")
                else:
                    # Still on grid view
                    page.keyboard.press("ArrowDown")
                
                time.sleep(2)
            
            log(f"  ✓ Done: {videos_commented} comments")
            browser.close()
            return videos_commented > 0
            
    except Exception as e:
        log(f"  ✗ Error: {e}")
        log(f"  📋 {traceback.format_exc()}")
        return False

def run_single_profile(profile_id, sheet_name):
    """Run automation for a single profile - used for parallel execution"""
    profile = next((p for p in profiles if p.get("user_id") == profile_id), None)
    if not profile:
        return False
    
    profile_name = profile.get("name", profile_id)
    
    log(f"\n🚀 [{profile_name}] Starting...")
    log(f"  [{profile_name}] Sheet: {sheet_name}")
    
    # Open browser
    browser_data = open_browser(profile_id)
    if not browser_data:
        log(f"  [{profile_name}] ✗ Failed to open browser")
        return False
    
    ws_endpoint = browser_data.get("ws", {}).get("puppeteer")
    if not ws_endpoint:
        log(f"  [{profile_name}] ✗ No WebSocket")
        close_browser(profile_id)
        return False
    
    # Run commenter
    success = run_tiktok_commenter(ws_endpoint, profile_name, sheet_name)
    
    # Close browser
    log(f"  [{profile_name}] Closing browser...")
    close_browser(profile_id)
    
    if success:
        automation_status["completed"].append(profile_id)
        log(f"  [{profile_name}] ✓ Completed!")
    else:
        log(f"  [{profile_name}] ✗ Failed")
    
    return success

def run_automation_thread(profile_ids, sheet_mapping):
    global automation_status
    
    automation_status["running"] = True
    automation_status["progress"] = 0
    automation_status["total"] = len(profile_ids)
    automation_status["completed"] = []
    automation_status["logs"] = []
    # Keep existing report data - don't clear it!
    # comments_posted is total of ALL time
    
    parallel = 2  # Always run exactly 2 browsers at a time
    
    log(f"{'='*50}")
    log(f"Starting for {len(profile_ids)} profiles (Target: 25/day)")
    log(f"Running 2 browsers at a time until all {len(profile_ids)} finished")
    log(f"Target: {settings['videos_per_profile']} videos per profile")
    if settings.get('target_hashtag'):
        log(f"🎯 Targeting: #{settings['target_hashtag'].replace('#','')}")
    else:
        log(f"🎯 Targeting: For You Page")
    log(f"📢 Promoting: Bump Connect, Kollabsy, Bump Syndicate")
    log(f"Total target: {len(profile_ids) * settings['videos_per_profile']} comments")
    log(f"{'='*50}")
    
    # Comments are built-in promotional messages
    log(f"📢 Using promotional comments for: Bump Connect, Kollabsy, Bump Syndicate")
    
    # Run profiles in parallel batches
    with ThreadPoolExecutor(max_workers=parallel) as executor:
        futures = {}
        
        for profile_id in profile_ids:
            if not automation_status["running"]:
                break
            
            sheet_name = sheet_mapping.get(profile_id, SHEET_NAMES[0])
            future = executor.submit(run_single_profile, profile_id, sheet_name)
            futures[future] = profile_id
        
        # Wait for all to complete
        for future in as_completed(futures):
            if not automation_status["running"]:
                break
            
            profile_id = futures[future]
            automation_status["progress"] += 1
            
            try:
                future.result()
            except Exception as e:
                log(f"  ✗ Error for {profile_id}: {e}")
    
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
        .target-info { background: linear-gradient(135deg, #1e1b4b, #312e81); border: 1px solid #4c1d95; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .target-info h3 { font-size: 14px; color: #a78bfa; margin-bottom: 8px; }
        .target-stats { display: flex; gap: 32px; }
        .target-stat { text-align: center; }
        .target-stat .num { font-size: 28px; font-weight: 700; color: #fff; }
        .target-stat .lbl { font-size: 11px; color: #a1a1aa; }
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
        <h1>🎵 TikTok Auto Commenter</h1>
        <p class="subtitle">Daily target: 25 browsers × 100 videos = 2,500 comments</p>
        
        <div class="target-info">
            <h3>📊 Daily Target</h3>
            <div class="target-stats">
                <div class="target-stat"><div class="num">25</div><div class="lbl">Browsers/Day</div></div>
                <div class="target-stat"><div class="num">100</div><div class="lbl">Videos/Browser</div></div>
                <div class="target-stat"><div class="num">2,500</div><div class="lbl">Total Comments</div></div>
                <div class="target-stat"><div class="num">3</div><div class="lbl">Brands Promoted</div></div>
            </div>
            <div style="margin-top:12px;font-size:12px;color:#a1a1aa;">
                🎯 Promoting: <span style="color:#4ade80">Bump Connect</span> • <span style="color:#a78bfa">Kollabsy</span> • <span style="color:#fbbf24">Bump Syndicate</span>
            </div>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('main')">🎮 Control</div>
            <div class="tab" onclick="showTab('report')">📊 Report</div>
        </div>
        
        <div id="tab-main">
            <div class="grid">
                <div class="card">
                    <div class="card-title"><span>Profiles (Select 25)</span><span id="pc" style="color:#71717a">0</span></div>
                    <div style="display:flex;gap:8px;margin-bottom:12px;">
                        <button class="btn btn-secondary" onclick="sync()">🔄 Sync</button>
                        <button class="btn btn-secondary" onclick="selAll()">Select All 25</button>
                    </div>
                    <div class="profile-list" id="pl"></div>
                </div>
                <div class="card">
                    <div class="card-title">Control</div>
                    <div class="settings">
                        <div class="setting-row"><label>Target hashtag:</label><input type="text" id="hashtag" value="" placeholder="#socialmedia" style="width:150px;"></div>
                        <div style="font-size:11px;color:#71717a;margin-bottom:10px;">Leave empty for For You page, or enter hashtag like #fitness</div>
                        <div class="setting-row"><label>Min delay (s):</label><input type="number" id="mind" value="30"></div>
                        <div class="setting-row"><label>Max delay (s):</label><input type="number" id="maxd" value="60"></div>
                        <div class="setting-row"><label>Videos/profile:</label><input type="number" id="vpp" value="100"></div>
                        <div style="font-size:12px;color:#71717a;margin-top:8px;">⚡ Running 2 browsers at a time (fixed for stability)</div>
                    </div>
                    <div class="stats">
                        <div class="stat"><div class="stat-value" id="sp">0</div><div class="stat-label">Profiles Done</div></div>
                        <div class="stat"><div class="stat-value" id="sc">0</div><div class="stat-label">Comments Today</div></div>
                    </div>
                    <div class="progress"><div class="progress-fill" id="prog" style="width:0%"></div></div>
                    <p class="center" style="color:#71717a" id="st">Ready - Click Start to run 25 browsers</p>
                    <div class="center" style="margin-top:20px;">
                        <button class="btn btn-success" id="startb" onclick="start()">▶ Start Daily Run</button>
                        <button class="btn btn-danger" id="stopb" onclick="stop()" style="display:none">⏹ Stop</button>
                    </div>
                </div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-title"><span>Log</span><button class="btn btn-secondary" style="padding:4px 8px" onclick="clrLog()">Clear</button></div>
                <div class="logs" id="logs">Ready - Select all 25 profiles and click Start...</div>
            </div>
        </div>
        
        <div id="tab-report" style="display:none">
            <div class="card">
                <div class="card-title"><span>📊 All Comments History (All Time)</span><span id="rc" style="color:#71717a">0 total</span></div>
                <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="expCSV()">📥 Export CSV</button>
                    <button class="btn btn-secondary" onclick="filterToday()">Today</button>
                    <button class="btn btn-secondary" onclick="filterWeek()">This Week</button>
                    <button class="btn btn-secondary" onclick="filterMonth()">This Month</button>
                    <button class="btn btn-secondary" onclick="filterAll()">All Time</button>
                    <button class="btn btn-danger" onclick="clrReport()">🗑️ Clear All</button>
                </div>
                <div id="filter-info" style="font-size:12px;color:#a78bfa;margin-bottom:10px;">Showing: All time</div>
                <div style="max-height:400px;overflow:auto">
                    <table class="report-table"><thead><tr><th>Date/Time</th><th>Profile</th><th>Comment</th><th>Video</th><th>Sheet</th></tr></thead><tbody id="rb"></tbody></table>
                </div>
                <div style="margin-top:16px;padding:12px;background:#27272a;border-radius:8px;">
                    <div style="display:flex;gap:24px;justify-content:center;">
                        <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#4ade80" id="sum-total">0</div><div style="font-size:11px;color:#71717a">Total Comments</div></div>
                        <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#a78bfa" id="sum-profiles">0</div><div style="font-size:11px;color:#71717a">Profiles Used</div></div>
                        <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#fbbf24" id="sum-videos">0</div><div style="font-size:11px;color:#71717a">Videos</div></div>
                        <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#f87171" id="sum-today">0</div><div style="font-size:11px;color:#71717a">Today</div></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        let profiles=[],selected=new Set(),sheetMap={},report=[],filteredReport=[];
        let currentFilter='all';
        const SHEETS=['Bump Connect','Kollabsy','Bump Syndicate'];
        setInterval(upd,1000);
        function showTab(t){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));event.target.classList.add('active');document.getElementById('tab-main').style.display=t=='main'?'block':'none';document.getElementById('tab-report').style.display=t=='report'?'block':'none';}
        async function sync(){const r=await fetch('/api/sync-profiles',{method:'POST'});profiles=(await r.json()).profiles||[];render();}
        async function loadC(){const r=await fetch('/api/load-comments',{method:'POST'});const d=await r.json();alert('Loaded:\\n'+Object.entries(d.counts).map(([k,v])=>k+': '+v).join('\\n'));}
        function render(){const e=document.getElementById('pl');if(!profiles.length){e.innerHTML='<div style="text-align:center;color:#71717a;padding:40px">Click Sync to load 25 profiles</div>';return;}e.innerHTML=profiles.map(p=>'<div class="profile '+(selected.has(p.user_id)?'selected':'')+'" onclick="tog(\\''+p.user_id+'\\')"><input type="checkbox" '+(selected.has(p.user_id)?'checked':'')+' onclick="event.stopPropagation();tog(\\''+p.user_id+'\\')"><div style="flex:1"><div style="font-weight:500">'+(p.name||p.user_id)+'</div><div style="font-size:11px;color:#71717a">'+p.user_id+'</div></div></div>').join('');document.getElementById('pc').textContent=selected.size+'/'+profiles.length+' selected';}
        function tog(id){selected.has(id)?selected.delete(id):selected.add(id);render();}
        function selAll(){if(selected.size==profiles.length)selected.clear();else profiles.forEach(p=>selected.add(p.user_id));render();}
        async function start(){if(!selected.size){alert('Select profiles first');return;}await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({min_delay:+document.getElementById('mind').value,max_delay:+document.getElementById('maxd').value,videos_per_profile:+document.getElementById('vpp').value,target_hashtag:document.getElementById('hashtag').value})});await fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile_ids:[...selected],sheet_mapping:{}})});document.getElementById('startb').style.display='none';document.getElementById('stopb').style.display='inline';}
        async function stop(){await fetch('/api/stop',{method:'POST'});}
        
        function filterToday(){currentFilter='today';applyFilter();}
        function filterWeek(){currentFilter='week';applyFilter();}
        function filterMonth(){currentFilter='month';applyFilter();}
        function filterAll(){currentFilter='all';applyFilter();}
        
        function applyFilter(){
            const now=new Date();
            const today=now.toISOString().split('T')[0];
            const weekAgo=new Date(now-7*24*60*60*1000).toISOString().split('T')[0];
            const monthAgo=new Date(now-30*24*60*60*1000).toISOString().split('T')[0];
            
            if(currentFilter=='today'){
                filteredReport=report.filter(r=>r.timestamp.startsWith(today));
                document.getElementById('filter-info').textContent='Showing: Today ('+today+')';
            }else if(currentFilter=='week'){
                filteredReport=report.filter(r=>r.timestamp>=weekAgo);
                document.getElementById('filter-info').textContent='Showing: Last 7 days';
            }else if(currentFilter=='month'){
                filteredReport=report.filter(r=>r.timestamp>=monthAgo);
                document.getElementById('filter-info').textContent='Showing: Last 30 days';
            }else{
                filteredReport=report;
                document.getElementById('filter-info').textContent='Showing: All time ('+report.length+' comments)';
            }
            renderReport();
        }
        
        function renderReport(){
            document.getElementById('rc').textContent=report.length+' total';
            document.getElementById('rb').innerHTML=filteredReport.length?filteredReport.slice().reverse().map(r=>'<tr><td style="white-space:nowrap">'+r.timestamp+'</td><td>'+r.profile+'</td><td title="'+r.comment.replace(/"/g,'&quot;')+'">'+r.comment.substring(0,35)+'...</td><td><a href="'+r.video_url+'" target="_blank">🔗 Open</a></td><td>'+r.sheet+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;color:#71717a;padding:20px">No comments for this period</td></tr>';
            document.getElementById('sum-total').textContent=report.length;
            document.getElementById('sum-profiles').textContent=[...new Set(report.map(r=>r.profile))].length;
            document.getElementById('sum-videos').textContent=[...new Set(report.map(r=>r.video_id))].length;
            const today=new Date().toISOString().split('T')[0];
            document.getElementById('sum-today').textContent=report.filter(r=>r.timestamp.startsWith(today)).length;
        }
        
        async function upd(){try{const r=await fetch('/api/status');const d=await r.json();document.getElementById('prog').style.width=(d.total?(d.progress/d.total*100):0)+'%';document.getElementById('sp').textContent=d.completed.length;document.getElementById('sc').textContent=d.comments_posted||0;document.getElementById('st').textContent=d.running?'Running: '+d.current_profile+' ('+d.progress+'/'+d.total+')':'Ready';if(!d.running){document.getElementById('startb').style.display='inline';document.getElementById('stopb').style.display='none';}if(d.logs.length)document.getElementById('logs').innerHTML=d.logs.map(l=>'<div style="color:'+(l.includes('✗')?'#f87171':l.includes('✓')?'#4ade80':'#a1a1aa')+'">'+l+'</div>').join('');if(d.report&&d.report.length!==report.length){report=d.report;applyFilter();}}catch(e){}}
        function clrLog(){fetch('/api/clear-logs',{method:'POST'});document.getElementById('logs').innerHTML='Cleared';}
        async function clrReport(){if(!confirm('⚠️ Delete ALL comment history forever?\\n\\nThis will remove '+report.length+' comments and cannot be undone.'))return;await fetch('/api/clear-report',{method:'POST'});report=[];filteredReport=[];renderReport();}
        function expCSV(){if(!report.length)return alert('No data');const csv='Date,Time,Profile,Comment,Video URL,Sheet\\n'+report.map(r=>{const[d,t]=r.timestamp.split(' ');return d+','+t+','+r.profile+',"'+r.comment.replace(/"/g,'""')+'",'+r.video_url+','+r.sheet;}).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv]));a.download='tiktok_comments_history_'+new Date().toISOString().split('T')[0]+'.csv';a.click();}
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

@app.route('/api/clear-report', methods=['POST'])
def api_clear_report():
    automation_status["report"] = []
    automation_status["comments_posted"] = 0
    save_report_history()
    return jsonify({"ok": True})

if __name__ == "__main__":
    print("=" * 50)
    print("  TikTok Commenter - http://localhost:9090")
    print("=" * 50)
    load_report_history()  # Load past runs
    app.run(host="0.0.0.0", port=9090, debug=False)
