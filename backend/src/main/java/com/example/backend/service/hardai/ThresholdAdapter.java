package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

/**
 * Dynamic per-opponent threshold adaptation (HardAIImprovements.md section 3).
 */
@Component
public class ThresholdAdapter {

    public double adjustedDoubtThreshold(double baseThreshold, OpponentProfile profile,
            CounterStrategy counter) {
        double threshold = baseThreshold;

        if (counter != null) {
            // Blend statistical base with cluster counter-strategy
            threshold = 0.55 * baseThreshold + 0.45 * counter.doubtThreshold();
        }

        if (profile != null) {
            double accuracy = profile.bidAccuracy();
            double thresholdAdjustment = (accuracy - 0.5) * 0.3;
            double bluffAdjustment = -profile.estimateBluffFrequency() * 0.2;

            double winRate = profile.winRateVsHardAi();
            if (winRate > 0.6) {
                thresholdAdjustment += 0.05; // we're winning → more conservative
            } else if (winRate < 0.4) {
                thresholdAdjustment -= 0.05; // we're losing → more aggressive
            }

            // Weight by profile confidence
            double w = profile.getConfidenceInProfile();
            threshold += w * (thresholdAdjustment + bluffAdjustment);
        }

        return clamp(threshold, 0.05, 0.45);
    }

    public double targetBluffRate(OpponentProfile profile, String stage, CounterStrategy counter) {
        double base = switch (stage != null ? stage : "4_player") {
            case "2_player" -> 0.10;
            case "3_player" -> 0.20;
            default -> 0.25;
        };

        if (counter != null) {
            base = 0.5 * base + 0.5 * counter.bluffFrequency();
        }

        if (profile != null) {
            double doubtFrequency = profile.doubtFrequency();
            if (doubtFrequency < 0.15) {
                base *= 1.5;
            } else if (doubtFrequency > 0.40) {
                base *= 0.6;
            }
            if (profile.doubtAccuracy() > 0.6) {
                base *= 0.7;
            }
        }

        return Math.min(0.5, Math.max(0.05, base));
    }

    public double adjustedSpotOnThreshold(OpponentProfile profile, String stage,
            CounterStrategy counter) {
        double base = 0.70;
        if (counter != null) {
            base = counter.spotOnThreshold();
        }

        if (profile != null) {
            if (profile.doubtFrequency() > 0.35) {
                base -= 0.10;
            }
            if (profile.spotOnAccuracy() < 0.3) {
                base -= 0.10;
            }
        }

        if ("2_player".equals(stage)) {
            base = Math.min(base, 0.55);
        }

        return clamp(base, 0.40, 0.80);
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}
