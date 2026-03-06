import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import AnimatedDiceHandSVG from './AnimatedDiceHandSVG';

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
  const { animationsEnabled } = useSettings();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('localPlayerPosition');
    return saved ? JSON.parse(saved) : { x: 16, y: 0 }; // default: bottom-left
  });
  const [isDiceVisible, setIsDiceVisible] = useState(true);
  const [showTurnAnim, setShowTurnAnim] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchHandledRef = useRef(false);
  const prevIsMyTurnRef = useRef(isMyTurn);
  
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

  // Animate the container when it becomes the local player's turn
  useEffect(() => {
    if (animationsEnabled && isMyTurn && !prevIsMyTurnRef.current) {
      setShowTurnAnim(true);
      const timer = setTimeout(() => setShowTurnAnim(false), 600);
      return () => clearTimeout(timer);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, animationsEnabled]);

  // Map backend color to border and text colors - darker, classy jewel tones for poker table
  const colorBorderMap: Record<string, string> = {
    blue: 'border-indigo-500',
    red: 'border-rose-500',
    green: 'border-emerald-500',
    yellow: 'border-amber-500',
    brown: 'border-amber-600', // rich cognac brown
    cyan: 'border-cyan-500',
    purple: 'border-purple-500',
    pink: 'border-pink-500',
  };
  
  const colorTextMap: Record<string, string> = {
    blue: 'text-indigo-500',
    red: 'text-rose-500',
    green: 'text-emerald-500',
    yellow: 'text-amber-500',
    brown: 'text-amber-600', // rich cognac brown
    cyan: 'text-cyan-500',
    purple: 'text-purple-500',
    pink: 'text-pink-500',
  };
  
  const playerColor = player.color || 'blue';
  const playerColorClass = colorBorderMap[playerColor] || colorBorderMap['blue'];
  const playerTextClass = colorTextMap[playerColor] || colorTextMap['blue'];

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset]);

  if (isMobile) {
    return (
      <div
        className={`w-full bg-green-950 p-2 shadow-2xl select-none transition-all duration-300 ${
          isMyTurn ? "border-t-[6px] border-green-300" : `border-t-4 ${playerColorClass}`
        } ${player.eliminated ? "opacity-70" : ""} ${showTurnAnim && animationsEnabled ? 'animate-turn-start' : ''} ${isMyTurn && animationsEnabled ? 'animate-turn-glow' : ''}`}
      >
        {/* YOUR TURN badge - mobile */}
        {isMyTurn && !player.eliminated && (
          <div className="flex justify-center mb-1.5">
            <span className={`bg-green-400 text-green-950 font-bold text-xs px-3 py-0.5 rounded-full tracking-wide ${animationsEnabled ? 'animate-bounce-in' : ''}`}>
              🎲 {t("game.yourTurn")}
            </span>
          </div>
        )}
        {/* Mobile: one row = name + dealer + eye (same height as dice row), then dice */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
            <span className={`font-bold text-sm truncate ${playerTextClass}`}>{player.name}</span>
            {isDealer && (
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center border border-gray-400 flex-shrink-0">
                <span className="text-black font-bold text-[9px]">D</span>
              </div>
            )}
            {!showDice && (
              <button
                type="button"
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  touchHandledRef.current = true;
                  handleToggleDiceVisibility();
                  setTimeout(() => { touchHandledRef.current = false; }, 300);
                }}
                onClick={(e) => {
                  if (touchHandledRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleDiceVisibility();
                }}
                className="p-0.5 rounded bg-transparent hover:bg-white/10 active:bg-white/20 text-white flex-shrink-0 cursor-pointer z-50 relative touch-manipulation"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                aria-label={isDiceVisible ? "Hide dice" : "Show dice"}
              >
                <div className="pointer-events-none w-3 h-3 [&_svg]:w-3 [&_svg]:h-3">
                  {isDiceVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </div>
              </button>
            )}
            {player.winTokens > 0 && (
              <span className="text-yellow-300 font-bold text-[10px] flex-shrink-0">🏆 {player.winTokens}</span>
            )}
          </div>
          <div className="flex items-center flex-1 min-w-0 flex-shrink overflow-hidden">
            {shouldShowDice ? (
              <AnimatedDiceHandSVG diceValues={diceValues} size="xs" noWrap />
            ) : (
              <span className="text-gray-400 text-xs italic">{t("game.diceHidden") || "Hidden"}</span>
            )}
          </div>
          {player.eliminated && (
            <span className="text-red-300 font-bold text-xs flex-shrink-0">{t("game.eliminated")}</span>
          )}
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
        bottom: position.y ? "auto" : "2rem",
        transform: position.x ? "none" : "translateX(-50%)",
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {/* Relative wrapper for badge + card */}
      <div className="relative">
        {/* YOUR TURN badge - desktop */}
        {isMyTurn && !player.eliminated && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className={`bg-green-400 text-green-950 font-bold text-sm px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wide ${animationsEnabled ? 'animate-bounce-in' : ''}`}>
              🎲 {t("game.yourTurn")}
            </span>
          </div>
        )}
        {/* Player Container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className={`bg-green-950 p-6 rounded-3xl shadow-2xl select-none transition-all duration-300 ${
            isMyTurn ? "border-[6px] border-green-300 scale-[1.03]" : `border-4 ${playerColorClass}`
          } ${
            player.eliminated ? "opacity-50" : ""
          } ${showTurnAnim && animationsEnabled ? 'animate-turn-start' : ''} ${isMyTurn && animationsEnabled ? 'animate-turn-glow' : ''}`}
        style={{
          width: "340px", // fixed width
          minHeight: "180px", // minimum height, allow to grow if needed
          maxHeight: "95vh",
          maxWidth: "95vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          overflowY: "auto",
        }}
      >
        {/* Username with Dealer Button, Win Tokens, and Eye Toggle */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center space-x-2">
            <span className={`font-bold text-xl ${playerTextClass}`}>
              {player.name}
            </span>
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
                className="rounded-md bg-transparent hover:bg-white/10 active:bg-white/20 transition-all text-white cursor-pointer z-50 relative"
                style={{
                  pointerEvents: "auto",
                  padding: 0,
                  minWidth: 36,
                  minHeight: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={isDiceVisible ? "Hide dice" : "Show dice"}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    minWidth: 36,
                    minHeight: 36,
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isDiceVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Dice Row - Flexible height container */}
        <div
          className="mb-4 flex items-center justify-center"
          style={{ minHeight: "60px", width: "100%" }}
        >
          {shouldShowDice ? (
            <AnimatedDiceHandSVG diceValues={diceValues} size="lg" />
          ) : (
            <div
              className="text-gray-300 text-lg italic w-full text-center"
              style={{
                minHeight: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
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
    </div>
  );
};

export default LocalPlayer;