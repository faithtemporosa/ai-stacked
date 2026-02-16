# TikTok Comments Dashboard - Deployment Guide

## Quick Deploy (10 minutes total)

### Step 1: MongoDB Atlas (2 mins)
1. Go to https://mongodb.com/atlas → Sign up free
2. Create Cluster → Select **FREE M0** tier
3. Security → Database Access → Add user (save username/password)
4. Security → Network Access → Add IP `0.0.0.0/0`
5. Deployment → Database → Click **Connect** → Copy connection string
   - Replace `<password>` with your password
   - Example: `mongodb+srv://myuser:mypass123@cluster0.abc123.mongodb.net/tiktok_dashboard`

### Step 2: Deploy Backend to Render (3 mins)
1. Go to https://render.com → Sign up with GitHub
2. New → **Web Service** → Connect your repo
3. Settings:
   - **Name:** tiktok-dashboard-api
   - **Root Directory:** backend
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Environment Variables (click "Add Environment Variable"):
   ```
   MONGO_URL = <your MongoDB Atlas connection string>
   DB_NAME = tiktok_dashboard
   JWT_SECRET = my-super-secret-jwt-key-2024
   CORS_ORIGINS = *
   ```
5. Click **Create Web Service**
6. Wait for deploy → Copy your URL (e.g., `https://tiktok-dashboard-api.onrender.com`)

### Step 3: Deploy Frontend to Vercel (3 mins)
1. Go to https://vercel.com → Sign up with GitHub
2. **Add New Project** → Import your repo
3. Settings:
   - **Root Directory:** frontend
   - **Framework Preset:** Create React App
4. Environment Variables:
   ```
   REACT_APP_BACKEND_URL = https://tiktok-dashboard-api.onrender.com
   ```
5. Click **Deploy**
6. Your dashboard is live at: `https://your-project.vercel.app`

### Step 4: Update Local Script
Edit `tiktok_commenter.py` line ~44:
```python
CLOUD_API_URL = "https://tiktok-dashboard-api.onrender.com/api"
```

---

## Your URLs After Deployment

| Service | URL |
|---------|-----|
| Dashboard | https://your-project.vercel.app |
| API | https://tiktok-dashboard-api.onrender.com |
| Local Script | http://localhost:9090 |

## Free Tier Limits

| Service | Free Limit |
|---------|------------|
| Vercel | Unlimited static sites |
| Render | 750 hours/month (spins down after 15 min inactivity) |
| MongoDB Atlas | 512MB storage |

---

## Troubleshooting

**Backend not responding?**
- Render free tier spins down after 15 mins of inactivity
- First request takes ~30 seconds to wake up

**CORS errors?**
- Make sure CORS_ORIGINS is set to `*` in Render env vars

**MongoDB connection failed?**
- Check your connection string has the password filled in
- Make sure Network Access allows `0.0.0.0/0`

---

## Need Help?
Contact support or open an issue on GitHub.
