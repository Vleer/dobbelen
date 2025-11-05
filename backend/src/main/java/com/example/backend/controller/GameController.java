package com.example.backend.controller;

import com.example.backend.dto.*;
import com.example.backend.model.Game;
import com.example.backend.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/games")
@CrossOrigin(origins = "*")
public class GameController {

    @Autowired
    private GameService gameService;

    @PostMapping
    public ResponseEntity<GameResponse> createGame(@RequestBody CreateGameRequest request) {
        Game game;
        // Support both old format (playerNames) and new format (players with AI info)
        if (request.getPlayers() != null && !request.getPlayers().isEmpty()) {
            game = gameService.createGame(request.getPlayers(), true);
        } else {
            game = gameService.createGame(request.getPlayerNames());
        }
        GameResponse response = new GameResponse(game);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{gameId}")
    public ResponseEntity<GameResponse> getGame(@PathVariable String gameId) {
        Game game = gameService.getGame(gameId);
        GameResponse response = new GameResponse(game);
        return ResponseEntity.ok(response);
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
        gameService.startNewRound(gameId);
        Game game = gameService.getGame(gameId);
        GameResponse response = new GameResponse(game);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{gameId}/bid")
    public ResponseEntity<ActionResponse> makeBid(@PathVariable String gameId, @RequestBody BidRequest request) {
        GameService.GameResult result = gameService.processBid(gameId, request.getPlayerId(), request.getQuantity(),
                request.getFaceValue());
        ActionResponse response = new ActionResponse(result.getGame(), "Bid placed successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{gameId}/doubt")
    public ResponseEntity<ActionResponse> doubtBid(@PathVariable String gameId, @RequestBody ActionRequest request) {
        GameService.GameResult result = gameService.processDoubt(gameId, request.getPlayerId());
        String message = result.getEliminatedPlayerId() != null
                ? String.format("Player eliminated! Actual count: %d, Bid: %d", result.getActualCount(),
                        result.getBidQuantity())
                : "Doubt processed";
        ActionResponse response = new ActionResponse(result.getGame(), message, result.getEliminatedPlayerId(),
                result.getActualCount(), result.getBidQuantity());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{gameId}/spot-on")
    public ResponseEntity<ActionResponse> spotOn(@PathVariable String gameId, @RequestBody ActionRequest request) {
        GameService.GameResult result = gameService.processSpotOn(gameId, request.getPlayerId());
        String message = result.getGame().getWinner() != null ? "Spot On correct! Round won!"
                : String.format("Spot On incorrect! Actual count: %d, Bid: %d", result.getActualCount(),
                        result.getBidQuantity());
        ActionResponse response = new ActionResponse(result.getGame(), message, result.getEliminatedPlayerId(),
                result.getActualCount(), result.getBidQuantity());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Game service is running!");
    }

    // Multiplayer endpoints
    @PostMapping("/multiplayer/create")
    public ResponseEntity<GameResponse> createMultiplayerGame() {
        Game game = gameService.createMultiplayerGame();
        GameResponse response = new GameResponse(game);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/multiplayer/{gameId}/join")
    public ResponseEntity<GameResponse> joinMultiplayerGame(@PathVariable String gameId,
            @RequestBody JoinGameRequest request) {
        Game game = gameService.joinGame(gameId, request.getPlayerName());
        GameResponse response = new GameResponse(game);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/multiplayer/{gameId}")
    public ResponseEntity<GameResponse> getMultiplayerGame(@PathVariable String gameId) {
        GameResponse response = gameService.getGameResponse(gameId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/multiplayer/{gameId}/start")
    public ResponseEntity<GameResponse> startMultiplayerGame(@PathVariable String gameId) {
        gameService.startMultiplayerGame(gameId);
        GameResponse response = gameService.getGameResponse(gameId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/multiplayer/{gameId}/players/{playerId}")
    public ResponseEntity<GameResponse> removePlayer(@PathVariable String gameId, @PathVariable String playerId) {
        Game game = gameService.removePlayer(gameId, playerId);
        GameResponse response = new GameResponse(game);
        return ResponseEntity.ok(response);
    }
}
