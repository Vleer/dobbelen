package com.example.backend.service.hardai;

import com.example.backend.model.Bid;
import com.example.backend.model.GameRules;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Adaptive decision pipeline (HardAIImprovements.md section 7).
 * Combines statistical EV with opponent profiling, clustering, strategy
 * selection, mixed bluffing, and pattern breaking.
 */
@Component
public class AdaptiveDecisionEngine {

    public record Decision(String action, Integer quantity, Integer faceValue, String strategy,
            String cluster, double doubtThreshold, double bluffRate) {
        public static Decision bid(int q, int f, String strategy, String cluster, double dt, double br) {
            return new Decision("bid", q, f, strategy, cluster, dt, br);
        }

        public static Decision of(String action, String strategy, String cluster, double dt, double br) {
            return new Decision(action, null, null, strategy, cluster, dt, br);
        }
    }

    public record ScoredBid(int quantity, int faceValue, double score, double achievability,
            boolean isBluff) {
    }

    private final OpponentProfiler profiler;
    private final OpponentClusterer clusterer;
    private final ThresholdAdapter thresholdAdapter;
    private final MixedStrategy mixedStrategy;
    private final PatternBreaker patternBreaker;
    private final SimpleMLModel mlModel;
    private final StrategySelector strategySelector;
    private final PatternRecognizer patternRecognizer;
    private final PerformanceMonitor performanceMonitor;

    public AdaptiveDecisionEngine(
            OpponentProfiler profiler,
            OpponentClusterer clusterer,
            ThresholdAdapter thresholdAdapter,
            MixedStrategy mixedStrategy,
            PatternBreaker patternBreaker,
            SimpleMLModel mlModel,
            StrategySelector strategySelector,
            PatternRecognizer patternRecognizer,
            PerformanceMonitor performanceMonitor) {
        this.profiler = profiler;
        this.clusterer = clusterer;
        this.thresholdAdapter = thresholdAdapter;
        this.mixedStrategy = mixedStrategy;
        this.patternBreaker = patternBreaker;
        this.mlModel = mlModel;
        this.strategySelector = strategySelector;
        this.patternRecognizer = patternRecognizer;
        this.performanceMonitor = performanceMonitor;
    }

