import React from 'react';
import { Player } from '../types/game';

interface OpponentPlayerProps {
  player: Player;
  position: number; // 0 = left, 1 = right, 2 = across, etc.
  isMyTurn: boolean;
  isDealer: boolean;
  showDice?: boolean; // Show dice when revealed at end of round
  previousBid?: { quantity: number; faceValue: number; playerId: string } | null;
}

const OpponentPlayer: React.FC<OpponentPlayerProps> = ({ player, position, isMyTurn, isDealer, showDice = false, previousBid }) => {
  const getPositionClasses = () => {
    switch (position) {
      case 0: // Left opponent
        return 'absolute bottom-1/4 left-4';
      case 1: // Right opponent
        return 'absolute bottom-1/4 right-4';
      case 2: // Across opponent
        return 'absolute top-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className={getPositionClasses()}>
      {/* Player Container */}
      <div className={`bg-white p-3 rounded-lg shadow-lg border-2 ${isMyTurn ? 'border-yellow-400' : 'border-gray-300'} ${player.eliminated ? 'opacity-50' : ''} ${position === 0 ? 'transform -rotate-90' : position === 1 ? 'transform rotate-90' : ''}`}>
        {/* Content with counter-rotation for text readability */}
        <div className={position === 0 ? 'transform rotate-90' : position === 1 ? 'transform -rotate-90' : ''}>
          {/* Username */}
          <div className="text-center mb-2">
            <span className="font-bold text-sm">{player.name}</span>
            {isMyTurn && <span className="ml-1 text-yellow-600 text-xs">🪙</span>}
          </div>

          {/* Dealer Button */}
          {isDealer && (
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-6 h-6 bg-white border-2 border-black rounded-full">
                <span className="text-black text-xs font-bold">D</span>
              </div>
            </div>
          )}

          {/* Cup - Always closed for opponents, or dice if revealed */}
          <div className="flex justify-center mb-1">
            {showDice && player.dice && player.dice.length > 0 ? (
              <div className="flex space-x-1">
                {player.dice.map((value, index) => (
                  <div key={index} className="w-4 h-4 bg-white border border-black rounded text-xs flex items-center justify-center">
                    {value}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${player.eliminated ? 'bg-gray-400 border-gray-600' : 'bg-amber-600 border-amber-800'}`}>
                <span className="text-white text-xs">C</span>
              </div>
            )}
          </div>

          {/* Dice Count (hidden for opponents) */}
          <div className="text-center text-xs text-gray-500">
            {player.diceCount} dice
          </div>

          {/* Win Tokens */}
          {player.winTokens > 0 && (
            <div className="text-center text-xs text-yellow-600 font-bold">
              🏆 {player.winTokens} wins
            </div>
          )}

          {/* Previous Bid Display */}
          {previousBid && previousBid.playerId === player.id && (
            <div className="text-center text-xs text-blue-600 font-bold mt-1">
              Bid: {previousBid.quantity} of {previousBid.faceValue}s
            </div>
          )}

          {/* Eliminated State */}
          {player.eliminated && (
            <div className="text-center text-red-600 font-bold text-xs">
              OUT
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpponentPlayer;
