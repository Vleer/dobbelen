import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from '../types/game';
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import DiceAnalysisChart from "./DiceAnalysisChart";

interface GameResultDisplayProps {
  game: Game;
  currentPlayerId?: string;
  /** overlay = draggable desktop popup; inline = static mobile card */
  variant?: 'overlay' | 'inline';
  compact?: boolean;
}

const DICE_PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const GameResultDisplay: React.FC<GameResultDisplayProps> = ({
  game,
  variant = 'overlay',
  compact = false,
}) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (variant !== 'overlay') return;
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

  const eliminatedPlayer = game.players.find(
    (p) => p.id === game.lastEliminatedPlayerId
  );
  const actor = game.players.find((p) => p.id === game.lastActionPlayerId);
  const bidder = game.players.find((p) => p.id === game.lastBidPlayerId);

  const claimedQty = game.lastBidQuantity;
  const actualQty = game.lastActualCount;
  const faceValue = game.lastBidFaceValue;
  const hasCounts =
    claimedQty !== undefined &&
    actualQty !== undefined &&
    faceValue !== undefined;

  const isSpotOn = game.lastActionType === 'SPOT_ON';
  const isDoubt = game.lastActionType === 'DOUBT';

  let verdictFailed = false;
  let verdictKey = 'game.result.bidFailed';
  if (hasCounts) {
    if (isSpotOn) {
      verdictFailed = actualQty !== claimedQty;
      verdictKey = verdictFailed
        ? 'game.result.spotOnFailed'
        : 'game.result.spotOnSuccess';
    } else {
      // DOUBT (and fallback): bid fails when actual < claimed
      verdictFailed = actualQty < claimedQty;
      verdictKey = verdictFailed
        ? 'game.result.bidFailed'
        : 'game.result.bidHeld';
    }
  }

  const challengeLine = (() => {
    const actorName = actor?.name || t('common.unknownPlayer');
    const bidderName = bidder?.name || t('common.unknownPlayer');
    if (isSpotOn) {
      return t('game.result.calledSpotOn', {
        caller: actorName,
        bidder: bidderName,
      });
    }
    if (isDoubt || actor) {
      return t('game.result.challenged', {
        challenger: actorName,
        bidder: bidderName,
      });
    }
    return '';
  })();

  const facePip = faceValue ? DICE_PIPS[faceValue] ?? String(faceValue) : '';

  const panel = (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`rounded-2xl border shadow-xl select-none overflow-hidden ${
        animationsEnabled ? 'animate-fade-in' : ''
      } ${
        variant === 'overlay'
          ? 'min-w-80 max-w-lg'
          : compact
            ? 'w-full'
            : 'w-full max-w-lg mx-auto'
      }`}
      style={{
        backgroundColor: 'var(--game-surface)',
        borderColor: 'var(--game-border-strong)',
        cursor: variant === 'overlay' ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* Verdict banner — largest text */}
      <div
        className={`text-center font-black uppercase tracking-wide ${
          compact ? 'text-base px-3 py-2' : 'text-xl md:text-2xl px-4 py-3'
        }`}
        style={
          verdictFailed
            ? {
                backgroundColor: 'rgba(160, 45, 55, 0.92)',
                color: '#fff5f5',
                borderBottom: '1px solid rgba(255, 180, 180, 0.35)',
              }
            : {
                backgroundColor: 'rgba(34, 110, 70, 0.95)',
                color: 'var(--game-accent-text)',
                borderBottom: '1px solid var(--game-border-strong)',
              }
        }
      >
        {verdictFailed ? '❌ ' : '✓ '}
        {t(verdictKey)}
      </div>

      <div className={compact ? 'px-3 py-2.5 space-y-2.5' : 'px-5 py-4 space-y-3.5'}>
        {/* Challenge narrative */}
        {challengeLine && (
          <p
            className={`text-center font-medium ${compact ? 'text-sm' : 'text-base'}`}
            style={{ color: 'var(--game-text)' }}
          >
            {challengeLine}
          </p>
        )}

        {/* Claimed → Actual */}
        {hasCounts && (
          <div
            className="rounded-xl border px-3 py-3"
            style={{
              backgroundColor: 'var(--game-surface-soft)',
              borderColor: 'var(--game-border)',
            }}
          >
            <div className="flex items-center justify-center gap-3 md:gap-5">
              <div className="flex-1 text-center min-w-0">
                <div
                  className="text-[10px] md:text-xs uppercase tracking-wider font-semibold mb-1.5"
                  style={{ color: 'var(--game-text-muted)' }}
                >
                  {t('game.result.claimed')}
                </div>
                <div
                  className={`font-bold tabular-nums ${compact ? 'text-xl' : 'text-2xl md:text-3xl'}`}
                  style={{ color: 'var(--game-text)' }}
                >
                  {claimedQty} × <span className="inline-block translate-y-px">{facePip}</span>
                </div>
              </div>

              <div
                className={`flex-shrink-0 font-bold ${compact ? 'text-lg' : 'text-xl md:text-2xl'}`}
                style={{ color: 'var(--game-accent-text)' }}
                aria-hidden
              >
                →
              </div>

              <div className="flex-1 text-center min-w-0">
                <div
                  className="text-[10px] md:text-xs uppercase tracking-wider font-semibold mb-1.5"
                  style={{ color: 'var(--game-text-muted)' }}
                >
                  {t('game.result.actual')}
                </div>
                <div
                  className={`font-bold tabular-nums ${compact ? 'text-xl' : 'text-2xl md:text-3xl'}`}
                  style={{
                    color: verdictFailed
                      ? '#f0a0a0'
                      : 'var(--game-accent-text)',
                  }}
                >
                  {actualQty} × <span className="inline-block translate-y-px">{facePip}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Elimination consequence */}
        {eliminatedPlayer && (
          <div
            className={`flex items-center justify-center gap-2 rounded-xl border font-semibold ${
              compact ? 'text-sm px-3 py-2' : 'text-base px-4 py-2.5'
            }`}
            style={{
              backgroundColor: 'var(--game-surface-soft)',
              borderColor: 'var(--game-border)',
              color: 'var(--game-text)',
            }}
          >
            <span className={compact ? 'text-base' : 'text-lg'} aria-hidden>
              💔
            </span>
            <span>
              {t('game.result.isEliminated', {
                playerName: eliminatedPlayer.name,
              })}
            </span>
          </div>
        )}

        <DiceAnalysisChart game={game} />
      </div>
    </div>
  );

  if (variant === 'inline') {
    return panel;
  }

  return (
    <div
      className="absolute z-50"
      style={{
        left: position.x || '50%',
        top: position.y || '50%',
        transform: position.x ? 'none' : 'translate(-50%, -50%)',
      }}
    >
      {panel}
    </div>
  );
};

export default GameResultDisplay;
