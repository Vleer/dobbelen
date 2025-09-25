import React from 'react';
import { Game } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';

interface GameResultDisplayProps {
  game: Game;
}

const GameResultDisplay: React.FC<GameResultDisplayProps> = ({ game }) => {
  const { t } = useLanguage();
  
  console.log('GameResultDisplay render:', {
    showAllDice: game.showAllDice,
    lastActualCount: game.lastActualCount,
    lastBidQuantity: game.lastBidQuantity,
    lastEliminatedPlayerId: game.lastEliminatedPlayerId,
    winner: game.winner,
    previousBid: game.previousBid
  });

  if (!game.showAllDice) {
    return null;
  }

  const getResultMessage = () => {
    if (game.lastActualCount !== undefined && game.lastBidQuantity !== undefined && game.lastBidFaceValue !== undefined) {
      // Use the stored face value from the last doubt/spot-on
      const faceValue = game.lastBidFaceValue;
      if (game.lastActualCount >= game.lastBidQuantity) {
        return t('game.result.thereWere', { actualCount: game.lastActualCount, faceValue }) + ' ' + t('game.result.bidWasCorrect');
      } else {
        return t('game.result.thereWereOnly', { actualCount: game.lastActualCount, faceValue }) + ' ' + t('game.result.bidWasWrong');
      }
    }
    return '';
  };

  const getWinnerMessage = () => {
    if (game.winner) {
      const winner = game.players.find(p => p.id === game.winner);
      return winner ? t('game.result.winsRound', { playerName: winner.name }) : t('game.result.roundEnded');
    }
    return '';
  };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="bg-amber-900 border-4 border-amber-700 rounded-3xl p-8 shadow-2xl text-center min-w-96 select-none">
        {/* Result Status */}
        <div className="text-2xl font-bold text-amber-200 mb-4">
          {getResultMessage()}
        </div>
        
        {/* Winner Message */}
        {getWinnerMessage() && (
          <div className="text-3xl font-bold text-green-300 mb-4">
            {getWinnerMessage()}
          </div>
        )}
        
        {/* Eliminated Player */}
        {game.lastEliminatedPlayerId && (
          <div className="text-xl font-bold text-red-300">
            {t('game.result.isEliminated', { playerName: game.players.find(p => p.id === game.lastEliminatedPlayerId)?.name || 'Unknown Player' })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameResultDisplay;
