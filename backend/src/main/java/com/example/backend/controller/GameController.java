package com.example.backend.controller;

import com.example.backend.dto.*;
import com.example.backend.model.Game;
import com.example.backend.model.Player;
import com.example.backend.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * HTTP API for games.
 *
 * <p>Every endpoint that acts as, or reveals data to, a specific player requires the caller to
 * present that player's session token in the {@code X-Player-Token} header. Player ids on their own
 * are not a credential - they are broadcast to every client in the game payload and appear in query
 * strings, so trusting them let any caller read another player's hidden dice or act as the host.
 */
@RestController
@RequestMapping("/api/games")
public class GameController {

    /** Header carrying the caller's per-player session token. */
    private static final String TOKEN_HEADER = "X-Player-Token";

    @Autowired
    private GameService gameService;

    /**
     * Resolve the token to the player it belongs to, or fail with 403.
     * Wrapped so an invalid token can never surface as a 500.
     */
    private Player authenticate(Game game, String playerId, String token) {
        try {
            return gameService.authenticate(game, playerId, token);
        } catch (SecurityException e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN, e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<GameResponse> createGame(@RequestBody CreateGameRequest request) {
        try {
            Game game;
            // Support both old format (playerNames) and new format (players with AI info)
            if (request.getPlayers() != null && !request.getPlayers().isEmpty()) {
                game = gameService.createGame(request.getPlayers(), true);
            } else {
                game = gameService.createGame(request.getPlayerNames());
            }
            GameResponse response = new GameResponse(game);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{gameId}")
    public ResponseEntity<GameResponse> getGame(@PathVariable String gameId, @RequestParam(required = false) String playerId,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            Game game = gameService.getGame(gameId);
            if (playerId == null) {
                return ResponseEntity.ok(new GameResponse(game));
            }
            // Revealing a player's own (otherwise hidden) dice requires proving you are them.
            authenticate(game, playerId, token);
            return ResponseEntity.ok(new GameResponse(game, playerId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<GameResponse>> getAllGames() {
        List<Game> games = gameService.getAllGames();
        List<GameResponse> responses = games.stream()
                .map(GameResponse::new)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{gameId}/rounds")
    public ResponseEntity<GameResponse> startNewRound(@PathVariable String gameId) {
        try {
            gameService.startNewRound(gameId);
            Game game = gameService.getGame(gameId);
            GameResponse response = new GameResponse(game);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{gameId}/bid")
    public ResponseEntity<ActionResponse> makeBid(@PathVariable String gameId, @RequestBody BidRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            GameService.GameResult result = gameService.processBid(gameId, request.getPlayerId(), request.getQuantity(),
                    request.getFaceValue());
            ActionResponse response = new ActionResponse(result.getGame(), "Bid placed successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{gameId}/doubt")
    public ResponseEntity<ActionResponse> doubtBid(@PathVariable String gameId, @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            GameService.GameResult result = gameService.processDoubt(gameId, request.getPlayerId());
            String message = result.getEliminatedPlayerId() != null
                    ? String.format("Player eliminated! Actual count: %d, Bid: %d", result.getActualCount(),
                            result.getBidQuantity())
                    : "Doubt processed";
            ActionResponse response = new ActionResponse(result.getGame(), message, result.getEliminatedPlayerId(),
                    result.getActualCount(), result.getBidQuantity());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{gameId}/spot-on")
    public ResponseEntity<ActionResponse> spotOn(@PathVariable String gameId, @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            GameService.GameResult result = gameService.processSpotOn(gameId, request.getPlayerId());
            String message = result.getGame().getWinner() != null ? "Spot On correct! Round won!"
                    : String.format("Spot On incorrect! Actual count: %d, Bid: %d", result.getActualCount(),
                            result.getBidQuantity());
            ActionResponse response = new ActionResponse(result.getGame(), message, result.getEliminatedPlayerId(),
                    result.getActualCount(), result.getBidQuantity());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Game service is running!");
    }

    /**
     * Returns only the requesting player's own dice.
     * In multiplayer the broadcast hides all dice; this endpoint lets each
     * player retrieve their own values without exposing opponents' dice.
     *
     * <p>This is the endpoint that made the missing-auth bug directly exploitable: any caller could
     * read any player's dice. It now requires that player's session token.
     */
    @GetMapping("/{gameId}/my-dice")
    public ResponseEntity<List<Integer>> getMyDice(
            @PathVariable String gameId,
            @RequestParam String playerId,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            Game game = gameService.getGame(gameId);
            authenticate(game, playerId, token);
            List<Integer> dice = gameService.getPlayerDice(gameId, playerId);
            return ResponseEntity.ok(dice);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Multiplayer endpoints
    @GetMapping("/multiplayer")
    public ResponseEntity<List<GameResponse>> listMultiplayerGames() {
        List<Game> games = gameService.listMultiplayerLobbyGames();
        List<GameResponse> responses = games.stream()
                .map(GameResponse::new)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/multiplayer/create")
    public ResponseEntity<GameResponse> createMultiplayerGame(
            @RequestParam(value = "private", required = false, defaultValue = "false") boolean isPrivate) {
        try {
            Game game = gameService.createMultiplayerGame(isPrivate);
            GameResponse response = new GameResponse(game);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Join a game. The response carries the joining player's session token - this is the only time
     * it is disclosed, so a client must store it and present it on every later request.
     */
    @PostMapping("/multiplayer/{gameId}/join")
    public ResponseEntity<GameResponse> joinMultiplayerGame(@PathVariable String gameId,
            @RequestBody JoinGameRequest request) {
        try {
            GameService.JoinResult result = gameService.joinGameWithToken(gameId, request.getPlayerName());
            GameResponse response = new GameResponse(result.game(), result.player().getId(),
                    result.player().getSessionToken());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/multiplayer/{gameId}")
    public ResponseEntity<GameResponse> getMultiplayerGame(@PathVariable String gameId,
            @RequestParam(required = false) String playerId,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            Game game = gameService.getGame(gameId);
            if (playerId == null) {
                return ResponseEntity.ok(new GameResponse(game));
            }
            // Personalised view (own dice visible) requires proof of identity.
            authenticate(game, playerId, token);
            return ResponseEntity.ok(new GameResponse(game, playerId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/player-order")
    public ResponseEntity<GameResponse> reorderPlayers(@PathVariable String gameId,
            @RequestBody ReorderPlayersRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            Game game = gameService.reorderPlayers(gameId, request.getPlayerId(), request.getPlayerIds());
            return ResponseEntity.ok(new GameResponse(game));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/randomize-order")
    public ResponseEntity<GameResponse> randomizePlayerOrder(@PathVariable String gameId,
            @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            Game game = gameService.randomizePlayerOrder(gameId, request.getPlayerId());
            return ResponseEntity.ok(new GameResponse(game));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/start")
    public ResponseEntity<GameResponse> startMultiplayerGame(@PathVariable String gameId,
            @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            gameService.startMultiplayerGame(gameId, request.getPlayerId());
            GameResponse response = gameService.getGameResponse(gameId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/multiplayer/{gameId}/players/{playerId}")
    public ResponseEntity<GameResponse> removePlayer(@PathVariable String gameId, @PathVariable String playerId,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            // The caller must be a real player in this game (they are the one kicking).
            authenticate(gameService.getGame(gameId), playerId, token);
            Game game = gameService.removePlayer(gameId, playerId);
            GameResponse response = new GameResponse(game);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/leave")
    public ResponseEntity<Void> leaveGame(@PathVariable String gameId, @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            gameService.leaveGame(gameId, request.getPlayerId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/heartbeat")
    public ResponseEntity<Void> heartbeat(@PathVariable String gameId, @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            gameService.recordActivity(gameId, request.getPlayerId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /** Host-only: refresh public lobby presence while the lobby browser tab is active */
    @PostMapping("/multiplayer/{gameId}/lobby-presence")
    public ResponseEntity<Void> lobbyPresence(@PathVariable String gameId, @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            gameService.recordHostLobbyPresence(gameId, request.getPlayerId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/multiplayer/{gameId}")
    public ResponseEntity<Void> cancelMultiplayerGame(@PathVariable String gameId,
            @RequestParam String playerId,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), playerId, token);
            gameService.cancelMultiplayerGame(gameId, playerId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/player-continue")
    public ResponseEntity<GameResponse> playerContinue(@PathVariable String gameId,
            @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            GameResponse response = gameService.playerContinue(gameId, request.getPlayerId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/chat")
    public ResponseEntity<Void> sendChatMessage(@PathVariable String gameId,
            @RequestBody ChatMessageRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            gameService.sendChatMessage(gameId, request.getPlayerId(), request.getText());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/multiplayer/{gameId}/end")
    public ResponseEntity<Void> endGame(@PathVariable String gameId, @RequestBody ActionRequest request,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        try {
            authenticate(gameService.getGame(gameId), request.getPlayerId(), token);
            gameService.endGameAsHost(gameId, request.getPlayerId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}