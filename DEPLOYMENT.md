# Deployment Guide

Production deployment on Ubuntu 22.04 / 24.04 LTS.

---

## Prerequisites

| Component  | Version  | Notes                     |
|------------|----------|---------------------------|
| Ubuntu     | 22.04+   | Fresh or existing VPS     |
| Python     | 3.11     | via deadsnakes PPA        |
| Node.js    | 20.x     | via NodeSource             |
| Yarn       | 1.22+    | `npm install -g yarn`     |
| Nginx      | any      | Reverse proxy + static    |
| Supabase   | any      | PostgreSQL backend        |

## Quick Start (automated)

```bash
git clone <your-repo-url> /tmp/erp
cd /tmp/erp
chmod +x deploy.sh
sudo ./deploy.sh your-domain.com
```

This single command installs all system dependencies, builds the app, sets up Nginx + systemd, and optionally configures SSL via Let's Encrypt.

After deployment, open `https://your-domain.com` — the Setup Wizard will guide you through database configuration.

---

## Manual Deployment (step by step)

### 1. System packages

```bash
sudo apt update
sudo apt install -y software-properties-common curl git nginx build-essential libpq-dev

# Python 3.11
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Yarn
sudo npm install -g yarn
```

### 2. Application directory

```bash
sudo useradd -r -m -s /bin/bash erp
sudo mkdir -p /opt/erp
sudo cp -r . /opt/erp/
sudo chown -R erp:erp /opt/erp
```

### 3. Backend

```bash
cd /opt/erp/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

Create the environment file:
```bash
cp .env.example .env
```

Edit `/opt/erp/backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
JWT_SECRET=<generate with: python3 -c "import secrets; print(secrets.token_hex(32))">
ADMIN_EMAIL=admin@erp.com
ADMIN_PASSWORD=changeme
SETUP_COMPLETE=false
CORS_ORIGINS=*
```

> **Note:** Leave `SETUP_COMPLETE=false` for first boot. The Setup Wizard will configure the database and set this to `true` automatically.

### 4. Frontend

```bash
cd /opt/erp/frontend
cp .env.example .env
```

Edit `/opt/erp/frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://your-domain.com
```

Build:
```bash
yarn install --frozen-lockfile
yarn build
```

### 5. Systemd service

```bash
sudo cp /opt/erp/systemd/erp-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable erp-backend
sudo systemctl start erp-backend
```

Verify:
```bash
sudo systemctl status erp-backend
curl -s http://127.0.0.1:8001/api/health
```

### 6. Nginx

```bash
sudo cp /opt/erp/nginx/erp.conf /etc/nginx/sites-available/erp
sudo ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/erp
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit `/etc/nginx/sites-available/erp` — replace `your-domain.com` with your actual domain.

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL (optional but recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Setup Wizard

On first boot (when `SETUP_COMPLETE=false`):

1. Open the app in a browser
2. You'll be redirected to `/setup`
3. Enter your Supabase URL, API Key, and Service Role Key
4. The wizard will:
   - Validate connection
   - Create the `exec_sql` RPC function
   - Run all database migrations (25+ tables)
   - Create the admin account
5. After completion, `SETUP_COMPLETE` is set to `true` in `.env`
6. The app redirects to the login page

> **Important:** The setup wizard only runs once. After `SETUP_COMPLETE=true`, the `/setup` route is blocked. To re-run setup, manually set `SETUP_COMPLETE=false` in `/opt/erp/backend/.env` and restart the backend.

---

## Updating

After pulling new code:

```bash
cd /path/to/repo
git pull
sudo ./update.sh
```

Or manually:
```bash
# Sync code (preserves .env files)
sudo rsync -a --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
  --exclude='venv' --exclude='build' --exclude='.env' \
  . /opt/erp/

# Update backend
cd /opt/erp/backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Rebuild frontend
cd /opt/erp/frontend
yarn install --frozen-lockfile
yarn build

# Fix permissions + restart
sudo chown -R erp:erp /opt/erp
sudo systemctl restart erp-backend
sudo systemctl reload nginx
```

---

## Runtime Versions

This project is pinned to:
- **Python 3.11** (see `.python-version`)
- **Node.js 20.x** (see `.nvmrc`)
- **Yarn 1.22+** (package manager — do not use npm)

---

## File Structure

```
/opt/erp/
├── backend/
│   ├── .env                  ← your config (not in git)
│   ├── .env.example          ← template
│   ├── server.py             ← FastAPI application
│   ├── auth.py               ← JWT authentication
│   ├── database.py           ← Supabase client
│   ├── migrations/           ← Auto-run DB migrations
│   ├── requirements.txt      ← Python dependencies
│   └── venv/                 ← Python virtual environment
├── frontend/
│   ├── .env                  ← your config (not in git)
│   ├── .env.example          ← template
│   ├── build/                ← production static files (served by nginx)
│   ├── src/                  ← React source
│   ├── package.json          ← JS dependencies
│   └── yarn.lock             ← locked versions
├── nginx/
│   └── erp.conf              ← nginx config template
├── systemd/
│   └── erp-backend.service   ← systemd unit file
├── deploy.sh                 ← first-time setup script
├── update.sh                 ← code update script
├── DEPLOYMENT.md             ← this file
├── .nvmrc                    ← Node version pin
└── .python-version           ← Python version pin
```

---

## Troubleshooting

### Backend won't start
```bash
sudo journalctl -u erp-backend -n 50
sudo tail -f /var/log/erp-backend-error.log
```

### 502 Bad Gateway
The backend isn't running. Check:
```bash
sudo systemctl status erp-backend
curl http://127.0.0.1:8001/api/health
```

### Frontend shows blank page
Ensure the build exists and nginx points to it:
```bash
ls /opt/erp/frontend/build/index.html
sudo nginx -t
```

### Setup wizard reappears after restart
Check that `SETUP_COMPLETE=true` is in `/opt/erp/backend/.env` and restart:
```bash
grep SETUP_COMPLETE /opt/erp/backend/.env
sudo systemctl restart erp-backend
```

### Database migration fails
Check backend logs for the specific SQL error. Ensure your Supabase Service Role key has DDL permissions:
```bash
sudo journalctl -u erp-backend | grep -i migration
```

---

## Architecture

```
Browser → Nginx (port 80/443)
             ├── /api/*  → Gunicorn (127.0.0.1:8001) → FastAPI → Supabase
             └── /*      → /opt/erp/frontend/build/   (static React SPA)
```

- **Gunicorn** runs 2 Uvicorn workers (adjust `--workers` in the systemd file for more CPU cores)
- **Nginx** serves the frontend build as static files and reverse-proxies API requests
- **Supabase** is the external PostgreSQL database (not hosted on this VPS)
