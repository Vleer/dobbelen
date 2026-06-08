package com.example.backend.model;

import java.util.UUID;

public class ChatMessage {
    private String id;
    private String playerId;
    private String playerName;
    private String text;
    private long timestamp;

    public ChatMessage() {}

    public ChatMessage(String playerId, String playerName, String text) {
        this.id = UUID.randomUUID().toString();
        this.playerId = playerId;
        this.playerName = playerName;
        this.text = text;
        this.timestamp = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getPlayerName() { return playerName; }
    public void setPlayerName(String playerName) { this.playerName = playerName; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
