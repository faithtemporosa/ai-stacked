# TikTok Auto Commenter - Product Requirements Document

## Original Problem Statement
User wants to automate posting promotional comments on TikTok using their 25 AdsPower browser profiles. The tool should be a local script controlled by a web dashboard, with a **public-facing website where teammates can view the reports in real-time**.

## Solution Architecture

### Components
1. **Local Script (`tiktok_commenter.py`)** - Runs on user's Mac, connects to AdsPower, automates TikTok commenting via Playwright
2. **Cloud Backend (FastAPI)** - Receives and stores comment reports for team dashboard
3. **Public Dashboard (React)** - Real-time viewing of all comments posted across profiles

### Key Features
- **Profile Management**: Sync 25 profiles from AdsPower local API
- **Parallel Execution**: Run 2 browsers simultaneously for stability
- **Hashtag Targeting**: Target For You page or specific hashtags
- **Brand Promotion**: Rotate between Bump Connect, Kollabsy, and Bump Syndicate
- **Real-time Reporting**: Comments sync to cloud dashboard automatically
- **Team Access**: Public dashboard for teammates at cloud URL

## Technical Stack
- **Local Script**: Python + Flask + Playwright
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + TailwindCSS
- **Deployment**: Kubernetes (Emergent Platform)

## API Endpoints

### Cloud Reporting API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports` | POST | Receive single comment report |
| `/api/reports/bulk` | POST | Receive multiple reports at once |
| `/api/reports` | GET | Get reports with filters (today, week, month, profile, sheet) |
| `/api/reports/stats` | GET | Get dashboard statistics |
| `/api/reports` | DELETE | Clear all reports |

### Local Script API (localhost:9090)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard UI |
| `/api/sync-profiles` | POST | Sync profiles from AdsPower |
| `/api/start` | POST | Start automation |
| `/api/stop` | POST | Stop automation |
| `/api/status` | GET | Get current status and logs |
| `/api/sync-to-cloud` | POST | Manual bulk sync to cloud |

## Data Models

### CommentReport
```json
{
  "id": "uuid",
  "timestamp": "2025-01-15 10:30:00",
  "profile": "Profile Name",
  "video_url": "https://tiktok.com/...",
  "video_id": "unique_video_id",
  "comment": "promotional comment text",
  "sheet": "Bump Connect|Kollabsy|Bump Syndicate",
  "received_at": "ISO timestamp"
}
```

## Completed Work (Feb 2026)

### Phase 1: Public Real-time Dashboard ✅
- [x] Created FastAPI reporting endpoints (POST /api/reports, GET /api/reports, GET /api/reports/stats)
- [x] Built React dashboard with stats cards, brand breakdown, filters
- [x] Added auto-refresh (10 second interval) with toggle
- [x] Implemented filter buttons (Today, This Week, This Month, All Time)
- [x] Updated local script to send reports to cloud API
- [x] Added "Sync to Cloud" button for bulk historical sync
- [x] Testing: 100% backend (14/14), 100% frontend

### Phase 2 (Previous): Local TikTok Automation
- [x] AdsPower API integration
- [x] Playwright-based TikTok commenting
- [x] Parallel execution (2 browsers)
- [x] Hashtag targeting support
- [x] Local dashboard with controls
- [x] CSV export functionality

## Known Issues

### P1: TikTok Automation Stability
- **Issue**: Script occasionally fails to find video elements or times out
- **Cause**: TikTok's dynamic DOM structure changes
- **Status**: Requires ongoing selector updates

## Upcoming Tasks

### P0: None - Core features complete

### P1: Improve Automation Stability
- Update Playwright selectors for current TikTok structure
- Add more robust error handling
- Implement retry logic for failed comments

### P2: Productize into Hybrid SaaS
- User authentication and accounts
- Billing integration (Stripe)
- Downloadable local agent installer
- Team management features
- Usage analytics

## Configuration

### Default Settings
- **Parallel Browsers**: 2 (fixed for stability)
- **Videos per Profile**: 100
- **Delay Between Comments**: 30-60 seconds
- **Target**: For You page or hashtag

### Brands Promoted
1. **Bump Connect** - bumpconnect.xyz
2. **Kollabsy** - kollabsy.xyz
3. **Bump Syndicate** - bumpsyndicate.xyz

## Files Reference
- `/app/downloads/tiktok_commenter.py` - Local automation script
- `/app/backend/server.py` - Cloud API server
- `/app/frontend/src/App.js` - Public dashboard
- `/app/tiktok_comments_history.json` - Local report storage

## URLs
- **Public Dashboard**: https://profile-reports-sync.preview.emergentagent.com
- **Local Dashboard**: http://localhost:9090 (when running locally)
- **Cloud API**: https://profile-reports-sync.preview.emergentagent.com/api
