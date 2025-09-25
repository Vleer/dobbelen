import React from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import DiceHand from './DiceHand';
import DiceHandSVG from './DiceHandSVG';
import DiceSVG from './DiceSVG';

interface OpponentPlayerProps {
  player: Player;
  position: number; // 0 = left, 1 = right, 2 = across, etc.
  isMyTurn: boolean;
  isDealer: boolean;
  showDice?: boolean; // Show dice when revealed at end of round
  previousBid?: { quantity: number; faceValue: number; playerId: string } | null;
  previousRoundPlayer?: Player; // Player from previous round for dice display
  isMobile?: boolean; // Mobile layout flag
}

const OpponentPlayer: React.FC<OpponentPlayerProps> = ({ player, position, isMyTurn, isDealer, showDice = false, previousBid, previousRoundPlayer, isMobile = false }) => {
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
    if (isMobile) {
      // Mobile: sidebars on left and right
      switch (position) {
        case 0: // Left sidebar
          return 'absolute left-0 top-1/2 transform -translate-y-1/2';
        case 1: // Right sidebar
          return 'absolute right-0 top-1/2 transform -translate-y-1/2';
        case 2: // Top (if more than 2 players)
          return 'absolute top-1/4 left-1/2 transform -translate-x-1/2';
        default:
          return 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      }
    } else {
      // Desktop: original layout
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
    }
  };

  if (isMobile) {
    return (
      <div className={`bg-red-900 rounded-lg shadow-lg border-2 ${isMyTurn ? 'border-green-300' : 'border-black'} ${player.eliminated ? 'opacity-50' : ''} p-2 min-w-0 flex-shrink-0`}>
        {/* Username and Status */}
        <div className="text-center mb-1">
          <span className="font-bold text-xs text-white">{player.name}</span>
          {isMyTurn && <span className="ml-1 text-green-200 text-xs">🪙</span>}
          {isDealer && <span className="ml-1 text-white text-xs">D</span>}
        </div>

        {/* Cup or Dice */}
        <div className="flex justify-center mb-1">
          {showDice && previousRoundPlayer && previousRoundPlayer.dice && previousRoundPlayer.dice.length > 0 ? (
            <div className="flex flex-col items-center space-y-1">
              <DiceHandSVG diceValues={previousRoundPlayer.dice} size="sm" />
              <div className="text-xs text-yellow-300 font-bold">{t('game.revealed')}</div>
            </div>
          ) : (
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${player.eliminated ? 'bg-gray-400 border-gray-600' : 'bg-amber-600 border-amber-800'}`}>
              <span className="text-white text-xs">C</span>
            </div>
          )}
        </div>

        {/* Win Tokens */}
        {player.winTokens > 0 && (
          <div className="text-center text-xs text-amber-300 font-bold">
            🏆 {player.winTokens}
          </div>
        )}

        {/* Eliminated State */}
        {player.eliminated && (
          <div className="text-center text-red-300 font-bold text-xs">
            {t('game.out')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={getPositionClasses()}>
      {/* Player Container - Rounded Rectangle with Dark Red Background */}
      <div className={`w-40 h-48 bg-red-900 rounded-2xl shadow-lg border-4 ${isMyTurn ? 'border-green-300' : 'border-black'} ${player.eliminated ? 'opacity-50' : ''} ${position === 0 ? 'transform -rotate-90' : position === 1 ? 'transform rotate-90' : ''} flex flex-col items-center justify-center p-3`}>
        {/* Content with counter-rotation for text readability */}
        <div className={`${position === 0 ? 'transform rotate-90' : position === 1 ? 'transform -rotate-90' : ''} w-full h-full flex flex-col items-center justify-center`}>
          {/* Username */}
          <div className="text-center mb-2">
            <span className="font-bold text-sm text-white break-words">{player.name}</span>
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
          <div className="flex justify-center mb-2">
            {showDice && previousRoundPlayer && previousRoundPlayer.dice && previousRoundPlayer.dice.length > 0 ? (
              <div className="flex flex-col items-center space-y-1 max-w-full">
                <div className="flex justify-center max-h-8 overflow-hidden px-1 w-full">
                  <div className="flex flex-nowrap gap-0.5 justify-center">
                    {previousRoundPlayer.dice.map((value, index) => (
                      <DiceSVG key={index} value={value} size="xs" />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-yellow-300 font-bold">{t('game.revealed')}</div>
              </div>
            ) : (
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${player.eliminated ? 'bg-gray-400 border-gray-600' : 'bg-amber-600 border-amber-800'}`}>
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
              <div className="text-center text-xs text-amber-200 font-bold mb-1 break-words">
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
