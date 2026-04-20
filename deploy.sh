#!/usr/bin/env bash
# =============================================================================
# deploy.sh — First-time Docker deployment on Ubuntu 22.04/24.04 VPS
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   sudo ./deploy.sh your-domain.com
#
# What it does:
#   1. Installs Docker + Docker Compose (if missing)
#   2. Installs Nginx (if missing)
#   3. Creates backend/.env from template
#   4. Builds and starts the Docker container
#   5. Configures Nginx reverse proxy
#   6. Optional: sets up SSL via Let's Encrypt
#
# After running, open https://your-domain.com → Setup Wizard will appear
# =============================================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${1:-_}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && err "Run as root: sudo ./deploy.sh [your-domain.com]"

log "Starting Docker deployment..."

# ── 1. Install Docker ───────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
  systemctl enable --now docker
fi

# Docker Compose (v2 plugin)
if ! docker compose version &>/dev/null; then
  log "Installing Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1
fi

log "Docker: $(docker --version)"

# ── 2. Install Nginx ───────────────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  log "Installing Nginx..."
  apt-get update -qq
  apt-get install -y -qq nginx certbot python3-certbot-nginx > /dev/null
fi

# ── 3. Create .env files ──────────────────────────────────────────────────
cd "$REPO_DIR"

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  JWT=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${JWT}/" backend/.env
  log "Created backend/.env — configure Supabase credentials via Setup Wizard."
else
  log "backend/.env already exists, keeping it."
fi

# ── 4. Set backend URL ────────────────────────────────────────────────────
if [ "$DOMAIN" = "_" ]; then
  BACKEND_URL="http://$(hostname -I | awk '{print $1}')"
else
  BACKEND_URL="https://${DOMAIN}"
fi
export REACT_APP_BACKEND_URL="$BACKEND_URL"
log "Frontend API URL: $BACKEND_URL"

# ── 5. Build and start ────────────────────────────────────────────────────
log "Building Docker image (this may take a few minutes on first run)..."
docker compose build
log "Starting container..."
docker compose up -d

# ── 6. Nginx config ──────────────────────────────────────────────────────
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/erp << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        client_max_body_size 10M;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;
}
NGINX

ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/erp
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# ── 7. SSL (optional) ──────────────────────────────────────────────────────
if [ "$DOMAIN" != "_" ]; then
  log "Setting up SSL with Let's Encrypt..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" || \
    warn "SSL setup failed. Retry with: sudo certbot --nginx -d ${DOMAIN}"
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
if [ "$DOMAIN" = "_" ]; then
  IP=$(hostname -I | awk '{print $1}')
  echo "  App URL:  http://${IP}"
else
  echo "  App URL:  https://${DOMAIN}"
fi
echo ""
echo "  Next steps:"
echo "    1. Open the URL in your browser"
echo "    2. The Setup Wizard will guide you through database config"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f          # view logs"
echo "    docker compose restart          # restart app"
echo "    docker compose down             # stop app"
echo "    docker compose up -d --build    # rebuild after code changes"
echo ""
