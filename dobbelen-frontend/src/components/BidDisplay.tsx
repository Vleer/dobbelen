import React from 'react';
import { Bid, Player } from '../types/game';

interface BidDisplayProps {
  currentBid: Bid | null;
  currentPlayerId: string;
  players: Player[];
  roundNumber: number;
  winner: string | null;
}

const BidDisplay: React.FC<BidDisplayProps> = ({ 
  currentBid, 
  currentPlayerId, 
  players, 
  roundNumber, 
  winner 
}) => {
  const getCurrentPlayerName = () => {
    const player = players.find(p => p.id === currentPlayerId);
    return player ? player.name : 'Unknown';
  };

  const getWinnerName = () => {
    if (!winner) return null;
    const player = players.find(p => p.id === winner);
    return player ? player.name : 'Unknown';
  };

  const formatBid = (bid: Bid) => {
    const faceValueNames = {
      1: 'Ones',
      2: 'Twos', 
      3: 'Threes',
      4: 'Fours',
      5: 'Fives',
      6: 'Sixes'
    };
    
    const quantity = bid.quantity;
    const faceValue = faceValueNames[bid.faceValue as keyof typeof faceValueNames] || 'Unknown';
    
    return `${quantity} ${faceValue}`;
  };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      {/* Main Display Panel */}
      <div className="bg-black bg-opacity-80 text-white p-6 rounded-lg shadow-2xl text-center min-w-64">
        {/* Round Number */}
        <div className="text-lg font-bold mb-2">
          Round {roundNumber}
        </div>

        {/* Winner Display */}
        {winner && (
          <div className="text-2xl font-bold text-yellow-400 mb-4">
            🎉 {getWinnerName()} Wins! 🎉
          </div>
        )}

        {/* Current Bid */}
        {currentBid ? (
          <div className="mb-4">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {formatBid(currentBid)}
            </div>
            <div className="text-sm text-gray-300">
              Bid by {getCurrentPlayerName()}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="text-2xl text-gray-400">
              No current bid
            </div>
            <div className="text-sm text-gray-300">
              {getCurrentPlayerName()} to start
            </div>
          </div>
        )}

        {/* Turn Indicator */}
        {!winner && (
          <div className="text-sm text-yellow-300">
            {getCurrentPlayerName()}'s turn
          </div>
        )}
      </div>

      {/* Turn Indicator Arrows */}
      {!winner && currentPlayerId && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div className="text-yellow-400 text-2xl animate-bounce">
            ↓
          </div>
        </div>
      )}
    </div>
  );
};

export default BidDisplay;
