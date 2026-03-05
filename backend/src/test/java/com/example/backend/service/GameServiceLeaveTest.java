package com.example.backend.service;

import com.example.backend.dto.WebSocketMessage;
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
import java.util.Arrays;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServiceLeaveTest {

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
    void setUp() throws Exception {
        // Access the internal games map via reflection so we can seed test games
        Field gamesField = GameService.class.getDeclaredField("games");
        gamesField.setAccessible(true);
        gamesMap = (Map<String, Game>) gamesField.get(gameService);
    }

    /** Build a minimal in-progress multiplayer game with the given players. */
    private Game buildInProgressGame(Player... players) {
        Game game = new Game();
        game.setMultiplayer(true);
        game.setState(GameState.IN_PROGRESS);
        game.setWaitingForPlayers(false);
        game.getPlayers().addAll(Arrays.asList(players));
        game.setCurrentPlayerIndex(0);
        game.setDealerIndex(0);
        return game;
    }

    @Test
    void leaveGame_hostLeaves_cancelEntireGame() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Game game = buildInProgressGame(host, guest);
        gamesMap.put(game.getId(), game);

        gameService.leaveGame(game.getId(), host.getId());

        // Game must be removed from the map
        assertNull(gamesMap.get(game.getId()), "Game should be removed when host leaves");

        // A GAME_CANCELLED message must have been broadcast
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/game/" + game.getId()), captor.capture());
        WebSocketMessage msg = (WebSocketMessage) captor.getValue();
        assertEquals("GAME_CANCELLED", msg.getType());
    }

    @Test
    void leaveGame_nonHostLeaves_gameContinues() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Player third = new Player("Carol", "green");
        Game game = buildInProgressGame(host, guest, third);
        gamesMap.put(game.getId(), game);

        gameService.leaveGame(game.getId(), guest.getId());

        // Game must still be present
        assertNotNull(gamesMap.get(game.getId()), "Game should continue when non-host leaves");
        // Guest should be removed from player list
        assertTrue(game.getPlayers().stream().noneMatch(p -> p.getId().equals(guest.getId())));
    }

    @Test
    void leaveGame_nonHostLeaves_gameCancelledWhenOnlyOnePlayerLeft() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Game game = buildInProgressGame(host, guest);
        gamesMap.put(game.getId(), game);

        gameService.leaveGame(game.getId(), guest.getId());

        // Game must be removed because only 1 player would remain
        assertNull(gamesMap.get(game.getId()), "Game should be cancelled when only one player remains");

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate, atLeast(1)).convertAndSend(
                eq("/topic/game/" + game.getId()), captor.capture());
        boolean hasCancelled = captor.getAllValues().stream()
                .filter(v -> v instanceof WebSocketMessage)
                .map(v -> (WebSocketMessage) v)
                .anyMatch(m -> "GAME_CANCELLED".equals(m.getType()));
        assertTrue(hasCancelled, "GAME_CANCELLED message should be broadcast");
    }
}
