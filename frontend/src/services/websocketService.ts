import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { Game } from '../types/game';

export class WebSocketService {
  private stompClient: Client | null = null;
  private gameId: string | null = null;
  private onGameUpdate: ((game: Game) => void) | null = null;

  connect(gameId: string, onGameUpdate: (game: Game) => void) {
    console.log('WebSocketService.connect called with gameId:', gameId);
    this.gameId = gameId;
    this.onGameUpdate = onGameUpdate;

    // Get the WebSocket URL based on environment
    const getWebSocketUrl = () => {
      const hostname = window.location.hostname;
      
      // If we're in development mode on localhost, use direct backend URL
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
        console.log('🔌 WebSocket using localhost backend URL:', url);
        return `${url}/ws`;
      }
      
      // For all external access (including ngrok), use relative path
      // so the nginx proxy can handle routing to the backend
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('🔌 WebSocket using proxied URL for external access:', wsUrl, '(hostname:', hostname, ')');
      return wsUrl;
    };

    const wsUrl = getWebSocketUrl();

    try {
      console.log('Creating SockJS connection to', wsUrl);
      const socket = new SockJS(wsUrl);
      
      // Add SockJS event listeners for debugging
      socket.onopen = () => {
        console.log('🔌 SockJS connection opened');
      };
      socket.onclose = (event: any) => {
        console.log('🔌 SockJS connection closed:', event);
      };
      socket.onerror = (error: any) => {
        console.warn('⚠️ SockJS connection warning (non-critical):', error);
        // Don't show SockJS errors to users as they're often non-critical
      };
      
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          console.log('✅ Connected to WebSocket successfully');
          
          // Subscribe to game updates
          this.stompClient?.subscribe(`/topic/game/${gameId}`, (message) => {
            try {
              const data = JSON.parse(message.body);
              console.log('📨 Received WebSocket message:', data);
              
              if (data.type === 'GAME_UPDATED' || data.type === 'GAME_STARTED' || data.type === 'PLAYER_JOINED') {
                console.log('🎮 Processing game update:', data.data);
                if (data.data && typeof data.data === 'object' && 'showAllDice' in data.data) {
                  console.log('🟠 WEBSOCKET: Received showAllDice update:', data.data.showAllDice, 'at', new Date().toISOString());
                }
                this.onGameUpdate?.(data.data);
              }
            } catch (parseError) {
              console.error('❌ Error parsing WebSocket message:', parseError);
            }
          });
          console.log('📡 Subscribed to /topic/game/' + gameId);
        },
        onStompError: (error) => {
          console.warn('⚠️ WebSocket STOMP warning (non-critical):', error);
          // Don't show STOMP errors to users as they're often non-critical
        },
        onWebSocketError: (error) => {
          console.warn('⚠️ WebSocket connection warning (non-critical):', error);
          // Don't show WebSocket errors to users as they're often non-critical
        },
        onDisconnect: () => {
          console.log('🔌 WebSocket disconnected');
        }
      });
      
      console.log('🚀 Activating WebSocket client...');
      this.stompClient.activate();
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      throw error;
    }
  }

  joinGame(playerName: string) {
    if (this.stompClient && this.gameId) {
      this.stompClient.publish({
        destination: `/app/game/${this.gameId}/join`,
        body: playerName
      });
    }
  }

  sendAction(action: string, data: any, playerId: string) {
    console.log('📤 WebSocketService.sendAction called:', { action, data, playerId, gameId: this.gameId });
    if (this.stompClient && this.gameId) {
      const message = {
        type: action,
        data: data,
        gameId: this.gameId,
        playerId: playerId
      };
      console.log('📤 Sending WebSocket message:', message);
      this.stompClient.publish({
        destination: `/app/game/${this.gameId}/action`,
        body: JSON.stringify(message)
      });
      console.log('✅ WebSocket message sent successfully');
    } else {
      console.error('❌ Cannot send WebSocket message - client not connected or gameId missing');
    }
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }
}

export const webSocketService = new WebSocketService();
