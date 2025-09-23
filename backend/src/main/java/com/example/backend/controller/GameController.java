package com.example.backend.controller;

import com.example.backend.dto.CreateGameRequest;
import com.example.backend.dto.GameResponse;
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
        try {
            Game game = gameService.createGame(request.getPlayerNames());
            GameResponse response = new GameResponse(game);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{gameId}")
    public ResponseEntity<GameResponse> getGame(@PathVariable String gameId) {
        try {
            Game game = gameService.getGame(gameId);
            GameResponse response = new GameResponse(game);
            return ResponseEntity.ok(response);
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

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Game service is running!");
    }
}