    public Decision decide(
            Bid currentBid,
            List<Integer> myDice,
            int activeCount,
            int totalDice,
            String primaryOpponentId,
            boolean losing,
            boolean winning) {

        String stage = stageKey(activeCount);
        OpponentProfile profile = primaryOpponentId != null ? profiler.get(primaryOpponentId) : null;
        OpponentCluster cluster = clusterer.classify(profile);
        CounterStrategy counter = clusterer.getCounterStrategy(cluster);

        double recentOutcome = performanceMonitor.recentForm() - 0.5;
        StrategyType strategy = strategySelector.selectStrategy(cluster, stage, counter, recentOutcome);

        int unknownDice = Math.max(0, totalDice - myDice.size());

        if (currentBid == null) {
            Decision first = makeFirstBid(myDice, totalDice, strategy, cluster.name(), 0.2,
                    thresholdAdapter.targetBluffRate(profile, stage, counter));
            patternBreaker.record(first.action());
            return first;
        }

        int bidQty = currentBid.getQuantity();
        int bidFace = currentBid.getFaceValue();
        int myCount = countFace(myDice, bidFace);

        double pAtLeast = BinomialProbability.probabilityAtLeast(bidQty, myCount, unknownDice);
        double pExact = BinomialProbability.probabilityExact(bidQty, myCount, unknownDice);
        double implausibility = 1.0 - pAtLeast;

        double baseDoubt = baseDoubtThreshold(activeCount);
        double doubtThreshold = thresholdAdapter.adjustedDoubtThreshold(baseDoubt, profile, counter);
        if (losing) {
            doubtThreshold *= 0.9;
        } else if (winning) {
            doubtThreshold *= 1.1;
        }
        doubtThreshold = clamp(doubtThreshold, 0.05, 0.45);

        double bluffRate = thresholdAdapter.targetBluffRate(profile, stage, counter);
        double spotOnThreshold = thresholdAdapter.adjustedSpotOnThreshold(profile, stage, counter);

        // ML prediction of opponent's likely next response (used as soft bias)
        Map<String, Double> predicted = mlModel.predictOpponentAction(profile, activeCount);
        double predictedDoubt = predicted.getOrDefault("DOUBT", 0.33);

        List<ScoredBid> raises = scoreValidRaises(currentBid, myDice, totalDice, unknownDice,
                bluffRate, activeCount);

        Decision statistical = statisticalDecision(
                pAtLeast, pExact, implausibility, doubtThreshold, spotOnThreshold,
                raises, activeCount, losing, winning, strategy.name(), cluster.name(), bluffRate);

        Decision adapted = applyStrategy(statistical, strategy, profile, currentBid, myDice,
                totalDice, unknownDice, pAtLeast, raises, predictedDoubt, cluster.name(),
                doubtThreshold, bluffRate);

        // Pattern break — never break away from doubting near-impossible bids
        boolean canRaise = !raises.isEmpty() && pAtLeast > 0.12;
        String broken = patternBreaker.maybeBreak(adapted.action(), canRaise, true,
                pExact >= spotOnThreshold * 0.85 && pAtLeast < 0.5);
        if (broken != null) {
            if ("bid".equals(broken) && canRaise) {
                ScoredBid best = raises.get(0);
                adapted = Decision.bid(best.quantity(), best.faceValue(), strategy.name() + "+break",
                        cluster.name(), doubtThreshold, bluffRate);
            } else if ("doubt".equals(broken)) {
                adapted = Decision.of("doubt", strategy.name() + "+break", cluster.name(),
                        doubtThreshold, bluffRate);
            } else if ("spotOn".equals(broken)) {
                adapted = Decision.of("spotOn", strategy.name() + "+break", cluster.name(),
                        doubtThreshold, bluffRate);
            }
        }

        // Mixed strategy bluff selection when raising
        if ("bid".equals(adapted.action()) && !raises.isEmpty()) {
            adapted = applyMixedRaise(adapted, raises, myDice, unknownDice, bluffRate,
                    strategy.name(), cluster.name(), doubtThreshold);
        }

        patternBreaker.record(adapted.action());

        System.out.println(String.format(
                "🎯 Adaptive: cluster=%s strategy=%s P(>=)=%.1f%% doubtT=%.1f%% bluffR=%.1f%% → %s%s",
                cluster, strategy, pAtLeast * 100, doubtThreshold * 100, bluffRate * 100,
                adapted.action(),
                adapted.quantity() != null
                        ? (" " + adapted.quantity() + " of " + adapted.faceValue() + "s")
                        : ""));

        return adapted;
    }

    private Decision applyMixedRaise(Decision adapted, List<ScoredBid> raises, List<Integer> myDice,
            int unknownDice, double bluffRate, String strategy, String cluster,
            double doubtThreshold) {
        ScoredBid truthful = raises.stream()
                .filter(r -> !r.isBluff())
                .findFirst()
                .orElse(raises.get(0));

        List<MixedStrategy.BidOption> bluffs = new ArrayList<>();
        for (ScoredBid r : raises) {
            if (r.isBluff() || r.achievability() < 0.75) {
                bluffs.add(new MixedStrategy.BidOption(r.quantity(), r.faceValue(),
                        r.achievability(), true));
            }
        }

        MixedStrategy.BidOption truthOpt = new MixedStrategy.BidOption(
                truthful.quantity(), truthful.faceValue(), truthful.achievability(), false);
        double bluffProb = mixedStrategy.calculateBluffProbability(truthful.achievability(), bluffRate);
        MixedStrategy.BidOption chosen = mixedStrategy.selectBid(truthOpt, bluffs, bluffProb);
        if (chosen == null) {
            return adapted;
        }
        return Decision.bid(chosen.quantity(), chosen.face(), strategy, cluster, doubtThreshold, bluffRate);
    }

