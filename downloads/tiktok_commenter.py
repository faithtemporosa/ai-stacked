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
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, render_template_string, jsonify, request

# Supabase for cloud sync
try:
    from supabase import create_client
    SUPABASE_URL = "https://qwnhywiygyvlhjxxrbkk.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bmh5d2l5Z3l2bGhqeHhyYmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTkxNzgsImV4cCI6MjA4NjgzNTE3OH0.X7RdTeOPrJCkf8c1oOUGHv1tntDigluOnj7bPw50tKE"
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("Note: Install supabase for cloud sync: pip install supabase")

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
CLOUD_API_URL = "https://creator-suite-18.preview.emergentagent.com/api"

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
DM_REPORT_FILE = "tiktok_dm_history.json"
DM_TARGETS_FILE = "tiktok_dm_targets.json"
POST_QUEUE_FILE = "tiktok_post_queue.json"
POST_HISTORY_FILE = "tiktok_post_history.json"

settings = {
    "min_delay": MIN_DELAY_BETWEEN_COMMENTS,
    "max_delay": MAX_DELAY_BETWEEN_COMMENTS,
    "videos_per_profile": VIDEOS_PER_PROFILE,
    "parallel_browsers": 2,  # Fixed at 2 browsers at a time
    "target_hashtag": "",  # Target hashtag to search (e.g., #socialmedia)
}

# DM Settings - Updated for brand outreach
dm_settings = {
    "enabled": False,
    "max_dms_per_profile": 100,  # Max 100 DMs per profile per day
    "max_dms_total": 250,  # Max 250 DMs total per day
    "parallel_browsers": 2,  # 2 profiles open at the same time
    "min_delay": 45,  # Seconds between DMs
    "max_delay": 90,
    "target_mode": "brand_search",  # brand_search, specific, hashtag, commenters, followers
    "target_hashtag": "",
    "target_account": "",
    "target_video_url": "",
}

# Search queries to find brands/companies needing social media management
DM_BRAND_SEARCH_QUERIES = [
    "small business owner",
    "startup founder",
    "entrepreneur life",
    "new business",
    "local business",
    "ecommerce brand",
    "clothing brand",
    "beauty brand",
    "fitness brand",
    "restaurant owner",
    "salon owner",
    "real estate agent",
    "coach business",
    "consulting business",
    "agency owner",
    "marketing agency",
    "brand launch",
    "product launch",
    "dropshipping",
    "amazon fba",
    "etsy seller",
    "shopify store",
    "boutique owner",
    "jewelry brand",
    "skincare brand",
    "supplement brand",
    "food brand",
    "beverage brand",
    "tech startup",
    "saas founder",
]

# DM Targets and Messages
dm_targets = {
    "specific_users": [],
    "scraped_brands": [],  # Brands found via search
    "messages": {
        "default": "Hey! 👋 I noticed your brand and love what you're doing! We help businesses like yours grow on social media. Check out bumpsyndicate.xyz - we'd love to help you scale! 🚀",
        "groups": {}
    }
}

# Daily DM tracking per profile: {"profile_name": {"2026-02-19": 50}}
DM_TRACKER_FILE = "tiktok_dm_tracker.json"
dm_tracker = {}

dm_status = {
    "running": False,
    "current_profile": None,
    "current_profile_index": 0,
    "profiles_completed": [],
    "progress": 0,
    "total": 0,
    "dms_sent": 0,
    "dms_sent_today": 0,
    "logs": [],
    "report": [],
    "sent_to": set()  # Track who we've already DMed
}

# Post Settings
post_settings = {
    "enabled": True,
    "min_delay": 300,  # 5 min between reposts
    "max_delay": 600,  # 10 min between reposts
    "max_reposts_per_day": 2,  # Max 2 reposts per profile per day
}

# Repost schedule: Monday = brand content, Tue-Sun = social media content
BRAND_SEARCH_TERMS = [
    "bumpconnect", "bump connect", "kollabsy", "bumpsyndicate", "bump syndicate",
    "bumpconnect.xyz", "kollabsy.xyz", "bumpsyndicate.xyz",
]
SOCIAL_MEDIA_SEARCH_TERMS = [
    "social media tips", "content creator tips", "social media marketing",
    "grow your following", "social media strategy", "creator economy",
    "tiktok growth", "influencer tips", "content creation", "digital marketing",
]

# Post Queue - auto-populated by scheduler
post_queue = []

# Daily repost tracking per profile: {"profile_name": {"2026-02-19": 2}}
REPOST_TRACKER_FILE = "tiktok_repost_tracker.json"
repost_tracker = {}

post_status = {
    "running": False,
    "current_profile": None,
    "progress": 0,
    "total": 0,
    "posts_made": 0,
    "logs": [],
    "history": [],
    "last_run": None,
    "next_run": None,
}

# Scheduler state
scheduler_running = True

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

def send_to_cloud(report_data):
    """Send a single comment report to Supabase for real-time dashboard"""
    if not HAS_SUPABASE:
        return False
    try:
        supabase.table('comment_reports').insert({
            'timestamp': report_data.get('timestamp'),
            'profile': report_data.get('profile'),
            'video_url': report_data.get('video_url'),
            'video_id': report_data.get('video_id'),
            'comment': report_data.get('comment'),
            'sheet': report_data.get('sheet')
        }).execute()
        log(f"    ☁️ Synced to Supabase")
        return True
    except Exception as e:
        if 'duplicate' in str(e).lower() or '23505' in str(e):
            log(f"    ⚠ Already in cloud (duplicate)")
        else:
            log(f"    ⚠ Cloud sync error: {e}")
    return False

def sync_all_to_cloud():
    """Sync all local reports to Supabase (for bulk sync)"""
    if not automation_status["report"] or not HAS_SUPABASE:
        return 0

    synced = 0
    for report in automation_status["report"]:
        try:
            supabase.table('comment_reports').insert({
                'timestamp': report.get('timestamp'),
                'profile': report.get('profile'),
                'video_url': report.get('video_url'),
                'video_id': report.get('video_id'),
                'comment': report.get('comment'),
                'sheet': report.get('sheet')
            }).execute()
            synced += 1
        except Exception as e:
            if 'duplicate' not in str(e).lower() and '23505' not in str(e):
                print(f"Sync error: {e}")

    log(f"☁️ Synced {synced} reports to Supabase")
    return synced

def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    automation_status["logs"].append(log_entry)
    print(log_entry)
    if len(automation_status["logs"]) > 200:
        automation_status["logs"] = automation_status["logs"][-200:]
    
    # Send logs to cloud (non-blocking)
    try:
        threading.Thread(target=sync_logs_to_cloud, daemon=True).start()
    except:
        pass

def sync_logs_to_cloud():
    """Send current logs and status to Supabase"""
    if not HAS_SUPABASE:
        return

    try:
        log_entries = []
        for log_line in automation_status["logs"][-50:]:  # Send last 50 logs
            # Parse timestamp from log line
            if log_line.startswith("[") and "]" in log_line:
                ts = log_line[1:log_line.index("]")]
                msg = log_line[log_line.index("]")+2:]
            else:
                ts = datetime.now().strftime("%H:%M:%S")
                msg = log_line

            log_entries.append({
                "timestamp": ts,
                "message": msg,
                "level": "error" if "✗" in msg else "success" if "✓" in msg else "info"
            })

        status_data = {
            "running": automation_status["running"],
            "current_profile": automation_status["current_profile"],
            "progress": automation_status["progress"],
            "total": automation_status["total"],
            "comments_posted": automation_status["comments_posted"],
            "completed": len(automation_status["completed"])
        }

        # Upsert to live_logs table (single row)
        supabase.table('live_logs').upsert({
            'id': '00000000-0000-0000-0000-000000000001',  # Fixed ID for singleton
            'logs': log_entries,
            'status': status_data,
            'updated_at': datetime.now().isoformat()
        }).execute()
    except:
        pass  # Silently fail - don't interrupt main process

def sync_dm_to_cloud(dm_report_entry):
    """Sync a single DM report to Supabase"""
    if not HAS_SUPABASE:
        return
    try:
        supabase.table('dm_reports').insert({
            'timestamp': dm_report_entry.get('timestamp'),
            'profile': dm_report_entry.get('profile'),
            'username': dm_report_entry.get('username'),
            'message': dm_report_entry.get('message', '')[:500],
            'status': dm_report_entry.get('status', 'unknown')
        }).execute()
    except:
        pass

def sync_post_to_cloud(post_entry):
    """Sync a single post report to Supabase"""
    if not HAS_SUPABASE:
        return
    try:
        supabase.table('post_reports').insert({
            'timestamp': post_entry.get('timestamp'),
            'profile': post_entry.get('profile'),
            'video': post_entry.get('video', ''),
            'caption': post_entry.get('caption', '')[:500],
            'status': post_entry.get('status', 'unknown')
        }).execute()
    except:
        pass

def scheduler_loop():
    """Background thread: auto-runs repost scheduler daily"""
    while scheduler_running:
        try:
            now = datetime.now()
            # Check if we should run (once per day, early morning suggested)
            today_str = now.strftime("%Y-%m-%d")
            
            if post_settings.get("enabled") and not post_status["running"]:
                # Check if we've already run today
                if post_status.get("last_run") != today_str:
                    hour = now.hour
                    # Auto-start at configured hour (default: 9 AM)
                    if hour >= 9 and hour < 22:
                        post_log(f"⏰ Scheduler: Auto-starting repost run for {today_str}")
                        post_status["next_run"] = None
                        start_repost_automation()
                else:
                    # Already ran today, calculate next run
                    tomorrow = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0)
                    post_status["next_run"] = tomorrow.strftime("%Y-%m-%d %H:%M")
        except:
            pass
        time.sleep(60)  # Check every minute

# =============================================================================
# DM FUNCTIONS - Brand Outreach for Bump Syndicate
# =============================================================================

def load_dm_data():
    """Load DM targets, tracker and history from files"""
    global dm_targets, dm_status, dm_tracker
    
    # Load targets
    try:
        with open(DM_TARGETS_FILE, 'r') as f:
            data = json.load(f)
            dm_targets.update(data)
            print(f"✓ Loaded {len(dm_targets.get('specific_users', []))} DM targets")
            print(f"✓ Loaded {len(dm_targets.get('scraped_brands', []))} scraped brands")
    except FileNotFoundError:
        print("No DM targets file, starting fresh")
    except Exception as e:
        print(f"Error loading DM targets: {e}")
    
    # Load DM tracker (daily counts per profile)
    try:
        with open(DM_TRACKER_FILE, 'r') as f:
            dm_tracker = json.load(f)
            print(f"✓ Loaded DM tracker ({len(dm_tracker)} profiles)")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"Error loading DM tracker: {e}")
    
    # Load history
    try:
        with open(DM_REPORT_FILE, 'r') as f:
            data = json.load(f)
            dm_status["report"] = data.get("report", [])
            dm_status["sent_to"] = set(data.get("sent_to", []))
            dm_status["dms_sent"] = len(dm_status["report"])
            # Count today's DMs
            today = datetime.now().strftime("%Y-%m-%d")
            dm_status["dms_sent_today"] = sum(1 for r in dm_status["report"] if r.get("timestamp", "").startswith(today))
            print(f"✓ Loaded {len(dm_status['report'])} DM history ({dm_status['dms_sent_today']} today)")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"Error loading DM history: {e}")

