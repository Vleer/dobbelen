import React, { useState, useEffect, useRef } from 'react';
import { Game } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import { webSocketService } from '../services/websocketService';
import { aiService } from '../services/aiService';
import DiceAnalysisChart from './DiceAnalysisChart';

interface GameResultDisplayProps {
  game: Game;
  currentPlayerId?: string;
}

const GameResultDisplay: React.FC<GameResultDisplayProps> = ({ game, currentPlayerId }) => {
  const { t } = useLanguage();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [analysisTimer, setAnalysisTimer] = useState<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load analysis preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('diceAnalysisPreference');
    if (savedPreference === 'true') {
      setShowAnalysis(true);
    }
  }, []);

  // Auto-show analysis when game result is displayed
  useEffect(() => {
    if (game.showAllDice) {
      setShowAnalysis(true);
      
      // Clear any existing timer
      if (analysisTimer) {
        clearTimeout(analysisTimer);
      }
      
      // Set timer to hide analysis after 15 seconds
      const timer = setTimeout(() => {
        setShowAnalysis(false);
      }, 15000);
      
      setAnalysisTimer(timer);
      
      // Cleanup timer on unmount or when game.showAllDice changes
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [game.showAllDice]);

  // Clear analysis timer when continue is pressed
  useEffect(() => {
    if (isContinuing && analysisTimer) {
      clearTimeout(analysisTimer);
      setAnalysisTimer(null);
    }
  }, [isContinuing, analysisTimer]);

  // Handle spacebar press to continue
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && game.showAllDice && game.canContinue && !(currentPlayerId ? aiService.isAIPlayer(currentPlayerId) : false)) {
        e.preventDefault();
        handleContinue();
      }
    };

    if (game.showAllDice) {
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [game.showAllDice, game.canContinue, currentPlayerId]);

  // Save analysis preference to localStorage
  const toggleAnalysis = () => {
    const newShowAnalysis = !showAnalysis;
    setShowAnalysis(newShowAnalysis);
    localStorage.setItem('diceAnalysisPreference', newShowAnalysis.toString());
  };

  const handleContinue = () => {
    setIsContinuing(true);
    webSocketService.sendAction('CONTINUE', {}, '');
    
    // Reset the continuing state after 1 second
    setTimeout(() => {
      setIsContinuing(false);
    }, 1000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (containerRef.current && containerRef.current.contains(e.target as Node))) {
      setIsDragging(true);
      const rect = containerRef.current!.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);
  
  console.log('GameResultDisplay render:', {
    showAllDice: game.showAllDice,
    lastActualCount: game.lastActualCount,
    lastBidQuantity: game.lastBidQuantity,
    lastEliminatedPlayerId: game.lastEliminatedPlayerId,
    winner: game.winner,
    previousBid: game.previousBid
  });

  if (!game.showAllDice) {
    console.log('🟠 ORANGE_WINDOW: Not rendering GameResultDisplay - showAllDice is false at', new Date().toISOString());
    return null;
  }

  console.log('🟠 ORANGE_WINDOW: Rendering GameResultDisplay - showAllDice is true at', new Date().toISOString());

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
    <div 
      className="absolute z-50"
      style={{
        left: position.x || '50%',
        top: position.y || '50%',
        transform: position.x ? 'none' : 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="bg-amber-900 border-4 border-amber-700 rounded-3xl p-8 shadow-2xl text-center min-w-96 select-none"
      >
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
          <div className="text-xl font-bold text-red-300 mb-4">
            {t('game.result.isEliminated', { playerName: game.players.find(p => p.id === game.lastEliminatedPlayerId)?.name || 'Unknown Player' })}
          </div>
        )}

        {/* Analysis Section */}
        {showAnalysis && (
          <DiceAnalysisChart game={game} />
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-6">
          {/* Analysis Toggle Button */}
          <button
            onClick={toggleAnalysis}
            className="px-6 py-3 bg-amber-700 hover:bg-amber-600 text-amber-200 font-bold rounded-xl transition-colors duration-200 border-2 border-amber-600"
          >
            {showAnalysis ? t('game.analysis.hide') : t('game.analysis.show')}
          </button>
          
          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={isContinuing || !game.canContinue || (currentPlayerId ? aiService.isAIPlayer(currentPlayerId) : false)}
            className={`px-6 py-3 font-bold rounded-xl transition-all duration-200 border-2 ${
              isContinuing || !game.canContinue || (currentPlayerId ? aiService.isAIPlayer(currentPlayerId) : false)
                ? 'bg-amber-800 text-amber-400 border-amber-600 cursor-not-allowed'
                : 'bg-amber-900 hover:bg-amber-800 text-amber-200 border-amber-700 hover:border-amber-600'
            }`}
           >
             {isContinuing ? t('game.continuing') : `${t('game.continue')} (Space)`}
           </button>
        </div>
      </div>
    </div>
  );
};

export default GameResultDisplay;
