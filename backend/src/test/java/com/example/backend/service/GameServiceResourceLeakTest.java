package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.backend.model.ChatMessage;
import com.example.backend.model.Game;
import com.example.backend.model.GameState;
import com.example.backend.model.Player;
import com.example.backend.repository.mongo.GameMongoRepository;
import com.example.backend.service.hardai.HardAIHistoryStore;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * Regression tests for the resource leaks.
 *
 * <p>Before the fix every round scheduled two {@code new java.util.Timer()} instances (each starts
 * its own non-daemon thread that is never cancelled) and every AI move started a bare
 * {@code new Thread(...)}. Removing a game also left its entry in the reconnect-activity map and in
 * each AI service's per-game trackers behind for the lifetime of the process, and the HardAI history
 * buffers grew without bound.
 */
class GameServiceResourceLeakTest {

    private ScheduledThreadPoolExecutor gameTaskScheduler;
    private ThreadPoolExecutor aiTurnExecutor;
    private GameService gameService;

    @BeforeEach
    void setUp() throws Exception {
        gameTaskScheduler = new ScheduledThreadPoolExecutor(2);
        aiTurnExecutor = new ThreadPoolExecutor(1, 4, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<>(64));
        gameService = new GameService(gameTaskScheduler, aiTurnExecutor);
        inject("messagingTemplate", Mockito.mock(SimpMessagingTemplate.class));
        inject("gameMongoRepository", Mockito.mock(GameMongoRepository.class));
        inject("easyAIService", Mockito.mock(EasyAIService.class));
        inject("mediumAIService", Mockito.mock(MediumAIService.class));
        inject("hardAIService", Mockito.mock(HardAIService.class));
    }

    @AfterEach
    void tearDown() {
        gameTaskScheduler.shutdownNow();
        aiTurnExecutor.shutdownNow();
    }

    private void inject(String name, Object value) throws Exception {
        Field field = GameService.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(gameService, value);
    }

    @SuppressWarnings("unchecked")
    private <T> T read(String fieldName) throws Exception {
        Field field = GameService.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        return (T) field.get(gameService);
    }

    /** Seed a running multiplayer game whose first player is the host. */
    private Game seedInProgressGame(String... names) throws Exception {
        return seedGame(GameState.IN_PROGRESS, names);
    }

    /** Seed a lobby game whose first player is the host. */
    private Game seedWaitingGame(String... names) throws Exception {
        return seedGame(GameState.WAITING_FOR_PLAYERS, names);
    }

    private Game seedGame(GameState state, String... names) throws Exception {
        Game game = new Game();
        game.setMultiplayer(true);
        game.setState(state);
        game.setWaitingForPlayers(state == GameState.WAITING_FOR_PLAYERS);
        for (String name : names) {
            game.getPlayers().add(new Player(name, "blue"));
        }
        game.setCurrentPlayerIndex(0);
        game.setDealerIndex(0);
        game.setRoundStartDealerIndex(0);
        game.setHostPlayerId(game.getPlayers().get(0).getId());
        Map<String, Game> gameMap = read("games");
        gameMap.put(game.getId(), game);
        return game;
    }

    private String hostIdOf(Game game) {
        return game.getPlayers().get(0).getId();
    }

    @Test
    @DisplayName("Repeated scheduling reuses the shared scheduler instead of creating new threads")
    void repeatedSchedulingDoesNotCreateThreads() throws Exception {
        int threadsBefore = Thread.activeCount();

        for (int i = 0; i < 500; i++) {
            Game game = seedInProgressGame("Alice", "Bob");
            gameService.startMultiplayerGame(game.getId());
        }

        // The scheduler pool is fixed at 2 threads regardless of how many games were scheduled.
        assertEquals(2, gameTaskScheduler.getCorePoolSize(),
                "scheduler pool size must be fixed, not grown per scheduled task");
        assertEquals(2, gameTaskScheduler.getPoolSize(),
                "the scheduler must not have started more threads than its pool allows");
        assertTrue(Thread.activeCount() - threadsBefore < 10,
                "expected a bounded number of new threads, got " + (Thread.activeCount() - threadsBefore));
    }

