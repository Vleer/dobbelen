package com.example.backend.service.hardai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AdaptiveHardAIComponentsTest {

    private OpponentProfiler profiler;
    private OpponentClusterer clusterer;
    private ThresholdAdapter thresholds;
    private StrategySelector selector;
    private PatternBreaker breaker;
    private SimpleMLModel ml;
    private MixedStrategy mixed;

    @BeforeEach
    void setUp() {
        profiler = new OpponentProfiler();
        clusterer = new OpponentClusterer();
        thresholds = new ThresholdAdapter();
        selector = new StrategySelector();
        breaker = new PatternBreaker();
        ml = new SimpleMLModel();
        mixed = new MixedStrategy();
    }

    @Test
    void classifiesAggressiveBluffer() {
        OpponentProfile p = profiler.getOrCreate("agg", "Aggro", true);
        for (int i = 0; i < 12; i++) {
            p.recordBidResolved(6 + i % 3, 6, 20, 2, 0.15, false);
        }
        for (int i = 0; i < 3; i++) {
            p.recordDoubt(true);
        }
        OpponentCluster cluster = clusterer.classify(p);
        assertEquals(OpponentCluster.AGGRESSIVE_BLUFFER, cluster);
        CounterStrategy cs = clusterer.getCounterStrategy(cluster);
        assertTrue(cs.doubtThreshold() < 0.35);
        assertEquals(StrategyType.DOUBT_FOCUSED, cs.preferredStyle());
    }

    @Test
    void classifiesConservativeHonest() {
        OpponentProfile p = profiler.getOrCreate("safe", "Safe", true);
        for (int i = 0; i < 12; i++) {
            p.recordBidResolved(2, 3, 20, 1, 0.8, true);
        }
        OpponentCluster cluster = clusterer.classify(p);
        assertEquals(OpponentCluster.CONSERVATIVE_HONEST, cluster);
        CounterStrategy cs = clusterer.getCounterStrategy(cluster);
        assertTrue(cs.bluffFrequency() >= 0.4);
        assertEquals(StrategyType.TRAP_BLUFF, cs.preferredStyle());
    }

    @Test
    void adaptsDoubtThresholdForReliableBidder() {
        OpponentProfile p = profiler.getOrCreate("rel", "Reliable", true);
        for (int i = 0; i < 10; i++) {
            p.recordBidResolved(2, 2, 16, 1, 0.7, true);
        }
        double adapted = thresholds.adjustedDoubtThreshold(0.20, p,
                clusterer.getCounterStrategy(clusterer.classify(p)));
        assertTrue(adapted > 0.15, "Should trust reliable bidders more, got " + adapted);
        assertTrue(adapted <= 0.45);
    }

    @Test
    void lowersDoubtThresholdForBluffers() {
        OpponentProfile p = profiler.getOrCreate("bluff", "Bluffer", true);
        for (int i = 0; i < 10; i++) {
            p.recordBidResolved(8, 6, 16, 3, 0.1, false);
        }
        double adapted = thresholds.adjustedDoubtThreshold(0.20, p,
                clusterer.getCounterStrategy(OpponentCluster.AGGRESSIVE_BLUFFER));
        assertTrue(adapted < 0.30, "Should doubt bluffers more, got " + adapted);
    }

    @Test
    void bluffRateHigherAtFourPlayers() {
        double r4 = thresholds.targetBluffRate(null, "4_player", null);
        double r2 = thresholds.targetBluffRate(null, "2_player", null);
        assertTrue(r4 > r2);
        assertTrue(r4 >= 0.20);
        assertTrue(r2 <= 0.15);
    }

    @Test
    void patternBreakerDetectsRepetition() {
        for (int i = 0; i < 5; i++) {
            breaker.record("doubt");
        }
        assertTrue(breaker.detectPatterns());
        String broken = breaker.maybeBreak("doubt", true, true, true);
        // May be null ~50% of the time; force by checking alternatives exist when non-null
        if (broken != null) {
            assertNotEquals("doubt", broken);
        }
    }

    @Test
    void mixedStrategyRespectsProbabilityExtremes() {
        assertTrue(mixed.calculateBluffProbability(0.9, 0.25) < 0.15);
        assertEquals(0.25, mixed.calculateBluffProbability(0.5, 0.25), 1e-9);
    }

    @Test
    void strategySelectorReturnsStrategy() {
        StrategyType s = selector.selectStrategy(
                OpponentCluster.NOVICE_RANDOM, "4_player",
                clusterer.getCounterStrategy(OpponentCluster.NOVICE_RANDOM), 0.0);
        assertNotNull(s);
        selector.updateSimple(1.0);
        assertNotNull(selector.getCurrentStrategy());
    }

    @Test
    void mlModelPredictsDistribution() {
        OpponentProfile p = profiler.getOrCreate("ml", "ML", true);
        for (int i = 0; i < 5; i++) {
            p.recordDoubt(true);
            p.recordRoundPlayed();
        }
        var probs = ml.predictOpponentAction(p, 4);
        assertEquals(3, probs.size());
        double sum = probs.values().stream().mapToDouble(d -> d).sum();
        assertEquals(1.0, sum, 1e-6);
        ml.train(p, 4, "DOUBT");
        assertTrue(ml.getRecentAccuracy() >= 0);
    }

    @Test
    void historyStoreRecordsBidsAndChallenges() {
        HardAIHistoryStore store = new HardAIHistoryStore();
        store.ensureGame("g1", java.util.List.of("a", "b"), true);
        store.recordRoundStart("g1", 1, "4_player", 20);
        store.recordBid("g1", 1, "a", 3, 4);
        store.recordChallenge("g1", 1, 3, 4, 2, "a", "b", false);
        assertEquals(1, store.bidCount());
        assertTrue(store.bluffFrequency("a", 10) > 0);
    }
}
