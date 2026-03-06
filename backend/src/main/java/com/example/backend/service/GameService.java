package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.dto.*;
import com.example.backend.repository.mongo.GameDocument;
import com.example.backend.repository.mongo.GameMongoRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {
    private static final long RECONNECT_TIMEOUT_MS = 300_000; // 5 minutes for current player to reconnect
    private static final long HOST_INACTIVITY_TIMEOUT_MS = 3 * 60 * 60 * 1000L; // 3 hours for host when game has started

    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final Set<String> processingAITurns = ConcurrentHashMap.newKeySet(); // Track games currently processing AI
                                                                                 // turns
    /** Last activity timestamp (gameId:playerId -> epoch ms) for disconnect/reconnect timeout */
    private final Map<String, Long> lastActivityByGameAndPlayer = new ConcurrentHashMap<>();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GameMongoRepository gameMongoRepository;

    @Autowired
    private EasyAIService easyAIService;

    @Autowired
    private MediumAIService mediumAIService;

    /**
     * On startup, remove all persisted games from the database.
     * This ensures that when a new version of the application is published,
     * stale games from previous versions are cleaned up.
     */
    @PostConstruct
    public void clearGamesOnStartup() {
        gameMongoRepository.deleteAll();
        System.out.println("STARTUP: Cleared all persisted games from database");
    }

    public Game createGame(List<String> playerNames) {
        if (playerNames == null || playerNames.size() < 3) {
            throw new IllegalArgumentException("Game requires at least 3 players");
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
        gameMongoRepository.save(new GameDocument(game));
        return game;
    }

    public Game createGame(List<CreateGameRequest.PlayerInfo> playerInfos, boolean usePlayerInfo) {
        if (playerInfos == null || playerInfos.size() < 3) {
            throw new IllegalArgumentException("Game requires at least 3 players");
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
        gameMongoRepository.save(new GameDocument(game));
        return game;
    }

    public Game getGame(String gameId) {
        Game game = games.get(gameId);
        if (game != null) {
            return game;
        }

        return gameMongoRepository.findById(gameId)
                .map(GameDocument::getGame)
                .map(loaded -> {
                    games.put(gameId, loaded);
                    return loaded;
                })
                .orElseThrow(() -> new IllegalArgumentException("Game not found: " + gameId));
    }

    public List<Game> getAllGames() {
        List<Game> inMemory = new ArrayList<>(games.values());
        if (!inMemory.isEmpty()) {
            return inMemory;
        }
        return gameMongoRepository.findAll().stream()
                .map(GameDocument::getGame)
                .toList();
    }

    public void startNewRound(String gameId) {
        Game game = getGame(gameId);
        System.out.println("🔄 NEW_ROUND: startNewRound called for game " + gameId + " at " + System.currentTimeMillis()
                + ", showAllDice=" + (game != null ? game.isShowAllDice() : "null"));
        
        // Game may have been removed (e.g. last players left)
        if (game == null) {
            System.out.println("NEW_ROUND: Game " + gameId + " no longer exists, skipping");
            return;
        }

        if (game.hasGameWinner()) {
            System.out.println("Game already has winner, not starting new round");
            return; // Don't start new round if game is over
        }

        System.out.println("Starting new round " + (game.getRoundNumber() + 1) + " for game " + gameId);

        // Round reset: bring everyone back. Elimination is per-round only.
        game.getEliminatedPlayers().clear();
        for (Player player : game.getPlayers()) {
            player.reset();
            player.rollDice();
        }

        // Randomize starting player from all players
        if (!game.getPlayers().isEmpty()) {
            Player randomPlayer = game.getPlayers().get((int) (Math.random() * game.getPlayers().size()));
            game.setCurrentPlayerIndex(game.getPlayers().indexOf(randomPlayer));
        }
        game.setCurrentBid(null);
        game.setPreviousBid(null);
        game.setWinner(null);
        game.setState(GameState.IN_PROGRESS);
        game.setRoundNumber(game.getRoundNumber() + 1);
        game.setTwoPlayerRoundStartIndex(null);
        game.setShowAllDice(false);
        game.clearCurrentHandBidHistory();

        Player newCurrent = game.getCurrentPlayer();
        if (newCurrent != null) recordActivity(gameId, newCurrent.getId());
        System.out.println("New round started. State: " + game.getState() + ", Current player: "
                + (newCurrent != null ? newCurrent.getName() : "none"));
    }

    // Use GameRules for bid validation and dice counting

    public GameResult processDoubt(String gameId, String doubtingPlayerId) {
        recordActivity(gameId, doubtingPlayerId);
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new IllegalStateException("No current bid to doubt");
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

        // Store previous round players before rerolling (deep copy) - only active
        // players
        List<Player> previousPlayers = new ArrayList<>();
        for (Player player : activePlayers) {
            Player copy = new Player(player.getName());
            copy.setId(player.getId());
            copy.setDice(new ArrayList<>(player.getDice())); // Copy dice values
            copy.setEliminated(player.isEliminated());
            copy.setWinTokens(player.getWinTokens());
            copy.setColor(player.getColor()); // Copy color so it's available even if player leaves
            copy.setAiType(player.getAiType()); // Copy aiType for completeness
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
        System.out.println("📝 Added DOUBT action to history. Current hand history size: "
                + game.getCurrentHandBidHistory().size());

        // Show all dice for 15 seconds
        System.out
                .println("🎲 DOUBT: Setting showAllDice=true for game " + gameId + " at " + System.currentTimeMillis());
        game.setShowAllDice(true);
        game.setCanContinue(false); // Disable continue button initially
        broadcastGameUpdate(gameId); // Broadcast dice reveal
        System.out.println("🎲 DOUBT: Broadcasted game update with showAllDice=true for game " + gameId);

        // Eliminate the player
        game.eliminatePlayer(eliminatedPlayerId);

        // Reset the current bid after elimination
        game.setCurrentBid(null);

        // After elimination, the turn should start with the dealer or next
        // non-eliminated player after dealer
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
        List<Player> activeAfterElimination = game.getActivePlayers();
        if (activeAfterElimination.size() == 2 && game.getTwoPlayerRoundStartIndex() == null) {
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

        // If one player left, they win the round; finish round and schedule next. Otherwise enable continue.
        if (activeAfterElimination.size() == 1) {
            Player roundWinner = activeAfterElimination.get(0);
            finishRoundWithOneWinner(game, gameId, roundWinner);
        } else {
            scheduleEnableContinue(gameId);
        }

        return new GameResult(game, eliminatedPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processSpotOn(String gameId, String spotOnPlayerId) {
        recordActivity(gameId, spotOnPlayerId);
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new IllegalStateException("No current bid to call spot on");
        }

        List<Player> activePlayers = game.getActivePlayers();
        // No wild cards - only count exact face value matches
        int actualCount = com.example.backend.model.GameRules.countDiceWithValue(activePlayers,
                currentBid.getFaceValue(), false);
        
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
                copy.setColor(player.getColor()); // Copy color so it's available even if player leaves
                copy.setAiType(player.getAiType()); // Copy aiType for completeness
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
            System.out.println("📝 Added SPOT_ON (correct) action to history. Current hand history size: "
                    + game.getCurrentHandBidHistory().size());

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
            // Store previous round players before rerolling (deep copy) - only active
            // players
            List<Player> previousPlayers = new ArrayList<>();
            for (Player player : activePlayers) {
                Player copy = new Player(player.getName());
                copy.setId(player.getId());
                copy.setDice(new ArrayList<>(player.getDice())); // Copy dice values
                copy.setEliminated(player.isEliminated());
                copy.setWinTokens(player.getWinTokens());
                copy.setColor(player.getColor()); // Copy color so it's available even if player leaves
                copy.setAiType(player.getAiType()); // Copy aiType for completeness
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
            System.out.println("📝 Added SPOT_ON (wrong) action to history. Current hand history size: "
                    + game.getCurrentHandBidHistory().size());

            // Show all dice for 15 seconds
            System.out.println("🎲 SPOT_ON_WRONG: Setting showAllDice=true for game " + gameId + " at "
                    + System.currentTimeMillis());
            game.setShowAllDice(true);
            game.setCanContinue(false); // Disable continue button initially
            broadcastGameUpdate(gameId); // Broadcast dice reveal
            System.out.println("🎲 SPOT_ON_WRONG: Broadcasted game update with showAllDice=true for game " + gameId);

            // Spot on is wrong - spot on player is eliminated
            game.eliminatePlayer(spotOnPlayerId);

            // Reset the current bid after elimination
            game.setCurrentBid(null);

            // After elimination, the turn should start with the dealer or next
            // non-eliminated player after dealer
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
            List<Player> activeAfterElimination = game.getActivePlayers();
            if (activeAfterElimination.size() == 2 && game.getTwoPlayerRoundStartIndex() == null) {
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

            // If one player left, they win the round; finish round and schedule next. Otherwise enable continue.
            if (activeAfterElimination.size() == 1) {
                Player roundWinner = activeAfterElimination.get(0);
                finishRoundWithOneWinner(game, gameId, roundWinner);
            } else {
                scheduleEnableContinue(gameId);
            }
        }

        // Dice will be hidden when continue is pressed, not automatically

        return new GameResult(game, spotOnPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processBid(String gameId, String playerId, int quantity, int faceValue) {
        recordActivity(gameId, playerId);
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

        if (!com.example.backend.model.GameRules.isBidValid(newBid, game.getCurrentBid())) {
            String currentBidStr = game.getCurrentBid() != null
                    ? game.getCurrentBid().getQuantity() + " of " + game.getCurrentBid().getFaceValue()
                    : "none";
            throw new IllegalArgumentException("Invalid bid. Current bid: " + currentBidStr +
                    ", New bid: " + quantity + " of " + faceValue + ". Must increase quantity or face value");
        }

        // Store the current bid as previous before setting the new one
        game.setPreviousBid(game.getCurrentBid());
        game.setCurrentBid(newBid);

        // Add the bid to the current hand history
        game.addBidToCurrentHand(newBid);
        System.out.println("📝 Added RAISE action to history. Current hand history size: "
                + game.getCurrentHandBidHistory().size());

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
    public Game createMultiplayerGame(boolean isPrivate) {
        Game game = new Game();
        game.setMultiplayer(true);
        game.setPrivate(isPrivate);
        game.setMaxPlayers(6);
        game.setWaitingForPlayers(true);
        game.setState(GameState.WAITING_FOR_PLAYERS);
        games.put(game.getId(), game);
        return game;
    }

    public List<Game> listMultiplayerLobbyGames() {
        List<Game> all = new ArrayList<>(games.values());
        return all.stream()
                .filter(g -> g.isMultiplayer())
                .filter(g -> g.getState() == GameState.WAITING_FOR_PLAYERS)
                .filter(g -> !g.isPrivate())
                .toList();
    }

    private static final String[] COLOR_ORDER = { "blue", "red", "green", "yellow", "brown", "cyan" };

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

        System.out.println("JOIN SUCCESS: Added player=" + playerName + ", total players=" + game.getPlayers().size()
                + ", isAI=" + (aiType != null));

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
            throw new IllegalArgumentException("Game not found");
        }

        // Only allow removing players before game starts
        if (game.getState() != GameState.WAITING_FOR_PLAYERS) {
            System.out.println("REMOVE FAILED: Game already started, state=" + game.getState());
            throw new IllegalArgumentException("Cannot remove player after game has started");
        }

        // Find and remove the player
        boolean removed = game.getPlayers().removeIf(p -> p.getId().equals(playerId));

        if (!removed) {
            System.out.println("REMOVE FAILED: Player not found with ID=" + playerId);
            throw new IllegalArgumentException("Player not found");
        }

        System.out.println("REMOVE SUCCESS: Removed player with ID=" + playerId + ", remaining players="
                + game.getPlayers().size());

        return game;
    }

    /**
     * Leave an in-progress multiplayer game. If the leaving player is the host (first player),
     * the entire game is cancelled. If the leaving player is the current player and there is a bid,
     * they are treated as having called "spot on" (and lost), then removed. Otherwise the player is
     * simply removed. If one or zero players remain after removal, the game is cancelled.
     * Broadcasts PLAYER_LEFT (with player name) then either GAME_UPDATED or GAME_CANCELLED.
     */
    public void leaveGame(String gameId, String playerId) {
        Game game = getGame(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        if (game.getState() != GameState.IN_PROGRESS && game.getState() != GameState.ROUND_ENDED) {
            throw new IllegalArgumentException("Can only leave when game is in progress or round ended");
        }
        int leaveIndex = -1;
        String playerName = null;
        for (int i = 0; i < game.getPlayers().size(); i++) {
            if (game.getPlayers().get(i).getId().equals(playerId)) {
                leaveIndex = i;
                playerName = game.getPlayers().get(i).getName();
                break;
            }
        }
        if (leaveIndex < 0 || playerName == null) {
            throw new IllegalArgumentException("Player not found");
        }

        // If the host (first player) leaves, cancel the entire game
        if (leaveIndex == 0) {
            games.remove(gameId);
            System.out.println("LEAVE GAME: Game " + gameId + " cancelled (host " + playerName + " left)");
            messagingTemplate.convertAndSend("/topic/game/" + gameId,
                    new WebSocketMessage("GAME_CANCELLED", null, gameId, null));
            return;
        }

        // If it's their turn and there's a bid, treat as spot on (they lose), then they leave before next round
        com.example.backend.model.Player currentPlayer = game.getCurrentPlayer();
        if (currentPlayer != null && currentPlayer.getId().equals(playerId) && game.getCurrentBid() != null) {
            try {
                processSpotOn(gameId, playerId);
            } catch (Exception e) {
                System.err.println("leaveGame: processSpotOn failed for " + playerId + ": " + e.getMessage());
            }
            // Re-resolve leaveIndex after processSpotOn (list unchanged)
            leaveIndex = -1;
            for (int i = 0; i < game.getPlayers().size(); i++) {
                if (game.getPlayers().get(i).getId().equals(playerId)) {
                    leaveIndex = i;
                    break;
                }
            }
        }

        game.getPlayers().remove(leaveIndex);
        game.getEliminatedPlayers().removeIf(id -> id.equals(playerId));
        int newSize = game.getPlayers().size();

        // Fix currentPlayerIndex after removal
        int cp = game.getCurrentPlayerIndex();
        if (cp == leaveIndex) {
            game.setCurrentPlayerIndex(newSize > 0 ? (leaveIndex % newSize) : 0);
        } else if (cp > leaveIndex) {
            game.setCurrentPlayerIndex(cp - 1);
        }
        if (game.getCurrentPlayerIndex() >= newSize && newSize > 0) {
            game.setCurrentPlayerIndex(0);
        }

        // Fix dealerIndex after removal
        int di = game.getDealerIndex();
        if (di == leaveIndex) {
            game.setDealerIndex(newSize > 0 ? 0 : 0);
        } else if (di > leaveIndex) {
            game.setDealerIndex(di - 1);
        }
        if (game.getDealerIndex() >= newSize && newSize > 0) {
            game.setDealerIndex(0);
        }

        // Clear current bid if it was from the leaving player
        if (game.getCurrentBid() != null && game.getCurrentBid().getPlayerId().equals(playerId)) {
            game.setCurrentBid(null);
        }

        // Notify all clients that this player left (before game update or cancel)
        messagingTemplate.convertAndSend("/topic/game/" + gameId,
                new WebSocketMessage("PLAYER_LEFT", java.util.Map.of("playerName", playerName), gameId, playerId));

        if (newSize < 2) {
            games.remove(gameId);
            System.out.println("LEAVE GAME: Game " + gameId + " cancelled (only " + newSize + " player(s) left)");
            messagingTemplate.convertAndSend("/topic/game/" + gameId,
                    new WebSocketMessage("GAME_CANCELLED", null, gameId, null));
        } else {
            broadcastGameUpdate(gameId);
        }
    }

    /**
     * Record that a player was active (heartbeat or game action). Used to give the current player
     * limited time to reconnect before being treated as having left.
     */
    public void recordActivity(String gameId, String playerId) {
        if (gameId == null || playerId == null) return;
        lastActivityByGameAndPlayer.put(gameId + ":" + playerId, System.currentTimeMillis());
    }

    /**
     * If the current player has had no activity (heartbeat or action) for RECONNECT_TIMEOUT_MS,
     * treat them as having left the game (calls leaveGame).
     */
    @Scheduled(fixedRate = 15_000) // every 15 seconds
    public void checkDisconnectedCurrentPlayers() {
        long now = System.currentTimeMillis();
        List<String> gameIds = new ArrayList<>(games.keySet());
        for (String gameId : gameIds) {
            Game game = games.get(gameId);
            if (game == null) continue;
            if (game.getState() != GameState.IN_PROGRESS && game.getState() != GameState.ROUND_ENDED) continue;
            com.example.backend.model.Player current = game.getCurrentPlayer();
            if (current == null) continue;
            String currentPlayerId = current.getId();
            String key = gameId + ":" + currentPlayerId;
            boolean isHost = !game.getPlayers().isEmpty() && game.getPlayers().get(0).getId().equals(currentPlayerId);
            long timeout = isHost ? HOST_INACTIVITY_TIMEOUT_MS : RECONNECT_TIMEOUT_MS;
            Long last = lastActivityByGameAndPlayer.get(key);
            if (last != null && (now - last) > timeout) {
                System.out.println("RECONNECT TIMEOUT: Current player " + currentPlayerId + " in game " + gameId + " had no activity for " + ((now - last) / 1000) + "s, treating as left");
                lastActivityByGameAndPlayer.remove(key);
                try {
                    leaveGame(gameId, currentPlayerId);
                } catch (Exception ex) {
                    System.err.println("checkDisconnectedCurrentPlayers leaveGame failed: " + ex.getMessage());
                }
            }
        }
    }

    /**
     * Cancel (delete) a multiplayer game. Only the host (first player) may cancel.
     * When the game is removed, other players will see the game as gone when they poll.
     */
    public void cancelMultiplayerGame(String gameId, String playerId) {
        Game game = getGame(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        if (game.getState() != GameState.WAITING_FOR_PLAYERS) {
            throw new IllegalArgumentException("Cannot cancel game after it has started");
        }
        if (game.getPlayers().isEmpty()) {
            throw new IllegalArgumentException("Game has no players");
        }
        com.example.backend.model.Player host = game.getPlayers().get(0);
        if (!host.getId().equals(playerId)) {
            throw new IllegalArgumentException("Only the host can cancel the game");
        }
        games.remove(gameId);
        System.out.println("CANCEL GAME: Removed game " + gameId + " (host cancelled)");
    }

    public void startMultiplayerGame(String gameId) {
        Game game = getGame(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        if (game.getPlayers().size() < 2) {
            throw new IllegalArgumentException("Not enough players to start game. Minimum 2 players required");
        }

        game.setState(GameState.COUNTDOWN);
        game.setCountdownEndTime(System.currentTimeMillis() + 3000L);
        broadcastGameUpdate(gameId);

        new java.util.Timer().schedule(new java.util.TimerTask() {
            @Override
            public void run() {
                doActualStart(gameId);
            }
        }, 3000);
    }

    private void doActualStart(String gameId) {
        Game game = getGame(gameId);
        if (game == null || game.getState() != GameState.COUNTDOWN) {
            return;
        }
        for (Player player : game.getPlayers()) {
            player.reset();
            player.rollDice();
        }
        int dealerIdx = (int) (Math.random() * game.getPlayers().size());
        game.setDealerIndex(dealerIdx);
        game.setCurrentPlayerIndex(dealerIdx);
        game.setState(GameState.IN_PROGRESS);
        game.setWaitingForPlayers(false);
        game.setCurrentBid(null);
        game.setPreviousBid(null);
        game.setEliminatedPlayers(new ArrayList<>());
        game.setRoundNumber(1);
        game.setMultiplayer(true);
        game.setMaxPlayers(6);
        game.setCountdownEndTime(null);
        Player initialCurrent = game.getCurrentPlayer();
        if (initialCurrent != null) recordActivity(gameId, initialCurrent.getId());
        System.out.println(
                "START GAME COMPLETE: Game state=" + game.getState() + ", Players=" + game.getPlayers().size());
        broadcastGameUpdate(gameId);
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
        recordActivityForCurrentPlayer(gameId);
        return result;
    }

    public GameResult processDoubtWithBroadcast(String gameId, String playerId) {
        GameResult result = processDoubt(gameId, playerId);
        recordActivityForCurrentPlayer(gameId);
        return result;
    }

    public GameResult processSpotOnWithBroadcast(String gameId, String playerId) {
        GameResult result = processSpotOn(gameId, playerId);
        recordActivityForCurrentPlayer(gameId);
        return result;
    }

    private void recordActivityForCurrentPlayer(String gameId) {
        Game game = getGame(gameId);
        if (game != null) {
            Player current = game.getCurrentPlayer();
            if (current != null) recordActivity(gameId, current.getId());
        }
    }

    /**
     * When exactly one player remains in the round, that player wins the round.
     * Sets winner, ROUND_ENDED state, adds win token, and either ends the game or schedules the next round.
     */
    private void finishRoundWithOneWinner(Game game, String gameId, Player roundWinner) {
        game.setWinner(roundWinner.getId());
        game.setState(GameState.ROUND_ENDED);
        boolean gameEnded = game.addRoundWinner(roundWinner.getId());
        if (gameEnded) {
            System.out.println("Game ended! Winner: " + roundWinner.getName() + " with "
                    + roundWinner.getWinTokens() + " tokens");
        } else {
            game.passDealerToWinner(roundWinner.getId());
            System.out.println("Dealer button passed to: " + roundWinner.getName());
            System.out.println("Round won by: " + roundWinner.getName() + " with "
                    + roundWinner.getWinTokens() + " tokens. Starting new round in 6s.");
            new java.util.Timer().schedule(new java.util.TimerTask() {
                @Override
                public void run() {
                    startNewRound(gameId);
                }
            }, 6000);
        }
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
            // Check if this is the first turn (no current bid)
            boolean isFirstTurn = (game.getCurrentBid() == null);
            
            // Simulate thinking delay
            long thinkingDelay = isMediumAI 
                ? mediumAIService.getThinkingDelay(isFirstTurn) 
                : easyAIService.getThinkingDelay(isFirstTurn);
            
            if (isFirstTurn) {
                System.out.println("🤖 First turn detected - AI will think for ~6 seconds");
            }
            
            Thread.sleep(thinkingDelay);

            // Generate AI action (use appropriate service and method)
            Object actionObj;
            if (isMediumAI) {
                actionObj = mediumAIService.generateEducatedAction(game, aiPlayer);
            } else {
                actionObj = easyAIService.generateRandomAction(
                        game.getCurrentBid(),
                        game.getPlayers().size(),
                        game.getRoundNumber());
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

            System.out.println(
                    "🤖 " + (isMediumAI ? "Medium" : "Easy") + " AI " + aiPlayer.getName() + " chooses: " + actionType);

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
