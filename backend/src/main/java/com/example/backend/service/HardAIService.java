package com.example.backend.service;

import com.example.backend.model.Bid;
import com.example.backend.model.BidType;
import com.example.backend.model.Game;
import com.example.backend.model.Player;
import com.example.backend.service.hardai.AdaptiveDecisionEngine;
import com.example.backend.service.hardai.BinomialProbability;
import com.example.backend.service.hardai.HardAIHistoryStore;
import com.example.backend.service.hardai.OpponentProfiler;
import com.example.backend.service.hardai.PerformanceMonitor;
import com.example.backend.service.hardai.SimpleMLModel;
import com.example.backend.service.hardai.StrategySelector;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Hard AI facade: adaptive decisioning (HardAIImprovements.md) on top of the
 * original statistical framework (HardAI.md).
 */
@Service
public class HardAIService {

    private static final long MAX_THINKING_DELAY_MS = 10_000L;

    private final AdaptiveDecisionEngine decisionEngine;
    private final OpponentProfiler profiler;
    private final HardAIHistoryStore historyStore;
    private final PerformanceMonitor performanceMonitor;
    private final SimpleMLModel mlModel;
    private final StrategySelector strategySelector;

    private final Map<String, AIActionRecord> aiActionTracker = new ConcurrentHashMap<>();
    private final Map<String, Long> roundEndTimes = new ConcurrentHashMap<>();
    private final Map<String, String> lastRecordedReveal = new ConcurrentHashMap<>();
    private final Map<String, Integer> lastSeenRound = new ConcurrentHashMap<>();
    private final Map<String, Boolean> lastAiBluffAttempt = new ConcurrentHashMap<>();

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

