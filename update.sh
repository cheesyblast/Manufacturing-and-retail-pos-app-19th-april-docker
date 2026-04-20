#!/usr/bin/env bash
# =============================================================================
# update.sh — Pull latest code and redeploy via Docker (no data loss)
# =============================================================================
# Usage:
#   cd /path/to/repo
#   git pull
#   sudo ./update.sh
# =============================================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[UPDATE]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && err "Run as root: sudo ./update.sh"

cd "$REPO_DIR"

log "Rebuilding Docker image..."
docker compose build

log "Restarting container..."
docker compose up -d

log "Reloading Nginx..."
systemctl reload nginx

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo "  Logs:     docker compose logs -f"
echo "  Status:   docker compose ps"
echo ""
