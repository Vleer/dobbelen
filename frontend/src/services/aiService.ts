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

// Enhanced opponent tracking data
interface OpponentProfile {
  playerId: string;
  bidHistory: BidHistory[];
  doubtHistory: { bid: any; success: boolean; round: number }[];
  bluffTendency: number; // 0-1 scale
  aggressiveness: number; // 0-1 scale  
  conservativeness: number; // 0-1 scale
  reliability: number; // 0-1 scale based on prediction accuracy
  lastSeenDice?: number[]; // Dice from previous rounds if visible
}

class SmartAIPlayer {
  id: string;
  name: string;
  bidHistory: BidHistory[] = [];
  doubtHistory: { success: boolean; targetBid: any; round: number }[] = [];
  riskTolerance: number = 0.35; // Base risk tolerance (0 = very conservative, 1 = very aggressive)
  opponentProfiles: Map<string, OpponentProfile> = new Map();
  roundNumber: number = 1;
  gameHistory: Array<{ round: number; totalDice: number; activePlayers: number; outcome: string }> = [];
  
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  // Calculate exact probability of a bid being true using binomial distribution
  calculateBidProbability(quantity: number, faceValue: number, totalDice: number, knownDice: number[] = []): number {
    // Each die has 1/6 chance of showing the target face value (no wild cards in this game)
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

  // More sophisticated probability calculation including opponent modeling
  calculateAdvancedBidProbability(quantity: number, faceValue: number, totalDice: number, 
                                 knownDice: number[], biddingPlayerId: string): number {
    const baseProbability = this.calculateBidProbability(quantity, faceValue, totalDice, knownDice);
    
    // Adjust based on opponent profile
    const opponentProfile = this.opponentProfiles.get(biddingPlayerId);
    if (!opponentProfile) return baseProbability;
    
    // If opponent tends to bluff, reduce our confidence in their bid
    const bluffAdjustment = opponentProfile.bluffTendency * 0.15; // Up to 15% reduction
    
    // If opponent is very aggressive, they might be overbidding
    const aggressionAdjustment = Math.max(0, opponentProfile.aggressiveness - 0.5) * 0.1; // Up to 10% reduction
    
    // If opponent is reliable, increase our confidence
    const reliabilityAdjustment = (opponentProfile.reliability - 0.5) * 0.1; // ±10% adjustment
    
    const adjustedProbability = baseProbability - bluffAdjustment - aggressionAdjustment + reliabilityAdjustment;
    
    return Math.max(0.01, Math.min(0.99, adjustedProbability));
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

  // Advanced bluff detection using multiple factors
  assessBluffLikelihood(bid: any, playerId: string, gameContext: any): number {
    const opponentProfile = this.opponentProfiles.get(playerId);
    if (!opponentProfile || opponentProfile.bidHistory.length < 3) {
      return 0.5; // Neutral if insufficient data
    }
    
    // Factor 1: Historical bluffing tendency
    let bluffScore = opponentProfile.bluffTendency;
    
    // Factor 2: Bid aggressiveness relative to expected value
    const expectedCount = gameContext.totalDice / 6; // Expected count for any face value
    const bidAggression = bid.quantity / expectedCount;
    if (bidAggression > 1.5) bluffScore += 0.2; // Very aggressive bid
    else if (bidAggression > 1.2) bluffScore += 0.1; // Moderately aggressive bid
    
    // Factor 3: Sudden change in bidding pattern
    const recentBids = opponentProfile.bidHistory.slice(-3);
    if (recentBids.length >= 2) {
      const avgRecentQuantity = recentBids.reduce((sum, b) => sum + b.quantity, 0) / recentBids.length;
      if (bid.quantity > avgRecentQuantity * 1.4) {
        bluffScore += 0.15; // Sudden escalation
      }
    }
    
    // Factor 4: Position in game (endgame pressure)
    if (gameContext.activePlayers <= 3) {
      bluffScore += 0.1; // More likely to bluff in endgame
    }
    
    // Factor 5: Round pressure (higher bids under pressure)
    if (bid.quantity >= gameContext.totalDice * 0.4) {
      bluffScore += 0.1; // High-pressure bid
    }
    
    return Math.max(0.1, Math.min(0.9, bluffScore));
  }

  // Identify high-confidence exact-match scenarios for spot-on
  identifySpotOnOpportunity(bid: any, totalDice: number, knownDice: number[], gameContext: any): number {
    // Calculate probability that bid is exactly correct
    const exactProbability = this.calculateExactProbability(bid.quantity, bid.faceValue, totalDice, knownDice);
    
    // Base spot-on threshold
    let spotOnThreshold = 0.15; // 15% base probability needed
    
    // Adjust threshold based on game state
    if (gameContext.activePlayers <= 3) {
      spotOnThreshold *= 0.8; // More willing to take risks in endgame
    }
    
    // Adjust based on our dice count
    const ourCount = knownDice.filter(die => die === bid.faceValue).length;
    if (ourCount >= bid.quantity - 2) {
      spotOnThreshold *= 0.7; // More confident if we have most of the dice
    }
    
    // Factor in opponent reliability
    const opponentProfile = this.opponentProfiles.get(bid.playerId);
    if (opponentProfile && opponentProfile.reliability > 0.7) {
      spotOnThreshold *= 1.2; // Need higher confidence against reliable opponents
    }
    
    return exactProbability > spotOnThreshold ? exactProbability : 0;
  }

  // Calculate probability of exact match
  private calculateExactProbability(quantity: number, faceValue: number, totalDice: number, knownDice: number[]): number {
    const successProbability = 1/6;
    const knownMatches = knownDice.filter(die => die === faceValue).length;
    const remainingDice = totalDice - knownDice.length;
    const remainingNeeded = quantity - knownMatches;
    
    if (remainingNeeded < 0 || remainingNeeded > remainingDice) return 0;
    
    // Exact binomial probability
    return this.binomialCoefficient(remainingDice, remainingNeeded) * 
           Math.pow(successProbability, remainingNeeded) * 
           Math.pow(1 - successProbability, remainingDice - remainingNeeded);
  }

  // Dynamic risk tolerance with endgame awareness
  calculateRiskTolerance(activePlayers: number, isEarlyGame: boolean): number {
    let adjustedTolerance = this.riskTolerance;
    
    // Endgame awareness - more conservative with fewer players
    if (activePlayers <= 2) {
      adjustedTolerance *= 0.6; // Very conservative in final showdown
    } else if (activePlayers <= 3) {
      adjustedTolerance *= 0.75; // Conservative with few players
    }
    
    // Early game aggression
    if (isEarlyGame && activePlayers >= 4) {
      adjustedTolerance *= 1.15; // Slightly more aggressive early with many players
    }
    
    // Performance-based adjustment
    if (this.doubtHistory.length >= 3) {
      const recentHistory = this.doubtHistory.slice(-5);
      const successRate = recentHistory.filter(d => d.success).length / recentHistory.length;
      
      if (successRate >= 0.7) {
        adjustedTolerance *= 1.1; // More confident after successes
      } else if (successRate <= 0.3) {
        adjustedTolerance *= 0.85; // More cautious after failures
      }
    }
    
    // Opponent adaptation
    let avgOpponentAggression = 0.5;
    if (this.opponentProfiles.size > 0) {
      const totalAggression = Array.from(this.opponentProfiles.values())
        .reduce((sum, profile) => sum + profile.aggressiveness, 0);
      avgOpponentAggression = totalAggression / this.opponentProfiles.size;
    }
    
    // If opponents are aggressive, be more conservative
    if (avgOpponentAggression > 0.7) {
      adjustedTolerance *= 0.9;
    } else if (avgOpponentAggression < 0.3) {
      adjustedTolerance *= 1.1; // Be more aggressive against conservative opponents
    }
    
    return Math.min(0.8, Math.max(0.15, adjustedTolerance));
  }

  // Update opponent profile based on observed behavior
  updateOpponentProfile(playerId: string, bid: any, actualOutcome?: { actualCount: number; wasBluff: boolean }): void {
    if (!this.opponentProfiles.has(playerId)) {
      this.opponentProfiles.set(playerId, {
        playerId,
        bidHistory: [],
        doubtHistory: [],
        bluffTendency: 0.5,
        aggressiveness: 0.5,
        conservativeness: 0.5,
        reliability: 0.5
      });
    }
    
    const profile = this.opponentProfiles.get(playerId)!;
    
    // Add to bid history
    profile.bidHistory.push({
      playerId,
      quantity: bid.quantity,
      faceValue: bid.faceValue,
      roundNumber: this.roundNumber
    });
    
    // Keep recent history
    if (profile.bidHistory.length > 20) {
      profile.bidHistory = profile.bidHistory.slice(-20);
    }
    
    // Update metrics if we have outcome data
    if (actualOutcome) {
      // Update bluff tendency
      const alpha = 0.1; // Learning rate
      if (actualOutcome.wasBluff) {
        profile.bluffTendency = profile.bluffTendency * (1 - alpha) + 1.0 * alpha;
      } else {
        profile.bluffTendency = profile.bluffTendency * (1 - alpha) + 0.0 * alpha;
      }
      
      // Update reliability based on bid accuracy
      const bidAccuracy = Math.abs(bid.quantity - actualOutcome.actualCount) <= 1 ? 1.0 : 0.0;
      profile.reliability = profile.reliability * (1 - alpha) + bidAccuracy * alpha;
    }
    
    // Update aggressiveness based on bid pattern
    if (profile.bidHistory.length >= 3) {
      const recentBids = profile.bidHistory.slice(-3);
      const avgQuantity = recentBids.reduce((sum, b) => sum + b.quantity, 0) / recentBids.length;
      const expectedQuantity = 2; // Conservative baseline
      
      const aggressionScore = Math.min(1.0, avgQuantity / expectedQuantity / 2);
      profile.aggressiveness = profile.aggressiveness * 0.9 + aggressionScore * 0.1;
      profile.conservativeness = 1.0 - profile.aggressiveness;
    }
  }

  // Clear outdated data between rounds
  newRound(roundNumber: number): void {
    this.roundNumber = roundNumber;
    
    // Clear very old history
    this.bidHistory = this.bidHistory.filter(bid => bid.roundNumber >= roundNumber - 3);
    this.doubtHistory = this.doubtHistory.filter(doubt => doubt.round >= roundNumber - 3);
    
    // Update opponent profiles for new round
    Array.from(this.opponentProfiles.values()).forEach(profile => {
      profile.bidHistory = profile.bidHistory.filter((bid: BidHistory) => bid.roundNumber >= roundNumber - 3);
      profile.doubtHistory = profile.doubtHistory.filter((doubt: any) => doubt.round >= roundNumber - 3);
    });
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

      // Calculate game context
      const activePlayers = game.players?.filter((p: any) => !game.eliminatedPlayers?.includes(p.id)) || [];
      const totalDice = activePlayers.length * 5; // Each player has 5 dice
      const isEarlyGame = game.roundNumber <= 2;
      
      const gameContext = {
        totalDice,
        activePlayers: activePlayers.length,
        isEarlyGame,
        roundNumber: game.roundNumber || 1
      };
      
      console.log(`🧠 Smart AI ${smartAI.name} analyzing:`, {
        totalDice,
        activePlayers: activePlayers.length,
        myDiceCount: myDice?.length || 0,
        currentBid,
        roundNumber: game.roundNumber
      });
      
      // Update round number
      if (game.roundNumber && game.roundNumber !== smartAI.roundNumber) {
        smartAI.newRound(game.roundNumber);
      }
      
      // If no current bid, make an intelligent opening bid
      if (!currentBid) {
        return this.generateAdvancedOpeningBid(smartAI, myDice, gameContext);
      }

      // Validate current bid
      if (!currentBid.quantity || !currentBid.faceValue || 
          typeof currentBid.quantity !== 'number' || typeof currentBid.faceValue !== 'number') {
        console.error(`Smart AI ${smartAI.name}: Invalid current bid, using basic AI`);
        return this.generateRandomAction(currentBid, activePlayers.length);
      }

      // Update opponent profile with this bid
      if (currentBid.playerId && currentBid.playerId !== playerId) {
        smartAI.updateOpponentProfile(currentBid.playerId, currentBid);
      }

      // === ADVANCED DECISION MAKING ===
      
      // 1. Calculate probability that current bid is true
      const bidProbability = smartAI.calculateAdvancedBidProbability(
        currentBid.quantity, 
        currentBid.faceValue, 
        totalDice, 
        myDice, 
        currentBid.playerId
      );
      
      // 2. Assess bluff likelihood
      const bluffLikelihood = smartAI.assessBluffLikelihood(currentBid, currentBid.playerId, gameContext);
      
      // 3. Check for spot-on opportunity
      const spotOnConfidence = smartAI.identifySpotOnOpportunity(currentBid, totalDice, myDice, gameContext);
      
      // 4. Calculate dynamic risk tolerance
      const riskTolerance = smartAI.calculateRiskTolerance(activePlayers.length, isEarlyGame);
      
      console.log(`🎯 Smart AI analysis:`, {
        bidProbability: bidProbability.toFixed(3),
        bluffLikelihood: bluffLikelihood.toFixed(3),
        spotOnConfidence: spotOnConfidence.toFixed(3),
        riskTolerance: riskTolerance.toFixed(3)
      });
      
      // === DECISION LOGIC ===
      
      // High-confidence spot-on (prioritized)
      if (spotOnConfidence > 0.2) {
        console.log(`🎯 Smart AI ${smartAI.name} SPOT-ON: High confidence (${(spotOnConfidence * 100).toFixed(1)}%)`);
        return { action: 'spotOn', data: {} };
      }
      
      // Doubt decision based on multiple factors
      let doubtScore = 0;
      
      // Factor 1: Low probability of bid being true
      if (bidProbability < 0.3) doubtScore += 0.4;
      else if (bidProbability < 0.5) doubtScore += 0.2;
      
      // Factor 2: High bluff likelihood
      if (bluffLikelihood > 0.7) doubtScore += 0.3;
      else if (bluffLikelihood > 0.5) doubtScore += 0.15;
      
      // Factor 3: Risk tolerance adjustment
      doubtScore *= riskTolerance;
      
      // Factor 4: Our dice knowledge
      const ourCount = myDice.filter(die => die === currentBid.faceValue).length;
      if (ourCount === 0 && currentBid.quantity >= totalDice * 0.25) {
        doubtScore += 0.2; // We have none and bid is substantial
      }
      
      // Factor 5: Endgame pressure
      if (activePlayers.length <= 3 && currentBid.quantity >= totalDice * 0.35) {
        doubtScore += 0.15; // High stakes in endgame
      }
      
      // Medium-confidence spot-on (secondary priority)
      if (spotOnConfidence > 0.1 && spotOnConfidence > doubtScore * 0.7) {
        console.log(`🎯 Smart AI ${smartAI.name} SPOT-ON: Medium confidence (${(spotOnConfidence * 100).toFixed(1)}%)`);
        return { action: 'spotOn', data: {} };
      }
      
      // Doubt decision
      if (doubtScore > 0.4) {
        console.log(`🚫 Smart AI ${smartAI.name} DOUBTING: Score=${doubtScore.toFixed(3)}, bidProb=${bidProbability.toFixed(3)}, bluff=${bluffLikelihood.toFixed(3)}`);
        
        // Track the doubt for learning
        smartAI.doubtHistory.push({
          success: false, // Will be updated later when we know the result
          targetBid: currentBid,
          round: game.roundNumber || 1
        });
        
        return { action: 'doubt', data: {} };
      }
      
      // Default: Make an intelligent bid
      const bidAction = this.generateAdvancedBidAction(smartAI, currentBid, myDice, gameContext);
      console.log(`📈 Smart AI ${smartAI.name} bidding:`, bidAction);
      return bidAction;
      
    } catch (error) {
      console.error(`Error in Smart AI ${playerId}:`, error);
      // Always fallback to basic AI
      return this.generateRandomAction(currentBid, game.players?.length || 3);
    }
  }

  private generateAdvancedOpeningBid(smartAI: SmartAIPlayer, myDice: number[], gameContext: any): { action: string; data: any } {
    try {
      if (!Array.isArray(myDice) || myDice.length === 0) {
        // Conservative fallback
        return {
          action: 'bid',
          data: {
            quantity: 1,
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
      
      // Calculate expected total for each face value
      const expectedCounts = [];
      for (let face = 1; face <= 6; face++) {
        const expectedTotal = gameContext.totalDice / 6; // Expected count across all players
        const ourContribution = diceCounts[face];
        const expectedFromOthers = expectedTotal - ourContribution;
        expectedCounts.push({
          face,
          ourCount: ourContribution,
          expectedTotal: expectedTotal,
          confidence: ourContribution / expectedTotal, // How much of expected total we provide
          totalExpected: ourContribution + expectedFromOthers
        });
      }
      
      // Sort by confidence (where we have a good foundation)
      expectedCounts.sort((a, b) => b.confidence - a.confidence);
      
      // Choose strategy based on risk tolerance
      const riskTolerance = smartAI.calculateRiskTolerance(gameContext.activePlayers, gameContext.isEarlyGame);
      
      let selectedBid;
      
      if (riskTolerance > 0.5) {
        // Aggressive: Bid slightly optimistically
        const bestOption = expectedCounts[0];
        const quantity = Math.max(1, Math.min(
          Math.ceil(bestOption.totalExpected * 1.1), // 10% above expected
          gameContext.totalDice * 0.3 // Cap at 30% of total dice
        ));
        selectedBid = { quantity, faceValue: bestOption.face };
      } else {
        // Conservative: Bid what we're confident about
        const bestOption = expectedCounts[0];
        const quantity = Math.max(1, Math.min(
          bestOption.ourCount + Math.floor(bestOption.expectedTotal * 0.3), // Our dice + 30% of expected from others
          gameContext.totalDice * 0.2 // Cap at 20% of total dice
        ));
        selectedBid = { quantity, faceValue: bestOption.face };
      }
      
      console.log(`🎲 Smart AI ${smartAI.name} opening bid: ${selectedBid.quantity} ${selectedBid.faceValue}s (we have ${diceCounts[selectedBid.faceValue]}, risk=${riskTolerance.toFixed(2)})`);
      return { action: 'bid', data: selectedBid };
      
    } catch (error) {
      console.error(`Smart AI ${smartAI.name}: Error in generateAdvancedOpeningBid:`, error);
      return {
        action: 'bid',
        data: {
          quantity: 1,
          faceValue: Math.floor(Math.random() * 6) + 1
        }
      };
    }
  }

  private generateAdvancedBidAction(smartAI: SmartAIPlayer, currentBid: any, myDice: number[], gameContext: any): { action: string; data: any } {
    try {
      const currentQuantity = currentBid.quantity;
      const currentFaceValue = currentBid.faceValue;
      
      // Count our dice
      const diceCounts = [0, 0, 0, 0, 0, 0, 0];
      myDice.forEach(die => {
        if (die >= 1 && die <= 6) {
          diceCounts[die]++;
        }
      });
      
      // Get risk tolerance for this situation
      const riskTolerance = smartAI.calculateRiskTolerance(gameContext.activePlayers, gameContext.isEarlyGame);
      
      // === BIDDING STRATEGY ANALYSIS ===
      
      // Option 1: Increase face value (same quantity)
      let faceValueOptions = [];
      if (currentFaceValue < 6) {
        for (let face = currentFaceValue + 1; face <= 6; face++) {
          const ourSupport = diceCounts[face];
          const confidence = smartAI.calculateBidProbability(currentQuantity, face, gameContext.totalDice, myDice);
          
          faceValueOptions.push({
            quantity: currentQuantity,
            faceValue: face,
            ourSupport,
            confidence,
            score: confidence * 0.7 + (ourSupport / 5) * 0.3 // Weight confidence higher
          });
        }
      }
      
      // Option 2: Increase quantity (same or different face value)
      let quantityOptions = [];
      for (let qty = currentQuantity + 1; qty <= Math.min(gameContext.totalDice, currentQuantity + 3); qty++) {
        // Try current face value
        let confidence = smartAI.calculateBidProbability(qty, currentFaceValue, gameContext.totalDice, myDice);
        quantityOptions.push({
          quantity: qty,
          faceValue: currentFaceValue,
          ourSupport: diceCounts[currentFaceValue],
          confidence,
          score: confidence * 0.8 + (diceCounts[currentFaceValue] / 5) * 0.2
        });
        
        // Try face values where we have dice (if quantity increase allows it)
        for (let face = 1; face <= 6; face++) {
          if (diceCounts[face] > 0 && (face > currentFaceValue || qty > currentQuantity)) {
            if (this.isBidValid({ quantity: qty, faceValue: face }, currentBid)) {
              confidence = smartAI.calculateBidProbability(qty, face, gameContext.totalDice, myDice);
              quantityOptions.push({
                quantity: qty,
                faceValue: face,
                ourSupport: diceCounts[face],
                confidence,
                score: confidence * 0.8 + (diceCounts[face] / 5) * 0.2
              });
            }
          }
        }
      }
      
      // Combine all options and sort by score
      const allOptions = [...faceValueOptions, ...quantityOptions];
      allOptions.sort((a, b) => b.score - a.score);
      
      // Filter by confidence based on risk tolerance
      const minConfidence = Math.max(0.1, 0.4 - riskTolerance * 0.3); // Higher risk tolerance = lower min confidence
      const viableOptions = allOptions.filter(option => option.confidence >= minConfidence);
      
      let selectedBid;
      
      if (viableOptions.length > 0) {
        // Choose from viable options
        if (riskTolerance > 0.6) {
          // Aggressive: Choose highest-scoring option
          selectedBid = viableOptions[0];
        } else if (riskTolerance > 0.4) {
          // Moderate: Choose from top 2-3 options randomly
          const topOptions = viableOptions.slice(0, Math.min(3, viableOptions.length));
          selectedBid = topOptions[Math.floor(Math.random() * topOptions.length)];
        } else {
          // Conservative: Choose most confident option
          const mostConfident = viableOptions.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );
          selectedBid = mostConfident;
        }
      } else {
        // No viable options - make minimal safe bid
        if (currentFaceValue < 6) {
          selectedBid = {
            quantity: currentQuantity,
            faceValue: currentFaceValue + 1,
            ourSupport: diceCounts[currentFaceValue + 1],
            confidence: 0.2
          };
        } else {
          selectedBid = {
            quantity: currentQuantity + 1,
            faceValue: currentFaceValue,
            ourSupport: diceCounts[currentFaceValue],
            confidence: 0.2
          };
        }
      }
      
      // Final validation
      const finalBid = {
        quantity: selectedBid.quantity,
        faceValue: selectedBid.faceValue
      };
      
      if (!this.isBidValid(finalBid, currentBid)) {
        // Emergency fallback
        finalBid.quantity = currentQuantity + 1;
        finalBid.faceValue = currentFaceValue;
      }
      
      console.log(`🎯 Smart AI ${smartAI.name} bid: ${finalBid.quantity} ${finalBid.faceValue}s (confidence=${selectedBid.confidence.toFixed(3)}, support=${selectedBid.ourSupport})`);
      
      // Track this bid for learning
      smartAI.bidHistory.push({
        playerId: smartAI.id,
        quantity: finalBid.quantity,
        faceValue: finalBid.faceValue,
        roundNumber: gameContext.roundNumber
      });
      
      return { action: 'bid', data: finalBid };
      
    } catch (error) {
      console.error('Error in generateAdvancedBidAction:', error);
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
      // Update the most recent doubt entry if it exists
      const recentDoubt = smartAI.doubtHistory
        .filter(d => d.round === smartAI.roundNumber)
        .pop();
      
      if (recentDoubt) {
        recentDoubt.success = success;
      } else {
        smartAI.doubtHistory.push({ 
          success, 
          targetBid, 
          round: smartAI.roundNumber 
        });
      }
      
      // Keep only recent history (last 20 doubts)
      if (smartAI.doubtHistory.length > 20) {
        smartAI.doubtHistory = smartAI.doubtHistory.slice(-20);
      }
      
      // Adjust risk tolerance based on success
      if (success) {
        smartAI.riskTolerance = Math.min(0.7, smartAI.riskTolerance + 0.02);
      } else {
        smartAI.riskTolerance = Math.max(0.2, smartAI.riskTolerance - 0.01);
      }
    }
  }

  // Update AI learning when round outcomes are revealed
  updateLearningFromRoundOutcome(actualCounts: { [faceValue: number]: number }, eliminatedPlayerId?: string, wasSpotOn?: boolean): void {
    Array.from(this.smartAIPlayers.entries()).forEach(([playerId, smartAI]) => {
      // Update opponent profiles based on revealed dice
      Array.from(smartAI.opponentProfiles.entries()).forEach(([opponentId, profile]) => {
        if (opponentId === eliminatedPlayerId) return; // Skip eliminated player
        
        // Update reliability based on recent bids
        const recentBids = profile.bidHistory
          .filter((bid: BidHistory) => bid.roundNumber === smartAI.roundNumber)
          .slice(-3);
        
        for (const bid of recentBids) {
          const actualCount = actualCounts[bid.faceValue] || 0;
          const wasBluff = actualCount < bid.quantity;
          
          smartAI.updateOpponentProfile(opponentId, bid, {
            actualCount,
            wasBluff
          });
        }
      });
      
      // Track our own performance
      const ourRecentDoubts = smartAI.doubtHistory
        .filter((d: any) => d.round === smartAI.roundNumber);
      
      for (const doubt of ourRecentDoubts) {
        if (doubt.targetBid && actualCounts[doubt.targetBid.faceValue] !== undefined) {
          const actualCount = actualCounts[doubt.targetBid.faceValue];
          const doubtWasCorrect = actualCount < doubt.targetBid.quantity;
          doubt.success = doubtWasCorrect;
        }
      }
    });
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

  // Optimized AI thinking delay - faster for smart AI
  async simulateThinking(playerId?: string): Promise<void> {
    let delay;
    
    if (playerId && this.isSmartAIPlayer(playerId)) {
      // Smart AI thinks faster but still has some delay for realism
      delay = Math.random() * 800 + 800; // 0.8-1.6 seconds
    } else {
      // Basic AI takes longer
      delay = Math.random() * 1200 + 1200; // 1.2-2.4 seconds
    }
    
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Performance monitoring for the smart AI
  getSmartAIStats(playerId: string): any {
    const smartAI = this.smartAIPlayers.get(playerId);
    if (!smartAI) return null;
    
    const doubtSuccessRate = smartAI.doubtHistory.length > 0 
      ? smartAI.doubtHistory.filter(d => d.success).length / smartAI.doubtHistory.length
      : 0;
    
    const opponentProfiles = Array.from(smartAI.opponentProfiles.values()).map(profile => ({
      playerId: profile.playerId,
      bluffTendency: profile.bluffTendency,
      aggressiveness: profile.aggressiveness,
      reliability: profile.reliability,
      bidsTracked: profile.bidHistory.length
    }));
    
    return {
      riskTolerance: smartAI.riskTolerance,
      doubtSuccessRate,
      totalDoubts: smartAI.doubtHistory.length,
      totalBids: smartAI.bidHistory.length,
      opponentProfiles,
      roundNumber: smartAI.roundNumber
    };
  }
}

export const aiService = AIService.getInstance();
