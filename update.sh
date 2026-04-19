#!/usr/bin/env bash
# =============================================================================
# update.sh — Pull latest code and redeploy (no data loss)
# =============================================================================
# Usage:
#   cd /path/to/repo
#   sudo ./update.sh
#
# What it does:
#   1. Syncs code to /opt/erp (preserves .env files)
#   2. Updates backend dependencies
#   3. Rebuilds frontend
#   4. Restarts services
# =============================================================================

set -euo pipefail

APP_DIR="/opt/erp"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[UPDATE]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && err "Run as root: sudo ./update.sh"

log "Syncing code..."
rsync -a --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
  --exclude='venv' --exclude='build' --exclude='.env' \
  "$REPO_DIR/" "$APP_DIR/"

log "Updating backend dependencies..."
cd "$APP_DIR/backend"
source venv/bin/activate
pip install -r requirements.txt -q
deactivate

log "Rebuilding frontend..."
cd "$APP_DIR/frontend"
yarn install --frozen-lockfile --production=false 2>/dev/null
yarn build

log "Setting permissions..."
chown -R erp:erp "$APP_DIR"

log "Restarting services..."
systemctl restart erp-backend
systemctl reload nginx

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo "  Backend:  sudo systemctl status erp-backend"
echo "  Logs:     sudo journalctl -u erp-backend -f"
echo ""
