package com.example.backend.service;

import com.example.backend.model.Bid;
import com.example.backend.model.Game;
import com.example.backend.model.GameRules;
import com.example.backend.model.Player;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Optimal Liar's Dice AI implementing the HardAI design document:
 * binomial probability model, doubt/raise/spot-on scoring, bluffing tiers,
 * player-count thresholds, and light per-player reliability tracking.
 */
@Service
public class HardAIService {

    // --- Tuning parameters (section 9) ---
    private static final double DOUBT_THRESHOLD_4P = 0.20;
    private static final double DOUBT_THRESHOLD_3P = 0.15;
    private static final double DOUBT_THRESHOLD_2P = 0.08;
    private static final double BLUFF_THRESHOLD = 0.45;
    private static final double SPOT_ON_CONFIDENCE = 0.70;
    private static final double SPOT_ON_ENDGAME_CONFIDENCE = 0.55;
    private static final double PLAYER_RELIABILITY_WEIGHT = 0.15;
    private static final double AGGRESSION_BOOST = 1.2;
    private static final long MAX_THINKING_DELAY_MS = 10_000L;

    private static final int MAX_DICE_CACHE = 40;

    /** Precomputed P(X >= k) for X ~ Binomial(n, 1/6). Indexed [n][k]. */
    private final double[][] atLeastProbCache;
    /** Precomputed P(X == k) for X ~ Binomial(n, 1/6). Indexed [n][k]. */
    private final double[][] exactProbCache;

    private final Map<String, AIActionRecord> aiActionTracker = new ConcurrentHashMap<>();
    private final Map<String, Long> roundEndTimes = new ConcurrentHashMap<>();
    private final Map<String, PlayerStats> playerStats = new ConcurrentHashMap<>();
    private final Map<String, String> lastRecordedReveal = new ConcurrentHashMap<>();

    private static class AIActionRecord {
        final String gameId;
        final int roundNumber;
        final String currentPlayerId;
        final long timestamp;

        AIActionRecord(String gameId, int roundNumber, String currentPlayerId, long timestamp) {
            this.gameId = gameId;
            this.roundNumber = roundNumber;
            this.currentPlayerId = currentPlayerId;
            this.timestamp = timestamp;
        }
    }

    private static class PlayerStats {
        int bidsResolved;
        int bidsTrue; // bid quantity was achievable (actual >= bid)
        int implausibleBids; // bids with prior P < 30%
        int doubtsMade;
        int doubtsCorrect;

        double bidAccuracy() {
            if (bidsResolved == 0) {
                return 0.75; // mildly optimistic prior
            }
            return (double) bidsTrue / bidsResolved;
        }

        double bluffRate() {
            if (bidsResolved == 0) {
                return 0.2;
            }
            return (double) implausibleBids / bidsResolved;
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

        public String getAction() {
            return action;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public Integer getFaceValue() {
            return faceValue;
        }
    }

    private static class ScoredBid {
        final int quantity;
        final int faceValue;
        final double score;
        final double achievability;

        ScoredBid(int quantity, int faceValue, double score, double achievability) {
            this.quantity = quantity;
            this.faceValue = faceValue;
            this.score = score;
            this.achievability = achievability;
        }
    }

    public HardAIService() {
        atLeastProbCache = new double[MAX_DICE_CACHE + 1][];
        exactProbCache = new double[MAX_DICE_CACHE + 1][];
        for (int n = 0; n <= MAX_DICE_CACHE; n++) {
            atLeastProbCache[n] = new double[n + 1];
            exactProbCache[n] = new double[n + 1];
            for (int k = 0; k <= n; k++) {
                exactProbCache[n][k] = binomialExact(n, k, 1.0 / 6.0);
            }
            // P(X >= k) = sum_{i=k..n} P(X=i)
            atLeastProbCache[n][n] = exactProbCache[n][n];
            for (int k = n - 1; k >= 0; k--) {
                atLeastProbCache[n][k] = atLeastProbCache[n][k + 1] + exactProbCache[n][k];
            }
        }
    }

    public boolean canAIAct(String gameId, int roundNumber, String currentPlayerId) {
        AIActionRecord lastAction = aiActionTracker.get(currentPlayerId);
        if (lastAction == null) {
            return true;
        }
        if (!lastAction.gameId.equals(gameId)
                || lastAction.roundNumber != roundNumber
                || !lastAction.currentPlayerId.equals(currentPlayerId)) {
            return true;
        }
        long timeSinceLastAction = System.currentTimeMillis() - lastAction.timestamp;
        return timeSinceLastAction > 1000;
    }

    public void markAIAction(String gameId, int roundNumber, String currentPlayerId) {
        aiActionTracker.put(currentPlayerId,
                new AIActionRecord(gameId, roundNumber, currentPlayerId, System.currentTimeMillis()));
    }

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
        return System.currentTimeMillis() - endTime >= 8000;
    }

