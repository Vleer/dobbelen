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
    const actions = ['bid', 'doubt', 'spotOn'];
    const weights = [0.7, 0.2, 0.1]; // 70% bid, 20% doubt, 10% spot on

    // If no current bid, must bid
    if (!currentBid) {
      return this.generateBidAction();
    }

    // Weighted random selection
    const random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < actions.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        switch (actions[i]) {
          case 'bid':
            return this.generateBidAction(currentBid);
          case 'doubt':
            return { action: 'doubt' };
          case 'spotOn':
            return { action: 'spotOn' };
        }
      }
    }

    // Fallback to bid
    return this.generateBidAction(currentBid);
  }

  private generateBidAction(currentBid?: any): { action: string; data: any } {
    if (!currentBid) {
      // First bid - random quantity 1-3, random face value 1-6
      return {
        action: 'bid',
        data: {
          quantity: Math.floor(Math.random() * 3) + 1,
          faceValue: Math.floor(Math.random() * 6) + 1
        }
      };
    }

    // Generate a valid bid (must increase quantity or face value)
    const currentQuantity = currentBid.quantity;
    const currentFaceValue = currentBid.faceValue;

    // 60% chance to increase quantity, 40% chance to increase face value
    if (Math.random() < 0.6) {
      // Increase quantity
      return {
        action: 'bid',
        data: {
          quantity: currentQuantity + Math.floor(Math.random() * 2) + 1,
          faceValue: currentFaceValue
        }
      };
    } else {
      // Increase face value (and possibly quantity)
      const newFaceValue = Math.min(6, currentFaceValue + Math.floor(Math.random() * 2) + 1);
      const newQuantity = newFaceValue > currentFaceValue ? currentQuantity : currentQuantity + 1;
      
      return {
        action: 'bid',
        data: {
          quantity: newQuantity,
          faceValue: newFaceValue
        }
      };
    }
  }

  // Simulate AI thinking delay
  async simulateThinking(): Promise<void> {
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const aiService = AIService.getInstance();
