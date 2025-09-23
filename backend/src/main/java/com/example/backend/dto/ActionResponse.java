package com.example.backend.dto;

import com.example.backend.model.Game;

public class ActionResponse {
    private GameResponse game;
    private String message;
    private String eliminatedPlayerId;
    private int actualCount;
    private int bidQuantity;
    private boolean roundEnded;
    private String roundWinner;

    public ActionResponse() {}

    public ActionResponse(Game game, String message) {
        this.game = new GameResponse(game);
        this.message = message;
        this.roundEnded = game.getState() == com.example.backend.model.GameState.ROUND_ENDED;
        this.roundWinner = game.getWinner();
    }

    public ActionResponse(Game game, String message, String eliminatedPlayerId, int actualCount, int bidQuantity) {
        this(game, message);
        this.eliminatedPlayerId = eliminatedPlayerId;
        this.actualCount = actualCount;
        this.bidQuantity = bidQuantity;
    }

    // Getters and Setters
    public GameResponse getGame() { return game; }
    public void setGame(GameResponse game) { this.game = game; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getEliminatedPlayerId() { return eliminatedPlayerId; }
    public void setEliminatedPlayerId(String eliminatedPlayerId) { this.eliminatedPlayerId = eliminatedPlayerId; }

    public int getActualCount() { return actualCount; }
    public void setActualCount(int actualCount) { this.actualCount = actualCount; }

    public int getBidQuantity() { return bidQuantity; }
    public void setBidQuantity(int bidQuantity) { this.bidQuantity = bidQuantity; }

    public boolean isRoundEnded() { return roundEnded; }
    public void setRoundEnded(boolean roundEnded) { this.roundEnded = roundEnded; }

    public String getRoundWinner() { return roundWinner; }
    public void setRoundWinner(String roundWinner) { this.roundWinner = roundWinner; }
}
