@RestController
@RequestMapping("/api/game")
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
