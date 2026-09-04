package com.example.backend.service;

import com.example.backend.model.Game;
import com.example.backend.model.GameState;
import com.example.backend.model.Player;
import com.example.backend.repository.mongo.GameMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
class GameServiceLobbyOrderTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private GameMongoRepository gameMongoRepository;

    @Mock
    private EasyAIService easyAIService;

    @Mock
    private MediumAIService mediumAIService;

    @Mock
    private HardAIService hardAIService;

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

    private Game buildLobbyGame(Player... players) {
        Game game = new Game();
        game.setMultiplayer(true);
        game.setState(GameState.WAITING_FOR_PLAYERS);
        game.setWaitingForPlayers(true);
        game.getPlayers().addAll(List.of(players));
        game.setHostPlayerId(players[0].getId());
        return game;
    }

    @Test
    void reorderPlayers_updatesLobbySeatOrder() {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Player third = new Player("Carol", "green");
        Game game = buildLobbyGame(host, guest, third);
        gamesMap.put(game.getId(), game);

        gameService.reorderPlayers(game.getId(), host.getId(), List.of(third.getId(), host.getId(), guest.getId()));

        assertEquals(List.of(third.getId(), host.getId(), guest.getId()),
                game.getPlayers().stream().map(Player::getId).toList());
    }

    @Test
    void startMultiplayerGame_preservesLobbySeatOrder() throws Exception {
        Player host = new Player("Alice", "blue");
        Player guest = new Player("Bob", "red");
        Player third = new Player("Carol", "green");
        Game game = buildLobbyGame(host, guest, third);
        gamesMap.put(game.getId(), game);
        gameService.reorderPlayers(game.getId(), host.getId(), List.of(third.getId(), host.getId(), guest.getId()));
        game.setState(GameState.COUNTDOWN);

        Method doActualStart = GameService.class.getDeclaredMethod("doActualStart", String.class);
        doActualStart.setAccessible(true);
        doActualStart.invoke(gameService, game.getId());

        assertEquals(List.of(third.getId(), host.getId(), guest.getId()),
                game.getPlayers().stream().map(Player::getId).toList());
        assertEquals(0, game.getDealerIndex());
        assertEquals(0, game.getCurrentPlayerIndex());
        assertEquals(third.getId(), game.getCurrentPlayer().getId());
    }
}
