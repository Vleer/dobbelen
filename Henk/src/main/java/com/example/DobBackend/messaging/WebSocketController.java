package com.example.DobBackend.messaging;
// @Controller
// public class WebSocketController {
//     private final SimpMessagingTemplate messagingTemplate;

//     @Autowired
//     public WebSocketController(SimpMessagingTemplate messagingTemplate) {
//         this.messagingTemplate = messagingTemplate;
//     }

//     public void sendGameStateUpdate(Long gameId) {
//         Game game = gameService.getGameState(gameId);
//         messagingTemplate.convertAndSend("/topic/game/" + gameId, game);
//     }

//     public void sendBidUpdate(Long gameId, Bid bid) {
//         messagingTemplate.convertAndSend("/topic/game/" + gameId + "/bids", bid);
//     }
// }
