import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Game, Bid, Player } from '../types/game';

export interface BidHistory {
  playerId: string;
  playerName: string;
  quantity: number;
  faceValue: number;
  roundNumber: number;
  gameId: string;
  timestamp: number;
}

export interface DoubtsHistory {
  doubterPlayerId: string;
  doubterName: string;
  targetBid: Bid;
  actualCount: number;
  success: boolean;
  roundNumber: number;
  gameId: string;
  timestamp: number;
}

export interface RoundResult {
  roundNumber: number;
  gameId: string;
  winnerId: string;
  winnerName: string;
  wasLastRound: boolean;
  timestamp: number;
}

export interface DiceRoll {
  playerId: string;
  playerName: string;
  dice: number[];
  roundNumber: number;
  gameId: string;
  timestamp: number;
}

export interface GameStatistics {
  // Basic stats
  totalGames: number;
  totalRounds: number;
  totalWins: number;
  timesReachedLastRound: number;
  
  // Bidding stats
  totalBids: number;
  averageBidQuantity: number;
  averageBidFaceValue: number;
  
  // Doubt stats
  totalDoubts: number;
  successfulDoubts: number;
  doubtSuccessRate: number;
  
  // Aggressiveness stats
  aggressiveBids: number; // Times raised bid by more than 1
  aggressivenessRate: number;
  
  // Probability analysis
  bidsExceedingProbability: number;
  probabilityExceedingRate: number;
  
  // Over/under accuracy
  correctBids: number;
  totalBidsToCheck: number;
  overUnderAccuracy: number;
  
  // Dice frequency
  diceFrequency: Record<number, number>; // face value -> count
  totalDiceRolled: number;
  
  // Pattern tracking
  consecutiveHighBids: number;
  consecutiveLowBids: number;
  alternatingPattern: number;
  
  // Bluff detection
  consistentHighBids: number;
  bluffDetectionScore: number;
  
  // History
  bidHistory: BidHistory[];
  doubtsHistory: DoubtsHistory[];
  roundResults: RoundResult[];
  diceRolls: DiceRoll[];
}

interface StatisticsContextType {
  statistics: GameStatistics;
  trackBid: (bid: Bid, game: Game) => void;
  trackDoubt: (doubter: Player, targetBid: Bid, actualCount: number, success: boolean, game: Game) => void;
  trackRoundEnd: (winner: Player, game: Game, wasLastRound: boolean) => void;
  trackDiceRoll: (player: Player, dice: number[], game: Game) => void;
  trackGameEnd: (winner: Player, game: Game) => void;
  resetStatistics: () => void;
  getPlayerStatistics: (playerId: string) => Partial<GameStatistics>;
}

const defaultStatistics: GameStatistics = {
  totalGames: 0,
  totalRounds: 0,
  totalWins: 0,
  timesReachedLastRound: 0,
  totalBids: 0,
  averageBidQuantity: 0,
  averageBidFaceValue: 0,
  totalDoubts: 0,
  successfulDoubts: 0,
  doubtSuccessRate: 0,
  aggressiveBids: 0,
  aggressivenessRate: 0,
  bidsExceedingProbability: 0,
  probabilityExceedingRate: 0,
  correctBids: 0,
  totalBidsToCheck: 0,
  overUnderAccuracy: 0,
  diceFrequency: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  totalDiceRolled: 0,
  consecutiveHighBids: 0,
  consecutiveLowBids: 0,
  alternatingPattern: 0,
  consistentHighBids: 0,
  bluffDetectionScore: 0,
  bidHistory: [],
  doubtsHistory: [],
  roundResults: [],
  diceRolls: []
};

const StatisticsContext = createContext<StatisticsContextType | undefined>(undefined);

interface StatisticsProviderProps {
  children: ReactNode;
}

