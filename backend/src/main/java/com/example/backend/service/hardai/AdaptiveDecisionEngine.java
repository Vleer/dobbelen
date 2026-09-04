package com.example.backend.service.hardai;

import com.example.backend.model.Bid;
import com.example.backend.model.GameRules;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Adaptive decision pipeline: statistical EV + opponent profiling + strategy
 * selection + trap bluffs + never-doubt-when-holding rule.
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
        // Endgame preference
        if (activeCount <= 2 && ThreadLocalRandom.current().nextDouble() < 0.4) {
            strategy = StrategyType.ENDGAME_TIGHT;
        }

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

        // Hard rule: never doubt if we already hold the bid, or only need 1 more from others
        boolean mustNotDoubt = bidQty <= myCount + 1;

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
        if (strategy == StrategyType.TRAP_BLUFF || strategy == StrategyType.AGGRESSIVE_BLUFF
                || strategy == StrategyType.PRESSURE_RAISE) {
            bluffRate = Math.min(0.55, bluffRate * 1.35);
        }
        double spotOnThreshold = thresholdAdapter.adjustedSpotOnThreshold(profile, stage, counter);

        Map<String, Double> predicted = mlModel.predictOpponentAction(profile, activeCount);
        double predictedDoubt = predicted.getOrDefault("DOUBT", 0.33);

        List<ScoredBid> raises = scoreValidRaises(currentBid, myDice, totalDice, unknownDice,
                bluffRate, activeCount, strategy);

        Decision statistical = statisticalDecision(
                pAtLeast, pExact, implausibility, doubtThreshold, spotOnThreshold,
                raises, activeCount, losing, winning, strategy.name(), cluster.name(), bluffRate,
                mustNotDoubt);

        Decision adapted = applyStrategy(statistical, strategy, profile, currentBid, myDice,
                pAtLeast, raises, predictedDoubt, cluster.name(),
                doubtThreshold, bluffRate, mustNotDoubt);

        boolean canRaise = !raises.isEmpty() && (mustNotDoubt || pAtLeast > 0.12);
        boolean canDoubt = !mustNotDoubt;
        String broken = patternBreaker.maybeBreak(adapted.action(), canRaise, canDoubt,
                !mustNotDoubt && pExact >= spotOnThreshold * 0.85 && pAtLeast < 0.5);
        if (broken != null) {
            if ("bid".equals(broken) && canRaise) {
                ScoredBid best = pickRaiseForStrategy(raises, strategy, myDice, currentBid);
                adapted = Decision.bid(best.quantity(), best.faceValue(), strategy.name() + "+break",
                        cluster.name(), doubtThreshold, bluffRate);
            } else if ("doubt".equals(broken) && canDoubt) {
                adapted = Decision.of("doubt", strategy.name() + "+break", cluster.name(),
                        doubtThreshold, bluffRate);
            } else if ("spotOn".equals(broken) && !mustNotDoubt) {
                adapted = Decision.of("spotOn", strategy.name() + "+break", cluster.name(),
                        doubtThreshold, bluffRate);
            }
        }

        if ("bid".equals(adapted.action()) && !raises.isEmpty()) {
            adapted = applyMixedRaise(adapted, raises, myDice, bluffRate, strategy, cluster.name(),
                    doubtThreshold);
        }

        adapted = enforceNeverDoubt(adapted, raises, mustNotDoubt, pExact, spotOnThreshold,
                strategy.name(), cluster.name(), doubtThreshold, bluffRate);

        patternBreaker.record(adapted.action());

        System.out.println(String.format(
                "🎯 Adaptive: cluster=%s strategy=%s myCount=%d bid=%d/%d mustNotDoubt=%s P(>=)=%.1f%% → %s%s",
                cluster, strategy, myCount, bidQty, bidFace, mustNotDoubt, pAtLeast * 100,
                adapted.action(),
                adapted.quantity() != null
                        ? (" " + adapted.quantity() + " of " + adapted.faceValue() + "s")
                        : ""));

        return adapted;
    }

    private Decision applyMixedRaise(Decision adapted, List<ScoredBid> raises, List<Integer> myDice,
            double bluffRate, StrategyType strategy, String cluster, double doubtThreshold) {
        int[] counts = faceCounts(myDice);

        ScoredBid truthful = raises.stream()
                .filter(r -> !r.isBluff())
                .findFirst()
                .orElse(raises.get(0));

        List<MixedStrategy.BidOption> bluffs = new ArrayList<>();
        for (ScoredBid r : raises) {
            boolean thinHold = counts[r.faceValue()] <= 1;
            if (r.isBluff() || r.achievability() < 0.75 || thinHold) {
                bluffs.add(new MixedStrategy.BidOption(r.quantity(), r.faceValue(),
                        r.achievability(), true));
            }
        }

        if (strategy == StrategyType.TRAP_BLUFF || strategy == StrategyType.AGGRESSIVE_BLUFF) {
            List<MixedStrategy.BidOption> traps = new ArrayList<>();
            for (ScoredBid r : raises) {
                if (counts[r.faceValue()] <= 1 && r.achievability() >= 0.22) {
                    traps.add(new MixedStrategy.BidOption(r.quantity(), r.faceValue(),
                            r.achievability(), true));
                }
            }
            if (!traps.isEmpty() && ThreadLocalRandom.current().nextDouble() < Math.max(0.35, bluffRate)) {
                MixedStrategy.BidOption trap = mixedStrategy.selectBluff(traps);
                if (trap != null) {
                    System.out.println(String.format("🎯 TRAP bluff: %d of %ds (hold %d)",
                            trap.quantity(), trap.face(), counts[trap.face()]));
                    return Decision.bid(trap.quantity(), trap.face(), strategy.name(), cluster,
                            doubtThreshold, bluffRate);
                }
            }
        }

        MixedStrategy.BidOption truthOpt = new MixedStrategy.BidOption(
                truthful.quantity(), truthful.faceValue(), truthful.achievability(), false);
        double bluffProb = mixedStrategy.calculateBluffProbability(truthful.achievability(), bluffRate);
        if (strategy == StrategyType.TRAP_BLUFF) {
            bluffProb = Math.min(0.65, bluffProb * 1.5);
        }
        MixedStrategy.BidOption chosen = mixedStrategy.selectBid(truthOpt, bluffs, bluffProb);
        if (chosen == null) {
            return adapted;
        }
        return Decision.bid(chosen.quantity(), chosen.face(), strategy.name(), cluster, doubtThreshold,
                bluffRate);
    }

    private Decision enforceNeverDoubt(Decision adapted, List<ScoredBid> raises, boolean mustNotDoubt,
            double pExact, double spotOnThreshold, String strategy, String cluster,
            double doubtThreshold, double bluffRate) {
        if (!mustNotDoubt || !"doubt".equals(adapted.action())) {
            return adapted;
        }
        if (!raises.isEmpty()) {
            ScoredBid r = raises.get(0);
            System.out.println("🎯 Never-doubt rule: holding bid or need ≤1 more → RAISE instead");
            return Decision.bid(r.quantity(), r.faceValue(), strategy + "+noDoubt", cluster,
                    doubtThreshold, bluffRate);
        }
        return Decision.of("spotOn", strategy + "+noDoubt", cluster, doubtThreshold, bluffRate);
    }

    private Decision applyStrategy(
            Decision base,
            StrategyType strategy,
            OpponentProfile profile,
            Bid currentBid,
            List<Integer> myDice,
            double pAtLeast,
            List<ScoredBid> raises,
            double predictedDoubt,
            String cluster,
            double doubtThreshold,
            double bluffRate,
            boolean mustNotDoubt) {

        return switch (strategy) {
            case DOUBT_FOCUSED -> {
                if (!mustNotDoubt && "bid".equals(base.action())
                        && ThreadLocalRandom.current().nextDouble() < 0.55) {
                    yield Decision.of("doubt", strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                if (mustNotDoubt && "doubt".equals(base.action()) && !raises.isEmpty()) {
                    yield Decision.bid(raises.get(0).quantity(), raises.get(0).faceValue(),
                            strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                yield base;
            }
            case RAISE_FOCUSED -> {
                if (("doubt".equals(base.action()) || mustNotDoubt) && !raises.isEmpty()
                        && (mustNotDoubt || pAtLeast > 0.15)
                        && (mustNotDoubt || ThreadLocalRandom.current().nextDouble() < 0.4)) {
                    ScoredBid r = raises.get(0);
                    yield Decision.bid(r.quantity(), r.faceValue(), strategy.name(), cluster,
                            doubtThreshold, bluffRate);
                }
                yield base;
            }
            case EXPLOITATIVE -> applyExploitative(base, profile, raises, strategy.name(), cluster,
                    doubtThreshold, bluffRate, mustNotDoubt);
            case DEFENSIVE -> {
                if ("spotOn".equals(base.action()) && !mustNotDoubt) {
                    yield Decision.of("doubt", strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                if (("doubt".equals(base.action()) || mustNotDoubt) && !raises.isEmpty()
                        && (mustNotDoubt || pAtLeast > 0.25)) {
                    ScoredBid safe = raises.stream()
                            .filter(r -> r.achievability() > 0.6)
                            .findFirst()
                            .orElse(mustNotDoubt ? raises.get(0) : null);
                    if (safe != null) {
                        yield Decision.bid(safe.quantity(), safe.faceValue(), strategy.name(),
                                cluster, doubtThreshold, bluffRate);
                    }
                }
                yield base;
            }
            case AGGRESSIVE_BLUFF -> {
                if (!raises.isEmpty() && ("bid".equals(base.action()) || mustNotDoubt)) {
                    ScoredBid trap = pickTrapBluff(raises, myDice).orElse(null);
                    if (trap != null && ThreadLocalRandom.current().nextDouble() < 0.55) {
                        yield Decision.bid(trap.quantity(), trap.faceValue(), strategy.name(),
                                cluster, doubtThreshold, bluffRate);
                    }
                    if (raises.size() > 1) {
                        ScoredBid aggressive = raises.stream()
                                .filter(r -> r.achievability() < 0.7)
                                .findFirst()
                                .orElse(raises.get(Math.min(1, raises.size() - 1)));
                        yield Decision.bid(aggressive.quantity(), aggressive.faceValue(),
                                strategy.name(), cluster, doubtThreshold, bluffRate);
                    }
                }
                if ("doubt".equals(base.action()) && !mustNotDoubt && pAtLeast > 0.15 && !raises.isEmpty()
                        && ThreadLocalRandom.current().nextDouble() < 0.3) {
                    yield Decision.bid(raises.get(0).quantity(), raises.get(0).faceValue(),
                            strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                yield base;
            }
            case TRAP_BLUFF -> {
                if (!raises.isEmpty()) {
                    ScoredBid trap = pickTrapBluff(raises, myDice).orElse(null);
                    if (trap != null && (mustNotDoubt || "bid".equals(base.action())
                            || ThreadLocalRandom.current().nextDouble() < 0.65)) {
                        yield Decision.bid(trap.quantity(), trap.faceValue(), strategy.name(),
                                cluster, doubtThreshold, bluffRate);
                    }
                }
                if ("doubt".equals(base.action()) && mustNotDoubt && !raises.isEmpty()) {
                    yield Decision.bid(raises.get(0).quantity(), raises.get(0).faceValue(),
                            strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                yield base;
            }
            case VALUE_SQUEEZE -> {
                if (!raises.isEmpty() && ("bid".equals(base.action()) || mustNotDoubt
                        || ("doubt".equals(base.action()) && pAtLeast > 0.2))) {
                    ScoredBid squeeze = pickValueSqueeze(raises, myDice, currentBid);
                    if (squeeze != null) {
                        yield Decision.bid(squeeze.quantity(), squeeze.faceValue(), strategy.name(),
                                cluster, doubtThreshold, bluffRate);
                    }
                }
                yield base;
            }
            case FACE_SWITCH -> {
                if (!raises.isEmpty() && ("bid".equals(base.action()) || mustNotDoubt)) {
                    ScoredBid switched = pickFaceSwitch(raises, currentBid, myDice);
                    if (switched != null) {
                        yield Decision.bid(switched.quantity(), switched.faceValue(), strategy.name(),
                                cluster, doubtThreshold, bluffRate);
                    }
                }
                yield base;
            }
            case PRESSURE_RAISE -> {
                if (("doubt".equals(base.action()) || mustNotDoubt) && !raises.isEmpty()
                        && (mustNotDoubt || pAtLeast > 0.18)) {
                    ScoredBid pressure = raises.stream()
                            .filter(r -> r.quantity() == currentBid.getQuantity() + 1
                                    || (r.quantity() == currentBid.getQuantity()
                                            && r.faceValue() > currentBid.getFaceValue()))
                            .findFirst()
                            .orElse(raises.get(0));
                    yield Decision.bid(pressure.quantity(), pressure.faceValue(), strategy.name(),
                            cluster, doubtThreshold, bluffRate);
                }
                yield base;
            }
            case ENDGAME_TIGHT -> {
                if ("spotOn".equals(base.action()) && pAtLeast < 0.35 && !mustNotDoubt) {
                    yield Decision.of("doubt", strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                if (("doubt".equals(base.action()) && mustNotDoubt || "bid".equals(base.action()))
                        && !raises.isEmpty()) {
                    ScoredBid safest = raises.stream()
                            .max((a, b) -> Double.compare(a.achievability(), b.achievability()))
                            .orElse(raises.get(0));
                    yield Decision.bid(safest.quantity(), safest.faceValue(), strategy.name(),
                            cluster, doubtThreshold, bluffRate);
                }
                yield base;
            }
            case BALANCED -> {
                if (mustNotDoubt && "doubt".equals(base.action()) && !raises.isEmpty()) {
                    yield Decision.bid(raises.get(0).quantity(), raises.get(0).faceValue(),
                            strategy.name(), cluster, doubtThreshold, bluffRate);
                }
                yield base;
            }
        };
    }

    private Decision applyExploitative(Decision base, OpponentProfile profile, List<ScoredBid> raises,
            String strategy, String cluster, double doubtThreshold, double bluffRate,
            boolean mustNotDoubt) {
        if (patternRecognizer.opponentRarelyDoubts(profile) && !raises.isEmpty()
                && ("bid".equals(base.action()) || mustNotDoubt)) {
            ScoredBid trap = pickTrapBluff(raises, null)
                    .orElse(raises.get(Math.min(1, raises.size() - 1)));
            return Decision.bid(trap.quantity(), trap.faceValue(), strategy, cluster,
                    doubtThreshold, bluffRate);
        }
        if (patternRecognizer.opponentAlwaysDoubts(profile)
                && ("doubt".equals(base.action()) || mustNotDoubt) && !raises.isEmpty()) {
            ScoredBid safe = raises.stream()
                    .filter(r -> r.achievability() > 0.55)
                    .findFirst()
                    .orElse(raises.get(0));
            return Decision.bid(safe.quantity(), safe.faceValue(), strategy, cluster,
                    doubtThreshold, bluffRate);
        }
        if (mustNotDoubt && "doubt".equals(base.action()) && !raises.isEmpty()) {
            return Decision.bid(raises.get(0).quantity(), raises.get(0).faceValue(), strategy,
                    cluster, doubtThreshold, bluffRate);
        }
        return base;
    }

    private static Optional<ScoredBid> pickTrapBluff(List<ScoredBid> raises, List<Integer> myDice) {
        int[] counts = myDice != null ? faceCounts(myDice) : null;
        return raises.stream()
                .filter(r -> {
                    if (counts != null) {
                        return counts[r.faceValue()] <= 1 && r.achievability() >= 0.22
                                && r.achievability() <= 0.75;
                    }
                    return r.isBluff() && r.achievability() >= 0.22 && r.achievability() <= 0.75;
                })
                .findFirst();
    }

    private static ScoredBid pickValueSqueeze(List<ScoredBid> raises, List<Integer> myDice,
            Bid currentBid) {
        int[] counts = faceCounts(myDice);
        int bestFace = 1;
        int bestCount = 0;
        for (int f = 1; f <= 6; f++) {
            if (counts[f] > bestCount) {
                bestCount = counts[f];
                bestFace = f;
            }
        }
        final int face = bestFace;
        return raises.stream()
                .filter(r -> r.faceValue() == face)
                .filter(r -> r.quantity() <= currentBid.getQuantity() + 1)
                .findFirst()
                .orElse(raises.stream().filter(r -> r.faceValue() == face).findFirst().orElse(null));
    }

    private static ScoredBid pickFaceSwitch(List<ScoredBid> raises, Bid currentBid,
            List<Integer> myDice) {
        int[] counts = faceCounts(myDice);
        return raises.stream()
                .filter(r -> r.faceValue() != currentBid.getFaceValue())
                .sorted((a, b) -> {
                    int cmp = Integer.compare(counts[b.faceValue()], counts[a.faceValue()]);
                    if (cmp != 0) {
                        return cmp;
                    }
                    return Double.compare(b.achievability(), a.achievability());
                })
                .findFirst()
                .orElse(null);
    }

    private static ScoredBid pickRaiseForStrategy(List<ScoredBid> raises, StrategyType strategy,
            List<Integer> myDice, Bid currentBid) {
        if (raises.isEmpty()) {
            return null;
        }
        return switch (strategy) {
            case TRAP_BLUFF, AGGRESSIVE_BLUFF -> pickTrapBluff(raises, myDice).orElse(raises.get(0));
            case VALUE_SQUEEZE, ENDGAME_TIGHT -> raises.stream()
                    .max((a, b) -> Double.compare(a.achievability(), b.achievability()))
                    .orElse(raises.get(0));
            case FACE_SWITCH -> {
                ScoredBid sw = pickFaceSwitch(raises, currentBid, myDice);
                yield sw != null ? sw : raises.get(0);
            }
            default -> raises.get(0);
        };
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
            double bluffRate,
            boolean mustNotDoubt) {

        double bestRaiseScore = raises.isEmpty() ? Double.NEGATIVE_INFINITY : raises.get(0).score();
        boolean canRaiseSafely = !raises.isEmpty() && bestRaiseScore > 0;

        double doubtScore = mustNotDoubt ? -10_000
                : scoreDoubt(pAtLeast, doubtThreshold, activeCount, losing);
        double spotOnScore = scoreSpotOn(pExact, spotOnThreshold, activeCount, losing, winning,
                implausibility);

        if (mustNotDoubt) {
            if (!raises.isEmpty()) {
                ScoredBid r = raises.get(0);
                return Decision.bid(r.quantity(), r.faceValue(), strategy, cluster, doubtThreshold,
                        bluffRate);
            }
            return Decision.of("spotOn", strategy, cluster, doubtThreshold, bluffRate);
        }

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
            int unknownDice, double bluffThreshold, int activeCount, StrategyType strategy) {
        List<ScoredBid> scored = new ArrayList<>();
        int[] myCounts = faceCounts(myDice);
        int currentQty = currentBid.getQuantity();
        boolean favorTrap = strategy == StrategyType.TRAP_BLUFF
                || strategy == StrategyType.AGGRESSIVE_BLUFF
                || strategy == StrategyType.PRESSURE_RAISE;

        for (int face = 1; face <= 6; face++) {
            for (int qty = 1; qty <= totalDice; qty++) {
                if (!isValidRaise(qty, face, currentBid)) {
                    continue;
                }
                double achievability = BinomialProbability.probabilityAtLeast(qty, myCounts[face],
                        unknownDice);
                double score;
                boolean isBluff;
                boolean thinHold = myCounts[face] <= 1;

                if (achievability > 0.90) {
                    score = 100;
                    isBluff = false;
                } else if (achievability > 0.75) {
                    score = 50;
                    isBluff = false;
                } else if (achievability > 0.60) {
                    score = 25;
                    isBluff = myCounts[face] == 0;
                } else if (achievability > Math.max(0.28, bluffThreshold * 0.65)) {
                    score = achievability * 40
                            + (qty <= currentQty + 1 ? 10 : 0)
                            + (activeCount >= 4 ? 8 : 0);
                    if (thinHold) {
                        score += favorTrap ? 28 : 12;
                        if (myCounts[face] == 0) {
                            score += favorTrap ? 10 : 4;
                        }
                    } else {
                        score += 15;
                    }
                    isBluff = true;
                } else if (thinHold && favorTrap && achievability > 0.22 && qty <= currentQty + 2) {
                    score = 5 + achievability * 35 + (favorTrap ? 20 : 0);
                    isBluff = true;
                } else if (achievability > 0.25 && activeCount >= 4 && qty == currentQty + 1) {
                    score = -20 + achievability * 40;
                    isBluff = true;
                } else {
                    continue;
                }

                if (!thinHold) {
                    score += myCounts[face] * 8;
                } else if (strategy == StrategyType.VALUE_SQUEEZE || strategy == StrategyType.ENDGAME_TIGHT) {
                    score -= 15;
                }

                int qtyJump = qty - currentBid.getQuantity();
                if (qtyJump == 0 && face > currentBid.getFaceValue()) {
                    score += strategy == StrategyType.FACE_SWITCH ? 18 : 5;
                } else if (qtyJump == 1) {
                    score += strategy == StrategyType.PRESSURE_RAISE ? 12 : 3;
                } else if (qtyJump > 2) {
                    score -= qtyJump * (strategy == StrategyType.PRESSURE_RAISE ? 2 : 5);
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

        if ((strategy == StrategyType.TRAP_BLUFF || strategy == StrategyType.AGGRESSIVE_BLUFF)
                && ThreadLocalRandom.current().nextDouble() < Math.max(0.3, bluffRate)) {
            List<Integer> thinFaces = new ArrayList<>();
            for (int f = 1; f <= 6; f++) {
                if (counts[f] <= 1) {
                    thinFaces.add(f);
                }
            }
            if (!thinFaces.isEmpty()) {
                int trapFace = thinFaces.get(ThreadLocalRandom.current().nextInt(thinFaces.size()));
                int qty = counts[trapFace] == 0 ? 1 : Math.min(2, Math.max(1, totalDice / 8));
                System.out.println(String.format("🎯 Trap opening: %d of %ds (hold %d)",
                        qty, trapFace, counts[trapFace]));
                return Decision.bid(qty, trapFace, strategy.name(), cluster, doubtThreshold, bluffRate);
            }
        }

        int quantity;
        if (bestCount == 0) {
            quantity = 1;
            bestFace = 1 + ThreadLocalRandom.current().nextInt(6);
            if ((strategy == StrategyType.AGGRESSIVE_BLUFF || strategy == StrategyType.TRAP_BLUFF
                    || strategy == StrategyType.PRESSURE_RAISE)
                    && ThreadLocalRandom.current().nextDouble() < bluffRate) {
                quantity = 2;
            }
        } else if (bestCount == 1) {
            quantity = 1;
            if ((strategy == StrategyType.AGGRESSIVE_BLUFF || strategy == StrategyType.EXPLOITATIVE
                    || strategy == StrategyType.TRAP_BLUFF)
                    && ThreadLocalRandom.current().nextDouble() < bluffRate) {
                quantity = 2;
            }
        } else {
            quantity = Math.min(2, bestCount);
            if ((strategy == StrategyType.AGGRESSIVE_BLUFF || strategy == StrategyType.PRESSURE_RAISE)
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
