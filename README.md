# Pistos
**"He that is faithful in that which is least is faithful also in much."** — Luke 16:10, KJV

A Seventh-day Adventist household stewardship system for a family, built on the *Beginner's Guide to Budgeting* by Rose Lee (Melrose Finance).

---

## Stack
- **Backend:** Python / Flask + SQLAlchemy
- **Database:** SQLite (dev) → PostgreSQL (production)
- **AI:** Anthropic Claude API
- **Frontend:** React (CDN, no build step)
- **Hosting:** Render.com (free tier)
- **Backup:** Google Drive (weekly, post-reconciliation)

---

## Local Development

### 1. Clone and set up
```bash
git clone https://github.com/YOUR_USERNAME/pistos.git
cd pistos
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values:
# SECRET_KEY=your-long-random-string
# ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run locally
```bash
python run.py
# Visit http://localhost:5000
```

### 4. First launch — register
- Open the app and register with your email
- The **first registered user is automatically set as Principal**
- Register Principal first, then other users

---

## Deploy to Render (Recommended — Free)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial Pistos deployment"
git remote add origin https://github.com/YOUR_USERNAME/pistos.git
git push -u origin main
```

### Step 2: Create account
Go to **https://render.com** and sign up with your GitHub account.

### Step 3: New Web Service
1. Click **New → Web Service**
2. Connect your GitHub repo
3. Render detects `render.yaml` automatically
4. Set these environment variables in the Render dashboard:
   - `ANTHROPIC_API_KEY` → your key from https://console.anthropic.com
   - `GOOGLE_CLIENT_ID` → from Google Cloud Console (see below)
   - `GOOGLE_CLIENT_SECRET` → from Google Cloud Console

### Step 4: Deploy
Click **Deploy**. Render builds and deploys automatically.
Your URL: `https://pistos.onrender.com` (or your chosen name)

---

## Google Drive Backup Setup

1. Go to https://console.cloud.google.com
2. Create a project called "Pistos"
3. Enable the **Google Drive API**
4. Create OAuth2 credentials (Desktop app)
5. Download `credentials.json` to the project root
6. Run the one-time auth script:
```bash
python scripts/gdrive_auth.py
```
7. This creates `gdrive_token.json` — keep this file safe, do NOT commit it

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register user |
| POST | /auth/login | Login |
| GET | /auth/me | Current user |
| GET | /api/transactions/ | List transactions |
| POST | /api/transactions/ | Add transaction |
| PUT | /api/transactions/:id | Edit transaction |
| DELETE | /api/transactions/:id | Soft delete |
| GET | /api/transactions/summary | Income/expense/tithe summary |
| GET | /api/giving/reconciliation | Friday summary |
| POST | /api/giving/finalise | Finalise + trigger backup |
| GET | /api/goals/ | List goals |
| POST | /api/goals/ | Add goal |
| POST | /api/goals/:id/contribute | Add to goal |
| POST | /api/chat/ | Pistos AI chat |
| GET | /api/reports/audit | Audit log (Principal only) |

---

## Tithe & Offering Rules
- Tithe: **10%** of eligible income (flexible rounding)
- Offering: **up to 15%** of eligible income
- **Transport allowances excluded** from base
- **Parts sales: net profit only** (set `is_parts_sale=true` and `parts_cost`)
- Friday sunset → reconciliation summary generated
- Sabbath window → no notifications

---

## Open Source
MIT Licence. Contributions welcome.
*Based on the Beginner's Guide to Budgeting by Rose Lee — Melrose Finance*
