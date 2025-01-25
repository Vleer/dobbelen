package com.example.DobBackend.controller;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.DobBackend.service.GameService;
import com.example.DobBackend.model.Game;
import com.example.DobBackend.model.Player;
import com.example.DobBackend.model.Bid;

@RestController
@RequestMapping("/")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:48081", "http://localhost:4200" })
public class GameController {
    @Autowired
    private GameService gameService;

    @PostMapping("/create")
    public ResponseEntity<Game> createGame() {
        Game game = gameService.createGame();
        return ResponseEntity.ok(game);
    }

    @PostMapping("/join")
    public ResponseEntity<Player> joinGame(@RequestParam Long gameId, @RequestParam String username) {
        Player player = gameService.joinGame(gameId, username);
        return ResponseEntity.ok(player);
    }

    @PostMapping("/bid")
    public ResponseEntity<Bid> placeBid(@RequestParam Long gameId, @RequestParam Long playerId,
            @RequestParam int diceFace, @RequestParam int count) {
        Bid bid = gameService.placeBid(gameId, playerId, diceFace, count);
        return ResponseEntity.ok(bid);
    }

    @GetMapping("/getAllGames")
    public ResponseEntity<Iterable<Game>> getAllGames() {
        Iterable<Game> games = gameService.getAllGames();
        return ResponseEntity.ok(games);
    }
    
    public String getMethodName(@RequestParam String param) {
        return new String();
    }
    

    @PostMapping("/challenge")
    public ResponseEntity<Void> challengeBid(@RequestParam Long gameId, @RequestParam Long challengerId) {
        gameService.challengeBid(gameId, challengerId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/state")
    public ResponseEntity<Game> getGameState(@RequestParam Long gameId) {
        Game game = gameService.getGameState(gameId);
        return ResponseEntity.ok(game);
    }
}
