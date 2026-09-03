package com.example.backend.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GameRulesMatchpointTest {

    private Player p(String name, int tokens) {
        Player player = new Player(name, "blue");
        player.setWinTokens(tokens);
        return player;
    }

    @Test
    void normalRace_firstToSevenWinsWhenClearLead() {
        List<Player> players = List.of(p("A", 7), p("B", 5), p("C", 3));
        Player winner = GameRules.findGameWinner(players);
        assertNotNull(winner);
        assertEquals("A", winner.getName());
    }

    @Test
    void twoAtMatchpoint_sevenIsNotEnough() {
        List<Player> players = List.of(p("A", 7), p("B", 6), p("C", 2));
        assertNull(GameRules.findGameWinner(players));
        assertTrue(GameRules.isMatchpointOvertime(players));
    }

    @Test
    void overtime_winsWhenLeadingByTwo() {
        List<Player> players = List.of(p("A", 8), p("B", 6), p("C", 2));
        Player winner = GameRules.findGameWinner(players);
        assertNotNull(winner);
        assertEquals("A", winner.getName());
    }

    @Test
    void deuceContinuesUntilTwoAhead() {
        assertNull(GameRules.findGameWinner(List.of(p("A", 7), p("B", 7))));
        assertNull(GameRules.findGameWinner(List.of(p("A", 8), p("B", 7))));
        Player winner = GameRules.findGameWinner(List.of(p("A", 9), p("B", 7)));
        assertNotNull(winner);
        assertEquals("A", winner.getName());
    }

    @Test
    void belowSevenNeverWins() {
        assertNull(GameRules.findGameWinner(List.of(p("A", 6), p("B", 6), p("C", 6))));
    }
}
