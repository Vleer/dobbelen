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
            // Pass dealer button to the winner regardless of whether game is ending
            passDealerToWinner(winnerId);
            if (winnerPlayer.getWinTokens() >= 7) {
                gameWinner = winnerId;
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
    private boolean isMultiplayer;
    private int maxPlayers;
    private boolean isWaitingForPlayers;
    private boolean showAllDice;
    private boolean canContinue;
    private List<Player> previousRoundPlayers; // Store players' dice from previous round
    private Integer lastActualCount; // Store actual count from last doubt/spot-on
    private Integer lastBidQuantity; // Store bid quantity from last doubt/spot-on
    private Integer lastBidFaceValue; // Store bid face value from last doubt/spot-on
    private String lastEliminatedPlayerId; // Store eliminated player from last action
    // Track the last action performer and type to display in UI
    private String lastActionPlayerId;
    private BidType lastActionType;
    // Track the starting player index when the round transitions to 2 active
    // players
    private Integer twoPlayerRoundStartIndex;
    // Track all bids made in the current hand
    private List<Bid> currentHandBidHistory;

    public Game() {
        this.id = generateShortGameId();
        this.players = new ArrayList<>();
        this.state = GameState.WAITING_FOR_PLAYERS;
        this.currentPlayerIndex = 0;
        this.eliminatedPlayers = new ArrayList<>();
        this.roundNumber = 1;
        this.dealerIndex = 0;
        this.isMultiplayer = false;
        this.maxPlayers = 6;
        this.isWaitingForPlayers = true;
        this.showAllDice = false;
        this.canContinue = false;
        this.previousRoundPlayers = new ArrayList<>();
        this.lastActualCount = null;
        this.lastBidQuantity = null;
        this.lastBidFaceValue = null;
        this.lastEliminatedPlayerId = null;
        this.lastActionPlayerId = null;
        this.lastActionType = null;
        this.twoPlayerRoundStartIndex = null;
        this.currentHandBidHistory = new ArrayList<>();
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
        return players.stream().anyMatch(player -> player.getWinTokens() >= 7);
    }

    public Player getGameWinnerPlayer() {
        return players.stream()
                .filter(player -> player.getWinTokens() >= 7)
                .findFirst()
                .orElse(null);
    }

    public int getDealerIndex() {
        return dealerIndex;
    }

    public void setDealerIndex(int dealerIndex) {
        this.dealerIndex = dealerIndex;
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
        return currentHandBidHistory;
    }

    public void setCurrentHandBidHistory(List<Bid> currentHandBidHistory) {
        this.currentHandBidHistory = currentHandBidHistory;
    }

    public void addBidToCurrentHand(Bid bid) {
        if (this.currentHandBidHistory == null) {
            this.currentHandBidHistory = new ArrayList<>();
        }
        this.currentHandBidHistory.add(bid);
    }

    public void clearCurrentHandBidHistory() {
        if (this.currentHandBidHistory == null) {
            this.currentHandBidHistory = new ArrayList<>();
        } else {
            this.currentHandBidHistory.clear();
        }
    }
}
