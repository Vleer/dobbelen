package com.example.backend.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GameDealerTest {

    private Game threePlayerGame() {
        Player a = new Player("Alice", "blue");
        Player b = new Player("Bob", "red");
        Player c = new Player("Carol", "green");
        Game game = new Game(List.of(a, b, c));
        game.setDealerIndex(0);
        game.setRoundStartDealerIndex(0);
        game.setCurrentPlayerIndex(0);
        return game;
    }

    @Test
    void whenDealerEliminated_buttonFollowsHandStarter() {
        Game game = threePlayerGame();

        game.eliminatePlayer(game.getPlayers().get(0).getId());
        int starter = 1; // next seat after eliminated dealer
        game.setCurrentPlayerIndex(starter);
        game.syncDealerToHandStarter(starter);

        assertEquals(1, game.getDealerIndex(), "chip should sit on who starts");
        assertEquals(0, game.getRoundStartDealerIndex(), "round-start seat unchanged");
        assertEquals(game.getPlayers().get(1).getId(), game.getDealer().getId());
    }

    @Test
    void passDealerAfterMidRoundMove_advancesFromRoundStartAmongAllSeats() {
        Game game = threePlayerGame();

        // Dealer Alice eliminated; chip moved to Bob for the 2-player phase
        game.eliminatePlayer(game.getPlayers().get(0).getId());
        game.syncDealerToHandStarter(1);

        // Round ends — next button must be Bob (Alice+1), not Carol (Bob+1)
        game.passDealerToNextPlayer();

        assertEquals(1, game.getDealerIndex());
        assertEquals(1, game.getRoundStartDealerIndex());
        assertEquals("Bob", game.getDealer().getName());
    }

    @Test
    void passDealer_rotatesThroughAllThreeSeats() {
        Game game = threePlayerGame();

        game.passDealerToNextPlayer();
        assertEquals(1, game.getDealerIndex());

        game.passDealerToNextPlayer();
        assertEquals(2, game.getDealerIndex());

        game.passDealerToNextPlayer();
        assertEquals(0, game.getDealerIndex());
    }
}
