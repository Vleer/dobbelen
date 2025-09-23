package com.example.backend.dto;

public class BidRequest {
    private String playerId;
    private int quantity;
    private int faceValue;

    public BidRequest() {}

    public BidRequest(String playerId, int quantity, int faceValue) {
        this.playerId = playerId;
        this.quantity = quantity;
        this.faceValue = faceValue;
    }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getFaceValue() { return faceValue; }
    public void setFaceValue(int faceValue) { this.faceValue = faceValue; }
}
