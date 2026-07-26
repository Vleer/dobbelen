#!/usr/bin/env bash
# Dobbelen — local Docker helpers
# Usage:
#   ./run.sh             # nginx frontend images (default compose)
#   ./run.sh --dev       # Vite hot-reload frontend
#   ./run.sh --prepull   # pull base images only
#   ./run.sh --build     # parallel image build only
#   ./run.sh --bake      # build via buildx bake + local layer cache

set -euo pipefail

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="up"
COMPOSE_FILES=(-f docker-compose.yml)
DETACH=()

usage() {
  sed -n '2,11p' "$0" | sed 's/^# //'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) COMPOSE_FILES=(-f docker-compose.dev.yml); shift ;;
    --prod) COMPOSE_FILES=(-f docker-compose.prod.yml); shift ;;
    --prepull) MODE="prepull"; shift ;;
    --build) MODE="build"; shift ;;
    --bake) MODE="bake"; shift ;;
    -d|--detach) DETACH=(-d); shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required."
  exit 1
fi

compose() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

if [[ "$MODE" == "prepull" ]]; then
  exec ./scripts/docker-prepull.sh
fi

mkdir -p .docker-cache

if [[ "$MODE" == "bake" ]]; then
  if ! docker buildx version >/dev/null 2>&1; then
    echo "docker buildx is required for --bake"
    exit 1
  fi
  TARGETS=(backend frontend)
  if [[ "${COMPOSE_FILES[*]}" == *prod* ]]; then
    TARGETS=(backend-prod frontend-prod)
  fi
  docker buildx bake -f docker-bake.hcl "${TARGETS[@]}"
  exit 0
fi

cleanup() {
  echo "Stopping containers..."
  compose down
  exit 0
}

if [[ "$MODE" == "build" ]]; then
  echo "Building images in parallel (BuildKit)..."
  compose build --parallel
  exit 0
fi

trap cleanup SIGINT SIGTERM

echo "Building (parallel) and starting..."
# Dev stack only builds backend; vite frontend uses a prebuilt node image
if [[ "${COMPOSE_FILES[*]}" == *dev* ]]; then
  compose build --parallel backend
else
  compose build --parallel
fi
compose up "${DETACH[@]}"

if [[ ${#DETACH[@]} -eq 0 ]]; then
  echo "Frontend: http://localhost:3000"
  echo "Backend:  http://localhost:8080/actuator/health"
  wait
fi
