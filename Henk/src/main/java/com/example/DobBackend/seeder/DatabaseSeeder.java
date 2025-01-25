package com.example.DobBackend.seeder;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.DobBackend.repository.GameRepository;
import com.example.DobBackend.repository.PlayerRepository;

import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import com.example.DobBackend.model.Game;
import com.example.DobBackend.model.Player;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Override
    public void run(String... args) throws Exception {
        seedGamesAndPlayers();
    }

    private void seedGamesAndPlayers() {
        // Check if data already exists
        if (gameRepository.count() > 0) {
            return; // Data already exists, do not seed
        }

        // Create a game
        Game game = new Game();
        game.setState("CREATED");
        game.setCreatedAt(LocalDateTime.now());
        game.setUpdatedAt(LocalDateTime.now());
        gameRepository.save(game);

        // Create players and add them to the game
        Player player1 = new Player();
        player1.setUsername("DobBackend");
        player1.setDiceCount(5);
        player1.setGame(game);
        playerRepository.save(player1);

        Player player2 = new Player();
        player2.setUsername("Ernst");
        player2.setDiceCount(5);
        player2.setGame(game);
        playerRepository.save(player2);

        Player player3 = new Player();
        player3.setUsername("Bassie");
        player3.setDiceCount(5);
        player3.setGame(game);
        playerRepository.save(player3);

        // Add players to the game
        game.getPlayers().add(player1);
        game.getPlayers().add(player2);
        game.getPlayers().add(player3);
        gameRepository.save(game);

        System.out.println("Database seeded with a game and three players.");
    }
}