    public void clearRoundTracking(String gameId) {
        roundEndTimes.remove(gameId);
    }

    /**
     * Thinking delay capped at 10 seconds.
     * First turn: 6.5–8.5s; otherwise 1.5–3.5s.
     */
    public long getThinkingDelay(boolean isFirstTurn) {
        long delay;
        if (isFirstTurn) {
            delay = 6500L + (long) (Math.random() * 2000); // 6.5–8.5s
        } else {
            delay = 1500L + (long) (Math.random() * 2000); // 1.5–3.5s
        }
        return Math.min(delay, MAX_THINKING_DELAY_MS);
    }

    /**
     * Main decision entry point — implements the section 6/11 decision tree.
     */
    public AIAction generateOptimalAction(Game game, Player aiPlayer) {
        maybeUpdatePlayerStats(game);

        Bid currentBid = game.getCurrentBid();
        List<Integer> myDice = aiPlayer.getDice() != null ? aiPlayer.getDice() : List.of();
        List<Player> activePlayers = game.getPlayers().stream()
                .filter(p -> !p.isEliminated())
                .toList();
        int activeCount = activePlayers.size();
        int totalDice = activePlayers.stream()
                .mapToInt(p -> p.getDice() != null ? p.getDice().size() : 0)
                .sum();
        if (totalDice <= 0) {
            totalDice = activeCount * 5;
        }

        int myTokens = aiPlayer.getWinTokens();
        int maxOpponentTokens = activePlayers.stream()
                .filter(p -> !p.getId().equals(aiPlayer.getId()))
                .mapToInt(Player::getWinTokens)
                .max()
                .orElse(0);
        boolean losing = myTokens < maxOpponentTokens;
        boolean winning = myTokens > maxOpponentTokens;

        System.out.println(String.format(
                "🎯 HardAI analyzing: myDice=%s, active=%d, totalDice=%d, tokens=%d (oppMax=%d)",
                myDice, activeCount, totalDice, myTokens, maxOpponentTokens));

        if (currentBid == null) {
            return makeFirstBid(myDice, totalDice);
        }

        int bidQty = currentBid.getQuantity();
        int bidFace = currentBid.getFaceValue();
        int myCount = countFace(myDice, bidFace);
        int unknownDice = Math.max(0, totalDice - myDice.size());

        double pAtLeast = probabilityAtLeast(bidQty, myCount, unknownDice);
        double pExact = probabilityExact(bidQty, myCount, unknownDice);
        double implausibility = 1.0 - pAtLeast;

        PlayerStats bidderStats = currentBid.getPlayerId() != null
                ? playerStats.computeIfAbsent(currentBid.getPlayerId(), id -> new PlayerStats())
                : new PlayerStats();

        double doubtThreshold = baseDoubtThreshold(activeCount);
        // Reliability: trustworthy bidders → higher threshold (harder to doubt)
        doubtThreshold *= (1.0 + PLAYER_RELIABILITY_WEIGHT * (bidderStats.bidAccuracy() - 0.5) * 2);
        // Position: losing → more aggressive (lower doubt threshold)
        if (losing) {
            doubtThreshold *= 0.85;
        } else if (winning) {
            doubtThreshold *= 1.15;
        }
        doubtThreshold = Math.max(0.03, Math.min(0.45, doubtThreshold));

        double bluffThreshold = BLUFF_THRESHOLD;
        // Against aggressive (high bluff rate) opponents, bluff more freely
        bluffThreshold *= (1.0 - 0.3 * bidderStats.bluffRate());
        if (losing) {
            bluffThreshold *= 0.9;
        }
        bluffThreshold = Math.max(0.30, Math.min(0.60, bluffThreshold));

        System.out.println(String.format(
                "🎯 Bid %d of %ds: P(>=)=%.1f%% P(exact)=%.1f%% doubtT=%.1f%% bluffT=%.1f%% (bidderAcc=%.0f%%)",
                bidQty, bidFace, pAtLeast * 100, pExact * 100, doubtThreshold * 100, bluffThreshold * 100,
                bidderStats.bidAccuracy() * 100));

        List<ScoredBid> raiseCandidates = scoreValidRaises(
                currentBid, myDice, totalDice, unknownDice, bluffThreshold, activeCount);

        double bestRaiseScore = raiseCandidates.isEmpty() ? Double.NEGATIVE_INFINITY : raiseCandidates.get(0).score;
        boolean canRaiseSafely = !raiseCandidates.isEmpty() && bestRaiseScore > 0;

        double doubtScore = scoreDoubt(pAtLeast, doubtThreshold, activeCount, losing);
        double spotOnScore = scoreSpotOn(pExact, activeCount, losing, winning, implausibility);

        System.out.println(String.format(
                "🎯 Scores: doubt=%.1f spotOn=%.1f bestRaise=%.1f canRaiseSafely=%s",
                doubtScore, spotOnScore, bestRaiseScore, canRaiseSafely));

        // Section 11 flowchart + section 6 decision tree
        if (pAtLeast > 0.80 && canRaiseSafely) {
            return toBidAction(raiseCandidates.get(0));
        }

        if (pAtLeast >= 0.40 && pAtLeast <= 0.80) {
            if (canRaiseSafely && (winning || bestRaiseScore >= doubtScore)) {
                return toBidAction(raiseCandidates.get(0));
            }
            if (doubtScore >= spotOnScore) {
                return new AIAction("doubt");
            }
            return new AIAction("spotOn");
        }

        if (pAtLeast >= 0.20 && pAtLeast < 0.40) {
            // Suspicious — prefer doubt unless a strong raise or spot-on
            if (spotOnScore > doubtScore && spotOnScore > 50) {
                return new AIAction("spotOn");
            }
            if (canRaiseSafely && bestRaiseScore > doubtScore + 20) {
                return toBidAction(raiseCandidates.get(0));
            }
            return new AIAction("doubt");
        }

        // pAtLeast < 0.20 — very implausible
        if (spotOnScore > doubtScore && pExact > SPOT_ON_ENDGAME_CONFIDENCE) {
            return new AIAction("spotOn");
        }
        if (canRaiseSafely && bestRaiseScore > 80 && activeCount >= 4) {
            // Rare: still raise if somehow very safe alternate face
            return toBidAction(raiseCandidates.get(0));
        }
        return new AIAction("doubt");
    }

