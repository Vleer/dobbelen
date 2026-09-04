package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

/**
 * Classifies opponents into archetypes and returns counter-strategies.
 * HardAIImprovements.md sections 5.2 and 9.2.
 */
@Component
public class OpponentClusterer {

    public OpponentCluster classify(OpponentProfile profile) {
        if (profile == null || profile.getTotalBidsMade() + profile.getTotalDoubtsMade() < 3) {
            return OpponentCluster.NOVICE_RANDOM;
        }

        double aggression = profile.aggressionScore();
        double bluffRate = profile.estimateBluffFrequency();
        double doubtFreq = profile.doubtFrequency();
        double variance = profile.bidVariance();
        double accuracy = profile.bidAccuracy();

        if (aggression > 65 && bluffRate > 0.3) {
            return OpponentCluster.AGGRESSIVE_BLUFFER;
        }
        if (aggression < 35 && bluffRate < 0.15) {
            return OpponentCluster.CONSERVATIVE_HONEST;
        }
        if (variance > 0.5) {
            return OpponentCluster.UNPREDICTABLE_MIXED;
        }
        if (accuracy > 0.6 && aggression > 50 && profile.getConfidenceInProfile() > 0.7) {
            return OpponentCluster.ADAPTIVE_PRO;
        }
        // High doubt frequency with decent accuracy → adaptive
        if (doubtFreq > 0.35 && accuracy > 0.55) {
            return OpponentCluster.ADAPTIVE_PRO;
        }
        return OpponentCluster.NOVICE_RANDOM;
    }

    public CounterStrategy getCounterStrategy(OpponentCluster cluster) {
        return switch (cluster) {
            case AGGRESSIVE_BLUFFER -> new CounterStrategy(0.25, 0.35, 0.55, StrategyType.DOUBT_FOCUSED);
            case CONSERVATIVE_HONEST -> new CounterStrategy(0.40, 0.45, 0.70, StrategyType.AGGRESSIVE_BLUFF);
            case UNPREDICTABLE_MIXED -> new CounterStrategy(0.30, 0.30, 0.65, StrategyType.BALANCED);
            case NOVICE_RANDOM -> new CounterStrategy(0.20, 0.20, 0.60, StrategyType.EXPLOITATIVE);
            case ADAPTIVE_PRO -> new CounterStrategy(0.35, 0.25, 0.75, StrategyType.DEFENSIVE);
        };
    }
}