    @Test
    @DisplayName("Removing a game drops its activity timestamps and cancels its pending tasks")
    void removeGameClearsPerGameState() throws Exception {
        Game game = seedInProgressGame("Alice", "Bob");
        gameService.recordActivity(game.getId(), "alice-id");
        gameService.recordActivity(game.getId(), "bob-id");

        Map<String, Long> activity = read("lastActivityByGameAndPlayer");
        assertTrue(activity.containsKey(game.getId() + ":alice-id"));

        // Schedule a long-running task so there is something pending to cancel.
        gameService.startMultiplayerGame(game.getId());
        Map<String, Set<ScheduledFuture<?>>> pending = read("pendingTasksByGame");
        assertTrue(pending.containsKey(game.getId()), "expected a pending scheduled task");

        // startMultiplayerGame moves the game into COUNTDOWN; put it back so leaveGame accepts it.
        game.setState(GameState.IN_PROGRESS);
        gameService.leaveGame(game.getId(), hostIdOf(game));

        assertTrue(activity.isEmpty(),
                "activity timestamps must be dropped when the game is removed, was: " + activity);
        assertFalse(pending.containsKey(game.getId()), "pending scheduled tasks must be cancelled on removal");
        Map<String, Game> gameMap = read("games");
        assertFalse(gameMap.containsKey(game.getId()), "game must be removed");
    }

    @Test
    @DisplayName("Activity timestamps for other games survive when one game ends")
    void removeGameKeepsOtherGamesActivity() throws Exception {
        Game a = seedWaitingGame("Alice", "Bob");
        Game b = seedWaitingGame("Carol", "Dave");
        gameService.recordActivity(a.getId(), "p1");
        gameService.recordActivity(b.getId(), "p2");

        Map<String, Long> activity = read("lastActivityByGameAndPlayer");
        assertEquals(2, activity.size());

        gameService.cancelMultiplayerGame(a.getId(), hostIdOf(a));

        assertEquals(1, activity.size(), "only the cancelled game's entries should be removed");
        assertTrue(activity.containsKey(b.getId() + ":p2"));
    }

    @Test
    @DisplayName("AI turn executor is bounded, so AI moves cannot spawn unbounded threads")
    void aiTurnExecutorIsBounded() {
        assertTrue(aiTurnExecutor.getMaximumPoolSize() <= 32,
                "AI executor must be bounded, was " + aiTurnExecutor.getMaximumPoolSize());
        assertTrue(aiTurnExecutor.getQueue() instanceof LinkedBlockingQueue,
                "AI executor queue must be bounded");
    }

    @Test
    @DisplayName("Chat history is capped and stored in a thread-safe list")
    void chatHistoryIsBoundedAndThreadSafe() {
        Game game = new Game();
        assertTrue(game.getChatMessages() instanceof CopyOnWriteArrayList,
                "chat list must be copy-on-write for concurrent add/serialise");

        for (int i = 0; i < 500; i++) {
            game.addChatMessage(new ChatMessage("p" + i, "Player " + i, "message " + i));
        }
        assertEquals(Game.MAX_CHAT_MESSAGES, game.getChatMessages().size(),
                "chat history must stay capped at Game.MAX_CHAT_MESSAGES");
        assertEquals("message 499",
                game.getChatMessages().get(game.getChatMessages().size() - 1).getText(),
                "trimming must keep the newest message");
    }

    @Test
    @DisplayName("HardAI history store caps its buffers and clears finished games")
    void historyStoreIsBounded() {
        HardAIHistoryStore store = new HardAIHistoryStore();

        for (int i = 0; i < 20_000; i++) {
            store.ensureGame("game-x", List.of("p1", "p2"), true);
            store.recordRoundStart("game-x", i, "hand", 5);
            store.recordBid("game-x", i, "p1", 3, 2);
        }

        assertTrue(store.bidCount() <= 5_000, "bids must be capped, was " + store.bidCount());
        assertTrue(store.roundCount() <= 2_000, "rounds must be capped, was " + store.roundCount());
        assertTrue(store.gameCount() <= 500, "games must be capped, was " + store.gameCount());

        store.clearGame("game-x");
        assertEquals(0, store.bidCount(), "clearing a game must drop its bids");
        assertEquals(0, store.roundCount(), "clearing a game must drop its rounds");
        assertEquals(0, store.gameCount(), "clearing a game must drop its record");
    }
}