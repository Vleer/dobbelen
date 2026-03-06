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

  // Derive outcome information
  const roundWinner = game.players.find((p) => p.id === game.winner);
  const eliminatedPlayer = game.players.find(
    (p) => p.id === game.lastEliminatedPlayerId
  );
  const isCurrentPlayerWinner = !!currentPlayerId && game.winner === currentPlayerId;
  const isCurrentPlayerEliminated =
    !!currentPlayerId && game.lastEliminatedPlayerId === currentPlayerId;

  // Determine bid correctness
  const bidWasCorrect =
    game.lastActualCount !== undefined &&
    game.lastBidQuantity !== undefined &&
    game.lastActualCount >= game.lastBidQuantity;

  // Theme colours based on personal outcome
  let borderColor = '#78350f';
  let bgColor = '#3d1f0d';
  let glowAnimation = '';
  if (isCurrentPlayerWinner) {
    borderColor = '#22c55e';
    bgColor = '#052e16';
    glowAnimation = 'pulse-green';
  } else if (isCurrentPlayerEliminated) {
    borderColor = '#ef4444';
    bgColor = '#2d0a0a';
    glowAnimation = 'pulse-red';
  }

  const getActionIcon = () => {
    switch (game.lastActionType) {
      case 'DOUBT':   return '🤔';
      case 'SPOT_ON': return '🎯';
      default:         return '🎲';
    }
  };

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
      } else {
        return t('game.result.thereWereOnly', {
          actualCount: game.lastActualCount,
          faceValue,
        });
      }
    }
    return '';
  };

  // Detect mobile mode
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Animation helper: staggered fade-in via inline style
  const stagger = (delayMs: number): React.CSSProperties =>
    animationsEnabled
      ? { animation: `fade-in 0.45s ease-out ${delayMs}ms forwards`, opacity: 0 }
      : {};

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
        className="border-4 rounded-3xl p-6 shadow-2xl text-center min-w-80 max-w-lg select-none"
        style={{
          backgroundColor: bgColor,
          borderColor,
          ...(animationsEnabled
            ? {
                animation: glowAnimation
                  ? `bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, ${glowAnimation} 1.6s ease-in-out 0.5s infinite`
                  : 'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }
            : {}),
        }}
      >
        {/* ── Action header ──────────────────────────────────────────── */}
        <div
          className="text-2xl font-bold text-amber-200 mb-3 flex items-center justify-center gap-2"
          style={stagger(0)}
        >
          <span className="text-3xl">{getActionIcon()}</span>
          <span>{getActionMessage()}</span>
        </div>

        {/* ── Dice count result ──────────────────────────────────────── */}
        {getResultMessage() && (
          <div
            className="text-lg font-semibold text-amber-100 mb-2"
            style={stagger(80)}
          >
            {getResultMessage()}
          </div>
        )}

        {/* ── Bid correctness badge ─────────────────────────────────── */}
        {game.lastActualCount !== undefined && (
          <div
            className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-4 ${
              bidWasCorrect
                ? 'bg-green-800 text-green-300 border border-green-500'
                : 'bg-red-900 text-red-300 border border-red-600'
            }`}
            style={stagger(160)}
          >
            {bidWasCorrect
              ? t('game.result.bidWasCorrect')
              : t('game.result.bidWasWrong')}
          </div>
        )}

        {/* ── Round winner banner ────────────────────────────────────── */}
        {roundWinner && (
          <div
            className="flex items-center justify-center gap-2 mb-3"
            style={stagger(260)}
          >
            <span
              className={animationsEnabled ? 'animate-float inline-block' : 'inline-block'}
              style={{ fontSize: '2rem' }}
            >
              🏆
            </span>
            <span className="text-2xl font-extrabold text-amber-400">
              {t('game.result.winsRound', { playerName: roundWinner.name })}
            </span>
          </div>
        )}

        {/* ── Personal outcome highlight ────────────────────────────── */}
        {(isCurrentPlayerWinner || isCurrentPlayerEliminated) && (
          <div
            className={`rounded-2xl px-5 py-3 mb-3 text-xl font-extrabold tracking-wide ${
              isCurrentPlayerWinner
                ? 'bg-green-800 text-green-300 border-2 border-green-500'
                : 'bg-red-900 text-red-300 border-2 border-red-600'
            }`}
            style={animationsEnabled ? {
              // bounce-in starts at 340 ms; flash starts after bounce completes (~840 ms)
              animation: `bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 340ms both, flash 0.8s ease-in-out 860ms infinite`,
              opacity: 0,
            } : {}}
          >
            {isCurrentPlayerWinner
              ? t('game.result.youWinRound')
              : t('game.result.youLoseRound')}
          </div>
        )}

        {/* ── Eliminated player ─────────────────────────────────────── */}
        {!isMobile && eliminatedPlayer && (
          <div
            className="text-lg font-bold text-red-400 mb-3 flex items-center justify-center gap-1"
            style={animationsEnabled ? {
              // bounce-in starts at 420 ms; flash starts after bounce completes (~920 ms)
              animation: `bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 420ms both, flash 0.8s ease-in-out 940ms infinite`,
              opacity: 0,
            } : {}}
          >
            <span>💀</span>
            <span>
              {t('game.result.isEliminated', {
                playerName: eliminatedPlayer.name,
              })}
            </span>
          </div>
        )}

        {/* ── Dice analysis chart ───────────────────────────────────── */}
        {!isMobile && (
          <div style={stagger(500)}>
            <DiceAnalysisChart game={game} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GameResultDisplay;

