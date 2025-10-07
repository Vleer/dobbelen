package com.example.backend.model;

import java.util.List;

public class GameRules {
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
}
