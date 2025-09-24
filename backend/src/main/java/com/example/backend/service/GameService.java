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
        
        // Check if game is already completed
        if (game.hasGameWinner()) {
            System.out.println("Game already has winner, not starting new round");
            return; // Don't start new round if game is over
        }

        System.out.println("Starting new round " + (game.getRoundNumber() + 1) + " for game " + gameId);

        // Reset all players for new round (but keep win tokens)
        for (Player player : game.getPlayers()) {
            player.reset();
            player.rollDice();
        }
        
        // Reset game state
        game.setEliminatedPlayers(new ArrayList<>());
        // Randomize starting player
        game.setCurrentPlayerIndex((int) (Math.random() * game.getPlayers().size()));
        game.setCurrentBid(null);
        game.setPreviousBid(null);
        game.setWinner(null);
        game.setState(GameState.IN_PROGRESS);
        game.setRoundNumber(game.getRoundNumber() + 1);

        System.out.println("New round started. State: " + game.getState() + ", Current player: "
                + game.getCurrentPlayer().getName());
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

        // Reroll dice for all remaining active players
        for (Player player : game.getActivePlayers()) {
            player.rollDice();
        }

        // Reset the current bid after elimination
        game.setCurrentBid(null);

        // Always adjust current player index to skip eliminated players
        int attempts = 0;
        while (game.getEliminatedPlayers().contains(game.getCurrentPlayer().getId())
                && attempts < game.getPlayers().size()) {
            game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());
            attempts++;
        }

        // Check if round is over
        if (game.getActivePlayers().size() <= 1) {
            if (game.getActivePlayers().size() == 1) {
                Player roundWinner = game.getActivePlayers().get(0);
                game.setWinner(roundWinner.getId());
                roundWinner.addWinToken();

                // Check if this player has won the entire game
                if (roundWinner.getWinTokens() >= 7) {
                    game.setGameWinner(roundWinner.getId());
                    game.setState(GameState.GAME_ENDED);
                    System.out.println("Game ended! Winner: " + roundWinner.getName() + " with "
                            + roundWinner.getWinTokens() + " tokens");
                } else {
                    // Pass dealer button to the winner
                    game.setDealerIndex(game.getPlayers().indexOf(roundWinner));
                    System.out.println("Dealer button passed to: " + roundWinner.getName());

                    // Start new round automatically
                    System.out.println("Starting new round automatically. Winner: " + roundWinner.getName() + " with "
                            + roundWinner.getWinTokens() + " tokens");
                    startNewRound(gameId);
                }
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
            game.setWinner(spotOnPlayerId);
            
            // Award win token to the spot on player
            Player spotOnPlayer = game.getPlayers().stream()
                    .filter(p -> p.getId().equals(spotOnPlayerId))
                    .findFirst()
                    .orElse(null);
            if (spotOnPlayer != null) {
                spotOnPlayer.addWinToken();

                // Check if this player has won the entire game
                if (spotOnPlayer.getWinTokens() >= 7) {
                    game.setGameWinner(spotOnPlayer.getId());
                    game.setState(GameState.GAME_ENDED);
                } else {
                    // Start new round automatically
                    startNewRound(gameId);
                }
            }

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

            // Reroll dice for all remaining active players
            for (Player player : game.getActivePlayers()) {
                player.rollDice();
            }

            // Reset the current bid after elimination
            game.setCurrentBid(null);

            // Always adjust current player index to skip eliminated players
            int attempts = 0;
            while (game.getEliminatedPlayers().contains(game.getCurrentPlayer().getId())
                    && attempts < game.getPlayers().size()) {
                game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());
                attempts++;
            }

            // Check if round is over
            if (game.getActivePlayers().size() <= 1) {
                if (game.getActivePlayers().size() == 1) {
                    Player roundWinner = game.getActivePlayers().get(0);
                    game.setWinner(roundWinner.getId());
                    roundWinner.addWinToken();

                    // Check if this player has won the entire game
                    if (roundWinner.getWinTokens() >= 7) {
                        game.setGameWinner(roundWinner.getId());
                        game.setState(GameState.GAME_ENDED);
                    } else {
                        // Pass dealer button to the winner
                        game.setDealerIndex(game.getPlayers().indexOf(roundWinner));
                        System.out.println("Dealer button passed to: " + roundWinner.getName());

                        // Start new round automatically
                        startNewRound(gameId);
                    }
                }
            }
        }

        return new GameResult(game, spotOnPlayerId, actualCount, currentBid.getQuantity());
    }

    public GameResult processBid(String gameId, String playerId, int quantity, int faceValue) {
        Game game = getGame(gameId);

        if (game.getState() != GameState.IN_PROGRESS) {
            throw new IllegalStateException("Game is not in progress. Current state: " + game.getState());
        }

        Player currentPlayer = game.getCurrentPlayer();
        if (currentPlayer == null) {
            throw new IllegalArgumentException("No current player found");
        }

        if (!currentPlayer.getId().equals(playerId)) {
            throw new IllegalArgumentException("It's not this player's turn. Current player: " + currentPlayer.getId()
                    + ", Requested player: " + playerId);
        }

        if (game.getEliminatedPlayers().contains(playerId)) {
            throw new IllegalArgumentException("Player is eliminated");
        }

        Bid newBid = new Bid(playerId, quantity, faceValue, BidType.RAISE);

        if (!isBidValid(newBid, game.getCurrentBid())) {
            String currentBidStr = game.getCurrentBid() != null
                    ? game.getCurrentBid().getQuantity() + " of " + game.getCurrentBid().getFaceValue()
                    : "none";
            throw new IllegalArgumentException("Invalid bid. Current bid: " + currentBidStr +
                    ", New bid: " + quantity + " of " + faceValue + ". Must increase quantity or face value");
        }

        // Store the current bid as previous before setting the new one
        game.setPreviousBid(game.getCurrentBid());
        game.setCurrentBid(newBid);

        // Move to next player
        game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());

        // Skip eliminated players - ensure we don't get stuck in infinite loop
        int attempts = 0;
        while (game.getEliminatedPlayers().contains(game.getCurrentPlayer().getId())
                && attempts < game.getPlayers().size()) {
            game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % game.getPlayers().size());
            attempts++;
        }

        return new GameResult(game, null, 0, 0);
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
