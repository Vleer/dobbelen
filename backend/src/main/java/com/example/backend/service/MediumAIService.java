package com.example.backend.service;

import com.example.backend.model.Bid;
import com.example.backend.model.Player;
import com.example.backend.model.Game;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MediumAIService {
    
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
            roundEndTimes.remove(gameId);
            return true;
        }
        
        Long endTime = roundEndTimes.get(gameId);
        
        if (endTime == null) {
            roundEndTimes.put(gameId, System.currentTimeMillis());
            return false;
        }
        
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
     * Generate an AI action based on mathematical principles and the AI's own hand
     */
    public AIAction generateEducatedAction(Game game, Player aiPlayer) {
        Bid currentBid = game.getCurrentBid();
        List<Integer> myDice = aiPlayer.getDice();
        int activePlayers = (int) game.getPlayers().stream().filter(p -> !p.isEliminated()).count();
        
        System.out.println("🧠 MediumAI analyzing: myDice=" + myDice + ", activePlayers=" + activePlayers);
        
        // If no current bid, make an educated first bid based on our hand
        if (currentBid == null) {
            return makeEducatedFirstBid(myDice, activePlayers);
        }
        
        // Analyze the current bid using mathematical principles
        BidAnalysis analysis = analyzeBid(currentBid, myDice, activePlayers);
        
        System.out.println(String.format("🧠 Bid analysis: expected=%.2f, probability=%.2f%%, confidence=%.2f%%, inMyHand=%d",
            analysis.expectedCount, analysis.probabilityTrue * 100, analysis.confidence * 100, analysis.diceInMyHand));
        
        // More critical decision logic - be skeptical of unlikely bids
        if (analysis.confidence < 0.20) {
            // Very unlikely based on statistics - always doubt
            System.out.println("🧠 Bid is statistically very unlikely - DOUBTING");
            return new AIAction("doubt");
        } else if (analysis.confidence > 0.90 && Math.random() < 0.03) {
            // Extremely confident it's true - rare spot on attempt
            System.out.println("🧠 Extremely high confidence - attempting SPOT ON");
            return new AIAction("spotOn");
        } else if (analysis.confidence < 0.45) {
            // Moderately unlikely - doubt with scaled probability
            double doubtChance = (0.45 - analysis.confidence) * 2.0; // Scale to 0-0.9 max
            if (Math.random() < doubtChance) {
                System.out.println("🧠 Bid unlikely (confidence " + String.format("%.0f%%", analysis.confidence * 100) + ") - DOUBTING");
                return new AIAction("doubt");
            }
        }
        
        // Consider if we should switch to a better alternative or raise
        AIAction alternativeAction = considerAlternative(currentBid, myDice, analysis, activePlayers);
        if (alternativeAction != null) {
            return alternativeAction;
        }
        
        // Default: raise the bid conservatively
        return makeEducatedRaise(currentBid, myDice, analysis, activePlayers);
    }
    
    /**
     * Make an educated first bid based on our hand
     */
    private AIAction makeEducatedFirstBid(List<Integer> myDice, int activePlayers) {
        // Count each face value in our hand
        int[] counts = new int[7]; // Index 0 unused, 1-6 for dice faces
        for (int die : myDice) {
            counts[die]++;
        }
        
        // Find the face value we have the most of
        int bestFace = 1;
        int maxCount = counts[1];
        for (int face = 2; face <= 6; face++) {
            if (counts[face] > maxCount) {
                maxCount = counts[face];
                bestFace = face;
            }
        }
        
        // Start very conservatively: bid what we actually have, don't overbid
        int bidQuantity = maxCount;
        // Only bid higher if we have 4+ of a kind (very strong hand)
        if (maxCount >= 4 && activePlayers >= 3) {
            bidQuantity = maxCount + 1;
        }
        
        System.out.println(String.format("🧠 First bid strategy: have %d of %ds, bidding %d of %ds", 
            maxCount, bestFace, bidQuantity, bestFace));
        
        return new AIAction("bid", bidQuantity, bestFace);
    }
    
    /**
     * Consider switching to a lower face value with higher quantity
     * This is strategic when the current bid is on a high value (especially 6)
     */
    private AIAction considerAlternative(Bid currentBid, List<Integer> myDice, BidAnalysis analysis, int activePlayers) {
        int currentQuantity = currentBid.getQuantity();
        int currentFaceValue = currentBid.getFaceValue();
        
        // Count what we have in our hand
        int[] myCounts = new int[7];
        for (int die : myDice) {
            myCounts[die]++;
        }
        
        // Find our best alternative face value
        int bestFace = 0;
        int bestCount = 0;
        for (int face = 1; face <= 6; face++) {
            if (myCounts[face] > bestCount) {
                bestCount = myCounts[face];
                bestFace = face;
            }
        }
        
        // Strategy: If current bid is high value (5-6) and we have 0 of it but 3+ of something else
        // Consider switching to that lower value with quantity+1
        if (currentFaceValue >= 5 && analysis.diceInMyHand == 0 && bestCount >= 3) {
            int totalDice = activePlayers * 5;
            int newQuantity = currentQuantity + 1;
            
            // Calculate expected count for our alternative
            double expectedAlternative = bestCount + ((totalDice - myDice.size()) / 6.0);
            
            // If our alternative is more realistic, switch to it
            if (expectedAlternative >= newQuantity - 0.5) {
                System.out.println(String.format("🧠 Strategic switch: from %d %ds to %d %ds (have %d, expected %.2f)",
                    currentQuantity, currentFaceValue, newQuantity, bestFace, bestCount, expectedAlternative));
                return new AIAction("bid", newQuantity, bestFace);
            }
        }
        
        // Strategy: For 6s specifically, strongly consider switching down
        if (currentFaceValue == 6 && bestFace < 6 && bestCount >= 2) {
            int newQuantity = currentQuantity + (bestCount >= 3 ? 1 : 2);
            System.out.println(String.format("🧠 Switching from 6s: %d of %ds (have %d)",
                newQuantity, bestFace, bestCount));
            return new AIAction("bid", newQuantity, bestFace);
        }
        
        return null; // No good alternative found
    }
    
    /**
     * Make an educated raise based on bid analysis
     */
    private AIAction makeEducatedRaise(Bid currentBid, List<Integer> myDice, BidAnalysis analysis, int activePlayers) {
        int currentQuantity = currentBid.getQuantity();
        int currentFaceValue = currentBid.getFaceValue();
        
        // Count how many of the current bid's face value we have
        int myCountOfCurrentFace = (int) myDice.stream().filter(d -> d == currentFaceValue).count();
        
        // Check if we have a lot of some other face value
        int[] myCounts = new int[7];
        for (int die : myDice) {
            myCounts[die]++;
        }
        
        int bestAlternateFace = currentFaceValue;
        int bestAlternateCount = myCountOfCurrentFace;
        for (int face = 1; face <= 6; face++) {
            if (myCounts[face] > bestAlternateCount) {
                bestAlternateCount = myCounts[face];
                bestAlternateFace = face;
            }
        }
        
        // Strategy 1: If we have many of a higher face value, switch to that (conservative)
        if (bestAlternateFace > currentFaceValue && bestAlternateCount >= 3) {
            System.out.println(String.format("🧠 Switching to better hand: %d of %ds (have %d)", 
                currentQuantity, bestAlternateFace, bestAlternateCount));
            return new AIAction("bid", currentQuantity, bestAlternateFace);
        }
        
        // Strategy 2: If we have many of a lower face value, increase quantity (conservative)
        if (bestAlternateCount >= 4 && bestAlternateFace < currentFaceValue) {
            int newQuantity = currentQuantity + (bestAlternateCount - myCountOfCurrentFace);
            System.out.println(String.format("🧠 Increasing quantity for lower face: %d of %ds (have %d)", 
                newQuantity, bestAlternateFace, bestAlternateCount));
            return new AIAction("bid", newQuantity, bestAlternateFace);
        }
        
        // Strategy 3: Conservative raise - increase face value if we have at least 2
        if (currentFaceValue < 6) {
            int myCountOfNextFace = myCounts[currentFaceValue + 1];
            if (myCountOfNextFace >= 2 || (myCountOfNextFace >= 1 && analysis.confidence > 0.7)) {
                System.out.println(String.format("🧠 Conservative raise: %d of %ds (have %d)", 
                    currentQuantity, currentFaceValue + 1, myCountOfNextFace));
                return new AIAction("bid", currentQuantity, currentFaceValue + 1);
            }
        }
        
        // Strategy 4: Increase quantity by 1 (safe default)
        System.out.println(String.format("🧠 Safe raise: %d of %ds", 
            currentQuantity + 1, currentFaceValue));
        return new AIAction("bid", currentQuantity + 1, currentFaceValue);
    }
    
    /**
     * Analyze a bid using probability theory
     */
    private BidAnalysis analyzeBid(Bid bid, List<Integer> myDice, int activePlayers) {
        BidAnalysis analysis = new BidAnalysis();
        
        int targetFace = bid.getFaceValue();
        int targetQuantity = bid.getQuantity();
        
        // Count how many of this face we have
        analysis.diceInMyHand = (int) myDice.stream().filter(d -> d == targetFace).count();
        
        // Calculate remaining dice (other players' dice)
        int myTotalDice = myDice.size();
        int totalDiceInGame = activePlayers * 5; // Assuming 5 dice per player
        int otherPlayersDice = totalDiceInGame - myTotalDice;
        
        // Calculate how many more dice we need from others
        int neededFromOthers = targetQuantity - analysis.diceInMyHand;
        
        if (neededFromOthers <= 0) {
            // We already have enough! Very high confidence
            analysis.confidence = 0.95;
            analysis.probabilityTrue = 0.95;
            analysis.expectedCount = analysis.diceInMyHand;
            return analysis;
        }
        
        // Probability of rolling the target face is 1/6 per die
        // Expected count from other players = otherPlayersDice * (1/6)
        analysis.expectedCount = analysis.diceInMyHand + (otherPlayersDice / 6.0);
        
        // Calculate probability using binomial distribution approximation
        // P(X >= neededFromOthers) where X ~ Binomial(otherPlayersDice, 1/6)
        double p = 1.0 / 6.0; // Probability per die
        double expectedFromOthers = otherPlayersDice * p;
        double variance = otherPlayersDice * p * (1 - p);
        double stdDev = Math.sqrt(variance);
        
        // Use normal approximation for binomial (good for large n)
        // Z-score tells us how many standard deviations away from expected
        double zScore = (neededFromOthers - expectedFromOthers) / stdDev;
        
        // Convert Z-score to probability (approximate)
        // Negative Z = above expected (more likely), Positive Z = below expected (less likely)
        analysis.probabilityTrue = Math.max(0.05, Math.min(0.95, 0.5 - (zScore * 0.15)));
        
        // More critical confidence calculation - penalize high quantities and high face values more
        double deviation = Math.abs(targetQuantity - analysis.expectedCount);
        double baseConfidence = 1.0 - (deviation / (analysis.expectedCount + 1));
        
        // Extra penalty for high face values (5, 6) when we have none
        if (targetFace >= 5 && analysis.diceInMyHand == 0) {
            baseConfidence *= 0.8; // 20% penalty for high values with none in hand
        }
        
        // Extra penalty when quantity is much higher than expected
        if (targetQuantity > analysis.expectedCount * 1.5) {
            baseConfidence *= 0.7; // 30% penalty for quantity significantly above expected
        }
        
        analysis.confidence = Math.max(0.05, Math.min(0.95, baseConfidence));
        
        return analysis;
    }
    
    /**
     * Data class for bid analysis results
     */
    private static class BidAnalysis {
        int diceInMyHand;
        double expectedCount;
        double probabilityTrue;
        double confidence;
    }
    
    /**
     * Simulate AI thinking delay (1.5-4 seconds, slightly longer than easy AI)
     */
    public long getThinkingDelay() {
        return (long) (Math.random() * 2500) + 1500; // 1.5-4 seconds
    }
}
