// AI Service for generating random moves and smart AI decisions

export interface AIPlayer {
  id: string;
  name: string;
  isAI: boolean;
  aiType?: 'basic' | 'smart';
}

interface BidHistory {
  playerId: string;
  quantity: number;
  faceValue: number;
  roundNumber: number;
}

class SmartAIPlayer {
  id: string;
  name: string;
  bidHistory: BidHistory[] = [];
  doubtHistory: { success: boolean; targetBid: any }[] = [];
  riskTolerance: number = 0.3; // Base risk tolerance (0 = very conservative, 1 = very aggressive)
  
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  // Calculate exact probability of a bid being true using binomial distribution
  calculateBidProbability(quantity: number, faceValue: number, totalDice: number, knownDice: number[] = []): number {
    // Each die has 1/6 chance of showing the target face value
    const successProbability = 1/6;
    
    // Account for known dice (our own dice)
    const knownMatches = knownDice.filter(die => die === faceValue).length;
    const remainingDice = totalDice - knownDice.length;
    const remainingNeeded = Math.max(0, quantity - knownMatches);
    
    if (remainingNeeded <= 0) return 1.0; // We already have enough
    if (remainingNeeded > remainingDice) return 0.0; // Impossible
    
    // Calculate cumulative probability using binomial distribution
    let probability = 0;
    for (let k = remainingNeeded; k <= remainingDice; k++) {
      const binomial = this.binomialCoefficient(remainingDice, k) * 
                      Math.pow(successProbability, k) * 
                      Math.pow(1 - successProbability, remainingDice - k);
      probability += binomial;
    }
    
    return probability;
  }

  private binomialCoefficient(n: number, k: number): number {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return result;
  }

  // Assess if a bid looks like a bluff based on historical patterns
  assessBluffLikelihood(bid: any, playerId: string): number {
    const playerHistory = this.bidHistory.filter(h => h.playerId === playerId);
    if (playerHistory.length < 3) return 0.5; // Neutral if insufficient data
    
    // Look for patterns of overbidding
    const recentBids = playerHistory.slice(-5);
    let aggressiveCount = 0;
    
    recentBids.forEach(historicalBid => {
      // Simple heuristic: high quantities relative to face value suggest aggression
      const aggressionScore = historicalBid.quantity / (historicalBid.faceValue || 1);
      if (aggressionScore > 3) aggressiveCount++;
    });
    
    return aggressiveCount / recentBids.length;
  }

  // Dynamic risk tolerance based on game state
  calculateRiskTolerance(activePlayers: number, isEarlyGame: boolean): number {
    let adjustedTolerance = this.riskTolerance;
    
    // More conservative with fewer players (higher stakes)
    if (activePlayers <= 3) adjustedTolerance *= 0.7;
    
    // More aggressive early in the game
    if (isEarlyGame) adjustedTolerance *= 1.2;
    
    // Account for our doubt success rate
    if (this.doubtHistory.length > 0) {
      const successRate = this.doubtHistory.filter(d => d.success).length / this.doubtHistory.length;
      if (successRate > 0.6) adjustedTolerance *= 1.1; // More confident
      if (successRate < 0.4) adjustedTolerance *= 0.9; // Less confident
    }
    
    return Math.min(1.0, Math.max(0.1, adjustedTolerance));
  }
}

export class AIService {
  private static instance: AIService;
  private aiPlayers: Set<string> = new Set();
  private smartAIPlayers: Map<string, SmartAIPlayer> = new Map();

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

  registerAIPlayer(playerId: string, playerName: string, aiType: 'basic' | 'smart' = 'basic'): void {
    this.aiPlayers.add(playerId);
    
    if (aiType === 'smart') {
      this.smartAIPlayers.set(playerId, new SmartAIPlayer(playerId, playerName));
      console.log(`✅ Registered Smart AI player: ${playerName} (${playerId})`);
    } else {
      console.log(`✅ Registered Basic AI player: ${playerName} (${playerId})`);
    }
    
    console.log('All registered AI players:', Array.from(this.aiPlayers));
  }

  unregisterAIPlayer(playerId: string): void {
    this.aiPlayers.delete(playerId);
    this.smartAIPlayers.delete(playerId);
    console.log(`🗑️ Unregistered AI player: ${playerId}`);
    console.log('Remaining AI players:', Array.from(this.aiPlayers));
  }

  clearAllAI(): void {
    this.aiPlayers.clear();
    this.smartAIPlayers.clear();
    console.log('🧹 Cleared all AI registrations');
  }

  isAIPlayer(playerId: string): boolean {
    return this.aiPlayers.has(playerId);
  }

  isSmartAIPlayer(playerId: string): boolean {
    return this.smartAIPlayers.has(playerId);
  }

  generateSmartAction(playerId: string, currentBid: any, game: any, myDice: number[] = []): { action: string; data?: any } {
    try {
      const smartAI = this.smartAIPlayers.get(playerId);
      if (!smartAI) {
        console.log('Smart AI not found, falling back to random action');
        return this.generateRandomAction(currentBid, game.players?.length || 3);
      }

      // Simple active player counting (like basic AI)
      const totalPlayers = game.players?.length || 3;
      
      console.log(`Smart AI ${smartAI.name} state:`, {
        totalPlayers,
        myDice: myDice?.length || 0,
        currentBid
      });
      
      // If no current bid, make an opening bid (like basic AI but smarter)
      if (!currentBid) {
        return this.generateSmartOpeningBid(smartAI, myDice);
      }

      // Validate current bid (basic check)
      if (!currentBid.quantity || !currentBid.faceValue || 
          typeof currentBid.quantity !== 'number' || typeof currentBid.faceValue !== 'number') {
        console.error(`Smart AI ${smartAI.name}: Invalid current bid, using basic AI`);
        return this.generateRandomAction(currentBid, totalPlayers);
      }

      // Smart AI logic: Enhanced version of basic AI probability calculations
      // Count how many dice we have of the current bid's face value
      const ourDiceCount = myDice.filter(die => die === currentBid.faceValue).length;
      
      // Enhanced doubt probability (based on basic AI but smarter)
      // Basic AI uses: (1 / totalPlayers) * 0.3 * quantity^1.5
      // Smart AI enhances this with our actual dice knowledge
      let baseDoubtProbability = (1 / totalPlayers) * 0.3 * Math.pow(currentBid.quantity, 1.5);
      
      // Adjust based on our dice - if we have many of the face value, less likely to doubt
      const diceAdjustment = ourDiceCount * 0.1; // Reduce doubt probability if we have matching dice
      const smartDoubtProbability = Math.max(0.05, baseDoubtProbability - diceAdjustment);
      
      // Spot-on probability (slightly higher than basic AI)
      const spotOnProbability = 0.02; // 2% instead of 1%
      
      const random = Math.random();
      
      // Decision making (similar to basic AI)
      if (random < smartDoubtProbability) {
        console.log(`Smart AI ${smartAI.name} DOUBTING: probability=${smartDoubtProbability.toFixed(3)}, bid=${currentBid.quantity} ${currentBid.faceValue}s, ourDice=${ourDiceCount}`);
        return { action: 'doubt', data: {} };
      } else if (random < smartDoubtProbability + spotOnProbability) {
        console.log(`Smart AI ${smartAI.name} SPOT ON: probability=${spotOnProbability.toFixed(3)}, bid=${currentBid.quantity} ${currentBid.faceValue}s`);
        return { action: 'spotOn', data: {} };
      } else {
        // Make a smart bid (enhanced version of basic AI bidding)
        const bidAction = this.generateSmartBidAction(currentBid, myDice);
        console.log(`Smart AI ${smartAI.name} bidding:`, bidAction);
        return bidAction;
      }
    } catch (error) {
      console.error(`Error in Smart AI ${playerId}:`, error);
      // Always fallback to basic AI
      return this.generateRandomAction(currentBid, game.players?.length || 3);
    }
  }

