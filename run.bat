@echo off
REM Dobbelen Game - Docker Run Script for Windows

echo 🎲 Starting Dobbelen Game with Docker Compose...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not installed. Please install docker-compose first.
    pause
    exit /b 1
)

REM Build and start services
echo 🔨 Building and starting services...
docker-compose up --build

REM Keep window open
echo ✅ Services are running!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8080
echo 📊 Backend Health: http://localhost:8080/actuator/health
echo.
echo Press any key to stop all services
pause >nul

REM Stop services
echo 🛑 Stopping containers...
docker-compose down
