#!/usr/bin/env bash
# Redeploy Reimwelt: (optionally) pull, update deps, rebuild the frontend, and
# restart both systemd services — then health-check them.
#
# Run on the VPS as the user that owns the services (or with sudo):
#   ./deploy/redeploy.sh            # standard redeploy (git pull + build + restart)
#   ./deploy/redeploy.sh --clean    # also wipe .next first — use after backend
#                                   #   data/logic changes that alter EXISTING pages
#                                   #   (ISR caches fetches for a week otherwise)
#   ./deploy/redeploy.sh --no-pull  # deploy the current checkout, no git pull
#
# Build-time config (NEXT_PUBLIC_SITE_URL, INTERNAL_API_URL, SSG_* …) is read by
# Next from web/.env.production — see DEPLOY.md. Uses `sudo systemctl restart`,
# so the invoking user must be allowed to restart reimwelt-api / reimwelt-web.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

PULL=1
CLEAN=0
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    --clean)   CLEAN=1 ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

cd "$APP_DIR"
echo "▶ App dir: $APP_DIR"

if [ "$PULL" = 1 ]; then
  echo "▶ git pull --ff-only"
  git pull --ff-only
fi

# --- Backend ---
if [ -d .venv ]; then
  echo "▶ Updating Python deps"
  ./.venv/bin/pip install -q -r requirements.txt
fi
echo "▶ Restarting reimwelt-api"
sudo systemctl restart reimwelt-api

# --- Frontend ---
cd web
echo "▶ npm ci"
npm ci
if [ "$CLEAN" = 1 ]; then
  echo "▶ Clearing .next (ISR + build cache)"
  rm -rf .next
fi
echo "▶ npm run build"
npm run build
echo "▶ Restarting reimwelt-web"
sudo systemctl restart reimwelt-web

# --- Health checks ---
cd "$APP_DIR"
echo "▶ Health checks"
sleep 2
api_code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8000/api/top-words/de?limit=1" || true)
web_code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000/de/reime" || true)
echo "   reimwelt-api (:8000): $api_code"
echo "   reimwelt-web (:3000): $web_code"
if [ "$api_code" = "200" ] && [ "$web_code" = "200" ]; then
  echo "✅ Redeploy complete."
else
  echo "⚠️  Not all services returned 200 — check:" >&2
  echo "    journalctl -u reimwelt-api -u reimwelt-web -n 50 --no-pager" >&2
  exit 1
fi
