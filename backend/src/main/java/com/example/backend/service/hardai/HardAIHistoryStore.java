package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory historical game/bid recording (HardAIImprovements.md section 6).
 * Provides the same conceptual schema without requiring SQLite.
 */
@Component
public class HardAIHistoryStore {

    public static class GameRecord {
        public final String gameId;
        public final long date;
        public final List<String> playerIds;
        public String winnerId;
        public int totalRounds;
        public boolean aiVsHuman;
        public boolean aiWon;

        public GameRecord(String gameId, List<String> playerIds, boolean aiVsHuman) {
            this.gameId = gameId;
            this.date = System.currentTimeMillis();
            this.playerIds = new ArrayList<>(playerIds);
            this.aiVsHuman = aiVsHuman;
        }
    }

    public static class RoundRecord {
        public final String gameId;
        public final int roundNumber;
        public final String stage;
        public final int numDice;
        public String winnerId;
        public String eliminatedId;
        public Integer finalBidCount;
        public Integer finalBidFace;
        public Integer actualCount;

        public RoundRecord(String gameId, int roundNumber, String stage, int numDice) {
            this.gameId = gameId;
            this.roundNumber = roundNumber;
            this.stage = stage;
            this.numDice = numDice;
        }
    }

    public static class BidRecord {
        public final String gameId;
        public final int roundNumber;
        public final String bidderId;
        public final int position;
        public final int count;
        public final int face;
        public Boolean wasBluff;
        public boolean wasChallenged;
        public String challengeOutcome;

        public BidRecord(String gameId, int roundNumber, String bidderId, int position,
                int count, int face) {
            this.gameId = gameId;
            this.roundNumber = roundNumber;
            this.bidderId = bidderId;
            this.position = position;
            this.count = count;
            this.face = face;
        }
    }

    private final Map<String, GameRecord> games = new ConcurrentHashMap<>();
    private final List<RoundRecord> rounds = new CopyOnWriteArrayList<>();
    private final List<BidRecord> bids = new CopyOnWriteArrayList<>();
    private final Map<String, Integer> bidPositionCounter = new ConcurrentHashMap<>();

    public void ensureGame(String gameId, List<String> playerIds, boolean aiVsHuman) {
        games.computeIfAbsent(gameId, id -> new GameRecord(id, playerIds, aiVsHuman));
    }

    public void recordRoundStart(String gameId, int roundNumber, String stage, int numDice) {
        rounds.add(new RoundRecord(gameId, roundNumber, stage, numDice));
        bidPositionCounter.put(gameId + ":" + roundNumber, 0);
    }

    public void recordBid(String gameId, int roundNumber, String bidderId, int count, int face) {
        String key = gameId + ":" + roundNumber;
        int pos = bidPositionCounter.merge(key, 1, Integer::sum);
        bids.add(new BidRecord(gameId, roundNumber, bidderId, pos, count, face));
    }

    public void recordChallenge(String gameId, int roundNumber, int finalCount, int finalFace,
            int actualCount, String eliminatedId, String winnerId, boolean wasSpotOn) {
        // Update last matching bid
        for (int i = bids.size() - 1; i >= 0; i--) {
            BidRecord b = bids.get(i);
            if (b.gameId.equals(gameId) && b.roundNumber == roundNumber
                    && b.count == finalCount && b.face == finalFace) {
                b.wasChallenged = true;
                b.wasBluff = actualCount < finalCount;
                if (wasSpotOn) {
                    b.challengeOutcome = actualCount == finalCount ? "spot_on" : "failed";
                } else {
                    b.challengeOutcome = actualCount < finalCount ? "success" : "failed";
                }
                break;
            }
        }

        for (int i = rounds.size() - 1; i >= 0; i--) {
            RoundRecord r = rounds.get(i);
            if (r.gameId.equals(gameId) && r.roundNumber == roundNumber) {
                r.finalBidCount = finalCount;
                r.finalBidFace = finalFace;
                r.actualCount = actualCount;
                r.eliminatedId = eliminatedId;
                r.winnerId = winnerId;
                break;
            }
        }

        GameRecord g = games.get(gameId);
        if (g != null) {
            g.totalRounds = Math.max(g.totalRounds, roundNumber);
        }
    }

    public void recordGameEnd(String gameId, String winnerId, boolean aiWon) {
        GameRecord g = games.get(gameId);
        if (g != null) {
            g.winnerId = winnerId;
            g.aiWon = aiWon;
        }
    }

    public List<BidRecord> recentBidsFor(String bidderId, int limit) {
        List<BidRecord> result = new ArrayList<>();
        for (int i = bids.size() - 1; i >= 0 && result.size() < limit; i--) {
            BidRecord b = bids.get(i);
            if (b.bidderId.equals(bidderId)) {
                result.add(b);
            }
        }
        return result;
    }

    public double bluffFrequency(String bidderId, int window) {
        List<BidRecord> recent = recentBidsFor(bidderId, window);
        if (recent.isEmpty()) {
            return 0.2;
        }
        long bluffs = recent.stream().filter(b -> Boolean.TRUE.equals(b.wasBluff)).count();
        long resolved = recent.stream().filter(b -> b.wasBluff != null).count();
        if (resolved == 0) {
            return 0.2;
        }
        return (double) bluffs / resolved;
    }

    public int gameCount() {
        return games.size();
    }

    public int bidCount() {
        return bids.size();
    }

    public int roundCount() {
        return rounds.size();
    }
}
