package com.example.DobBackend.service;

import com.example.DobBackend.model.Game;
import com.example.DobBackend.model.Player;
import com.example.DobBackend.model.Bid;
import com.example.DobBackend.repository.GameRepository;
import com.example.DobBackend.repository.PlayerRepository;
import com.example.DobBackend.repository.BidRepository;
import java.util.List;

import java.time.LocalDateTime;

// import org.hibernate.mapping.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GameService {
    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private BidRepository bidRepository;

    // @Autowired
    // private RedisTemplate<String, Object> redisTemplate;

    // Method to create a new game
    public Game createGame() {
        Game game = new Game();
        game.setState("CREATED");
        game.setCreatedAt(LocalDateTime.now());
        game.setUpdatedAt(LocalDateTime.now());
        return gameRepository.save(game);
    }

    // Method to join a game
    public Player joinGame(Long gameId, String username) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        Player player = new Player();
        player.setUsername(username);
        player.setDiceCount(5);
        player.setGame(game);

        game.getPlayers().add(player);
        gameRepository.save(game);

        return playerRepository.save(player);
    }

    // Method to place a bid
    public Bid placeBid(Long gameId, Long playerId, int diceFace, int count) {
        Bid bid = new Bid();
        bid.setGameId(gameId);
        bid.setPlayerId(playerId);
        bid.setDiceFace(diceFace);
        bid.setCount(count);
        bid.setTimestamp(LocalDateTime.now());
        return bidRepository.save(bid);
    }

    // Method to challenge a bid
    public void challengeBid(Long gameId, Long challengerId) {
        // Game logic for challenging a bid
    }

    // Method to get the game state
    public Game getGameState(Long gameId) {
        return gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
    }

    public List<Game> getAllGames() {
        return gameRepository.findAll();
    }
}
