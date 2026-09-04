package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Extracts recurrent tendencies from historical bid data (section 6.2).
 */
@Component
public class PatternRecognizer {

    private final HardAIHistoryStore historyStore;

    public PatternRecognizer(HardAIHistoryStore historyStore) {
        this.historyStore = historyStore;
    }

    public Map<String, Object> detectTendencies(String opponentId, OpponentProfile profile) {
        Map<String, Object> patterns = new HashMap<>();
        patterns.put("favored_faces", favoredFaces(profile));
        patterns.put("doubt_frequency", profile != null ? profile.doubtFrequency() : 0.25);
        patterns.put("bluff_frequency", profile != null
                ? profile.estimateBluffFrequency()
                : historyStore.bluffFrequency(opponentId, 50));
        patterns.put("aggression", profile != null ? profile.aggressionScore() : 40.0);
        patterns.put("risk_tolerance", profile != null ? profile.riskTolerance() : 30.0);
        patterns.put("bid_variance", profile != null ? profile.bidVariance() : 0.3);
        return patterns;
    }

    private Map<Integer, Double> favoredFaces(OpponentProfile profile) {
        Map<Integer, Double> result = new HashMap<>();
        if (profile == null || profile.getFacePreferences().isEmpty()) {
            return result;
        }
        int total = profile.getFacePreferences().values().stream().mapToInt(i -> i).sum();
        if (total == 0) {
            return result;
        }
        for (Map.Entry<Integer, Integer> e : profile.getFacePreferences().entrySet()) {
            result.put(e.getKey(), (double) e.getValue() / total);
        }
        return result;
    }

    public boolean opponentRarelyDoubts(OpponentProfile profile) {
        return profile != null && profile.doubtFrequency() < 0.15;
    }

    public boolean opponentAlwaysDoubts(OpponentProfile profile) {
        return profile != null && profile.doubtFrequency() > 0.40;
    }

    public List<HardAIHistoryStore.BidRecord> recentBids(String opponentId) {
        return historyStore.recentBidsFor(opponentId, 50);
    }
}
