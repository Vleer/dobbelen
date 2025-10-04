package com.example.backend.model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Player {
    private String id;
    private String name;
    private List<Integer> dice;
    private boolean isEliminated;
    private int winTokens;
    private String color; // Player color

    public Player() {
        this.id = UUID.randomUUID().toString();
        this.dice = new ArrayList<>();
        this.isEliminated = false;
        this.winTokens = 0;
        this.color = "blue";  // Default color
    }

    public Player(String name, String color) {
        this();
        this.name = name;
        this.color = color;
    }

    public void rollDice() {
        dice.clear();
        for (int i = 0; i < 5; i++) {
            dice.add((int) (Math.random() * 6) + 1);
        }
    }

    public void eliminate() {
        this.isEliminated = true;
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
}
