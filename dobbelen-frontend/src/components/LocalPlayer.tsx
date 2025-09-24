import React from 'react';
import { Player } from '../types/game';
import DiceHand from './DiceHand';

interface LocalPlayerProps {
  player: Player;
  isMyTurn: boolean;
  isDealer: boolean;
  onAction: (action: string, data?: any) => void;
  disabled: boolean;
  currentBid: any;
  previousBid?: { quantity: number; faceValue: number; playerId: string } | null;
}

const LocalPlayer: React.FC<LocalPlayerProps> = ({ player, isMyTurn, isDealer, onAction, disabled, currentBid, previousBid }) => {
  // Use real dice values from the backend
  const diceValues = player.dice || [];

  const handleBidSelect = (quantity: number, faceValue: number) => {
    onAction('bid', { quantity, faceValue });
  };

  const handleDoubt = () => {
    onAction('doubt');
  };

  const handleSpotOn = () => {
    onAction('spotOn');
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
      {/* Player Container */}
      <div className={`bg-green-800 p-6 rounded-2xl shadow-2xl border-4 ${isMyTurn ? 'border-yellow-400' : 'border-green-600'} ${player.eliminated ? 'opacity-50' : ''}`}>
        {/* Username */}
        <div className="text-center mb-4">
          <span className="font-bold text-xl text-white">{player.name}</span>
          {isMyTurn && <span className="ml-2 text-yellow-300 text-lg">🪙</span>}
        </div>

        {/* Dealer Button */}
        {isDealer && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-white border-2 border-black rounded-full">
              <span className="text-black text-sm font-bold">D</span>
            </div>
          </div>
        )}

        {/* Dice Row */}
        <div className="flex justify-center mb-4">
          <DiceHand diceValues={diceValues} />
        </div>

        {/* Cup Placeholder */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 bg-amber-600 rounded-full border-3 border-amber-800 flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold">C</span>
          </div>
        </div>

        {/* Win Tokens */}
        {player.winTokens > 0 && (
          <div className="text-center text-yellow-300 font-bold text-sm mb-2">
            🏆 {player.winTokens} wins
          </div>
        )}

        {/* Previous Bid Display */}
        {previousBid && previousBid.playerId === player.id && (
          <div className="text-center text-blue-300 font-bold text-sm mb-2">
            Previous Bid: {previousBid.quantity} of {previousBid.faceValue}s
          </div>
        )}

        {/* Action Controls - Only show if it's your turn and not eliminated */}
        {isMyTurn && !player.eliminated && (
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex space-x-3 justify-center">
              <button
                onClick={handleDoubt}
                disabled={disabled || !currentBid}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-500 font-bold shadow-lg text-lg"
              >
                Doubt
              </button>
              <button
                onClick={handleSpotOn}
                disabled={disabled || !currentBid}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-500 font-bold shadow-lg text-lg"
              >
                Spot On
              </button>
            </div>
          </div>
        )}

        {/* Eliminated State */}
        {player.eliminated && (
          <div className="text-center text-red-300 font-bold text-xl bg-red-900 rounded-lg p-3">
            ELIMINATED
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalPlayer;