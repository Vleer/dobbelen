#!/usr/bin/env bash
# Pre-pull commonly used base images so first builds aren't blocked on pulls.
set -euo pipefail

IMAGES=(
  "mongo:7.0"
  "gradle:8.10-jdk21"
  "eclipse-temurin:21-jre"
  "node:18.20-alpine"
  "nginx:1.27-alpine"
  "cloudflare/cloudflared:latest"
)

echo "Pulling base images..."
for img in "${IMAGES[@]}"; do
  echo "  → $img"
  docker pull "$img" || echo "  (warn) failed to pull $img"
done
echo "Done."
