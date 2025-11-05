package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.dto.*;
import com.example.backend.exception.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {
    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final Set<String> processingAITurns = ConcurrentHashMap.newKeySet(); // Track games currently processing AI turns

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private EasyAIService easyAIService;

    @Autowired
    private MediumAIService mediumAIService;

    public Game createGame(List<String> playerNames) {
        if (playerNames == null || playerNames.size() < 3) {
            throw new InvalidPlayerActionException("Game requires at least 3 players");
        }

        List<Player> players = new ArrayList<>();
        for (int i = 0; i < playerNames.size(); i++) {
            String color = COLOR_ORDER[i % COLOR_ORDER.length];
            String name = playerNames.get(i);
            // Check if player name starts with "AI " for easy AI or "🧠AI " for medium AI
            String aiType = null;
            if (name.startsWith("🧠AI ")) {
                aiType = "MEDIUM_AI";
            } else if (name.startsWith("AI ")) {
                aiType = "EASY_AI";
            }
            System.out.println("Creating player " + name + " with color " + color + " (AI: " + aiType + ")");
            players.add(new Player(name, color, aiType));
        }

        Game game = new Game(players);
        
        // Roll initial dice for all players
        for (Player player : game.getPlayers()) {
            player.rollDice();
        }

        games.put(game.getId(), game);
        return game;
    }

    public Game createGame(List<CreateGameRequest.PlayerInfo> playerInfos, boolean usePlayerInfo) {
        if (playerInfos == null || playerInfos.size() < 3) {
            throw new InvalidPlayerActionException("Game requires at least 3 players");
        }

        List<Player> players = new ArrayList<>();
        for (int i = 0; i < playerInfos.size(); i++) {
            CreateGameRequest.PlayerInfo info = playerInfos.get(i);
            String color = COLOR_ORDER[i % COLOR_ORDER.length];
            System.out.println("Creating player " + info.getName() + " with color " + color + 
                " (AI: " + info.isAI() + ", type: " + info.getAiType() + ")");
            players.add(new Player(info.getName(), color, info.getAiType()));
        }

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
            throw new GameNotFoundException("Game not found: " + gameId);
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

        // Reset all players for new round (but keep win tokens)
        for (Player player : game.getPlayers()) {
            player.reset();
            player.rollDice();
        }
        
        // Reset game state
        game.setEliminatedPlayers(new ArrayList<>());
        // Always start round with dealer
        if (game.getDealerIndex() < game.getPlayers().size()) {
            game.setCurrentPlayerIndex(game.getDealerIndex());
        }
        game.setCurrentBid(null);
        game.setPreviousBid(null);
        game.setWinner(null);
        game.setState(GameState.IN_PROGRESS);
        game.setRoundNumber(game.getRoundNumber() + 1);
        game.setTwoPlayerRoundStartIndex(null);

        System.out.println("New round started. State: " + game.getState() + ", Current player: "
                + game.getCurrentPlayer().getName());
    }

    // Use GameRules for bid validation and dice counting

    public GameResult processDoubt(String gameId, String doubtingPlayerId) {
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new InvalidGameStateException("No current bid to doubt");
        }

        List<Player> activePlayers = game.getActivePlayers();
        // No wild cards - only count exact face value matches
        int actualCount = com.example.backend.model.GameRules.countDiceWithValue(activePlayers,
                currentBid.getFaceValue(), false);
        
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

        // Store previous round players before rerolling (deep copy)
        List<Player> previousPlayers = new ArrayList<>();
        for (Player player : game.getPlayers()) {
            Player copy = new Player(player.getName(), "");
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
        game.setLastEliminatedPlayerId(eliminatedPlayerId);
    game.setLastActionPlayerId(doubtingPlayerId);
    game.setLastActionType(BidType.DOUBT);
    
        // Add the DOUBT action to current hand history
        Bid doubtAction = new Bid(doubtingPlayerId, 0, 0, BidType.DOUBT);
        game.addBidToCurrentHand(doubtAction);
        System.out.println("📝 Added DOUBT action to history. Current hand history size: " + game.getCurrentHandBidHistory().size());

        // Show all dice for 15 seconds
        System.out
                .println("🎲 DOUBT: Setting showAllDice=true for game " + gameId + " at " + System.currentTimeMillis());
        game.setShowAllDice(true);
        game.setCanContinue(false); // Disable continue button initially
        broadcastGameUpdate(gameId); // Broadcast dice reveal
        System.out.println("🎲 DOUBT: Broadcasted game update with showAllDice=true for game " + gameId);

        // Eliminate the player
    game.eliminatePlayer(eliminatedPlayerId);

        // Schedule to enable continue button after 15 seconds
        scheduleEnableContinue(gameId);

        // Reset the current bid after elimination
        game.setCurrentBid(null);

        // After elimination, the turn should start with the dealer or next non-eliminated player after dealer
        int dealerIndex = game.getDealerIndex();
        int attempts = 0;
        int nextIndex = dealerIndex;
        
        // Find the next non-eliminated player starting from the dealer
        while (game.getEliminatedPlayers().contains(game.getPlayers().get(nextIndex).getId())
                && attempts < game.getPlayers().size()) {
            nextIndex = (nextIndex + 1) % game.getPlayers().size();
            attempts++;
        }
        game.setCurrentPlayerIndex(nextIndex);

        // If elimination resulted in 2 active players, set the start index for the
        // 2-player phase
        if (game.getActivePlayers().size() == 2 && game.getTwoPlayerRoundStartIndex() == null) {
            // If eliminated player had the dealer button, the next non-eliminated after
            // them starts
            int startIndex;
            int eliminatedIndex = -1;
            for (int i = 0; i < game.getPlayers().size(); i++) {
                if (game.getPlayers().get(i).getId().equals(eliminatedPlayerId)) {
                    eliminatedIndex = i;
                    break;
                }
            }
            if (eliminatedIndex == game.getDealerIndex()) {
                // Find next non-eliminated player after the eliminated dealer
                int idx = (eliminatedIndex + 1) % game.getPlayers().size();
                int attempts2 = 0;
                while (game.getEliminatedPlayers().contains(game.getPlayers().get(idx).getId())
                        && attempts2 < game.getPlayers().size()) {
                    idx = (idx + 1) % game.getPlayers().size();
                    attempts2++;
                }
                startIndex = idx;
            } else {
                // Otherwise, keep the current player as the one to start the 2-player phase
                startIndex = game.getCurrentPlayerIndex();
            }
            game.setTwoPlayerRoundStartIndex(startIndex);
        }

        // Check if round is over
        if (game.getActivePlayers().size() <= 1) {
            if (game.getActivePlayers().size() == 1) {
                Player roundWinner = game.getActivePlayers().get(0);
                game.setWinner(roundWinner.getId());
                boolean gameEnded = game.addRoundWinner(roundWinner.getId());
                if (gameEnded) {
                    System.out.println("Game ended! Winner: " + roundWinner.getName() + " with "
                            + roundWinner.getWinTokens() + " tokens");
                } else {
                    game.passDealerToWinner(roundWinner.getId());
                    System.out.println("Dealer button passed to: " + roundWinner.getName());
                    System.out.println("Starting new round automatically. Winner: " + roundWinner.getName() + " with "
                            + roundWinner.getWinTokens() + " tokens");
                    new java.util.Timer().schedule(new java.util.TimerTask() {
                        @Override
                        public void run() {
                            startNewRound(gameId);
                        }
                    }, 6000); // Start new round after 15 seconds
                }
            }
        }

        // Dice will be hidden when continue is pressed, not automatically

        return new GameResult(game, eliminatedPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processSpotOn(String gameId, String spotOnPlayerId) {
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new InvalidGameStateException("No current bid to call spot on");
        }

        List<Player> activePlayers = game.getActivePlayers();
        // No wild cards - only count exact face value matches
        int actualCount = com.example.backend.model.GameRules.countDiceWithValue(activePlayers,
                currentBid.getFaceValue(), false);
        
        System.out.println("SPOT ON: Player " + spotOnPlayerId + " called spot on for " +
                currentBid.getQuantity() + " " + currentBid.getFaceValue() + "s. " +
                "Actual count: " + actualCount);

    if (actualCount == currentBid.getQuantity()) {
            // Store previous round players before rerolling (deep copy)
            List<Player> previousPlayers = new ArrayList<>();
            for (Player player : game.getPlayers()) {
                Player copy = new Player(player.getName(), "");
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
            game.setLastActionPlayerId(spotOnPlayerId);
            game.setLastActionType(BidType.SPOT_ON);
            
            // Add the SPOT_ON action to current hand history
            Bid spotOnAction = new Bid(spotOnPlayerId, 0, 0, BidType.SPOT_ON);
            game.addBidToCurrentHand(spotOnAction);
            System.out.println("📝 Added SPOT_ON (correct) action to history. Current hand history size: " + game.getCurrentHandBidHistory().size());

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

            // After a correct spot-on, start with the dealer
            int dealerIndex = game.getDealerIndex();
            int attempts = 0;
            int nextIndex = dealerIndex;
            
            // Find the next non-eliminated player starting from the dealer
            while (game.getEliminatedPlayers().contains(game.getPlayers().get(nextIndex).getId())
                    && attempts < game.getPlayers().size()) {
                nextIndex = (nextIndex + 1) % game.getPlayers().size();
                attempts++;
            }
            game.setCurrentPlayerIndex(nextIndex);

            // Schedule to enable continue button after 15 seconds
            scheduleEnableContinue(gameId);
        } else {
            // Store previous round players before rerolling (deep copy)
            List<Player> previousPlayers = new ArrayList<>();
            for (Player player : game.getPlayers()) {
                Player copy = new Player(player.getName(), "");
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
            game.setLastActionPlayerId(spotOnPlayerId);
            game.setLastActionType(BidType.SPOT_ON);
            
            // Add the SPOT_ON action to current hand history
            Bid spotOnAction = new Bid(spotOnPlayerId, 0, 0, BidType.SPOT_ON);
            game.addBidToCurrentHand(spotOnAction);
            System.out.println("📝 Added SPOT_ON (wrong) action to history. Current hand history size: " + game.getCurrentHandBidHistory().size());

            // Show all dice for 15 seconds
            System.out.println("🎲 SPOT_ON_WRONG: Setting showAllDice=true for game " + gameId + " at "
                    + System.currentTimeMillis());
            game.setShowAllDice(true);
            game.setCanContinue(false); // Disable continue button initially
            broadcastGameUpdate(gameId); // Broadcast dice reveal
            System.out.println("🎲 SPOT_ON_WRONG: Broadcasted game update with showAllDice=true for game " + gameId);

            // Spot on is wrong - spot on player is eliminated
        game.eliminatePlayer(spotOnPlayerId);

            // Schedule to enable continue button after 15 seconds
            scheduleEnableContinue(gameId);

            // Reset the current bid after elimination
            game.setCurrentBid(null);

            // After elimination, the turn should start with the dealer or next non-eliminated player after dealer
            int dealerIndex = game.getDealerIndex();
            int attempts = 0;
            int nextIndex = dealerIndex;
            
            // Find the next non-eliminated player starting from the dealer
            while (game.getEliminatedPlayers().contains(game.getPlayers().get(nextIndex).getId())
                    && attempts < game.getPlayers().size()) {
                nextIndex = (nextIndex + 1) % game.getPlayers().size();
                attempts++;
            }
            game.setCurrentPlayerIndex(nextIndex);

            // If elimination resulted in 2 active players, set the start index for the
            // 2-player phase
            if (game.getActivePlayers().size() == 2 && game.getTwoPlayerRoundStartIndex() == null) {
                int startIndex;
                int eliminatedIndex = -1;
                for (int i = 0; i < game.getPlayers().size(); i++) {
                    if (game.getPlayers().get(i).getId().equals(spotOnPlayerId)) {
                        eliminatedIndex = i;
                        break;
                    }
                }
                if (eliminatedIndex == game.getDealerIndex()) {
                    // Find next non-eliminated player after the eliminated dealer
                    int idx = (eliminatedIndex + 1) % game.getPlayers().size();
                    int attempts2 = 0;
                    while (game.getEliminatedPlayers().contains(game.getPlayers().get(idx).getId())
                            && attempts2 < game.getPlayers().size()) {
                        idx = (idx + 1) % game.getPlayers().size();
                        attempts2++;
                    }
                    startIndex = idx;
                } else {
                    // Otherwise, keep the current player as the one to start the 2-player phase
                    startIndex = game.getCurrentPlayerIndex();
                }
                game.setTwoPlayerRoundStartIndex(startIndex);
            }

            // Check if round is over
            if (game.getActivePlayers().size() <= 1) {
                if (game.getActivePlayers().size() == 1) {
                    Player roundWinner = game.getActivePlayers().get(0);
                    game.setWinner(roundWinner.getId());
                    boolean gameEnded = game.addRoundWinner(roundWinner.getId());
                    if (gameEnded) {
                        // Game ended, nothing more to do
                    } else {
                        game.passDealerToWinner(roundWinner.getId());
                        System.out.println("Dealer button passed to: " + roundWinner.getName());
                        new java.util.Timer().schedule(new java.util.TimerTask() {
                            @Override
                            public void run() {
                                startNewRound(gameId);
                            }
                        }, 6000); // Start new round after 15 seconds
                    }
                }
            }
        }

        // Dice will be hidden when continue is pressed, not automatically

        return new GameResult(game, spotOnPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processBid(String gameId, String playerId, int quantity, int faceValue) {
        Game game = getGame(gameId);

        if (game.getState() != GameState.IN_PROGRESS) {
            throw new InvalidGameStateException("Game is not in progress. Current state: " + game.getState());
        }

        Player currentPlayer = game.getCurrentPlayer();
        if (currentPlayer == null) {
            throw new InvalidGameStateException("No current player found");
        }

        if (!currentPlayer.getId().equals(playerId)) {
            throw new InvalidPlayerActionException("It's not this player's turn. Current player: " + currentPlayer.getId()
                    + ", Requested player: " + playerId);
        }

        if (game.getEliminatedPlayers().contains(playerId)) {
            throw new InvalidPlayerActionException("Player is eliminated");
        }

        Bid newBid = new Bid(playerId, quantity, faceValue, BidType.RAISE);

        if (!com.example.backend.model.GameRules.isBidValid(newBid, game.getCurrentBid())) {
            String currentBidStr = game.getCurrentBid() != null
                    ? game.getCurrentBid().getQuantity() + " of " + game.getCurrentBid().getFaceValue()
                    : "none";
            throw new InvalidPlayerActionException("Invalid bid. Current bid: " + currentBidStr +
                    ", New bid: " + quantity + " of " + faceValue + ". Must increase quantity or face value");
        }

        // Store the current bid as previous before setting the new one
        game.setPreviousBid(game.getCurrentBid());
        game.setCurrentBid(newBid);
        
        // Add the bid to the current hand history
        game.addBidToCurrentHand(newBid);
        System.out.println("📝 Added RAISE action to history. Current hand history size: " + game.getCurrentHandBidHistory().size());

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

    private static final String[] COLOR_ORDER = {"blue", "red", "green", "yellow", "brown", "cyan"};

    private String getNextColor(Game game) {
        int currentPlayerCount = game.getPlayers().size();
        return COLOR_ORDER[currentPlayerCount % COLOR_ORDER.length];
    }

    public Game joinGame(String gameId, String playerName) {
        System.out.println("JOIN ATTEMPT: GameId=" + gameId + ", PlayerName=" + playerName + ", Timestamp="
                + System.currentTimeMillis());

        Game game = getGame(gameId);
        if (game == null) {
            System.out.println("JOIN FAILED: Game not found for ID=" + gameId);
            throw new GameNotFoundException("Game not found");
        }
        if (!game.canJoin()) {
            System.out.println("JOIN FAILED: Cannot join game, current players=" + game.getPlayers().size() + ", max="
                    + game.getMaxPlayers());
            throw new InvalidPlayerActionException("Cannot join game");
        }

        // Check if player with this name already exists
        boolean playerExists = game.getPlayers().stream()
                .anyMatch(p -> p.getName().equals(playerName));

        if (playerExists) {
            System.out.println("JOIN FAILED: Player already exists with name=" + playerName);
            throw new InvalidPlayerActionException("Player with name '" + playerName + "' already exists in this game");
        }

        String color = getNextColor(game);
        // Check if player name starts with "🧠AI " for medium AI, or "AI " for easy AI
        String aiType = null;
        if (playerName.startsWith("🧠AI ")) {
            aiType = "MEDIUM_AI";
        } else if (playerName.startsWith("AI ")) {
            aiType = "EASY_AI";
        }
        System.out.println("Assigning color " + color + " to player " + playerName + " (AI: " + aiType + ")");
        
        Player player = new Player(playerName, color, aiType);
        game.getPlayers().add(player);

        System.out.println("JOIN SUCCESS: Added player=" + playerName + ", total players=" + game.getPlayers().size() + ", isAI=" + (aiType != null));

        // Don't auto-start the game - let the host control when to start
        // The game will remain in WAITING_FOR_PLAYERS state until manually started

        return game;
    }

    public void addPlayerToGame(String gameId, String playerName) {
        joinGame(gameId, playerName);
    }

    public Game removePlayer(String gameId, String playerId) {
        System.out.println("REMOVE ATTEMPT: GameId=" + gameId + ", PlayerId=" + playerId + ", Timestamp="
                + System.currentTimeMillis());

        Game game = getGame(gameId);
        if (game == null) {
            System.out.println("REMOVE FAILED: Game not found for ID=" + gameId);
            throw new GameNotFoundException("Game not found");
        }

        // Only allow removing players before game starts
        if (game.getState() != GameState.WAITING_FOR_PLAYERS) {
            System.out.println("REMOVE FAILED: Game already started, state=" + game.getState());
            throw new InvalidGameStateException("Cannot remove player after game has started");
        }

        // Find and remove the player
        boolean removed = game.getPlayers().removeIf(p -> p.getId().equals(playerId));

        if (!removed) {
            System.out.println("REMOVE FAILED: Player not found with ID=" + playerId);
            throw new InvalidPlayerActionException("Player not found");
        }

        System.out.println("REMOVE SUCCESS: Removed player with ID=" + playerId + ", remaining players=" + game.getPlayers().size());

        return game;
    }

    public void startMultiplayerGame(String gameId) {
        Game game = getGame(gameId);
        if (game == null) {
            throw new GameNotFoundException("Game not found");
        }
        // Require at least 2 players to start a multiplayer game
        if (game.getPlayers().size() < 2) {
            throw new InvalidGameStateException("Not enough players to start game. Minimum 2 players required");
        }

        // Initialize all players
        for (Player player : game.getPlayers()) {
            player.reset();
            player.rollDice();
        }

        // Randomize dealer, and always start with dealer as current player
        int dealerIdx = (int) (Math.random() * game.getPlayers().size());
        game.setDealerIndex(dealerIdx);
        game.setCurrentPlayerIndex(dealerIdx);

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
            throw new GameNotFoundException("Game not found");
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
        }, 6000); // 15 seconds
    }

    public void continueGame(String gameId) {
        Game game = games.get(gameId);
        System.out.println("🔄 CONTINUE: continueGame called for game " + gameId + " at " + System.currentTimeMillis()
                + ", showAllDice=" + (game != null ? game.isShowAllDice() : "null") + ", canContinue="
                + (game != null ? game.isCanContinue() : "null"));
        if (game != null && game.isShowAllDice() && game.isCanContinue()) {
            // Clear the bid history for the new hand
            game.clearCurrentHandBidHistory();
            System.out.println("🔄 CONTINUE: Cleared current hand bid history for new hand");
            
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

    /**
     * Scheduled task to process AI turns
     * Runs every 500ms to check if any AI player needs to make a move
     */
    @Scheduled(fixedDelay = 500)
    public void processAITurns() {
        if (games.isEmpty()) {
            return; // No games to process
        }
        
        for (Game game : games.values()) {
            // Skip if game is not in progress
            if (game.getState() != GameState.IN_PROGRESS) {
                continue;
            }

            // Skip if showing all dice (round ended)
            if (game.isShowAllDice()) {
                continue;
            }

            // Skip if already processing this game's AI turn
            String gameId = game.getId();
            if (processingAITurns.contains(gameId)) {
                continue;
            }

            // Check if current player is AI
            Player currentPlayer = game.getCurrentPlayer();
            if (currentPlayer == null) {
                continue;
            }
            
            if (!currentPlayer.isAI()) {
                continue;
            }

            System.out.println("🤖 AI DETECTION: Found AI player " + currentPlayer.getName() + 
                " (ID: " + currentPlayer.getId() + ", aiType: " + currentPlayer.getAiType() + 
                ") in game " + gameId);

            // Check if AI can act (use appropriate service based on AI type)
            boolean canAct = "MEDIUM_AI".equals(currentPlayer.getAiType())
                ? mediumAIService.canAIAct(gameId, game.getRoundNumber(), currentPlayer.getId())
                : easyAIService.canAIAct(gameId, game.getRoundNumber(), currentPlayer.getId());
            
            if (!canAct) {
                System.out.println("🤖 AI SKIP: AI " + currentPlayer.getName() + " already acted this turn");
                continue;
            }

            // Check if delay after round end has passed
            boolean canActAfterRound = "MEDIUM_AI".equals(currentPlayer.getAiType())
                ? mediumAIService.canActAfterRoundEnd(gameId, game.isShowAllDice())
                : easyAIService.canActAfterRoundEnd(gameId, game.isShowAllDice());
            
            if (!canActAfterRound) {
                System.out.println("🤖 AI SKIP: AI " + currentPlayer.getName() + " waiting for round end delay");
                continue;
            }

            // Mark as processing to prevent concurrent execution
            processingAITurns.add(gameId);

            System.out.println("🤖 AI START: Starting AI turn for " + currentPlayer.getName());

            // Process AI turn asynchronously
            new Thread(() -> {
                try {
                    executeAITurn(game, currentPlayer);
                } catch (Exception e) {
                    System.err.println("Error processing AI turn for game " + gameId + ": " + e.getMessage());
                    e.printStackTrace();
                } finally {
                    processingAITurns.remove(gameId);
                }
            }).start();
        }
    }

    /**
     * Execute an AI player's turn
     */
    private void executeAITurn(Game game, Player aiPlayer) {
        String gameId = game.getId();
        String aiType = aiPlayer.getAiType();
        boolean isMediumAI = "MEDIUM_AI".equals(aiType);
        
        System.out.println("🤖 " + (isMediumAI ? "Medium" : "Easy") + " AI " + aiPlayer.getName() + " is thinking...");

        // Mark that AI is acting (use appropriate service)
        if (isMediumAI) {
            mediumAIService.markAIAction(gameId, game.getRoundNumber(), aiPlayer.getId());
        } else {
            easyAIService.markAIAction(gameId, game.getRoundNumber(), aiPlayer.getId());
        }

        try {
            // Simulate thinking delay
            long thinkingDelay = isMediumAI ? mediumAIService.getThinkingDelay() : easyAIService.getThinkingDelay();
            Thread.sleep(thinkingDelay);

            // Generate AI action (use appropriate service and method)
            Object actionObj;
            if (isMediumAI) {
                actionObj = mediumAIService.generateEducatedAction(game, aiPlayer);
            } else {
                actionObj = easyAIService.generateRandomAction(
                    game.getCurrentBid(),
                    game.getPlayers().size(),
                    game.getRoundNumber()
                );
            }
            
            // Both services use same AIAction class structure
            String actionType;
            Integer quantity = null;
            Integer faceValue = null;
            
            if (isMediumAI) {
                MediumAIService.AIAction medAction = (MediumAIService.AIAction) actionObj;
                actionType = medAction.getAction();
                quantity = medAction.getQuantity();
                faceValue = medAction.getFaceValue();
            } else {
                EasyAIService.AIAction easyAction = (EasyAIService.AIAction) actionObj;
                actionType = easyAction.getAction();
                quantity = easyAction.getQuantity();
                faceValue = easyAction.getFaceValue();
            }

            System.out.println("🤖 " + (isMediumAI ? "Medium" : "Easy") + " AI " + aiPlayer.getName() + " chooses: " + actionType);

            // Execute the action
            switch (actionType) {
                case "bid":
                    processBid(gameId, aiPlayer.getId(), quantity, faceValue);
                    broadcastGameUpdate(gameId);
                    break;
                case "doubt":
                    processDoubt(gameId, aiPlayer.getId());
                    broadcastGameUpdate(gameId);
                    break;
                case "spotOn":
                    processSpotOn(gameId, aiPlayer.getId());
                    broadcastGameUpdate(gameId);
                    break;
                default:
                    System.err.println("Unknown AI action: " + actionType);
            }
            
            System.out.println("🤖 AI DONE: " + aiPlayer.getName() + " completed " + actionType);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.err.println("AI turn interrupted for " + aiPlayer.getName());
        } catch (Exception e) {
            System.err.println("Error executing AI turn: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