    // --- Scoring (section 7.3) ---

    private double scoreDoubt(double pAtLeast, double doubtThreshold, int activeCount, boolean losing) {
        double pFails = 1.0 - pAtLeast;
        double winValue = activeCount <= 2 ? 1.2 : (activeCount == 3 ? 1.0 : 0.8);
        double loseValue = activeCount <= 2 ? 1.5 : 1.0;
        if (losing) {
            winValue *= 1.1;
        }
        double ev = pFails * winValue - pAtLeast * loseValue;
        // Boost when below doubt threshold
        if (pAtLeast < doubtThreshold) {
            ev += 0.5;
        }
        if (pAtLeast < doubtThreshold * 0.5) {
            ev += 0.5;
        }
        return ev * 100;
    }

    private double scoreSpotOn(double pExact, int activeCount, boolean losing, boolean winning,
            double implausibility) {
        // Spot on is rarely optimal; need high exact confidence
        double threshold = SPOT_ON_CONFIDENCE;
        if (losing || activeCount <= 2) {
            threshold = SPOT_ON_ENDGAME_CONFIDENCE;
        } else if (winning) {
            threshold = 0.65;
        }

        if (pExact < threshold) {
            // Bidder trap exception: low achievability but non-trivial exact chance
            if (!(implausibility > 0.80 && pExact > 0.30 && activeCount <= 3)) {
                return -1000;
            }
        }

        double bigWin = activeCount; // eliminates everyone else on success
        double wrongLoss = activeCount <= 2 ? 1.5 : 1.0;
        return pExact * bigWin * 80 - (1.0 - pExact) * wrongLoss * 60;
    }

