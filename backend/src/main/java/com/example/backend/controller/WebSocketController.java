package com.example.backend.controller;

import com.example.backend.dto.GameResponse;
import com.example.backend.dto.WebSocketMessage;
import com.example.backend.model.Game;
import com.example.backend.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketController {

    @Autowired
    private GameService gameService;

    @MessageMapping("/game/{gameId}/join")
    @SendTo("/topic/game/{gameId}")
    public WebSocketMessage joinGame(@DestinationVariable String gameId, String playerName) {
        try {
            Game game = gameService.getGame(gameId);
            if (game == null) {
                return new WebSocketMessage("ERROR", "Game not found", gameId, null);
            }

            if (!game.canJoin()) {
                return new WebSocketMessage("ERROR", "Cannot join game", gameId, null);
            }

            // Add player to game
            gameService.addPlayerToGame(gameId, playerName);
            
            // Check if game is ready to start
            if (game.getPlayers().size() >= 2) {
                gameService.startMultiplayerGame(gameId);
                return new WebSocketMessage("GAME_STARTED", gameService.getGameResponse(gameId), gameId, null);
            }

            return new WebSocketMessage("PLAYER_JOINED", gameService.getGameResponse(gameId), gameId, null);
        } catch (Exception e) {
            return new WebSocketMessage("ERROR", e.getMessage(), gameId, null);
        }
    }

    @MessageMapping("/game/{gameId}/action")
    @SendTo("/topic/game/{gameId}")
    public WebSocketMessage handleGameAction(@DestinationVariable String gameId, WebSocketMessage message) {
        try {
            String action = message.getType();
            String playerId = message.getPlayerId();
            Object data = message.getData();

            switch (action) {
                case "BID":
                    gameService.processBidWithBroadcast(gameId, playerId, (Integer) ((java.util.Map<?, ?>) data).get("quantity"), 
                                         (Integer) ((java.util.Map<?, ?>) data).get("faceValue"));
                    break;
                case "DOUBT":
                    gameService.processDoubtWithBroadcast(gameId, playerId);
                    break;
                case "SPOT_ON":
                    gameService.processSpotOnWithBroadcast(gameId, playerId);
                    break;
                default:
                    return new WebSocketMessage("ERROR", "Unknown action", gameId, playerId);
            }

            GameResponse updatedGame = gameService.getGameResponse(gameId);
            System.out.println("WEBSOCKET: Sending GAME_UPDATED for game " + gameId + ", currentPlayerId: " + updatedGame.getCurrentPlayerId());
            return new WebSocketMessage("GAME_UPDATED", updatedGame, gameId, playerId);
        } catch (Exception e) {
            return new WebSocketMessage("ERROR", e.getMessage(), gameId, message.getPlayerId());
        }
    }

    // This method is no longer needed since GameService handles broadcasting directly
}
