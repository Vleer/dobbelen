package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lightweight online linear model for predicting opponent action tendencies
 * (HardAIImprovements.md section 5.1).
 */
@Component
public class SimpleMLModel {

    private final Map<String, Double> weights = new LinkedHashMap<>();
    private final java.util.List<Double> predictionAccuracy = new java.util.ArrayList<>();
    private static final double LEARNING_RATE = 0.05;

    public SimpleMLModel() {
        weights.put("aggression", 0.1);
        weights.put("bluff_rate", 0.15);
        weights.put("doubt_frequency", 0.1);
        weights.put("face_preference", 0.05);
        weights.put("stage_performance", 0.1);
        weights.put("win_rate_vs_opponent", 0.1);
        weights.put("recent_form", 0.2);
        weights.put("variance", 0.2);
    }

    public Map<String, Double> extractFeatures(OpponentProfile profile, int activePlayers) {
        Map<String, Double> features = new HashMap<>();
        if (profile == null) {
            features.put("aggression", 0.4);
            features.put("bluff_rate", 0.2);
            features.put("doubt_frequency", 0.25);
            features.put("face_preference", 0.5);
            features.put("stage_performance", 0.5);
            features.put("win_rate_vs_opponent", 0.5);
            features.put("recent_form", 0.5);
            features.put("variance", 0.3);
            return features;
        }
        features.put("aggression", profile.aggressionScore() / 100.0);
        features.put("bluff_rate", profile.estimateBluffFrequency());
        features.put("doubt_frequency", Math.min(1.0, profile.doubtFrequency()));
        features.put("face_preference", dominantFaceShare(profile));
        features.put("stage_performance", stageWinRate(profile, activePlayers));
        features.put("win_rate_vs_opponent", profile.winRateVsHardAi());
        features.put("recent_form", profile.recentForm());
        features.put("variance", profile.bidVariance());
        return features;
    }

    /**
     * Returns probability distribution over DOUBT / RAISE / SPOT_ON.
     */
    public Map<String, Double> predictOpponentAction(OpponentProfile profile, int activePlayers) {
        Map<String, Double> features = extractFeatures(profile, activePlayers);
        double score = 0;
        for (Map.Entry<String, Double> e : weights.entrySet()) {
            score += features.getOrDefault(e.getKey(), 0.0) * e.getValue();
        }

        double doubtLogit = score;
        double raiseLogit = score * 0.8 + 0.15;
        double spotLogit = score * 0.2 - 0.3;

        // Bias by known tendencies
        if (profile != null) {
            doubtLogit += profile.doubtFrequency() * 0.8;
            raiseLogit += (1.0 - profile.doubtFrequency()) * 0.5;
            if (profile.estimateBluffFrequency() > 0.35) {
                doubtLogit += 0.25;
            }
        }

        return softmax(Map.of(
                "DOUBT", doubtLogit,
                "RAISE", raiseLogit,
                "SPOT_ON", spotLogit));
    }

    /**
     * Online update: reward predicted action if it matched actual.
     * actualAction: DOUBT / RAISE / SPOT_ON
     */
    public void train(OpponentProfile profile, int activePlayers, String actualAction) {
        if (actualAction == null) {
            return;
        }
        Map<String, Double> features = extractFeatures(profile, activePlayers);
        Map<String, Double> predicted = predictOpponentAction(profile, activePlayers);
        String predictedAction = predicted.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("RAISE");

        boolean correct = predictedAction.equalsIgnoreCase(normalize(actualAction));
        predictionAccuracy.add(correct ? 1.0 : 0.0);
        while (predictionAccuracy.size() > 200) {
            predictionAccuracy.remove(0);
        }

        // Push weights toward features that predicted the actual action well
        double targetBoost = correct ? 0.02 : -0.02;
        for (Map.Entry<String, Double> e : weights.entrySet()) {
            double f = features.getOrDefault(e.getKey(), 0.0);
            e.setValue(e.getValue() + LEARNING_RATE * targetBoost * f);
        }
    }

    public double getRecentAccuracy() {
        if (predictionAccuracy.isEmpty()) {
            return 0.0;
        }
        return predictionAccuracy.stream().mapToDouble(d -> d).average().orElse(0);
    }

    private static double dominantFaceShare(OpponentProfile profile) {
        Map<Integer, Integer> faces = profile.getFacePreferences();
        if (faces.isEmpty()) {
            return 0.5;
        }
        int total = faces.values().stream().mapToInt(i -> i).sum();
        int max = faces.values().stream().mapToInt(i -> i).max().orElse(0);
        return total == 0 ? 0.5 : (double) max / total;
    }

    private static double stageWinRate(OpponentProfile profile, int activePlayers) {
        // Approximate using overall recent form when stage map is sparse
        return profile.recentForm();
    }

    private static Map<String, Double> softmax(Map<String, Double> logits) {
        double max = logits.values().stream().mapToDouble(d -> d).max().orElse(0);
        Map<String, Double> exps = new HashMap<>();
        double sum = 0;
        for (Map.Entry<String, Double> e : logits.entrySet()) {
            double v = Math.exp(e.getValue() - max);
            exps.put(e.getKey(), v);
            sum += v;
        }
        Map<String, Double> probs = new HashMap<>();
        for (Map.Entry<String, Double> e : exps.entrySet()) {
            probs.put(e.getKey(), e.getValue() / sum);
        }
        return probs;
    }

    private static String normalize(String action) {
        return switch (action.toLowerCase()) {
            case "doubt" -> "DOUBT";
            case "bid", "raise" -> "RAISE";
            case "spoton", "spot_on", "spot-on" -> "SPOT_ON";
            default -> action.toUpperCase();
        };
    }
}
