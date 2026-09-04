package com.example.backend.service.hardai;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Per-opponent behavioral profile used for adaptive Hard AI decisions.
 * See HardAIImprovements.md section 2.
 */
public class OpponentProfile {

    public static class BidRecord {
        public final int quantity;
        public final int face;
        public final int totalDice;
        public final int raiseAmount;
        public final double priorAchievability;
        public final boolean wasTrue;
        public final boolean wasBluff;
        public final long timestamp;

        public BidRecord(int quantity, int face, int totalDice, int raiseAmount,
                double priorAchievability, boolean wasTrue, boolean wasBluff) {
            this.quantity = quantity;
            this.face = face;
            this.totalDice = totalDice;
            this.raiseAmount = raiseAmount;
            this.priorAchievability = priorAchievability;
            this.wasTrue = wasTrue;
            this.wasBluff = wasBluff;
            this.timestamp = System.currentTimeMillis();
        }
    }

    private final String playerId;
    private final String name;
    private final boolean human;

    private int totalGamesPlayed;
    private int totalRoundsPlayed;
    private int totalBidsMade;
    private int totalDoubtsMade;
    private int totalSpotOnsMade;

    private int bidsThatWereTrue;
    private int bidsThatWereFalse;
    private int doubtsCorrect;
    private int doubtsIncorrect;
    private int spotOnsCorrect;
    private int spotOnsIncorrect;

    private final Map<Integer, Integer> bidDistribution = new HashMap<>();
    private final Map<Integer, Integer> facePreferences = new HashMap<>();
    private int totalDiceObserved;

    private final Deque<Double> recentSuccessRate = new ArrayDeque<>();
    private final Map<String, int[]> stagePerformance = new HashMap<>(); // wins/losses

    private final List<BidRecord> bidHistory = new ArrayList<>();
    private static final int MAX_BID_HISTORY = 100;

    private int winsVsHardAi;
    private int lossesVsHardAi;

    private double confidenceInProfile = 0.5;
    private long lastUpdated = System.currentTimeMillis();

    public OpponentProfile(String playerId, String name, boolean human) {
        this.playerId = playerId;
        this.name = name != null ? name : playerId;
        this.human = human;
        for (String stage : List.of("4_player", "3_player", "2_player")) {
            stagePerformance.put(stage, new int[] { 0, 0 });
        }
    }

    public String getPlayerId() {
        return playerId;
    }

    public String getName() {
        return name;
    }

    public boolean isHuman() {
        return human;
    }

    public int getTotalGamesPlayed() {
        return totalGamesPlayed;
    }

    public int getTotalRoundsPlayed() {
        return totalRoundsPlayed;
    }

    public int getTotalBidsMade() {
        return totalBidsMade;
    }

    public int getTotalDoubtsMade() {
        return totalDoubtsMade;
    }

    public int getTotalSpotOnsMade() {
        return totalSpotOnsMade;
    }

    public int getBidsThatWereTrue() {
        return bidsThatWereTrue;
    }

    public int getBidsThatWereFalse() {
        return bidsThatWereFalse;
    }

    public List<BidRecord> getBidHistory() {
        return bidHistory;
    }

    public Map<Integer, Integer> getBidDistribution() {
        return bidDistribution;
    }

    public Map<Integer, Integer> getFacePreferences() {
        return facePreferences;
    }

    public int getTotalDiceObserved() {
        return totalDiceObserved;
    }

    public double getConfidenceInProfile() {
        return confidenceInProfile;
    }

    public void recordRoundPlayed() {
        totalRoundsPlayed++;
        bumpConfidence(0.01);
    }

    public void recordGamePlayed(boolean won) {
        totalGamesPlayed++;
        if (won) {
            winsVsHardAi++;
        } else {
            lossesVsHardAi++;
        }
        bumpConfidence(0.02);
    }

    public void recordStageOutcome(String stage, boolean won) {
        int[] wl = stagePerformance.computeIfAbsent(stage, s -> new int[] { 0, 0 });
        if (won) {
            wl[0]++;
        } else {
            wl[1]++;
        }
    }

    public void recordRecentSuccess(boolean success) {
        recentSuccessRate.addLast(success ? 1.0 : 0.0);
        while (recentSuccessRate.size() > 10) {
            recentSuccessRate.removeFirst();
        }
    }

    public void recordBidMade(int quantity, int face, int totalDice, int raiseAmount,
            double priorAchievability) {
        totalBidsMade++;
        totalDiceObserved += totalDice;
        bidDistribution.merge(quantity, 1, Integer::sum);
        facePreferences.merge(face, 1, Integer::sum);
        // outcome filled later on reveal; provisional record without outcome
        addBidRecord(new BidRecord(quantity, face, totalDice, raiseAmount, priorAchievability,
                false, priorAchievability < 0.4));
        bumpConfidence(0.005);
    }

