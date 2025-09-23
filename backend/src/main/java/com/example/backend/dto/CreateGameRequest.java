package com.example.backend.dto;

import java.util.List;

public class CreateGameRequest {
    private List<String> playerNames;

    public CreateGameRequest() {}

    public CreateGameRequest(List<String> playerNames) {
        this.playerNames = playerNames;
    }

    public List<String> getPlayerNames() { return playerNames; }
    public void setPlayerNames(List<String> playerNames) { this.playerNames = playerNames; }
}
