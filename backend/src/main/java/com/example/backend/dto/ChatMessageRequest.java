package com.example.backend.dto;

public class ChatMessageRequest {
    private String playerId;
    private String playerName;
    private String text;

    public ChatMessageRequest() {}

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getPlayerName() { return playerName; }
    public void setPlayerName(String playerName) { this.playerName = playerName; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
