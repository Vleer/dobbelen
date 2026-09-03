package com.example.backend.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class Game {
    // Eliminate a player by ID
    public void eliminatePlayer(String playerId) {
        if (!eliminatedPlayers.contains(playerId)) {
            eliminatedPlayers.add(playerId);
            players.stream()
                .filter(p -> p.getId().equals(playerId))
                .findFirst()
                .ifPresent(Player::eliminate);
        }
    }

    // Start a new round, resetting state but keeping win tokens
    public void startNewRound() {
        for (Player player : players) {
            player.reset();
            player.rollDice();
        }
        eliminatedPlayers.clear();
        if (dealerIndex < players.size()) {
            currentPlayerIndex = dealerIndex;
        }
        roundStartDealerIndex = dealerIndex;
        currentBid = null;
        previousBid = null;
        winner = null;
        state = GameState.IN_PROGRESS;
        roundNumber++;
        twoPlayerRoundStartIndex = null;
        clearCurrentHandBidHistory();
    }

    // Pass dealer button to winner
    public void passDealerToWinner(String winnerId) {
        int idx = -1;
        for (int i = 0; i < players.size(); i++) {
            if (players.get(i).getId().equals(winnerId)) {
                idx = i;
                break;
            }
        }
        if (idx != -1) {
            dealerIndex = idx;
            roundStartDealerIndex = idx;
        }
    }

    /**
     * Pass dealer button to the next seat after whoever held it at the start of this round.
     * Uses the full seating order (including players eliminated mid-round) so a temporary
     * mid-round move of the chip onto the hand starter does not skip a seat for next round.
     */
    public void passDealerToNextPlayer() {
        if (!players.isEmpty()) {
            dealerIndex = (roundStartDealerIndex + 1) % players.size();
            roundStartDealerIndex = dealerIndex;
        }
    }

    /** Remember who holds the dealer button at the start of the current round. */
    public void markRoundStartDealer() {
        roundStartDealerIndex = dealerIndex;
    }

    /**
     * Move the dealer chip to the player who starts the next hand (e.g. after an
     * elimination when the previous dealer is out). Does not change roundStartDealerIndex.
     */
    public void syncDealerToHandStarter(int starterIndex) {
        if (starterIndex >= 0 && starterIndex < players.size()) {
            dealerIndex = starterIndex;
        }
    }

    // Add win token to round winner and check for game winner
    public boolean addRoundWinner(String winnerId) {
        Player winnerPlayer = players.stream()
            .filter(p -> p.getId().equals(winnerId))
            .findFirst()
            .orElse(null);
        if (winnerPlayer != null) {
            winnerPlayer.addWinToken();
            Player gameWinnerPlayer = GameRules.findGameWinner(players);
            if (gameWinnerPlayer != null) {
                gameWinner = gameWinnerPlayer.getId();
                state = GameState.GAME_ENDED;
                return true;
            }
        }
        return false;
    }
    private String id;
    private List<Player> players;
    private GameState state;
    private int currentPlayerIndex;
    private Bid currentBid;
    private Bid previousBid;
    private List<String> eliminatedPlayers;
    private int roundNumber;
    private String winner;
    private String gameWinner;
    private int dealerIndex;
    /** Stable host identity (creator). Seat order can change without moving host. */
    private String hostPlayerId;
    /**
     * Dealer seat at the beginning of the current round. Mid-round the visible
     * dealerIndex may move to the hand starter when the original dealer is
     * eliminated; round-end rotation still advances from this index among all seats.
     */
    private int roundStartDealerIndex;
    private boolean isMultiplayer;
    private boolean isPrivate;
    private int maxPlayers;
    private boolean isWaitingForPlayers;
    private boolean showAllDice;
    private boolean canContinue;
    private List<Player> previousRoundPlayers; // Store players' dice from previous round
    private Integer lastActualCount; // Store actual count from last doubt/spot-on
    private Integer lastBidQuantity; // Store bid quantity from last doubt/spot-on
    private Integer lastBidFaceValue; // Store bid face value from last doubt/spot-on
    private String lastBidPlayerId; // Store bidder from last doubt/spot-on
    private String lastEliminatedPlayerId; // Store eliminated player from last action
    // Track the last action performer and type to display in UI
    private String lastActionPlayerId;
    private BidType lastActionType;
    // Track the starting player index when the round transitions to 2 active
    // players
    private Integer twoPlayerRoundStartIndex;
    // Track all bids made in the current hand
    private List<Bid> currentHandBidHistory;
    /** When state is COUNTDOWN, timestamp (ms) when the game will start */
    private Long countdownEndTime;
    /** Players who have clicked "continue" after the game ended (to trigger a rematch) */
    private List<String> playersContinued;
    /**
     * Last time the host was actively present on the public lobby browser (epoch ms).
     * Used to hide idle lobbies from the public list while the game still exists (direct link still works).
     */
    private Long lastHostLobbyPresenceAt;
    /** Chat messages sent by players in this game/lobby */
    private List<ChatMessage> chatMessages;

    public Game() {
        this.id = generateShortGameId();
        this.players = new ArrayList<>();
        this.state = GameState.WAITING_FOR_PLAYERS;
        this.currentPlayerIndex = 0;
        this.eliminatedPlayers = new ArrayList<>();
        this.roundNumber = 1;
        this.dealerIndex = 0;
        this.roundStartDealerIndex = 0;
        this.isMultiplayer = false;
        this.isPrivate = false;
        this.maxPlayers = 4;
        this.isWaitingForPlayers = true;
        this.showAllDice = false;
        this.canContinue = false;
        this.previousRoundPlayers = new ArrayList<>();
        this.lastActualCount = null;
        this.lastBidQuantity = null;
        this.lastBidFaceValue = null;
        this.lastBidPlayerId = null;
        this.lastEliminatedPlayerId = null;
        this.lastActionPlayerId = null;
        this.lastActionType = null;
        this.twoPlayerRoundStartIndex = null;
        this.currentHandBidHistory = new ArrayList<>();
        this.playersContinued = new ArrayList<>();
        this.lastHostLobbyPresenceAt = null;
        this.chatMessages = new ArrayList<>();
    }

    /** Reset this game back to WAITING_FOR_PLAYERS so all players can start a new game. */
    public void resetForNewGame() {
        for (Player player : players) {
            player.setWinTokens(0);
            player.setEliminated(false);
            player.getDice().clear();
        }
        eliminatedPlayers.clear();
        currentBid = null;
        previousBid = null;
        winner = null;
        gameWinner = null;
        state = GameState.WAITING_FOR_PLAYERS;
        isWaitingForPlayers = true;
        roundNumber = 1;
        showAllDice = false;
        canContinue = false;
        playersContinued = new ArrayList<>();
        currentHandBidHistory = new ArrayList<>();
        previousRoundPlayers = new ArrayList<>();
        countdownEndTime = null;
        twoPlayerRoundStartIndex = null;
        lastActualCount = null;
        lastBidQuantity = null;
        lastBidFaceValue = null;
        lastBidPlayerId = null;
        lastEliminatedPlayerId = null;
        lastActionPlayerId = null;
        lastActionType = null;
        dealerIndex = 0;
        roundStartDealerIndex = 0;
        currentPlayerIndex = 0;
        lastHostLobbyPresenceAt = System.currentTimeMillis();
    }

    private String generateShortGameId() {
        String chars = "abcdefghijklmnopqrstuvwxyz";
        Random random = new Random();
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < 3; i++) {
            result.append(chars.charAt(random.nextInt(chars.length())));
        }
        return result.toString();
    }

    public Game(List<Player> players) {
        this();
        this.players = new ArrayList<>(players);
        this.state = GameState.IN_PROGRESS;
        this.isWaitingForPlayers = false;
    // Randomize dealer, and always start with dealer as current player
    this.dealerIndex = (int) (Math.random() * players.size());
    this.roundStartDealerIndex = this.dealerIndex;
    this.currentPlayerIndex = this.dealerIndex;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public List<Player> getPlayers() { return players; }
    public void setPlayers(List<Player> players) { this.players = players; }

    public GameState getState() { return state; }
    public void setState(GameState state) { this.state = state; }

    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public void setCurrentPlayerIndex(int currentPlayerIndex) { this.currentPlayerIndex = currentPlayerIndex; }

    public Bid getCurrentBid() { return currentBid; }
    public void setCurrentBid(Bid currentBid) { this.currentBid = currentBid; }

    public Bid getPreviousBid() {
        return previousBid;
    }

    public void setPreviousBid(Bid previousBid) {
        this.previousBid = previousBid;
    }

    public List<String> getEliminatedPlayers() { return eliminatedPlayers; }
    public void setEliminatedPlayers(List<String> eliminatedPlayers) { this.eliminatedPlayers = eliminatedPlayers; }

    public int getRoundNumber() { return roundNumber; }
    public void setRoundNumber(int roundNumber) { this.roundNumber = roundNumber; }

    public String getWinner() { return winner; }
    public void setWinner(String winner) { this.winner = winner; }

    public String getGameWinner() {
        return gameWinner;
    }

    public void setGameWinner(String gameWinner) {
        this.gameWinner = gameWinner;
    }

    public Player getCurrentPlayer() {
        if (players.isEmpty() || currentPlayerIndex >= players.size()) {
            return null;
        }
        return players.get(currentPlayerIndex);
    }

    public List<Player> getActivePlayers() {
        return players.stream()
                .filter(player -> !eliminatedPlayers.contains(player.getId()))
                .toList();
    }

    public boolean hasGameWinner() {
        return GameRules.findGameWinner(players) != null;
    }

    public Player getGameWinnerPlayer() {
        return GameRules.findGameWinner(players);
    }

    public String getHostPlayerId() {
        if (hostPlayerId != null) {
            return hostPlayerId;
        }
        // Legacy games: first seat was always the host
        return players.isEmpty() ? null : players.get(0).getId();
    }

    public void setHostPlayerId(String hostPlayerId) {
        this.hostPlayerId = hostPlayerId;
    }

    public boolean isHost(String playerId) {
        if (playerId == null) {
            return false;
        }
        String hostId = getHostPlayerId();
        return hostId != null && hostId.equals(playerId);
    }

    public int getDealerIndex() {
        return dealerIndex;
    }

    public void setDealerIndex(int dealerIndex) {
        this.dealerIndex = dealerIndex;
    }

    public int getRoundStartDealerIndex() {
        return roundStartDealerIndex;
    }

    public void setRoundStartDealerIndex(int roundStartDealerIndex) {
        this.roundStartDealerIndex = roundStartDealerIndex;
    }

    public Player getDealer() {
        if (players.isEmpty() || dealerIndex >= players.size()) {
            return null;
        }
        return players.get(dealerIndex);
    }

    public boolean isMultiplayer() {
        return isMultiplayer;
    }

    public void setMultiplayer(boolean multiplayer) {
        this.isMultiplayer = multiplayer;
    }

    public boolean isPrivate() {
        return isPrivate;
    }

    public void setPrivate(boolean aPrivate) {
        isPrivate = aPrivate;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public boolean isWaitingForPlayers() {
        return isWaitingForPlayers;
    }

    public void setWaitingForPlayers(boolean waitingForPlayers) {
        this.isWaitingForPlayers = waitingForPlayers;
    }

    public boolean isShowAllDice() {
        return showAllDice;
    }

    public void setShowAllDice(boolean showAllDice) {
        this.showAllDice = showAllDice;
    }

    public boolean isCanContinue() {
        return canContinue;
    }

    public void setCanContinue(boolean canContinue) {
        this.canContinue = canContinue;
    }

    public boolean canJoin() {
        return isMultiplayer && isWaitingForPlayers && players.size() < maxPlayers;
    }

    public List<Player> getPreviousRoundPlayers() {
        return previousRoundPlayers;
    }

    public void setPreviousRoundPlayers(List<Player> previousRoundPlayers) {
        this.previousRoundPlayers = previousRoundPlayers;
    }

    public Integer getLastActualCount() {
        return lastActualCount;
    }

    public void setLastActualCount(Integer lastActualCount) {
        this.lastActualCount = lastActualCount;
    }

    public Integer getLastBidQuantity() {
        return lastBidQuantity;
    }

    public void setLastBidQuantity(Integer lastBidQuantity) {
        this.lastBidQuantity = lastBidQuantity;
    }

    public Integer getLastBidFaceValue() {
        return lastBidFaceValue;
    }

    public void setLastBidFaceValue(Integer lastBidFaceValue) {
        this.lastBidFaceValue = lastBidFaceValue;
    }

    public String getLastBidPlayerId() {
        return lastBidPlayerId;
    }

    public void setLastBidPlayerId(String lastBidPlayerId) {
        this.lastBidPlayerId = lastBidPlayerId;
    }

    public String getLastEliminatedPlayerId() {
        return lastEliminatedPlayerId;
    }

    public void setLastEliminatedPlayerId(String lastEliminatedPlayerId) {
        this.lastEliminatedPlayerId = lastEliminatedPlayerId;
    }

    public String getLastActionPlayerId() {
        return lastActionPlayerId;
    }

    public void setLastActionPlayerId(String lastActionPlayerId) {
        this.lastActionPlayerId = lastActionPlayerId;
    }

    public BidType getLastActionType() {
        return lastActionType;
    }

    public void setLastActionType(BidType lastActionType) {
        this.lastActionType = lastActionType;
    }

    public Integer getTwoPlayerRoundStartIndex() {
        return twoPlayerRoundStartIndex;
    }

    public void setTwoPlayerRoundStartIndex(Integer twoPlayerRoundStartIndex) {
        this.twoPlayerRoundStartIndex = twoPlayerRoundStartIndex;
    }

    public List<Bid> getCurrentHandBidHistory() {
        if (currentHandBidHistory == null) {
            System.out.println("⚠️ WARNING: getCurrentHandBidHistory() returning null!");
            return new ArrayList<>();
        }
        System.out.println("📊 getCurrentHandBidHistory() called. Size: " + currentHandBidHistory.size());
        return currentHandBidHistory;
    }

    public void setCurrentHandBidHistory(List<Bid> currentHandBidHistory) {
        this.currentHandBidHistory = currentHandBidHistory;
    }

    public Long getCountdownEndTime() {
        return countdownEndTime;
    }

    public void setCountdownEndTime(Long countdownEndTime) {
        this.countdownEndTime = countdownEndTime;
    }

    public List<String> getPlayersContinued() {
        if (playersContinued == null) {
            playersContinued = new ArrayList<>();
        }
        return playersContinued;
    }

    public void setPlayersContinued(List<String> playersContinued) {
        this.playersContinued = playersContinued;
    }

    public Long getLastHostLobbyPresenceAt() {
        return lastHostLobbyPresenceAt;
    }

    public void setLastHostLobbyPresenceAt(Long lastHostLobbyPresenceAt) {
        this.lastHostLobbyPresenceAt = lastHostLobbyPresenceAt;
    }

    public List<ChatMessage> getChatMessages() {
        if (chatMessages == null) {
            chatMessages = new ArrayList<>();
        }
        return chatMessages;
    }

    public void setChatMessages(List<ChatMessage> chatMessages) {
        this.chatMessages = chatMessages;
    }

    public void addBidToCurrentHand(Bid bid) {
        if (this.currentHandBidHistory == null) {
            this.currentHandBidHistory = new ArrayList<>();
            System.out.println("⚠️ WARNING: currentHandBidHistory was null, created new ArrayList");
        }
        this.currentHandBidHistory.add(bid);
        System.out.println("✅ Added bid to history. Type: " + (bid.getType() != null ? bid.getType() : "null") + 
                          ", PlayerId: " + bid.getPlayerId() + ", Total history size: " + this.currentHandBidHistory.size());
    }

    public void clearCurrentHandBidHistory() {
        if (this.currentHandBidHistory == null) {
            this.currentHandBidHistory = new ArrayList<>();
        } else {
            this.currentHandBidHistory.clear();
        }
    }
}
