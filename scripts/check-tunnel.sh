#!/usr/bin/env bash
# Run from repo root. Checks that cloudflared can read config and (optionally) run the tunnel.
set -e
cd "$(dirname "$0")/.."

echo "=== 1. Checking .env and config path ==="
if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and set CLOUDFLARED_CONFIG_PATH and CLOUDFLARED_TUNNEL_ID."
  exit 1
fi
source .env
if [ -z "$CLOUDFLARED_CONFIG_PATH" ] || [ -z "$CLOUDFLARED_TUNNEL_ID" ]; then
  echo "Set CLOUDFLARED_CONFIG_PATH and CLOUDFLARED_TUNNEL_ID in .env"
  exit 1
fi
CONFIG="$CLOUDFLARED_CONFIG_PATH/config.yml"
# Use whatever credentials .json exists in ~/.cloudflared (credentials.json, <tunnel-id>.json, or any .json)
CREDS=""
for f in "$CLOUDFLARED_CONFIG_PATH/credentials.json" "$CLOUDFLARED_CONFIG_PATH/${CLOUDFLARED_TUNNEL_ID}.json"; do
  if [ -f "$f" ]; then
    CREDS="$f"
    break
  fi
done
if [ -z "$CREDS" ]; then
  CREDS=$(find "$CLOUDFLARED_CONFIG_PATH" -maxdepth 1 -name '*.json' -type f 2>/dev/null | head -1)
fi
if [ -z "$CREDS" ]; then
  echo "No credentials .json found in $CLOUDFLARED_CONFIG_PATH"
  ls -la "$CLOUDFLARED_CONFIG_PATH" 2>/dev/null || true
  exit 1
fi
if [ ! -f "$CONFIG" ]; then
  echo "Config not found: $CONFIG"
  exit 1
fi
echo "Config: $CONFIG"
echo "Credentials: $CREDS"
echo "  (in config.yml use: credentials-file: /etc/cloudflared/$(basename "$CREDS"))"
echo ""

echo "=== 2. Config ingress (must use http://frontend:80 when using docker-compose.prod) ==="
grep -A1 "hostname: 898944" "$CONFIG" || true
grep "service:" "$CONFIG" || true
echo ""

echo "=== 3. Run tunnel once in foreground (Ctrl+C to stop) ==="
echo "If you see 'Connection established' or 'Registered tunnel connection', the tunnel is OK."
echo "If you see errors, fix config/credentials and restart: docker compose -f docker-compose.prod.yml up -d"
echo ""
docker compose -f docker-compose.prod.yml run --rm cloudflared tunnel --config /home/vleer/.cloudflared/config.yml run "$CLOUDFLARED_TUNNEL_ID"
