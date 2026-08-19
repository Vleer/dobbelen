# 🎲 Dobbelen Game - Docker Setup

This guide explains how to run the Dobbelen game using Docker and Docker Compose.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) (v2 plugin: `docker compose`)
- Optional: [Buildx](https://docs.docker.com/build/install-buildx/) for `./run.sh --bake` layer caching

## Quick Start

Pre-pull base images once (optional, speeds first build):

```bash
./run.sh --prepull
# or: ./scripts/docker-prepull.sh
```

**Linux/Mac (recommended):**
```bash
chmod +x run.sh
./run.sh              # nginx frontend (production-like local)
./run.sh --dev        # Vite hot-reload frontend (fast iteration)
./run.sh --build      # parallel image build only
./run.sh --bake       # buildx bake + local layer cache (.docker-cache/)
```

**Windows:**
```cmd
run.bat
```

**Compose directly:**
```bash
export DOCKER_BUILDKIT=1
docker compose build --parallel && docker compose up
docker compose -f docker-compose.dev.yml up --build   # hot reload
docker compose -f docker-compose.prod.yml up --build  # production
```

**Production on 898944.xyz (with Cloudflare Tunnel):**  
Create a `.env` in the project root (see `.env.example`) with `CLOUDFLARED_CONFIG_PATH` and `CLOUDFLARED_TUNNEL_ID`. Ensure your tunnel config (e.g. `~/.cloudflared/config.yml`) routes 898944.xyz to `http://frontend:80`. Then run:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## Build performance notes

- **BuildKit cache mounts** in Dockerfiles keep Gradle (`/home/gradle/.gradle`) and npm (`/root/.npm`) caches across rebuilds.
- **Frontend Docker builds omit optional Capacitor packages** (`npm ci --omit=optional`), then install `@rollup/rollup-linux-x64-musl` for Alpine. Install Capacitor locally for mobile (`npm install`).
- **Same-origin API/WS** via nginx — web images do not bake `VITE_BACKEND_URL`.
- **`.dockerignore`** excludes `android/`, `ios/`, Capacitor assets, and build artifacts from the frontend context.
- Prefer `./run.sh --dev` when iterating on UI so you do not rebuild the nginx image each change.

## Services

### Backend (Spring Boot)
- **Port:** 8080
- **Health Check:** http://localhost:8080/actuator/health
- **API Base:** http://localhost:8080/api/

### Frontend (React + Nginx, or Vite in `--dev`)
- **Port:** 3000 (local) / 80 (prod compose)
- **URL:** http://localhost:3000 (local) / http://localhost (prod)

## Docker Configuration

### Backend Dockerfile
- Multi-stage: `gradle:8.10-jdk21` builder → `eclipse-temurin:21-jre`
- BuildKit cache mounts for Gradle
- Exposes port 8080

### Frontend Dockerfile
- Multi-stage: `node:18.20-alpine` builder → `nginx:1.27-alpine`
- BuildKit npm cache; Capacitor optional deps omitted
- Nginx proxies `/api` and `/ws` to `backend:8080`

### Compose files
- `docker-compose.yml` — local nginx stack
- `docker-compose.dev.yml` — Vite hot reload
- `docker-compose.prod.yml` — hosted/prod + cloudflared
- `docker-bake.hcl` — optional buildx bake targets with local layer cache

## Environment Variables

### Backend
- `SPRING_PROFILES_ACTIVE`: Set to `docker` or `prod`
- `SERVER_ADDRESS`: Set to `0.0.0.0` for Docker

### Frontend (Vite / native only)
- `VITE_BACKEND_URL`: used for Capacitor/native and `--dev` (browser → `http://localhost:8080`)
- Web Docker images use same-origin (empty URL); nginx proxies API/WS

## Useful Commands

### Start services
```bash
docker compose up -d
# or: ./run.sh -d
```

### Stop services
```bash
docker compose down
```

### View logs
```bash
docker compose logs -f
```

### Rebuild services (parallel)
```bash
DOCKER_BUILDKIT=1 docker compose build --parallel && docker compose up -d
```

### Clean up
```bash
docker compose down -v
docker builder prune -f
```

## Troubleshooting

### "Cloudflare is currently unable to resolve it" (898944.xyz, Error 1033)

This means Cloudflare cannot reach your tunnel. Do the following:

1. **Check that the prod stack is running** (including cloudflared):
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   All four services (mongodb, backend, frontend, cloudflared) should be "Up". If cloudflared is "Exit" or restarting, check its logs.

2. **Check cloudflared logs** for connection or config errors:
   ```bash
   docker logs dobbelen-cloudflared-prod
   ```
   - You want to see **"Connection established"** or **"Registered tunnel connection"**. Then the tunnel is connected; if the site still fails, the problem may be DNS or the hostname not linked to this tunnel in the Cloudflare dashboard.
   - If you see **"permission denied"** on config/credentials: the compose file runs cloudflared as `user: "1000:1000"` and sets `HOME=/tmp`. Ensure your `~/.cloudflared` files are readable by your user (same UID as 1000, or chmod as needed).
   - If you see **credentials or tunnel errors**: ensure the tunnel ID in `.env` and in the Cloudflare dashboard match, and `credentials-file` in config points to the path **inside the container**: `/etc/cloudflared/credentials.json`.

3. **Fix tunnel config for Docker.** Your real config (e.g. `~/.cloudflared/config.yml`) must use the **Docker service name** for the app: `service: http://frontend:80`, not `localhost`. See `cloudflared-config.example.yml`. All paths in config (e.g. `credentials-file`) are inside the container: use `/etc/cloudflared/credentials.json` when the host dir is mounted at `/etc/cloudflared`.

4. **Run the tunnel once in the foreground** to see live output:
   ```bash
   ./scripts/check-tunnel.sh
   ```
   (Or: `docker compose -f docker-compose.prod.yml run --rm cloudflared tunnel --config /etc/cloudflared/config.yml run YOUR_TUNNEL_ID`.) Stop with Ctrl+C. If it connects here but not when run in the background, compare env/volumes.

5. **Restart the stack** after any config/permission change:
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d
   docker logs -f dobbelen-cloudflared-prod
   ```

### Port conflicts
If ports 3000 or 8080 are already in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Change 3000 to 3001
  - "8081:8080"  # Change 8080 to 8081
```

### Backend not starting
Check if the backend health check is passing:
```bash
curl http://localhost:8080/actuator/health
```

### Frontend not connecting to backend
Verify the backend is running and check the nginx configuration in `frontend/nginx.conf`.

## Development

### Hot reload (not available in Docker)
For development with hot reload, run services locally:
```bash
# Backend
cd backend
./gradlew bootRun

# Frontend
cd frontend
npm start
```

### Building images manually
```bash
# Backend
docker build -t dobbelen-backend ./backend

# Frontend
docker build -t frontend ./frontend
```

## Production Deployment

1. Use `docker-compose.prod.yml` (production Dockerfiles, same-origin API/WS for 898944.xyz).
2. For 898944.xyz: set `.env` from `.env.example` (`CLOUDFLARED_CONFIG_PATH`, `CLOUDFLARED_TUNNEL_ID`). The prod stack includes a cloudflared service that uses this config.
3. In your Cloudflare tunnel config, point the hostname to `http://frontend:80` so the frontend nginx can serve the app and proxy `/api` and `/ws` to the backend.
4. Optionally set up a reverse proxy (nginx/traefik) for SSL in front of the tunnel, or use Cloudflare’s SSL.
5. Set up monitoring and logging as needed.

## Network Architecture

```
Internet → Frontend (Nginx) → Backend (Spring Boot)
                ↓
            WebSocket Connection
```

The frontend nginx configuration includes:
- API proxy to backend (`/api/` → backend:8080)
- WebSocket proxy (`/ws/` → backend:8080)
- Static file serving
- React Router support
