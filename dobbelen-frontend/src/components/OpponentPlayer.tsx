import React from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import DiceHand from './DiceHand';

interface OpponentPlayerProps {
  player: Player;
  position: number; // 0 = left, 1 = right, 2 = across, etc.
  isMyTurn: boolean;
  isDealer: boolean;
  showDice?: boolean; // Show dice when revealed at end of round
  previousBid?: { quantity: number; faceValue: number; playerId: string } | null;
  previousRoundPlayer?: Player; // Player from previous round for dice display
}

const OpponentPlayer: React.FC<OpponentPlayerProps> = ({ player, position, isMyTurn, isDealer, showDice = false, previousBid, previousRoundPlayer }) => {
  const { t } = useLanguage();
  // Debug logging
  console.log(`OpponentPlayer ${player.name}:`, {
    showDice,
    hasDice: player.dice && player.dice.length > 0,
    diceValues: player.dice,
    previousRoundPlayer: previousRoundPlayer ? {
      id: previousRoundPlayer.id,
      name: previousRoundPlayer.name,
      hasDice: previousRoundPlayer.dice && previousRoundPlayer.dice.length > 0,
      diceValues: previousRoundPlayer.dice
    } : null
  });

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
          {/* Player Container - Big Circle with Dark Red Background */}
          <div className={`w-32 h-32 bg-red-900 rounded-full shadow-lg border-4 ${isMyTurn ? 'border-green-300' : 'border-black'} ${player.eliminated ? 'opacity-50' : ''} ${position === 0 ? 'transform -rotate-90' : position === 1 ? 'transform rotate-90' : ''} flex flex-col items-center justify-center`}>
        {/* Content with counter-rotation for text readability */}
        <div className={position === 0 ? 'transform rotate-90' : position === 1 ? 'transform -rotate-90' : ''}>
          {/* Username */}
          <div className="text-center mb-2">
            <span className="font-bold text-sm text-white">{player.name}</span>
            {isMyTurn && <span className="ml-1 text-green-200 text-sm">🪙</span>}
          </div>

          {/* Dealer Button */}
          {isDealer && (
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-5 h-5 bg-white border border-black rounded-full">
                <span className="text-black text-xs font-bold">D</span>
              </div>
            </div>
          )}

          {/* Cup - Always closed for opponents, or dice if revealed */}
          <div className="flex justify-center mb-1">
            {showDice && previousRoundPlayer && previousRoundPlayer.dice && previousRoundPlayer.dice.length > 0 ? (
              <div className="flex flex-col items-center space-y-1">
                <DiceHand diceValues={previousRoundPlayer.dice} />
                <div className="text-xs text-yellow-300 font-bold">{t('game.revealed')}</div>
              </div>
            ) : (
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${player.eliminated ? 'bg-gray-400 border-gray-600' : 'bg-amber-600 border-amber-800'}`}>
                <span className="text-white text-xs">C</span>
              </div>
            )}
          </div>

          {/* Dice Count */}
          <div className="text-center text-xs text-gray-300 mb-1">
            {player.diceCount} dice
          </div>

          {/* Win Tokens */}
          {player.winTokens > 0 && (
              <div className="text-center text-xs text-amber-300 font-bold mb-1">
              🏆 {player.winTokens}
            </div>
          )}

          {/* Previous Bid Display */}
          {previousBid && previousBid.playerId === player.id && (
              <div className="text-center text-xs text-amber-200 font-bold mb-1">
              {t('game.previousBid', { quantity: previousBid.quantity, faceValue: previousBid.faceValue })}
            </div>
          )}

          {/* Eliminated State */}
          {player.eliminated && (
            <div className="text-center text-red-300 font-bold text-xs">
              {t('game.out')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpponentPlayer;
