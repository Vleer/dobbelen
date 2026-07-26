import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from '../types/game';
import DiceSVG from './DiceSVG';
import DiceAnalysisChart from './DiceAnalysisChart';
import { useLanguage } from '../contexts/LanguageContext';
import { getPlayerColorFromString } from '../utils/playerColors';
import {
  emptyPlayerStats,
  loadGameStats,
  GAME_STATS_UPDATED_EVENT,
  PlayerGameStats,
} from '../utils/gameStats';

interface HistoryPanelProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  openedFromGameStart?: boolean;
  onClearGameStartOpen?: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  game,
  isOpen,
  onClose,
  openedFromGameStart,
  onClearGameStartOpen,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    'instructions' | 'currentHand' | 'lastHand' | 'stats'
  >('lastHand');
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerGameStats>>(
    {}
  );

  // When panel opens from game start only: show "Rules" tab. Otherwise keep/remember the last tab.
  const hasAppliedOpenRef = React.useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasAppliedOpenRef.current = false;
      return;
    }
    if (openedFromGameStart && !hasAppliedOpenRef.current) {
      setActiveTab('instructions');
      onClearGameStartOpen?.();
      hasAppliedOpenRef.current = true;
    } else if (!hasAppliedOpenRef.current && !openedFromGameStart) {
      setActiveTab('lastHand');
      hasAppliedOpenRef.current = true;
    }
  }, [isOpen, openedFromGameStart, onClearGameStartOpen]);

  const refreshStats = useCallback(() => {
    const stored = loadGameStats(game.id);
    const merged: Record<string, PlayerGameStats> = {};
    game.players.forEach((player) => {
      merged[player.id] = {
        ...(stored[player.id] || emptyPlayerStats(player.id, player.name)),
        playerName: player.name,
      };
    });
    setPlayerStats(merged);
  }, [game.id, game.players]);

  useEffect(() => {
    refreshStats();
  }, [
    refreshStats,
    isOpen,
    game.lastActionPlayerId,
    game.lastActualCount,
    game.lastEliminatedPlayerId,
    game.showAllDice,
  ]);

  useEffect(() => {
    const onStatsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ gameId: string }>).detail;
      if (detail?.gameId === game.id) {
        refreshStats();
      }
    };
    window.addEventListener(GAME_STATS_UPDATED_EVENT, onStatsUpdated);
    return () =>
      window.removeEventListener(GAME_STATS_UPDATED_EVENT, onStatsUpdated);
  }, [game.id, refreshStats]);

  // Get the last hand data from previousRoundPlayers
  const lastHandPlayers = game.previousRoundPlayers || [];
  const hasLastHandData = lastHandPlayers.length > 0;

  const resolvePlayer = (playerId?: string | null) => {
    if (!playerId) return null;
    return (
      lastHandPlayers.find((p) => p.id === playerId) ||
      game.players.find((p) => p.id === playerId) ||
      null
    );
  };

  const getPlayerHex = (player: { color?: string } | null | undefined) =>
    getPlayerColorFromString(player?.color || 'blue');

  // Compact action line: Challenger 👎/🎯 Bidder
  const getActionDescription = () => {
    if (!game.lastActionType || !game.lastActionPlayerId) {
      return <span>{t('game.history.noAction')}</span>;
    }

    const actionPlayer = resolvePlayer(game.lastActionPlayerId);
    const actionName = actionPlayer?.name || t('common.unknownPlayer');
    const actionColor = getPlayerHex(actionPlayer);

    let bidPlayerId = game.lastBidPlayerId || game.previousBid?.playerId;
    if (!bidPlayerId && game.lastActionType === 'RAISE') {
      bidPlayerId = game.lastActionPlayerId;
    }
    const bidPlayer = resolvePlayer(bidPlayerId);
    const bidName = bidPlayer?.name || t('common.unknownPlayer');
    const bidColor = getPlayerHex(bidPlayer);

    if (game.lastActionType === 'DOUBT' || game.lastActionType === 'SPOT_ON') {
      const icon = game.lastActionType === 'SPOT_ON' ? '🎯' : '👎';
      return (
        <span className="inline-flex items-center gap-1 min-w-0">
          <span className="font-bold truncate" style={{ color: actionColor }}>
            {actionName}
          </span>
          <span aria-hidden>{icon}</span>
          <span className="font-bold truncate" style={{ color: bidColor }}>
            {bidName}
          </span>
        </span>
      );
    }

    if (game.lastActionType === 'RAISE') {
      return (
        <span className="font-bold" style={{ color: actionColor }}>
          {actionName}
        </span>
      );
    }

    return <span>{t('game.history.unknownAction')}</span>;
  };

  const getOutcomeDescription = () => {
    if (!game.lastEliminatedPlayerId) {
      return null;
    }

    const eliminatedPlayer = resolvePlayer(game.lastEliminatedPlayerId);
    const eliminatedPlayerName =
      eliminatedPlayer?.name || t('common.unknownPlayer');
    const eliminatedColor = getPlayerHex(eliminatedPlayer);

    return (
      <span className="font-semibold text-xs md:text-sm inline-flex items-center gap-1">
        <span aria-hidden>💔</span>
        <span style={{ color: eliminatedColor }}>{eliminatedPlayerName}</span>
      </span>
    );
  };

  // Actual matching dice, colored by the player who rolled them
  const actualResultDice =
    game.lastBidFaceValue !== undefined
      ? lastHandPlayers.flatMap((player) => {
          const currentPlayer = game.players.find((p) => p.id === player.id);
          const color = getPlayerColorFromString(
            player.color || currentPlayer?.color || 'blue'
          );
          return (player.dice || [])
            .filter((die) => die === game.lastBidFaceValue)
            .map((die, index) => ({
              value: die,
              color,
              key: `${player.id}-${die}-${index}`,
            }));
        })
      : [];

  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [dragPosition, setDragPosition] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Reset drag position whenever the panel is closed
  useEffect(() => {
    if (!isOpen) {
      setDragPosition(null);
      draggingRef.current = false;
      setDragging(false);
    }
  }, [isOpen]);

  const clampToViewport = useCallback((left: number, top: number) => {
    const el = panelRef.current;
    const width = el?.offsetWidth ?? 320;
    const height = el?.offsetHeight ?? 200;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop),
    };
  }, []);

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest('button, a, input, textarea, select, [role="button"], [data-no-drag], [data-history-scroll]')
    );
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isInteractiveTarget(e.target)) return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const origin = { left: rect.left, top: rect.top };
    setDragPosition(origin);
    dragOffsetRef.current = {
      x: e.clientX - origin.left,
      y: e.clientY - origin.top,
    };
    draggingRef.current = true;
    setDragging(true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // window listeners still handle the drag
    }
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setDragPosition(
        clampToViewport(
          e.clientX - dragOffsetRef.current.x,
          e.clientY - dragOffsetRef.current.y
        )
      );
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [clampToViewport]);

  useEffect(() => {
    if (!dragPosition) return;
    const onResize = () =>
      setDragPosition((prev) => (prev ? clampToViewport(prev.left, prev.top) : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [dragPosition, clampToViewport]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      onPointerDown={onPointerDown}
      className={`rounded-2xl shadow-2xl border w-[calc(100vw-0.5rem)] md:w-96 max-h-[80vh] overflow-y-auto select-none touch-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${dragPosition ? 'fixed z-40' : 'relative'}`}
      style={{
        backgroundColor: '#0f2a1b',
        borderColor: '#365844',
        backdropFilter: 'blur(4px)',
        ...(dragPosition
          ? { left: dragPosition.left, top: dragPosition.top, transform: 'none' }
          : {}),
      }}
      title="Drag to move"
    >
        {/* Header — drag handle */}
        <div className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 border-b" style={{ borderColor: '#365844' }}>
          <span
            className="flex-1 flex items-center justify-center"
            aria-hidden
          >
            <span className="block w-10 h-1 rounded-full bg-[#8a6a1d]/80" />
          </span>
          <button
            onClick={onClose}
            className="p-0.5 md:p-1 text-[#d9b45a] hover:text-[#f7f3e8] rounded text-sm cursor-pointer"
            title={t('instructions.close')}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#365844' }}>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex-1 py-1 px-1.5 md:py-2 md:px-3 text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'instructions'
                ? 'text-[#f7f3e8]'
                : 'text-[#d9b45a] hover:text-[#f7f3e8]'
            }`}
            style={{ backgroundColor: activeTab === 'instructions' ? '#12352b' : '#0b2415' }}
          >
            {t('instructions.rules')}
          </button>
          <button
            onClick={() => setActiveTab('currentHand')}
            className={`flex-1 py-1 px-1.5 md:py-2 md:px-3 text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'currentHand'
                ? 'text-[#f7f3e8]'
                : 'text-[#d9b45a] hover:text-[#f7f3e8]'
            }`}
            style={{ backgroundColor: activeTab === 'currentHand' ? '#12352b' : '#0b2415' }}
          >
            {t('game.history.currentHand')}
          </button>
          <button
            onClick={() => setActiveTab('lastHand')}
            className={`flex-1 py-1 px-1.5 md:py-2 md:px-3 text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'lastHand'
                ? 'text-[#f7f3e8]'
                : 'text-[#d9b45a] hover:text-[#f7f3e8]'
            }`}
            style={{ backgroundColor: activeTab === 'lastHand' ? '#12352b' : '#0b2415' }}
          >
            {t('game.history.lastHand')}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-1 px-1.5 md:py-2 md:px-3 text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'stats'
                ? 'text-[#f7f3e8]'
                : 'text-[#d9b45a] hover:text-[#f7f3e8]'
            }`}
            style={{ backgroundColor: activeTab === 'stats' ? '#12352b' : '#0b2415' }}
          >
            {t('game.history.stats')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-2 md:p-4" data-history-scroll>
          {activeTab === 'instructions' && (
            <div className="text-[#f7f3e8]">
              <table className="w-full text-xs md:text-base border-collapse">
                <tbody>
                  {['raise', 'doubt', 'spotOn', 'winRound'].map((key) => {
                    const text = t(`instructions.${key}`);
                    const colonIdx = text.indexOf(': ');
                    const action = colonIdx >= 0 ? text.slice(0, colonIdx) : null;
                    const rest = colonIdx >= 0 ? text.slice(colonIdx + 2) : text;
                    const actionColor: Record<string, string> = {
                      raise: 'var(--accent-gold)',
                      doubt: '#ef4444',
                      spotOn: '#22c55e',
                      winRound: 'var(--accent-gold)',
                    };
                    return action ? (
                      <tr key={key}>
                        <td
                          className="pr-2 py-0.5 md:py-1 font-bold whitespace-nowrap align-top"
                          style={{ color: actionColor[key] || 'var(--text-main)' }}
                        >
                          {action}:
                        </td>
                        <td className="py-0.5 md:py-1 align-top" style={{ color: 'var(--text-main)' }}>
                          {rest}
                        </td>
                      </tr>
                    ) : (
                      <tr key={key}>
                        <td colSpan={2} className="py-0.5 md:py-1 font-semibold align-top" style={{ color: actionColor[key] || 'var(--text-main)' }}>
                          {rest}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'currentHand' && (
            <div>
              {game.currentHandBidHistory && game.currentHandBidHistory.length > 0 ? (
                <div className="space-y-1 md:space-y-2">
                  {game.currentHandBidHistory.map((bid, index) => {
                    const bidPlayer = game.players.find(p => p.id === bid.playerId);
                    const bidPlayerName = bidPlayer?.name || t('common.unknownPlayer');
                    const bidPlayerColor = getPlayerColorFromString(bidPlayer?.color || 'blue');
                    
                    // Determine action type
                    const isRaise = !bid.type || bid.type === 'RAISE';
                    const isDoubt = bid.type === 'DOUBT';
                    const isSpotOn = bid.type === 'SPOT_ON';
                    
                    return (
                      <div
                        key={index}
                        className="p-2 md:p-3 rounded-lg border-2"
                        style={{ 
                          backgroundColor: '#12352b',
                          borderColor: `${bidPlayerColor}` // Player's color for border
                        }}
                      >
                        {isRaise ? (
                          // Display RAISE action (bid with dice)
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: bidPlayerColor }}
                              />
                              <span 
                                className="font-semibold text-xs md:text-base"
                                style={{ color: bidPlayerColor }}
                              >
                                {bidPlayerName}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 flex-wrap justify-end min-w-0">
                              {Array.from({ length: bid.quantity }).map((_, diceIndex) => (
                                <DiceSVG key={diceIndex} value={bid.faceValue} size="xs" />
                              ))}
                            </div>
                          </div>
                        ) : (
                          // Display DOUBT or SPOT_ON action (text only)
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: bidPlayerColor }}
                            />
                            <span 
                              className="font-semibold text-xs md:text-base"
                              style={{ color: bidPlayerColor }}
                            >
                              {isDoubt ? t('game.action.doubt', { playerName: bidPlayerName }) : 
                               isSpotOn ? t('game.action.spotOn', { playerName: bidPlayerName }) : 
                               bidPlayerName}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-[#b9cbbf] py-4 md:py-8 text-xs md:text-base">
                  {t('game.history.noBidsYet')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lastHand' && (
            <div>
              {hasLastHandData ? (
                <>
                  {/* Compact action + outcome */}
                  <div className="flex items-center justify-between gap-2 mb-1 p-1.5 md:p-2 bg-[#12352b] rounded-lg border border-[#365844]">
                    <div className="text-[#f7f3e8] text-xs md:text-sm min-w-0 flex-1 text-left">
                      {getActionDescription()}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {getOutcomeDescription()}
                    </div>
                  </div>

                  {/* Bid vs actual — short labels; actual dice colored by owner */}
                  <div className="mb-1 p-1.5 md:p-2 bg-[#12352b] rounded-lg border border-[#365844] space-y-0.5">
                    {game.lastBidQuantity !== undefined && game.lastBidFaceValue && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[#d4dfd7] text-xs md:text-sm font-semibold">
                          {(() => {
                            let bidPlayerId = game.lastBidPlayerId || game.previousBid?.playerId;
                            if (!bidPlayerId && game.lastActionType === 'RAISE') {
                              bidPlayerId = game.lastActionPlayerId;
                            }
                            const bidPlayer = resolvePlayer(bidPlayerId);
                            return (
                              <span style={{ color: getPlayerHex(bidPlayer) }}>
                                {bidPlayer?.name || t('common.unknownPlayer')}
                              </span>
                            );
                          })()}
                        </span>
                        <div className="flex items-center gap-0.5 flex-wrap justify-end min-w-0">
                          {Array.from({ length: game.lastBidQuantity }).map((_, index) => (
                            <DiceSVG key={index} value={game.lastBidFaceValue!} size="xs" />
                          ))}
                        </div>
                      </div>
                    )}
                    {(game.lastActualCount !== undefined || actualResultDice.length > 0) &&
                      game.lastBidFaceValue && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[#d4dfd7] text-xs md:text-sm font-semibold">
                          {t('game.result.actual')}
                        </span>
                        <div className="flex items-center gap-0.5 flex-wrap justify-end min-w-0">
                          {actualResultDice.length > 0
                            ? actualResultDice.map((die) => (
                                <div
                                  key={die.key}
                                  className="w-7 h-7 rounded flex items-center justify-center"
                                  style={{
                                    backgroundColor: die.color,
                                    borderWidth: '2px',
                                    borderStyle: 'solid',
                                    borderColor: die.color,
                                  }}
                                >
                                  <DiceSVG value={die.value} size="xs" />
                                </div>
                              ))
                            : Array.from({ length: game.lastActualCount || 0 }).map((_, index) => (
                                <DiceSVG key={index} value={game.lastBidFaceValue!} size="xs" />
                              ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Players and sorted dice; matching face highlighted in player color */}
                  <div className="space-y-0.5 md:space-y-1 mt-0.5">
                    {lastHandPlayers.map((player) => {
                      const currentPlayer = game.players.find((p) => p.id === player.id);
                      const playerHexColor = getPlayerColorFromString(
                        player.color || currentPlayer?.color || 'blue'
                      );
                      const sortedDice = [...(player.dice || [])].sort((a, b) => a - b);
                      const resultFace = game.lastBidFaceValue;

                      return (
                        <div
                          key={player.id}
                          className="flex items-center gap-1.5 p-1 md:p-2 bg-[#12352b] rounded-lg border border-[#365844]"
                        >
                          <span
                            className="font-semibold flex-shrink-0 text-xs md:text-base"
                            style={{ color: playerHexColor }}
                          >
                            {player.name}
                          </span>
                          <div className="flex flex-wrap gap-0.5 justify-end ml-auto min-w-0">
                            {sortedDice.map((diceValue, index) => {
                              const isResultDie = resultFace !== undefined && diceValue === resultFace;
                              if (isResultDie) {
                                return (
                                  <div
                                    key={index}
                                    className="w-7 h-7 rounded flex items-center justify-center"
                                    style={{
                                      backgroundColor: playerHexColor,
                                      borderWidth: '2px',
                                      borderStyle: 'solid',
                                      borderColor: playerHexColor,
                                    }}
                                  >
                                    <DiceSVG value={diceValue} size="xs" />
                                  </div>
                                );
                              }
                              return (
                                <DiceSVG key={index} value={diceValue} size="xs" />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 md:mt-4">
                    <DiceAnalysisChart game={game} players={lastHandPlayers} />
                  </div>
                </>
              ) : (
                <div className="text-center text-[#b9cbbf] py-4 md:py-8 text-xs md:text-base">
                  {t('game.history.noData')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 className="text-[#d9b45a] font-semibold mb-1.5 md:mb-3 text-xs md:text-base">
                {t('game.history.stats')}
              </h3>
              <div className="space-y-1.5 md:space-y-2">
                {game.players.map((player) => {
                  const stats =
                    playerStats[player.id] ||
                    emptyPlayerStats(player.id, player.name);
                  const doubts = stats.correctDoubts + stats.wrongDoubts;
                  const spotOns = stats.correctSpotOns + stats.wrongSpotOns;
                  const hasChallengeStats =
                    doubts +
                      spotOns +
                      stats.bluffsHeld +
                      stats.bluffsCaught +
                      stats.spotOnsFaced +
                      stats.eliminations >
                    0;
                  const playerHexColor = getPlayerColorFromString(
                    player.color || 'blue'
                  );

                  const formatHitRate = (correct: number, total: number) =>
                    total === 0 ? '—' : `${correct}/${total}`;

                  return (
                    <div
                      key={player.id}
                      className="p-2 md:p-2.5 bg-[#12352b] rounded-lg border border-[#365844]"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div
                          className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: playerHexColor }}
                        />
                        <span
                          className="font-semibold text-xs md:text-sm truncate"
                          style={{ color: playerHexColor }}
                        >
                          {player.name}
                        </span>
                        <span
                          className="ml-auto text-[10px] md:text-xs font-semibold tabular-nums"
                          style={{ color: '#f5d98f' }}
                          title={t('game.history.winTokens')}
                        >
                          👑 {player.winTokens}
                        </span>
                      </div>

                      {!hasChallengeStats ? (
                        <div className="text-[10px] md:text-xs text-[#9cb4a5]">
                          {t('game.history.noActions')}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] md:text-xs">
                          <div className="flex justify-between gap-2 text-[#d4dfd7]">
                            <span>👎 {t('game.history.doubts')}</span>
                            <span className="font-semibold text-[#f5d98f] tabular-nums">
                              {formatHitRate(stats.correctDoubts, doubts)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 text-[#d4dfd7]">
                            <span>🎯 {t('game.history.spotOns')}</span>
                            <span className="font-semibold text-[#f5d98f] tabular-nums">
                              {formatHitRate(stats.correctSpotOns, spotOns)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 text-[#d4dfd7]">
                            <span>{t('game.history.bluffsHeld')}</span>
                            <span className="font-semibold text-[#f5d98f] tabular-nums">
                              {stats.bluffsHeld}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 text-[#d4dfd7]">
                            <span>{t('game.history.bluffsCaught')}</span>
                            <span className="font-semibold text-[#f5d98f] tabular-nums">
                              {stats.bluffsCaught}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 text-[#d4dfd7]">
                            <span>{t('game.history.spotOnsFaced')}</span>
                            <span className="font-semibold text-[#f5d98f] tabular-nums">
                              {stats.spotOnsFaced}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 text-[#d4dfd7]">
                            <span>{t('game.history.eliminations')}</span>
                            <span className="font-semibold text-[#f5d98f] tabular-nums">
                              {stats.eliminations}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] md:text-xs text-[#9cb4a5]">
                {t('game.history.statsHint')}
              </p>
            </div>
          )}
        </div>
      </div>
  );
};

export default HistoryPanel;
