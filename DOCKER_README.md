# 🎲 Dobbelen Game - Docker Setup

This guide explains how to run the Dobbelen game using Docker and Docker Compose.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## Quick Start

### Option 1: Using the provided scripts

**For Linux/Mac:**
```bash
chmod +x run.sh
./run.sh
```

**For Windows:**
```cmd
run.bat
```

### Option 2: Using Docker Compose directly

**Development mode:**
```bash
docker-compose up --build
```

**Production mode:**
```bash
docker-compose -f docker-compose.prod.yml up --build
```

## Services

### Backend (Spring Boot)
- **Port:** 8080
- **Health Check:** http://localhost:8080/actuator/health
- **API Base:** http://localhost:8080/api/

### Frontend (React + Nginx)
- **Port:** 3000 (dev) / 80 (prod)
- **URL:** http://localhost:3000 (dev) / http://localhost (prod)

## Docker Configuration

### Backend Dockerfile
- Uses OpenJDK 17
- Builds the Spring Boot application
- Exposes port 8080

### Frontend Dockerfile
- Multi-stage build with Node.js 18
- Builds React application
- Serves with Nginx
- Includes API proxy configuration

### Docker Compose
- **Development:** `docker-compose.yml`
- **Production:** `docker-compose.prod.yml`
- Includes health checks and service dependencies
- Uses custom network for service communication

## Environment Variables

### Backend
- `SPRING_PROFILES_ACTIVE`: Set to `docker` or `prod`
- `SERVER_ADDRESS`: Set to `0.0.0.0` for Docker

### Frontend
- `REACT_APP_BACKEND_URL`: Backend API URL

## Useful Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Rebuild services
```bash
docker-compose up --build
```

### Clean up
```bash
docker-compose down -v
docker system prune -f
```

## Troubleshooting

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

1. Use `docker-compose.prod.yml`
2. Set up reverse proxy (nginx/traefik) for SSL
3. Configure environment variables
4. Set up monitoring and logging
5. Use Docker Swarm or Kubernetes for orchestration

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
