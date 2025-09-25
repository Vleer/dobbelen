package com.example.backend.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class Game {
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
        // Randomize starting player and dealer
        this.currentPlayerIndex = (int) (Math.random() * players.size());
        this.dealerIndex = (int) (Math.random() * players.size());
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
}
