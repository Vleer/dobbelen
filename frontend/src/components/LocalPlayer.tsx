import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import DiceHand from './DiceHand';
import DiceHandSVG from './DiceHandSVG';
import { getPlayerColor } from '../utils/playerColors';

interface LocalPlayerProps {
  player: Player;
  isMyTurn: boolean;
  isDealer: boolean;
  onAction: (action: string, data?: any) => void;
  disabled: boolean;
  currentBid: any;
  previousBid?: { quantity: number; faceValue: number; playerId: string } | null;
  showDice?: boolean; // Show dice when revealed at end of round
  previousRoundPlayer?: Player; // Player from previous round for dice display
  isMobile?: boolean; // Mobile layout flag
}

const LocalPlayer: React.FC<LocalPlayerProps> = ({ player, isMyTurn, isDealer, onAction, disabled, currentBid, previousBid, showDice = false, previousRoundPlayer, isMobile = false }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('localPlayerPosition');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isFlashing, setIsFlashing] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [flashTimer, setFlashTimer] = useState<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use previous round dice if showing reveal, otherwise current dice
  const diceValues = (showDice && previousRoundPlayer) ? previousRoundPlayer.dice : (player.dice || []);

  // Inactivity tracking and flashing
  const startInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    const timer = setTimeout(() => {
      // Start flashing after 10 seconds of inactivity
      setIsFlashing(true);
      
      // Flash for 1 second
      const flashTimer = setTimeout(() => {
        setIsFlashing(false);
        // Restart the cycle
        startInactivityTimer();
      }, 1000);
      
      setFlashTimer(flashTimer);
    }, 10000);
    
    setInactivityTimer(timer);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    if (flashTimer) {
      clearTimeout(flashTimer);
    }
    setIsFlashing(false);
    startInactivityTimer();
  };

  // Start inactivity timer when component mounts or when it's the player's turn
  useEffect(() => {
    if (isMyTurn && !disabled) {
      startInactivityTimer();
    } else {
      // Clear timers when it's not the player's turn or when disabled
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      if (flashTimer) {
        clearTimeout(flashTimer);
      }
      setIsFlashing(false);
    }

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      if (flashTimer) {
        clearTimeout(flashTimer);
      }
    };
  }, [isMyTurn, disabled]);

  // Global activity listener to reset timer on any user interaction
  useEffect(() => {
    const handleGlobalActivity = () => {
      if (isMyTurn && !disabled) {
        resetInactivityTimer();
      }
    };

    if (isMyTurn && !disabled) {
      document.addEventListener('mousedown', handleGlobalActivity);
      document.addEventListener('keydown', handleGlobalActivity);
      document.addEventListener('touchstart', handleGlobalActivity);
    }

    return () => {
      document.removeEventListener('mousedown', handleGlobalActivity);
      document.removeEventListener('keydown', handleGlobalActivity);
      document.removeEventListener('touchstart', handleGlobalActivity);
    };
  }, [isMyTurn, disabled]);

  // Drag functionality (desktop only)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isMobile) { // Left mouse button, desktop only
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      setPosition(newPosition);
      localStorage.setItem('localPlayerPosition', JSON.stringify(newPosition));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset inactivity timer on any interaction
    if (isMyTurn && !disabled) {
      resetInactivityTimer();
    }
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

  if (isMobile) {
    return (
      <div className={`w-full ${getPlayerColor(0, 'bg')} p-3 shadow-2xl border-t-4 select-none ${isMyTurn ? 'border-green-300' : getPlayerColor(0, 'border')}`}>
        {/* Mobile Layout - Horizontal */}
        <div className="flex items-center justify-between">
          {/* Left side - Player info */}
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className="font-bold text-lg text-white">{player.name}</div>
              {/* Dealer Button */}
              {isDealer && (
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-400 mt-1">
                  <span className="text-black font-bold text-xs">D</span>
                </div>
              )}
              {/* Win Tokens */}
              {player.winTokens > 0 && (
                <div className="text-yellow-300 font-bold text-sm">
                  🏆 {player.winTokens}
                </div>
              )}
            </div>
          </div>

          {/* Center - Dice (horizontal) */}
          <div className="flex items-center space-x-1">
            <DiceHandSVG diceValues={diceValues} size="md" />
          </div>

          {/* Right side - Status */}
          <div className="text-right">
            {player.eliminated && (
              <div className="text-red-300 font-bold text-sm">
                {t('game.eliminated')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="absolute"
      style={{
        left: position.x || '50%',
        top: position.y || 'auto',
        bottom: position.y ? 'auto' : '1rem',
        transform: position.x ? 'none' : 'translateX(-50%)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Player Container */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onClick={() => {
          // Reset inactivity timer on click
          if (isMyTurn && !disabled) {
            resetInactivityTimer();
          }
        }}
        className={`${getPlayerColor(0, 'bg')} p-6 rounded-3xl shadow-2xl border-4 select-none transition-all duration-300 ${
          isFlashing 
            ? 'border-yellow-400 animate-pulse' 
            : isMyTurn 
              ? 'border-green-300' 
              : getPlayerColor(0, 'border')
        } ${player.eliminated ? 'opacity-50' : ''}`}
      >
        {/* Username with Dealer Button and Win Tokens */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center space-x-2">
            <span className="font-bold text-xl text-white">{player.name}</span>
            {/* Dealer Button */}
            {isDealer && (
              <div className="inline-flex items-center justify-center w-6 h-6 bg-white border-2 border-black rounded-full">
                <span className="text-black text-xs font-bold">D</span>
              </div>
            )}
            {/* Win Tokens */}
            {player.winTokens > 0 && (
              <div className="text-yellow-300 font-bold text-sm">
                🏆 {player.winTokens}
              </div>
            )}
          </div>
        </div>

        {/* Dice Row - Always show dice for local player */}
        <div className="flex justify-center mb-4">
          <DiceHandSVG diceValues={diceValues} size="lg" />
        </div>

        {/* Previous Bid Display - Only show when relevant to current game state */}
        {previousBid && previousBid.playerId === player.id && !player.eliminated && (
          <div className="text-center text-amber-200 font-bold text-sm mb-2">
            {t('game.previousBid', { quantity: previousBid.quantity, faceValue: previousBid.faceValue })}
          </div>
        )}

        {/* Eliminated State */}
        {player.eliminated && (
          <div className="text-center text-red-300 font-bold text-xl bg-red-900 rounded-lg p-3">
            {t('game.eliminated')}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalPlayer;