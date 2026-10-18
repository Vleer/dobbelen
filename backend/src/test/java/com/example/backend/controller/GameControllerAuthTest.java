package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.backend.dto.ActionRequest;
import com.example.backend.dto.GameResponse;
import com.example.backend.model.Game;
import com.example.backend.model.GameState;
import com.example.backend.model.Player;
import com.example.backend.repository.mongo.GameMongoRepository;
import com.example.backend.service.GameService;
import java.lang.reflect.Field;
import java.util.List;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Regression tests for the missing-authentication (IDOR) issue.
 *
 * <p>Player ids used to be the only credential, and they are broadcast to every client in the game
 * payload. Anyone who saw a game could read another player's hidden dice through
 * {@code GET /api/games/{id}/my-dice?playerId=<other>}, act as the host, or bid on someone's behalf.
 */
class GameControllerAuthTest {

    private GameService gameService;
    private GameController controller;
    private ScheduledThreadPoolExecutor gameTaskScheduler;
    private ThreadPoolExecutor aiTurnExecutor;

    @BeforeEach
    void setUp() throws Exception {
        gameTaskScheduler = new ScheduledThreadPoolExecutor(2);
        aiTurnExecutor = new ThreadPoolExecutor(1, 4, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<>(64));
        gameService = new GameService(gameTaskScheduler, aiTurnExecutor);
        inject("messagingTemplate", Mockito.mock(SimpMessagingTemplate.class));
        inject("gameMongoRepository", Mockito.mock(GameMongoRepository.class));
        inject("easyAIService", Mockito.mock(com.example.backend.service.EasyAIService.class));
        inject("mediumAIService", Mockito.mock(com.example.backend.service.MediumAIService.class));
        inject("hardAIService", Mockito.mock(com.example.backend.service.HardAIService.class));
        controller = new GameController();
        injectController("gameService", gameService);
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

    private void injectController(String name, Object value) throws Exception {
        Field field = GameController.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(controller, value);
    }

    @SuppressWarnings("unchecked")
    private void putGame(Game game) throws Exception {
        Field field = GameService.class.getDeclaredField("games");
        field.setAccessible(true);
        ((java.util.Map<String, Game>) field.get(gameService)).put(game.getId(), game);
    }

    /** A running multiplayer game with two joined human players. */
    private Game seedGame() throws Exception {
        Game game = gameService.createMultiplayerGame(false);
        GameService.JoinResult alice = gameService.joinGameWithToken(game.getId(), "Alice");
        GameService.JoinResult bob = gameService.joinGameWithToken(game.getId(), "Bob");
        alice.game().setState(GameState.IN_PROGRESS);
        alice.game().setWaitingForPlayers(false);
        alice.game().setCurrentPlayerIndex(0);
        alice.game().setHostPlayerId(alice.player().getId());
        putGame(alice.game());
        assertNotEquals(alice.player().getId(), bob.player().getId());
        return alice.game();
    }

    @Test
    @DisplayName("Joining hands out a distinct unguessable token per player")
    void joinIssuesDistinctTokens() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);
        Player bob = game.getPlayers().get(1);