  private generateSmartOpeningBid(smartAI: SmartAIPlayer, myDice: number[]): { action: string; data: any } {
    try {
      // Simple approach: like basic AI but consider our dice
      if (!Array.isArray(myDice) || myDice.length === 0) {
        // Fallback to basic AI logic
        return {
          action: 'bid',
          data: {
            quantity: Math.random() < 0.5 ? 1 : 2,
            faceValue: Math.floor(Math.random() * 6) + 1
          }
        };
      }
      
      // Count our dice
      const diceCounts = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused, 1-6 for face values
      myDice.forEach(die => {
        if (die >= 1 && die <= 6) {
          diceCounts[die]++;
        }
      });
      
      // Find our best face value (most dice)
      let bestFaceValue = 1;
      let maxCount = 0;
      
      for (let face = 1; face <= 6; face++) {
        if (diceCounts[face] > maxCount) {
          maxCount = diceCounts[face];
          bestFaceValue = face;
        }
      }
      
      // Bid based on what we have (conservative)
      const quantity = Math.max(1, maxCount);
      
      console.log(`Smart AI ${smartAI.name} opening bid: ${quantity} ${bestFaceValue}s (we have ${maxCount})`);
      return { action: 'bid', data: { quantity, faceValue: bestFaceValue } };
    } catch (error) {
      console.error(`Smart AI ${smartAI.name}: Error in generateSmartOpeningBid:`, error);
      // Emergency fallback - basic AI style
      return {
        action: 'bid',
        data: {
          quantity: 1,
          faceValue: Math.floor(Math.random() * 6) + 1
        }
      };
    }
  }

  private generateSmartBidAction(currentBid: any, myDice: number[]): { action: string; data: any } {
    try {
      // Enhanced version of basic AI bidding logic
      const currentQuantity = currentBid.quantity;
      const currentFaceValue = currentBid.faceValue;
      
      // Count our dice to inform our decision
      const diceCounts = [0, 0, 0, 0, 0, 0, 0];
      if (Array.isArray(myDice)) {
        myDice.forEach(die => {
          if (die >= 1 && die <= 6) {
            diceCounts[die]++;
          }
        });
      }
      
      // Smart AI strategy: prefer bids where we have some dice
      let bid;
      
      // Strategy 1: Same quantity, higher face value (if possible and we have dice for it)
      if (currentFaceValue < 6) {
        // Check if we have dice for higher face values
        let bestHigherFace = currentFaceValue + 1;
        let maxDiceForHigherFace = 0;
        
        for (let face = currentFaceValue + 1; face <= 6; face++) {
          if (diceCounts[face] > maxDiceForHigherFace) {
            maxDiceForHigherFace = diceCounts[face];
            bestHigherFace = face;
          }
        }
        
        // If we have dice for a higher face value, use it
        if (maxDiceForHigherFace > 0) {
          bid = {
            action: 'bid',
            data: {
              quantity: currentQuantity,
              faceValue: bestHigherFace
            }
          };
        } else {
          // No dice for higher faces, increase face value by 1
          bid = {
            action: 'bid',
            data: {
              quantity: currentQuantity,
              faceValue: currentFaceValue + 1
            }
          };
        }
      } else {
        // Face value is already 6, must increase quantity
        bid = {
          action: 'bid',
          data: {
            quantity: currentQuantity + 1,
            faceValue: currentFaceValue
          }
        };
      }
      
      // Fallback strategy if first strategy doesn't work
      if (!bid) {
        // Strategy 2: Increase quantity (like basic AI)
        bid = {
          action: 'bid',
          data: {
            quantity: currentQuantity + 1,
            faceValue: currentFaceValue
          }
        };
      }
      
      // Validate the bid
      if (!this.isBidValid(bid.data, currentBid)) {
        // Emergency fallback
        bid = {
          action: 'bid',
          data: {
            quantity: currentQuantity + 1,
            faceValue: currentFaceValue
          }
        };
      }
      
      console.log(`Smart AI bid: ${bid.data.quantity} ${bid.data.faceValue}s (we have ${diceCounts[bid.data.faceValue]} of that face)`);
      return bid;
    } catch (error) {
      console.error('Error in generateSmartBidAction:', error);
      // Emergency fallback - basic AI style
      return {
        action: 'bid',
        data: {
          quantity: currentBid.quantity + 1,
          faceValue: currentBid.faceValue
        }
      };
    }
  }

