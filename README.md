# 🎲 Dobbelen - Liar's Dice Game

A multiplayer web-based implementation of Liar's Dice with AI opponents, real-time gameplay, and mobile-responsive design.

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

## 🛠️ Manual Setup

### Prerequisites
- Java 17+
- Node.js 18+
- Gradle (for backend)

### Backend (Spring Boot)
```bash
cd backend
./gradlew bootRun
```

### Frontend (React)
```bash
cd dobbelen-frontend
npm install
npm start
```

---

## 🎮 Game Rules

### Liar's Dice Variation: "Endurance Round"

This variation of Liar's Dice introduces new mechanics to extend gameplay and emphasize strategic endurance.

---

### Objective

Players aim to outlast others by successfully navigating rounds without losing. The last player standing in a round wins that round.

---

### Setup

1. **Players:** Typically 3–6 players (minimum 3 players for meaningful dynamics).
2. **Dice and Cups:** Each player starts with 5 dice, concealed under a cup.
3. **Starting the Game:**

   * All players roll their dice secretly and view their results.
   * Dice remain hidden under the cups.
   * The game begins with any player, proceeding clockwise.

---

### Turns and Actions

On each turn, players must choose one of three options:

1. **Raise:**

   * The player declares a new bid that increases the claim.
   * The bid predicts how many dice across all players show a specific face value.
   * Example: "Four threes" means there are at least four dice showing a face value of three.
   * The new bid must either:

     * Increase the **quantity** of dice (e.g., "Five twos" after "Four threes").
     * Increase the **face value** while maintaining or increasing the quantity (e.g., "Four fours" after "Four threes").

2. **Doubt:**

   * The player doubts the previous bid, challenging its accuracy.
   * When challenged:

     * All players reveal their dice.
     * Dice showing the declared face value are counted to verify the bid.
     * If the bid was accurate or understated, the challenger is **eliminated** from the round.
     * If the bid was overstated, the previous bidder is **eliminated** from the round.
     * Play continues without the eliminated player.

3. **Spot On:**

   * The player claims the previous bid is exactly correct.
   * When this is declared:

     * All dice are revealed and counted.
     * If the bid is **exactly correct**, all other players are **eliminated** from the round, and the player making the "Spot On" claim wins the round.
     * If the bid is not exactly correct, the player who called "Spot On" is **eliminated**, and the round continues.

---

### Rounds and Progression

1. After a player is eliminated, the current round continues with the remaining players.
2. A round ends when only one player is left. This player is declared the **round winner**.
3. All players reset their dice for the next round, and a new game begins.

---

### Additional Rules

1. **Wild Ones:** Before the game starts, players can decide if ones are wild, acting as any face value.
2. **Eliminated Players:** Eliminated players sit out for the remainder of the current round but return for the next round with all dice.
3. **Game Winner:** The overall winner can be determined by counting how many rounds each player wins or by playing a fixed number of rounds.

---

### Strategies

1. **Calculated Risk:** Balancing bold bids with realistic probabilities.
2. **Reading Opponents:** Observing others' behaviors to detect bluffing or uncertainty.
3. **Spot-On Tactics:** Spot-on calls can be game-changing but require precision and courage.
4. **Survival:** Playing conservatively to avoid elimination while others take risks.

---

### Example Gameplay

1. **Initial Turn:**

   * Player A starts with: "Three twos."
   * Player B raises: "Four threes."
   * Player C raises: "Five twos."

2. **Doubt Example:**

   * Player D doubts Player C’s bid.
   * All dice are revealed. If fewer than five twos are present:

     * Player C is eliminated.
     * The game continues with Players A, B, and D.

3. **Spot-On Example:**

   * Player B declares "Spot On" after Player A’s bid of "Four fours."
   * All dice are revealed. If exactly four fours are present:

     * Player B wins the round immediately.
     * Otherwise, Player B is eliminated, and the round continues.

frontend:

Table Layout (Container)

Base container:
A centered, responsive table container (e.g., <div class="game-table">) using flexbox or CSS grid.

Aspect ratio close to 4:3 or 16:9, to maintain a rectangular poker-table look.

Position: relative, so child elements (players, dice, UI controls) can be placed absolutely.

Player Positioning

Yourself (local player):

Positioned bottom center.

Container includes:

Dice row: 5 dice shown in order, horizontally aligned, fixed width per die.

Cup placeholder: a small closed-cup element next to dice, usually centered above them.

Username label: directly under the dice row.

Action controls (Raise, Doubt, Spot On): displayed just beneath the player area.

Opponent Left:

Positioned bottom left quadrant (rotated 90° orientation optional).

Displays cup only (closed).

Username placed under the cup.

Eliminated state: cup grayed out or semi-transparent.

Opponent Right:

Positioned bottom right quadrant, mirroring the left opponent.

Same structure: cup + username.

Opponent Across:

Positioned top center.

Cup is centered, username below.

Optional placeholder for dice revealed only at end-of-round.

Bid & Turn Information

Center overlay panel (like a pot in poker):

Shows current bid (e.g., “Four Threes”).

Displays turn indicator (highlight current player’s cup with a border or glow).

Updates via WebSocket /topic/game/{gameId}/bids events.

Event Handling Integration

WebSocket updates:

Subscribed clients listen for:

stateUpdate → refresh overall table layout.

bidUpdate → update central bid display.

playerEliminated → gray out opponent’s cup.

diceResults → reveal dice at round end.

turnUpdate (from TurnManagerService) → highlight the active player.

Game controls (bottom UI panel):

Buttons for Raise, Doubt, Spot On.

Clicking emits /app/game/{gameId}/bid or /app/game/{gameId}/challenge calls.

These controls are enabled only if it’s your turn (state provided by /api/game/state).
