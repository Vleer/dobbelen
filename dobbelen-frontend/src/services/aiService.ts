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

  generateRandomAction(currentBid: any, totalPlayers: number = 3): { action: string; data?: any } {
    // If no current bid, must bid
    if (!currentBid) {
      return this.generateBidAction();
    }

    // Calculate doubt probability using the formula: (1 / number of players) * 0.3 * amount^1.5
    const doubtProbability = (1 / totalPlayers) * 0.3 * Math.pow(currentBid.quantity, 1.5);
    const spotOnProbability = 0.01; // 1% chance for spot-on
    
    const random = Math.random();
    
    if (random < doubtProbability) {
      console.log(`AI considering doubt: probability=${doubtProbability.toFixed(3)}, bid=${currentBid.quantity} of ${currentBid.faceValue}s`);
      return { action: 'doubt', data: {} };
    } else if (random < doubtProbability + spotOnProbability) {
      return { action: 'spotOn', data: {} };
    } else {
      return this.generateBidAction(currentBid);
    }
  }

  private generateBidAction(currentBid?: any): { action: string; data: any } {
    if (!currentBid) {
      // First bid - start with 1 or 2 of any value
      const bid = {
        action: 'bid',
        data: {
          quantity: Math.random() < 0.5 ? 1 : 2,
          faceValue: Math.floor(Math.random() * 6) + 1
        }
      };
      console.log('AI first bid:', bid);
      return bid;
    }

    // AI strategy: ensure valid bid by either increasing quantity or increasing face value
    const currentQuantity = currentBid.quantity;
    const currentFaceValue = currentBid.faceValue;
    
    let bid;
    if (Math.random() < 0.5) {
      // Strategy 1: Same quantity, higher face value (if possible)
      if (currentFaceValue < 6) {
        bid = {
          action: 'bid',
          data: {
            quantity: currentQuantity,
            faceValue: currentFaceValue + 1
          }
        };
      } else {
        // If face value is already 6, increase quantity
        bid = {
          action: 'bid',
          data: {
            quantity: currentQuantity + 1,
            faceValue: currentFaceValue
          }
        };
      }
    } else {
      // Strategy 2: Increase quantity, same face value
      bid = {
        action: 'bid',
        data: {
          quantity: currentQuantity + 1,
          faceValue: currentFaceValue
        }
      };
    }
    
    console.log('AI bid strategy:', {
      currentBid: currentBid,
      newBid: bid,
      isValid: this.isBidValid(bid.data, currentBid)
    });
    
    return bid;
  }

  private isBidValid(newBid: any, currentBid: any): boolean {
    if (!currentBid) return true;
    
    // New bid must either:
    // 1. Increase the quantity, OR
    // 2. Increase the face value while maintaining or increasing quantity
    return newBid.quantity > currentBid.quantity ||
           (newBid.faceValue > currentBid.faceValue && 
            newBid.quantity >= currentBid.quantity);
  }

  // Simulate AI thinking delay
  async simulateThinking(): Promise<void> {
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const aiService = AIService.getInstance();