  generateRandomAction(currentBid: any, totalPlayers: number = 3): { action: string; data?: any } {
    try {
      // If no current bid, must bid
      if (!currentBid) {
        const bidAction = this.generateBidAction();
        console.log('AI generated opening bid:', bidAction);
        return bidAction;
      }

      // Calculate doubt probability using the formula: (1 / number of players) * 0.3 * amount^1.5
      const doubtProbability = (1 / totalPlayers) * 0.3 * Math.pow(currentBid.quantity, 1.5);
      const spotOnProbability = 0.01; // 1% chance for spot-on
      
      const random = Math.random();
      
      if (random < doubtProbability) {
        console.log(`AI considering doubt: probability=${doubtProbability.toFixed(3)}, bid=${currentBid.quantity} of ${currentBid.faceValue}s`);
        return { action: 'doubt', data: {} };
      } else if (random < doubtProbability + spotOnProbability) {
        console.log(`AI considering spot-on: probability=${spotOnProbability.toFixed(3)}, bid=${currentBid.quantity} of ${currentBid.faceValue}s`);
        return { action: 'spotOn', data: {} };
      } else {
        const bidAction = this.generateBidAction(currentBid);
        console.log('AI generated bid:', bidAction);
        return bidAction;
      }
    } catch (error) {
      console.error('Error in generateRandomAction:', error);
      // Emergency fallback - always bid
      return {
        action: 'bid',
        data: {
          quantity: (currentBid?.quantity || 0) + 1,
          faceValue: currentBid?.faceValue || Math.floor(Math.random() * 6) + 1
        }
      };
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

  // Track bid for learning
  trackBid(playerId: string, quantity: number, faceValue: number, roundNumber: number): void {
    const smartAI = this.smartAIPlayers.get(playerId);
    if (smartAI) {
      smartAI.bidHistory.push({ playerId, quantity, faceValue, roundNumber });
      // Keep only recent history (last 20 bids per player)
      if (smartAI.bidHistory.length > 100) {
        smartAI.bidHistory = smartAI.bidHistory.slice(-100);
      }
    }
  }

  // Track doubt result for learning
  trackDoubtResult(playerId: string, targetBid: any, success: boolean): void {
    const smartAI = this.smartAIPlayers.get(playerId);
    if (smartAI) {
      smartAI.doubtHistory.push({ success, targetBid });
      // Keep only recent history (last 20 doubts)
      if (smartAI.doubtHistory.length > 20) {
        smartAI.doubtHistory = smartAI.doubtHistory.slice(-20);
      }
      
      // Adjust risk tolerance based on success
      if (success) {
        smartAI.riskTolerance = Math.min(0.6, smartAI.riskTolerance + 0.02);
      } else {
        smartAI.riskTolerance = Math.max(0.1, smartAI.riskTolerance - 0.01);
      }
    }
  }

  // Get AI action with the appropriate strategy
  getAIAction(playerId: string, currentBid: any, game: any, myDice: number[] = []): { action: string; data?: any } {
    console.log(`🤖 Getting AI action for player ${playerId}:`, {
      isSmartAI: this.isSmartAIPlayer(playerId),
      isBasicAI: this.isAIPlayer(playerId) && !this.isSmartAIPlayer(playerId),
      currentBid,
      myDice
    });
    
    try {
      if (this.isSmartAIPlayer(playerId)) {
        console.log(`🧠 Using Smart AI strategy for player ${playerId}`);
        const action = this.generateSmartAction(playerId, currentBid, game, myDice);
        if (!action || !action.action) {
          console.warn('Smart AI returned invalid action, falling back to basic AI');
          return this.generateRandomAction(currentBid, game.players?.length || 3);
        }
        return action;
      } else {
        console.log(`🤖 Using Basic AI strategy for player ${playerId}`);
        return this.generateRandomAction(currentBid, game.players?.length || 3);
      }
    } catch (error) {
      console.error('Error generating AI action:', error);
      // Fallback to a simple bid
      console.log('🔄 Falling back to emergency AI action');
      return this.generateRandomAction(currentBid, game.players?.length || 3);
    }
  }

  // Simulate AI thinking delay
  async simulateThinking(): Promise<void> {
    const delay = Math.random() * 1000 + 1000; // 1-2 seconds
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const aiService = AIService.getInstance();
