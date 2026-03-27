import React, { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "../types/game";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import DiceSVG from "./DiceSVG";

interface OpponentPlayerProps {
  player: Player;
  position: number; // 0 = left, 1 = right, 2 = across, etc.
  isMyTurn: boolean;
  isDealer: boolean;
  showDice?: boolean; // Show dice when revealed at end of round
  previousBid?: {
    quantity: number;
    faceValue: number;
    playerId: string;
  } | null;
  previousRoundPlayer?: Player; // Player from previous round for dice display
  isMobile?: boolean; // Mobile layout flag
  playerIndex?: number; // Index for color coding
  isRoundEnded?: boolean; // Round has ended – suppress turn-indicator animations
  isRoundLoser?: boolean; // This player lost a die this round – flash red briefly
  isRoundWinner?: boolean; // This player won this round – glow green
}

const OpponentPlayer: React.FC<OpponentPlayerProps> = ({
  player,
  position,
  isMyTurn,
  isDealer,
  showDice = false,
  previousBid,
  previousRoundPlayer,
  isMobile = false,
  playerIndex = 0,
  isRoundEnded = false,
  isRoundLoser = false,
  isRoundWinner = false,
}) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();

  useEffect(() => {
    console.log("OpponentPlayer color:", player.color);
  }, [player.color]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showTurnAnim, setShowTurnAnim] = useState(false);
  const [showDiceAnim, setShowDiceAnim] = useState(false);
  const [showElimAnim, setShowElimAnim] = useState(false);
  const [showLoserAnim, setShowLoserAnim] = useState(false);
  const prevIsMyTurnRef = useRef(isMyTurn);
  const prevShowDiceRef = useRef(showDice);
  const prevEliminatedRef = useRef(player.eliminated);
  const prevIsRoundLoserRef = useRef(false);
  const getDefaultPosition = () => {
    const topMargin = 96;
    const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 640;
    const leftX = Math.max(24, centerX - 320);
    const rightX = centerX + 160;
    const presets = [
      { x: leftX, y: topMargin },       // top-left
      { x: centerX - 88, y: topMargin },// top-center
      { x: rightX, y: topMargin },      // top-right
    ];
    return presets[position] || { x: leftX + position * 180, y: topMargin + 8 };
  };

  const [dragPosition, setDragPosition] = useState(() => {
    const saved = localStorage.getItem(`opponentPlayerPosition_${player.id}`);
    return saved ? JSON.parse(saved) : getDefaultPosition();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("OpponentPlayer rendering:", {
      playerName: player.name,
      playerColor: player.color,
      playerId: player.id,
      playerIndex,
    });
  }, [player.name, player.color, player.id, playerIndex]);

  // Animate when it becomes this opponent's turn
  useEffect(() => {
    if (animationsEnabled && isMyTurn && !prevIsMyTurnRef.current) {
      setShowTurnAnim(true);
      const timer = setTimeout(() => setShowTurnAnim(false), 600);
      return () => clearTimeout(timer);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, animationsEnabled]);

  // Animate dice when they become visible (round reveal)
  useEffect(() => {
    if (animationsEnabled && showDice && !prevShowDiceRef.current) {
      setShowDiceAnim(true);
      const timer = setTimeout(() => setShowDiceAnim(false), 800);
      return () => clearTimeout(timer);
    }
    prevShowDiceRef.current = showDice;
  }, [showDice, animationsEnabled]);

  // Animate when this opponent gets eliminated
  useEffect(() => {
    if (animationsEnabled && player.eliminated && !prevEliminatedRef.current) {
      setShowElimAnim(true);
      const timer = setTimeout(() => setShowElimAnim(false), 700);
      return () => clearTimeout(timer);
    }
    prevEliminatedRef.current = player.eliminated;
  }, [player.eliminated, animationsEnabled]);

  // Flash red briefly when this player is the round loser (lost a die this round)
  useEffect(() => {
    if (animationsEnabled && isRoundLoser && !prevIsRoundLoserRef.current) {
      setShowLoserAnim(true);
      const timer = setTimeout(() => setShowLoserAnim(false), 700);
      return () => clearTimeout(timer);
    }
    prevIsRoundLoserRef.current = isRoundLoser;
  }, [isRoundLoser, animationsEnabled]);

  const playerTextClass = "text-amber-200";

  // Computed state flags
  const activeTurn = isMyTurn && !isRoundEnded;

  // Computed animation classes (shared between mobile and desktop)
  const animClasses = [
    showTurnAnim && animationsEnabled ? 'animate-turn-start' : '',
    activeTurn && animationsEnabled ? 'animate-turn-glow' : '',
    (showElimAnim || showLoserAnim) && animationsEnabled ? 'animate-elim-flash' : '',
    isRoundWinner && animationsEnabled ? 'animate-pulse-green' : '',
  ].filter(Boolean).join(' ');

  // Debug logging
  console.log(`OpponentPlayer ${player.name}:`, {
    showDice,
    hasDice: player.dice && player.dice.length > 0,
    diceValues: player.dice,
    previousRoundPlayer: previousRoundPlayer
      ? {
          id: previousRoundPlayer.id,
          name: previousRoundPlayer.name,
          hasDice:
            previousRoundPlayer.dice && previousRoundPlayer.dice.length > 0,
          diceValues: previousRoundPlayer.dice,
        }
      : null,
  });

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isMobile) {
      // Left mouse button, desktop only
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };
        setDragPosition(newPosition);
        localStorage.setItem(
          `opponentPlayerPosition_${player.id}`,
          JSON.stringify(newPosition)
        );
      }
    },
    [isDragging, dragOffset.x, dragOffset.y, player.id]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const getPositionClasses = () => {
    if (isMobile) {
      // Mobile: sidebars on left and right
      switch (position) {
        case 0: // Left sidebar
          return "absolute left-0 top-1/2 transform -translate-y-1/2";
        case 1: // Right sidebar
          return "absolute right-0 top-1/2 transform -translate-y-1/2";
        case 2: // Top (if more than 2 players)
          return "absolute top-1/4 left-1/2 transform -translate-x-1/2";
        default:
          return "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2";
      }
    } else {
      // Desktop: draggable
      return "absolute";
    }
  };

  const revealedDice = previousRoundPlayer?.dice || [];

  if (isMobile) {
    return (
      <div className="relative mb-6" data-player-card={player.id}>
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="below"
          className="absolute left-1/2 bottom-0 w-0 h-0"
        />
        <div
          className={`bg-[#0b2415] rounded-xl shadow-lg select-none transition-all duration-300 ${
            activeTurn ? 'border-[3px] border-[#f2c96d]' : isRoundWinner ? 'border-[3px] border-[#d9b45a]' : 'border-2 border-[#365844]'
          } ${player.eliminated ? "opacity-50" : ""} p-2 min-w-0 flex-shrink-0 h-[82px] w-full ${animClasses}`}
        >
          <div className="h-full w-full flex flex-col justify-between gap-1">
            <div className="flex items-center justify-center gap-1 min-w-0">
              {/* Turn arrow indicator - mobile */}
              {isMyTurn && (
                <span className="text-[#f2c96d] font-bold text-[10px] flex-shrink-0">▶</span>
              )}
              <span className={`font-bold text-[11px] truncate ${playerTextClass}`}>{player.name}</span>
              {player.winTokens > 0 && (
                <span className="text-[#e7be5c] font-bold text-[10px]">🏆 {player.winTokens}</span>
              )}
            </div>
            <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
              {showDice && revealedDice.length > 0 ? (
                <div className="flex items-center gap-0.5 flex-nowrap">
                  {revealedDice.slice(0, 6).map((value, index) => (
                    <div
                      key={index}
                      className={showDiceAnim && animationsEnabled ? 'animate-dice-land' : ''}
                      style={{ animationDelay: showDiceAnim && animationsEnabled ? `${index * 55}ms` : '0ms' }}
                    >
                      <DiceSVG value={value} size="xs" />
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[#b9cbbf] text-[10px] font-medium">{t("game.diceHidden") || "Hidden"}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={getPositionClasses()}
      style={
        !isMobile
          ? {
              left: dragPosition.x,
              top: dragPosition.y,
              cursor: isDragging ? "grabbing" : "grab",
              zIndex: isDragging ? 1000 : 60,
            }
          : {}
      }
    >
      <div className="relative pb-6" data-player-card={player.id}>
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="below"
          className="absolute left-1/2 bottom-0 w-0 h-0"
        />
        {/* Player Container - Rounded Rectangle with Green Background */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className={`w-72 h-[136px] bg-[#0b2415] rounded-2xl shadow-lg select-none transition-all duration-300 ${
            activeTurn ? 'border-[6px] border-[#f2c96d]' : isRoundWinner ? 'border-[6px] border-[#d9b45a]' : 'border-4 border-[#365844]'
          } ${
            player.eliminated ? "opacity-50" : ""
          } ${animClasses} flex flex-col items-center justify-between p-3`}
        >
          <div className="w-full h-full flex flex-col items-center justify-between">
          {/* Username with Dealer Button and Win Tokens */}
          <div className="text-center mb-1 min-h-8 flex items-center justify-center">
            <div className="flex items-center justify-center space-x-1">
              <span className={`font-bold text-sm ${playerTextClass} break-words`}>
                {player.name}
              </span>
              {/* Win Tokens */}
              {player.winTokens > 0 && (
                <div className="text-xs text-[#e7be5c] font-bold">
                  🏆 {player.winTokens}
                </div>
              )}
            </div>
          </div>

          <div className="w-full flex-1 flex items-center justify-center px-1 overflow-hidden">
            {showDice && revealedDice.length > 0 ? (
              <div className="flex items-center gap-1 flex-nowrap">
                {revealedDice.slice(0, 6).map((value, index) => (
                  <div
                    key={index}
                    className={showDiceAnim && animationsEnabled ? 'animate-dice-land' : ''}
                    style={{ animationDelay: showDiceAnim && animationsEnabled ? `${index * 55}ms` : '0ms' }}
                  >
                    <DiceSVG value={value} size="xs" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#b9cbbf] text-sm font-medium">
                {t("game.diceHidden") || "Hidden"}
              </div>
            )}
          </div>

          {/* Previous Bid Display - Only show when relevant to current game state */}
          {previousBid &&
            previousBid.playerId === player.id &&
            !player.eliminated && (
              <div className="text-center text-xs text-[#f5d98f] font-bold mb-1 break-words">
                {t("game.previousBid", {
                  quantity: previousBid.quantity,
                  faceValue: previousBid.faceValue,
                })}
              </div>
            )}

        </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentPlayer;
