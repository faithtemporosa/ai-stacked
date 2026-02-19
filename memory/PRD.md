# TikTok Auto Commenter - Product Requirements Document

## Original Problem Statement
User wants to automate posting promotional comments on TikTok using their 25 AdsPower browser profiles. The tool should be a local script controlled by a web dashboard, with a **public-facing website where teammates can view the reports in real-time**.

## Solution Architecture

### Components
1. **Local Script (`tiktok_commenter.py`)** - Runs on user's Mac, connects to AdsPower, automates TikTok commenting, DMs, and posting via Playwright
2. **Cloud Backend (Supabase)** - Stores comment reports and live logs for real-time dashboard
3. **Public Dashboard (React)** - Real-time viewing of all comments posted across profiles, directly querying Supabase
4. **FastAPI Backend** - Handles user authentication (register/login/teams) with MongoDB

### Key Features
- **Profile Management**: Sync 25 profiles from AdsPower local API
- **Parallel Execution**: Run 2 browsers simultaneously for stability
- **Hashtag Targeting**: Target For You page or specific hashtags
- **Brand Promotion**: Rotate between Bump Connect, Kollabsy, and Bump Syndicate
- **Real-time Reporting**: Comments sync to Supabase, dashboard updates via Realtime subscriptions
- **Team Access**: Authenticated dashboard with team invites
- **Live Logs**: Stream automation logs to cloud dashboard
- **DM Automation**: Send direct messages to TikTok users
- **Post to TikTok**: Upload and post videos to TikTok profiles

## Technical Stack
- **Local Script**: Python + Flask + Playwright + Supabase client
- **Cloud Data**: Supabase (PostgreSQL + Realtime)
- **Backend**: FastAPI + MongoDB (auth only)
- **Frontend**: React + TailwindCSS + Supabase JS client
- **Build Tools**: Craco (for path aliases)
- **Deployment**: Emergent Platform (preview), Vercel/Render (production)

## Completed Work

### Phase 1: Public Real-time Dashboard (Feb 2026)
- [x] Supabase integration for comment_reports and live_logs tables
- [x] React dashboard with stats, filters, auto-refresh
- [x] Import Data feature for bulk uploads
- [x] Live logs streaming via Supabase Realtime
- [x] Export CSV functionality
- [x] Date range filters (Today, This Week, This Month, All Time, Custom)
- [x] Today's Comments by Brand breakdown

### Phase 2: Automation Stability (Feb 2026)
- [x] Added retry logic (3 attempts per video)
- [x] Updated Playwright selectors for TikTok 2025
- [x] Improved error handling with consecutive failure tracking
- [x] Better login detection and skip logic

### Phase 3: SaaS Features (Feb 2026)
- [x] JWT-based authentication (register/login)
- [x] User accounts with team support
- [x] Team creation and member invites
- [x] Role-based access (admin, member, viewer)

### Phase 4: DM Feature (Feb 2026)
- [x] DM automation for specific users, hashtag users, video commenters, followers
- [x] DM tab with settings, message groups, history
- [x] Export DM history to CSV

### Phase 5: Post to TikTok Feature (Feb 2026)
- [x] Video upload automation via TikTok web interface
- [x] Post queue management (add, remove, clear)
- [x] Post tab with settings, queue display, logs, history
- [x] Flask API routes for all post operations
- [x] Export post history to CSV

### Testing (Feb 2026)
- [x] 100% backend tests passed (25/25) - auth, reports, stats APIs
- [x] 100% frontend tests passed - all UI features working

## API Endpoints

### Local (`tiktok_commenter.py` on `localhost:9090`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | GET | Serves the dashboard UI |
| `POST /api/sync-profiles` | POST | Fetches AdsPower profiles |
| `POST /api/start` | POST | Starts comment automation |
| `POST /api/stop` | POST | Stops automation |
| `GET /api/status` | GET | Current automation status |
| `POST /api/dm/start` | POST | Starts DM automation |
| `POST /api/dm/stop` | POST | Stops DM automation |
| `GET /api/dm/status` | GET | DM automation status |
| `GET /api/post/status` | GET | Post automation status/queue/history |
| `POST /api/post/queue` | POST | Add video to post queue |
| `POST /api/post/start` | POST | Start posting automation |
| `POST /api/post/stop` | POST | Stop posting automation |
| `GET /api/post/export` | GET | Export post history CSV |

### Cloud (FastAPI `backend/server.py`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/auth/register` | POST | User registration |
| `POST /api/auth/login` | POST | User login, returns JWT |
| `GET /api/auth/me` | GET | Current user profile |
| `POST /api/reports` | POST | Receive comment report |
| `GET /api/reports` | GET | Get reports with filters |
| `GET /api/reports/stats` | GET | Dashboard statistics |

## Configuration

### Supabase Tables
- `comment_reports`: timestamp, profile, video_url, video_id, comment, sheet
- `live_logs`: id (singleton), logs (JSON array), status (JSON), updated_at

### Default Settings
- **Parallel Browsers**: 2 (fixed for stability)
- **Videos per Profile**: 100
- **Delay Between Comments**: 30-60 seconds
- **Max Consecutive Failures**: 5
- **Post Delay**: 300-600 seconds (5-10 min)

### Brands Promoted
1. **Bump Connect** - bumpconnect.xyz
2. **Kollabsy** - kollabsy.xyz
3. **Bump Syndicate** - bumpsyndicate.xyz

## Files Reference
- `/app/downloads/tiktok_commenter.py` - Local automation script (comments, DMs, posts)
- `/app/backend/server.py` - Cloud API server with auth
- `/app/frontend/src/App.js` - Public dashboard using Supabase
- `/app/frontend/src/lib/supabase.js` - Supabase client config
- `/app/frontend/src/contexts/AuthContext.js` - Auth context provider

## Next Steps

### P0 - Immediate
- User testing of Post to TikTok feature on local Mac with AdsPower

### P1 - Short Term
- Integrate DM and Post history views into the public dashboard
- Fix Vercel deployment for production hosting (date-fns conflicts, Craco config)

### P2 - Future
- Productize into Hybrid SaaS (user accounts, billing, downloadable local agent)
- Stripe billing integration
- Email notifications for daily summaries
- Multi-team support with isolated data