export const StatisticsProvider: React.FC<StatisticsProviderProps> = ({ children }) => {
  const [statistics, setStatistics] = useState<GameStatistics>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('gameStatistics');
    return saved ? JSON.parse(saved) : defaultStatistics;
  });

  // Save to localStorage whenever statistics change
  useEffect(() => {
    localStorage.setItem('gameStatistics', JSON.stringify(statistics));
  }, [statistics]);

  // Calculate expected dice count based on probability
  const calculateExpectedDiceCount = (totalDice: number, faceValue: number): number => {
    // In Liar's Dice, 1s are typically wild, so probability is 1/3 for specific faces, 1/6 for 1s
    const probability = faceValue === 1 ? 1/6 : 1/3;
    return Math.round(totalDice * probability);
  };

  // Check if bid exceeds statistical probability
  const bidExceedsProbability = (quantity: number, faceValue: number, totalDice: number): boolean => {
    const expected = calculateExpectedDiceCount(totalDice, faceValue);
    return quantity > expected * 1.5; // Consider it exceeding if 50% above expected
  };

  const trackBid = (bid: Bid, game: Game) => {
    const player = game.players.find(p => p.id === bid.playerId);
    if (!player) return;

    const totalDice = game.players.reduce((sum, p) => sum + p.dice.length, 0);
    const exceedsProbability = bidExceedsProbability(bid.quantity, bid.faceValue, totalDice);
    
    // Check aggressiveness - if there's a previous bid, see if this raises by more than 1
    let isAggressive = false;
    if (game.previousBid) {
      const quantityIncrease = bid.quantity - game.previousBid.quantity;
      const faceValueIncrease = bid.faceValue - game.previousBid.faceValue;
      isAggressive = quantityIncrease > 1 || (quantityIncrease === 0 && faceValueIncrease > 1);
    }

    setStatistics(prev => {
      const newBidHistory: BidHistory = {
        playerId: bid.playerId,
        playerName: player.name,
        quantity: bid.quantity,
        faceValue: bid.faceValue,
        roundNumber: game.roundNumber,
        gameId: game.id,
        timestamp: Date.now()
      };

      const newTotalBids = prev.totalBids + 1;
      const newTotalQuantity = prev.bidHistory.reduce((sum, b) => sum + b.quantity, 0) + bid.quantity;
      const newTotalFaceValue = prev.bidHistory.reduce((sum, b) => sum + b.faceValue, 0) + bid.faceValue;
      
      return {
        ...prev,
        totalBids: newTotalBids,
        averageBidQuantity: newTotalQuantity / newTotalBids,
        averageBidFaceValue: newTotalFaceValue / newTotalBids,
        aggressiveBids: prev.aggressiveBids + (isAggressive ? 1 : 0),
        aggressivenessRate: (prev.aggressiveBids + (isAggressive ? 1 : 0)) / newTotalBids,
        bidsExceedingProbability: prev.bidsExceedingProbability + (exceedsProbability ? 1 : 0),
        probabilityExceedingRate: (prev.bidsExceedingProbability + (exceedsProbability ? 1 : 0)) / newTotalBids,
        bidHistory: [...prev.bidHistory, newBidHistory]
      };
    });
  };

  const trackDoubt = (doubter: Player, targetBid: Bid, actualCount: number, success: boolean, game: Game) => {
    setStatistics(prev => {
      const newDoubt: DoubtsHistory = {
        doubterPlayerId: doubter.id,
        doubterName: doubter.name,
        targetBid,
        actualCount,
        success,
        roundNumber: game.roundNumber,
        gameId: game.id,
        timestamp: Date.now()
      };

      const newTotalDoubts = prev.totalDoubts + 1;
      const newSuccessfulDoubts = prev.successfulDoubts + (success ? 1 : 0);

      return {
        ...prev,
        totalDoubts: newTotalDoubts,
        successfulDoubts: newSuccessfulDoubts,
        doubtSuccessRate: newSuccessfulDoubts / newTotalDoubts,
        doubtsHistory: [...prev.doubtsHistory, newDoubt]
      };
    });
  };

  const trackRoundEnd = (winner: Player, game: Game, wasLastRound: boolean) => {
    setStatistics(prev => {
      const newRoundResult: RoundResult = {
        roundNumber: game.roundNumber,
        gameId: game.id,
        winnerId: winner.id,
        winnerName: winner.name,
        wasLastRound,
        timestamp: Date.now()
      };

      return {
        ...prev,
        totalRounds: prev.totalRounds + 1,
        timesReachedLastRound: prev.timesReachedLastRound + (wasLastRound ? 1 : 0),
        roundResults: [...prev.roundResults, newRoundResult]
      };
    });
  };

  const trackDiceRoll = (player: Player, dice: number[], game: Game) => {
    setStatistics(prev => {
      const newDiceRoll: DiceRoll = {
        playerId: player.id,
        playerName: player.name,
        dice: [...dice],
        roundNumber: game.roundNumber,
        gameId: game.id,
        timestamp: Date.now()
      };

      // Update dice frequency
      const newDiceFrequency = { ...prev.diceFrequency };
      dice.forEach(die => {
        newDiceFrequency[die] = (newDiceFrequency[die] || 0) + 1;
      });

      return {
        ...prev,
        totalDiceRolled: prev.totalDiceRolled + dice.length,
        diceFrequency: newDiceFrequency,
        diceRolls: [...prev.diceRolls, newDiceRoll]
      };
    });
  };

  const trackGameEnd = (winner: Player, game: Game) => {
    setStatistics(prev => ({
      ...prev,
      totalGames: prev.totalGames + 1,
      totalWins: prev.totalWins + 1 // Assuming tracking for the current player
    }));
  };

  const resetStatistics = () => {
    setStatistics(defaultStatistics);
    localStorage.removeItem('gameStatistics');
  };

  const getPlayerStatistics = (playerId: string): Partial<GameStatistics> => {
    // Filter statistics for a specific player
    const playerBids = statistics.bidHistory.filter(b => b.playerId === playerId);
    const playerDoubts = statistics.doubtsHistory.filter(d => d.doubterPlayerId === playerId);
    const playerRounds = statistics.roundResults.filter(r => r.winnerId === playerId);
    const playerDice = statistics.diceRolls.filter(d => d.playerId === playerId);

    return {
      totalBids: playerBids.length,
      averageBidQuantity: playerBids.length > 0 ? playerBids.reduce((sum, b) => sum + b.quantity, 0) / playerBids.length : 0,
      averageBidFaceValue: playerBids.length > 0 ? playerBids.reduce((sum, b) => sum + b.faceValue, 0) / playerBids.length : 0,
      totalDoubts: playerDoubts.length,
      successfulDoubts: playerDoubts.filter(d => d.success).length,
      doubtSuccessRate: playerDoubts.length > 0 ? playerDoubts.filter(d => d.success).length / playerDoubts.length : 0,
      totalWins: playerRounds.length,
      bidHistory: playerBids,
      doubtsHistory: playerDoubts,
      roundResults: playerRounds,
      diceRolls: playerDice
    };
  };

  const value: StatisticsContextType = {
    statistics,
    trackBid,
    trackDoubt,
    trackRoundEnd,
    trackDiceRoll,
    trackGameEnd,
    resetStatistics,
    getPlayerStatistics
  };

  return (
    <StatisticsContext.Provider value={value}>
      {children}
    </StatisticsContext.Provider>
  );
};

export const useStatistics = (): StatisticsContextType => {
  const context = useContext(StatisticsContext);
  if (!context) {
    throw new Error('useStatistics must be used within a StatisticsProvider');
  }
  return context;
};
