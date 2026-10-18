package com.example.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
    private String type;
    private Object data;
    private String gameId;
    private String playerId;

    /**
     * Per-player session token proving the sender is {@link #playerId}.
     *
     * <p>The websocket transport carries no authentication of its own, so actions sent over it must
     * present the same token as the REST API. Never echoed back to other subscribers.
     */
    private String token;

    /** Broadcast message: no token, since it is being sent to every subscriber. */
    public WebSocketMessage(String type, Object data, String gameId, String playerId) {
        this.type = type;
        this.data = data;
        this.gameId = gameId;
        this.playerId = playerId;
    }
}