// AI Service for generating random moves

export interface AIPlayer {
  id: string;
  name: string;
  isAI: boolean;
}

export class AIService {
  private static instance: AIService;
  private aiPlayers: Set<string> = new Set();

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  registerAIPlayer(playerId: string, playerName: string): void {
    this.aiPlayers.add(playerId);
  }

  isAIPlayer(playerId: string): boolean {
    return this.aiPlayers.has(playerId);
  }

  generateRandomAction(currentBid: any): { action: string; data?: any } {
    // If no current bid, must bid
    if (!currentBid) {
      return this.generateBidAction();
    }

    // AI always raises by 1 - simple strategy
    return this.generateBidAction(currentBid);
  }

  private generateBidAction(currentBid?: any): { action: string; data: any } {
    if (!currentBid) {
      // First bid - start with 1 of any value
      return {
        action: 'bid',
        data: {
          quantity: 1,
          faceValue: Math.floor(Math.random() * 6) + 1
        }
      };
    }

    // AI always raises by 1 - simple strategy
    const currentQuantity = currentBid.quantity;
    const currentFaceValue = currentBid.faceValue;

    // Always increase quantity by 1
    return {
      action: 'bid',
      data: {
        quantity: currentQuantity + 1,
        faceValue: currentFaceValue
      }
    };
  }

  // Simulate AI thinking delay
  async simulateThinking(): Promise<void> {
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const aiService = AIService.getInstance();
