package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    private static final int MAX_BIDS = 5_000;
    private static final int MAX_ROUNDS = 2_000;
    private static final int MAX_GAMES = 500;

    private final Map<String, GameRecord> games = new ConcurrentHashMap<>();
    /**
     * Bounded ring buffers for the round/bid history.
     *
     * <p>These were previously unbounded {@link CopyOnWriteArrayList}s: every bid and every round
     * was retained for the lifetime of the process, and because {@code CopyOnWriteArrayList.add}
     * copies the whole backing array on every insert, appending N records cost O(N^2) in total.
     * A capped {@link ArrayDeque} gives O(1) appends and a fixed memory ceiling.
     *
     * <p>All access is guarded by {@code historyLock}.
     */
    private final ArrayDeque<RoundRecord> rounds = new ArrayDeque<>();
    private final ArrayDeque<BidRecord> bids = new ArrayDeque<>();
    private final Object historyLock = new Object();

    private final Map<String, Integer> bidPositionCounter = new ConcurrentHashMap<>();

    private static <T> void addBounded(ArrayDeque<T> deque, T value, int max) {
        synchronized (deque) {
            deque.addLast(value);
            while (deque.size() > max) {
                deque.removeFirst();
            }
        }
    }

    /** Snapshot in chronological order so callers can iterate without holding the lock. */
    private static <T> List<T> snapshot(ArrayDeque<T> deque) {
        synchronized (deque) {
            return new ArrayList<>(deque);
        }
    }

    public void ensureGame(String gameId, List<String> playerIds, boolean aiVsHuman) {
        games.computeIfAbsent(gameId, id -> new GameRecord(id, playerIds, aiVsHuman));
        // Keep the game map bounded: evict the oldest entries once it grows past the cap.
        while (games.size() > MAX_GAMES) {
            String oldestKey = null;
            long oldestDate = Long.MAX_VALUE;
            for (Map.Entry<String, GameRecord> entry : games.entrySet()) {
                if (entry.getValue().date < oldestDate) {
                    oldestDate = entry.getValue().date;
                    oldestKey = entry.getKey();
                }
            }
            if (oldestKey == null || !games.remove(oldestKey, games.get(oldestKey))) {
                break;
            }
        }
    }

    public void recordRoundStart(String gameId, int roundNumber, String stage, int numDice) {
        addBounded(rounds, new RoundRecord(gameId, roundNumber, stage, numDice), MAX_ROUNDS);
        bidPositionCounter.put(gameId + ":" + roundNumber, 0);
    }

    public void recordBid(String gameId, int roundNumber, String bidderId, int count, int face) {
        String key = gameId + ":" + roundNumber;
        int pos = bidPositionCounter.merge(key, 1, Integer::sum);
        addBounded(bids, new BidRecord(gameId, roundNumber, bidderId, pos, count, face), MAX_BIDS);
    }

    public void recordChallenge(String gameId, int roundNumber, int finalCount, int finalFace,
            int actualCount, String eliminatedId, String winnerId, boolean wasSpotOn) {
        // Update last matching bid
        List<BidRecord> bidSnapshot = snapshot(bids);
        for (int i = bidSnapshot.size() - 1; i >= 0; i--) {
            BidRecord b = bidSnapshot.get(i);
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

        List<RoundRecord> roundSnapshot = snapshot(rounds);
        for (int i = roundSnapshot.size() - 1; i >= 0; i--) {
            RoundRecord r = roundSnapshot.get(i);
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

    /**
     * Drop all history retained for a game that has been removed. The round/bid buffers are bounded
     * in size, but without this they still held every record of finished games until they aged out
     * of the ring buffer.
     */
    public void clearGame(String gameId) {
        games.remove(gameId);
        bidPositionCounter.keySet().removeIf(key -> key.startsWith(gameId + ":"));

        synchronized (bids) {
            Iterator<BidRecord> bidIterator = bids.iterator();
            while (bidIterator.hasNext()) {
                if (bidIterator.next().gameId.equals(gameId)) {
                    bidIterator.remove();
                }
            }
        }
        synchronized (rounds) {
            Iterator<RoundRecord> roundIterator = rounds.iterator();
            while (roundIterator.hasNext()) {
                if (roundIterator.next().gameId.equals(gameId)) {
                    roundIterator.remove();
                }
            }
        }
    }

    public List<BidRecord> recentBidsFor(String bidderId, int limit) {
        List<BidRecord> result = new ArrayList<>();
        List<BidRecord> bidSnapshot = snapshot(bids);
        for (int i = bidSnapshot.size() - 1; i >= 0 && result.size() < limit; i--) {
            BidRecord b = bidSnapshot.get(i);
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
