import React, { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "../types/game";
import { useLanguage } from "../contexts/LanguageContext";
import DiceHand from "./DiceHand";
import DiceHandSVG from "./DiceHandSVG";
import DiceSVG from "./DiceSVG";
import { getPlayerColor } from "../utils/playerColors";

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
}) => {
  const { t } = useLanguage();

  useEffect(() => {
    console.log("OpponentPlayer color:", player.color);
  }, [player.color]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const getDefaultPosition = () => {
    // Half-circle positioning from left to right at the top of the screen
    const screenWidth = window.innerWidth;
    const playerWidth = 150; // Approximate width of a player component
    const topMargin = 80; // Distance from top of screen

    // Calculate total opponents (assuming max 5 opponents for a 6-player game)
    // We'll use a more dynamic approach based on position
    const maxOpponents = 5;
    const totalWidth = screenWidth - 200; // Leave margins on sides
    const startX = 100; // Left margin

    // Calculate x position by dividing available width by number of positions
    const spacing = totalWidth / (maxOpponents + 1); // +1 to avoid edge placement
    const x = startX + spacing * (position + 1);

    // Create a slight arc by varying the y position
    const centerPosition = maxOpponents / 2;
    const distanceFromCenter = Math.abs(position - centerPosition);
    const arcHeight = 30; // Maximum arc height
    const y =
      topMargin + arcHeight * Math.pow(distanceFromCenter / centerPosition, 2);

    return { x: x - playerWidth / 2, y };
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

  // Map backend color to Tailwind class
  const colorClassMap: Record<string, string> = {
    blue: "bg-blue-700 border-blue-400",
    red: "bg-red-700 border-red-400",
    green: "bg-green-700 border-green-400",
    yellow: "bg-yellow-600 border-yellow-400",
    brown: "bg-amber-900 border-amber-900", // more distinct brown
    cyan: "bg-cyan-600 border-cyan-400",
  };
  const playerColor = player.color || "blue";
  const playerColorClass = colorClassMap[playerColor] || colorClassMap["blue"];

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
        className={`${
          playerColorClass.split(" ")[0]
        } rounded-lg shadow-lg border-2 select-none ${
          isMyTurn ? "border-green-300" : playerColorClass.split(" ")[1]
        } ${player.eliminated ? "opacity-50" : ""} p-2 min-w-0 flex-shrink-0`}
      >
        {/* Username with Dealer Button and Win Tokens */}
        <div className="text-center mb-1">
          <div className="flex items-center justify-center space-x-1">
            <span className="font-bold text-xs text-white">{player.name}</span>
            {/* Dealer Button */}
            {isDealer && (
              <div className="inline-flex items-center justify-center w-4 h-4 bg-white border-2 border-black rounded-full">
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
            <div className="flex justify-center mb-1">
              <div className="flex flex-col items-center space-y-1">
                <DiceHandSVG diceValues={previousRoundPlayer.dice} size="sm" />
                {/* <div className="text-xs text-yellow-300 font-bold">{t('game.revealed')}</div> */}
              </div>
            </div>
          )}

        {/* Eliminated State */}
        {player.eliminated && (
          <div className="text-center text-red-300 font-bold text-xs">
            {t("game.out")}
          </div>
        )}
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
            }
          : {}
      }
    >
      {/* Player Container - Rounded Rectangle with Dark Red Background */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`w-40 h-48 ${
          playerColorClass.split(" ")[0]
        } rounded-2xl shadow-lg border-4 select-none ${
          isMyTurn ? "border-green-300" : playerColorClass.split(" ")[1]
        } ${player.eliminated ? "opacity-50" : ""} ${
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
          {/* Username with Dealer Button and Win Tokens */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center space-x-1">
              <span className="font-bold text-sm text-white break-words">
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
                        <DiceSVG key={index} value={value} size="sm" />
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
