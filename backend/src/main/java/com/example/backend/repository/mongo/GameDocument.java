package com.example.backend.repository.mongo;

import com.example.backend.model.Game;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "games")
public class GameDocument {

    @Id
    private String id;
    private Game game;

    public GameDocument() {
    }

    public GameDocument(Game game) {
        this.id = game.getId();
        this.game = game;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Game getGame() {
        return game;
    }

    public void setGame(Game game) {
        this.game = game;
    }
}
