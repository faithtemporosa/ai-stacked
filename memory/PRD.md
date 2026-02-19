# TikTok Auto Commenter - Product Requirements Document

## Original Problem Statement
User wants to automate posting promotional comments on TikTok using 25 AdsPower browser profiles. Local script controlled by web dashboard, with public-facing website for team reports in real-time.

## Solution Architecture
1. **Local Script** (`tiktok_commenter.py`) - Flask + Playwright automation for comments, DMs, and posting
2. **Cloud Data** (Supabase) - PostgreSQL + Realtime for comment_reports, dm_reports, post_reports, live_logs
3. **Public Dashboard** (React) - Tabbed SaaS dashboard with analytics, billing, email notifications
4. **API Backend** (FastAPI + MongoDB) - Auth, billing (Stripe), email notifications (Resend)

## Technical Stack
- Local: Python/Flask/Playwright/Supabase client
- Cloud: Supabase (PostgreSQL + Realtime)
- Backend: FastAPI + MongoDB + Stripe + Resend
- Frontend: React + TailwindCSS + Recharts + Lucide + Supabase JS
- Build: Craco (path aliases)

## Completed Features

### Core Automation (Local Script)
- [x] Auto commenting on TikTok (25 profiles, 2 parallel, 100 videos each)
- [x] DM automation (specific users, hashtag users, followers)
- [x] Post to TikTok (video upload, queue management)
- [x] Post Scheduler (datetime picker, background thread, auto-trigger)
- [x] Supabase cloud sync for comments, DMs, posts
- [x] 3 brands: Bump Connect, Kollabsy, Bump Syndicate

### Public Dashboard
- [x] 6 tabs: Comments, DMs, Posts, Analytics, Live Logs, Settings
- [x] 6 stat cards with real-time Supabase data
- [x] Date range filters, brand breakdown
- [x] Import/Export functionality
- [x] Supabase Realtime subscriptions for instant updates

### Analytics
- [x] Comments Trend (14 days) area chart
- [x] Best Posting Hours bar chart
- [x] Brand Distribution pie chart
- [x] Profile Performance horizontal bar chart
- [x] Key metrics (Total, Active Profiles, Avg/Profile, Peak Hour)
- [x] Paginated Supabase queries for accurate data

### SaaS Features
- [x] Landing page with hero, features, stats, capabilities
- [x] Pricing page (Free $0, Pro $29, Enterprise $99)
- [x] Stripe checkout integration (test key configured)
- [x] Payment status polling on frontend
- [x] JWT authentication (register/login/teams)
- [x] Payment transactions collection in MongoDB

### Email Notifications
- [x] Subscribe/unsubscribe endpoints
- [x] Daily summary email template (dark theme HTML)
- [x] Send summary to all subscribers
- [x] Resend integration (needs user API key for production)
- [x] Settings UI for managing subscribers

### Testing
- [x] Iteration 3: 100% (25/25 backend, all frontend)
- [x] Iteration 4: 100% (25/25 backend, all frontend)
- [x] Iteration 5: 100% (22/22 backend, all frontend) + bug fix

## API Endpoints

### Billing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/billing/plans` | GET | Get subscription plans |
| `POST /api/billing/checkout` | POST | Create Stripe checkout session |
| `GET /api/billing/status/{id}` | GET | Check payment status |
| `POST /api/webhook/stripe` | POST | Stripe webhook handler |

### Email Notifications
| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/notifications/subscribe` | POST | Subscribe email |
| `POST /api/notifications/unsubscribe` | POST | Unsubscribe email |
| `GET /api/notifications/subscriptions` | GET | List subscribers |
| `POST /api/notifications/send-summary` | POST | Send daily summary |

## Supabase Tables
| Table | Purpose |
|-------|---------|
| `comment_reports` | Comment history from automation |
| `dm_reports` | DM history from automation |
| `post_reports` | Post history from automation |
| `live_logs` | Real-time automation logs |

## MongoDB Collections
| Collection | Purpose |
|------------|---------|
| `users` | User accounts |
| `teams` | Team management |
| `payment_transactions` | Stripe payments |
| `email_subscriptions` | Notification subscribers |
| `reports` | Legacy comment reports |

## Files Reference
- `/app/downloads/tiktok_commenter.py` - Local automation script
- `/app/backend/server.py` - FastAPI backend
- `/app/frontend/src/App.js` - Main app (Dashboard + Landing)
- `/app/frontend/src/pages/Analytics.js` - Analytics charts
- `/app/frontend/src/pages/Landing.js` - Landing + pricing page
- `/app/frontend/src/pages/Settings.js` - Email + billing settings

## Configuration Notes
- **Email**: User needs to add their Resend API key (`RESEND_API_KEY=re_...`) to `backend/.env` for production email sending
- **Stripe**: Test key `sk_test_emergent` is pre-configured
- **Supabase**: `dm_reports` and `post_reports` tables need to be created in Supabase when first syncing

## Next Steps
- P0: User testing of local bot features (Post Scheduler, DM sync, Post sync)
- P1: Deploy to Vercel/Render for production
- P1: Add Resend API key for production email
- P2: Advanced analytics (engagement rates, ROI tracking)
- P2: Multi-team data isolation
- P2: Downloadable local agent installer for Mac
