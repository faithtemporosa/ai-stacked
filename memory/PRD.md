# AdsPower Rebotou Automation Dashboard

## Original Problem Statement
User needs to automate AdsPower browsers with Rebotou extension (TikTok auto-like and comment bot). They have 25 AdsPower profiles that need to run Rebotou daily with comments coming from Google Sheets.

## Architecture
- **Frontend**: React.js with Tailwind CSS - Dashboard for profile management
- **Backend**: FastAPI - API for profile CRUD, Google Sheets integration, script generation
- **Database**: MongoDB - Store profiles and run history
- **Local Script**: Python script (downloaded) runs on user's machine with AdsPower installed

## User Personas
- TikTok marketers managing multiple accounts
- Social media managers automating engagement

## Core Requirements
- [x] Web dashboard to manage AdsPower profiles
- [x] Google Sheets integration for comments (publicly viewable)
- [x] Different comment sheets per profile (Bump Connect, Bump Syndicate, Kollabsy)
- [x] Generate downloadable automation script
- [x] Sequential execution (one profile at a time)
- [x] Manual trigger (not scheduled)

## What's Been Implemented (Jan 2026)
- Profile management (CRUD operations)
- Google Sheets CSV parsing for comments
- Three tabs: Profiles, Comments, Run History
- Python script generation with Playwright automation
- AdsPower API integration for browser control

## Configuration
- AdsPower API Port: 50325
- Rebotou Extension ID: cfgkjnjmlckppgajnicogfdnhhndpikk
- Google Sheet ID: 1cgjxB09nXSsKMEFwNxQlDzl8xVDyQgT0o8aKm6YOJ-o

## Prioritized Backlog
### P0 (Critical) - DONE
- Dashboard UI
- Profile management
- Google Sheets integration
- Script generation

### P1 (High)
- Bulk profile import from AdsPower
- Comment rotation logic in Rebotou

### P2 (Medium)
- Scheduled runs (cron-based)
- Run status webhooks from local script
- Detailed logging and error reporting

## Next Tasks
1. User to add all 25 AdsPower profile IDs
2. Test automation script on local machine
3. Fine-tune Rebotou interaction based on actual DOM structure
