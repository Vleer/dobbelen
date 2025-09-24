import React from 'react';
import { Bid, Player } from '../types/game';
import DiceHand from './DiceHand';

interface BidDisplayProps {
  currentBid: Bid | null;
  currentPlayerId?: string;
  players?: Player[];
  roundNumber?: number;
  winner?: string;
  playerName?: string;
}

const BidDisplay: React.FC<BidDisplayProps> = ({ currentBid, currentPlayerId, players, roundNumber, winner, playerName }) => {
  if (!currentBid) {
    return (
      <div className="text-center text-gray-500 italic">
        No current bid
      </div>
    );
  }

  const faceValueNames = {
    1: 'Ones',
    2: 'Twos', 
    3: 'Threes',
    4: 'Fours',
    5: 'Fives',
    6: 'Sixes'
  };

  // Get the player name who made the bid
  const bidderName = playerName || (players && currentPlayerId ? 
    players.find(p => p.id === currentBid.playerId)?.name : 
    'Unknown Player');

  // Create an array of dice values for visualization
  const diceValues = Array(currentBid.quantity).fill(currentBid.faceValue);

  return (
    <div className="bg-red-800 border-4 border-red-600 rounded-3xl p-6 shadow-2xl">
      <div className="text-center">
        <div className="text-xl font-bold text-white mb-3">
          {bidderName} bids:
        </div>
        <div className="text-2xl font-bold text-yellow-300 mb-4">
          {currentBid.quantity} {faceValueNames[currentBid.faceValue as keyof typeof faceValueNames]}
        </div>
        
        {/* Dice Visualization */}
        <div className="flex justify-center mb-3">
          <DiceHand diceValues={diceValues} />
        </div>
        
        <div className="text-sm text-red-200">
          {currentBid.quantity} dice showing {currentBid.faceValue}
        </div>
      </div>
    </div>
  );
};

export default BidDisplay;