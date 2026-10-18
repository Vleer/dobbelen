package com.example.backend.controller;

import com.example.backend.dto.GameResponse;
import com.example.backend.dto.WebSocketMessage;
import com.example.backend.model.Game;
import com.example.backend.model.Player;
import com.example.backend.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;

import java.util.Map;

/**
 * STOMP entry points.
 *
 * <p>Actions arriving here are authenticated with the same per-player session token as the REST API.
 * The token travels in the STOMP message payload (set as a CONNECT header by the client and echoed
 * on every action), because the websocket transport itself carries no authentication.
 */
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

            // Joining requires no prior credential - that is how a player gets one.
            GameService.JoinResult joined = gameService.joinGameWithToken(gameId, playerName);

            if (joined.game().getPlayers().size() >= 2) {
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
    public WebSocketMessage handleGameAction(@DestinationVariable String gameId, WebSocketMessage message,
            SimpMessageHeaderAccessor headers) {
        String playerId = message.getPlayerId();
        try {
            if (playerId == null || playerId.isBlank()) {
                return new WebSocketMessage("ERROR", "Missing player id", gameId, null);
            }

            // Prefer the token carried in the message payload; fall back to the CONNECT header.
            String token = message.getToken();
            if ((token == null || token.isBlank()) && headers != null) {
                token = headers.getFirstNativeHeader("X-Player-Token");
            }

            Game game = gameService.getGame(gameId);
            Player player = gameService.authenticate(game, playerId, token);

            String action = message.getType();
            Object data = message.getData();

            switch (action) {
                case "BID" -> {
                    Map<?, ?> bidData = (Map<?, ?>) data;
                    gameService.processBidWithBroadcast(gameId, player.getId(),
                            ((Number) bidData.get("quantity")).intValue(),
                            ((Number) bidData.get("faceValue")).intValue());
                }
                case "DOUBT" -> gameService.processDoubtWithBroadcast(gameId, player.getId());
                case "SPOT_ON" -> gameService.processSpotOnWithBroadcast(gameId, player.getId());
                case "CONTINUE" -> gameService.continueGame(gameId);
                default -> {
                    return new WebSocketMessage("ERROR", "Unknown action", gameId, playerId);
                }
            }

            GameResponse updatedGame = gameService.getGameResponse(gameId);
            System.out.println("WEBSOCKET: Sending GAME_UPDATED for game " + gameId + ", currentPlayerId: "
                    + updatedGame.getCurrentPlayerId());
            return new WebSocketMessage("GAME_UPDATED", updatedGame, gameId, playerId);
        } catch (SecurityException e) {
            return new WebSocketMessage("ERROR", "Not authorised", gameId, playerId);
        } catch (Exception e) {
            return new WebSocketMessage("ERROR", e.getMessage(), gameId, playerId);
        }
    }
}