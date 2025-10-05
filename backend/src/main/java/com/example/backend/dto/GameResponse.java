package com.example.backend.dto;

import com.example.backend.model.Game;
import com.example.backend.model.Player;

import java.util.ArrayList;
import java.util.List;

public class GameResponse {
    private String id;
    private List<PlayerInfo> players;
    private String state;
    private String currentPlayerId;
    private BidInfo currentBid;
    private BidInfo previousBid;
    private List<String> eliminatedPlayers;
    private int roundNumber;
    private String winner;
    private String gameWinner;
    private String dealerId;
    private boolean isMultiplayer;
    private int maxPlayers;
    private boolean isWaitingForPlayers;
    private boolean showAllDice;
    private List<PlayerInfo> previousRoundPlayers;
    private Integer lastActualCount;
    private Integer lastBidQuantity;
    private Integer lastBidFaceValue;
    private String lastEliminatedPlayerId;
    private boolean canContinue;
    private String lastActionPlayerId;
    private String lastActionType;
    private List<BidInfo> currentHandBidHistory;

    public GameResponse() {}

    public GameResponse(Game game) {
        this.id = game.getId();
        this.players = game.getPlayers().stream()
                .map(PlayerInfo::new)
                .toList();
        this.state = game.getState().name();
        this.currentPlayerId = game.getCurrentPlayer() != null ? game.getCurrentPlayer().getId() : null;
        this.currentBid = game.getCurrentBid() != null ? new BidInfo(game.getCurrentBid()) : null;
        this.previousBid = game.getPreviousBid() != null ? new BidInfo(game.getPreviousBid()) : null;
        this.eliminatedPlayers = game.getEliminatedPlayers();
        this.roundNumber = game.getRoundNumber();
        this.winner = game.getWinner();
        this.gameWinner = game.getGameWinner();
        this.dealerId = game.getDealer() != null ? game.getDealer().getId() : null;
        this.isMultiplayer = game.isMultiplayer();
        this.maxPlayers = game.getMaxPlayers();
        this.isWaitingForPlayers = game.isWaitingForPlayers();
        this.showAllDice = game.isShowAllDice();
        this.previousRoundPlayers = game.getPreviousRoundPlayers().stream()
                .map(PlayerInfo::new)
                .toList();
        this.lastActualCount = game.getLastActualCount();
        this.lastBidQuantity = game.getLastBidQuantity();
        this.lastBidFaceValue = game.getLastBidFaceValue();
        this.lastEliminatedPlayerId = game.getLastEliminatedPlayerId();
        this.canContinue = game.isCanContinue();
    this.lastActionPlayerId = game.getLastActionPlayerId();
    this.lastActionType = game.getLastActionType() != null ? game.getLastActionType().name() : null;
        this.currentHandBidHistory = game.getCurrentHandBidHistory() != null 
            ? game.getCurrentHandBidHistory().stream().map(BidInfo::new).toList()
            : new ArrayList<>();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public List<PlayerInfo> getPlayers() { return players; }
    public void setPlayers(List<PlayerInfo> players) { this.players = players; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getCurrentPlayerId() { return currentPlayerId; }
    public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }

    public BidInfo getCurrentBid() { return currentBid; }
    public void setCurrentBid(BidInfo currentBid) { this.currentBid = currentBid; }

    public BidInfo getPreviousBid() {
        return previousBid;
    }

    public void setPreviousBid(BidInfo previousBid) {
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

    public String getDealerId() {
        return dealerId;
    }

    public void setDealerId(String dealerId) {
        this.dealerId = dealerId;
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

    public List<PlayerInfo> getPreviousRoundPlayers() {
        return previousRoundPlayers;
    }

    public void setPreviousRoundPlayers(List<PlayerInfo> previousRoundPlayers) {
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

    public boolean isCanContinue() {
        return canContinue;
    }

    public void setCanContinue(boolean canContinue) {
        this.canContinue = canContinue;
    }

    public String getLastActionPlayerId() {
        return lastActionPlayerId;
    }

    public void setLastActionPlayerId(String lastActionPlayerId) {
        this.lastActionPlayerId = lastActionPlayerId;
    }

    public String getLastActionType() {
        return lastActionType;
    }

    public void setLastActionType(String lastActionType) {
        this.lastActionType = lastActionType;
    }

    public List<BidInfo> getCurrentHandBidHistory() {
        return currentHandBidHistory;
    }

    public void setCurrentHandBidHistory(List<BidInfo> currentHandBidHistory) {
        this.currentHandBidHistory = currentHandBidHistory;
    }

    public static class PlayerInfo {
    private String id;
    private String name;
    private int diceCount;
    private boolean isEliminated;
    private List<Integer> dice;
    private int winTokens;
    private String color;

        public PlayerInfo(Player player) {
            this.id = player.getId();
            this.name = player.getName();
            this.diceCount = player.getDice().size();
            this.isEliminated = player.isEliminated();
            this.dice = new ArrayList<>(player.getDice());
            this.winTokens = player.getWinTokens();
            this.color = player.getColor();
        }

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

        public int getDiceCount() { return diceCount; }
        public void setDiceCount(int diceCount) { this.diceCount = diceCount; }

        public boolean isEliminated() { return isEliminated; }
        public void setEliminated(boolean eliminated) { isEliminated = eliminated; }

        public List<Integer> getDice() {
            return dice;
        }

        public void setDice(List<Integer> dice) {
            this.dice = dice;
        }

        public int getWinTokens() {
            return winTokens;
        }

        public void setWinTokens(int winTokens) {
            this.winTokens = winTokens;
        }
    }

    public static class BidInfo {
        private String playerId;
        private int quantity;
        private int faceValue;
        private String type;

        public BidInfo(com.example.backend.model.Bid bid) {
            this.playerId = bid.getPlayerId();
            this.quantity = bid.getQuantity();
            this.faceValue = bid.getFaceValue();
            this.type = bid.getType().name();
        }

        // Getters and Setters
        public String getPlayerId() { return playerId; }
        public void setPlayerId(String playerId) { this.playerId = playerId; }

        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }

        public int getFaceValue() { return faceValue; }
        public void setFaceValue(int faceValue) { this.faceValue = faceValue; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }
}
