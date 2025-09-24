package com.example.backend.model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    public Game() {
        this.id = UUID.randomUUID().toString();
        this.players = new ArrayList<>();
        this.state = GameState.WAITING_FOR_PLAYERS;
        this.currentPlayerIndex = 0;
        this.eliminatedPlayers = new ArrayList<>();
        this.roundNumber = 1;
        this.dealerIndex = 0;
    }

    public Game(List<Player> players) {
        this();
        this.players = new ArrayList<>(players);
        this.state = GameState.IN_PROGRESS;
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
}