    public void recordBidResolved(int quantity, int face, int totalDice, int raiseAmount,
            double priorAchievability, boolean wasTrue) {
        totalBidsMade++;
        totalDiceObserved += totalDice;
        bidDistribution.merge(quantity, 1, Integer::sum);
        facePreferences.merge(face, 1, Integer::sum);
        if (wasTrue) {
            bidsThatWereTrue++;
        } else {
            bidsThatWereFalse++;
        }
        addBidRecord(new BidRecord(quantity, face, totalDice, raiseAmount, priorAchievability,
                wasTrue, !wasTrue));
        recordRecentSuccess(wasTrue);
        bumpConfidence(0.015);
    }

    public void recordDoubt(boolean correct) {
        totalDoubtsMade++;
        if (correct) {
            doubtsCorrect++;
        } else {
            doubtsIncorrect++;
        }
        bumpConfidence(0.01);
    }

    public void recordSpotOn(boolean correct) {
        totalSpotOnsMade++;
        if (correct) {
            spotOnsCorrect++;
        } else {
            spotOnsIncorrect++;
        }
        bumpConfidence(0.01);
    }

    private void addBidRecord(BidRecord record) {
        bidHistory.add(record);
        while (bidHistory.size() > MAX_BID_HISTORY) {
            bidHistory.remove(0);
        }
        lastUpdated = System.currentTimeMillis();
    }

    private void bumpConfidence(double delta) {
        confidenceInProfile = Math.min(1.0, confidenceInProfile + delta);
        lastUpdated = System.currentTimeMillis();
    }

    public double bidAccuracy() {
        int total = bidsThatWereTrue + bidsThatWereFalse;
        if (total == 0) {
            return 0.55; // mildly optimistic prior
        }
        return (double) bidsThatWereTrue / total;
    }

    public double doubtAccuracy() {
        int total = doubtsCorrect + doubtsIncorrect;
        if (total == 0) {
            return 0.5;
        }
        return (double) doubtsCorrect / total;
    }

    public double spotOnAccuracy() {
        int total = spotOnsCorrect + spotOnsIncorrect;
        if (total == 0) {
            return 0.5;
        }
        return (double) spotOnsCorrect / total;
    }

    public double doubtFrequency() {
        if (totalRoundsPlayed == 0) {
            return 0.25;
        }
        return (double) totalDoubtsMade / totalRoundsPlayed;
    }

    public double winRateVsHardAi() {
        int total = winsVsHardAi + lossesVsHardAi;
        if (total == 0) {
            return 0.5;
        }
        return (double) winsVsHardAi / total;
    }

    public double recentForm() {
        if (recentSuccessRate.isEmpty()) {
            return 0.5;
        }
        double sum = 0;
        for (double v : recentSuccessRate) {
            sum += v;
        }
        return sum / recentSuccessRate.size();
    }

    /** 0 = always safe, 100 = always aggressive. */
    public double aggressionScore() {
        if (bidHistory.isEmpty()) {
            return 40;
        }
        double avgBid = 0;
        for (BidRecord b : bidHistory) {
            avgBid += b.quantity;
        }
        avgBid /= bidHistory.size();
        double expected = totalDiceObserved > 0
                ? (double) totalDiceObserved / Math.max(1, bidHistory.size()) / 4.0
                : 2.5;
        double aggression = (avgBid / Math.max(0.5, expected)) * 50;

        long bigRaises = bidHistory.stream().filter(b -> b.raiseAmount > 1).count();
        aggression += ((double) bigRaises / bidHistory.size()) * 50;
        return Math.min(100, Math.max(0, aggression));
    }

    /** Willingness to bid into low-probability territory (0–100). */
    public double riskTolerance() {
        if (bidHistory.isEmpty()) {
            return 30;
        }
        long risky = bidHistory.stream().filter(b -> b.priorAchievability < 0.4).count();
        return ((double) risky / bidHistory.size()) * 100;
    }

    public double estimateBluffFrequency() {
        int total = Math.max(1, bidsThatWereTrue + bidsThatWereFalse);
        double failureRate = (double) bidsThatWereFalse / total;
        double aggression = aggressionScore();
        if (aggression < 30) {
            return failureRate * 0.6;
        }
        if (aggression > 70) {
            return Math.min(1.0, failureRate * 1.4);
        }
        return failureRate;
    }

    public double bidVariance() {
        if (bidHistory.size() < 2) {
            return 0.3;
        }
        double mean = bidHistory.stream().mapToInt(b -> b.quantity).average().orElse(0);
        double var = 0;
        for (BidRecord b : bidHistory) {
            double d = b.quantity - mean;
            var += d * d;
        }
        var /= bidHistory.size();
        // Normalize roughly to 0–1 for clustering
        return Math.min(1.0, Math.sqrt(var) / 3.0);
    }

    public long getLastUpdated() {
        return lastUpdated;
    }
}
