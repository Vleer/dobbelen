package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * ε-greedy Q-learning strategy selector (HardAIImprovements.md section 5.3).
 */
@Component
public class StrategySelector {

    private final Map<String, Map<StrategyType, Double>> qTable = new ConcurrentHashMap<>();
    private double explorationRate = 0.3;
    private static final double LEARNING_RATE = 0.1;
    private static final double DISCOUNT = 0.9;

    private String currentState;
    private StrategyType currentStrategy;

    public StrategyType selectStrategy(OpponentCluster cluster, String stage,
            CounterStrategy counter, double recentOutcome) {
        String state = stateKey(cluster, stage, recentOutcome);
        currentState = state;

        Map<StrategyType, Double> qValues = qTable.computeIfAbsent(state, s -> initQ());

        StrategyType strategy;
        if (ThreadLocalRandom.current().nextDouble() < explorationRate) {
            StrategyType[] all = StrategyType.values();
            strategy = all[ThreadLocalRandom.current().nextInt(all.length)];
        } else {
            strategy = qValues.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(StrategyType.BALANCED);
            // Soft preference for cluster's recommended style
            if (counter != null && ThreadLocalRandom.current().nextDouble() < 0.35) {
                strategy = counter.preferredStyle();
            }
        }

        currentStrategy = strategy;
        // Decay exploration slowly toward 0.1
        explorationRate = Math.max(0.1, explorationRate * 0.9995);
        return strategy;
    }

    public void update(String nextCluster, String nextStage, double reward) {
        if (currentState == null || currentStrategy == null) {
            return;
        }
        String nextState = stateKey(
                nextCluster != null ? OpponentCluster.valueOf(nextCluster) : OpponentCluster.NOVICE_RANDOM,
                nextStage,
                reward);

        Map<StrategyType, Double> qCurrent = qTable.computeIfAbsent(currentState, s -> initQ());
        Map<StrategyType, Double> qNext = qTable.computeIfAbsent(nextState, s -> initQ());

        double currentQ = qCurrent.getOrDefault(currentStrategy, 0.0);
        double futureQ = qNext.values().stream().mapToDouble(d -> d).max().orElse(0.0);
        double newQ = currentQ + LEARNING_RATE * (reward + DISCOUNT * futureQ - currentQ);
        qCurrent.put(currentStrategy, newQ);
    }

    public void updateSimple(double reward) {
        if (currentState == null || currentStrategy == null) {
            return;
        }
        Map<StrategyType, Double> qCurrent = qTable.computeIfAbsent(currentState, s -> initQ());
        double currentQ = qCurrent.getOrDefault(currentStrategy, 0.0);
        double newQ = currentQ + LEARNING_RATE * (reward - currentQ);
        qCurrent.put(currentStrategy, newQ);
    }

    public StrategyType getCurrentStrategy() {
        return currentStrategy;
    }

    public double getExplorationRate() {
        return explorationRate;
    }

    private static Map<StrategyType, Double> initQ() {
        Map<StrategyType, Double> m = new HashMap<>();
        for (StrategyType s : StrategyType.values()) {
            m.put(s, 0.0);
        }
        // Mild priors for a few fallback styles
        m.put(StrategyType.BALANCED, 0.05);
        m.put(StrategyType.TRAP_BLUFF, 0.02);
        m.put(StrategyType.VALUE_SQUEEZE, 0.02);
        m.put(StrategyType.FACE_SWITCH, 0.01);
        return m;
    }

    private static String stateKey(OpponentCluster cluster, String stage, double recentOutcome) {
        String outcomeBucket = recentOutcome > 0.2 ? "up" : (recentOutcome < -0.2 ? "down" : "flat");
        return (cluster != null ? cluster.name() : "UNKNOWN")
                + "|" + (stage != null ? stage : "4_player")
                + "|" + outcomeBucket;
    }
}
