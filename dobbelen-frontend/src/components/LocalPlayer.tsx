import React, { useState } from 'react';
import { Player } from '../types/game';
import DiceHand from './DiceHand';

interface LocalPlayerProps {
  player: Player;
  isMyTurn: boolean;
  onAction: (action: string, data?: any) => void;
  disabled: boolean;
}

const LocalPlayer: React.FC<LocalPlayerProps> = ({ player, isMyTurn, onAction, disabled }) => {
  const [bidQuantity, setBidQuantity] = useState(1);
  const [bidFaceValue, setBidFaceValue] = useState(1);

  // Generate mock dice for local player (in real game, this would come from server)
  const mockDice = Array.from({ length: player.diceCount }, () => Math.floor(Math.random() * 6) + 1);

  const handleBid = () => {
    onAction('bid', { quantity: bidQuantity, faceValue: bidFaceValue });
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
      <div className={`bg-white p-4 rounded-lg shadow-lg border-2 ${isMyTurn ? 'border-yellow-400' : 'border-gray-300'}`}>
        {/* Username */}
        <div className="text-center mb-2">
          <span className="font-bold text-lg">{player.name}</span>
          {isMyTurn && <span className="ml-2 text-yellow-600">(Your Turn)</span>}
        </div>

        {/* Dice Row */}
        <div className="flex justify-center mb-2">
          <DiceHand diceValues={mockDice} />
        </div>

        {/* Cup Placeholder */}
        <div className="flex justify-center mb-2">
          <div className="w-8 h-8 bg-amber-600 rounded-full border-2 border-amber-800 flex items-center justify-center">
            <span className="text-white text-xs">C</span>
          </div>
        </div>

        {/* Action Controls - Only show if it's your turn and not eliminated */}
        {isMyTurn && !player.eliminated && (
          <div className="space-y-2">
            {/* Bid Controls */}
            <div className="flex items-center space-x-2">
              <label className="text-sm">Bid:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={bidQuantity}
                onChange={(e) => setBidQuantity(parseInt(e.target.value) || 1)}
                className="w-16 p-1 border rounded text-center"
                disabled={disabled}
              />
              <select
                value={bidFaceValue}
                onChange={(e) => setBidFaceValue(parseInt(e.target.value))}
                className="p-1 border rounded"
                disabled={disabled}
              >
                <option value={1}>Ones</option>
                <option value={2}>Twos</option>
                <option value={3}>Threes</option>
                <option value={4}>Fours</option>
                <option value={5}>Fives</option>
                <option value={6}>Sixes</option>
              </select>
              <button
                onClick={handleBid}
                disabled={disabled}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Raise
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleDoubt}
                disabled={disabled}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
              >
                Doubt
              </button>
              <button
                onClick={handleSpotOn}
                disabled={disabled}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                Spot On
              </button>
            </div>
          </div>
        )}

        {/* Eliminated State */}
        {player.eliminated && (
          <div className="text-center text-red-600 font-bold">
            ELIMINATED
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalPlayer;
