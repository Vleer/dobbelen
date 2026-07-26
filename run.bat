@echo off
REM Dobbelen Game - Docker Run Script for Windows
REM Prefer: run.sh on WSL/Git Bash. This mirrors the default (non-dev) path.

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo Starting Dobbelen with Docker Compose...

docker info >nul 2>&1
if %errorlevel% neq 0 (
  echo Docker is not running. Start Docker first.
  pause
  exit /b 1
)

docker compose version >nul 2>&1
if %errorlevel% neq 0 (
  echo docker compose plugin is required.
  pause
  exit /b 1
)

if not exist .docker-cache mkdir .docker-cache

echo Building in parallel...
docker compose -f docker-compose.yml build --parallel
if %errorlevel% neq 0 (
  echo Build failed.
  pause
  exit /b 1
)

echo Starting services...
docker compose -f docker-compose.yml up

echo Stopping containers...
docker compose -f docker-compose.yml down
pause