    private Decision applyStrategy(
            Decision base,
            StrategyType strategy,
            OpponentProfile profile,
            Bid currentBid,
            List<Integer> myDice,
            int totalDice,
            int unknownDice,
            double pAtLeast,
            List<ScoredBid> raises,
            double predictedDoubt,
            String cluster,
            double doubtThreshold,
            double bluffRate) {

        return switch (strategy) {
            case DOUBT_FOCUSED -> {
                if ("bid".equals(base.action()) && ThreadLocalRandom.current().nextDouble() < 0.55) {
                    yield Decision.of("doubt", strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                yield base;
            }
            case RAISE_FOCUSED -> {
                // Never override a clear doubt on near-impossible bids
                if ("doubt".equals(base.action()) && pAtLeast > 0.15 && !raises.isEmpty()
                        && ThreadLocalRandom.current().nextDouble() < 0.4) {
                    ScoredBid r = raises.get(0);
                    yield Decision.bid(r.quantity(), r.faceValue(), strategy.name(), cluster,
                            doubtThreshold, bluffRate);
                }
                yield base;
            }
            case EXPLOITATIVE -> applyExploitative(base, profile, raises, strategy.name(), cluster,
                    doubtThreshold, bluffRate);
            case DEFENSIVE -> {
                if ("spotOn".equals(base.action())) {
                    yield Decision.of("doubt", strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                if ("doubt".equals(base.action()) && pAtLeast > 0.25 && !raises.isEmpty()) {
                    ScoredBid safe = raises.stream()
                            .filter(r -> r.achievability() > 0.6)
                            .findFirst()
                            .orElse(null);
                    if (safe != null) {
                        yield Decision.bid(safe.quantity(), safe.faceValue(), strategy.name(),
                                cluster, doubtThreshold, bluffRate);
                    }
                }
                yield base;
            }
            case AGGRESSIVE_BLUFF -> {
                if ("bid".equals(base.action()) && raises.size() > 1) {
                    // Prefer a more aggressive (lower achievability) raise
                    ScoredBid aggressive = raises.stream()
                            .filter(r -> r.achievability() < 0.7)
                            .findFirst()
                            .orElse(raises.get(Math.min(1, raises.size() - 1)));
                    yield Decision.bid(aggressive.quantity(), aggressive.faceValue(),
                            strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                if ("doubt".equals(base.action()) && pAtLeast > 0.15 && !raises.isEmpty()
                        && ThreadLocalRandom.current().nextDouble() < 0.3) {
                    ScoredBid r = raises.get(0);
                    yield Decision.bid(r.quantity(), r.faceValue(), strategy.name(), cluster,
                            doubtThreshold, bluffRate);
                }
                yield base;
            }
            case BALANCED -> base;
        };
    }

    private Decision applyExploitative(Decision base, OpponentProfile profile, List<ScoredBid> raises,
            String strategy, String cluster, double doubtThreshold, double bluffRate) {
        if (patternRecognizer.opponentRarelyDoubts(profile) && "bid".equals(base.action())
                && raises.size() > 1) {
            ScoredBid aggressive = raises.get(Math.min(1, raises.size() - 1));
            return Decision.bid(aggressive.quantity(), aggressive.faceValue(), strategy, cluster,
                    doubtThreshold, bluffRate);
        }
        if (patternRecognizer.opponentAlwaysDoubts(profile) && "doubt".equals(base.action())
                && !raises.isEmpty()) {
            ScoredBid safe = raises.stream()
                    .filter(r -> r.achievability() > 0.55)
                    .findFirst()
                    .orElse(raises.get(0));
            return Decision.bid(safe.quantity(), safe.faceValue(), strategy, cluster,
                    doubtThreshold, bluffRate);
        }
        return base;
    }

    private Decision statisticalDecision(
            double pAtLeast,
            double pExact,
            double implausibility,
            double doubtThreshold,
            double spotOnThreshold,
            List<ScoredBid> raises,
            int activeCount,
            boolean losing,
            boolean winning,
            String strategy,
            String cluster,
            double bluffRate) {

        double bestRaiseScore = raises.isEmpty() ? Double.NEGATIVE_INFINITY : raises.get(0).score();
        boolean canRaiseSafely = !raises.isEmpty() && bestRaiseScore > 0;

        double doubtScore = scoreDoubt(pAtLeast, doubtThreshold, activeCount, losing);
        double spotOnScore = scoreSpotOn(pExact, spotOnThreshold, activeCount, losing, winning,
                implausibility);

        if (pAtLeast > 0.80 && canRaiseSafely) {
            ScoredBid r = raises.get(0);
            return Decision.bid(r.quantity(), r.faceValue(), strategy, cluster, doubtThreshold, bluffRate);
        }

        if (pAtLeast >= 0.40) {
            if (canRaiseSafely && (winning || bestRaiseScore >= doubtScore)) {
                ScoredBid r = raises.get(0);
                return Decision.bid(r.quantity(), r.faceValue(), strategy, cluster, doubtThreshold,
                        bluffRate);
            }
            if (doubtScore >= spotOnScore) {
                return Decision.of("doubt", strategy, cluster, doubtThreshold, bluffRate);
            }
            return Decision.of("spotOn", strategy, cluster, doubtThreshold, bluffRate);
        }

        if (pAtLeast >= 0.20) {
            if (spotOnScore > doubtScore && spotOnScore > 50) {
                return Decision.of("spotOn", strategy, cluster, doubtThreshold, bluffRate);
            }
            if (canRaiseSafely && bestRaiseScore > doubtScore + 20) {
                ScoredBid r = raises.get(0);
                return Decision.bid(r.quantity(), r.faceValue(), strategy, cluster, doubtThreshold,
                        bluffRate);
            }
            return Decision.of("doubt", strategy, cluster, doubtThreshold, bluffRate);
        }

        if (spotOnScore > doubtScore && pExact > spotOnThreshold * 0.8) {
            return Decision.of("spotOn", strategy, cluster, doubtThreshold, bluffRate);
        }
        if (canRaiseSafely && bestRaiseScore > 80 && activeCount >= 4) {
            ScoredBid r = raises.get(0);
            return Decision.bid(r.quantity(), r.faceValue(), strategy, cluster, doubtThreshold, bluffRate);
        }
        return Decision.of("doubt", strategy, cluster, doubtThreshold, bluffRate);
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
                double achievability = BinomialProbability.probabilityAtLeast(qty, myCounts[face],
                        unknownDice);
                double score;
                boolean isBluff;

                if (achievability > 0.90) {
                    score = 100;
                    isBluff = false;
                } else if (achievability > 0.75) {
                    score = 50;
                    isBluff = false;
                } else if (achievability > 0.60) {
                    score = 25;
                    isBluff = myCounts[face] == 0;
                } else if (achievability > Math.max(0.30, bluffThreshold * 0.7)) {
                    score = achievability * 40 + (myCounts[face] >= 1 ? 15 : 0)
                            + (qty <= currentQty + 1 ? 10 : 0)
                            + (activeCount >= 4 ? 8 : 0);
                    isBluff = true;
                } else if (achievability > 0.25 && activeCount >= 4 && qty == currentQty + 1) {
                    score = -20 + achievability * 40;
                    isBluff = true;
                } else {
                    continue;
                }

                score += myCounts[face] * 8;
                int qtyJump = qty - currentBid.getQuantity();
                if (qtyJump == 0 && face > currentBid.getFaceValue()) {
                    score += 5;
                } else if (qtyJump == 1) {
                    score += 3;
                } else if (qtyJump > 2) {
                    score -= qtyJump * 5;
                }
                if (activeCount >= 4) {
                    score *= 1.09;
                }

                scored.add(new ScoredBid(qty, face, score, achievability, isBluff));
            }
        }

        scored.sort((a, b) -> Double.compare(b.score(), a.score()));
        return scored;
    }

    private Decision makeFirstBid(List<Integer> myDice, int totalDice, StrategyType strategy,
            String cluster, double doubtThreshold, double bluffRate) {
        int[] counts = faceCounts(myDice);
        int bestFace = 1;
        int bestCount = counts[1];
        for (int face = 2; face <= 6; face++) {
            if (counts[face] > bestCount || (counts[face] == bestCount && face > bestFace)) {
                bestCount = counts[face];
                bestFace = face;
            }
        }

        int quantity;
        if (bestCount == 0) {
            quantity = 1;
            bestFace = 1 + ThreadLocalRandom.current().nextInt(6);
            // Mixed: occasionally open with a light bluff face
            if (strategy == StrategyType.AGGRESSIVE_BLUFF
                    && ThreadLocalRandom.current().nextDouble() < bluffRate) {
                quantity = 2;
            }
        } else if (bestCount == 1) {
            quantity = 1;
            if ((strategy == StrategyType.AGGRESSIVE_BLUFF || strategy == StrategyType.EXPLOITATIVE)
                    && ThreadLocalRandom.current().nextDouble() < bluffRate) {
                quantity = 2;
            }
        } else {
            quantity = Math.min(2, bestCount);
            if (strategy == StrategyType.AGGRESSIVE_BLUFF
                    && ThreadLocalRandom.current().nextDouble() < bluffRate * 0.8) {
                quantity = Math.min(bestCount + 1, Math.max(2, totalDice / 5));
            }
        }

        return Decision.bid(quantity, bestFace, strategy.name(), cluster, doubtThreshold, bluffRate);
    }

    private static double scoreDoubt(double pAtLeast, double doubtThreshold, int activeCount,
            boolean losing) {
        double pFails = 1.0 - pAtLeast;
        double winValue = activeCount <= 2 ? 1.2 : (activeCount == 3 ? 1.0 : 0.8);
        double loseValue = activeCount <= 2 ? 1.5 : 1.0;
        if (losing) {
            winValue *= 1.1;
        }
        double ev = pFails * winValue - pAtLeast * loseValue;
        if (pAtLeast < doubtThreshold) {
            ev += 0.5;
        }
        if (pAtLeast < doubtThreshold * 0.5) {
            ev += 0.5;
        }
        return ev * 100;
    }

    private static double scoreSpotOn(double pExact, double threshold, int activeCount,
            boolean losing, boolean winning, double implausibility) {
        double t = threshold;
        if (losing || activeCount <= 2) {
            t = Math.min(t, 0.55);
        } else if (winning) {
            t = Math.min(t, 0.65);
        }

        if (pExact < t) {
            if (!(implausibility > 0.80 && pExact > 0.30 && activeCount <= 3)) {
                return -1000;
            }
        }

        double bigWin = activeCount;
        double wrongLoss = activeCount <= 2 ? 1.5 : 1.0;
        return pExact * bigWin * 80 - (1.0 - pExact) * wrongLoss * 60;
    }

    private static double baseDoubtThreshold(int activeCount) {
        if (activeCount <= 2) {
            return 0.08;
        }
        if (activeCount == 3) {
            return 0.15;
        }
        return 0.20;
    }

    public static String stageKey(int activeCount) {
        if (activeCount <= 2) {
            return "2_player";
        }
        if (activeCount == 3) {
            return "3_player";
        }
        return "4_player";
    }

    private static boolean isValidRaise(int quantity, int faceValue, Bid previousBid) {
        return GameRules.isBidValid(new Bid(null, quantity, faceValue, null), previousBid);
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

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}
