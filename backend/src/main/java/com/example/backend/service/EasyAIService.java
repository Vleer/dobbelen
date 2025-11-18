package com.example.backend.service;

import com.example.backend.model.Bid;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EasyAIService {
    
    // Track AI actions to prevent double-acting
    private final Map<String, AIActionRecord> aiActionTracker = new ConcurrentHashMap<>();
    
    // Track round end times for delay enforcement
    private final Map<String, Long> roundEndTimes = new ConcurrentHashMap<>();
    
    private static class AIActionRecord {
        String gameId;
        int roundNumber;
        String currentPlayerId;
        long timestamp;
        
        AIActionRecord(String gameId, int roundNumber, String currentPlayerId, long timestamp) {
            this.gameId = gameId;
            this.roundNumber = roundNumber;
            this.currentPlayerId = currentPlayerId;
            this.timestamp = timestamp;
        }
    }
    
    public static class AIAction {
        private final String action; // "bid", "doubt", "spotOn"
        private Integer quantity;
        private Integer faceValue;
        
        public AIAction(String action) {
            this.action = action;
        }
        
        public AIAction(String action, int quantity, int faceValue) {
            this.action = action;
            this.quantity = quantity;
            this.faceValue = faceValue;
        }
        
        public String getAction() { return action; }
        public Integer getQuantity() { return quantity; }
        public Integer getFaceValue() { return faceValue; }
    }
    
    /**
     * Check if AI can act (hasn't already acted in this turn)
     */
    public boolean canAIAct(String gameId, int roundNumber, String currentPlayerId) {
        String key = currentPlayerId;
        AIActionRecord lastAction = aiActionTracker.get(key);
        
        // AI can act if:
        // 1. Never acted before, OR
        // 2. The round has changed, OR
        // 3. The current player has changed
        if (lastAction == null) {
            return true;
        }
        
        if (!lastAction.gameId.equals(gameId) || 
            lastAction.roundNumber != roundNumber || 
            !lastAction.currentPlayerId.equals(currentPlayerId)) {
            return true;
        }
        
        // Check if enough time has passed (at least 1 second to prevent spam)
        long timeSinceLastAction = System.currentTimeMillis() - lastAction.timestamp;
        return timeSinceLastAction > 1000;
    }
    
    /**
     * Mark that an AI has acted
     */
    public void markAIAction(String gameId, int roundNumber, String currentPlayerId) {
        String key = currentPlayerId;
        aiActionTracker.put(key, new AIActionRecord(gameId, roundNumber, currentPlayerId, System.currentTimeMillis()));
    }
    
    /**
     * Check if the delay after round end has passed
     */
    public boolean canActAfterRoundEnd(String gameId, boolean showAllDice) {
        if (!showAllDice) {
            // Not in round end state, can act normally
            roundEndTimes.remove(gameId);
            return true;
        }
        
        // Round just ended (showAllDice is true)
        Long endTime = roundEndTimes.get(gameId);
        
        if (endTime == null) {
            // First time seeing this round end, record the time
            roundEndTimes.put(gameId, System.currentTimeMillis());
            return false; // Don't act immediately
        }
        
        // Check if 6 seconds have passed
        long timeSinceEnd = System.currentTimeMillis() - endTime;
        return timeSinceEnd >= 6000;
    }
    
    /**
     * Clear tracking for a new round
     */
    public void clearRoundTracking(String gameId) {
        roundEndTimes.remove(gameId);
    }
    
    /**
     * Generate a random AI action based on the current game state
     */
    public AIAction generateRandomAction(Bid currentBid, int totalPlayers, int roundNumber) {
        // If no current bid, must bid (start of round)
        if (currentBid == null) {
            System.out.println("AI starting new round (" + roundNumber + "), generating first bid");
            return generateBidAction(null);
        }
        
        // Calculate doubt probability using the formula: (1 / number of players) * 0.3 * amount^1.5
        double doubtProbability = (1.0 / totalPlayers) * 0.3 * Math.pow(currentBid.getQuantity(), 1.5);
        double spotOnProbability = 0.01; // 1% chance for spot-on
        
        double random = Math.random();
        
        if (random < doubtProbability) {
            System.out.println(String.format("AI considering doubt: probability=%.3f, bid=%d of %ds",
                doubtProbability, currentBid.getQuantity(), currentBid.getFaceValue()));
            return new AIAction("doubt");
        } else if (random < doubtProbability + spotOnProbability) {
            return new AIAction("spotOn");
        } else {
            return generateBidAction(currentBid);
        }
    }
    
    /**
     * Generate a bid action (either first bid or raise)
     */
    private AIAction generateBidAction(Bid currentBid) {
        if (currentBid == null) {
            // First bid - start with 1 or 2 of any value
            int quantity = Math.random() < 0.5 ? 1 : 2;
            int faceValue = (int) (Math.random() * 6) + 1;
            System.out.println("AI first bid: " + quantity + " of " + faceValue + "s");
            return new AIAction("bid", quantity, faceValue);
        }
        
        // AI strategy: ensure valid bid by either increasing quantity or increasing face value
        int currentQuantity = currentBid.getQuantity();
        int currentFaceValue = currentBid.getFaceValue();
        
        int newQuantity;
        int newFaceValue;
        
        if (Math.random() < 0.5) {
            // Strategy 1: Same quantity, higher face value (if possible)
            if (currentFaceValue < 6) {
                newQuantity = currentQuantity;
                newFaceValue = currentFaceValue + 1;
            } else {
                // If face value is already 6, increase quantity
                newQuantity = currentQuantity + 1;
                newFaceValue = currentFaceValue;
            }
        } else {
            // Strategy 2: Increase quantity, same or lower face value
            newQuantity = currentQuantity + 1;
            newFaceValue = currentFaceValue;
        }
        
        System.out.println(String.format("AI bid strategy: current=%d of %ds, new=%d of %ds",
            currentQuantity, currentFaceValue, newQuantity, newFaceValue));
        
        return new AIAction("bid", newQuantity, newFaceValue);
    }
    
    /**
     * Simulate AI thinking delay
     * @param isFirstTurn true if this is the first move of the round (no current bid)
     * @return delay in milliseconds - around 6 seconds for first turn, 0.5-1.5 seconds otherwise
     */
    public long getThinkingDelay(boolean isFirstTurn) {
        if (isFirstTurn) {
            return (long) (Math.random() * 1000) + 5500; // 5.5-6.5 seconds
        }
        return (long) (Math.random() * 1000) + 500; // 0.5-1.5 seconds
    }
}