    private List<ScoredBid> scoreValidRaises(Bid currentBid, List<Integer> myDice, int totalDice,
            int unknownDice, double bluffThreshold, int activeCount) {
        List<ScoredBid> scored = new ArrayList<>();
        int[] myCounts = faceCounts(myDice);
        int currentQty = currentBid.getQuantity();

        for (int face = 1; face <= 6; face++) {
            for (int qty = 1; qty <= totalDice; qty++) {
                if (!isValidRaise(qty, face, currentBid)) {
                    continue;
                }
                double achievability = probabilityAtLeast(qty, myCounts[face], unknownDice);
                double score;

                if (achievability > 0.90) {
                    score = 100;
                } else if (achievability > 0.75) {
                    score = 50;
                } else if (achievability > 0.60) {
                    score = 25;
                } else if (achievability > bluffThreshold) {
                    score = bluffScore(qty, face, myCounts[face], achievability, currentQty, activeCount);
                } else if (achievability > 0.30 && activeCount >= 4 && qty == currentQty + 1) {
                    // Tier 3 aggression bluff — rare, small bonus only early
                    score = -20 + achievability * 40;
                } else {
                    continue; // skip suicide bids
                }

                // Signal: prefer faces we hold
                score += myCounts[face] * 8;
                // Prefer minimal raises (safer)
                int qtyJump = qty - currentBid.getQuantity();
                if (qtyJump == 0 && face > currentBid.getFaceValue()) {
                    score += 5; // same count, higher face
                } else if (qtyJump == 1) {
                    score += 3;
                } else if (qtyJump > 2) {
                    score -= qtyJump * 5;
                }
                // Against passive tables, slight aggression boost
                if (activeCount >= 4) {
                    score *= AGGRESSION_BOOST / 1.1;
                }

                scored.add(new ScoredBid(qty, face, score, achievability));
            }
        }

        scored.sort((a, b) -> Double.compare(b.score, a.score));
        return scored;
    }

    private double bluffScore(int qty, int face, int myCount, double achievability, int currentQty,
            int activeCount) {
        // Tier 2 statistical bluff
        double score = achievability * 40;
        if (myCount >= 1) {
            score += 15; // justified aggression
        }
        if (qty <= currentQty + 1) {
            score += 10; // small raise is more believable
        }
        if (activeCount >= 4) {
            score += 8; // more dice → more room to bluff
        }
        return score;
    }

    private AIAction makeFirstBid(List<Integer> myDice, int totalDice) {
        int[] counts = faceCounts(myDice);
        int bestFace = 1;
        int bestCount = counts[1];
        for (int face = 2; face <= 6; face++) {
            if (counts[face] > bestCount || (counts[face] == bestCount && face > bestFace)) {
                bestCount = counts[face];
                bestFace = face;
            }
        }

        // Safe opening: bid our strongest face at a quantity we can often back
        int quantity = Math.max(1, Math.min(bestCount + 1, Math.max(1, totalDice / 4)));
        // Prefer starting modestly (section 5 / first bidder guidance)
        if (bestCount == 0) {
            quantity = 1;
            bestFace = 1 + (int) (Math.random() * 6);
        } else if (bestCount == 1) {
            quantity = 1;
        } else {
            quantity = Math.min(2, bestCount);
        }

        System.out.println(String.format("🎯 First bid: %d of %ds (have %d)", quantity, bestFace, bestCount));
        return new AIAction("bid", quantity, bestFace);
    }

    // --- Probability helpers ---

    /** P(total showing face >= targetQty | myCount known, unknownDice random). */
    public double probabilityAtLeast(int targetQty, int myCount, int unknownDice) {
        int needed = targetQty - myCount;
        if (needed <= 0) {
            return 1.0;
        }
        if (needed > unknownDice) {
            return 0.0;
        }
        return cachedAtLeast(unknownDice, needed);
    }

    /** P(total showing face == targetQty | myCount known, unknownDice random). */
    public double probabilityExact(int targetQty, int myCount, int unknownDice) {
        int needed = targetQty - myCount;
        if (needed < 0 || needed > unknownDice) {
            return 0.0;
        }
        return cachedExact(unknownDice, needed);
    }

