package com.example.backend.service;

import com.example.backend.dto.GameResponse;
import com.example.backend.dto.WebSocketMessage;
import com.example.backend.model.Bid;
import com.example.backend.model.BidType;
import com.example.backend.model.Game;
import com.example.backend.model.GameState;
import com.example.backend.model.Player;
import com.example.backend.repository.mongo.GameMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServiceDoubtTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private GameMongoRepository gameMongoRepository;

    @Mock
    private EasyAIService easyAIService;

    @Mock
    private MediumAIService mediumAIService;

    @InjectMocks
    private GameService gameService;

    private Map<String, Game> gamesMap;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        Field gamesField = GameService.class.getDeclaredField("games");
        gamesField.setAccessible(true);
        gamesMap = (Map<String, Game>) gamesField.get(gameService);
    }

    private Game buildGameWithDice(Player p1, Player p2, Player p3) {
        Game game = new Game();
        game.setMultiplayer(true);
        game.setState(GameState.IN_PROGRESS);
        game.setWaitingForPlayers(false);
        game.getPlayers().addAll(Arrays.asList(p1, p2, p3));
        game.setCurrentPlayerIndex(0);
        game.setDealerIndex(0);
        return game;
    }

    @Test
    void testProcessDoubt_OverstatedBid_BidderEliminated_DicePreserved() {
        Player p1 = new Player("Alice", "blue");
        p1.setDice(new ArrayList<>(Arrays.asList(2, 3, 4, 5, 6))); // 0 ones
        Player p2 = new Player("Bob", "red");
        p2.setDice(new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5))); // 1 one
        Player p3 = new Player("Carol", "green");
        p3.setDice(new ArrayList<>(Arrays.asList(2, 2, 3, 4, 5))); // 0 ones

        Game game = buildGameWithDice(p1, p2, p3);
        // Alice bid 2 ones
        game.setCurrentBid(new Bid(p1.getId(), 2, 1, BidType.RAISE));
        game.setCurrentPlayerIndex(1); // Bob's turn
        gamesMap.put(game.getId(), game);

        // Bob doubts Alice's bid of 2 ones (actual count is 1)
        GameService.GameResult result = gameService.processDoubt(game.getId(), p2.getId());

        assertEquals(p1.getId(), result.getEliminatedPlayerId(), "Alice should be eliminated because bid was overstated");
        assertEquals(1, result.getActualCount(), "Actual count of ones should be 1");
        assertEquals(2, result.getBidQuantity(), "Bid quantity was 2");
        assertTrue(game.isShowAllDice(), "Game should show all dice during reveal");

        // Verify dice are preserved for all players including eliminated Alice
        assertEquals(3, game.getPreviousRoundPlayers().size(), "Previous round players snapshot must contain all active players");
        Player prevAlice = game.getPreviousRoundPlayers().stream().filter(p -> p.getId().equals(p1.getId())).findFirst().orElse(null);
        assertNotNull(prevAlice);
        assertEquals(Arrays.asList(2, 3, 4, 5, 6), prevAlice.getDice(), "Alice's dice snapshot must be preserved");

        // Check GameResponse during reveal
        GameResponse response = new GameResponse(game, p2.getId());
        assertTrue(response.isShowAllDice());
        GameResponse.PlayerInfo prevRespAlice = response.getPlayers().stream().filter(p -> p.getId().equals(p1.getId())).findFirst().orElse(null);
        assertNotNull(prevRespAlice);
        assertEquals(5, prevRespAlice.getDice().size(), "GameResponse must include eliminated player's dice during showAllDice");

        // Verify broadcast occurred
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/game/" + game.getId()), any(WebSocketMessage.class));
    }

    @Test
    void testProcessDoubt_UnderstatedBid_DoubterEliminated_DicePreserved() {
        Player p1 = new Player("Alice", "blue");
        p1.setDice(new ArrayList<>(Arrays.asList(4, 4, 4, 5, 6))); // 3 fours
        Player p2 = new Player("Bob", "red");
        p2.setDice(new ArrayList<>(Arrays.asList(4, 4, 3, 2, 1))); // 2 fours
        Player p3 = new Player("Carol", "green");
        p3.setDice(new ArrayList<>(Arrays.asList(1, 2, 3, 5, 6))); // 0 fours

        Game game = buildGameWithDice(p1, p2, p3);
        // Alice bid 4 fours (actual is 5)
        game.setCurrentBid(new Bid(p1.getId(), 4, 4, BidType.RAISE));
        game.setCurrentPlayerIndex(1); // Bob's turn
        gamesMap.put(game.getId(), game);

        // Bob doubts Alice's accurate bid
        GameService.GameResult result = gameService.processDoubt(game.getId(), p2.getId());

        assertEquals(p2.getId(), result.getEliminatedPlayerId(), "Bob should be eliminated because bid was accurate/understated");
        assertEquals(5, result.getActualCount(), "Actual count of fours should be 5");
        assertTrue(game.isShowAllDice());
        assertTrue(p2.isEliminated());
    }

    @Test
    void testContinueGame_RerollsDiceAndHides() {
        Player p1 = new Player("Alice", "blue");
        p1.setDice(new ArrayList<>(Arrays.asList(1, 1, 1, 1, 1)));
        Player p2 = new Player("Bob", "red");
        p2.setDice(new ArrayList<>(Arrays.asList(2, 2, 2, 2, 2)));

        Game game = new Game();
        game.setMultiplayer(true);
        game.setState(GameState.IN_PROGRESS);
        game.setShowAllDice(true);
        game.setCanContinue(true);
        game.getPlayers().addAll(Arrays.asList(p1, p2));
        gamesMap.put(game.getId(), game);

        gameService.continueGame(game.getId());

        assertFalse(game.isShowAllDice(), "showAllDice must be reset to false");
        assertFalse(game.isCanContinue(), "canContinue must be reset to false");
        assertEquals(5, p1.getDice().size());
        assertEquals(5, p2.getDice().size());
    }
}
