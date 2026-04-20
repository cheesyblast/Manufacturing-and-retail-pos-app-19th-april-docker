# Deployment Guide

Production deployment via Docker on Ubuntu 22.04 / 24.04 LTS.

---

## Prerequisites

| Component  | Version  | Notes                           |
|------------|----------|---------------------------------|
| Ubuntu     | 22.04+   | Fresh or existing VPS           |
| Docker     | 24+      | Auto-installed by deploy.sh     |
| Nginx      | any      | Reverse proxy + SSL termination |
| Supabase   | any      | External PostgreSQL database    |

## Quick Start (one command)

```bash
git clone <your-repo-url> /opt/erp
cd /opt/erp
chmod +x deploy.sh
sudo ./deploy.sh your-domain.com
```

This single command:
1. Installs Docker + Nginx (if missing)
2. Creates `.env` from template
3. Builds the Docker image (frontend + backend)
4. Starts the container
5. Configures Nginx reverse proxy
6. Sets up SSL via Let's Encrypt (if domain provided)

After deployment, open `https://your-domain.com` — the **Setup Wizard** will guide you through database configuration.

---

## Manual Deployment (step by step)

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
```

### 2. Clone and configure

```bash
git clone <your-repo-url> /opt/erp
cd /opt/erp
cp backend/.env.example backend/.env
```

Edit `backend/.env` — set your JWT secret:
```bash
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" backend/.env
```

> **Note:** Leave `SETUP_COMPLETE=false` and Supabase fields empty. The Setup Wizard will configure them on first boot.

### 3. Build and run

```bash
# Set your domain/IP — this gets baked into the frontend build
export REACT_APP_BACKEND_URL=https://your-domain.com

docker compose build
docker compose up -d
```

Verify:
```bash
docker compose ps
curl http://localhost:8001/api/health
```

### 4. Nginx reverse proxy

```bash
sudo apt install -y nginx
sudo cp nginx/erp.conf /etc/nginx/sites-available/erp
sudo ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/erp
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit `/etc/nginx/sites-available/erp` — replace `your-domain.com` with your domain.

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Setup Wizard

On first boot (when `SETUP_COMPLETE=false`):

1. Open the app in a browser
2. You'll be redirected to `/setup`
3. Enter your Supabase URL, API Key, and optionally Service Role Key + DB password
4. The wizard will:
   - Validate connection
   - Create the `exec_sql` RPC function (if credentials allow)
   - Run all database migrations (25+ tables)
5. Create your admin account on the next step
6. After completion, `SETUP_COMPLETE=true` is set in `.env`
7. The app redirects to the login page

> **Important:** The setup wizard only runs once. After completion, the `/setup` route redirects to login. To re-run setup, set `SETUP_COMPLETE=false` in `backend/.env` and restart: `docker compose restart`

---

## Architecture

```
Browser → Nginx (port 80/443) → Docker container (port 8001)
                                   └── Gunicorn + Uvicorn
                                        ├── /api/*    → FastAPI endpoints
                                        └── /*        → React SPA (static files)
```

One container serves everything. Nginx handles SSL termination and proxies to the container.

---

## Common Commands

```bash
# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Check status
docker compose ps

# Shell into container
docker compose exec erp bash
```

---

## Updating

```bash
cd /opt/erp
git pull
sudo ./update.sh
```

Or manually:
```bash
docker compose up -d --build
sudo systemctl reload nginx
```

Your `.env` file is mounted as a volume — it persists across rebuilds.

---

## Changing the Domain / Backend URL

The frontend URL is baked into the JS build at build time. To change it:

```bash
export REACT_APP_BACKEND_URL=https://new-domain.com
docker compose build
docker compose up -d
```

Then update your Nginx config and SSL cert for the new domain.

---

## File Structure

```
/opt/erp/
├── backend/
│   ├── .env                  ← your config (mounted into container)
│   ├── .env.example          ← template
│   ├── server.py             ← FastAPI app (serves API + frontend)
│   ├── auth.py               ← JWT authentication
│   ├── database.py           ← Supabase client
│   ├── migrations/           ← Auto-run DB migrations
│   └── requirements.txt      ← Python deps
├── frontend/
│   ├── src/                  ← React source (built during docker build)
│   ├── package.json          ← JS deps
│   └── yarn.lock             ← Locked versions
├── nginx/
│   └── erp.conf              ← Nginx config template
├── Dockerfile                ← Multi-stage build
├── docker-compose.yml        ← Container orchestration
├── .dockerignore             ← Build exclusions
├── deploy.sh                 ← One-command setup
├── update.sh                 ← Code update script
└── DEPLOYMENT.md             ← This file
```

---

## Troubleshooting

### Container won't start
```bash
docker compose logs --tail 50
```

### 502 Bad Gateway
Container isn't running:
```bash
docker compose ps
docker compose up -d
curl http://localhost:8001/api/health
```

### Setup wizard reappears after restart
Check that `.env` has `SETUP_COMPLETE=true`:
```bash
grep SETUP_COMPLETE backend/.env
docker compose restart
```

### Frontend shows wrong URL / API errors
The `REACT_APP_BACKEND_URL` is baked at build time. Rebuild:
```bash
export REACT_APP_BACKEND_URL=https://correct-domain.com
docker compose up -d --build
```

### Database migration fails
Check container logs:
```bash
docker compose logs | grep -i migration
```

---

## Runtime Versions

- **Python 3.11** (in Docker image)
- **Node.js 20** (build stage only)
- **Yarn 1.22+** (build stage only)

---

## Non-Docker Deployment

If you prefer running without Docker, the `systemd/erp-backend.service` file and original deploy scripts are still available. See the systemd service file for manual setup with Gunicorn.
