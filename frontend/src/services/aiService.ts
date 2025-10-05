// AI Service - simplified for tracking AI players only
// All AI logic is now handled by the backend
//
// To create AI players:
// - Easy AI: Name players starting with "AI " (e.g., "AI Sarah", "AI Bot")
// - Medium AI: Name players starting with "🧠AI " (e.g., "🧠AI John", "🧠AI Bot")
//
// The backend automatically detects AI type based on the name prefix and handles all AI logic
// including decision making, probability calculations, and hand analysis (for Medium AI).

export interface AIPlayer {
  id: string;
  name: string;
  isAI: boolean;
}

export class AIService {
  private static instance: AIService;
  private aiPlayers: Set<string> = new Set();

  // Getter for debugging
  get registeredPlayers(): Set<string> {
    return this.aiPlayers;
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  registerAIPlayer(playerId: string, playerName: string): void {
    this.aiPlayers.add(playerId);
    console.log(`Registered AI player: ${playerName} (${playerId})`);
  }

  isAIPlayer(playerId: string): boolean {
    return this.aiPlayers.has(playerId);
  }

  clearRoundTracking(gameId: string): void {
    // No-op: backend handles this now
    console.log(`Round tracking clear requested for game ${gameId} (handled by backend)`);
  }
}

export const aiService = AIService.getInstance();
