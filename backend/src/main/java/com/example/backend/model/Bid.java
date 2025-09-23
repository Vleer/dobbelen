package com.example.backend.model;

public class Bid {
    private String playerId;
    private int quantity;
    private int faceValue;
    private BidType type;

    public Bid() {}

    public Bid(String playerId, int quantity, int faceValue, BidType type) {
        this.playerId = playerId;
        this.quantity = quantity;
        this.faceValue = faceValue;
        this.type = type;
    }

    // Getters and Setters
    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getFaceValue() { return faceValue; }
    public void setFaceValue(int faceValue) { this.faceValue = faceValue; }

    public BidType getType() { return type; }
    public void setType(BidType type) { this.type = type; }

    @Override
    public String toString() {
        return String.format("%d %s", quantity, getFaceValueAsString());
    }

    private String getFaceValueAsString() {
        return switch (faceValue) {
            case 1 -> "ones";
            case 2 -> "twos";
            case 3 -> "threes";
            case 4 -> "fours";
            case 5 -> "fives";
            case 6 -> "sixes";
            default -> "unknown";
        };
    }
}
