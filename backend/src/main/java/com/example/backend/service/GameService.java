package com.example.backend.service;

import com.example.backend.model.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {
    private final Map<String, Game> games = new ConcurrentHashMap<>();

    public Game createGame(List<String> playerNames) {
        if (playerNames == null || playerNames.size() < 3) {
            throw new IllegalArgumentException("Game requires at least 3 players");
        }

        List<Player> players = playerNames.stream()
                .map(Player::new)
                .toList();

        Game game = new Game(players);
        
        // Roll initial dice for all players
        for (Player player : game.getPlayers()) {
            player.rollDice();
        }

        games.put(game.getId(), game);
        return game;
    }

    public Game getGame(String gameId) {
        Game game = games.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found: " + gameId);
        }
        return game;
    }

    public List<Game> getAllGames() {
        return new ArrayList<>(games.values());
    }

    public void startNewRound(String gameId) {
        Game game = getGame(gameId);
        
        // Reset all players for new round
        for (Player player : game.getPlayers()) {
            player.reset();
            player.rollDice();
        }
        
        // Reset game state
        game.setEliminatedPlayers(new ArrayList<>());
        game.setCurrentPlayerIndex(0);
        game.setCurrentBid(null);
        game.setWinner(null);
        game.setState(GameState.IN_PROGRESS);
        game.setRoundNumber(game.getRoundNumber() + 1);
    }

    public int countDiceWithValue(List<Player> players, int faceValue, boolean wildOnes) {
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

    public boolean isBidValid(Bid newBid, Bid previousBid) {
        if (previousBid == null) {
            return true; // First bid is always valid
        }

        // New bid must either:
        // 1. Increase the quantity, OR
        // 2. Increase the face value while maintaining or increasing quantity
        return newBid.getQuantity() > previousBid.getQuantity() ||
               (newBid.getFaceValue() > previousBid.getFaceValue() && 
                newBid.getQuantity() >= previousBid.getQuantity());
    }

    public GameResult processDoubt(String gameId, String doubtingPlayerId) {
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new IllegalStateException("No current bid to doubt");
        }

        List<Player> activePlayers = game.getActivePlayers();
        int actualCount = countDiceWithValue(activePlayers, currentBid.getFaceValue(), true);
        
        String eliminatedPlayerId;
        if (actualCount >= currentBid.getQuantity()) {
            // Bid was accurate or understated - doubter is eliminated
            eliminatedPlayerId = doubtingPlayerId;
        } else {
            // Bid was overstated - bidder is eliminated
            eliminatedPlayerId = currentBid.getPlayerId();
        }

        // Eliminate the player
        game.getEliminatedPlayers().add(eliminatedPlayerId);
        game.getPlayers().stream()
                .filter(p -> p.getId().equals(eliminatedPlayerId))
                .findFirst()
                .ifPresent(Player::eliminate);

        // Check if round is over
        if (game.getActivePlayers().size() <= 1) {
            game.setState(GameState.ROUND_ENDED);
            if (game.getActivePlayers().size() == 1) {
                game.setWinner(game.getActivePlayers().get(0).getId());
            }
        }

        return new GameResult(game, eliminatedPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processSpotOn(String gameId, String spotOnPlayerId) {
        Game game = getGame(gameId);
        Bid currentBid = game.getCurrentBid();
        
        if (currentBid == null) {
            throw new IllegalStateException("No current bid to call spot on");
        }

        List<Player> activePlayers = game.getActivePlayers();
        int actualCount = countDiceWithValue(activePlayers, currentBid.getFaceValue(), true);
        
        if (actualCount == currentBid.getQuantity()) {
            // Spot on is correct - all other players are eliminated
            game.setState(GameState.ROUND_ENDED);
            game.setWinner(spotOnPlayerId);
            
            // Eliminate all other players
            for (Player player : game.getActivePlayers()) {
                if (!player.getId().equals(spotOnPlayerId)) {
                    game.getEliminatedPlayers().add(player.getId());
                    player.eliminate();
                }
            }
        } else {
            // Spot on is wrong - spot on player is eliminated
            game.getEliminatedPlayers().add(spotOnPlayerId);
            game.getPlayers().stream()
                    .filter(p -> p.getId().equals(spotOnPlayerId))
                    .findFirst()
                    .ifPresent(Player::eliminate);

            // Check if round is over
            if (game.getActivePlayers().size() <= 1) {
                game.setState(GameState.ROUND_ENDED);
                if (game.getActivePlayers().size() == 1) {
                    game.setWinner(game.getActivePlayers().get(0).getId());
                }
            }
        }

        return new GameResult(game, spotOnPlayerId, actualCount, currentBid.getQuantity());
    }

    public static class GameResult {
        private final Game game;
        private final String eliminatedPlayerId;
        private final int actualCount;
        private final int bidQuantity;

        public GameResult(Game game, String eliminatedPlayerId, int actualCount, int bidQuantity) {
            this.game = game;
            this.eliminatedPlayerId = eliminatedPlayerId;
            this.actualCount = actualCount;
            this.bidQuantity = bidQuantity;
        }

        public Game getGame() { return game; }
        public String getEliminatedPlayerId() { return eliminatedPlayerId; }
        public int getActualCount() { return actualCount; }
        public int getBidQuantity() { return bidQuantity; }
    }
}
