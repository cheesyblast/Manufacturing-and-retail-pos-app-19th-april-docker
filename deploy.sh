#!/usr/bin/env bash
# =============================================================================
# deploy.sh — First-time deployment on a fresh Ubuntu 22.04/24.04 VPS
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#
# What it does:
#   1. Installs system packages (Python 3.11, Node 20, Yarn, Nginx)
#   2. Creates a dedicated system user (erp)
#   3. Sets up Python venv + installs backend deps
#   4. Installs frontend deps + builds static assets
#   5. Writes systemd service + nginx config
#   6. Starts everything
#
# After running, configure your app at https://your-domain.com/setup
# =============================================================================

set -euo pipefail

APP_USER="erp"
APP_DIR="/opt/erp"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${1:-_}"  # Pass domain as first arg, or _ for IP-based access

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Pre-flight ──────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Run as root: sudo ./deploy.sh [your-domain.com]"

log "Starting deployment..."
log "Domain: ${DOMAIN}"

# ── 1. System packages ─────────────────────────────────────────────────────
log "Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
  software-properties-common curl git nginx certbot python3-certbot-nginx \
  build-essential libpq-dev > /dev/null

# Python 3.11
if ! python3.11 --version &>/dev/null; then
  log "Installing Python 3.11..."
  add-apt-repository -y ppa:deadsnakes/ppa > /dev/null 2>&1
  apt-get update -qq
  apt-get install -y -qq python3.11 python3.11-venv python3.11-dev > /dev/null
fi

# Node 20 via NodeSource
if ! node --version 2>/dev/null | grep -q "v20"; then
  log "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null
fi

# Yarn
if ! command -v yarn &>/dev/null; then
  log "Installing Yarn..."
  npm install -g yarn > /dev/null 2>&1
fi

log "Python: $(python3.11 --version)"
log "Node:   $(node --version)"
log "Yarn:   $(yarn --version)"

# ── 2. App user + directory ─────────────────────────────────────────────────
log "Setting up application directory..."
id -u "$APP_USER" &>/dev/null || useradd -r -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR"
rsync -a --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
  --exclude='venv' --exclude='build' --exclude='.env' \
  "$REPO_DIR/" "$APP_DIR/"

# ── 3. Backend setup ───────────────────────────────────────────────────────
log "Setting up backend..."
cd "$APP_DIR/backend"

python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
deactivate

# Create .env from example if not present
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a random JWT secret
  JWT=$(python3.11 -c "import secrets; print(secrets.token_hex(32))")
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${JWT}/" .env
  log "Created backend/.env — configure Supabase credentials before first use."
else
  log "backend/.env already exists, keeping it."
fi

# ── 4. Frontend setup ──────────────────────────────────────────────────────
log "Setting up frontend..."
cd "$APP_DIR/frontend"

# Create .env from example if not present
if [ ! -f .env ]; then
  if [ "$DOMAIN" = "_" ]; then
    BACKEND_URL="http://$(hostname -I | awk '{print $1}')"
  else
    BACKEND_URL="https://${DOMAIN}"
  fi
  echo "REACT_APP_BACKEND_URL=${BACKEND_URL}" > .env
  log "Created frontend/.env with REACT_APP_BACKEND_URL=${BACKEND_URL}"
else
  log "frontend/.env already exists, keeping it."
fi

yarn install --frozen-lockfile --production=false 2>/dev/null
yarn build
log "Frontend built successfully."

# ── 5. Set permissions ──────────────────────────────────────────────────────
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# ── 6. Systemd service ─────────────────────────────────────────────────────
log "Installing systemd service..."
cat > /etc/systemd/system/erp-backend.service << 'UNIT'
[Unit]
Description=ERP Backend (FastAPI)
After=network.target

[Service]
Type=simple
User=erp
Group=erp
WorkingDirectory=/opt/erp/backend
Environment="PATH=/opt/erp/backend/venv/bin:/usr/bin:/bin"
EnvironmentFile=/opt/erp/backend/.env
ExecStart=/opt/erp/backend/venv/bin/gunicorn server:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 2 \
  --bind 127.0.0.1:8001 \
  --timeout 120 \
  --access-logfile /var/log/erp-backend-access.log \
  --error-logfile /var/log/erp-backend-error.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable erp-backend

# ── 7. Nginx config ────────────────────────────────────────────────────────
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/erp << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend — static build
    root /opt/erp/frontend/build;
    index index.html;

    # API — proxy to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # SPA fallback — serve index.html for all frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/erp
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# ── 8. Start backend ───────────────────────────────────────────────────────
log "Starting backend service..."
systemctl start erp-backend

# ── 9. SSL (optional) ──────────────────────────────────────────────────────
if [ "$DOMAIN" != "_" ]; then
  log "Setting up SSL with Let's Encrypt..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" || \
    warn "SSL setup failed. You can retry with: sudo certbot --nginx -d ${DOMAIN}"
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
if [ "$DOMAIN" = "_" ]; then
  IP=$(hostname -I | awk '{print $1}')
  echo "  App URL:   http://${IP}"
else
  echo "  App URL:   https://${DOMAIN}"
fi
echo ""
echo "  Next steps:"
echo "    1. Edit /opt/erp/backend/.env with your Supabase credentials"
echo "    2. Restart: sudo systemctl restart erp-backend"
echo "    3. Open the app in browser → Setup Wizard will appear"
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status erp-backend"
echo "    sudo journalctl -u erp-backend -f"
echo "    sudo tail -f /var/log/erp-backend-error.log"
echo ""
