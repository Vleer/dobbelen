package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Creates and updates opponent profiles from live game events.
 */
@Component
public class OpponentProfiler {

    private final Map<String, OpponentProfile> profiles = new ConcurrentHashMap<>();

    public OpponentProfile getOrCreate(String playerId, String name, boolean human) {
        return profiles.computeIfAbsent(playerId, id -> new OpponentProfile(id, name, human));
    }

    public OpponentProfile get(String playerId) {
        return profiles.get(playerId);
    }

    public Map<String, OpponentProfile> allProfiles() {
        return profiles;
    }

    public void recordBid(String playerId, String name, boolean human,
            int quantity, int face, int totalDice, int raiseAmount, double priorAchievability) {
        OpponentProfile profile = getOrCreate(playerId, name, human);
        profile.recordBidMade(quantity, face, totalDice, raiseAmount, priorAchievability);
    }

    public void recordBidResolved(String playerId, String name, boolean human,
            int quantity, int face, int totalDice, int raiseAmount,
            double priorAchievability, boolean wasTrue) {
        OpponentProfile profile = getOrCreate(playerId, name, human);
        profile.recordBidResolved(quantity, face, totalDice, raiseAmount, priorAchievability, wasTrue);
    }

    public void recordDoubt(String playerId, String name, boolean human, boolean correct) {
        OpponentProfile profile = getOrCreate(playerId, name, human);
        profile.recordDoubt(correct);
    }

    public void recordSpotOn(String playerId, String name, boolean human, boolean correct) {
        OpponentProfile profile = getOrCreate(playerId, name, human);
        profile.recordSpotOn(correct);
    }

    public void recordRound(String playerId, String name, boolean human, String stage, boolean wonRound) {
        OpponentProfile profile = getOrCreate(playerId, name, human);
        profile.recordRoundPlayed();
        profile.recordStageOutcome(stage, wonRound);
    }

    public void recordGame(String playerId, String name, boolean human, boolean won) {
        OpponentProfile profile = getOrCreate(playerId, name, human);
        profile.recordGamePlayed(won);
    }
}
