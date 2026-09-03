package com.example.backend.dto;

import java.util.List;

public class ReorderPlayersRequest {
    private String playerId;
    private List<String> playerIds;

    public String getPlayerId() {
        return playerId;
    }

    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }

    public List<String> getPlayerIds() {
        return playerIds;
    }

    public void setPlayerIds(List<String> playerIds) {
        this.playerIds = playerIds;
    }
}
