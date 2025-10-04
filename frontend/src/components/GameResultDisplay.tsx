import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import DiceAnalysisChart from './DiceAnalysisChart';

interface GameResultDisplayProps {
  game: Game;
  currentPlayerId?: string;
}

const GameResultDisplay: React.FC<GameResultDisplayProps> = ({ game, currentPlayerId }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);






  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === containerRef.current ||
      (containerRef.current && containerRef.current.contains(e.target as Node))
    ) {
      setIsDragging(true);
      const rect = containerRef.current!.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    },
    [isDragging, dragOffset]
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
  }, [isDragging, dragOffset, handleMouseMove]);

  console.log("GameResultDisplay render:", {
    showAllDice: game.showAllDice,
    lastActualCount: game.lastActualCount,
    lastBidQuantity: game.lastBidQuantity,
    lastEliminatedPlayerId: game.lastEliminatedPlayerId,
    winner: game.winner,
    previousBid: game.previousBid,
  });

  if (!game.showAllDice) {
    console.log(
      "🟠 ORANGE_WINDOW: Not rendering GameResultDisplay - showAllDice is false at",
      new Date().toISOString()
    );
    return null;
  }

  console.log(
    "🟠 ORANGE_WINDOW: Rendering GameResultDisplay - showAllDice is true at",
    new Date().toISOString()
  );

  const getResultMessage = () => {
    if (
      game.lastActualCount !== undefined &&
      game.lastBidQuantity !== undefined &&
      game.lastBidFaceValue !== undefined
    ) {
      // Use the stored face value from the last doubt/spot-on
      const faceValue = game.lastBidFaceValue;
      if (game.lastActualCount >= game.lastBidQuantity) {
        return (
          t("game.result.thereWere", {
            actualCount: game.lastActualCount,
            faceValue,
          }) + " "
        );
      } else {
        return (
          t("game.result.thereWereOnly", {
            actualCount: game.lastActualCount,
            faceValue,
          }) + " "
        );
      }
    }
    return "";
  };

  const getWinnerMessage = () => {
    if (game.winner) {
      const winner = game.players.find((p) => p.id === game.winner);
      return winner
        ? t("game.result.winsRound", { playerName: winner.name })
        : t("game.result.roundEnded");
    }
    return "";
  };

  const getActionMessage = () => {
    if (!game.lastActionType || !game.lastActionPlayerId) return "";
    const actor =
      game.players.find((p) => p.id === game.lastActionPlayerId)?.name ||
      t("common.unknownPlayer");
    switch (game.lastActionType) {
      case "DOUBT":
        return t("game.action.doubt", { playerName: actor });
      case "SPOT_ON":
        return t("game.action.spotOn", { playerName: actor });
      case "RAISE":
        return t("game.action.raise", { playerName: actor });
      default:
        return "";
    }
  };

  // Detect mobile mode
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      className="absolute z-50"
      style={{
        left: position.x || "50%",
        top: position.y || "50%",
        transform: position.x ? "none" : "translate(-50%, -50%)",
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="bg-amber-900 border-4 border-amber-700 rounded-3xl p-8 shadow-2xl text-center min-w-96 select-none"
      >
        {/* Result Status */}
        <div className="text-2xl font-bold text-amber-200 mb-4">
          {getActionMessage()}
        </div>
        <div className="text-xl font-semibold text-amber-100 mb-4">
          {getResultMessage()}
        </div>

        {/* Winner Message */}
        {getWinnerMessage() && (
          <div className="text-3xl font-bold text-green-300 mb-4">
            {getWinnerMessage()}
          </div>
        )}

        {/* Eliminated Player - hidden in mobile mode */}
        {!isMobile && game.lastEliminatedPlayerId && (
          <div className="text-xl font-bold text-red-300 mb-4">
            {t("game.result.isEliminated", {
              playerName:
                game.players.find((p) => p.id === game.lastEliminatedPlayerId)
                  ?.name || "Unknown Player",
            })}
          </div>
        )}

        {/* Analysis Section - Always Visible on Desktop */}
        {!isMobile && <DiceAnalysisChart game={game} />}

        {/* Action Buttons section removed */}
      </div>
    </div>
  );
};

export default GameResultDisplay;
