# TikTok Auto Commenter - Product Requirements Document

## Original Problem Statement
User wants to automate posting promotional comments on TikTok using 25 AdsPower browser profiles. Local script controlled by web dashboard, with public-facing website for team reports in real-time.

## Solution Architecture
1. **Local Script** (`tiktok_commenter.py`) - Flask + Playwright automation for comments, DMs, replies, and automated reposting
2. **Cloud Data** (Supabase) - PostgreSQL + Realtime for comment_reports, dm_reports, post_reports, live_logs
3. **Public Dashboard** (React) - Tabbed SaaS dashboard with analytics, billing, email notifications
4. **API Backend** (FastAPI + MongoDB) - Auth, billing (Stripe), email notifications (Resend)

## Technical Stack
- Local: Python/Flask/Playwright/Supabase client/OpenAI GPT-5.2
- Cloud: Supabase (PostgreSQL + Realtime)
- Backend: FastAPI + MongoDB + Stripe + Resend
- Frontend: React + TailwindCSS + Recharts + Lucide + Supabase JS
- Build: Craco (path aliases)

## Completed Features

### Core Automation (Local Script)
- [x] Auto commenting on TikTok (25 profiles, 2 parallel, 100 videos each)
- [x] **DM Outreach System (UPDATED)**:
  - Auto-search brands using 30+ business-related search queries
  - Max 100 DMs per profile per day
  - Max 2500 DMs total per day
  - 2 profiles running in parallel
  - Starts from lowest numbered profile
  - Processes all profiles until quota reached
- [x] **AI Reply Management (NEW)**:
  - Checks DM inbox for replies to outreach
  - GPT-5.2 drafts professional but friendly responses
  - Review/edit/approve AI drafts
  - One-click send all approved replies
  - Full reply history tracking
- [x] **Auto Repost Scheduler**:
  - Monday: Brand content (Bump Connect, Kollabsy, Bump Syndicate)
  - Tuesday-Sunday: Social media/creator content
  - Max 2 reposts per profile per day
- [x] Supabase cloud sync for comments, DMs, posts
- [x] 3 brands: Bump Connect, Kollabsy, Bump Syndicate

### Local Dashboard Tabs
- [x] **Control** - Profile management, commenting
- [x] **DM** - Brand outreach with auto-search
- [x] **Replies** - AI reply management (NEW)
- [x] **Post** - Auto repost scheduler
- [x] **Report** - Comment history

### Public Dashboard
- [x] 6 tabs: Comments, DMs, Posts, Analytics, Live Logs, Settings
- [x] 6 stat cards with real-time Supabase data
- [x] Date range filters, brand breakdown
- [x] Import/Export functionality

### SaaS Features
- [x] Landing page, Pricing page
- [x] Stripe checkout integration
- [x] JWT authentication
- [x] Email notifications via Resend

## Files Reference
- `/app/downloads/tiktok_commenter.py` - Local automation script (UPDATED)
- `/app/backend/server.py` - FastAPI backend
- `/app/frontend/src/App.js` - Main React app
- `/app/supabase_schema.sql` - Database schema
- `/app/DEPLOY.md` - Deployment guide

## Changelog

### Feb 19, 2026
- Added AI Reply Management system with GPT-5.2 integration
- Added new "Replies" tab to local dashboard
- AI drafts replies with professional but friendly tone
- Approve/edit/reject drafts before sending
- One-click "Send All Approved" button
- Updated max total DMs per day from 250 to 2500
- Fixed missing `timedelta` import

## Next Steps
- P0: Test locally with AdsPower
- P1: Deploy to Vercel/Render
- P1: Create Supabase tables using provided SQL
- P2: Advanced analytics
