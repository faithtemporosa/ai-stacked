# TikTok Auto Commenter - Product Requirements Document

## Original Problem Statement
User wants to automate posting promotional comments on TikTok using their 25 AdsPower browser profiles. The tool should be a local script controlled by a web dashboard, with a **public-facing website where teammates can view the reports in real-time**.

## Solution Architecture

### Components
1. **Local Script (`tiktok_commenter.py`)** - Runs on user's Mac, connects to AdsPower, automates TikTok commenting via Playwright
2. **Cloud Backend (FastAPI)** - Receives and stores comment reports, handles user authentication
3. **Public Dashboard (React)** - Real-time viewing of all comments posted across profiles with auth

### Key Features
- **Profile Management**: Sync 25 profiles from AdsPower local API
- **Parallel Execution**: Run 2 browsers simultaneously for stability
- **Hashtag Targeting**: Target For You page or specific hashtags
- **Brand Promotion**: Rotate between Bump Connect, Kollabsy, and Bump Syndicate
- **Real-time Reporting**: Comments sync to cloud dashboard automatically
- **Team Access**: Authenticated dashboard with team invites
- **Live Logs**: Stream automation logs to cloud dashboard

## Technical Stack
- **Local Script**: Python + Flask + Playwright
- **Backend**: FastAPI + MongoDB + JWT Auth
- **Frontend**: React + TailwindCSS
- **Deployment**: Kubernetes (Emergent Platform)

## API Endpoints

### Authentication API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user with optional team |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/me` | GET | Get current user profile |
| `/api/teams/create` | POST | Create a new team |
| `/api/teams/invite` | POST | Invite user to team |
| `/api/teams/members` | GET | Get team members |

### Reporting API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports` | POST | Receive single comment report |
| `/api/reports/bulk` | POST | Receive multiple reports |
| `/api/reports` | GET | Get reports with filters |
| `/api/reports/stats` | GET | Get dashboard statistics |
| `/api/reports/import` | POST | Import from local JSON file |
| `/api/logs` | POST | Receive live logs |
| `/api/logs` | GET | Get live logs for dashboard |

## Completed Work

### Phase 1: Public Real-time Dashboard ✅ (Feb 2026)
- [x] Cloud API for receiving/serving reports
- [x] React dashboard with stats, filters, auto-refresh
- [x] Import Data feature for bulk uploads
- [x] Live logs streaming from local script

### Phase 2: P1 - Automation Stability ✅ (Feb 2026)
- [x] Added retry logic (3 attempts per video)
- [x] Updated Playwright selectors for TikTok 2025
- [x] Improved error handling with consecutive failure tracking
- [x] Better login detection and skip logic
- [x] Modular helper functions (click_comment_button, find_and_focus_comment_input, etc.)

### Phase 3: P2 - SaaS Features ✅ (Feb 2026)
- [x] JWT-based authentication (register/login)
- [x] User accounts with team support
- [x] Team creation and member invites
- [x] Role-based access (admin, member, viewer)
- [x] Sign In/Sign Out in dashboard header

### Deployment Ready ✅
- [x] All environment variables configured
- [x] No hardcoded secrets or URLs
- [x] CORS properly configured
- [x] Database queries optimized
- [x] Ready for Emergent production deployment

## Configuration

### Environment Variables (backend/.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
JWT_SECRET="your-secure-jwt-secret"
GOOGLE_SHEET_ID="..."
REBOTOU_EXTENSION_ID="..."
ADSPOWER_API_PORT=50325
```

### Default Settings
- **Parallel Browsers**: 2 (fixed for stability)
- **Videos per Profile**: 100
- **Delay Between Comments**: 30-60 seconds
- **Max Consecutive Failures**: 5
- **Max Retries per Video**: 3

### Brands Promoted
1. **Bump Connect** - bumpconnect.xyz
2. **Kollabsy** - kollabsy.xyz
3. **Bump Syndicate** - bumpsyndicate.xyz

## Files Reference
- `/app/downloads/tiktok_commenter.py` - Local automation script (updated with P1 stability fixes)
- `/app/backend/server.py` - Cloud API server with auth
- `/app/frontend/src/App.js` - Public dashboard with auth
- `/app/frontend/src/contexts/AuthContext.js` - Auth context provider
- `/app/frontend/src/pages/AuthPage.js` - Login/Register page

## URLs
- **Public Dashboard**: https://bot-reporter.preview.emergentagent.com
- **Local Dashboard**: http://localhost:9090 (when running locally)
- **Cloud API**: https://bot-reporter.preview.emergentagent.com/api

## Next Steps (Post-Deployment)

### To Remove "Made with Emergent" Watermark
1. Go to Emergent Platform dashboard
2. Click "Deploy" button for your project
3. This will deploy to production and remove the watermark

### Future Enhancements (P3+)
- Stripe billing integration
- Downloadable Mac installer for local agent
- Usage analytics and reporting
- Email notifications for daily summaries
- Multi-team support with isolated data