def save_dm_data():
    """Save DM targets, tracker and history"""
    try:
        with open(DM_TARGETS_FILE, 'w') as f:
            # Convert set to list for JSON serialization
            targets_to_save = dm_targets.copy()
            if 'scraped_brands' in targets_to_save and isinstance(targets_to_save['scraped_brands'], set):
                targets_to_save['scraped_brands'] = list(targets_to_save['scraped_brands'])
            json.dump(targets_to_save, f, indent=2)
    except Exception as e:
        print(f"Error saving DM targets: {e}")
    
    try:
        with open(DM_TRACKER_FILE, 'w') as f:
            json.dump(dm_tracker, f, indent=2)
    except Exception as e:
        print(f"Error saving DM tracker: {e}")
    
    try:
        with open(DM_REPORT_FILE, 'w') as f:
            json.dump({
                "report": dm_status["report"],
                "sent_to": list(dm_status["sent_to"]),
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }, f, indent=2)
    except Exception as e:
        print(f"Error saving DM history: {e}")

def get_dms_today(profile_name):
    """Get number of DMs sent by profile today"""
    today = datetime.now().strftime("%Y-%m-%d")
    return dm_tracker.get(profile_name, {}).get(today, 0)

def record_dm(profile_name):
    """Record a DM sent by profile"""
    today = datetime.now().strftime("%Y-%m-%d")
    if profile_name not in dm_tracker:
        dm_tracker[profile_name] = {}
    dm_tracker[profile_name][today] = dm_tracker[profile_name].get(today, 0) + 1
    save_dm_data()

def get_total_dms_today():
    """Get total DMs sent today across all profiles"""
    today = datetime.now().strftime("%Y-%m-%d")
    total = 0
    for profile_data in dm_tracker.values():
        total += profile_data.get(today, 0)
    return total

def dm_log(message):
    """Log for DM operations"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] [DM] {message}"
    dm_status["logs"].append(log_entry)
    print(log_entry)
    if len(dm_status["logs"]) > 200:
        dm_status["logs"] = dm_status["logs"][-200:]

def get_dm_message(username):
    """Get the appropriate DM message for a user"""
    # Check if user is in a specific group
    for group_name, group_data in dm_targets["messages"].get("groups", {}).items():
        if username in group_data.get("users", []):
            return group_data.get("message", dm_targets["messages"]["default"])
    return dm_targets["messages"]["default"]

def search_brands_on_tiktok(page, search_query, limit=50):
    """Search TikTok for brands/businesses and collect usernames"""
    brands = []
    dm_log(f"🔍 Searching: '{search_query}'")
    
    try:
        encoded = search_query.replace(" ", "%20")
        # Search for users (accounts), not videos
        page.goto(f"https://www.tiktok.com/search/user?q={encoded}", wait_until="domcontentloaded", timeout=30000)
        time.sleep(4)
        
        # Check if logged in
        if "login" in page.url.lower():
            dm_log(f"  ⚠ Not logged in!")
            return []
        
        # Scroll and collect users
        for scroll in range(5):
            new_brands = page.evaluate('''() => {
                const users = [];
                // Find user cards in search results
                document.querySelectorAll('[data-e2e="search-user-container"] a[href*="/@"], [class*="UserCard"] a[href*="/@"], a[href*="/@"]').forEach(a => {
                    const match = a.href.match(/@([a-zA-Z0-9_.]+)/);
                    if (match && !users.includes(match[1])) {
                        // Check if it looks like a business/brand (has certain indicators)
                        const card = a.closest('[class*="Card"], [class*="container"], [class*="Item"]');
                        if (card) {
                            const text = card.innerText.toLowerCase();
                            // Look for business indicators
                            if (text.includes('business') || text.includes('brand') || 
                                text.includes('shop') || text.includes('store') ||
                                text.includes('official') || text.includes('co.') ||
                                text.includes('llc') || text.includes('inc') ||
                                text.includes('@') || text.includes('.com') ||
                                text.includes('founder') || text.includes('ceo') ||
                                text.includes('owner') || text.length > 10) {
                                users.push(match[1]);
                            }
                        } else {
                            users.push(match[1]);
                        }
                    }
                });
                return users;
            }''')
            
            brands.extend([b for b in new_brands if b not in brands])
            
            if len(brands) >= limit:
                break
            
            # Scroll down
            page.evaluate('window.scrollBy(0, 600)')
            time.sleep(1.5)
        
        dm_log(f"  ✓ Found {len(brands)} potential brands")
        return brands[:limit]
        
    except Exception as e:
        dm_log(f"  ✗ Search error: {str(e)[:80]}")
        return []

def scrape_brands_for_dm(page, num_brands=100):
    """Scrape brands from multiple search queries"""
    all_brands = set()
    queries_to_use = random.sample(DM_BRAND_SEARCH_QUERIES, min(5, len(DM_BRAND_SEARCH_QUERIES)))
    
    dm_log(f"🎯 Scraping brands using {len(queries_to_use)} search queries...")
    
    for query in queries_to_use:
        if len(all_brands) >= num_brands:
            break
        
        brands = search_brands_on_tiktok(page, query, limit=30)
        # Filter out already contacted users
        new_brands = [b for b in brands if b not in dm_status["sent_to"]]
        all_brands.update(new_brands)
        
        # Small delay between searches
        time.sleep(random.randint(2, 4))
    
    dm_log(f"✓ Total unique brands found: {len(all_brands)}")
    return list(all_brands)[:num_brands]

def send_dm_to_user(page, username, message):
    """Send a DM to a specific user using Playwright"""
    try:
        dm_log(f"  → Navigating to @{username}'s profile...")
        page.goto(f"https://www.tiktok.com/@{username}", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        # Check if profile exists
        if "couldn't find this account" in page.content().lower():
            dm_log(f"  ⚠ User @{username} not found")
            return False, "user_not_found"
        
        # Click message/DM button
        dm_log(f"  → Opening DM...")
        result = page.evaluate('''() => {
            // Look for message button
            const selectors = [
                '[data-e2e="message-button"]',
                '[data-e2e="profile-message"]',
                'button[aria-label*="message" i]',
                'button[aria-label*="Message" i]',
                '[class*="MessageButton"]',
                '[class*="message-button"]'
            ];
            
            for (let sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent) {
                    btn.click();
                    return {success: true, method: sel};
                }
            }
            
            // Try finding by text
            const buttons = document.querySelectorAll('button, div[role="button"]');
            for (let btn of buttons) {
                if (btn.textContent.toLowerCase().includes('message') && btn.offsetParent) {
                    btn.click();
                    return {success: true, method: 'text-search'};
                }
            }
            
            return {success: false};
        }''')
        
        if not result.get('success'):
            dm_log(f"  ⚠ Could not find message button for @{username}")
            return False, "no_dm_button"
        
        dm_log(f"  ✓ DM window opened ({result.get('method')})")
        time.sleep(2)
        
        # Find and click message input
        input_result = page.evaluate('''() => {
            const selectors = [
                '[data-e2e="message-input"]',
                '[class*="DivInputContainer"] [contenteditable="true"]',
                '[class*="MessageInput"] [contenteditable="true"]',
                'div[contenteditable="true"][data-text="true"]',
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
            return {success: false};
        }''')
        
        if not input_result.get('success'):
            dm_log(f"  ⚠ Could not find message input")
            return False, "no_input"
        
        dm_log(f"  → Typing message...")
        time.sleep(0.5)
        
        # Type the message
        page.keyboard.type(message, delay=random.randint(30, 60))
        time.sleep(1)
        
        # Send the message
        dm_log(f"  → Sending...")
        send_result = page.evaluate('''() => {
            const selectors = [
                '[data-e2e="send-message"]',
                '[class*="SendButton"]',
                '[class*="send-button"]',
                'button[aria-label*="send" i]'
            ];
            
            for (let sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent) {
                    btn.click();
                    return {success: true, method: sel};
                }
            }
            return {success: false};
        }''')
        
        if not send_result.get('success'):
            dm_log(f"  → Trying Enter key...")
            page.keyboard.press("Enter")
        
        time.sleep(2)
        dm_log(f"  ✓ DM sent to @{username}")
        return True, "success"
        
    except Exception as e:
        dm_log(f"  ✗ Error sending DM to @{username}: {str(e)[:100]}")
        return False, str(e)

def collect_users_from_hashtag(page, hashtag, limit=100):
    """Collect usernames from a hashtag page"""
    users = set()
    dm_log(f"→ Collecting users from #{hashtag}...")
    
    try:
        page.goto(f"https://www.tiktok.com/tag/{hashtag}", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        for scroll in range(10):  # Scroll multiple times
            new_users = page.evaluate('''() => {
                const users = new Set();
                // Find all user links
                document.querySelectorAll('a[href*="/@"]').forEach(a => {
                    const match = a.href.match(/@([a-zA-Z0-9_.]+)/);
                    if (match) users.add(match[1]);
                });
                return Array.from(users);
            }''')
            
            users.update(new_users)
            
            if len(users) >= limit:
                break
            
            page.keyboard.press("ArrowDown")
            page.keyboard.press("ArrowDown")
            time.sleep(1)
        
        dm_log(f"✓ Found {len(users)} users from #{hashtag}")
        return list(users)[:limit]
    except Exception as e:
        dm_log(f"✗ Error collecting from hashtag: {e}")
        return []

def collect_users_from_comments(page, video_url, limit=100):
    """Collect usernames from video comments"""
    users = set()
    dm_log(f"→ Collecting commenters from video...")
    
    try:
        page.goto(video_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        # Open comments
        page.evaluate('''() => {
            const btn = document.querySelector('[data-e2e="comment-icon"]');
            if (btn) btn.click();
        }''')
        time.sleep(2)
        
        for scroll in range(10):
            new_users = page.evaluate('''() => {
                const users = new Set();
                document.querySelectorAll('[data-e2e="comment-username-1"], [class*="CommentUsername"], a[href*="/@"]').forEach(el => {
                    const href = el.href || '';
                    const match = href.match(/@([a-zA-Z0-9_.]+)/);
                    if (match) users.add(match[1]);
                    // Also check text content
                    const text = el.textContent.trim();
                    if (text.startsWith('@')) users.add(text.slice(1));
                });
                return Array.from(users);
            }''')
            
            users.update(new_users)
            
            if len(users) >= limit:
                break
            
            # Scroll in comments
            page.evaluate('document.querySelector("[class*=CommentList]")?.scrollBy(0, 500)')
            time.sleep(1)
        
        dm_log(f"✓ Found {len(users)} commenters")
        return list(users)[:limit]
    except Exception as e:
        dm_log(f"✗ Error collecting commenters: {e}")
        return []

def collect_followers(page, account, limit=100):
    """Collect followers from an account"""
    users = set()
    dm_log(f"→ Collecting followers of @{account}...")
    
    try:
        page.goto(f"https://www.tiktok.com/@{account}", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        # Click followers count to open list
        page.evaluate('''() => {
            const followerLink = document.querySelector('[data-e2e="followers-count"]');
            if (followerLink) followerLink.click();
        }''')
        time.sleep(2)
        
        for scroll in range(10):
            new_users = page.evaluate('''() => {
                const users = new Set();
                document.querySelectorAll('[class*="UserList"] a[href*="/@"], [class*="follower"] a[href*="/@"]').forEach(a => {
                    const match = a.href.match(/@([a-zA-Z0-9_.]+)/);
                    if (match) users.add(match[1]);
                });
                return Array.from(users);
            }''')
            
            users.update(new_users)
            
            if len(users) >= limit:
                break
            
            page.evaluate('document.querySelector("[class*=UserList]")?.scrollBy(0, 500)')
            time.sleep(1)
        
        dm_log(f"✓ Found {len(users)} followers")
        return list(users)[:limit]
    except Exception as e:
        dm_log(f"✗ Error collecting followers: {e}")
        return []

def run_dm_automation_for_profile(ws_endpoint, profile_name):
    """Run DM automation for a single profile - NEW VERSION with brand search"""
    if not HAS_PLAYWRIGHT:
        dm_log("✗ Playwright not installed!")
        return 0
    
    dms_sent = 0
    max_dms = dm_settings.get("max_dms_per_profile", 100)
    
    # Check how many DMs this profile has already sent today
    dms_already_sent = get_dms_today(profile_name)
    remaining_for_profile = max_dms - dms_already_sent
    
    if remaining_for_profile <= 0:
        dm_log(f"  ⚠ Profile already at daily limit ({max_dms} DMs)")
        return 0
    
    # Check total daily limit
    total_today = get_total_dms_today()
    max_total = dm_settings.get("max_dms_total", 250)
    remaining_total = max_total - total_today
    
    if remaining_total <= 0:
        dm_log(f"  ⚠ Total daily limit reached ({max_total} DMs)")
        return 0
    
    # Take the minimum of profile limit and remaining total
    to_send = min(remaining_for_profile, remaining_total)
    dm_log(f"  📊 Profile limit: {remaining_for_profile} | Total remaining: {remaining_total} | Will send: {to_send}")
    
    target_users = []
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(ws_endpoint)
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            page = context.pages[0] if context.pages else context.new_page()
            
            # Collect target users based on mode
            mode = dm_settings.get("target_mode", "brand_search")
            
            if mode == "brand_search":
                # NEW: Scrape brands from TikTok search
                target_users = scrape_brands_for_dm(page, num_brands=to_send + 20)
            elif mode == "specific":
                target_users = [u for u in dm_targets.get("specific_users", []) if u not in dm_status["sent_to"]]
            elif mode == "hashtag":
                hashtag = dm_settings.get("target_hashtag", "").strip().replace("#", "")
                if hashtag:
                    target_users = collect_users_from_hashtag(page, hashtag, 200)
                    target_users = [u for u in target_users if u not in dm_status["sent_to"]]
            elif mode == "commenters":
                video_url = dm_settings.get("target_video_url", "").strip()
                if video_url:
                    target_users = collect_users_from_comments(page, video_url, 200)
                    target_users = [u for u in target_users if u not in dm_status["sent_to"]]
            elif mode == "followers":
                account = dm_settings.get("target_account", "").strip().replace("@", "")
                if account:
                    target_users = collect_followers(page, account, 200)
                    target_users = [u for u in target_users if u not in dm_status["sent_to"]]
            
            # Filter already contacted
            target_users = [u for u in target_users if u not in dm_status["sent_to"]]
            
            if not target_users:
                dm_log(f"  ⚠ No new users to DM")
                browser.close()
                return 0
            
            # Limit to what we can send
            target_users = target_users[:to_send]
            dm_log(f"  → Will DM {len(target_users)} brands/users")
            
            for i, username in enumerate(target_users):
                if not dm_status["running"]:
                    dm_log(f"  ⏹ Stopped by user")
                    break
                
                # Check limits again during loop
                if get_total_dms_today() >= max_total:
                    dm_log(f"  ⚠ Total daily limit reached")
                    break
                
                if get_dms_today(profile_name) >= max_dms:
                    dm_log(f"  ⚠ Profile daily limit reached")
                    break
                
                dm_status["progress"] = i + 1
                dm_status["total"] = len(target_users)
                
                message = get_dm_message(username)
                success, result = send_dm_to_user(page, username, message)
                
                if success:
                    dms_sent += 1
                    dm_status["dms_sent"] += 1
                    dm_status["dms_sent_today"] += 1
                    dm_status["sent_to"].add(username)
                    record_dm(profile_name)
                    
                    dm_status["report"].append({
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "profile": profile_name,
                        "username": username,
                        "message": message[:50] + "..." if len(message) > 50 else message,
                        "status": "sent",
                        "search_mode": mode
                    })
                    
                    # Sync DM to cloud
                    try:
                        threading.Thread(target=sync_dm_to_cloud, args=(dm_status["report"][-1],), daemon=True).start()
                    except:
                        pass
                    
                    save_dm_data()
                    
                    # Wait between DMs
                    delay = random.randint(dm_settings["min_delay"], dm_settings["max_delay"])
                    dm_log(f"  ⏳ Waiting {delay}s... (Sent: {dms_sent}/{to_send})")
                    for _ in range(delay):
                        if not dm_status["running"]:
                            break
                        time.sleep(1)
            
            browser.close()
            dm_log(f"✓ Profile {profile_name}: Sent {dms_sent} DMs")
            return dms_sent
            
    except Exception as e:
        dm_log(f"✗ Error: {e}")
        traceback.print_exc()
        return dms_sent

def process_dm_profile(profile_id, profile_name):
    """Process a single profile for DM automation"""
    dm_log(f"▶ Starting DM: {profile_name}")
    dm_status["current_profile"] = profile_name
    
    browser_data = open_browser(profile_id)
    if not browser_data:
        dm_log(f"  ✗ Failed to open browser")
        return 0
    
    ws_endpoint = browser_data.get("ws", {}).get("puppeteer")
    if not ws_endpoint:
        dm_log(f"  ✗ No WebSocket endpoint")
        close_browser(profile_id)
        return 0
    
    time.sleep(3)
    dms_sent = run_dm_automation_for_profile(ws_endpoint, profile_name)
    
    close_browser(profile_id)
    dm_log(f"  → Browser closed")
    
    return dms_sent

def start_dm_automation():
    """Start the DM automation process - NEW VERSION
    
    Features:
    - Searches TikTok for brands/businesses
    - Max 100 DMs per profile per day
    - Max 250 DMs total per day
    - 2 profiles open at a time (parallel)
    - Starts from lowest numbered profile
    - Continues until all profiles hit daily quota
    """
    if dm_status["running"]:
        return False
    
    dm_status["running"] = True
    dm_status["logs"] = []
    dm_status["progress"] = 0
    dm_status["total"] = 0
    dm_status["profiles_completed"] = []
    dm_status["dms_sent_today"] = get_total_dms_today()
    
    dm_log("═" * 50)
    dm_log("🚀 Starting Brand DM Outreach")
    dm_log("═" * 50)
    dm_log(f"📊 Settings:")
    dm_log(f"   Max per profile: {dm_settings['max_dms_per_profile']} DMs")
    dm_log(f"   Max total/day: {dm_settings['max_dms_total']} DMs")
    dm_log(f"   Parallel browsers: {dm_settings['parallel_browsers']}")
    dm_log(f"   Mode: {dm_settings['target_mode']}")
    dm_log(f"   Already sent today: {dm_status['dms_sent_today']} DMs")
    dm_log("═" * 50)
    
    if not profiles:
        dm_log("✗ No profiles loaded! Click Sync first.")
        dm_status["running"] = False
        return False
    
    # Check if we've hit total daily limit
    if dm_status["dms_sent_today"] >= dm_settings["max_dms_total"]:
        dm_log(f"✗ Already at total daily limit ({dm_settings['max_dms_total']} DMs)")
        dm_status["running"] = False
        return False
    
    def run():
        total_dms = 0
        try:
            # Sort profiles by name (lowest number first)
            sorted_profiles = sorted(profiles, key=lambda p: p.get("name", p.get("user_id", "")))
            parallel = dm_settings.get("parallel_browsers", 2)
            max_total = dm_settings["max_dms_total"]
            max_per_profile = dm_settings["max_dms_per_profile"]
            
            dm_log(f"📋 Processing {len(sorted_profiles)} profiles (sorted by name)")
            dm_log(f"🔄 Running {parallel} profiles at a time")
            
            profile_index = 0
            
            while profile_index < len(sorted_profiles) and dm_status["running"]:
                # Check if we've hit total daily limit
                if get_total_dms_today() >= max_total:
                    dm_log(f"🎯 Total daily limit reached ({max_total} DMs)")
                    break
                
                # Get next batch of profiles (2 at a time)
                batch = sorted_profiles[profile_index:profile_index + parallel]
                dm_log(f"")
                dm_log(f"📦 Batch {profile_index // parallel + 1}: {[p.get('name', p.get('user_id')) for p in batch]}")
                
                # Process each profile in batch sequentially (but with 2 browsers concept)
                batch_has_work = False
                for profile in batch:
                    if not dm_status["running"]:
                        break
                    
                    profile_id = profile.get("user_id")
                    profile_name = profile.get("name", profile_id)
                    
                    # Skip if profile already at daily limit
                    if get_dms_today(profile_name) >= max_per_profile:
                        dm_log(f"  ⏭ {profile_name} already at limit ({max_per_profile}), skipping")
                        dm_status["profiles_completed"].append(profile_name)
                        continue
                    
                    # Skip if total limit reached
                    if get_total_dms_today() >= max_total:
                        dm_log(f"  🎯 Total daily limit reached")
                        break
                    
                    dm_status["current_profile_index"] = profile_index
                    dms_sent = process_dm_profile(profile_id, profile_name)
                    total_dms += dms_sent
                    
                    if dms_sent > 0:
                        batch_has_work = True
                    
                    # Mark as completed if at limit
                    if get_dms_today(profile_name) >= max_per_profile:
                        dm_status["profiles_completed"].append(profile_name)
                    
                    # Wait between profiles
                    if dm_status["running"] and batch.index(profile) < len(batch) - 1:
                        delay = random.randint(15, 30)
                        dm_log(f"  ⏳ Switching profile in {delay}s...")
                        for _ in range(delay):
                            if not dm_status["running"]:
                                break
                            time.sleep(1)
                
                profile_index += parallel
                
                # Wait between batches
                if dm_status["running"] and profile_index < len(sorted_profiles) and batch_has_work:
                    delay = random.randint(30, 60)
                    dm_log(f"")
                    dm_log(f"⏳ Next batch in {delay}s...")
                    for _ in range(delay):
                        if not dm_status["running"]:
                            break
                        time.sleep(1)
            
        except Exception as e:
            dm_log(f"✗ Fatal error: {e}")
            traceback.print_exc()
        finally:
            dm_status["running"] = False
            dm_status["current_profile"] = None
            dm_log("")
            dm_log("═" * 50)
            dm_log(f"✅ DM Outreach Complete!")
            dm_log(f"   Total DMs sent this session: {total_dms}")
            dm_log(f"   Total DMs sent today: {get_total_dms_today()}")
            dm_log(f"   Profiles completed: {len(dm_status['profiles_completed'])}")
            dm_log("═" * 50)
    
    threading.Thread(target=run, daemon=True).start()
    return True

def stop_dm_automation():
    """Stop the DM automation"""
    dm_status["running"] = False
    dm_log("⏹ Stopping DM automation...")

# =============================================================================
# REPOST FUNCTIONS - Auto-scrape and repost TikTok content
# Monday: Brand content (Bump Connect/Kollabsy/Bump Syndicate)
# Tue-Sun: Social media content
# Max 2 reposts per profile per day
# =============================================================================

def post_log(message):
    """Log for repost operations"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] [REPOST] {message}"
    post_status["logs"].append(log_entry)
    print(log_entry)
    if len(post_status["logs"]) > 200:
        post_status["logs"] = post_status["logs"][-200:]

def load_post_data():
    """Load repost tracker and history"""
    global repost_tracker
    try:
        with open(REPOST_TRACKER_FILE, 'r') as f:
            repost_tracker = json.load(f)
            print(f"  Loaded repost tracker ({len(repost_tracker)} profiles)")
    except FileNotFoundError:
        pass
    except:
        pass
    try:
        with open(POST_HISTORY_FILE, 'r') as f:
            data = json.load(f)
            post_status["history"] = data.get("history", [])
            post_status["posts_made"] = len(post_status["history"])
    except FileNotFoundError:
        pass
    except:
        pass

def save_post_data():
    """Save repost tracker and history"""
    try:
        with open(REPOST_TRACKER_FILE, 'w') as f:
            json.dump(repost_tracker, f, indent=2)
    except:
        pass
    try:
        with open(POST_HISTORY_FILE, 'w') as f:
            json.dump({"history": post_status["history"], "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}, f, indent=2)
    except:
        pass

def get_reposts_today(profile_name):
    today = datetime.now().strftime("%Y-%m-%d")
    return repost_tracker.get(profile_name, {}).get(today, 0)

def record_repost(profile_name):
    today = datetime.now().strftime("%Y-%m-%d")
    if profile_name not in repost_tracker:
        repost_tracker[profile_name] = {}
    repost_tracker[profile_name][today] = repost_tracker[profile_name].get(today, 0) + 1
    save_post_data()

def get_todays_search_terms():
    """Monday = brand content, Tue-Sun = social media content"""
    day = datetime.now().weekday()
    if day == 0:
        return BRAND_SEARCH_TERMS, "brand"
    else:
        return SOCIAL_MEDIA_SEARCH_TERMS, "social"

def scrape_and_repost(page, profile_name, search_terms, content_type):
    """Scrape TikTok search results and repost videos (max 2/day)"""
    max_reposts = post_settings["max_reposts_per_day"]
    remaining = max_reposts - get_reposts_today(profile_name)
    if remaining <= 0:
        post_log(f"  Already at {max_reposts} reposts today, skipping")
        return 0
    
    post_log(f"  Need {remaining} repost(s) ({content_type} content)")
    reposts_made = 0
    search_term = random.choice(search_terms)
    
    try:
        encoded = search_term.replace(" ", "%20")
        post_log(f"  Searching: '{search_term}'")
        page.goto(f"https://www.tiktok.com/search/video?q={encoded}", wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)
        
        if "login" in page.url.lower():
            post_log(f"  Not logged in, skipping")
            return 0
        
        page.evaluate("window.scrollBy(0, 400)")
        time.sleep(2)
        
        video_links = page.evaluate('''() => {
            const links = [];
            document.querySelectorAll('a[href*="/video/"]').forEach(a => {
                if (a.href && !links.includes(a.href)) links.push(a.href);
            });
            return links.slice(0, 10);
        }''')
        
        if not video_links:
            search_term = random.choice(search_terms)
            encoded = search_term.replace(" ", "%20")
            post_log(f"  Retrying: '{search_term}'")
            page.goto(f"https://www.tiktok.com/search/video?q={encoded}", wait_until="domcontentloaded", timeout=60000)
            time.sleep(5)
            video_links = page.evaluate('''() => {
                const links = [];
                document.querySelectorAll('a[href*="/video/"]').forEach(a => {
                    if (a.href && !links.includes(a.href)) links.push(a.href);
                });
                return links.slice(0, 10);
            }''')
        
        post_log(f"  Found {len(video_links)} videos")
        random.shuffle(video_links)
        
        for video_url in video_links[:remaining + 3]:
            if reposts_made >= remaining or not post_status["running"]:
                break
            try:
                post_log(f"  Opening: ...{video_url[-30:]}")
                page.goto(video_url, wait_until="domcontentloaded", timeout=30000)
                time.sleep(4)
                
                repost_ok = page.evaluate('''() => {
                    const sels = ['button[aria-label*="Repost"]','[data-e2e="video-repost-button"]','button[data-e2e="undefined-Repost"]'];
                    for (let s of sels) { const e = document.querySelector(s); if (e) { e.click(); return {ok:true,v:s}; } }
                    const share = document.querySelector('[data-e2e="share-icon"]') || document.querySelector('[aria-label="Share"]');
                    if (share) { share.click(); return {ok:false,v:'share',more:true}; }
                    for (let b of document.querySelectorAll('button,[role="button"]')) {
                        if ((b.textContent||'').toLowerCase().includes('repost')||(b.getAttribute('aria-label')||'').toLowerCase().includes('repost')) { b.click(); return {ok:true,v:'text'}; }
                    }
                    return {ok:false,v:'none'};
                }''')
                
                if repost_ok.get('more'):
                    time.sleep(1.5)
                    page.evaluate('''() => {
                        for (let i of document.querySelectorAll('[class*="share"] button,[role="button"]')) {
                            if ((i.textContent||'').toLowerCase().includes('repost')) { i.click(); return; }
                        }
                    }''')
                    time.sleep(1)
                    repost_ok = {"ok": True, "v": "share+repost"}
                
                if repost_ok.get('ok'):
                    time.sleep(2)
                    reposts_made += 1
                    record_repost(profile_name)
                    entry = {
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "profile": profile_name,
                        "video": video_url,
                        "caption": f"Reposted {content_type}: {search_term}",
                        "status": "reposted",
                        "content_type": content_type,
                    }
                    post_status["history"].append(entry)
                    post_status["posts_made"] += 1
                    save_post_data()
                    try:
                        threading.Thread(target=sync_post_to_cloud, args=(entry,), daemon=True).start()
                    except:
                        pass
                    post_log(f"  Reposted! ({reposts_made}/{remaining})")
                    if reposts_made < remaining:
                        delay = random.randint(post_settings["min_delay"], post_settings["max_delay"])
                        post_log(f"  Waiting {delay}s...")
                        for _ in range(delay):
                            if not post_status["running"]:
                                break
                            time.sleep(1)
                else:
                    post_log(f"  Repost button not found, next video")
            except Exception as e:
                post_log(f"  Error: {str(e)[:60]}")
    except Exception as e:
        post_log(f"  Scrape error: {str(e)[:80]}")
    return reposts_made

def run_repost_for_profile(profile_id, profile_name):
    """Open browser and run repost for one profile"""
    search_terms, content_type = get_todays_search_terms()
    day_name = datetime.now().strftime("%A")
    post_log(f"[{profile_name}] {day_name}: {content_type} content")
    post_status["current_profile"] = profile_name
    
    if get_reposts_today(profile_name) >= post_settings["max_reposts_per_day"]:
        post_log(f"  At daily limit, skipping")
        return 0
    
    browser_data = open_browser(profile_id)
    if not browser_data:
        post_log(f"  Failed to open browser")
        return 0
    ws_endpoint = browser_data.get("ws", {}).get("puppeteer")
    if not ws_endpoint:
        post_log(f"  No WebSocket endpoint")
        close_browser(profile_id)
        return 0
    
    time.sleep(3)
    reposts = 0
    if HAS_PLAYWRIGHT:
        try:
            with sync_playwright() as p:
                browser = p.chromium.connect_over_cdp(ws_endpoint)
                context = browser.contexts[0] if browser.contexts else browser.new_context()
                page = context.pages[0] if context.pages else context.new_page()
                reposts = scrape_and_repost(page, profile_name, search_terms, content_type)
                browser.close()
        except Exception as e:
            post_log(f"  Playwright error: {str(e)[:80]}")
    close_browser(profile_id)
    post_log(f"  Done. Reposts: {reposts}")
    return reposts

def start_repost_automation():
    """Start automated repost across all profiles"""
    if post_status["running"]:
        return False
    if not profiles:
        post_log("No profiles loaded! Sync first.")
        return False
    
    search_terms, content_type = get_todays_search_terms()
    day_name = datetime.now().strftime("%A")
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    post_status["running"] = True
    post_status["logs"] = []
    post_status["progress"] = 0
    post_status["total"] = len(profiles)
    
    post_log("=" * 50)
    post_log(f"Auto Repost - {day_name}, {today_str}")
    post_log(f"Content: {'Brand (Bump Connect/Kollabsy/Bump Syndicate)' if content_type == 'brand' else 'Social Media'}")
    post_log(f"Profiles: {len(profiles)} | Max {post_settings['max_reposts_per_day']}/profile/day")
    post_log("=" * 50)
    
    def run():
        total_reposts = 0
        try:
            for i, profile in enumerate(profiles):
                if not post_status["running"]:
                    break
                pid = profile.get("user_id")
                pname = profile.get("name", pid)
                post_status["progress"] = i + 1
                total_reposts += run_repost_for_profile(pid, pname)
                if i < len(profiles) - 1 and post_status["running"]:
                    delay = random.randint(30, 60)
                    post_log(f"Next profile in {delay}s...")
                    for _ in range(delay):
                        if not post_status["running"]:
                            break
                        time.sleep(1)
        except Exception as e:
            post_log(f"Fatal: {e}")
        finally:
            post_status["running"] = False
            post_status["current_profile"] = None
            post_status["last_run"] = today_str
            post_log("=" * 50)
            post_log(f"Done! Total reposts: {total_reposts}")
            post_log("=" * 50)
    
    threading.Thread(target=run, daemon=True).start()
    return True

def stop_post_automation():
    post_status["running"] = False
    post_log("Stopping repost automation...")

def fetch_adspower_profiles():
    """Fetch profiles from AdsPower API"""
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

# =============================================================================
# IMPROVED TIKTOK AUTOMATION WITH RETRY LOGIC
# =============================================================================

MAX_RETRIES = 3
RETRY_DELAY = 5

def safe_click(page, selectors, description="element", timeout=5000):
    """Safely click an element with multiple selector fallbacks"""
    for selector in selectors:
        try:
            element = page.locator(selector).first
            if element.is_visible(timeout=timeout):
                element.click(timeout=timeout)
                return True, selector
        except:
            continue
    return False, None

def safe_wait_for_video(page, timeout=15000):
    """Wait for video content to load with multiple strategies"""
    strategies = [
        ('video', 'video element'),
        ('[data-e2e="browse-video"]', 'browse video'),
        ('[class*="DivVideoContainer"]', 'video container'),
        ('[class*="video-card"]', 'video card'),
    ]
    
    for selector, name in strategies:
        try:
            page.wait_for_selector(selector, timeout=timeout)
            return True, name
        except:
            continue
    return False, None

def check_login_status(page):
    """Check if user is logged in to TikTok"""
    try:
        # Check URL for login redirect
        if "login" in page.url.lower() or "signup" in page.url.lower():
            return False
        
        # Check for login prompts in page
        login_indicators = page.evaluate('''() => {
            const text = document.body.innerText.toLowerCase();
            // Check for login modal or buttons
            if (document.querySelector('[data-e2e="login-button"]')) return true;
            if (document.querySelector('[class*="LoginModal"]')) return true;
            if (document.querySelector('a[href*="/login"]')) {
                // Only return true if it's a prominent login prompt
                const loginLinks = document.querySelectorAll('a[href*="/login"]');
                for (let link of loginLinks) {
                    if (link.offsetHeight > 30) return true;
                }
            }
            return false;
        }''')
        
        return not login_indicators
    except:
        return True  # Assume logged in if check fails

def click_comment_button(page):
    """Click the comment button with updated selectors for 2025 TikTok"""
    # Close any open dialogs first
    try:
        page.keyboard.press("Escape")
        time.sleep(0.3)
    except:
        pass
    
    # Updated selectors for TikTok 2025
    result = page.evaluate('''() => {
        // Method 1: data-e2e attribute (most reliable)
        let btn = document.querySelector('[data-e2e="comment-icon"]');
        if (btn) { btn.click(); return {success: true, method: 'data-e2e-comment-icon'}; }
        
        // Method 2: Browse comment icon
        btn = document.querySelector('[data-e2e="browse-comment-icon"]');
        if (btn) { btn.click(); return {success: true, method: 'data-e2e-browse-comment'}; }
        
        // Method 3: aria-label variations
        const commentLabels = ['comment', 'comments', 'kommentar', 'commenti', 'comentar', 'commenter', 'comentário'];
        for (let label of commentLabels) {
            btn = document.querySelector('[aria-label*="' + label + '" i]');
            if (btn && !btn.closest('[class*="share" i]') && btn.offsetParent) { 
                btn.click(); 
                return {success: true, method: 'aria-label-' + label}; 
            }
        }
        
        // Method 4: Find by SVG path (comment bubble icon)
        const svgs = document.querySelectorAll('svg');
        for (let svg of svgs) {
            const path = svg.querySelector('path');
            if (path) {
                const d = path.getAttribute('d') || '';
                // Comment bubble typically has specific path patterns
                if (d.includes('M12') && d.includes('C') && svg.closest('button, [role="button"]')) {
                    const parent = svg.closest('button, [role="button"]');
                    if (parent && parent.offsetParent) {
                        parent.click();
                        return {success: true, method: 'svg-path'};
                    }
                }
            }
        }
        
        // Method 5: Action bar - comment is usually 2nd after like
        const actionBar = document.querySelector('[class*="DivActionItemContainer"], [class*="ActionBar"]');
        if (actionBar) {
            const buttons = actionBar.querySelectorAll('button, [role="button"]');
            if (buttons.length >= 2) {
                buttons[1].click();
                return {success: true, method: 'action-bar-index'};
            }
        }
        
        // Method 6: Find by sibling of like button
        const likeBtn = document.querySelector('[data-e2e="like-icon"], [data-e2e="browse-like-icon"]');
        if (likeBtn) {
            const container = likeBtn.closest('[class*="Container"], [class*="Item"]');
            if (container && container.nextElementSibling) {
                const btn = container.nextElementSibling.querySelector('button, [role="button"]') || container.nextElementSibling;
                if (btn.offsetParent) {
                    btn.click();
                    return {success: true, method: 'like-sibling'};
                }
            }
        }
        
        return {success: false};
    }''')
    
    return result

def find_and_focus_comment_input(page):
    """Find and focus the comment input field"""
    result = page.evaluate('''() => {
        // Method 1: data-e2e attributes
        const selectors = [
            '[data-e2e="comment-input"]',
            '[data-e2e="comment-text-input"]',
            '[class*="DivInputEditorContainer"] [contenteditable="true"]',
            '[class*="CommentInputContainer"] [contenteditable="true"]',
            '[placeholder*="comment" i]',
            '[placeholder*="Add a comment" i]',
            '[placeholder*="commento" i]',
            '[placeholder*="Aggiungi" i]',
            'div[contenteditable="true"][data-contents="true"]',
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
        
        // Try finding by class patterns
        const editables = document.querySelectorAll('[contenteditable="true"]');
        for (let el of editables) {
            if (el.offsetParent && el.offsetHeight > 20 && el.offsetHeight < 200) {
                el.click();
                el.focus();
                return {success: true, method: 'contenteditable-search'};
            }
        }
        
        return {success: false};
    }''')
    
    return result

def click_post_button(page):
    """Click the post/submit button for the comment"""
    result = page.evaluate('''() => {
        // Method 1: data-e2e
        let btn = document.querySelector('[data-e2e="comment-post"]');
        if (btn && btn.offsetParent) { btn.click(); return {success: true, method: 'data-e2e-post'}; }
        
        // Method 2: Class-based
        const classSelectors = [
            '[class*="DivPostButton"]',
            '[class*="PostButton"]',
            '[class*="CommentPost"]',
            '[class*="submit" i]'
        ];
        
        for (let sel of classSelectors) {
            btn = document.querySelector(sel);
            if (btn && btn.offsetParent) { 
                btn.click(); 
                return {success: true, method: sel}; 
            }
        }
        
        // Method 3: Find by text content
        const postWords = ['post', 'pubblica', 'publicar', 'publier', 'posten', 'enviar', 'отправить', '发布', '게시', 'send', 'submit'];
        const elements = document.querySelectorAll('button, span, div[role="button"]');
        
        for (let el of elements) {
            const text = el.textContent.toLowerCase().trim();
            if (postWords.includes(text) && el.offsetParent) {
                el.click();
                return {success: true, method: 'text-' + text};
            }
        }
        
        return {success: false};
    }''')
    
    return result

def process_single_video_with_retry(page, video_num, profile_name, target_videos):
    """Process a single video with retry logic"""
    global commented_videos
    
    for attempt in range(MAX_RETRIES):
        try:
            log(f"    📹 Video {video_num + 1}/{target_videos}" + (f" (attempt {attempt + 1})" if attempt > 0 else ""))
            
            current_url = page.url
            
            # Check for login redirect
            if not check_login_status(page):
                log(f"    ⚠ Login required - skipping profile")
                return False, "login_required"
            
            # Handle hashtag/search grid view
            if "/tag/" in current_url or "/search" in current_url:
                log(f"    → Grid view detected - clicking video...")
                
                # Scroll to load more videos
                page.evaluate('window.scrollBy(0, 200)')
                time.sleep(1)
                
                # Try to click a video from the grid
                click_result = page.evaluate('''(videoIndex) => {
                    const videoSelectors = [
                        '[data-e2e="challenge-item"]',
                        '[data-e2e="search_top-item"]',
                        '[class*="DivItemCardContainer"]',
                        '[class*="DivVideoCard"]',
                        'a[href*="/video/"]'
                    ];
                    
                    for (let selector of videoSelectors) {
                        const videos = document.querySelectorAll(selector);
                        const targetIndex = videoIndex % Math.max(videos.length, 1);
                        if (videos.length > targetIndex) {
                            videos[targetIndex].click();
                            return {success: true, method: selector, count: videos.length};
                        }
                    }
                    return {success: false, count: 0};
                }''', video_num % 12)
                
                if not click_result.get('success'):
                    log(f"    ⚠ Could not find video in grid, scrolling...")
                    page.keyboard.press("ArrowDown")
                    time.sleep(2)
                    continue
                
                log(f"    ✓ Clicked video ({click_result.get('method')})")
                time.sleep(3)
                
                # Verify we're on video page
                if "/video/" not in page.url:
                    log(f"    ⚠ Video didn't open, retrying...")
                    continue
            
            video_id = f"video_{video_num}_{int(time.time())}"
            
            if video_id in commented_videos:
                log(f"    ⏭ Already commented, skipping")
                return True, "skipped"
            
            # Step 1: Open comments
            log(f"    → Opening comments...")
            comment_result = click_comment_button(page)
            
            if not comment_result.get('success'):
                log(f"    ⚠ Could not open comments")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                return False, "no_comments"
            
            log(f"    ✓ Comments opened ({comment_result.get('method')})")
            time.sleep(2)
            
            # Check if share dialog opened instead
            share_check = page.evaluate('''() => {
                const shareIndicators = ['copy link', 'share to', 'send to'];
                const text = document.body.innerText.toLowerCase();
                return shareIndicators.some(ind => text.includes(ind));
            }''')
            
            if share_check:
                log(f"    ⚠ Share dialog opened instead, closing...")
                page.keyboard.press("Escape")
                time.sleep(1)
                if attempt < MAX_RETRIES - 1:
                    continue
                return False, "wrong_dialog"
            
            # Step 2: Find comment input
            log(f"    → Finding input...")
            input_result = find_and_focus_comment_input(page)
            
            if not input_result.get('success'):
                log(f"    ⚠ Comment input not found")
                page.keyboard.press("Escape")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                return False, "no_input"
            
            log(f"    ✓ Input found ({input_result.get('method')})")
            time.sleep(0.5)
            
            # Step 3: Get and type comment
            comment_text, from_sheet = get_random_comment(None)
            if not comment_text:
                log(f"    ⚠ No comments available")
                return False, "no_comment_text"
            
            log(f"    → Typing ({from_sheet})...")
            
            # Clear any existing text first
            page.keyboard.press("Control+a")
            time.sleep(0.1)
            
            # Type the comment
            page.keyboard.type(comment_text, delay=random.randint(30, 70))
            time.sleep(1)
            
            # Step 4: Post comment
            log(f"    → Posting...")
            post_result = click_post_button(page)
            
            if not post_result.get('success'):
                log(f"    → Trying Enter key...")
                page.keyboard.press("Enter")
            else:
                log(f"    ✓ Clicked post ({post_result.get('method')})")
            
            time.sleep(2)
            
            # Success!
            commented_videos.add(video_id)
            
            return True, {
                "comment": comment_text,
                "sheet": from_sheet,
                "video_url": current_url,
                "video_id": video_id
            }
            
        except Exception as e:
            log(f"    ✗ Error: {str(e)[:100]}")
            if attempt < MAX_RETRIES - 1:
                log(f"    → Retrying in {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
            continue
    
    return False, "max_retries"

def run_tiktok_commenter(ws_endpoint, profile_name, sheet_name):
    """Connect to browser and comment on TikTok videos - IMPROVED VERSION"""
    global commented_videos
    
    if not HAS_PLAYWRIGHT:
        log("  ✗ Playwright not installed!")
        return False
    
    videos_commented = 0
    target_videos = settings["videos_per_profile"]
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 5
    
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
                log(f"  ⚠ No video found, continuing anyway...")
            
            # Process videos using improved retry logic
            for video_num in range(target_videos):
                if not automation_status["running"]:
                    log(f"  ⏹ Stopped by user")
                    break
                
                # Check consecutive failures
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    log(f"  ⚠ Too many consecutive failures ({MAX_CONSECUTIVE_FAILURES}), stopping profile")
                    break
                
                # Process video with retry
                success, result = process_single_video_with_retry(page, video_num, profile_name, target_videos)
                
                if success:
                    consecutive_failures = 0
                    
                    if isinstance(result, dict):
                        # Comment was posted successfully
                        videos_commented += 1
                        automation_status["comments_posted"] += 1
                        
                        report_entry = {
                            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "profile": profile_name,
                            "video_url": result.get("video_url", ""),
                            "video_id": result.get("video_id", ""),
                            "comment": result.get("comment", ""),
                            "sheet": result.get("sheet", "Unknown")
                        }
                        
                        automation_status["report"].append(report_entry)
                        save_report_history()
                        
                        # Send to cloud
                        try:
                            threading.Thread(target=send_to_cloud, args=(report_entry,), daemon=True).start()
                        except:
                            pass
                        
                        log(f"    ✓ SUCCESS: {result.get('comment', '')[:40]}...")
                        
                        # Close comments and wait
                        page.keyboard.press("Escape")
                        time.sleep(1)
                        
                        delay = random.randint(settings["min_delay"], settings["max_delay"])
                        log(f"    ⏳ Waiting {delay}s...")
                        for _ in range(delay):
                            if not automation_status["running"]:
                                break
                            time.sleep(1)
                else:
                    consecutive_failures += 1
                    if result == "login_required":
                        log(f"  ⚠ Profile not logged in, stopping")
                        break
                    log(f"    ⚠ Failed: {result}")
                
                # Navigate to next video
                try:
                    current_url = page.url
                    target_hashtag = settings.get("target_hashtag", "").strip()
                    
                    if "/video/" in current_url:
                        page.keyboard.press("Escape")
                        time.sleep(0.5)
                        
                        if target_hashtag:
                            # Go back to hashtag grid
                            if "/video/" in page.url:
                                hashtag = target_hashtag.replace("#", "").strip()
                                try:
                                    page.goto(f"https://www.tiktok.com/tag/{hashtag}", wait_until="domcontentloaded", timeout=30000)
                                    time.sleep(3)
                                    # Scroll to load more
                                    for _ in range(min(video_num // 3 + 1, 5)):
                                        page.keyboard.press("ArrowDown")
                                        time.sleep(0.3)
                                except:
                                    pass
                        else:
                            page.keyboard.press("ArrowDown")
                    else:
                        page.keyboard.press("ArrowDown")
                    
                    time.sleep(1)
                except:
                    pass
                
                # Clean up extra tabs
                try:
                    current_pages = context.pages
                    tiktok_pages = [pg for pg in current_pages if "tiktok" in pg.url.lower()]
                    if len(tiktok_pages) > 1:
                        for pg in tiktok_pages:
                            if pg != page:
                                pg.close()
                except:
                    pass
            
            log(f"  ✓ Done: {videos_commented} comments posted")
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
            <div class="tab" onclick="showTab('dm')">💬 DM</div>
            <div class="tab" onclick="showTab('post')">📤 Post</div>
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
        
        <!-- DM TAB - Brand Outreach -->
        <div id="tab-dm" style="display:none">
            <div class="grid">
                <div class="card">
                    <div class="card-title"><span>🎯 Brand DM Outreach</span></div>
                    <div style="background:#1e1b4b;border:1px solid #4c1d95;border-radius:8px;padding:12px;margin-bottom:12px;">
                        <div style="font-size:13px;color:#c4b5fd;font-weight:bold;margin-bottom:6px;">How It Works</div>
                        <div style="font-size:12px;color:#a1a1aa;line-height:1.8;">
                            <b style="color:#4ade80;">1.</b> Searches TikTok for brands/businesses needing social media help<br>
                            <b style="color:#60a5fa;">2.</b> Sends personalized DM about Bump Syndicate services<br>
                            <b style="color:#fbbf24;">3.</b> Max <span id="dm-limit-profile">100</span> DMs per profile, <span id="dm-limit-total">250</span> total per day<br>
                            <b style="color:#c4b5fd;">4.</b> Processes 2 profiles at a time, starting from lowest number
                        </div>
                    </div>
                    <div class="settings">
                        <div class="setting-row">
                            <label>Target Mode:</label>
                            <select id="dm-mode" onchange="dmModeChange()">
                                <option value="brand_search">🔍 Auto Search Brands</option>
                                <option value="specific">Specific Users</option>
                                <option value="hashtag">From Hashtag</option>
                                <option value="commenters">Video Commenters</option>
                                <option value="followers">Account Followers</option>
                            </select>
                        </div>
                        <div id="dm-brand-info" style="background:#14532d;border:1px solid #16a34a;border-radius:6px;padding:10px;margin:8px 0;">
                            <div style="font-size:12px;color:#4ade80;margin-bottom:4px;">🔍 Search Queries (random selection):</div>
                            <div style="font-size:11px;color:#86efac;line-height:1.6;" id="dm-search-queries">small business owner, startup founder, entrepreneur life, ecommerce brand, clothing brand, beauty brand, fitness brand, restaurant owner, salon owner, real estate agent...</div>
                        </div>
                        <div id="dm-specific" class="setting-row" style="display:none">
                            <label>Usernames:</label>
                            <textarea id="dm-users" placeholder="user1, user2, user3..." style="width:100%;height:60px;background:#27272a;border:1px solid #3f3f46;color:white;border-radius:6px;padding:8px;"></textarea>
                        </div>
                        <div id="dm-hashtag" class="setting-row" style="display:none">
                            <label>Hashtag:</label>
                            <input type="text" id="dm-tag" placeholder="#fitness" style="width:150px;">
                        </div>
                        <div id="dm-video" class="setting-row" style="display:none">
                            <label>Video URL:</label>
                            <input type="text" id="dm-video-url" placeholder="https://tiktok.com/..." style="width:250px;">
                        </div>
                        <div id="dm-account" class="setting-row" style="display:none">
                            <label>Account:</label>
                            <input type="text" id="dm-acc" placeholder="@username" style="width:150px;">
                        </div>
                        <div class="setting-row">
                            <label>Max DMs/profile:</label>
                            <input type="number" id="dm-max" value="100" min="1" max="100" style="width:80px;">
                        </div>
                        <div class="setting-row">
                            <label>Max DMs/day (total):</label>
                            <input type="number" id="dm-max-total" value="250" min="1" max="500" style="width:80px;">
                        </div>
                        <div class="setting-row">
                            <label>Min delay (s):</label>
                            <input type="number" id="dm-mind" value="45" style="width:80px;">
                        </div>
                        <div class="setting-row">
                            <label>Max delay (s):</label>
                            <input type="number" id="dm-maxd" value="90" style="width:80px;">
                        </div>
                    </div>
                    <button class="btn btn-secondary" onclick="saveDmSettings()" style="margin-top:10px;">💾 Save Settings</button>
                </div>
                <div class="card">
                    <div class="card-title"><span>📝 DM Message</span></div>
                    <div class="settings">
                        <div style="margin-bottom:12px;">
                            <label style="font-size:13px;color:#a1a1aa;">Message to send:</label>
                            <textarea id="dm-default-msg" style="width:100%;height:100px;background:#27272a;border:1px solid #3f3f46;color:white;border-radius:6px;padding:8px;margin-top:4px;">Hey! 👋 I noticed your brand and love what you're doing! We help businesses like yours grow on social media. Check out bumpsyndicate.xyz - we'd love to help you scale! 🚀</textarea>
                        </div>
                        <button class="btn btn-secondary" onclick="saveDmMessage()">💾 Save Message</button>
                    </div>
                </div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-title"><span>📊 DM Status</span></div>
                <div class="stats">
                    <div class="stat"><div class="stat-value" id="dm-sent">0</div><div class="stat-label">DMs Sent (Session)</div></div>
                    <div class="stat"><div class="stat-value" id="dm-today">0</div><div class="stat-label">Sent Today</div></div>
                    <div class="stat"><div class="stat-value" id="dm-remaining">250</div><div class="stat-label">Remaining Today</div></div>
                    <div class="stat"><div class="stat-value" id="dm-profiles-done">0</div><div class="stat-label">Profiles Done</div></div>
                </div>
                <div class="progress"><div class="progress-fill" id="dm-prog" style="width:0%"></div></div>
                <p class="center" style="color:#71717a" id="dm-st">Ready - Click Start to begin brand outreach</p>
                <div class="center" style="margin-top:20px;">
                    <button class="btn btn-success" id="dm-startb" onclick="startDm()">▶ Start Brand Outreach</button>
                    <button class="btn btn-danger" id="dm-stopb" onclick="stopDm()" style="display:none">⏹ Stop</button>
                </div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-title"><span>DM Log</span><button class="btn btn-secondary" style="padding:4px 8px" onclick="clrDmLog()">Clear</button></div>
                <div class="logs" id="dm-logs">Ready - Will search TikTok for brands and send DMs...</div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-title"><span>DM History</span>
                    <div>
                        <button class="btn btn-primary" onclick="expDmCSV()" style="padding:4px 12px">📥 Export</button>
                        <button class="btn btn-danger" onclick="clrDmHistory()" style="padding:4px 12px">🗑️ Clear</button>
                    </div>
                </div>
                <div style="max-height:200px;overflow:auto">
                    <table class="report-table"><thead><tr><th>Time</th><th>Profile</th><th>Username</th><th>Message</th><th>Status</th></tr></thead><tbody id="dm-rb"></tbody></table>
                </div>
            </div>
        </div>
        
        <!-- POST TAB (Auto Repost Scheduler) -->
        <div id="tab-post" style="display:none">
            <div class="grid">
                <div class="card">
                    <div class="card-title"><span>📤 Auto Repost Scheduler</span></div>
                    <div style="background:#1e1b4b;border:1px solid #4c1d95;border-radius:8px;padding:12px;margin-bottom:12px;">
                        <div style="font-size:13px;color:#c4b5fd;font-weight:bold;margin-bottom:6px;">Schedule Rules</div>
                        <div style="font-size:12px;color:#a1a1aa;line-height:1.8;">
                            <b style="color:#4ade80;">Monday:</b> Repost Bump Connect / Kollabsy / Bump Syndicate content<br>
                            <b style="color:#60a5fa;">Tue - Sun:</b> Repost social media / content creator content<br>
                            <b style="color:#fbbf24;">Limit:</b> Max <span id="post-limit-display">2</span> reposts per profile per day<br>
                            <b style="color:#c4b5fd;">Auto-run:</b> Scheduler starts daily at 9 AM when enabled
                        </div>
                    </div>
                    <div class="settings">
                        <div class="setting-row"><label>Max reposts/day:</label><input type="number" id="post-maxday" value="2" min="1" max="5" style="width:60px;"></div>
                        <div class="setting-row"><label>Min delay (s):</label><input type="number" id="post-mind" value="300" style="width:80px;"></div>
                        <div class="setting-row"><label>Max delay (s):</label><input type="number" id="post-maxd" value="600" style="width:80px;"></div>
                        <div style="font-size:11px;color:#71717a;margin-top:6px;">5-10 min delay between reposts to avoid detection</div>
                    </div>
                    <div class="center" style="margin-top:12px;">
                        <button class="btn btn-success" onclick="applyRepostSettings()">Save Settings</button>
                    </div>
                </div>
                <div class="card">
                    <div class="card-title"><span>Status</span></div>
                    <div class="stats" style="margin-top:8px;">
                        <div class="stat"><div class="stat-value" id="post-done">0</div><div class="stat-label">Reposts Made</div></div>
                        <div class="stat"><div class="stat-value" id="post-today-count">0</div><div class="stat-label">Today</div></div>
                    </div>
                    <div class="progress" style="margin-top:12px;"><div class="progress-fill" id="post-prog" style="width:0%"></div></div>
                    <p class="center" style="color:#71717a;font-size:12px;" id="post-st">Ready</p>
                    <p class="center" style="color:#52525b;font-size:11px;" id="post-next">Scheduler: Waiting...</p>
                    <div class="center" style="margin-top:16px;">
                        <button class="btn btn-success" id="post-startb" onclick="startPost()">▶ Start Repost Run</button>
                        <button class="btn btn-danger" id="post-stopb" onclick="stopPost()" style="display:none">⏹ Stop</button>
                    </div>
                </div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-title"><span>Repost Log</span><button class="btn btn-secondary" style="padding:4px 8px" onclick="clrPostLog()">Clear</button></div>
                <div class="logs" id="post-logs">Ready - Click Start or wait for auto-scheduler...</div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-title"><span>Repost History</span>
                    <div>
                        <button class="btn btn-primary" onclick="expPostCSV()" style="padding:4px 12px">📥 Export</button>
                        <button class="btn btn-danger" onclick="clrPostHistory()" style="padding:4px 12px">Clear</button>
                    </div>
                </div>
                <div style="max-height:200px;overflow:auto">
                    <table class="report-table"><thead><tr><th>Time</th><th>Profile</th><th>Video</th><th>Content Type</th><th>Status</th></tr></thead><tbody id="post-hist-tb"></tbody></table>
                </div>
            </div>
        </div>
        
        <div id="tab-report" style="display:none">
            <div class="card">
                <div class="card-title"><span>📊 All Comments History (All Time)</span><span id="rc" style="color:#71717a">0 total</span></div>
                <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="expCSV()">📥 Export CSV</button>
                    <button class="btn btn-secondary" onclick="syncCloud()" style="background:#4c1d95;">☁️ Sync to Cloud</button>
                    <button class="btn btn-danger" onclick="clrReport()">🗑️ Clear All</button>
                </div>
                <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap;padding:12px;background:#18181b;border-radius:8px;">
                    <span style="color:#71717a;font-size:12px;">📅 Date Range:</span>
                    <input type="date" id="startDate" onchange="applyDateRange()" style="padding:6px 10px;background:#27272a;border:1px solid #3f3f46;border-radius:6px;color:#e4e4e7;font-size:12px;">
                    <span style="color:#71717a;">to</span>
                    <input type="date" id="endDate" onchange="applyDateRange()" style="padding:6px 10px;background:#27272a;border:1px solid #3f3f46;border-radius:6px;color:#e4e4e7;font-size:12px;">
                    <button class="btn btn-secondary" onclick="clearDateRange()" style="padding:6px 12px;">Clear</button>
                    <span style="color:#3f3f46;">|</span>
                    <button class="btn btn-secondary" onclick="filterToday()">Today</button>
                    <button class="btn btn-secondary" onclick="filterWeek()">This Week</button>
                    <button class="btn btn-secondary" onclick="filterMonth()">This Month</button>
                    <button class="btn btn-secondary" onclick="filterAll()">All Time</button>
                </div>
                <div style="background:#1e1b4b;border:1px solid #4c1d95;border-radius:8px;padding:12px;margin-bottom:16px;">
                    <div style="font-size:12px;color:#a78bfa;margin-bottom:4px;">☁️ Team Dashboard</div>
                    <div style="font-size:11px;color:#71717a;">Comments are automatically synced to: <a href="https://creator-suite-18.preview.emergentagent.com" target="_blank" style="color:#7c3aed;">profile-reports-sync.preview.emergentagent.com</a></div>
                </div>
                <div id="filter-info" style="font-size:12px;color:#a78bfa;margin-bottom:10px;">Showing: All time</div>
                <div style="max-height:400px;overflow:auto">
                    <table class="report-table"><thead><tr><th>Date/Time</th><th>Profile</th><th>Comment</th><th>Video</th><th>Sheet</th></tr></thead><tbody id="rb"></tbody></table>
                </div>
                <div style="margin-top:16px;padding:12px;background:#27272a;border-radius:8px;">
                    <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
                        <div style="text-align:center;padding:8px 16px;background:#1e1b4b;border:1px solid #4c1d95;border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#a78bfa" id="sum-month">0</div><div style="font-size:11px;color:#71717a">This Month</div></div>
                        <div style="text-align:center;padding:8px 16px;background:#172554;border:1px solid #1d4ed8;border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#60a5fa" id="sum-week">0</div><div style="font-size:11px;color:#71717a">This Week</div></div>
                        <div style="text-align:center;padding:8px 16px;background:#14532d;border:1px solid #16a34a;border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#4ade80" id="sum-today">0</div><div style="font-size:11px;color:#71717a">Today</div></div>
                        <div style="text-align:center;padding:8px 16px;background:#27272a;border:1px solid #3f3f46;border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#e4e4e7" id="sum-total">0</div><div style="font-size:11px;color:#71717a">All Time</div></div>
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
        function showTab(t){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));event.target.classList.add('active');document.getElementById('tab-main').style.display=t=='main'?'block':'none';document.getElementById('tab-dm').style.display=t=='dm'?'block':'none';document.getElementById('tab-post').style.display=t=='post'?'block':'none';document.getElementById('tab-report').style.display=t=='report'?'block':'none';if(t=='dm')updDm();if(t=='post')updPost();}
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

            const now=new Date();
            const todayStr=now.toISOString().split('T')[0];
            const weekAgo=new Date(now-7*24*60*60*1000).toISOString().split('T')[0];
            const monthAgo=new Date(now-30*24*60*60*1000).toISOString().split('T')[0];

            document.getElementById('sum-total').textContent=report.length.toLocaleString();
            document.getElementById('sum-month').textContent=report.filter(r=>r.timestamp>=monthAgo).length.toLocaleString();
            document.getElementById('sum-week').textContent=report.filter(r=>r.timestamp>=weekAgo).length.toLocaleString();
            document.getElementById('sum-today').textContent=report.filter(r=>r.timestamp.startsWith(todayStr)).length.toLocaleString();
        }

        function applyDateRange(){
            const startDate=document.getElementById('startDate').value;
            const endDate=document.getElementById('endDate').value;
            if(!startDate&&!endDate){filterAll();return;}
            filteredReport=report.filter(r=>{
                const ts=r.timestamp.split(' ')[0];
                if(startDate&&ts<startDate)return false;
                if(endDate&&ts>endDate)return false;
                return true;
            });
            let info='Showing: ';
            if(startDate&&endDate)info+=startDate+' to '+endDate;
            else if(startDate)info+='From '+startDate;
            else if(endDate)info+='Until '+endDate;
            info+=' ('+filteredReport.length+' comments)';
            document.getElementById('filter-info').textContent=info;
            currentFilter='custom';
            renderReport();
        }

        function clearDateRange(){
            document.getElementById('startDate').value='';
            document.getElementById('endDate').value='';
            filterAll();
        }
        
        async function upd(){try{const r=await fetch('/api/status');const d=await r.json();document.getElementById('prog').style.width=(d.total?(d.progress/d.total*100):0)+'%';document.getElementById('sp').textContent=d.completed.length;document.getElementById('sc').textContent=d.comments_posted||0;document.getElementById('st').textContent=d.running?'Running: '+d.current_profile+' ('+d.progress+'/'+d.total+')':'Ready';if(!d.running){document.getElementById('startb').style.display='inline';document.getElementById('stopb').style.display='none';}if(d.logs.length)document.getElementById('logs').innerHTML=d.logs.map(l=>'<div style="color:'+(l.includes('✗')?'#f87171':l.includes('✓')?'#4ade80':'#a1a1aa')+'">'+l+'</div>').join('');if(d.report&&d.report.length!==report.length){report=d.report;applyFilter();}}catch(e){}}
        function clrLog(){fetch('/api/clear-logs',{method:'POST'});document.getElementById('logs').innerHTML='Cleared';}
        async function clrReport(){if(!confirm('⚠️ Delete ALL comment history forever?\\n\\nThis will remove '+report.length+' comments and cannot be undone.'))return;await fetch('/api/clear-report',{method:'POST'});report=[];filteredReport=[];renderReport();}
        function expCSV(){if(!report.length)return alert('No data');const csv='Date,Time,Profile,Comment,Video URL,Sheet\\n'+report.map(r=>{const[d,t]=r.timestamp.split(' ');return d+','+t+','+r.profile+',"'+r.comment.replace(/"/g,'""')+'",'+r.video_url+','+r.sheet;}).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv]));a.download='tiktok_comments_history_'+new Date().toISOString().split('T')[0]+'.csv';a.click();}
        async function syncCloud(){if(!report.length)return alert('No reports to sync');try{const r=await fetch('/api/sync-to-cloud',{method:'POST'});const d=await r.json();alert('☁️ Synced '+d.synced+' reports to cloud dashboard!');}catch(e){alert('Sync failed: '+e.message);}}
        
        // Repost Functions
        let postStatus={running:false,posts_made:0,history:[],logs:[]};
        async function updPost(){
            try{
                const r=await fetch('/api/post/status');
                const d=await r.json();
                postStatus=d;
                document.getElementById('post-done').textContent=d.posts_made||0;
                const todayCount=d.history?d.history.filter(h=>{const t=h.timestamp||'';return t.startsWith(new Date().toISOString().split('T')[0])}).length:0;
                document.getElementById('post-today-count').textContent=todayCount;
                document.getElementById('post-prog').style.width=(d.total?(d.progress/d.total*100):0)+'%';
                const dayName=new Date().toLocaleDateString('en-US',{weekday:'long'});
                const isMonday=new Date().getDay()===1;
                const contentType=isMonday?'Brand':'Social Media';
                document.getElementById('post-st').textContent=d.running?'Reposting: '+d.current_profile+' ('+d.progress+'/'+d.total+')':'Ready ('+dayName+': '+contentType+' content)';
                document.getElementById('post-next').textContent=d.last_run?(d.last_run===new Date().toISOString().split('T')[0]?'Last run: Today':'Last run: '+d.last_run)+(d.next_run?' | Next: '+d.next_run:''):'Scheduler: Waiting for first run...';
                if(!d.running){document.getElementById('post-startb').style.display='inline';document.getElementById('post-stopb').style.display='none';}
                else{document.getElementById('post-startb').style.display='none';document.getElementById('post-stopb').style.display='inline';}
                if(d.logs&&d.logs.length)document.getElementById('post-logs').innerHTML=d.logs.map(l=>'<div style="color:'+(l.includes('Error')||l.includes('Failed')?'#f87171':l.includes('Reposted')||l.includes('Done')?'#4ade80':'#a1a1aa')+'">'+l+'</div>').join('');
                renderPostHistory(d.history||[]);
            }catch(e){}
        }
        setInterval(()=>{if(document.getElementById('tab-post').style.display!='none')updPost();},2000);
        function renderPostHistory(hist){
            document.getElementById('post-hist-tb').innerHTML=hist.length?hist.slice().reverse().slice(0,50).map(h=>'<tr><td>'+h.timestamp+'</td><td>'+h.profile+'</td><td><a href="'+h.video+'" target="_blank" style="color:#a78bfa">View</a></td><td style="color:'+(h.content_type=='brand'?'#4ade80':'#60a5fa')+'">'+((h.content_type||'').charAt(0).toUpperCase()+(h.content_type||'').slice(1))+'</td><td style="color:#4ade80">'+h.status+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;color:#71717a">No reposts yet. Click Start or wait for auto-scheduler.</td></tr>';
        }
        async function applyRepostSettings(){
            const s={max_reposts_per_day:+document.getElementById('post-maxday').value,min_delay:+document.getElementById('post-mind').value,max_delay:+document.getElementById('post-maxd').value};
            await fetch('/api/post/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)});
            document.getElementById('post-limit-display').textContent=s.max_reposts_per_day;
            alert('Settings saved!');
        }
        async function startPost(){await fetch('/api/post/start',{method:'POST'});document.getElementById('post-startb').style.display='none';document.getElementById('post-stopb').style.display='inline';}
        async function stopPost(){await fetch('/api/post/stop',{method:'POST'});}
        function clrPostLog(){fetch('/api/post/clear-logs',{method:'POST'});document.getElementById('post-logs').innerHTML='Cleared';}
        async function clrPostHistory(){if(!confirm('Clear all repost history?'))return;await fetch('/api/post/clear-history',{method:'POST'});updPost();}
        function expPostCSV(){window.open('/api/post/export','_blank');}
        
        // DM Functions
        let dmStatus={running:false,dms_sent:0,report:[]};
        function dmModeChange(){
            const mode=document.getElementById('dm-mode').value;
            document.getElementById('dm-brand-info').style.display=mode=='brand_search'?'block':'none';
            document.getElementById('dm-specific').style.display=mode=='specific'?'block':'none';
            document.getElementById('dm-hashtag').style.display=mode=='hashtag'?'block':'none';
            document.getElementById('dm-video').style.display=mode=='commenters'?'block':'none';
            document.getElementById('dm-account').style.display=mode=='followers'?'block':'none';
        }
        async function updDm(){
            try{
                const r=await fetch('/api/dm/status');
                const d=await r.json();
                dmStatus=d;
                document.getElementById('dm-sent').textContent=d.dms_sent||0;
                document.getElementById('dm-today').textContent=d.dms_sent_today||0;
                const maxTotal=d.settings?.max_dms_total||250;
                document.getElementById('dm-remaining').textContent=Math.max(0, maxTotal-(d.dms_sent_today||0));
                document.getElementById('dm-profiles-done').textContent=d.profiles_completed?.length||0;
                document.getElementById('dm-prog').style.width=(d.total?(d.progress/d.total*100):0)+'%';
                document.getElementById('dm-st').textContent=d.running?'🔄 Running: '+d.current_profile+' ('+d.progress+'/'+d.total+')':'Ready - Click Start to begin brand outreach';
                if(!d.running){document.getElementById('dm-startb').style.display='inline';document.getElementById('dm-stopb').style.display='none';}
                else{document.getElementById('dm-startb').style.display='none';document.getElementById('dm-stopb').style.display='inline';}
                if(d.logs&&d.logs.length)document.getElementById('dm-logs').innerHTML=d.logs.map(l=>'<div style="color:'+(l.includes('✗')?'#f87171':l.includes('✓')?'#4ade80':l.includes('⚠')?'#fbbf24':'#a1a1aa')+'">'+l+'</div>').join('');
                if(d.report)renderDmReport(d.report);
                if(d.targets?.messages?.default)document.getElementById('dm-default-msg').value=d.targets.messages.default;
                // Update limit displays
                document.getElementById('dm-limit-profile').textContent=d.settings?.max_dms_per_profile||100;
                document.getElementById('dm-limit-total').textContent=d.settings?.max_dms_total||250;
            }catch(e){}
        }
        setInterval(()=>{if(document.getElementById('tab-dm').style.display!='none')updDm();},2000);
        function renderDmReport(rep){
            document.getElementById('dm-rb').innerHTML=rep.length?rep.slice().reverse().slice(0,50).map(r=>'<tr><td>'+r.timestamp+'</td><td>'+r.profile+'</td><td>@'+r.username+'</td><td title="'+r.message+'">'+r.message.substring(0,30)+'...</td><td style="color:'+(r.status=='sent'?'#4ade80':'#f87171')+'">'+r.status+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;color:#71717a">No DMs sent yet</td></tr>';
        }
        async function saveDmSettings(){
            const mode=document.getElementById('dm-mode').value;
            const settings={
                target_mode:mode,
                max_dms_per_profile:+document.getElementById('dm-max').value,
                max_dms_total:+document.getElementById('dm-max-total').value,
                min_delay:+document.getElementById('dm-mind').value,
                max_delay:+document.getElementById('dm-maxd').value,
                target_hashtag:document.getElementById('dm-tag').value,
                target_video_url:document.getElementById('dm-video-url').value,
                target_account:document.getElementById('dm-acc').value
            };
            await fetch('/api/dm/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});
            alert('DM settings saved!');
        }
        async function saveDmMessage(){
            const msg=document.getElementById('dm-default-msg').value;
            await fetch('/api/dm/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})});
            alert('Message saved!');
        }
        async function startDm(){
            await saveDmSettings();
            await fetch('/api/dm/start',{method:'POST'});
            document.getElementById('dm-startb').style.display='none';
            document.getElementById('dm-stopb').style.display='inline';
        }
        async function stopDm(){await fetch('/api/dm/stop',{method:'POST'});}
        function clrDmLog(){fetch('/api/dm/clear-logs',{method:'POST'});document.getElementById('dm-logs').innerHTML='Cleared';}
        async function clrDmHistory(){if(!confirm('Clear all DM history?'))return;await fetch('/api/dm/clear-history',{method:'POST'});dmStatus.report=[];renderDmReport([]);}
        function expDmCSV(){window.open('/api/dm/export','_blank');}
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

@app.route('/api/sync-to-cloud', methods=['POST'])
def api_sync_to_cloud():
    """Manually sync all reports to cloud dashboard"""
    synced = sync_all_to_cloud()
    return jsonify({"ok": True, "synced": synced})

@app.route('/api/clear-report', methods=['POST'])
def api_clear_report():
    automation_status["report"] = []
    automation_status["comments_posted"] = 0
    save_report_history()
    return jsonify({"ok": True})

# =============================================================================
# DM API ROUTES
# =============================================================================

@app.route('/api/dm/status')
def api_dm_status():
    return jsonify({
        "running": dm_status["running"],
        "current_profile": dm_status["current_profile"],
        "progress": dm_status["progress"],
        "total": dm_status["total"],
        "dms_sent": dm_status["dms_sent"],
        "logs": dm_status["logs"][-100:],
        "report": dm_status["report"][-50:],
        "settings": dm_settings,
        "targets": {
            "specific_users_count": len(dm_targets.get("specific_users", [])),
            "messages": dm_targets.get("messages", {}),
            "groups_count": len(dm_targets["messages"].get("groups", {}))
        }
    })

@app.route('/api/dm/settings', methods=['POST'])
def api_dm_settings():
    data = request.json or {}
    dm_settings.update({
        "enabled": data.get("enabled", dm_settings["enabled"]),
        "max_dms_per_profile": data.get("max_dms_per_profile", dm_settings["max_dms_per_profile"]),
        "min_delay": data.get("min_delay", dm_settings["min_delay"]),
        "max_delay": data.get("max_delay", dm_settings["max_delay"]),
        "target_mode": data.get("target_mode", dm_settings["target_mode"]),
        "target_hashtag": data.get("target_hashtag", dm_settings["target_hashtag"]),
        "target_account": data.get("target_account", dm_settings["target_account"]),
        "target_video_url": data.get("target_video_url", dm_settings["target_video_url"]),
    })
    return jsonify({"ok": True, "settings": dm_settings})

@app.route('/api/dm/targets', methods=['GET'])
def api_dm_targets_get():
    return jsonify(dm_targets)

@app.route('/api/dm/targets', methods=['POST'])
def api_dm_targets_set():
    data = request.json or {}
    
    if "specific_users" in data:
        # Accept list of usernames or comma-separated string
        users = data["specific_users"]
        if isinstance(users, str):
            users = [u.strip().replace("@", "") for u in users.split(",") if u.strip()]
        dm_targets["specific_users"] = users
    
    if "default_message" in data:
        dm_targets["messages"]["default"] = data["default_message"]
    
    if "groups" in data:
        dm_targets["messages"]["groups"] = data["groups"]
    
    save_dm_data()
    return jsonify({"ok": True, "targets": dm_targets})

@app.route('/api/dm/add-group', methods=['POST'])
def api_dm_add_group():
    data = request.json or {}
    group_name = data.get("name", "").strip()
    users = data.get("users", [])
    message = data.get("message", dm_targets["messages"]["default"])
    
    if not group_name:
        return jsonify({"error": "Group name required"}), 400
    
    if isinstance(users, str):
        users = [u.strip().replace("@", "") for u in users.split(",") if u.strip()]
    
    dm_targets["messages"]["groups"][group_name] = {
        "users": users,
        "message": message
    }
    
    save_dm_data()
    return jsonify({"ok": True, "group": group_name})

@app.route('/api/dm/delete-group', methods=['POST'])
def api_dm_delete_group():
    data = request.json or {}
    group_name = data.get("name", "")
    
    if group_name in dm_targets["messages"]["groups"]:
        del dm_targets["messages"]["groups"][group_name]
        save_dm_data()
    
    return jsonify({"ok": True})

@app.route('/api/dm/start', methods=['POST'])
def api_dm_start():
    if dm_status["running"]:
        return jsonify({"error": "DM automation already running"}), 400
    
    success = start_dm_automation()
    return jsonify({"ok": success})

@app.route('/api/dm/stop', methods=['POST'])
def api_dm_stop():
    stop_dm_automation()
    return jsonify({"ok": True})

@app.route('/api/dm/clear-logs', methods=['POST'])
def api_dm_clear_logs():
    dm_status["logs"] = []
    return jsonify({"ok": True})

@app.route('/api/dm/clear-history', methods=['POST'])
def api_dm_clear_history():
    dm_status["report"] = []
    dm_status["sent_to"] = set()
    dm_status["dms_sent"] = 0
    save_dm_data()
    return jsonify({"ok": True})

@app.route('/api/dm/export', methods=['GET'])
def api_dm_export():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Time", "Profile", "Username", "Message", "Status"])
    
    for r in dm_status["report"]:
        ts = r.get("timestamp", "")
        date, time_str = (ts.split(" ") + [""])[:2]
        writer.writerow([date, time_str, r.get("profile", ""), r.get("username", ""), r.get("message", ""), r.get("status", "")])
    
    return output.getvalue(), 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': f'attachment; filename=dm_history_{datetime.now().strftime("%Y%m%d")}.csv'
    }

# =============================================================================
# REPOST API ROUTES
# =============================================================================

@app.route('/api/post/status')
def api_post_status():
    today = datetime.now().strftime("%Y-%m-%d")
    day_name = datetime.now().strftime("%A")
    is_monday = datetime.now().weekday() == 0
    return jsonify({
        "running": post_status["running"],
        "current_profile": post_status["current_profile"],
        "progress": post_status["progress"],
        "total": post_status["total"],
        "posts_made": post_status["posts_made"],
        "last_run": post_status.get("last_run"),
        "next_run": post_status.get("next_run"),
        "day_name": day_name,
        "content_type": "brand" if is_monday else "social",
        "max_per_day": post_settings["max_reposts_per_day"],
        "history": post_status["history"][-50:],
        "logs": post_status["logs"][-100:]
    })

@app.route('/api/post/settings', methods=['POST'])
def api_post_settings():
    data = request.json or {}
    if "min_delay" in data:
        post_settings["min_delay"] = data["min_delay"]
    if "max_delay" in data:
        post_settings["max_delay"] = data["max_delay"]
    if "max_reposts_per_day" in data:
        post_settings["max_reposts_per_day"] = max(1, min(5, data["max_reposts_per_day"]))
    return jsonify({"ok": True, "settings": post_settings})

@app.route('/api/post/start', methods=['POST'])
def api_post_start():
    if post_status["running"]:
        return jsonify({"error": "Repost automation already running"}), 400
    success = start_repost_automation()
    return jsonify({"ok": success})

@app.route('/api/post/stop', methods=['POST'])
def api_post_stop():
    stop_post_automation()
    return jsonify({"ok": True})

@app.route('/api/post/clear-logs', methods=['POST'])
def api_post_clear_logs():
    post_status["logs"] = []
    return jsonify({"ok": True})

@app.route('/api/post/clear-history', methods=['POST'])
def api_post_clear_history():
    post_status["history"] = []
    post_status["posts_made"] = 0
    save_post_data()
    return jsonify({"ok": True})

@app.route('/api/post/export', methods=['GET'])
def api_post_export():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Time", "Profile", "Video", "Content Type", "Status"])
    for r in post_status["history"]:
        ts = r.get("timestamp", "")
        date, time_str = (ts.split(" ") + [""])[:2]
        writer.writerow([date, time_str, r.get("profile", ""), r.get("video", ""), r.get("content_type", ""), r.get("status", "")])
    return output.getvalue(), 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': f'attachment; filename=repost_history_{datetime.now().strftime("%Y%m%d")}.csv'
    }

if __name__ == "__main__":
    print("=" * 50)
    print("  TikTok Commenter - http://localhost:9090")
    print("=" * 50)
    load_report_history()  # Load past runs
    load_dm_data()  # Load DM data
    load_post_data()  # Load post queue and history
    # Start background scheduler thread
    sched_thread = threading.Thread(target=scheduler_loop, daemon=True)
    sched_thread.start()
    print("  Scheduler running (checks scheduled posts every 30s)")
    app.run(host="0.0.0.0", port=9090, debug=False)
