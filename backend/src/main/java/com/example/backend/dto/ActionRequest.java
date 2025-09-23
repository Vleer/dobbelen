package com.example.backend.dto;

public class ActionRequest {
    private String playerId;

    public ActionRequest() {}

    public ActionRequest(String playerId) {
        this.playerId = playerId;
    }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }
}
