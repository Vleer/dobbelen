# Dobbelen

A browser game based on Liar’s Dice (Dobbelen). I built it as a portfolio piece: it shows how I work with a Spring Boot backend, a React and TypeScript frontend, real-time WebSockets, and Docker when it fits.

## Rules (short)

Three to six players each have five dice under a cup. Everyone rolls; play goes clockwise.

- **Raise** — You claim there are at least *N* dice showing a given face (e.g. “four threes”). The next bid must raise the count, or raise the face while keeping a plausible count.
- **Doubt** — You challenge the last bid. Dice are revealed. If the bid was true or modest, you lose. If it was too high, the bidder loses.
- **Spot on** — You say the bid is exactly right. If it is, everyone else loses that round. If not, you lose.

The round ends when one player is left; the app tracks rounds and scoring. Exact details match the in-game flow.

## Stack

Backend: Java, Spring Boot, WebSockets (STOMP). Frontend: React, TypeScript, Vite, Tailwind. Optional: Docker Compose, Capacitor for mobile builds.

## Run it

**Docker (simplest):** from the repo root, `docker-compose up --build`, then open http://localhost:3000. More detail: [DOCKER_README.md](DOCKER_README.md).

**Local:** start the backend (`cd backend && ./gradlew bootRun`, port 8080), then the frontend (`cd frontend && npm install && npm start`, port 3000).

## License

[MIT](LICENSE).
