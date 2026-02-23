# Lab Equipment Reservations — Setup Guide

A full equipment booking system for Eli Lilly lab staff.

---

## STEP 1 — Set Up Supabase (the database)

1. Go to **https://supabase.com** and click **Start for free**
2. Sign up with Google or GitHub
3. Click **New Project**, name it `lab-reservations`, choose a region (US East), set a database password (save it somewhere safe)
4. Wait ~2 minutes for it to set up
5. In the left sidebar, click **SQL Editor**
6. Click **New Query**, then paste the entire contents of `supabase-setup.sql` into the editor
7. Click **Run** (green button)
8. You should see "Success. No rows returned"

**Get your API keys:**
1. In the left sidebar click **Settings** → **API**
2. Copy **Project URL** — you'll need this in Step 3
3. Copy **anon / public** key — you'll need this in Step 3

---

## STEP 2 — Put the code on GitHub

1. Go to **https://github.com** and create a free account
2. Click the **+** button (top right) → **New repository**
3. Name it `lab-reservations`, set to **Private**, click **Create repository**
4. On your computer, open Terminal (Mac) or Command Prompt (Windows)
5. Run these commands one at a time:

```bash
cd lab-reservations          # navigate into the folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/lab-reservations.git
git push -u origin main
```

Replace `YOURUSERNAME` with your GitHub username.

---

## STEP 3 — Deploy on Vercel

1. Go to **https://vercel.com** and sign up (use your GitHub account)
2. Click **Add New Project**
3. Find and select your `lab-reservations` repository, click **Import**
4. **Framework Preset** should auto-detect as **Vite** — if not, select it
5. Click **Environment Variables** and add these two:
   - Name: `VITE_SUPABASE_URL` / Value: your Project URL from Step 1
   - Name: `VITE_SUPABASE_ANON_KEY` / Value: your anon key from Step 1
6. Click **Deploy**
7. Wait ~2 minutes — your site will be live at a URL like `lab-reservations-abc123.vercel.app`

---

## STEP 4 — Make yourself an admin

1. Go to your new website URL
2. Register an account with your @lilly.com email
3. Go back to Supabase → **SQL Editor** → **New Query**
4. Run this (replace with your actual email):
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'youremail@lilly.com';
```
5. Refresh the website — you'll now see the Admin menu

---

## STEP 5 — Import your equipment

1. Log in as admin
2. Go to **Admin → CSV Import** in the sidebar
3. Drag and drop your CSV file
4. Click **Import Equipment**

Your CSV can have columns named: `asset_tag`, `name`, `location`, `floor_building`, `category`, `training_required`, `approval_required`, `owner`, `notes`

---

## Roles

| Role | Can Do |
|------|--------|
| **Viewer** | Browse equipment, make bookings |
| **Approver** | Everything above + approve/reject booking requests |
| **Admin** | Everything above + manage equipment, users, CSV import |

---

## Updating your equipment CSV later

Just go back to **Admin → CSV Import** and upload the new file. It will update existing records (matched by asset tag) and add new ones.

