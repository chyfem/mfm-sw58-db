# MFM SW58 Araromi Akure CMS
## 100% Free Hosting — Koyeb + Supabase + GitHub
## No credit card. No hidden fees. No egress charges.

---

## What You Need
- GitHub account: https://github.com (free)
- Supabase account: https://supabase.com (free database)
- Koyeb account: https://koyeb.com (free app hosting)

---

## PART 1 — Set Up Supabase Database (5 minutes)

Supabase gives you a free PostgreSQL database forever.

1. Go to https://supabase.com
2. Click "Start your project" — sign up free with GitHub
3. Click "New project"
4. Fill in:
   - Name: mfm-sw58-db
   - Database Password: choose a strong password (SAVE THIS!)
   - Region: West EU (Ireland) — closest to Nigeria
5. Click "Create new project"
6. Wait about 2 minutes for it to set up

7. Get your DATABASE_URL:
   - Click "Settings" in the left sidebar
   - Click "Database"
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string — it looks like:
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   - Replace [YOUR-PASSWORD] with the password you chose in step 4

8. Run the database setup:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"
   - Copy and paste the entire contents of database/schema.sql
   - Click "Run" (green button)
   - You should see "Success. No rows returned"

Your database is ready!

---

## PART 2 — Deploy on Koyeb (5 minutes)

Koyeb hosts your Node.js app completely free.

1. Go to https://koyeb.com
2. Click "Sign up" — use your GitHub account
3. No credit card needed

4. Click "Create App"
5. Select "GitHub" as the source
6. Connect your GitHub account if asked
7. Select your mfm-sw58-cms repository
8. Select branch: main

9. Configure the service:
   - Name: mfm-sw58-cms
   - Build command: npm install
   - Start command: node backend/server.js
   - Port: 8000

10. Add Environment Variables (click "Add variable" for each):

   DATABASE_URL  = (paste your Supabase connection string from Part 1)
   NODE_ENV      = production
   JWT_SECRET    = MFM_SW58_Araromi_YourLongSecretKey_2024
   JWT_EXPIRES_IN = 8h
   PORT          = 8000

11. Click "Deploy"
12. Wait 2-3 minutes

Your site is live at: https://mfm-sw58-cms-XXXX.koyeb.app

---

## PART 3 — Create Admin Account (2 minutes)

After deployment, run the setup script once.

Option A — Using Koyeb Shell:
1. In Koyeb dashboard, click your service
2. Click "Shell" tab
3. Run: node setup.js

Option B — Visit setup URL:
(Only works if you add the setup route — see below)

You should see:
  All tables created!
  Branches and departments seeded!
  Super admin created!
  Username: superadmin
  Password: Admin@2024

---

## PART 4 — Log In

URL: https://YOUR-APP.koyeb.app/pages/login.html
Username: superadmin
Password: Admin@2024

CHANGE PASSWORD IMMEDIATELY after first login!

---

## Auto-Deploy from GitHub

Every time you push to GitHub, Koyeb automatically redeploys.
No extra setup needed — it works automatically.

---

## Free Tier Summary

  Supabase:  500MB database storage, 2GB bandwidth — FREE
  Koyeb:     512MB RAM, 0.1 vCPU, 1 service — FREE
  GitHub:    Unlimited private repos — FREE

Total cost: 0 Naira per month.

---

"Bringing Back The Apostolic Signs" — MFM SW58 Araromi Akure
