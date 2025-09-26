package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.dto.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {
    private final Map<String, Game> games = new ConcurrentHashMap<>();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Game createGame(List<String> playerNames) {
        if (playerNames == null || playerNames.size() < 3) {
            throw new IllegalArgumentException("Game requires at least 3 players");
        }

        List<Player> players = playerNames.stream()
                .map(Player::new)
                .toList();

        Game game = new Game(players);
        
        // Roll initial dice for all players
        for (Player player : game.getPlayers()) {
            player.rollDice();
        }

        games.put(game.getId(), game);
        return game;
    }

    public Game getGame(String gameId) {
        Game game = games.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found: " + gameId);
        }
        return game;
    }

    public List<Game> getAllGames() {
        return new ArrayList<>(games.values());
    }

    public void startNewRound(String gameId) {
        Game game = getGame(gameId);
        System.out.println("🔄 NEW_ROUND: startNewRound called for game " + gameId + " at " + System.currentTimeMillis()
                + ", showAllDice=" + (game != null ? game.isShowAllDice() : "null"));
        
        // Check if game is already completed
        if (game.hasGameWinner()) {
            System.out.println("Game already has winner, not starting new round");
            return; // Don't start new round if game is over
        }

        System.out.println("Starting new round " + (game.getRoundNumber() + 1) + " for game " + gameId);

        // Reset ALL players for new round - everyone participates again
        for (Player player : game.getPlayers()) {
            player.reset(); // This clears elimination status and dice
            player.rollDice();
            System.out.println("NEW_ROUND_DEBUG: Player " + player.getName() + " reset for new round, eliminated="
                    + player.isEliminated());
        }
        
        // Clear eliminated players list for new round
        game.getEliminatedPlayers().clear();

        // Randomize starting player from ALL players
        game.setCurrentPlayerIndex((int) (Math.random() * game.getPlayers().size()));
        game.setCurrentBid(null);
        game.setPreviousBid(null);
        game.setWinner(null);
        game.setState(GameState.IN_PROGRESS);
        game.setRoundNumber(game.getRoundNumber() + 1);

        System.out.println("New round started. State: " + game.getState() + ", Current player: "
                + game.getCurrentPlayer().getName());
    }

    private void checkAndHandleRoundEnd(String gameId) {
        Game game = getGame(gameId);
        List<Player> activePlayers = game.getActivePlayers();

        System.out.println(
                "ROUND_END_CHECK: Active players: " + activePlayers.size() + " out of " + game.getPlayers().size());
        for (Player p : game.getPlayers()) {
            System.out.println("  Player " + p.getName() + ": eliminated=" + p.isEliminated() +
                    ", in eliminatedList=" + game.getEliminatedPlayers().contains(p.getId()));
        }

        if (activePlayers.size() <= 1) {
            if (activePlayers.size() == 1) {
                Player roundWinner = activePlayers.get(0);
                game.setWinner(roundWinner.getId());
                roundWinner.addWinToken();

                System.out.println("ROUND_END_DEBUG: Player " + roundWinner.getName() + " won round! " +
                        "Win tokens: " + roundWinner.getWinTokens() + ", Total players: " + game.getPlayers().size());

                // Check if this player has won the entire game
                if (roundWinner.getWinTokens() >= 7) {
                    game.setGameWinner(roundWinner.getId());
                    game.setState(GameState.GAME_ENDED);
                    System.out.println("GAME_END_DEBUG: Game ended! Winner: " + roundWinner.getName() + " with "
                            + roundWinner.getWinTokens() + " tokens");
                } else {
                    System.out.println("CONTINUE_DEBUG: Game continues. Player " + roundWinner.getName() +
                            " has " + roundWinner.getWinTokens() + " tokens (needs 7 to win)");
                    // Pass dealer button to the winner
                    game.setDealerIndex(game.getPlayers().indexOf(roundWinner));
                    System.out.println("Dealer button passed to: " + roundWinner.getName());

                    // Start new round automatically after a delay
                    new java.util.Timer().schedule(new java.util.TimerTask() {
                        @Override
                        public void run() {
                            startNewRound(gameId);
                        }
                    }, 15000); // Start new round after 15 seconds
                }

                // Broadcast the game update with winner
                broadcastGameUpdate(gameId);
            }
        }
    }

    public int countDiceWithValue(List<Player> players, int faceValue, boolean wildOnes) {
        int count = 0;
        for (Player player : players) {
            for (int die : player.getDice()) {
                if (die == faceValue || (wildOnes && die == 1)) {
                    count++;
                }
            }
        }
        return count;
    }

    public boolean isBidValid(Bid newBid, Bid previousBid) {
        if (previousBid == null) {
            return true; // First bid is always valid
        }

        // New bid must either:
        // 1. Increase the quantity, OR
        // 2. Increase the face value while maintaining or increasing quantity
        return newBid.getQuantity() > previousBid.getQuantity() ||
               (newBid.getFaceValue() > previousBid.getFaceValue() && 
                newBid.getQuantity() >= previousBid.getQuantity());
    }

    public GameResult processDoubt(String gameId, String doubtingPlayerId) {
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new IllegalStateException("No current bid to doubt");
        }

        List<Player> activePlayers = game.getActivePlayers();
        // No wild cards - only count exact face value matches
        int actualCount = countDiceWithValue(activePlayers, currentBid.getFaceValue(), false);
        
        System.out.println("DOUBT: Player " + doubtingPlayerId + " doubted " +
                currentBid.getQuantity() + " " + currentBid.getFaceValue() + "s. " +
                "Actual count: " + actualCount);

        String eliminatedPlayerId;
        if (actualCount >= currentBid.getQuantity()) {
            // Bid was accurate or understated - doubter is eliminated
            eliminatedPlayerId = doubtingPlayerId;
        } else {
            // Bid was overstated - bidder is eliminated
            eliminatedPlayerId = currentBid.getPlayerId();
        }

        // Store previous round players before rerolling (deep copy) - only active
        // players
        List<Player> previousPlayers = new ArrayList<>();
        System.out.println("DEBUG: Active players before storing previousRoundPlayers:");
        for (Player player : activePlayers) {
            System.out.println("  Player " + player.getName() + " (ID: " + player.getId() + ") - Dice: "
                    + player.getDice() + " - Eliminated: " + player.isEliminated());
            Player copy = new Player(player.getName());
            copy.setId(player.getId());
            copy.setDice(new ArrayList<>(player.getDice())); // Copy dice values
            copy.setEliminated(player.isEliminated());
            copy.setWinTokens(player.getWinTokens());
            previousPlayers.add(copy);
        }
        System.out.println("DEBUG: Stored " + previousPlayers.size() + " players in previousRoundPlayers");
        game.setPreviousRoundPlayers(previousPlayers);

        // Store result data
        game.setLastActualCount(actualCount);
        game.setLastBidQuantity(currentBid.getQuantity());
        game.setLastBidFaceValue(currentBid.getFaceValue());
        game.setLastEliminatedPlayerId(eliminatedPlayerId);

        // Show all dice for 15 seconds
        System.out
                .println("🎲 DOUBT: Setting showAllDice=true for game " + gameId + " at " + System.currentTimeMillis());
        game.setShowAllDice(true);
        game.setCanContinue(false); // Disable continue button initially
        broadcastGameUpdate(gameId); // Broadcast dice reveal
        System.out.println("🎲 DOUBT: Broadcasted game update with showAllDice=true for game " + gameId);

        // Eliminate the player
        game.getEliminatedPlayers().add(eliminatedPlayerId);
        game.getPlayers().stream()
                .filter(p -> p.getId().equals(eliminatedPlayerId))
                .findFirst()
                .ifPresent(Player::eliminate);

        // Schedule to enable continue button after 15 seconds
        scheduleEnableContinue(gameId);

        // Reset the current bid after elimination
        game.setCurrentBid(null);

        // Always adjust current player index to skip eliminated players
        int attempts = 0;
        while (game.getEliminatedPlayers().contains(game.getCurrentPlayer().getId())
                && attempts < game.getPlayers().size()) {
            game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());
            attempts++;
        }

        // Check if round is over using centralized method
        checkAndHandleRoundEnd(gameId);

        // Dice will be hidden when continue is pressed, not automatically

        return new GameResult(game, eliminatedPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processSpotOn(String gameId, String spotOnPlayerId) {
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new IllegalStateException("No current bid to call spot on");
        }

        List<Player> activePlayers = game.getActivePlayers();
        // No wild cards - only count exact face value matches
        int actualCount = countDiceWithValue(activePlayers, currentBid.getFaceValue(), false);
        
        System.out.println("SPOT ON: Player " + spotOnPlayerId + " called spot on for " +
                currentBid.getQuantity() + " " + currentBid.getFaceValue() + "s. " +
                "Actual count: " + actualCount);

        if (actualCount == currentBid.getQuantity()) {
            // Store previous round players before rerolling (deep copy) - only active
            // players
            List<Player> previousPlayers = new ArrayList<>();
            for (Player player : activePlayers) {
                Player copy = new Player(player.getName());
                copy.setId(player.getId());
                copy.setDice(new ArrayList<>(player.getDice())); // Copy dice values
                copy.setEliminated(player.isEliminated());
                copy.setWinTokens(player.getWinTokens());
                previousPlayers.add(copy);
            }
            game.setPreviousRoundPlayers(previousPlayers);

            // Store result data
            game.setLastActualCount(actualCount);
            game.setLastBidQuantity(currentBid.getQuantity());
            game.setLastBidFaceValue(currentBid.getFaceValue());
            game.setLastEliminatedPlayerId(null); // No elimination for correct spot-on

            // Show all dice for 15 seconds
            System.out.println("🎲 SPOT_ON_CORRECT: Setting showAllDice=true for game " + gameId + " at "
                    + System.currentTimeMillis());
            game.setShowAllDice(true);
            game.setCanContinue(false); // Disable continue button initially
            broadcastGameUpdate(gameId); // Broadcast dice reveal
            System.out.println("🎲 SPOT_ON_CORRECT: Broadcasted game update with showAllDice=true for game " + gameId);
            
            // Spot on is correct - round resets with same players
            // Reset the current bid
            game.setCurrentBid(null);

            // Move to next player
            game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());

            // Schedule to enable continue button after 15 seconds
            scheduleEnableContinue(gameId);
        } else {
            // Store previous round players before rerolling (deep copy) - only active
            // players
            List<Player> previousPlayers = new ArrayList<>();
            for (Player player : activePlayers) {
                Player copy = new Player(player.getName());
                copy.setId(player.getId());
                copy.setDice(new ArrayList<>(player.getDice())); // Copy dice values
                copy.setEliminated(player.isEliminated());
                copy.setWinTokens(player.getWinTokens());
                previousPlayers.add(copy);
            }
            game.setPreviousRoundPlayers(previousPlayers);

            // Store result data
            game.setLastActualCount(actualCount);
            game.setLastBidQuantity(currentBid.getQuantity());
            game.setLastBidFaceValue(currentBid.getFaceValue());
            game.setLastEliminatedPlayerId(spotOnPlayerId);

            // Show all dice for 15 seconds
            System.out.println("🎲 SPOT_ON_WRONG: Setting showAllDice=true for game " + gameId + " at "
                    + System.currentTimeMillis());
            game.setShowAllDice(true);
            game.setCanContinue(false); // Disable continue button initially
            broadcastGameUpdate(gameId); // Broadcast dice reveal
            System.out.println("🎲 SPOT_ON_WRONG: Broadcasted game update with showAllDice=true for game " + gameId);

            // Spot on is wrong - spot on player is eliminated
            game.getEliminatedPlayers().add(spotOnPlayerId);
            game.getPlayers().stream()
                    .filter(p -> p.getId().equals(spotOnPlayerId))
                    .findFirst()
                    .ifPresent(Player::eliminate);

            // Schedule to enable continue button after 15 seconds
            scheduleEnableContinue(gameId);

            // Reset the current bid after elimination
            game.setCurrentBid(null);

            // Always adjust current player index to skip eliminated players
            int attempts = 0;
            while (game.getEliminatedPlayers().contains(game.getCurrentPlayer().getId())
                    && attempts < game.getPlayers().size()) {
                game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());
                attempts++;
            }

            // Check if round is over using centralized method
            checkAndHandleRoundEnd(gameId);
        }

        // Dice will be hidden when continue is pressed, not automatically

        return new GameResult(game, spotOnPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processBid(String gameId, String playerId, int quantity, int faceValue) {
        Game game = getGame(gameId);

        if (game.getState() != GameState.IN_PROGRESS) {
            throw new IllegalStateException("Game is not in progress. Current state: " + game.getState());
        }

        Player currentPlayer = game.getCurrentPlayer();
        if (currentPlayer == null) {
            throw new IllegalArgumentException("No current player found");
        }

        if (!currentPlayer.getId().equals(playerId)) {
            throw new IllegalArgumentException("It's not this player's turn. Current player: " + currentPlayer.getId()
                    + ", Requested player: " + playerId);
        }

        if (game.getEliminatedPlayers().contains(playerId)) {
            throw new IllegalArgumentException("Player is eliminated");
        }

        Bid newBid = new Bid(playerId, quantity, faceValue, BidType.RAISE);

        if (!isBidValid(newBid, game.getCurrentBid())) {
            String currentBidStr = game.getCurrentBid() != null
                    ? game.getCurrentBid().getQuantity() + " of " + game.getCurrentBid().getFaceValue()
                    : "none";
            throw new IllegalArgumentException("Invalid bid. Current bid: " + currentBidStr +
                    ", New bid: " + quantity + " of " + faceValue + ". Must increase quantity or face value");
        }

        // Store the current bid as previous before setting the new one
        game.setPreviousBid(game.getCurrentBid());
        game.setCurrentBid(newBid);

        // Move to next player
        int oldPlayerIndex = game.getCurrentPlayerIndex();
        game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());

        // Skip eliminated players - ensure we don't get stuck in infinite loop
        int attempts = 0;
        while (game.getEliminatedPlayers().contains(game.getCurrentPlayer().getId())
                && attempts < game.getPlayers().size()) {
            game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());
            attempts++;
        }

        System.out.println("TURN CHANGE: Player " + playerId + " made bid, moved from index " + oldPlayerIndex + " to "
                + game.getCurrentPlayerIndex() + ", current player: " + game.getCurrentPlayer().getId());

        // Check if round should end (in case current player advancement revealed round
        // is over)
        checkAndHandleRoundEnd(gameId);

        return new GameResult(game, null, 0, 0);
    }

    public static class GameResult {
        private final Game game;
        private final String eliminatedPlayerId;
        private final int actualCount;
        private final int bidQuantity;

        public GameResult(Game game, String eliminatedPlayerId, int actualCount, int bidQuantity) {
            this.game = game;
            this.eliminatedPlayerId = eliminatedPlayerId;
            this.actualCount = actualCount;
            this.bidQuantity = bidQuantity;
        }

        public Game getGame() { return game; }
        public String getEliminatedPlayerId() { return eliminatedPlayerId; }
        public int getActualCount() { return actualCount; }
        public int getBidQuantity() { return bidQuantity; }
    }

    // Multiplayer methods
    public Game createMultiplayerGame() {
        Game game = new Game();
        game.setMultiplayer(true);
        game.setMaxPlayers(6);
        game.setWaitingForPlayers(true);
        game.setState(GameState.WAITING_FOR_PLAYERS);
        games.put(game.getId(), game);
        return game;
    }

    public Game joinGame(String gameId, String playerName) {
        System.out.println("JOIN ATTEMPT: GameId=" + gameId + ", PlayerName=" + playerName + ", Timestamp="
                + System.currentTimeMillis());

        Game game = getGame(gameId);
        if (game == null) {
            System.out.println("JOIN FAILED: Game not found for ID=" + gameId);
            throw new IllegalArgumentException("Game not found");
        }
        if (!game.canJoin()) {
            System.out.println("JOIN FAILED: Cannot join game, current players=" + game.getPlayers().size() + ", max="
                    + game.getMaxPlayers());
            throw new IllegalArgumentException("Cannot join game");
        }

        // Check if player with this name already exists
        boolean playerExists = game.getPlayers().stream()
                .anyMatch(p -> p.getName().equals(playerName));

        if (playerExists) {
            System.out.println("JOIN FAILED: Player already exists with name=" + playerName);
            throw new IllegalArgumentException("Player with name '" + playerName + "' already exists in this game");
        }

        Player player = new Player(playerName);
        game.getPlayers().add(player);

        System.out.println("JOIN SUCCESS: Added player=" + playerName + ", total players=" + game.getPlayers().size());

        // Don't auto-start the game - let the host control when to start
        // The game will remain in WAITING_FOR_PLAYERS state until manually started

        return game;
    }

    public Game removePlayerFromGame(String gameId, String playerId) {
        System.out.println("REMOVE ATTEMPT: GameId=" + gameId + ", PlayerId=" + playerId + ", Timestamp="
                + System.currentTimeMillis());

        Game game = getGame(gameId);
        if (game == null) {
            System.out.println("REMOVE FAILED: Game not found for ID=" + gameId);
            throw new IllegalArgumentException("Game not found");
        }

        // Only allow removing players if game hasn't started yet
        if (game.getState() != GameState.WAITING_FOR_PLAYERS) {
            System.out.println("REMOVE FAILED: Cannot remove players after game has started");
            throw new IllegalArgumentException("Cannot remove players after game has started");
        }

        // Find and remove the player
        boolean playerRemoved = game.getPlayers().removeIf(p -> p.getId().equals(playerId));

        if (!playerRemoved) {
            System.out.println("REMOVE FAILED: Player not found with ID=" + playerId);
            throw new IllegalArgumentException("Player not found in game");
        }

        System.out.println("REMOVE SUCCESS: Removed player with ID=" + playerId + ", remaining players="
                + game.getPlayers().size());

        return game;
    }

    public void addPlayerToGame(String gameId, String playerName) {
        joinGame(gameId, playerName);
    }

    public void startMultiplayerGame(String gameId) {
        Game game = getGame(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        if (game.getPlayers().size() < 1) {
            throw new IllegalArgumentException("Not enough players to start game");
        }

        // Initialize all players
        for (Player player : game.getPlayers()) {
            player.reset();
            player.rollDice();
            System.out.println("GAME_START_DEBUG: Player " + player.getName() + " initialized with "
                    + player.getWinTokens() + " win tokens");
        }

        // Randomize starting player and dealer
        game.setCurrentPlayerIndex((int) (Math.random() * game.getPlayers().size()));
        game.setDealerIndex((int) (Math.random() * game.getPlayers().size()));

        game.setState(GameState.IN_PROGRESS);
        game.setWaitingForPlayers(false);
        game.setCurrentBid(null);
        game.setPreviousBid(null);
        game.setEliminatedPlayers(new ArrayList<>());
        game.setRoundNumber(1);

        // Ensure this is a multiplayer game
        game.setMultiplayer(true);
        game.setMaxPlayers(6);

        System.out.println(
                "START GAME COMPLETE: Game state=" + game.getState() + ", Players=" + game.getPlayers().size()
                        + ", isMultiplayer=" + game.isMultiplayer());
        broadcastGameUpdate(gameId); // Broadcast game started
    }

    public GameResponse getGameResponse(String gameId) {
        Game game = getGame(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        return new GameResponse(game);
    }

    // Broadcast updates for multiplayer
    public void broadcastGameUpdate(String gameId) {
        try {
            GameResponse gameResponse = getGameResponse(gameId);
            messagingTemplate.convertAndSend("/topic/game/" + gameId,
                    new WebSocketMessage("GAME_UPDATED", gameResponse, gameId, null));
        } catch (Exception e) {
            System.err.println("Error broadcasting game update: " + e.getMessage());
        }
    }

    // Override existing methods to broadcast updates
    public GameResult processBidWithBroadcast(String gameId, String playerId, int quantity, int faceValue) {
        GameResult result = processBid(gameId, playerId, quantity, faceValue);
        // WebSocket controller will handle broadcasting
        return result;
    }

    public GameResult processDoubtWithBroadcast(String gameId, String playerId) {
        GameResult result = processDoubt(gameId, playerId);
        // WebSocket controller will handle broadcasting
        return result;
    }

    public GameResult processSpotOnWithBroadcast(String gameId, String playerId) {
        GameResult result = processSpotOn(gameId, playerId);
        // WebSocket controller will handle broadcasting
        return result;
    }

    private void scheduleEnableContinue(String gameId) {
        // Enable continue button after 5 seconds
        System.out.println("⏰ SCHEDULE: Scheduling enableContinue for game " + gameId + " in 5 seconds at "
                + System.currentTimeMillis());
        new java.util.Timer().schedule(new java.util.TimerTask() {
            @Override
            public void run() {
                Game game = games.get(gameId);
                System.out.println(
                        "⏰ TIMER: EnableContinue timer fired for game " + gameId + " at " + System.currentTimeMillis()
                                + ", showAllDice=" + (game != null ? game.isShowAllDice() : "null"));
                if (game != null && game.isShowAllDice()) {
                    game.setCanContinue(true);
                    broadcastGameUpdate(gameId);
                    System.out.println("⏰ TIMER: Set canContinue=true and broadcasted for game " + gameId);
                }
            }
        }, 5000); // 5 seconds

        // Auto-continue after 15 seconds
        System.out.println("⏰ SCHEDULE: Scheduling auto-continue for game " + gameId + " in 15 seconds at "
                + System.currentTimeMillis());
        new java.util.Timer().schedule(new java.util.TimerTask() {
            @Override
            public void run() {
                Game game = games.get(gameId);
                System.out.println(
                        "⏰ TIMER: Auto-continue timer fired for game " + gameId + " at " + System.currentTimeMillis()
                                + ", showAllDice=" + (game != null ? game.isShowAllDice() : "null"));
                if (game != null && game.isShowAllDice()) {
                    System.out.println("⏰ TIMER: Auto-continuing game " + gameId);
                    continueGame(gameId);
                }
            }
        }, 15000); // 15 seconds
    }

    public void continueGame(String gameId) {
        Game game = games.get(gameId);
        System.out.println("🔄 CONTINUE: continueGame called for game " + gameId + " at " + System.currentTimeMillis()
                + ", showAllDice=" + (game != null ? game.isShowAllDice() : "null") + ", canContinue="
                + (game != null ? game.isCanContinue() : "null"));
        if (game != null && game.isShowAllDice() && game.isCanContinue()) {
            // Reroll dice for all remaining active players
            for (Player player : game.getActivePlayers()) {
                player.rollDice();
            }

            // Hide dice and reset continue state
            System.out.println(
                    "🔄 CONTINUE: Setting showAllDice=false for game " + gameId + " at " + System.currentTimeMillis());
            game.setShowAllDice(false);
            game.setCanContinue(false);
            broadcastGameUpdate(gameId);
            System.out.println("🔄 CONTINUE: Broadcasted game update with showAllDice=false for game " + gameId);
        } else {
            System.out.println("🔄 CONTINUE: Cannot continue game " + gameId + " - conditions not met");
        }
    }
}
