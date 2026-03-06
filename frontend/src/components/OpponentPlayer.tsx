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
  lastEliminatedPlayerId?: string; // ID of the most recently eliminated player
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
  lastEliminatedPlayerId,
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
  const prevIsMyTurnRef = useRef(isMyTurn);
  const prevShowDiceRef = useRef(showDice);
  const prevLastEliminatedPlayerIdRef = useRef(lastEliminatedPlayerId);
  const getDefaultPosition = () => {
    // Desktop: opponent 1 top-left, opponent 2 to the right (no overlap, clear of volume button)
    const playerWidth = 180;
    const topMargin = 80; // Below header/volume
    const startX = 24; // Right of volume button
    const gap = 20;
    const x = startX + position * (playerWidth + gap);
    const y = topMargin;
    return { x, y };
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

  // Animate the container briefly in red when this player is eliminated
  useEffect(() => {
    if (
      animationsEnabled &&
      lastEliminatedPlayerId === player.id &&
      lastEliminatedPlayerId !== prevLastEliminatedPlayerIdRef.current
    ) {
      setShowElimAnim(true);
      const timer = setTimeout(() => setShowElimAnim(false), 600);
      return () => clearTimeout(timer);
    }
    prevLastEliminatedPlayerIdRef.current = lastEliminatedPlayerId;
  }, [lastEliminatedPlayerId, player.id, animationsEnabled]);

  // Animate dice when they become visible (round reveal)
  useEffect(() => {
    if (animationsEnabled && showDice && !prevShowDiceRef.current) {
      setShowDiceAnim(true);
      const timer = setTimeout(() => setShowDiceAnim(false), 800);
      return () => clearTimeout(timer);
    }
    prevShowDiceRef.current = showDice;
  }, [showDice, animationsEnabled]);

  // Map backend color to border and text colors - darker, classy jewel tones for poker table
  const colorBorderMap: Record<string, string> = {
    blue: "border-indigo-500",
    red: "border-rose-500",
    green: "border-emerald-500",
    yellow: "border-amber-500",
    brown: "border-amber-600", // rich cognac brown
    cyan: "border-cyan-500",
    purple: "border-purple-500",
    pink: "border-pink-500",
  };
  
  const colorTextMap: Record<string, string> = {
    blue: "text-indigo-500",
    red: "text-rose-500",
    green: "text-emerald-500",
    yellow: "text-amber-500",
    brown: "text-amber-600", // rich cognac brown
    cyan: "text-cyan-500",
    purple: "text-purple-500",
    pink: "text-pink-500",
  };
  
  const playerColor = player.color || "blue";
  const playerColorClass = colorBorderMap[playerColor] || colorBorderMap["blue"];
  const playerTextClass = colorTextMap[playerColor] || colorTextMap["blue"];

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

  if (isMobile) {
    return (
      <div
        className={`bg-green-950 rounded-lg shadow-lg select-none transition-all duration-300 ${
          showElimAnim && animationsEnabled
            ? "border-[3px] border-red-500"
            : isMyTurn ? "border-[3px] border-green-300" : `border-2 ${playerColorClass}`
        } ${player.eliminated ? "opacity-50" : ""} p-1.5 min-w-0 flex-shrink-0 ${showTurnAnim && animationsEnabled ? 'animate-turn-start' : ''} ${showElimAnim && animationsEnabled ? 'animate-shake' : ''} ${isMyTurn && animationsEnabled ? 'animate-turn-glow' : ''}`}
      >
        {/* One row: name + dice next to each other (dice when revealed) */}
        <div className="flex items-center gap-1 min-w-0">
          <div className="flex items-center gap-0.5 flex-shrink-0 min-w-0">
            {/* Turn arrow indicator - mobile */}
            {isMyTurn && (
              <span className="text-green-400 font-bold text-[10px] flex-shrink-0">▶</span>
            )}
            <span className={`font-bold text-[11px] truncate ${playerTextClass}`}>{player.name}</span>
            {isDealer && (
              <div className="w-3 h-3 bg-white border border-black rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black text-[8px] font-bold">D</span>
              </div>
            )}
            {player.winTokens > 0 && (
              <span className="text-amber-300 font-bold text-[10px]">🏆 {player.winTokens}</span>
            )}
          </div>
          {/* Dice next to name when revealed */}
          {showDice &&
            previousRoundPlayer &&
            previousRoundPlayer.dice &&
            previousRoundPlayer.dice.length > 0 && (
              <div className="flex items-center flex-1 min-w-0 justify-end">
                <div className="flex gap-0.5 flex-nowrap">
                  {previousRoundPlayer.dice.map((value, index) => (
                    <div
                      key={index}
                      className={showDiceAnim && animationsEnabled ? 'animate-dice-land' : ''}
                      style={{ animationDelay: showDiceAnim && animationsEnabled ? `${index * 55}ms` : '0ms' }}
                    >
                      <DiceSVG value={value} size="xs" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          {player.eliminated && (
            <span className="text-red-300 font-bold text-[10px] flex-shrink-0">{t("game.out")}</span>
          )}
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
      {/* Player Container - Rounded Rectangle with Green Background */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`w-40 h-48 bg-green-950 rounded-2xl shadow-lg select-none transition-all duration-300 ${
          showElimAnim && animationsEnabled
            ? "border-[6px] border-red-500"
            : isMyTurn ? "border-[6px] border-green-300" : `border-4 ${playerColorClass}`
        } ${
          player.eliminated ? "opacity-50" : ""
        } ${showTurnAnim && animationsEnabled ? 'animate-turn-start' : ''} ${showElimAnim && animationsEnabled ? 'animate-shake' : ''} ${isMyTurn && animationsEnabled ? 'animate-turn-glow' : ''} ${
          position === 0
            ? "transform -rotate-90"
            : position === 1
            ? "transform rotate-90"
            : ""
        } flex flex-col items-center justify-center p-3`}
      >
        {/* Content with counter-rotation for text readability */}
        <div
          className={`${
            position === 0
              ? "transform rotate-90"
              : position === 1
              ? "transform -rotate-90"
              : ""
          } w-full h-full flex flex-col items-center justify-center`}
        >
          {/* Turn indicator badge - inside counter-rotated content */}
          {isMyTurn && !player.eliminated && (
            <div className="mb-1">
              <span className={`bg-green-400 text-green-950 font-bold text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${animationsEnabled ? 'animate-bounce-in' : ''}`}>
                ▶ {t("game.yourTurn")}
              </span>
            </div>
          )}
          {/* Username with Dealer Button and Win Tokens */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center space-x-1">
              <span className={`font-bold text-sm ${playerTextClass} break-words`}>
                {player.name}
              </span>
              {/* Dealer Button */}
              {isDealer && (
                <div className="inline-flex items-center justify-center w-5 h-5 bg-white border-2 border-black rounded-full">
                  <span className="text-black text-xs font-bold">D</span>
                </div>
              )}
              {/* Win Tokens */}
              {player.winTokens > 0 && (
                <div className="text-xs text-amber-300 font-bold">
                  🏆 {player.winTokens}
                </div>
              )}
            </div>
          </div>

          {/* Dice - Only show when revealed */}
          {showDice &&
            previousRoundPlayer &&
            previousRoundPlayer.dice &&
            previousRoundPlayer.dice.length > 0 && (
              <div className="flex justify-center mb-2 w-full">
                <div className="flex flex-col items-center space-y-1 w-full">
                  <div className="flex justify-center w-full px-1 overflow-hidden">
                    <div className="flex gap-0.5 flex-nowrap justify-center max-w-full">
                      {previousRoundPlayer.dice.map((value, index) => (
                        <div
                          key={index}
                          className={showDiceAnim && animationsEnabled ? 'animate-dice-land' : ''}
                          style={{ animationDelay: showDiceAnim && animationsEnabled ? `${index * 55}ms` : '0ms' }}
                        >
                          <DiceSVG value={value} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* <div className="text-xs text-yellow-300 font-bold">{t('game.revealed')}</div> */}
                </div>
              </div>
            )}

          {/* Previous Bid Display - Only show when relevant to current game state */}
          {previousBid &&
            previousBid.playerId === player.id &&
            !player.eliminated && (
              <div className="text-center text-xs text-amber-200 font-bold mb-1 break-words">
                {t("game.previousBid", {
                  quantity: previousBid.quantity,
                  faceValue: previousBid.faceValue,
                })}
              </div>
            )}

          {/* Eliminated State */}
          {player.eliminated && (
            <div className="text-center text-red-300 font-bold text-xs">
              {t("game.out")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpponentPlayer;
