package com.example.backend.model;

import java.util.List;

public class GameRules {
    /** First row of score pips / normal race target. */
    public static final int BASE_POINTS_TO_WIN = 7;
    /** Tokens at which a player is at matchpoint (one away from base win). */
    public static final int MATCHPOINT_THRESHOLD = BASE_POINTS_TO_WIN - 1;
    /** Once two players reach matchpoint, must lead by this many points. */
    public static final int WIN_MARGIN = 2;

    public static boolean isBidValid(Bid newBid, Bid previousBid) {
        if (previousBid == null) {
            return true;
        }
        return newBid.getQuantity() > previousBid.getQuantity() ||
               (newBid.getFaceValue() > previousBid.getFaceValue() && newBid.getQuantity() >= previousBid.getQuantity());
    }

    public static int countDiceWithValue(List<Player> players, int faceValue, boolean wildOnes) {
        int count = 0;
        for (Player player : players) {
            for (int die : player.getDice()) {
                if (die == faceValue || (wildOnes && die == 1)) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Win if a player has at least {@link #BASE_POINTS_TO_WIN} tokens and leads
     * every other player by {@link #WIN_MARGIN}. That means a normal race to 7
     * when only one player is near the top, and win-by-2 overtime once two
     * players have reached matchpoint.
     */
    public static Player findGameWinner(List<Player> players) {
        if (players == null || players.isEmpty()) {
            return null;
        }
        Player leader = null;
        int max = -1;
        int second = -1;
        for (Player player : players) {
            int tokens = player.getWinTokens();
            if (tokens > max) {
                second = max;
                max = tokens;
                leader = player;
            } else if (tokens > second) {
                second = tokens;
            }
        }
        if (leader == null || max < BASE_POINTS_TO_WIN) {
            return null;
        }
        if (second < 0) {
            second = 0;
        }
        return max >= second + WIN_MARGIN ? leader : null;
    }

    /** True when two or more players are at matchpoint (overtime / win-by-2). */
    public static boolean isMatchpointOvertime(List<Player> players) {
        if (players == null) {
            return false;
        }
        int atOrAboveMatchpoint = 0;
        for (Player player : players) {
            if (player.getWinTokens() >= MATCHPOINT_THRESHOLD) {
                atOrAboveMatchpoint++;
            }
        }
        return atOrAboveMatchpoint >= 2;
    }
}
