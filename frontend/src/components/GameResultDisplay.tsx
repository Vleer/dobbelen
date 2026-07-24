import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from '../types/game';
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import DiceAnalysisChart from "./DiceAnalysisChart";

interface GameResultDisplayProps {
  game: Game;
  currentPlayerId?: string;
}

const GameResultDisplay: React.FC<GameResultDisplayProps> = ({
  game,
  currentPlayerId,
}) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();
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

  if (!game.showAllDice) {
    return null;
  }

  const roundWinner = game.players.find((p) => p.id === game.winner);
  const eliminatedPlayer = game.players.find(
    (p) => p.id === game.lastEliminatedPlayerId
  );
  const isCurrentPlayerWinner = !!currentPlayerId && game.winner === currentPlayerId;
  const isCurrentPlayerEliminated =
    !!currentPlayerId && game.lastEliminatedPlayerId === currentPlayerId;

  const bidWasCorrect =
    game.lastActualCount !== undefined &&
    game.lastBidQuantity !== undefined &&
    game.lastActualCount >= game.lastBidQuantity;

  const getActionMessage = () => {
    if (!game.lastActionType || !game.lastActionPlayerId) return '';
    const actor =
      game.players.find((p) => p.id === game.lastActionPlayerId)?.name ||
      t('common.unknownPlayer');
    switch (game.lastActionType) {
      case 'DOUBT':   return t('game.action.doubt',  { playerName: actor });
      case 'SPOT_ON': return t('game.action.spotOn', { playerName: actor });
      case 'RAISE':   return t('game.action.raise',  { playerName: actor });
      default:         return '';
    }
  };

  const getResultMessage = () => {
    if (
      game.lastActualCount !== undefined &&
      game.lastBidQuantity !== undefined &&
      game.lastBidFaceValue !== undefined
    ) {
      const faceValue = game.lastBidFaceValue;
      if (game.lastActualCount >= game.lastBidQuantity) {
        return t('game.result.thereWere', {
          actualCount: game.lastActualCount,
          faceValue,
        });
      }
      return t('game.result.thereWereOnly', {
        actualCount: game.lastActualCount,
        faceValue,
      });
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
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`rounded-2xl border shadow-xl text-center min-w-80 max-w-lg select-none px-6 py-5 ${
          animationsEnabled ? 'animate-fade-in' : ''
        }`}
        style={{
          backgroundColor: 'var(--game-surface)',
          borderColor: 'var(--game-border)',
        }}
      >
        {/* Action header */}
        <div
          className="text-sm font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--game-accent-text)' }}
        >
          {getActionMessage()}
        </div>

        {/* Dice count result */}
        {getResultMessage() && (
          <div className="text-base font-semibold mb-3" style={{ color: 'var(--game-text)' }}>
            {getResultMessage()}
          </div>
        )}

        {/* Bid correctness */}
        {game.lastActualCount !== undefined && (
          <div
            className="inline-block px-3 py-1 rounded-lg text-xs font-semibold mb-3 border"
            style={{
              backgroundColor: 'var(--game-surface-soft)',
              borderColor: 'var(--game-border-strong)',
              color: 'var(--game-accent-text)',
            }}
          >
            {bidWasCorrect
              ? t('game.result.bidWasCorrect')
              : t('game.result.bidWasWrong')}
          </div>
        )}

        {/* Round winner */}
        {roundWinner && (
          <div className="mb-3">
            <div
              className="text-[10px] uppercase tracking-wide font-semibold mb-0.5"
              style={{ color: 'var(--game-text-muted)' }}
            >
              Round winner
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--game-accent-text)' }}>
              {t('game.result.winsRound', { playerName: roundWinner.name })}
            </div>
          </div>
        )}

        {/* Personal outcome */}
        {(isCurrentPlayerWinner || isCurrentPlayerEliminated) && (
          <div
            className="rounded-xl px-4 py-2 mb-3 text-sm font-bold border"
            style={{
              backgroundColor: 'var(--game-surface-soft)',
              borderColor: 'var(--game-border-strong)',
              color: 'var(--game-accent-text)',
            }}
          >
            {isCurrentPlayerWinner
              ? t('game.result.youWinRound')
              : t('game.result.youLoseRound')}
          </div>
        )}

        {/* Eliminated player */}
        {eliminatedPlayer && (
          <div
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--game-text-muted)' }}
          >
            {t('game.result.isEliminated', {
              playerName: eliminatedPlayer.name,
            })}
          </div>
        )}

        <DiceAnalysisChart game={game} />
      </div>
    </div>
  );
};

export default GameResultDisplay;
