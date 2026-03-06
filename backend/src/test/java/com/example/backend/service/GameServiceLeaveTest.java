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
    private Map<String, Long> activityMap;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        // Access the internal games map via reflection so we can seed test games
        Field gamesField = GameService.class.getDeclaredField("games");
        gamesField.setAccessible(true);
        gamesMap = (Map<String, Game>) gamesField.get(gameService);

        // Access the activity map via reflection for inactivity timeout tests
        Field activityField = GameService.class.getDeclaredField("lastActivityByGameAndPlayer");
        activityField.setAccessible(true);
        activityMap = (Map<String, Long>) activityField.get(gameService);
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

    @Test
    void checkDisconnectedCurrentPlayers_hostInactiveLessThan3Hours_gameNotCancelled() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Player third = new Player("Carol", "green");
        Game game = buildInProgressGame(host, guest, third);
        // Host is current player
        game.setCurrentPlayerIndex(0);
        gamesMap.put(game.getId(), game);

        // Record host activity 2 hours ago (under 3-hour threshold)
        long twoHoursAgo = System.currentTimeMillis() - (2 * 60 * 60 * 1000L);
        activityMap.put(game.getId() + ":" + host.getId(), twoHoursAgo);

        gameService.checkDisconnectedCurrentPlayers();

        // Game must still be present — host inactive for only 2 hours should not cancel the game
        assertNotNull(gamesMap.get(game.getId()), "Game should not be cancelled when host has been inactive for less than 3 hours");
    }

    @Test
    void checkDisconnectedCurrentPlayers_hostInactiveOver3Hours_gameCancelled() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Player third = new Player("Carol", "green");
        Game game = buildInProgressGame(host, guest, third);
        // Host is current player
        game.setCurrentPlayerIndex(0);
        gamesMap.put(game.getId(), game);

        // Record host activity 4 hours ago (over 3-hour threshold)
        long fourHoursAgo = System.currentTimeMillis() - (4 * 60 * 60 * 1000L);
        activityMap.put(game.getId() + ":" + host.getId(), fourHoursAgo);

        gameService.checkDisconnectedCurrentPlayers();

        // Game must be cancelled after host has been inactive for more than 3 hours
        assertNull(gamesMap.get(game.getId()), "Game should be cancelled when host has been inactive for more than 3 hours");
    }

    @Test
    void checkDisconnectedCurrentPlayers_nonHostInactiveUnder5Minutes_playerNotRemoved() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Player third = new Player("Carol", "green");
        Game game = buildInProgressGame(host, guest, third);
        // Guest is current player (index 1)
        game.setCurrentPlayerIndex(1);
        gamesMap.put(game.getId(), game);

        // Record guest activity 90 seconds ago (under 5-minute threshold)
        long ninetySecondsAgo = System.currentTimeMillis() - 90_000L;
        activityMap.put(game.getId() + ":" + guest.getId(), ninetySecondsAgo);

        gameService.checkDisconnectedCurrentPlayers();

        // Game and guest should still be present — 90 seconds is under the 5-minute threshold
        assertNotNull(gamesMap.get(game.getId()), "Game should still exist when non-host player has been inactive for less than 5 minutes");
        assertTrue(game.getPlayers().stream().anyMatch(p -> p.getId().equals(guest.getId())),
                "Non-host player should not be removed after only 90s inactivity");
    }

    @Test
    void checkDisconnectedCurrentPlayers_nonHostInactiveOver5Minutes_playerRemoved() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Player third = new Player("Carol", "green");
        Game game = buildInProgressGame(host, guest, third);
        // Guest is current player (index 1)
        game.setCurrentPlayerIndex(1);
        gamesMap.put(game.getId(), game);

        // Record guest activity 6 minutes ago (over 5-minute threshold)
        long sixMinutesAgo = System.currentTimeMillis() - (6 * 60 * 1000L);
        activityMap.put(game.getId() + ":" + guest.getId(), sixMinutesAgo);

        gameService.checkDisconnectedCurrentPlayers();

        // Game should still exist but guest should have been removed
        assertNotNull(gamesMap.get(game.getId()), "Game should continue after non-host player is removed");
        assertTrue(game.getPlayers().stream().noneMatch(p -> p.getId().equals(guest.getId())),
                "Non-host player should be removed after 5 minutes of inactivity");
    }
}
