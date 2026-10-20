package com.example.backend.model;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

public class Player {
    private String id;
    private String name;
    private List<Integer> dice;
    private boolean isEliminated;
    private int winTokens;
    private String color; // Player color
    private String aiType; // null for human, "EASY_AI", "MEDIUM_AI", or "HARD_AI" for AI players

    /**
     * Secret proving this browser is this player.
     *
     * <p>Player ids were previously the only credential, and they are handed out to every client in
     * the game payload. Any caller could therefore read another player's hidden dice via
     * {@code GET /api/games/{id}/my-dice?playerId=<other>} or act as the host. This token is the
     * actual credential: it is generated once per player and only ever returned to the client that
     * created that player.
     *
     * <p>Excluded from JSON so it is never broadcast to other players in a game payload.
     */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String sessionToken;

    public Player() {
        this.id = UUID.randomUUID().toString();
        this.dice = new ArrayList<>();
        this.isEliminated = false;
        this.winTokens = 0;
        this.color = "blue";  // Default color
        this.aiType = null; // Default to human
        this.sessionToken = generateToken();
    }

    /** 256 bits from {@link SecureRandom}, URL-safe so it can travel in a header. */
    private static String generateToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Constant-time token comparison. Returns false for null/blank tokens so a missing header can
     * never authenticate.
     */
    public boolean matchesToken(String candidate) {
        if (sessionToken == null || candidate == null || candidate.isEmpty()) {
            return false;
        }
        byte[] expected = sessionToken.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] actual = candidate.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(expected, actual);
    }

    // Convenience constructor when only a name is known (used for lightweight copies)
    public Player(String name) {
        this();
        this.name = name;
    }

    public Player(String name, String color) {
        this();
        this.name = name;
        this.color = color;
    }

    public Player(String name, String color, String aiType) {
        this();
        this.name = name;
        this.color = color;
        this.aiType = aiType;
        if (aiType != null) {
            // AI players are driven by the server itself; they never make a request of their own,
            // so they have no client to hand a credential to. Leaving the token empty means the
            // host who added the AI never receives one and cannot act as the AI.
            this.sessionToken = null;
        }
    }

    public void rollDice() {
        dice.clear();
        for (int i = 0; i < 5; i++) {
            dice.add((int) (Math.random() * 6) + 1);
        }
    }

    public void eliminate() {
        this.isEliminated = true;
        this.dice.clear(); // Clear dice when eliminated
    }

    public void reset() {
        this.isEliminated = false;
        this.dice.clear();
    }

    public void addWinToken() {
        this.winTokens++;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public List<Integer> getDice() { return dice; }
    public void setDice(List<Integer> dice) { this.dice = dice; }

    public boolean isEliminated() { return isEliminated; }
    public void setEliminated(boolean eliminated) { isEliminated = eliminated; }

    public int getWinTokens() {
        return winTokens;
    }

    public void setWinTokens(int winTokens) {
        this.winTokens = winTokens;
    }

    public String getAiType() {
        return aiType;
    }

    public void setAiType(String aiType) {
        this.aiType = aiType;
    }

    public boolean isAI() {
        return aiType != null && !aiType.isEmpty();
    }

    // Also ignored on the accessor so the credential stays out of any serialised payload even if the
// field annotation is ever refactored away.
@com.fasterxml.jackson.annotation.JsonIgnore
    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    /** Rotate the token, invalidating any previously issued credential. */
    public void rotateSessionToken() {
        this.sessionToken = generateToken();
    }
}
