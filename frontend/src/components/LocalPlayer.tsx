import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
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
  const [isDiceVisible, setIsDiceVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use previous round dice if showing reveal, otherwise current dice
  const diceValues = (showDice && previousRoundPlayer) ? previousRoundPlayer.dice : (player.dice || []);
  
  // When showDice is true (end of round reveal), always show dice regardless of toggle
  const shouldShowDice = showDice || isDiceVisible;
  
  // Handle toggle click
  const handleToggleDiceVisibility = () => {
    console.log('=== Eye Toggle Clicked ===');
    console.log('Current isDiceVisible:', isDiceVisible);
    console.log('showDice prop:', showDice);
    const newValue = !isDiceVisible;
    console.log('Setting isDiceVisible to:', newValue);
    setIsDiceVisible(newValue);
  };

  // Eye icon components - with logging
  const EyeOpenIcon = () => {
    console.log('Rendering EyeOpenIcon');
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    );
  };

  const EyeClosedIcon = () => {
    console.log('Rendering EyeClosedIcon');
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    );
  };

  useEffect(() => {
    console.log('LocalPlayer rendering:', {
      playerName: player.name,
      playerColor: player.color,
      playerId: player.id
    });
  }, [player.name, player.color, player.id]);

  // Debug: Log when isDiceVisible changes
  useEffect(() => {
    console.log('isDiceVisible state changed to:', isDiceVisible);
    console.log('shouldShowDice is now:', shouldShowDice);
  }, [isDiceVisible, shouldShowDice]);

  // Map backend color to Tailwind class
  const colorClassMap: Record<string, string> = {
    blue: 'bg-blue-700 border-blue-400',
    red: 'bg-red-700 border-red-400',
    green: 'bg-green-700 border-green-400',
    yellow: 'bg-yellow-600 border-yellow-400',
    brown: 'bg-amber-900 border-amber-900', // more distinct brown
    cyan: 'bg-cyan-600 border-cyan-400',
  };
  const playerColor = player.color || 'blue';
  const playerColorClass = colorClassMap[playerColor] || colorClassMap['blue'];

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
      <div
        className={`w-full ${getPlayerColor(
          0,
          "bg"
        )} p-3 shadow-2xl border-t-4 select-none ${
          isMyTurn ? "border-green-300" : getPlayerColor(0, "border")
        } ${player.eliminated ? "opacity-70" : ""}`}
      >
        {/* Mobile Layout - Horizontal */}
        <div className="flex items-center justify-between">
          {/* Left side - Player info with eye toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-2">
                <div className="font-bold text-lg text-white">
                  {player.name}
                </div>
                {/* Eye toggle button - next to name */}
                {!showDice && (
                  <button
                    type="button"
                    onTouchStart={(e) => {
                      console.log("MOBILE BUTTON TOUCH START!", e);
                      console.log(
                        "isDiceVisible before toggle:",
                        isDiceVisible
                      );
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleDiceVisibility();
                    }}
                    onClick={(e) => {
                      console.log("MOBILE BUTTON CLICKED!", e);
                      console.log(
                        "isDiceVisible before toggle:",
                        isDiceVisible
                      );
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleDiceVisibility();
                    }}
                    className="p-2 rounded-md bg-transparent hover:bg-white/10 active:bg-white/20 transition-all text-white flex-shrink-0 cursor-pointer z-50 relative touch-manipulation"
                    style={{
                      touchAction: "manipulation",
                      pointerEvents: "auto",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    aria-label={isDiceVisible ? "Hide dice" : "Show dice"}
                  >
                    <div className="pointer-events-none">
                      {isDiceVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </div>
                  </button>
                )}
              </div>
              {/* Dealer Button and Win Tokens row */}
              <div className="flex items-center space-x-2 mt-1">
                {isDealer && (
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-400">
                    <span className="text-black font-bold text-xs">D</span>
                  </div>
                )}
                {player.winTokens > 0 && (
                  <div className="text-yellow-300 font-bold text-sm">
                    🏆 {player.winTokens}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center - Dice (horizontal) */}
          <div className="flex items-center justify-center flex-1 min-w-0 px-2">
            {shouldShowDice ? (
              <DiceHandSVG diceValues={diceValues} size="md" />
            ) : (
              <div className="text-gray-400 text-sm italic">
                {t("game.diceHidden") || "Hidden"}
              </div>
            )}
          </div>

          {/* Right side - Status */}
          <div className="text-right flex-shrink-0">
            {player.eliminated && (
              <div className="text-red-300 font-bold text-sm">
                {t("game.eliminated")}
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
        left: position.x || "50%",
        top: position.y || "auto",
        bottom: position.y ? "auto" : "1rem",
        transform: position.x ? "none" : "translateX(-50%)",
        cursor: isDragging ? "grabbing" : "grab",
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
        className={`${playerColorClass} p-6 rounded-3xl shadow-2xl border-4 select-none transition-all duration-300 ${
          isFlashing
            ? "border-yellow-400 animate-pulse"
            : isMyTurn
            ? "border-green-300"
            : playerColorClass.split(" ")[1]
        } ${player.eliminated ? "opacity-50" : ""}`}
      >
        {/* Username with Dealer Button, Win Tokens, and Eye Toggle */}
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
            {/* Eye toggle button - next to name */}
            {!showDice && (
              <button
                type="button"
                onClick={(e) => {
                  console.log("DESKTOP BUTTON CLICKED!", e);
                  console.log("isDiceVisible before toggle:", isDiceVisible);
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleDiceVisibility();
                }}
                onMouseDown={(e) => {
                  console.log("DESKTOP BUTTON MOUSE DOWN!", e);
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-1.5 rounded-md bg-transparent hover:bg-white/10 active:bg-white/20 transition-all text-white cursor-pointer z-50 relative"
                style={{ pointerEvents: "auto" }}
                aria-label={isDiceVisible ? "Hide dice" : "Show dice"}
              >
                {isDiceVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            )}
          </div>
        </div>

        {/* Dice Row - Fixed height container */}
        <div className="mb-4 min-h-[80px] flex items-center justify-center">
          {shouldShowDice ? (
            <DiceHandSVG diceValues={diceValues} size="lg" />
          ) : (
            <div className="text-gray-300 text-lg italic">
              {t("game.diceHidden") || "Hidden"}
            </div>
          )}
        </div>

        {/* Previous Bid Display - Only show when relevant to current game state */}
        {previousBid &&
          previousBid.playerId === player.id &&
          !player.eliminated && (
            <div className="text-center text-amber-200 font-bold text-sm mb-2">
              {t("game.previousBid", {
                quantity: previousBid.quantity,
                faceValue: previousBid.faceValue,
              })}
            </div>
          )}

        {/* Eliminated State */}
        {player.eliminated && (
          <div className="text-center text-red-300 font-bold text-xl bg-red-900 rounded-lg p-3">
            {t("game.eliminated")}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalPlayer;