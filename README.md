# 🎲 Dobbelen - Liar's Dice Game

A modern, full-stack web implementation of Liar's Dice featuring real-time multiplayer gameplay, AI opponents, and a beautiful responsive interface. Built with Spring Boot, React, TypeScript, and WebSocket technology for seamless real-time communication.

## ✨ Features

- **🎮 Real-time Multiplayer**: Play with friends using WebSocket connections for instant updates
- **🤖 AI Opponents**: Add AI players to fill out your game sessions
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🌐 Multi-language Support**: English and Dutch language options
- **🎯 Modern UI**: Clean, intuitive interface with Tailwind CSS styling
- **⚡ Fast & Reliable**: Built with modern web technologies for optimal performance
- **🐳 Docker Ready**: Easy deployment with Docker Compose
- **🔄 Live Updates**: Real-time game state synchronization across all players

## 🚀 Quick Start with Docker

The easiest way to run the game is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd dobbelen

# Run with Docker Compose
docker-compose up --build
```

Then open http://localhost:3000 in your browser.

For detailed Docker setup instructions, see [DOCKER_README.md](DOCKER_README.md).

### 🌐 Single Port Setup (ngrok Compatible)

This project is configured to run on a single port, making it compatible with free ngrok tier:

```bash
# Start the application
docker-compose up -d

# In another terminal, expose with ngrok
ngrok http 3000
```

The frontend acts as a reverse proxy for the backend, so all traffic (API, WebSocket, static files) flows through one port. See [SINGLE_PORT_SETUP.md](SINGLE_PORT_SETUP.md) for details.

## 🏗️ Architecture & Technology Stack

### Backend
- **Framework**: Spring Boot 3.5.4
- **Language**: Java 21
- **Build Tool**: Gradle
- **WebSocket**: Spring WebSocket with STOMP protocol
- **API**: RESTful API with Spring Web
- **Monitoring**: Spring Boot Actuator

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Styling**: Tailwind CSS 3.4.4
- **State Management**: React Query for server state
- **WebSocket Client**: @stomp/stompjs with SockJS
- **HTTP Client**: Axios
- **Build Tool**: Create React App

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (production)
- **Real-time Communication**: WebSocket/STOMP
- **Development**: Hot reload support

## 🛠️ Manual Setup

### Prerequisites
- **Java 21+** (OpenJDK recommended)
- **Node.js 18+** (LTS version recommended)
- **Gradle** (included via wrapper)
- **Git** (for cloning the repository)

### Backend (Spring Boot)
```bash
cd backend
./gradlew bootRun
```
The backend will start on `http://localhost:8080`

### Frontend (React)
```bash
cd frontend
npm install
npm start
```
The frontend will start on `http://localhost:3000`

## 🔌 API Endpoints

### Game Management
- `POST /api/game/create` - Create a new game
- `POST /api/game/join` - Join an existing game
- `GET /api/game/{gameId}/state` - Get current game state
- `POST /api/game/{gameId}/action` - Submit game action (bid, doubt, spot-on)

### WebSocket Endpoints
- `/ws/game/{gameId}` - Real-time game updates
- `/topic/game/{gameId}/bids` - Bid updates
- `/topic/game/{gameId}/state` - Game state changes
- `/topic/game/{gameId}/players` - Player updates

## 📁 Project Structure

```
dobbelen/
├── backend/                 # Spring Boot backend
│   ├── src/main/java/      # Java source code
│   │   └── com/example/backend/
│   │       ├── controller/ # REST controllers
│   │       ├── service/    # Business logic
│   │       ├── model/      # Data models
│   │       └── config/     # Configuration
│   └── src/main/resources/ # Application properties
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── locales/        # Internationalization
│   └── public/             # Static assets
├── docker-compose.yml      # Development setup
├── docker-compose.prod.yml # Production setup
└── README.md              # This file
```

---

## 🎮 Game Rules

### Overview
Dobbelen is a variation of Liar's Dice that emphasizes strategic endurance. Players aim to outlast others by successfully navigating rounds without losing.

### Setup
- **Players**: 3-6 players (minimum 3 for meaningful gameplay)
- **Equipment**: Each player starts with 5 dice concealed under a cup
- **Start**: All players roll dice secretly, then play proceeds clockwise

### Gameplay Actions

#### 1. Raise
- Declare a new bid predicting how many dice show a specific face value
- Example: "Four threes" means at least four dice show the value 3
- New bids must either:
  - Increase the **quantity** (e.g., "Five twos" after "Four threes")
  - Increase the **face value** while maintaining/increasing quantity (e.g., "Four fours" after "Four threes")

#### 2. Doubt
- Challenge the previous player's bid
- All dice are revealed and counted
- If the bid was accurate/understated: **challenger is eliminated**
- If the bid was overstated: **previous bidder is eliminated**

#### 3. Spot On
- Claim the previous bid is exactly correct
- If exactly correct: **all other players are eliminated, you win the round**
- If incorrect: **you are eliminated**

### Winning
- **Round Winner**: Last player standing in a round
- **Game Winner**: Player who wins the most rounds (or first to reach target rounds)
- **Eliminated Players**: Return with full dice for the next round

### Strategy Tips
- **Calculated Risk**: Balance bold bids with realistic probabilities
- **Read Opponents**: Watch for bluffing patterns and uncertainty
- **Spot-On Tactics**: High-risk, high-reward moves that can win rounds instantly
- **Survival Mode**: Play conservatively to avoid elimination

## 🎯 How to Play

### Getting Started
1. **Create or Join a Game**: Use the lobby to create a new game or join an existing one with a 3-character game ID
2. **Add Players**: Invite friends or add AI opponents to fill out your game (3-6 players recommended)
3. **Start Playing**: Once all players are ready, the host can start the game

### Game Interface
- **Your Dice**: View your 5 dice at the bottom of the screen
- **Opponents**: See other players' cups (dice hidden until revealed)
- **Current Bid**: The central display shows the current bid and whose turn it is
- **Actions**: Use the Raise, Doubt, or Spot On buttons when it's your turn

## 📸 Screenshots & Demo

*Screenshots coming soon!*

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by the classic Liar's Dice game
- Built with modern web technologies for the best gaming experience
