# AdsPower Rebotou Automation Dashboard

## Original Problem Statement
User needs to automate AdsPower browsers with Rebotou extension (TikTok auto-like and comment bot). They have 25 AdsPower profiles that need to run Rebotou daily with comments coming from Google Sheets. User wants a dashboard with a button - no scripts to run manually.

## Solution: Standalone Dashboard App
A Python app that runs locally on the user's machine, providing a web dashboard with:
- **Sync Profiles button** - Auto-fetches all 25 profiles from AdsPower API
- **Run Selected Profiles button** - One-click automation
- Comments auto-loaded from Google Sheets
- Real-time progress and logs

## Architecture
- **Standalone App**: `adspower_dashboard.py` - Flask + Playwright
- **Runs locally** on user's machine where AdsPower is installed
- **Opens localhost:8080** in browser with full dashboard UI

## User Flow
1. Download `adspower_dashboard.py` from web dashboard
2. Install: `pip install requests playwright flask && playwright install chromium`
3. Run: `python adspower_dashboard.py`
4. Open http://localhost:8080
5. Click "Sync from AdsPower" → Select profiles → Click "Run Selected Profiles"

## Configuration
- AdsPower API Port: 50325
- Rebotou Extension ID: cfgkjnjmlckppgajnicogfdnhhndpikk
- Google Sheet ID: 1cgjxB09nXSsKMEFwNxQlDzl8xVDyQgT0o8aKm6YOJ-o
- Sheets: Bump Connect, Bump Syndicate, Kollabsy

## What's Been Implemented (Jan 2026)
- [x] Web page with download link and setup instructions
- [x] Standalone Python dashboard app with Flask
- [x] AdsPower API integration (sync profiles, open/close browsers)
- [x] Google Sheets integration (fetch comments)
- [x] Playwright automation for Rebotou extension
- [x] Real-time progress tracking and logs
- [x] Profile-to-sheet mapping (different comments per profile)

## Next Tasks
1. User to download and test on local machine
2. Fine-tune Rebotou DOM interaction based on actual extension behavior
3. Add scheduled runs option if needed
