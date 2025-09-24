#!/bin/bash

# Dobbelen Game - Docker Run Script

echo "🎲 Starting Dobbelen Game with Docker Compose..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping containers..."
    docker-compose down
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build

# Wait for user to stop
echo "✅ Services are running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080"
echo "📊 Backend Health: http://localhost:8080/actuator/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait
