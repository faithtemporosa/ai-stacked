# TikTok Auto Commenter - Product Requirements Document

## Original Problem Statement
User wants to automate posting promotional comments on TikTok using their 25 AdsPower browser profiles. The tool should be a local script controlled by a web dashboard, with a **public-facing website where teammates can view the reports in real-time**.

## Solution Architecture

### Components
1. **Local Script (`tiktok_commenter.py`)** - Runs on user's Mac, connects to AdsPower, automates TikTok commenting, DMs, and posting via Playwright
2. **Cloud Backend (Supabase)** - Stores comment reports, DM history, post history, and live logs for real-time dashboard
3. **Public Dashboard (React)** - Real-time viewing of all activity across profiles, directly querying Supabase
4. **FastAPI Backend** - Handles user authentication (register/login/teams) with MongoDB

### Key Features
- **Profile Management**: Sync 25 profiles from AdsPower local API
- **Parallel Execution**: Run 2 browsers simultaneously for stability
- **Hashtag Targeting**: Target For You page or specific hashtags
- **Brand Promotion**: Rotate between Bump Connect, Kollabsy, and Bump Syndicate
- **Real-time Reporting**: Comments sync to Supabase, dashboard updates via Realtime subscriptions
- **Team Access**: Authenticated dashboard with team invites
- **Live Logs**: Stream automation logs to cloud dashboard
- **DM Automation**: Send direct messages to TikTok users, synced to Supabase
- **Post to TikTok**: Upload and post videos with queue management
- **Post Scheduler**: Schedule posts for future dates/times with auto-execution

## Technical Stack
- **Local Script**: Python + Flask + Playwright + Supabase client
- **Cloud Data**: Supabase (PostgreSQL + Realtime)
- **Backend**: FastAPI + MongoDB (auth only)
- **Frontend**: React + TailwindCSS + Supabase JS client + Lucide icons
- **Build Tools**: Craco (for path aliases)
- **Deployment**: Emergent Platform (preview), Vercel/Render (production)

## Completed Work

### Phase 1: Public Real-time Dashboard (Feb 2026)
- [x] Supabase integration for comment_reports, live_logs, dm_reports, post_reports tables
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
- [x] DM tab in local dashboard with settings, message groups, history
- [x] Export DM history to CSV
- [x] Supabase cloud sync for DM reports
- [x] DM tab in public dashboard with stats and history table

### Phase 5: Post to TikTok Feature + Scheduler (Feb 2026)
- [x] Video upload automation via TikTok web interface
- [x] Post queue management (add, remove, clear)
- [x] Post tab in local dashboard with settings, queue display, logs, history
- [x] Flask API routes for all post operations
- [x] Export post history to CSV
- [x] Supabase cloud sync for post reports
- [x] Post tab in public dashboard with stats and history table
- [x] **Post Scheduler** - schedule posts with date/time picker, auto-triggers when due
- [x] Background scheduler thread (checks every 30 seconds)

### Phase 6: Public Dashboard Enhancement (Feb 2026)
- [x] Tabbed navigation: Comments, DMs, Posts, Live Logs
- [x] 6 stat cards: This Month, This Week, Today, All Comments, DMs Sent, Posts Made
- [x] DMs tab with stats (Total, Today, Unique Recipients, Profiles Used) and history table
- [x] Posts tab with stats (Total, Today, Profiles Used, Scheduler indicator) and history table
- [x] Live Logs tab with color-coded messages and Running/Idle status
- [x] Supabase Realtime subscriptions for all tables (comments, DMs, posts, logs)

### Testing (Feb 2026)
- [x] Iteration 3: 100% pass (25/25 backend, all frontend)
- [x] Iteration 4: 100% pass (25/25 backend, all frontend) - includes new tabs/features

## Supabase Tables
| Table | Columns |
|-------|---------|
| `comment_reports` | timestamp, profile, video_url, video_id, comment, sheet |
| `live_logs` | id (singleton), logs (JSON), status (JSON), updated_at |
| `dm_reports` | timestamp, profile, username, message, status |
| `post_reports` | timestamp, profile, video, caption, status |

## API Endpoints

### Local (`tiktok_commenter.py` on `localhost:9090`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | GET | Dashboard UI |
| `POST /api/sync-profiles` | POST | Fetch AdsPower profiles |
| `POST /api/start` | POST | Start commenting |
| `POST /api/stop` | POST | Stop commenting |
| `GET /api/status` | GET | Comment status |
| `POST /api/dm/start` | POST | Start DMs |
| `POST /api/dm/stop` | POST | Stop DMs |
| `GET /api/dm/status` | GET | DM status |
| `GET /api/post/status` | GET | Post status/queue/history/scheduled |
| `POST /api/post/queue` | POST | Add video (with optional scheduled_at) |
| `POST /api/post/queue/remove` | POST | Remove queue item |
| `POST /api/post/queue/clear` | POST | Clear pending queue |
| `POST /api/post/settings` | POST | Update post delay settings |
| `POST /api/post/start` | POST | Start posting |
| `POST /api/post/stop` | POST | Stop posting |
| `GET /api/post/export` | GET | Export post CSV |

### Cloud (FastAPI `backend/server.py`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/auth/register` | POST | User registration |
| `POST /api/auth/login` | POST | User login, returns JWT |
| `GET /api/auth/me` | GET | Current user profile |
| `POST /api/reports` | POST | Receive comment report |
| `GET /api/reports` | GET | Get reports with filters |
| `GET /api/reports/stats` | GET | Dashboard statistics |

## Files Reference
- `/app/downloads/tiktok_commenter.py` - Local automation script (2800+ lines)
- `/app/backend/server.py` - Cloud API server with auth
- `/app/frontend/src/App.js` - Public dashboard with tabs
- `/app/frontend/src/lib/supabase.js` - Supabase client config
- `/app/frontend/src/contexts/AuthContext.js` - Auth context provider
- `/app/frontend/craco.config.js` - Craco config with @/ alias

## Next Steps

### P0 - Immediate
- User testing of Post to TikTok + Scheduler feature on local Mac with AdsPower

### P1 - Short Term
- Fix Vercel deployment for production hosting (configs ready, needs user to deploy)
- Improve TikTok automation stability (selectors may need updating)

### P2 - Future
- Productize into Hybrid SaaS (user accounts, billing, downloadable local agent)
- Email notifications for daily summaries
- Multi-team support with isolated data
- Analytics dashboard (success rates, best times to post, engagement metrics)