        assertNotEquals(alice.getSessionToken(), bob.getSessionToken());
        // 256-bit base64url token.
        assertTrue(alice.getSessionToken().length() >= 40,
                "token looks too short to be unguessable: " + alice.getSessionToken().length());
        assertFalse(alice.getSessionToken().contains("="), "token must be URL-safe without padding");
    }

    @Test
    @DisplayName("Tokens never appear in a broadcast game payload")
    void tokenIsNotBroadcast() throws Exception {
        Game game = seedGame();
        for (String token : game.getPlayers().stream().map(Player::getSessionToken).toList()) {
            assertFalse(gameApiJson(new GameResponse(game)).contains(token),
                    "broadcast payload must not contain a session token");
        }
    }

    @Test
    @DisplayName("Player serialisation never exposes sessionToken (Jackson 3 honours @JsonIgnore)")
    void playerJsonNeverExposesToken() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);
        String json = new tools.jackson.databind.ObjectMapper().writeValueAsString(alice);
        assertFalse(json.contains(alice.getSessionToken()),
                "Player JSON must not expose the session token: " + json);
        assertFalse(json.contains("sessionToken"), "Player JSON must not even have the field: " + json);
    }

    @Test
    @DisplayName("No token appears in a personalised view another player receives")
    void personalisedViewDoesNotCarryOtherTokens() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);
        Player bob = game.getPlayers().get(1);

        // Alice's personalised view (built with her own token) must still not embed it in the body.
        String json = gameApiJson(new GameResponse(game, alice.getId(), alice.getSessionToken()));
        assertFalse(json.contains(bob.getSessionToken()), "Bob's token must never appear");
        // Only the explicitly attached token is present, and only on the top-level field.
        assertTrue(json.contains(alice.getSessionToken()),
                "Alice's own token is expected on her join response");
        assertEquals(alice.getSessionToken(),
                new tools.jackson.databind.ObjectMapper().readTree(json).get("sessionToken").asString());
    }

    @Test
    @DisplayName("Another player's id cannot be used to read hidden dice")
    void myDiceRejectsOtherPlayersToken() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);
        Player bob = game.getPlayers().get(1);
        alice.rollDice();
        bob.rollDice();

        // Correct identity: allowed, and returns that player's real dice.
        assertEquals(List.copyOf(alice.getDice()),
                controller.getMyDice(game.getId(), alice.getId(), alice.getSessionToken()).getBody());
        assertFalse(alice.getDice().isEmpty(), "test needs real dice to be meaningful");

        // Alice's token with Bob's id (the original exploit): rejected.
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.getMyDice(game.getId(), bob.getId(), alice.getSessionToken()));
        assertEquals(403, ex.getStatusCode().value());

        // Bob's id with no token at all (also the original exploit): rejected.
        assertThrows(ResponseStatusException.class, () -> controller.getMyDice(game.getId(), bob.getId(), null));

        // Wrong/guessed token: rejected.
        assertThrows(ResponseStatusException.class,
                () -> controller.getMyDice(game.getId(), bob.getId(), "not-the-real-token"));
    }

    @Test
    @DisplayName("Personalised game views require the token too")
    void personalisedGameViewRequiresToken() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);
        Player bob = game.getPlayers().get(1);

        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.getMultiplayerGame(game.getId(), alice.getId(), null)).getStatusCode().value());

        // Bob cannot use Alice's token to receive Alice's dice.
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.getMultiplayerGame(game.getId(), alice.getId(), bob.getSessionToken()))
                .getStatusCode().value());

        // With his own token Bob gets a view.
        assertTrue(controller.getMultiplayerGame(game.getId(), bob.getId(), bob.getSessionToken())
                .getStatusCode().is2xxSuccessful());
    }

    @Test
    @DisplayName("Host-only actions cannot be taken with a borrowed player id")
    void hostOnlyActionsRequireToken() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);
        Player bob = game.getPlayers().get(1);

        // Bob pretending to be the host, using Alice's id but Bob's token: rejected.
        assertThrows(ResponseStatusException.class,
                () -> controller.startMultiplayerGame(game.getId(), new ActionRequest(alice.getId()),
                        bob.getSessionToken()));
        assertThrows(ResponseStatusException.class,
                () -> controller.endGame(game.getId(), new ActionRequest(alice.getId()), bob.getSessionToken()));
        assertThrows(ResponseStatusException.class,
                () -> controller.cancelMultiplayerGame(game.getId(), alice.getId(), bob.getSessionToken()));
    }

    @Test
    @DisplayName("Chat and lobby presence cannot be spoofed with another player's id")
    void chatAndPresenceRequireToken() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);
        Player bob = game.getPlayers().get(1);

        com.example.backend.dto.ChatMessageRequest chat =
                        new com.example.backend.dto.ChatMessageRequest();
        chat.setPlayerId(alice.getId());
        chat.setText("hi");
        assertThrows(ResponseStatusException.class,
                () -> controller.sendChatMessage(game.getId(), chat, bob.getSessionToken()));
        assertThrows(ResponseStatusException.class,
                () -> controller.lobbyPresence(game.getId(), new ActionRequest(alice.getId()), bob.getSessionToken()));
    }

    @Test
    @DisplayName("A null or empty token can never authenticate")
    void nullTokenNeverAuthenticates() throws Exception {
        Game game = seedGame();
        Player alice = game.getPlayers().get(0);

        assertFalse(alice.matchesToken(null));
        assertFalse(alice.matchesToken(""));
        assertTrue(alice.matchesToken(alice.getSessionToken()));
    }

    @Test
    @DisplayName("Join response includes the token but broadcast responses do not")
    void joinResponseCarriesToken() throws Exception {
        Game game = gameService.createMultiplayerGame(false);
        GameService.JoinResult joined = gameService.joinGameWithToken(game.getId(), "Zoe");

        GameResponse joinResponse = new GameResponse(joined.game(), joined.player().getId(),
                joined.player().getSessionToken());
        assertEquals(joined.player().getSessionToken(), joinResponse.getSessionToken());

        GameResponse broadcast = new GameResponse(joined.game());
        assertNull(broadcast.getSessionToken(), "broadcast response must not carry a token");
    }

    /**
     * Serialise a response exactly the way Spring Boot 4 (Jackson 3) would, to check that no session
     * token can ride along in a payload other players receive.
     */
    private static String gameApiJson(GameResponse response) {
        return new tools.jackson.databind.ObjectMapper().writeValueAsString(response);
    }
}