    private double cachedAtLeast(int n, int k) {
        if (n < 0 || k < 0) {
            return 0.0;
        }
        if (k == 0) {
            return 1.0;
        }
        if (k > n) {
            return 0.0;
        }
        if (n <= MAX_DICE_CACHE) {
            return atLeastProbCache[n][k];
        }
        return binomialAtLeast(n, k, 1.0 / 6.0);
    }

    private double cachedExact(int n, int k) {
        if (n < 0 || k < 0 || k > n) {
            return 0.0;
        }
        if (n <= MAX_DICE_CACHE) {
            return exactProbCache[n][k];
        }
        return binomialExact(n, k, 1.0 / 6.0);
    }

    private static double binomialExact(int n, int k, double p) {
        if (k < 0 || k > n) {
            return 0.0;
        }
        // Compute in log space for stability, then exp
        double logProb = logBinomialCoeff(n, k) + k * Math.log(p) + (n - k) * Math.log(1.0 - p);
        return Math.exp(logProb);
    }

    private static double binomialAtLeast(int n, int k, double p) {
        double sum = 0.0;
        for (int i = k; i <= n; i++) {
            sum += binomialExact(n, i, p);
        }
        return Math.min(1.0, sum);
    }

    private static double logBinomialCoeff(int n, int k) {
        if (k < 0 || k > n) {
            return Double.NEGATIVE_INFINITY;
        }
        k = Math.min(k, n - k);
        double log = 0.0;
        for (int i = 1; i <= k; i++) {
            log += Math.log(n - k + i) - Math.log(i);
        }
        return log;
    }

    private static boolean isValidRaise(int quantity, int faceValue, Bid previousBid) {
        Bid candidate = new Bid(null, quantity, faceValue, null);
        return GameRules.isBidValid(candidate, previousBid);
    }

    private static int countFace(List<Integer> dice, int face) {
        int c = 0;
        for (int d : dice) {
            if (d == face) {
                c++;
            }
        }
        return c;
    }

    private static int[] faceCounts(List<Integer> dice) {
        int[] counts = new int[7];
        for (int d : dice) {
            if (d >= 1 && d <= 6) {
                counts[d]++;
            }
        }
        return counts;
    }

    private static AIAction toBidAction(ScoredBid bid) {
        System.out.println(String.format("🎯 RAISE: %d of %ds (score=%.1f, P=%.1f%%)",
                bid.quantity, bid.faceValue, bid.score, bid.achievability * 100));
        return new AIAction("bid", bid.quantity, bid.faceValue);
    }

    private double baseDoubtThreshold(int activeCount) {
        if (activeCount <= 2) {
            return DOUBT_THRESHOLD_2P;
        }
        if (activeCount == 3) {
            return DOUBT_THRESHOLD_3P;
        }
        return DOUBT_THRESHOLD_4P;
    }

    /**
     * Update per-player bid accuracy from the last doubt/spot-on reveal.
     */
    private void maybeUpdatePlayerStats(Game game) {
        Integer actual = game.getLastActualCount();
        Integer bidQty = game.getLastBidQuantity();
        String bidderId = game.getLastBidPlayerId();
        if (actual == null || bidQty == null || bidderId == null) {
            return;
        }
        String key = game.getId() + ":" + game.getRoundNumber() + ":" + bidderId + ":" + bidQty + ":" + actual;
        if (key.equals(lastRecordedReveal.get(game.getId()))) {
            return;
        }
        lastRecordedReveal.put(game.getId(), key);

        PlayerStats stats = playerStats.computeIfAbsent(bidderId, id -> new PlayerStats());
        stats.bidsResolved++;
        boolean wasTrue = actual >= bidQty;
        if (wasTrue) {
            stats.bidsTrue++;
        }
        // Approximate: if actual was much lower than bid, treat as bluff signal
        if (actual < bidQty) {
            stats.implausibleBids++;
        }

        System.out.println(String.format(
                "🎯 Stats update for %s: accuracy=%.0f%% (%d/%d), bluffRate=%.0f%%",
                bidderId.substring(0, Math.min(8, bidderId.length())),
                stats.bidAccuracy() * 100, stats.bidsTrue, stats.bidsResolved,
                stats.bluffRate() * 100));
    }
}
