package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Mixed-strategy bidding: calibrate bluff probability so truthful and bluff
 * bids are harder to distinguish (HardAIImprovements.md section 4.1).
 */
@Component
public class MixedStrategy {

    public record BidOption(int quantity, int face, double achievability, boolean isBluff) {
    }

    public double calculateBluffProbability(double truthAchievability, double baseBluffRate) {
        if (truthAchievability > 0.75) {
            return baseBluffRate * 0.3;
        }
        if (truthAchievability > 0.4) {
            return baseBluffRate;
        }
        return baseBluffRate * 0.5;
    }

    /**
     * Decide whether to pick a bluff among candidates vs the best truthful raise.
     */
    public BidOption selectBid(BidOption truthful, List<BidOption> bluffCandidates,
            double bluffProbability) {
        if (truthful == null && (bluffCandidates == null || bluffCandidates.isEmpty())) {
            return null;
        }
        if (bluffCandidates == null || bluffCandidates.isEmpty()) {
            return truthful;
        }
        if (truthful == null) {
            return bluffCandidates.get(0);
        }

        if (ThreadLocalRandom.current().nextDouble() < bluffProbability) {
            return selectBluff(bluffCandidates);
        }
        return truthful;
    }

    public BidOption selectBluff(List<BidOption> candidates) {
        if (candidates.isEmpty()) {
            return null;
        }
        // Prefer mid-range achievability bluffs (look plausible)
        List<BidOption> plausible = new ArrayList<>();
        for (BidOption c : candidates) {
            if (c.achievability() >= 0.25 && c.achievability() <= 0.70) {
                plausible.add(c);
            }
        }
        List<BidOption> pool = plausible.isEmpty() ? candidates : plausible;
        return pool.get(ThreadLocalRandom.current().nextInt(pool.size()));
    }
}
