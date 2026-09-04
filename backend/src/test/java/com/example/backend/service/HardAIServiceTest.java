package com.example.backend.service;

import com.example.backend.model.Bid;
import com.example.backend.model.BidType;
import com.example.backend.model.Game;
import com.example.backend.model.Player;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HardAIServiceTest {

    private HardAIService service;

    @BeforeEach
    void setUp() {
        service = new HardAIService();
    }

    @Test
    void thinkingDelayNeverExceeds10Seconds() {
        for (int i = 0; i < 50; i++) {
            long first = service.getThinkingDelay(true);
            long normal = service.getThinkingDelay(false);
            assertTrue(first <= 10_000, "First turn delay must be <= 10s, got: " + first);
            assertTrue(normal <= 10_000, "Normal delay must be <= 10s, got: " + normal);
            assertTrue(first >= 6500 && first <= 8500, "First turn expected 6.5–8.5s, got: " + first);
            assertTrue(normal >= 1500 && normal <= 3500, "Normal expected 1.5–3.5s, got: " + normal);
        }
    }

    @Test
    void binomialProbabilityKnownCases() {
        // With 0 known and 16 unknown: P(>=1 of a face) should be high (~93%)
        double p1 = service.probabilityAtLeast(1, 0, 16);
        assertTrue(p1 > 0.90, "P(>=1 | 16 dice) should be >90%, got " + p1);

        // P(>=3 | 16) around 40%+ per design section 5.1
        double p3 = service.probabilityAtLeast(3, 0, 16);
        assertTrue(p3 > 0.30 && p3 < 0.55, "P(>=3 | 16) should be mid-range, got " + p3);

        // P(>=8 | 16) with p=1/6 is very low (mean ≈ 2.67)
        double p8 = service.probabilityAtLeast(8, 0, 16);
        assertTrue(p8 < 0.05, "P(>=8 | 16) should be very low, got " + p8);

        // Already have enough in hand
        assertEquals(1.0, service.probabilityAtLeast(2, 3, 12), 1e-9);

        // Impossible
        assertEquals(0.0, service.probabilityAtLeast(10, 0, 5), 1e-9);
    }

    @Test
    void exactProbabilitySumsWithAtLeast() {
        int unknown = 12;
        double sumExact = 0;
        for (int k = 0; k <= unknown; k++) {
            sumExact += service.probabilityExact(k, 0, unknown);
        }
        assertEquals(1.0, sumExact, 1e-6);

        double atLeast3 = service.probabilityAtLeast(3, 0, unknown);
        double sumFrom3 = 0;
        for (int k = 3; k <= unknown; k++) {
            sumFrom3 += service.probabilityExact(k, 0, unknown);
        }
        assertEquals(atLeast3, sumFrom3, 1e-6);
    }

    @Test
    void firstBidUsesOwnHand() {
        Player ai = new Player("🎯AI Test", "blue", "HARD_AI");
        ai.setDice(Arrays.asList(6, 6, 6, 2, 1));
        Player other = new Player("Human", "red");
        other.setDice(Arrays.asList(1, 2, 3, 4, 5));
        Player other2 = new Player("Human2", "green");
        other2.setDice(Arrays.asList(1, 2, 3, 4, 5));

        Game game = new Game(List.of(ai, other, other2));
        game.setCurrentBid(null);

        HardAIService.AIAction action = service.generateOptimalAction(game, ai);
        assertEquals("bid", action.getAction());
        assertNotNull(action.getQuantity());
        assertNotNull(action.getFaceValue());
        assertEquals(6, action.getFaceValue().intValue());
        assertTrue(action.getQuantity() >= 1 && action.getQuantity() <= 3);
    }

    @Test
    void doubtsVeryImplausibleBid() {
        Player ai = new Player("🎯AI Test", "blue", "HARD_AI");
        // No sixes in hand
        ai.setDice(Arrays.asList(1, 2, 3, 4, 5));
        Player bidder = new Player("Bidder", "red");
        bidder.setDice(Arrays.asList(1, 2, 3, 4, 5));
        Player other = new Player("Other", "green");
        other.setDice(Arrays.asList(1, 2, 3, 4, 5));
        Player other2 = new Player("Other2", "yellow");
        other2.setDice(Arrays.asList(1, 2, 3, 4, 5));

        Game game = new Game(List.of(ai, bidder, other, other2));
        // Bid 12 sixes with 20 dice and 0 in hand — extremely unlikely
        Bid crazy = new Bid(bidder.getId(), 12, 6, BidType.RAISE);
        game.setCurrentBid(crazy);

        HardAIService.AIAction action = service.generateOptimalAction(game, ai);
        assertEquals("doubt", action.getAction());
    }

    @Test
    void raisesSafeBidWhenHoldingStrongHand() {
        Player ai = new Player("🎯AI Test", "blue", "HARD_AI");
        ai.setDice(Arrays.asList(3, 3, 3, 3, 1));
        Player bidder = new Player("Bidder", "red");
        bidder.setDice(Arrays.asList(1, 2, 4, 5, 6));
        Player other = new Player("Other", "green");
        other.setDice(Arrays.asList(1, 2, 4, 5, 6));
        Player other2 = new Player("Other2", "yellow");
        other2.setDice(Arrays.asList(1, 2, 4, 5, 6));

        Game game = new Game(List.of(ai, bidder, other, other2));
        Bid soft = new Bid(bidder.getId(), 2, 3, BidType.RAISE);
        game.setCurrentBid(soft);

        HardAIService.AIAction action = service.generateOptimalAction(game, ai);
        assertEquals("bid", action.getAction());
        assertTrue(action.getQuantity() > 2
                || (action.getQuantity() == 2 && action.getFaceValue() > 3));
    }
}