    public HardAIService(
            AdaptiveDecisionEngine decisionEngine,
            OpponentProfiler profiler,
            HardAIHistoryStore historyStore,
            PerformanceMonitor performanceMonitor,
            SimpleMLModel mlModel,
            StrategySelector strategySelector) {
        this.decisionEngine = decisionEngine;
        this.profiler = profiler;
        this.historyStore = historyStore;
        this.performanceMonitor = performanceMonitor;
        this.mlModel = mlModel;
        this.strategySelector = strategySelector;
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
        return System.currentTimeMillis() - lastAction.timestamp > 1000;
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
            delay = 6500L + (long) (Math.random() * 2000);
        } else {
            delay = 1500L + (long) (Math.random() * 2000);
        }
        return Math.min(delay, MAX_THINKING_DELAY_MS);
    }

    /**
     * Main decision entry — adaptive pipeline.
     */
    public AIAction generateOptimalAction(Game game, Player aiPlayer) {
        ensureGameTracked(game);
        maybeRecordNewRound(game);
        learnFromReveal(game);

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

        String primaryOpponentId = currentBid != null
                ? currentBid.getPlayerId()
                : activePlayers.stream()
                        .filter(p -> !p.getId().equals(aiPlayer.getId()))
                        .map(Player::getId)
                        .findFirst()
                        .orElse(null);

        System.out.println(String.format(
                "🎯 HardAI analyzing: myDice=%s, active=%d, totalDice=%d, tokens=%d (oppMax=%d) metrics[%s]",
                myDice, activeCount, totalDice, myTokens, maxOpponentTokens,
                performanceMonitor.summary()));

        AdaptiveDecisionEngine.Decision decision = decisionEngine.decide(
                currentBid, myDice, activeCount, totalDice, primaryOpponentId, losing, winning);

        if ("bid".equals(decision.action()) && decision.quantity() != null && decision.faceValue() != null) {
            int myOfFace = (int) myDice.stream().filter(d -> d == decision.faceValue()).count();
            double achievability = BinomialProbability.probabilityAtLeast(
                    decision.quantity(), myOfFace, Math.max(0, totalDice - myDice.size()));
            boolean isBluff = achievability < 0.55 || myOfFace == 0;
            lastAiBluffAttempt.put(game.getId(), isBluff);

            historyStore.recordBid(game.getId(), game.getRoundNumber(), aiPlayer.getId(),
                    decision.quantity(), decision.faceValue());
            return new AIAction("bid", decision.quantity(), decision.faceValue());
        }

        lastAiBluffAttempt.put(game.getId(), false);
        return new AIAction(decision.action());
    }

    /**
     * Called by GameService after bids so profiles/history stay current.
     */
    public void onBidPlaced(Game game, Player bidder, int quantity, int faceValue, Bid previousBid) {
        if (!hasHardAi(game)) {
            return;
        }
        ensureGameTracked(game);
        maybeRecordNewRound(game);

        int activeCount = (int) game.getPlayers().stream().filter(p -> !p.isEliminated()).count();
        int totalDice = game.getPlayers().stream()
                .filter(p -> !p.isEliminated())
                .mapToInt(p -> p.getDice() != null ? p.getDice().size() : 5)
                .sum();
        int raiseAmount = previousBid == null ? quantity
                : Math.max(0, quantity - previousBid.getQuantity());
        double prior = BinomialProbability.probabilityAtLeastUnconditional(quantity, totalDice);

        profiler.recordBid(bidder.getId(), bidder.getName(), !bidder.isAI(),
                quantity, faceValue, totalDice, raiseAmount, prior);
        historyStore.recordBid(game.getId(), game.getRoundNumber(), bidder.getId(), quantity, faceValue);

        mlModel.train(profiler.get(bidder.getId()), activeCount, "RAISE");
    }

    /**
     * Learn from doubt / spot-on reveals. Safe to call repeatedly; deduped per reveal.
     */
    public void learnFromReveal(Game game) {
        Integer actual = game.getLastActualCount();
        Integer bidQty = game.getLastBidQuantity();
        Integer bidFace = game.getLastBidFaceValue();
        String bidderId = game.getLastBidPlayerId();
        if (actual == null || bidQty == null || bidderId == null) {
            return;
        }

        String key = game.getId() + ":" + game.getRoundNumber() + ":" + bidderId + ":" + bidQty
                + ":" + actual + ":" + game.getLastActionType();
        if (key.equals(lastRecordedReveal.get(game.getId()))) {
            return;
        }
        lastRecordedReveal.put(game.getId(), key);

        Player bidder = findPlayer(game, bidderId);
        String bidderName = bidder != null ? bidder.getName() : bidderId;
        boolean human = bidder == null || !bidder.isAI();

        int totalDice = game.getPlayers().stream()
                .filter(p -> !p.isEliminated() || (p.getDice() != null && !p.getDice().isEmpty()))
                .mapToInt(p -> p.getDice() != null ? p.getDice().size() : 0)
                .sum();
        if (totalDice <= 0) {
            totalDice = (int) game.getPlayers().stream().filter(p -> !p.isEliminated()).count() * 5;
        }

        boolean wasTrue = actual >= bidQty;
        double prior = BinomialProbability.probabilityAtLeastUnconditional(bidQty, totalDice);
        profiler.recordBidResolved(bidderId, bidderName, human, bidQty,
                bidFace != null ? bidFace : 1, totalDice, 0, prior, wasTrue);

        String actionPlayerId = game.getLastActionPlayerId();
        BidType actionType = game.getLastActionType();
        boolean wasSpotOn = actionType == BidType.SPOT_ON;
        boolean challengeCorrect;
        if (wasSpotOn) {
            challengeCorrect = actual == bidQty;
        } else {
            challengeCorrect = actual < bidQty;
        }

        if (actionPlayerId != null) {
            Player actor = findPlayer(game, actionPlayerId);
            String actorName = actor != null ? actor.getName() : actionPlayerId;
            boolean actorHuman = actor == null || !actor.isAI();
            if (wasSpotOn) {
                profiler.recordSpotOn(actionPlayerId, actorName, actorHuman, challengeCorrect);
            } else {
                profiler.recordDoubt(actionPlayerId, actorName, actorHuman, challengeCorrect);
            }

            // If Hard AI made the challenge, track performance
            if (actor != null && "HARD_AI".equals(actor.getAiType())) {
                if (wasSpotOn) {
                    // spot-on accuracy tracked via profiler; treat like doubt for monitor
                }
                performanceMonitor.recordDoubt(challengeCorrect);
                strategySelector.updateSimple(challengeCorrect ? 0.5 : -0.5);
            }

            int activeCount = Math.max(2, (int) game.getPlayers().stream().filter(p -> !p.isEliminated()).count());
            mlModel.train(profiler.get(actionPlayerId), activeCount, wasSpotOn ? "SPOT_ON" : "DOUBT");
        }

        // Bluff success: Hard AI's bid was challenged
        Boolean aiBluffed = lastAiBluffAttempt.get(game.getId());
        Player hardAi = game.getPlayers().stream()
                .filter(p -> "HARD_AI".equals(p.getAiType()))
                .findFirst()
                .orElse(null);
        if (hardAi != null && bidderId.equals(hardAi.getId()) && Boolean.TRUE.equals(aiBluffed)) {
            // Bluff "succeeded" if challenge failed (bid was true) OR if not challenged...
            // Here it was challenged: success if wasTrue (they wrongly doubted)
            performanceMonitor.recordBluff(wasTrue);
        }

        String stage = AdaptiveDecisionEngine.stageKey(
                (int) game.getPlayers().stream().filter(p -> !p.isEliminated()).count() + 1);
        String eliminated = game.getLastEliminatedPlayerId();
        String winnerId = null;
        if (eliminated != null) {
            winnerId = game.getPlayers().stream()
                    .filter(p -> !p.getId().equals(eliminated) && !p.isEliminated())
                    .map(Player::getId)
                    .findFirst()
                    .orElse(null);
        }

        historyStore.recordChallenge(game.getId(), game.getRoundNumber(), bidQty,
                bidFace != null ? bidFace : 0, actual, eliminated, winnerId, wasSpotOn);

        for (Player p : game.getPlayers()) {
            boolean wonRound = eliminated != null && !p.getId().equals(eliminated);
            profiler.recordRound(p.getId(), p.getName(), !p.isAI(), stage, wonRound);
        }

        System.out.println("🎯 HardAI learn: " + performanceMonitor.summary()
                + " mlAcc=" + String.format("%.0f%%", mlModel.getRecentAccuracy() * 100));
    }

    /**
     * Record game-end outcome for Hard AI win rate tracking.
     */
    public void onGameEnded(Game game) {
        if (!hasHardAi(game)) {
            return;
        }
        String winnerId = game.getGameWinner();
        Player hardAi = game.getPlayers().stream()
                .filter(p -> "HARD_AI".equals(p.getAiType()))
                .findFirst()
                .orElse(null);
        boolean aiWon = hardAi != null && hardAi.getId().equals(winnerId);
        performanceMonitor.recordGame(aiWon);
        strategySelector.updateSimple(aiWon ? 1.0 : -1.0);
        historyStore.recordGameEnd(game.getId(), winnerId, aiWon);

        for (Player p : game.getPlayers()) {
            if (hardAi != null && p.getId().equals(hardAi.getId())) {
                continue;
            }
            boolean oppWon = p.getId().equals(winnerId);
            // From Hard AI's perspective: opponent "won vs us" if they won the game
            profiler.recordGame(p.getId(), p.getName(), !p.isAI(), oppWon);
        }
    }

    public double probabilityAtLeast(int targetQty, int myCount, int unknownDice) {
        return BinomialProbability.probabilityAtLeast(targetQty, myCount, unknownDice);
    }

    public double probabilityExact(int targetQty, int myCount, int unknownDice) {
        return BinomialProbability.probabilityExact(targetQty, myCount, unknownDice);
    }

    public PerformanceMonitor getPerformanceMonitor() {
        return performanceMonitor;
    }

    public OpponentProfiler getProfiler() {
        return profiler;
    }

    private void ensureGameTracked(Game game) {
        List<String> ids = game.getPlayers().stream().map(Player::getId).toList();
        boolean aiVsHuman = game.getPlayers().stream().anyMatch(p -> !p.isAI())
                && game.getPlayers().stream().anyMatch(p -> "HARD_AI".equals(p.getAiType()));
        historyStore.ensureGame(game.getId(), ids, aiVsHuman);
        for (Player p : game.getPlayers()) {
            profiler.getOrCreate(p.getId(), p.getName(), !p.isAI());
        }
    }

    private void maybeRecordNewRound(Game game) {
        Integer prev = lastSeenRound.get(game.getId());
        if (prev != null && prev == game.getRoundNumber()) {
            return;
        }
        lastSeenRound.put(game.getId(), game.getRoundNumber());
        int active = (int) game.getPlayers().stream().filter(p -> !p.isEliminated()).count();
        int totalDice = game.getPlayers().stream()
                .filter(p -> !p.isEliminated())
                .mapToInt(p -> p.getDice() != null ? p.getDice().size() : 5)
                .sum();
        historyStore.recordRoundStart(game.getId(), game.getRoundNumber(),
                AdaptiveDecisionEngine.stageKey(active), totalDice);
    }

    private static boolean hasHardAi(Game game) {
        return game.getPlayers().stream().anyMatch(p -> "HARD_AI".equals(p.getAiType()));
    }

    private static Player findPlayer(Game game, String id) {
        return game.getPlayers().stream().filter(p -> p.getId().equals(id)).findFirst().orElse(null);
    }
}
