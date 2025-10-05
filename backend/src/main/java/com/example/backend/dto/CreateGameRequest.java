package com.example.backend.dto;

import java.util.List;

public class CreateGameRequest {
    private List<String> playerNames; // Legacy support
    private List<PlayerInfo> players; // New format with AI support

    public static class PlayerInfo {
        private String name;
        private String aiType; // null for human, "EASY_AI" for AI

        public PlayerInfo() {}

        public PlayerInfo(String name, String aiType) {
            this.name = name;
            this.aiType = aiType;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getAiType() { return aiType; }
        public void setAiType(String aiType) { this.aiType = aiType; }

        public boolean isAI() {
            return aiType != null && !aiType.isEmpty();
        }
    }

    public CreateGameRequest() {}

    public CreateGameRequest(List<String> playerNames) {
        this.playerNames = playerNames;
    }

    public List<String> getPlayerNames() { return playerNames; }
    public void setPlayerNames(List<String> playerNames) { this.playerNames = playerNames; }

    public List<PlayerInfo> getPlayers() { return players; }
    public void setPlayers(List<PlayerInfo> players) { this.players = players; }
}
