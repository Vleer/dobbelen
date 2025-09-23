package com.example.backend.model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Player {
    private String id;
    private String name;
    private List<Integer> dice;
    private boolean isEliminated;

    public Player() {
        this.id = UUID.randomUUID().toString();
        this.dice = new ArrayList<>();
        this.isEliminated = false;
    }

    public Player(String name) {
        this();
        this.name = name;
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

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<Integer> getDice() { return dice; }
    public void setDice(List<Integer> dice) { this.dice = dice; }

    public boolean isEliminated() { return isEliminated; }
    public void setEliminated(boolean eliminated) { isEliminated = eliminated; }
}
