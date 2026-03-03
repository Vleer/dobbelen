import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { Game } from '../types/game';

export class WebSocketService {
  private stompClient: Client | null = null;
  private gameId: string | null = null;
  private onGameUpdate: ((game: Game) => void) | null = null;

  connect(gameId: string, onGameUpdate: (game: Game) => void) {
    console.log('WebSocketService.connect called with gameId:', gameId);

    // Reuse an existing active client for the same game and only refresh callback
    if (
      this.stompClient &&
      this.gameId === gameId &&
      (this.stompClient.connected || this.stompClient.active)
    ) {
      this.onGameUpdate = onGameUpdate;
      console.log('🔁 Reusing existing active STOMP client for game:', gameId);
      return;
    }

    // Avoid duplicate clients when reconnecting
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }

    this.gameId = gameId;
    this.onGameUpdate = onGameUpdate;

    // Get the backend URL based on environment
    const getBackendUrl = () => {
      // Development: always use local backend so dev machine is isolated from server
      if (process.env.NODE_ENV === 'development') {
        const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
        console.log('🔌 [DEV] WebSocket using isolated local backend:', url);
        return url;
      }

      // Check if we're running in Kubernetes (via ingress)
      if (process.env.REACT_APP_USE_INGRESS === 'true') {
        console.log('🔌 WebSocket using Kubernetes ingress routing');
        const basePath = process.env.PUBLIC_URL || '';
        return basePath;  // Use base path for ingress routing (e.g., /dobbelen)
      }

      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
        console.log('🔌 WebSocket using localhost backend URL:', url);
        return url;
      }

      // For external access, use same-origin and let nginx proxy /ws to backend
      console.log('🔌 WebSocket using same-origin backend routing for hostname:', hostname);
      return '';
    };

    const backendUrl = getBackendUrl();
    const wsUrl = backendUrl ? `${backendUrl}/ws` : '/ws';

    try {
      this.stompClient = new Client({
        webSocketFactory: () => {
          console.log('Creating SockJS connection to', wsUrl);
          const socket = new SockJS(wsUrl);

          socket.onopen = () => {
            console.log('🔌 SockJS connection opened');
          };
          socket.onclose = (event: any) => {
            console.log('🔌 SockJS connection closed:', event);
          };
          socket.onerror = (error: any) => {
            console.warn('⚠️ SockJS connection warning (non-critical):', error);
          };

          return socket;
        },
        reconnectDelay: 2000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectionTimeout: 10000,
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
        onWebSocketClose: (event) => {
          console.log('🔌 WebSocket closed:', event?.reason || 'no reason');
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

  sendAction(action: string, data: any, playerId: string): boolean {
    console.log('📤 WebSocketService.sendAction called:', { action, data, playerId, gameId: this.gameId });
    if (this.stompClient && this.gameId && this.stompClient.connected) {
      const message = {
        type: action,
        data: data,
        gameId: this.gameId,
        playerId: playerId
      };
      console.log('📤 Sending WebSocket message:', message);
      try {
        this.stompClient.publish({
          destination: `/app/game/${this.gameId}/action`,
          body: JSON.stringify(message)
        });
        console.log('✅ WebSocket message sent successfully');
        return true;
      } catch (error) {
        console.warn('⚠️ WebSocket publish failed, caller should fallback to REST:', error);
        return false;
      }
    }

    console.warn('⚠️ Cannot send WebSocket message - STOMP not connected or gameId missing');
    return false;
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }
}

export const webSocketService = new WebSocketService();
