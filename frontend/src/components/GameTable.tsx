import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Game, Player, CreateGameRequest } from '../types/game';
import { gameApi } from '../api/gameApi';
import { aiService } from '../services/aiService';
import { webSocketService } from '../services/websocketService';
import { audioService } from '../services/audioService';
import { useLanguage } from '../contexts/LanguageContext';
import { useStatistics } from '../contexts/StatisticsContext';
import { useSettings } from '../contexts/SettingsContext';
import { getPlayerColorFromString } from '../utils/playerColors';
import LocalPlayer from './LocalPlayer';
import OpponentPlayer from './OpponentPlayer';
import BidDisplay from './BidDisplay';
import BidSelector from './BidSelector';
import DesktopPlayerDock from './DesktopPlayerDock';
import GameResultDisplay from './GameResultDisplay';
import GameSetup from './GameSetup';
import LanguageSelector from './LanguageSelector';
import SettingsPanel from './SettingsPanel';
import StatisticsDisplay from './StatisticsDisplay';
import HistoryPanel from './HistoryPanel';
import { recordRevealStats, buildRevealEventId } from '../utils/gameStats';
import ChatPanel from './ChatPanel';
import ChatMessageToasts from './ChatMessageToasts';
import MiniTutorial from './MiniTutorial';
import useWindowSize from '../utils/useWindowSize';
import ChatIcon from './ChatIcon';
import { saveGameSnapshot } from '../utils/gameSnapshot';
import { isTransientHttpError, userFacingApiError } from '../utils/httpError';

interface GameTableProps {
  game?: Game | null;
  username?: string;
  playerId?: string;
  onBack?: (options?: { preserveLobby?: boolean; game?: Game | null }) => void;
  initialShowChat?: boolean;
  initialLastSeenIncomingCount?: number;
  onChatStateChange?: (isOpen: boolean, lastSeenIncomingCount: number) => void;
  minitutorial?: boolean;
}

const GameTable: React.FC<GameTableProps> = ({ 
  game: initialGame, 
  username: initialUsername, 
  playerId: initialPlayerId, 
  onBack,
  initialShowChat = false,
  initialLastSeenIncomingCount = 0,
  onChatStateChange,
  minitutorial = false,
}) => {
  const { t } = useLanguage();
  const { trackBid, trackDoubt, trackRoundEnd, trackDiceRoll, trackGameEnd } = useStatistics();
  const { animationsEnabled } = useSettings();
  const { isMobile, isTablet, isLandscape, isDesktop } = useWindowSize();
  const useMobileLayout = isMobile || isTablet;
  /** Tablet width + landscape: lg:hidden layout — stack bid readout above controls above local player */
  const tabletLandscapeStack = isTablet && isLandscape;
  /** Tablet portrait: center bidding UI in the row */
  const portraitTablet = isTablet && !isLandscape;
  const [game, setGame] = useState<Game | null>(initialGame || null);
  const [localPlayerId, setLocalPlayerId] = useState<string>(initialPlayerId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bettingDisabled, setBettingDisabled] = useState(false);
  const [isMuted, setIsMuted] = useState(() => audioService.getMuted());
  const [showBidDisplay, setShowBidDisplay] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [openedForGameStart, setOpenedForGameStart] = useState(false);
  const [showRulesTooltip, setShowRulesTooltip] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [playerLeftNotification, setPlayerLeftNotification] = useState<string | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [languageCloseSignal, setLanguageCloseSignal] = useState(0);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{playerId: string, actionType: 'DOUBT' | 'SPOT_ON'} | null>(null);
  const [lastTrackedAction, setLastTrackedAction] = useState<string | null>(null);
  const [previousRoundNumber, setPreviousRoundNumber] = useState<number>(1);
  const [previousGameState, setPreviousGameState] = useState<string>('');
  const [previousActionKey, setPreviousActionKey] = useState<string>('');
  const [previousRoundWinner, setPreviousRoundWinner] = useState<string>('');
  const [previousGameWinner, setPreviousGameWinner] = useState<string>('');
  const [hasPlayedGameStart, setHasPlayedGameStart] = useState(false);
  const [previousBidKey, setPreviousBidKey] = useState<string>('');
  const [historyPanelBottom, setHistoryPanelBottom] = useState<number>(0);
  const [dealerChipPos, setDealerChipPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [dealerChipDragging, setDealerChipDragging] = useState(false);
  const dealerDraggingRef = useRef(false);
  const dealerDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dealerChipPosRef = useRef(dealerChipPos);
  const [showMatchpoint, setShowMatchpoint] = useState(false);
  const [matchpointPlayerId, setMatchpointPlayerId] = useState<string>('');
  // Chat state
  const [showChat, setShowChat] = useState(initialShowChat);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(initialLastSeenIncomingCount);
  // Mini tutorial state
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const gameSettingsAnchorRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(game);
  const withStableMultiplayerFlag = useCallback(
    (incomingGame: Game, previousGame: Game | null = gameRef.current): Game => ({
      ...incomingGame,
      isMultiplayer:
        typeof incomingGame.isMultiplayer === "boolean"
          ? incomingGame.isMultiplayer
          : typeof previousGame?.isMultiplayer === "boolean"
            ? previousGame.isMultiplayer
            : typeof initialGame?.isMultiplayer === "boolean"
              ? initialGame.isMultiplayer
              : false,
    }),
    [initialGame?.isMultiplayer]
  );
  const isMultiplayerGame =
    typeof game?.isMultiplayer === "boolean"
      ? game.isMultiplayer
      : typeof initialGame?.isMultiplayer === "boolean"
        ? initialGame.isMultiplayer
        : false;
  const rulesTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevGameStateRef = useRef<string>('');
  const onBackRef = useRef(onBack);
  const gameId = game?.id;
  const countIncomingMessages = useCallback((messages: Game["chatMessages"] | undefined) => {
    if (!messages || !localPlayerId) return 0;
    return messages.filter((message) => message.playerId !== localPlayerId).length;
  }, [localPlayerId]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Keep onBackRef current
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  // Detect GAME_ENDED → WAITING_FOR_PLAYERS transition (all players clicked continue → rematch)
  useEffect(() => {
    const prev = prevGameStateRef.current;
    const curr = game?.state ?? '';
    prevGameStateRef.current = curr;
    if (prev === 'GAME_ENDED' && curr === 'WAITING_FOR_PLAYERS') {
      onBackRef.current?.({ preserveLobby: true, game });
    }
  }, [game?.state]);

  // Measure the bottom of the history panel so the BidDisplay can avoid overlapping it
  useEffect(() => {
    if (!isHistoryOpen || !historyPanelRef.current) {
      setHistoryPanelBottom(0);
      return;
    }

    let mounted = true;

    const measure = () => {
      const rect = historyPanelRef.current?.getBoundingClientRect();
      if (rect && mounted) {
        setHistoryPanelBottom(rect.bottom);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(historyPanelRef.current);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [isHistoryOpen]);

  // Auto-dismiss "player left" notification after 5 seconds
  useEffect(() => {
    if (!playerLeftNotification) return;
    const timer = setTimeout(() => setPlayerLeftNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [playerLeftNotification]);

  // Keep top-bar menus mutually exclusive on all devices
  useEffect(() => {
    if (isLanguageOpen) {
      setShowSettings(false);
      setIsHistoryOpen(false);
      setShowRulesTooltip(false);
      setShowChat(false);
    }
  }, [isLanguageOpen]);

  useEffect(() => {
    if (showSettings) {
      setIsHistoryOpen(false);
      setShowChat(false);
      if (isLanguageOpen) {
        setLanguageCloseSignal((s) => s + 1);
      }
    }
  }, [showSettings, isLanguageOpen]);

  useEffect(() => {
    if (isHistoryOpen) {
      setShowSettings(false);
      if (useMobileLayout) {
        setShowChat(false);
      }
      if (isLanguageOpen) {
        setLanguageCloseSignal((s) => s + 1);
      }
    }
  }, [isHistoryOpen, isLanguageOpen, useMobileLayout]);

  useEffect(() => {
    if (showChat) {
      setShowSettings(false);
      if (useMobileLayout) {
        setIsHistoryOpen(false);
      }
      if (isLanguageOpen) {
        setLanguageCloseSignal((s) => s + 1);
      }
    }
  }, [showChat, isLanguageOpen, useMobileLayout]);

  useEffect(() => {
    if (!showChat) return;
    setLastSeenChatCount(countIncomingMessages(game?.chatMessages));
  }, [showChat, game?.chatMessages, countIncomingMessages]);

  useEffect(() => {
    onChatStateChange?.(showChat, lastSeenChatCount);
  }, [showChat, lastSeenChatCount, onChatStateChange]);

  // ESC closes overlays in priority order (confirm → settings → chat → history)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showLeaveConfirm) {
        setShowLeaveConfirm(false);
        return;
      }
      if (showEndGameConfirm) {
        setShowEndGameConfirm(false);
        return;
      }
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showChat) {
        setShowChat(false);
        return;
      }
      if (isHistoryOpen) {
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showLeaveConfirm, showEndGameConfirm, showSettings, showChat, isHistoryOpen]);

  // Desktop: Enter opens chat (when not typing elsewhere / chat already open)
  useEffect(() => {
    if (useMobileLayout || !isMultiplayerGame) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      if (showChat || showSettings || showLeaveConfirm || showEndGameConfirm || showStatistics) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"], button')) return;
      e.preventDefault();
      audioService.playRaise();
      setShowChat(true);
      setLastSeenChatCount(countIncomingMessages(game?.chatMessages));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    useMobileLayout,
    isMultiplayerGame,
    showChat,
    showSettings,
    showLeaveConfirm,
    showEndGameConfirm,
    showStatistics,
    game?.chatMessages,
    countIncomingMessages,
  ]);

  const activeDealerLikePlayerId = game?.dealerId || null;
  const dealerReturnRafRef = useRef<number | null>(null);

  useEffect(() => {
    dealerChipPosRef.current = dealerChipPos;
  }, [dealerChipPos]);

  const cancelDealerReturn = useCallback(() => {
    if (dealerReturnRafRef.current !== null) {
      cancelAnimationFrame(dealerReturnRafRef.current);
      dealerReturnRafRef.current = null;
    }
  }, []);

  /** Closest point on a player card (viewport coords), preferring the boundary when inside. */
  const closestPointOnPlayerCard = useCallback((clientX: number, clientY: number, playerId: string) => {
    const cards = Array.from(
      document.querySelectorAll(`[data-player-card="${playerId}"]`)
    ) as HTMLElement[];
    const card =
      cards.find((el) => {
        const rect = el.getBoundingClientRect();
        return el.offsetParent !== null && rect.width > 0 && rect.height > 0;
      }) || null;
    if (!card) return null;

    const r = card.getBoundingClientRect();
    const { left, right, top, bottom } = r;

    const outside = clientX < left || clientX > right || clientY < top || clientY > bottom;
    if (outside) {
      return {
        x: Math.min(Math.max(clientX, left), right),
        y: Math.min(Math.max(clientY, top), bottom),
      };
    }

    const dl = clientX - left;
    const dr = right - clientX;
    const dt = clientY - top;
    const db = bottom - clientY;
    const nearest = Math.min(dl, dr, dt, db);
    if (nearest === dl) return { x: left, y: clientY };
    if (nearest === dr) return { x: right, y: clientY };
    if (nearest === dt) return { x: clientX, y: top };
    return { x: clientX, y: bottom };
  }, []);

  const getDealerHomePoint = useCallback((fromPoint?: { x: number; y: number } | null) => {
    if (!activeDealerLikePlayerId) return null;

    const origin = fromPoint ?? (dealerChipPosRef.current.visible ? dealerChipPosRef.current : null);
    if (origin) {
      const nearest = closestPointOnPlayerCard(origin.x, origin.y, activeDealerLikePlayerId);
      if (nearest) return nearest;
    }

    const anchors = Array.from(
      document.querySelectorAll(`[data-dealer-anchor="${activeDealerLikePlayerId}"]`)
    ) as HTMLElement[];
    const anchor =
      anchors.find((el) => {
        const rect = el.getBoundingClientRect();
        return el.offsetParent !== null && rect.bottom > 0 && rect.right > 0;
      }) || null;
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      return {
        x: anchorRect.left + anchorRect.width / 2,
        y: anchorRect.top + anchorRect.height / 2,
      };
    }

    const card = document.querySelector(`[data-player-card="${activeDealerLikePlayerId}"]`) as HTMLElement | null;
    if (card) {
      const r = card.getBoundingClientRect();
      return closestPointOnPlayerCard(r.left + r.width / 2, r.top, activeDealerLikePlayerId);
    }

    return null;
  }, [activeDealerLikePlayerId, closestPointOnPlayerCard]);

  /** Slowly ease the chip toward the dealer player (no hard snap). */
  const releaseDealerToPlayer = useCallback((fromPoint?: { x: number; y: number }) => {
    cancelDealerReturn();
    if (dealerDraggingRef.current) return;

    const start = fromPoint ?? (dealerChipPosRef.current.visible ? dealerChipPosRef.current : null);
    const target = getDealerHomePoint(start);
    if (!target) {
      setDealerChipPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    if (!start || !dealerChipPosRef.current.visible) {
      const next = { x: target.x, y: target.y, visible: true };
      dealerChipPosRef.current = next;
      setDealerChipPos(next);
      return;
    }

    const durationMs = 1600;
    const startX = start.x;
    const startY = start.y;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (dealerDraggingRef.current) {
        dealerReturnRafRef.current = null;
        return;
      }
      const t = Math.min(1, (now - startTime) / durationMs);
      // Smooth ease-out cubic — slow release into place
      const eased = 1 - (1 - t) ** 3;
      const next = {
        x: startX + (target.x - startX) * eased,
        y: startY + (target.y - startY) * eased,
        visible: true,
      };
      dealerChipPosRef.current = next;
      setDealerChipPos(next);
      if (t < 1) {
        dealerReturnRafRef.current = requestAnimationFrame(tick);
      } else {
        dealerReturnRafRef.current = null;
      }
    };

    dealerReturnRafRef.current = requestAnimationFrame(tick);
  }, [cancelDealerReturn, getDealerHomePoint]);

  const updateDealerChipPosition = useCallback((fromPoint?: { x: number; y: number }, animate = false) => {
    if (dealerDraggingRef.current) return;
    if (!activeDealerLikePlayerId) {
      cancelDealerReturn();
      setDealerChipPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    if (animate && dealerChipPosRef.current.visible) {
      releaseDealerToPlayer(fromPoint ?? dealerChipPosRef.current);
      return;
    }

    cancelDealerReturn();
    const home = getDealerHomePoint(fromPoint ?? (dealerChipPosRef.current.visible ? dealerChipPosRef.current : null));
    if (!home) {
      setDealerChipPos((prev) => ({ ...prev, visible: false }));
      return;
    }
    const next = { x: home.x, y: home.y, visible: true };
    dealerChipPosRef.current = next;
    setDealerChipPos(next);
  }, [activeDealerLikePlayerId, cancelDealerReturn, getDealerHomePoint, releaseDealerToPlayer]);

  const handleDealerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    cancelDealerReturn();
    dealerDragOffsetRef.current = {
      x: e.clientX - dealerChipPos.x,
      y: e.clientY - dealerChipPos.y,
    };
    dealerDraggingRef.current = true;
    setDealerChipDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDealerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dealerDraggingRef.current || !dealerDragOffsetRef.current) return;
    const next = {
      x: e.clientX - dealerDragOffsetRef.current.x,
      y: e.clientY - dealerDragOffsetRef.current.y,
      visible: true,
    };
    dealerChipPosRef.current = next;
    setDealerChipPos(next);
  };

  const handleDealerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dealerDraggingRef.current) return;
    dealerDraggingRef.current = false;
    dealerDragOffsetRef.current = null;
    setDealerChipDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    releaseDealerToPlayer({
      x: dealerChipPosRef.current.x,
      y: dealerChipPosRef.current.y,
    });
  };

  useEffect(() => {
    // Dealer / layout change: ease toward the new player
    updateDealerChipPosition(undefined, true);
    const timeout1 = window.setTimeout(() => updateDealerChipPosition(undefined, true), 60);
    const timeout2 = window.setTimeout(() => updateDealerChipPosition(undefined, true), 220);
    const handleMove = () => updateDealerChipPosition(undefined, false);
    window.addEventListener('resize', handleMove);
    window.addEventListener('scroll', handleMove, true);
    return () => {
      window.clearTimeout(timeout1);
      window.clearTimeout(timeout2);
      window.removeEventListener('resize', handleMove);
      window.removeEventListener('scroll', handleMove, true);
      cancelDealerReturn();
    };
  }, [updateDealerChipPosition, cancelDealerReturn, game?.roundNumber, activeDealerLikePlayerId, game?.players, useMobileLayout]);

  // Update audio service when mute state changes
  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  // Play game start sound when game first loads and starts
  useEffect(() => {
    if (!game || hasPlayedGameStart) return;
    
    // Play game start sound when game enters IN_PROGRESS state for the first time
    if (game.state === 'IN_PROGRESS' && game.roundNumber === 1 && previousGameState !== 'IN_PROGRESS') {
      console.log("Playing game start sound");
      audioService.playGameStart();
      setHasPlayedGameStart(true);

      // Show a tooltip pointing to the Info button for 3 seconds
      setShowRulesTooltip(true);
      if (rulesTooltipTimerRef.current) clearTimeout(rulesTooltipTimerRef.current);
      rulesTooltipTimerRef.current = setTimeout(() => setShowRulesTooltip(false), 3000);
      
      // Auto-open history panel on desktop when game starts
      if (!useMobileLayout) {
        setIsHistoryOpen(true);
        setOpenedForGameStart(true);
      }
    }
    
    setPreviousGameState(game.state);
  }, [game?.state, game?.roundNumber, previousGameState, hasPlayedGameStart, game, useMobileLayout]);

  // Clean up rules tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (rulesTooltipTimerRef.current) clearTimeout(rulesTooltipTimerRef.current);
    };
  }, []);

  // After game ends: auto-open history (last hand) if the player hasn't opened it yet
  const historyOpenedForGameEndRef = useRef(false);
  useEffect(() => {
    if (!game?.gameWinner) {
      historyOpenedForGameEndRef.current = false;
      return;
    }
    if (isHistoryOpen) {
      historyOpenedForGameEndRef.current = true;
    }
  }, [game?.gameWinner, isHistoryOpen]);

  useEffect(() => {
    if (!game?.gameWinner) return;
    const timer = setTimeout(() => {
      if (!historyOpenedForGameEndRef.current) {
        setIsHistoryOpen(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [game?.gameWinner]);

  // Play sounds based on game state changes
  useEffect(() => {
    if (!game) return;

    // Play new round sound when round number changes (new round starts)
    if (game.roundNumber > previousRoundNumber) {
      console.log('Playing new round sound - round:', game.roundNumber);
      audioService.playNewRound();
      setPreviousRoundNumber(game.roundNumber);
      // Reset round winner tracking so win sound can play for next round
      setPreviousRoundWinner('');
      // Reset bid tracking so raise sound can play for first bid of new round
      setPreviousBidKey('');
      
      // Track dice rolls for all players at start of new round
      game.players.forEach(player => {
        if (player.dice && player.dice.length > 0) {
          trackDiceRoll(player, player.dice, game);
        }
      });
    }

    // Play doubt/spot-on sound when action happens (using unique key with player ID and action type)
    // But don't play if there's a winner (win sound takes priority)
    if (game.lastActionType && game.lastActionPlayerId) {
      const currentActionKey = `${game.lastActionPlayerId}-${game.lastActionType}`;
      console.log("Action detected:", {
        currentActionKey,
        previousActionKey,
        lastActionType: game.lastActionType,
        lastActionPlayerId: game.lastActionPlayerId,
        winner: game.winner,
        gameWinner: game.gameWinner,
        isNewAction: currentActionKey !== previousActionKey,
      });

      if (currentActionKey !== previousActionKey) {
        // Don't play doubt/spot-on sound if someone won (win sound takes priority)
        const hasWinner = game.winner || game.gameWinner;
        if (!hasWinner) {
          if (game.lastActionType === "DOUBT") {
            console.log(
              "Playing doubt sound - player doubted:",
              game.lastActionPlayerId,
              "isOpponent:",
              game.lastActionPlayerId !== localPlayerId
            );
            audioService.playDoubt();
            
            // Track doubt statistics
            if (game.lastActionPlayerId && game.previousBid && game.lastActualCount !== undefined && game.lastBidQuantity !== undefined) {
              const doubter = game.players.find(p => p.id === game.lastActionPlayerId);
              if (doubter) {
                const targetBid = game.previousBid;
                const actualCount = game.lastActualCount;
                // Success means the doubter was correct (actual count < bid quantity)
                const success = actualCount < game.lastBidQuantity;
                trackDoubt(doubter, targetBid, actualCount, success, game);
              }
            }
          } else if (game.lastActionType === "SPOT_ON") {
            console.log(
              "Playing spot-on sound for player:",
              game.lastActionPlayerId
            );
            audioService.playSpotOn();
            
            // Track spot-on as a perfect doubt (always successful if action occurred)
            if (game.lastActionPlayerId && game.previousBid && game.lastActualCount !== undefined && game.lastBidQuantity !== undefined) {
              const caller = game.players.find(p => p.id === game.lastActionPlayerId);
              if (caller) {
                const targetBid = game.previousBid;
                const actualCount = game.lastActualCount;
                // Spot-on is always successful if it resulted in an action
                trackDoubt(caller, targetBid, actualCount, true, game);
              }
            }
          }
        } else {
          console.log(
            "Skipping doubt/spot-on sound - winner detected, win sound will play"
          );
        }
        // Always reset bid tracking after doubt/spot-on so next bid will trigger raise sound
        if (game.lastActionType === "DOUBT" || game.lastActionType === "SPOT_ON") {
          console.log('Resetting bid tracking after doubt/spot-on action');
          setPreviousBidKey('');
        }
        setPreviousActionKey(currentActionKey);
      }
    }

    // Play raise sound when a new bid is placed (currentBid changes)
    // Play for all players when bid is confirmed by the server
    if (game.currentBid) {
      const currentBidKey = `${game.currentBid.playerId}-${game.currentBid.quantity}-${game.currentBid.faceValue}`;
      console.log('Bid detected:', {
        currentBidKey,
        previousBidKey,
        isLocalPlayer: game.currentBid.playerId === localPlayerId,
        isNewBid: currentBidKey !== previousBidKey
      });
      
      if (currentBidKey !== previousBidKey) {
        // Play sound for all players (including local player) after server confirms bid
        console.log('Playing raise sound - new bid confirmed:', game.currentBid);
        audioService.playRaise();
      }
      setPreviousBidKey(currentBidKey);
    }

    // Play win sound when someone wins a round
    if (game.winner && game.winner !== previousRoundWinner) {
      console.log('Playing win sound for round winner:', game.winner);
      audioService.playWin();
      setPreviousRoundWinner(game.winner);
      
      // Track round end statistics
      const winnerPlayer = game.players.find(p => p.id === game.winner);
      if (winnerPlayer) {
        // Check if this was the last round (game winner is set)
        const wasLastRound = !!game.gameWinner;
        trackRoundEnd(winnerPlayer, game, wasLastRound);
      }
      
      // Check for matchpoint (6 tokens = 1 away from winning)
      if (winnerPlayer && winnerPlayer.winTokens === 6 && matchpointPlayerId !== game.winner) {
        console.log('Matchpoint reached for player:', winnerPlayer.name);
        setShowMatchpoint(true);
        setMatchpointPlayerId(game.winner);
        setTimeout(() => setShowMatchpoint(false), 3000);
      }
    }

    // Also play win sound when there's a game winner (final victory)
    if (game.gameWinner && game.gameWinner !== previousGameWinner) {
      console.log('Playing win sound for game winner:', game.gameWinner);
      audioService.playWin();
      setPreviousGameWinner(game.gameWinner);
      
      // Track game end statistics
      const gameWinnerPlayer = game.players.find(p => p.id === game.gameWinner);
      if (gameWinnerPlayer) {
        trackGameEnd(gameWinnerPlayer, game);
      }
    }
  }, [game, previousRoundNumber, previousActionKey, previousRoundWinner, previousGameWinner, previousBidKey, localPlayerId]);

  // Connect WebSocket for all games (all games are multiplayer)
  useEffect(() => {
    const currentGame = gameRef.current;
    console.log("WebSocket useEffect triggered:", {
      gameId,
      localPlayerId,
    });
    if (currentGame && gameId && localPlayerId) {
      console.log("Connecting WebSocket for game:", gameId);

      // Register AI players when game is loaded
      currentGame.players.forEach((player) => {
        if (player.name.startsWith("AI ") || player.name.startsWith("🧠AI ")) {
          aiService.registerAIPlayer(player.id, player.name);
          console.log("Registered AI player:", player.name, player.id);
        }
      });

      try {
        webSocketService.connect(gameId, {
          onGameUpdate: (updatedGame) => {
            console.log("WebSocket game update received:", updatedGame);
            if (localPlayerId && !updatedGame.players.some((p) => p.id === localPlayerId)) {
              onBack?.();
              return;
            }
            updatedGame.players.forEach((player) => {
              if (player.name.startsWith("AI ") || player.name.startsWith("🧠AI ")) {
                aiService.registerAIPlayer(player.id, player.name);
              }
            });
            setGame((prev) => {
              const next = withStableMultiplayerFlag(updatedGame);
              // In multiplayer with hidden dice, preserve already-fetched local player dice
              // so broadcasts don't wipe them out between getMyDice refreshes.
              if (prev && localPlayerId && next.isMultiplayer && !next.showAllDice && next.state === 'IN_PROGRESS') {
                const prevLocal = prev.players.find(p => p.id === localPlayerId);
                const nextLocal = next.players.find(p => p.id === localPlayerId);
                if (prevLocal && nextLocal && prevLocal.dice.length > 0 && prevLocal.dice.length === nextLocal.diceCount) {
                  return { ...next, players: next.players.map(p => p.id === localPlayerId ? { ...p, dice: prevLocal.dice } : p) };
                }
              }
              return next;
            });
          },
          onPlayerLeft: (playerName) => {
            setPlayerLeftNotification(playerName);
          },
          onGameCancelled: () => {
            onBack?.();
          },
        });
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        // Fallback to polling if WebSocket fails
        console.log("Falling back to polling for game");
      }

      // Cleanup on unmount
      return () => {
        console.log("Disconnecting WebSocket for game:", gameId);
        webSocketService.disconnect();
      };
    } else {
      console.log("WebSocket not connected - conditions not met:", {
        hasGame: !!currentGame,
        hasLocalPlayerId: !!localPlayerId,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, localPlayerId, withStableMultiplayerFlag]);

  // Handle bid display and betting delay when round ends or showAllDice changes
  useEffect(() => {
    if (game?.state === 'ROUND_ENDED' || game?.showAllDice) {
      setShowBidDisplay(false);
      setBettingDisabled(true);
      const timer = setTimeout(() => {
        setShowBidDisplay(true);
        setBettingDisabled(false);
        // Clear round tracking when the delay ends and new round starts
        if (game) {
          aiService.clearRoundTracking(game.id);
        }
      }, 8000); // 8 second delay
      return () => clearTimeout(timer);
    } else {
      setShowBidDisplay(true);
      setBettingDisabled(false);
      // Also clear round tracking when showAllDice becomes false (new round started)
      if (game) {
        aiService.clearRoundTracking(game.id);
      }
    }
  }, [game]);

  // In multiplayer the broadcast response hides all dice. Fetch own dice so the local
  // player can always see their own hand. Only refetch when round / hand size / reveal changes
  // (not on every turn change — that wasted traffic).
  const localDiceCount = game?.players.find((p) => p.id === localPlayerId)?.diceCount;
  const localDiceLength = game?.players.find((p) => p.id === localPlayerId)?.dice.length ?? 0;
  useEffect(() => {
    if (!game || !localPlayerId || !isMultiplayerGame) return;
    if (game.showAllDice) return;
    if (game.state !== 'IN_PROGRESS') return;
    if (localDiceLength > 0 && localDiceLength === localDiceCount) return;

    let cancelled = false;
    gameApi.getMyDice(game.id, localPlayerId).then((myDice) => {
      if (cancelled) return;
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === localPlayerId ? { ...p, dice: myDice } : p
          ),
        };
      });
    }).catch(() => { /* ignore – dice will be fetched on next update */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, game?.state, game?.showAllDice, game?.roundNumber, localPlayerId, isMultiplayerGame, localDiceCount, localDiceLength]);

  // Persist last known game for snappy refresh restore (session-scoped)
  useEffect(() => {
    if (!game || !localPlayerId) return;
    if (game.state !== 'IN_PROGRESS' && game.state !== 'ROUND_ENDED') return;
    saveGameSnapshot(game, localPlayerId);
  }, [game, localPlayerId]);

  // Heartbeat so current player gets reconnect window; if tab closed, after 60s they're treated as left
  useEffect(() => {
    if (!gameId || !localPlayerId || !isMultiplayerGame) return;
    if (game.state !== 'IN_PROGRESS' && game.state !== 'ROUND_ENDED') return;
    gameApi.heartbeat(gameId, localPlayerId).catch(() => {});
    const interval = setInterval(() => {
      gameApi.heartbeat(gameId, localPlayerId).catch(() => {});
    }, 15_000);
    return () => clearInterval(interval);
  }, [gameId, localPlayerId, isMultiplayerGame, game?.state]);

  // Polling fallback — aggressive only when WebSocket is down; otherwise a slow safety net
  useEffect(() => {
    if (!gameId || !localPlayerId) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollOnce = async () => {
      try {
        const updatedGame = await gameApi.getMultiplayerGame(gameId, localPlayerId);
        if (cancelled) return;

        if (localPlayerId && !updatedGame.players.some((p) => p.id === localPlayerId)) {
          onBack?.();
          return;
        }

        setGame((prev) => {
          const next = withStableMultiplayerFlag(updatedGame);
          if (prev && localPlayerId && next.isMultiplayer && !next.showAllDice && next.state === 'IN_PROGRESS') {
            const prevLocal = prev.players.find(p => p.id === localPlayerId);
            const nextLocal = next.players.find(p => p.id === localPlayerId);
            if (prevLocal && nextLocal && prevLocal.dice.length > 0 && prevLocal.dice.length === nextLocal.diceCount) {
              return { ...next, players: next.players.map(p => p.id === localPlayerId ? { ...p, dice: prevLocal.dice } : p) };
            }
          }
          return next;
        });
      } catch (err: unknown) {
        console.error("Error polling game updates:", err);
        if (err && typeof err === 'object' && 'response' in err) {
          const axErr = err as { response?: { status?: number } };
          if (axErr.response?.status === 404) {
            onBack?.();
          }
        }
      }
    };

    const schedule = () => {
      const delay = webSocketService.isConnected() ? 15_000 : 2_000;
      timeoutId = setTimeout(async () => {
        await pollOnce();
        if (!cancelled) schedule();
      }, delay);
    };

    // Immediate sync on mount / reconnect, then back off when WS is healthy
    pollOnce().then(() => {
      if (!cancelled) schedule();
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, localPlayerId, withStableMultiplayerFlag]);

  // Clear pending action when round ends (actual tracking is done in the next useEffect for all actions)
  useEffect(() => {
    if (!pendingAction || !game) return;
    
    // Check if we have the result (round ended with elimination data)
    if (game.lastEliminatedPlayerId && game.lastActionPlayerId === pendingAction.playerId) {
      // Clear the pending action (tracking is handled by the all-actions useEffect below)
      setPendingAction(null);
    }
  }, [pendingAction, game, game?.lastEliminatedPlayerId, game?.lastActionPlayerId]);

  // Track round number changes but DON'T clear the action tracker
  // (We need to keep the tracker so we don't re-track the same action in the new round)
  useEffect(() => {
    if (!game) return;
    
    // Just update the previous round number for logging purposes
    if (game.roundNumber !== previousRoundNumber) {
      console.log('🔄 Round changed from', previousRoundNumber, 'to', game.roundNumber);
      setPreviousRoundNumber(game.roundNumber);
    }
  }, [game?.roundNumber, previousRoundNumber, game]);

  // Track doubt / spot-on reveals into per-game stats (correct spot-ons included)
  useEffect(() => {
    if (!game) return;
    if (game.lastActionType !== 'DOUBT' && game.lastActionType !== 'SPOT_ON') return;
    if (game.lastActualCount === undefined) return;

    const eventId = buildRevealEventId(game);
    if (!eventId || lastTrackedAction === eventId) return;

    const recorded = recordRevealStats(game);
    if (recorded) {
      setLastTrackedAction(eventId);
    }
  }, [game, lastTrackedAction]);

  const createGame = async (playerNames: string[], userUsername: string) => {
    setIsLoading(true);
    setError("");
    try {
      const request: CreateGameRequest = { playerNames };
      const gameResponse = await gameApi.createGame(request);
      setGame(withStableMultiplayerFlag(gameResponse));

      // Find the human player (first player in AI mode, or by username)
      const humanPlayer =
        gameResponse.players.find((p) => p.name === userUsername) ||
        gameResponse.players[0];
      setLocalPlayerId(humanPlayer.id);

      // Register AI players
      gameResponse.players.forEach((player) => {
        if (player.name.startsWith("AI ") || player.id !== humanPlayer.id) {
          aiService.registerAIPlayer(player.id, player.name);
        }
      });
    } catch (err) {
      setError("Failed to create game");
      console.error("Error creating game:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshGame = useCallback(async () => {
    if (!game) return;

    try {
      const gameResponse = await gameApi.getGame(game.id, localPlayerId);
      setGame(withStableMultiplayerFlag(gameResponse));
    } catch (err) {
      console.error("Error refreshing game:", err);
    }
  }, [game, localPlayerId]);

  const handleAction = async (action: string, data?: any) => {
    if (!game || !localPlayerId) return;

    setIsLoading(true);
    setError("");

    try {
      // Track statistics for user actions
      const localPlayer = getLocalPlayer();
      if (localPlayer) {
        if (action === 'bid' && data) {
          // Track bid
          const bid = {
            playerId: localPlayerId,
            quantity: data.quantity,
            faceValue: data.faceValue,
            type: 'RAISE'
          };
          trackBid(bid, game);
        } else if (action === 'doubt' && game.currentBid) {
          // Doubt tracking happens when the result comes back from the server
          console.log('Doubt action initiated, will track when result is received');
        } else if (action === 'spoton' && game.currentBid) {
          // Spot-on tracking happens when the result comes back from the server
          console.log('Spot-on action initiated, will track when result is received');
        }
      }

      // Use WebSocket for multiplayer; fallback to REST if socket isn't connected yet
      const actionName =
        action === "bid"
          ? "BID"
          : action === "spotOn"
          ? "SPOT_ON"
          : action.toUpperCase();

      const sentViaWebSocket = webSocketService.sendAction(actionName, data, localPlayerId);

      if (!sentViaWebSocket) {
        console.warn('⚠️ WebSocket unavailable, falling back to REST for action:', action);
        if (action === 'bid' && data) {
          const response = await gameApi.makeBid(game.id, {
            playerId: localPlayerId,
            quantity: data.quantity,
            faceValue: data.faceValue,
          });
          if (response?.game) {
            setGame(withStableMultiplayerFlag(response.game));
          }
        } else if (action === 'doubt') {
          const response = await gameApi.doubtBid(game.id, { playerId: localPlayerId });
          if (response?.game) {
            setGame(withStableMultiplayerFlag(response.game));
          }
        } else if (action === 'spotOn') {
          const response = await gameApi.spotOn(game.id, { playerId: localPlayerId });
          if (response?.game) {
            setGame(withStableMultiplayerFlag(response.game));
          }
        }
      }

      // Track doubt/spot-on actions immediately when button is pressed
      if (action === "doubt" || action === "spotOn") {
        setPendingAction({
          playerId: localPlayerId,
          actionType: action === "spotOn" ? "SPOT_ON" : "DOUBT"
        });

        setBettingDisabled(true);

        // Re-enable betting after 15 seconds
        setTimeout(() => {
          setBettingDisabled(false);
        }, 15000);
      }

      // The game state will be updated via WebSocket subscription
    } catch (err: any) {
      // Transient blips: refresh quietly; don't flash a 503 banner if the action may have landed.
      if (isTransientHttpError(err)) {
        console.warn(`Transient error with ${action}, refreshing state:`, err);
        if (game) {
          refreshGame();
        }
      } else {
        const errorMessage = userFacingApiError(err, `Failed to ${action}`);
        setError(errorMessage);
        console.error(`Error with ${action}:`, err);
        if (game) {
          refreshGame();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalPlayer = (): Player | null => {
    if (!game || !localPlayerId) return null;
    return game.players.find((p) => p.id === localPlayerId) || null;
  };

  const getOpponentsInTurnOrder = (): Player[] => {
    if (!game || !localPlayerId) return [];

    // Find the local player's index in the players array
    const localPlayerIndex = game.players.findIndex(
      (p) => p.id === localPlayerId
    );
    if (localPlayerIndex === -1)
      return game.players.filter((p) => p.id !== localPlayerId);

    // Create a new array starting from the player after the local player
    const reorderedPlayers: Player[] = [];
    for (let i = 1; i < game.players.length; i++) {
      const playerIndex = (localPlayerIndex + i) % game.players.length;
      reorderedPlayers.push(game.players[playerIndex]);
    }

    return reorderedPlayers;
  };

  // AI logic is now handled by the backend - no frontend AI turn handler needed

  const isMyTurn = (): boolean => {
    return game?.currentPlayerId === localPlayerId;
  };

  if (!game) {
    return (
      <GameSetup
        onCreateGame={createGame}
        onMultiplayer={() => {}}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  const gameWinnerPlayer = game.gameWinner
    ? game.players.find((p) => p.id === game.gameWinner)
    : undefined;
  const isCurrentPlayerGameWinner = game.gameWinner === localPlayerId;
  const playersContinued = game.playersContinued ?? [];
  const currentPlayerHasContinued = playersContinued.includes(localPlayerId);
  const handleGameEndContinue = async () => {
    if (!game.id || !localPlayerId) {
      onBack ? onBack() : window.location.reload();
      return;
    }
    try {
      await gameApi.playerContinue(game.id, localPlayerId);
    } catch (e) {
      console.error('Failed to record continue:', e);
      onBack ? onBack() : window.location.reload();
    }
  };

  const localPlayer = getLocalPlayer();
  const opponentsInTurnOrder = getOpponentsInTurnOrder();
  const currentBidFromActivePlayer =
    game.currentBid && game.players.some((p) => p.id === game.currentBid!.playerId)
      ? game.currentBid
      : null;
  const shouldShowPreviousBid = !!currentBidFromActivePlayer;
  const roundEnded = !!(game.showAllDice || game.state === "ROUND_ENDED" || !!game.gameWinner);
  const snugMobileLayout = useMobileLayout && opponentsInTurnOrder.length >= 3;

  return (
    <div ref={tableRef} className="game-table relative w-full h-screen overflow-hidden select-none text-[#f7f3e8]" style={{ backgroundColor: 'var(--felt-bg)' }}>
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-30"
        style={{ backgroundImage: "url(resources/bg.webp)" }}
      />

      {/* Mobile/Tablet Layout - Clean Vertical Stack with fixed bottom elements */}
      <div className="lg:hidden flex flex-col h-screen">
        {/* Scrollable content area - opponents and results/bid display */}
        <div className={`flex-1 overflow-y-auto pt-14 ${snugMobileLayout ? "pb-72" : "pb-80"}`}>
          {/* Opponent Players - Top section with natural flow, below header */}
          <div className={snugMobileLayout ? "px-2" : "px-3"}>
            <div className={`grid grid-cols-2 items-start ${snugMobileLayout ? "gap-1" : "gap-2"}`}>
              {opponentsInTurnOrder.map((opponent, index) => {
                const previousRoundPlayer = game.previousRoundPlayers?.find(
                  (p) => p.id === opponent.id
                );
                const originalIndex = game.players.findIndex(
                  (p) => p.id === opponent.id
                );
                return (
                  <OpponentPlayer
                    key={opponent.id}
                    player={opponent}
                    position={index}
                    isMyTurn={game.currentPlayerId === opponent.id}
                    isDealer={false}
                    showDice={
                      game.showAllDice ||
                      game.state === "ROUND_ENDED" ||
                      game.winner !== null
                    }
                    previousBid={shouldShowPreviousBid ? game.previousBid : null}
                    totalOpponents={opponentsInTurnOrder.length}
                    previousRoundPlayer={previousRoundPlayer}
                    isMobile={useMobileLayout}
                    playerIndex={originalIndex}
                    isRoundEnded={roundEnded}
                    isRoundLoser={game.lastEliminatedPlayerId === opponent.id}
                    isRoundWinner={game.winner === opponent.id}
                    compactMobile={snugMobileLayout}
                    landscapeMobile={useMobileLayout && isLandscape}
                  />
                );
              })}
            </div>
          </div>

          {/* Mobile Bid Display - Below opponents (when no results showing) */}
          {/* When the info panel is open, render as a fixed element below the panel so it isn't covered */}
          {currentBidFromActivePlayer &&
            game.state !== "ROUND_ENDED" &&
            !game.showAllDice &&
            showBidDisplay &&
            !tabletLandscapeStack &&
            (() => {
              const bidNode = (
                <BidDisplay
                  currentBid={currentBidFromActivePlayer}
                  currentPlayerId={game.currentPlayerId}
                  players={game.players}
                  roundNumber={game.roundNumber}
                  winner={game.winner || undefined}
                  isMobile={useMobileLayout}
                  stacked={false}
                />
              );
              return isHistoryOpen && historyPanelBottom > 0 ? (
                <div
                  className={`fixed left-0 right-0 z-40 ${snugMobileLayout ? "px-1.5" : "px-2"}`}
                  style={{ top: historyPanelBottom + 8 }}
                >
                  {bidNode}
                </div>
              ) : (
                <div
                  className={`${snugMobileLayout ? "px-1.5 py-0.5" : "px-2 py-1"} ${portraitTablet ? "flex justify-center" : ""}`}
                >
                  {bidNode}
                </div>
              );
            })()}

          {/* Mobile Game Result Display - Below opponents */}
          {game.showAllDice && (
            <div className={snugMobileLayout ? "px-1.5 py-0.5" : "px-2 py-1"}>
              <GameResultDisplay
                game={game}
                currentPlayerId={localPlayerId}
                variant="inline"
                compact={snugMobileLayout}
              />
            </div>
          )}

        </div>

        {/* Tablet landscape: bid readout centered above bidding controls, both above local player */}
        {tabletLandscapeStack &&
          showBidDisplay &&
          !game.showAllDice &&
          game.state !== "ROUND_ENDED" && (
            <div
              className="fixed left-1/2 z-[1000] flex flex-col items-center gap-1 pointer-events-none bottom-[5.5rem] w-[min(100vw-1rem,28rem)] max-w-[min(100vw-1rem,28rem)] px-2 -translate-x-1/2"
            >
              {currentBidFromActivePlayer && (
                <div className="pointer-events-auto w-full">
                  <BidDisplay
                    currentBid={currentBidFromActivePlayer}
                    currentPlayerId={game.currentPlayerId}
                    players={game.players}
                    roundNumber={game.roundNumber}
                    winner={game.winner || undefined}
                    isMobile={useMobileLayout}
                    stacked
                  />
                </div>
              )}
              {localPlayer && isMyTurn() && !localPlayer.eliminated && (
                <div className="pointer-events-auto w-full">
                  <BidSelector
                    currentBid={game.currentBid}
                    previousBid={game.previousBid}
                    onBidSelect={(quantity, faceValue) =>
                      handleAction("bid", { quantity, faceValue })
                    }
                    onDoubt={() => handleAction("doubt")}
                    onSpotOn={() => handleAction("spotOn")}
                    disabled={isLoading || bettingDisabled}
                    isMobile={useMobileLayout}
                    stacked
                  />
                </div>
              )}
            </div>
          )}

        {/* Bid Selector - Fixed above local player (only when active turn); not when tablet landscape stack handles it */}
        {showBidDisplay &&
          localPlayer &&
          isMyTurn() &&
          !localPlayer.eliminated &&
          !tabletLandscapeStack && (
            <div
              className={`fixed left-0 right-0 z-[45] flex bottom-24 ${portraitTablet ? "justify-center" : ""} ${snugMobileLayout ? "px-1.5" : "px-2"}`}
            >
              <BidSelector
                currentBid={game.currentBid}
                previousBid={game.previousBid}
                onBidSelect={(quantity, faceValue) =>
                  handleAction("bid", { quantity, faceValue })
                }
                onDoubt={() => handleAction("doubt")}
                onSpotOn={() => handleAction("spotOn")}
                disabled={isLoading || bettingDisabled}
                isMobile={useMobileLayout}
              />
            </div>
          )}

        {/* Local Player - Fixed to bottom */}
        {localPlayer && (
          <div
            className="fixed bottom-0 left-0 right-0 z-[1200]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <LocalPlayer
              player={localPlayer}
              isMyTurn={isMyTurn()}
              isDealer={false}
              onAction={handleAction}
              disabled={isLoading || bettingDisabled}
              currentBid={game.currentBid}
              previousBid={shouldShowPreviousBid ? game.previousBid : null}
              isMobile={useMobileLayout}
              isRoundEnded={roundEnded}
              isRoundLoser={game.lastEliminatedPlayerId === localPlayer.id}
              isRoundWinner={game.winner === localPlayer.id}
              landscapeMobile={useMobileLayout && isLandscape}
            />
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        {/* Current bid — independent, centered above the dock */}
        {showBidDisplay &&
          game.state !== "ROUND_ENDED" &&
          !game.showAllDice &&
          !game.gameWinner && (
            <BidDisplay
              currentBid={currentBidFromActivePlayer}
              currentPlayerId={game.currentPlayerId}
              players={game.players}
              roundNumber={game.roundNumber}
              winner={game.winner || undefined}
              isMobile={false}
              draggable
              statusLabel={
                localPlayer?.eliminated
                  ? t("game.waitingForNextRound")
                  : isMyTurn()
                    ? t("game.yourTurn")
                    : (() => {
                        const turnPlayer = game.players.find(
                          (p) => p.id === game.currentPlayerId
                        );
                        return turnPlayer
                          ? t("game.playersTurn", { name: turnPlayer.name })
                          : t("game.waitingForTurn");
                      })()
              }
            />
          )}

        {/* Local player + bid selector — one centered dock */}
        {localPlayer && !game.gameWinner && (
          <DesktopPlayerDock
            playerSlot={
              <LocalPlayer
                player={localPlayer}
                isMyTurn={isMyTurn()}
                isDealer={false}
                onAction={handleAction}
                disabled={isLoading || bettingDisabled}
                currentBid={game.currentBid}
                previousBid={shouldShowPreviousBid ? game.previousBid : null}
                isRoundEnded={roundEnded}
                isRoundLoser={game.lastEliminatedPlayerId === localPlayer.id}
                isRoundWinner={game.winner === localPlayer.id}
                compactDesktopLandscape={isLandscape}
                docked
              />
            }
          >
            {isMyTurn() && !localPlayer.eliminated && showBidDisplay && (
              <BidSelector
                currentBid={game.currentBid}
                previousBid={shouldShowPreviousBid ? game.previousBid : null}
                onBidSelect={(quantity, faceValue) =>
                  handleAction("bid", { quantity, faceValue })
                }
                onDoubt={() => handleAction("doubt")}
                onSpotOn={() => handleAction("spotOn")}
                disabled={isLoading || bettingDisabled}
                isMobile={false}
                stacked
                compactDesktopLandscape={isLandscape}
              />
            )}
          </DesktopPlayerDock>
        )}

        {/* Opponents */}
        {opponentsInTurnOrder.map((opponent, index) => {
          const previousRoundPlayer = game.previousRoundPlayers?.find(
            (p) => p.id === opponent.id
          );
          const originalIndex = game.players.findIndex(
            (p) => p.id === opponent.id
          );
          console.log(`GameTable - Opponent ${opponent.name}:`, {
            showAllDice: game.showAllDice,
            state: game.state,
            winner: game.winner,
            playerIndex: originalIndex,
            previousRoundPlayer: previousRoundPlayer
              ? {
                  id: previousRoundPlayer.id,
                  name: previousRoundPlayer.name,
                  dice: previousRoundPlayer.dice,
                }
              : null,
            previousRoundPlayers: game.previousRoundPlayers?.map((p) => ({
              id: p.id,
              name: p.name,
              dice: p.dice,
            })),
          });
          return (
            <OpponentPlayer
              key={opponent.id}
              player={opponent}
              position={index}
              isMyTurn={game.currentPlayerId === opponent.id}
              isDealer={false}
              showDice={
                game.showAllDice ||
                game.state === "ROUND_ENDED" ||
                game.winner !== null
              }
              previousBid={shouldShowPreviousBid ? game.previousBid : null}
              totalOpponents={opponentsInTurnOrder.length}
              previousRoundPlayer={previousRoundPlayer}
              playerIndex={originalIndex}
              isRoundEnded={roundEnded}
              isRoundLoser={game.lastEliminatedPlayerId === opponent.id}
              isRoundWinner={game.winner === opponent.id}
              compactDesktopLandscape={isLandscape}
            />
          );
        })}
      </div>

      {/* Game Result Display - Desktop only */}
      <div className="hidden lg:block">
        <GameResultDisplay game={game} currentPlayerId={localPlayerId} />
      </div>

      {/* Error Display - Only show critical errors, not WebSocket / transient noise */}
      {error &&
        !error.toLowerCase().includes("stomp") &&
        !error.toLowerCase().includes("websocket") &&
        !error.toLowerCase().includes("connection") &&
        !/^request failed with status code (502|503|504)/i.test(error) && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 border px-4 py-2 rounded-xl z-50" style={{ backgroundColor: 'var(--game-surface)', color: 'var(--game-text)', borderColor: 'var(--game-border-strong)' }}>
            {error}
          </div>
        )}

      {/* Top Header Bar - Absolute positioning for both mobile and desktop */}
      <div className="absolute top-0 left-0 right-0 z-50 p-2 md:p-4">
        <div className="mx-auto rounded-full menu-shell menu-header-shell shadow-2xl">
          <div className="menu-header-row">
          <div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="rounded-full menu-pill menu-pill-fixed menu-pill-icon font-medium shadow transition-all duration-200"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>

            {/* Settings gear button */}
            <div className="relative" ref={gameSettingsAnchorRef}>
              <button
                type="button"
                onClick={() =>
                  setShowSettings((prev) => {
                    const next = !prev;
                    if (next) {
                      setIsHistoryOpen(false);
                      if (isLanguageOpen) {
                        setLanguageCloseSignal((s) => s + 1);
                      }
                    }
                    return next;
                  })
                }
                className="rounded-full menu-pill menu-pill-fixed menu-pill-icon font-medium shadow transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px]"
                aria-label="Settings"
                aria-expanded={showSettings}
              >
                ⚙
              </button>
              <SettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onLeaveGame={() => setShowLeaveConfirm(true)}
                leaveGameLabel={t("game.leaveGame")}
                onEndGame={isMultiplayerGame && game.players[0]?.id === localPlayerId ? () => setShowEndGameConfirm(true) : undefined}
                endGameLabel={t("game.endGame")}
                mobileCentered={useMobileLayout}
                anchorRef={gameSettingsAnchorRef}
              />
            </div>

            {/* Chat button - only for multiplayer */}
            {isMultiplayerGame && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    audioService.playRaise();
                    setShowChat((prev) => {
                      const next = !prev;
                      if (next) {
                        setLastSeenChatCount(countIncomingMessages(game.chatMessages));
                      }
                      return next;
                    });
                  }}
                  className={`rounded-full menu-pill menu-pill-fixed font-medium shadow transition-all duration-200 touch-manipulation min-h-[44px] relative flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 ${
                    useMobileLayout ? 'menu-pill-icon min-w-[44px]' : 'menu-pill-label px-3'
                  } ${
                    Math.max(0, countIncomingMessages(game.chatMessages) - lastSeenChatCount) > 0 ? 'animate-pulse' : ''
                  }`}
                  aria-label={useMobileLayout ? t('game.chat') : `${t('game.pressEnterToChat')} Enter ${t('game.pressEnterToChatSuffix')}`}
                  aria-expanded={showChat}
                  style={{
                    ...(showChat ? { backgroundColor: 'var(--menu-button-hover-bg)', borderColor: 'var(--game-border-strong)' } : {})
                  }}
                >
                  {useMobileLayout ? (
                    <span className="w-5 h-5 transition-transform" style={{ color: showChat ? 'var(--game-accent-text)' : 'var(--menu-button-text)' }}>
                      <ChatIcon />
                    </span>
                  ) : showChat ? (
                    <span className="w-5 h-5" style={{ color: 'var(--game-accent-text)' }}>
                      <ChatIcon />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[13px] whitespace-nowrap" style={{ color: 'var(--menu-button-text)' }}>
                      <span>{t('game.pressEnterToChat')}</span>
                      <kbd
                        className="inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1 rounded border text-[11px] font-semibold leading-none"
                        style={{
                          borderColor: 'var(--menu-border)',
                          backgroundColor: 'var(--menu-button-hover-bg)',
                          color: 'var(--menu-button-text)',
                        }}
                        aria-hidden
                      >
                        ↵
                      </kbd>
                      <span>{t('game.pressEnterToChatSuffix')}</span>
                    </span>
                  )}
                  {(() => {
                    const unread = Math.max(0, countIncomingMessages(game.chatMessages) - lastSeenChatCount);
                    return unread > 0 ? (
                      <span 
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-lg animate-bounce-in"
                        style={{
                          animation: 'bounce-in 0.5s ease-out, pulse-red 2s ease-in-out 0.5s infinite'
                        }}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : null;
                  })()}
                </button>
                <ChatMessageToasts
                  messages={game.chatMessages ?? []}
                  localPlayerId={localPlayerId}
                  chatOpen={showChat}
                  compact={useMobileLayout}
                />
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  if (!isHistoryOpen) {
                    setShowSettings(false);
                    if (isLanguageOpen) {
                      setLanguageCloseSignal((s) => s + 1);
                    }
                  }
                  audioService.playRaise();
                  setIsHistoryOpen(!isHistoryOpen);
                  setShowRulesTooltip(false);
                }}
                className="rounded-full menu-pill menu-pill-fixed menu-pill-label font-medium shadow transition-all duration-200 min-w-0 max-w-[42vw] md:max-w-none overflow-hidden text-ellipsis"
              >
                {t("game.gameInfo")}
              </button>
              {showRulesTooltip && (
                <div className="absolute right-0 top-full mt-2 z-50 animate-bounce-in pointer-events-none">
                  <div className="relative bg-[#f5d98f] text-[#3f2f16] text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                    <span className="absolute -top-1.5 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-[#f5d98f]" />
                    {t("game.viewRulesHere")}
                  </div>
                </div>
              )}
            </div>

          <LanguageSelector
            compact
            closeSignal={languageCloseSignal}
            onOpenChange={setIsLanguageOpen}
            buttonClassName="menu-pill menu-pill-fixed menu-pill-label shadow text-[13px]"
          />
          </div>
        </div>

        {/* History + chat panels - desktop */}
        {(!useMobileLayout && (isHistoryOpen || (isMultiplayerGame && showChat))) && (
          <div className="mt-1 md:mt-2 hidden lg:flex absolute top-36 right-4 z-40 items-start justify-end gap-3">
            {isMultiplayerGame && showChat && (
              <ChatPanel
                isOpen={showChat}
                onClose={() => setShowChat(false)}
                messages={game.chatMessages ?? []}
                playerId={localPlayerId}
                playerName={game.players.find(p => p.id === localPlayerId)?.name ?? ''}
                gameId={game.id}
                isMobile={false}
                variant="inline"
                playerColors={game.players.reduce((acc, player) => {
                  acc[player.id] = player.color ? getPlayerColorFromString(player.color) : '#f5d98f';
                  return acc;
                }, {} as Record<string, string>)}
              />
            )}
            {isHistoryOpen && (
              <div ref={historyPanelRef}>
                <HistoryPanel
                  game={game}
                  isOpen={isHistoryOpen}
                  onClose={() => setIsHistoryOpen(false)}
                  openedFromGameStart={openedForGameStart}
                  onClearGameStartOpen={() => setOpenedForGameStart(false)}
                />
              </div>
            )}
          </div>
        )}
        
        {/* History Panel - Mobile/Tablet: Below header, centered */}
        {isHistoryOpen && (
          <div ref={historyPanelRef} className="mt-1 md:mt-2 lg:hidden flex justify-end">
            <HistoryPanel
              game={game}
              isOpen={isHistoryOpen}
              onClose={() => setIsHistoryOpen(false)}
              openedFromGameStart={openedForGameStart}
              onClearGameStartOpen={() => setOpenedForGameStart(false)}
            />
          </div>
        )}
      </div>

      {/* Leave Game Confirmation - always on top, styled like bid element */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4 bg-black/50">
          <div
            className="border-2 rounded-xl px-4 py-3 md:px-6 md:py-5 shadow-2xl min-w-[240px] max-w-md"
            style={{ backgroundColor: 'var(--game-surface)', borderColor: 'var(--game-border-strong)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-sm md:text-lg mb-3 md:mb-5" style={{ color: 'var(--game-accent-text)' }}>
              {t("game.leaveConfirmMessage")}
            </p>
            <div className="flex gap-2 md:gap-3 justify-center">
              <button
                onClick={async () => {
                  setShowLeaveConfirm(false);
                  if (gameId && localPlayerId) {
                    try {
                      await gameApi.leaveGame(gameId, localPlayerId);
                    } catch (err) {
                      console.error("Leave game failed:", err);
                    }
                  }
                  onBack?.();
                }}
                className="px-4 py-1.5 md:px-5 md:py-2 rounded-lg font-semibold text-sm md:text-base border transition-colors"
                style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)', color: 'var(--game-accent-text)' }}
              >
                {t("game.leaveConfirmLeave")}
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="px-4 py-1.5 md:px-5 md:py-2 rounded-lg font-semibold text-sm md:text-base border-2 transition-colors"
                style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border)', color: 'var(--game-text)' }}
              >
                {t("game.leaveConfirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game end overlay — keeps top bar + history visible */}
      {game.gameWinner && (
        <div className="absolute inset-0 z-[35] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/50" />
          {currentPlayerHasContinued ? (
            <div
              className="relative z-10 text-center rounded-3xl shadow-2xl border-4 p-10 max-w-md mx-4 pointer-events-auto"
              style={{
                backgroundColor: '#0f2a1b',
                borderColor: '#8a6a1d',
              }}
            >
              <div className="text-5xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-white mb-6">{t('game.waitingForOthers')}</h2>
              <div className="space-y-3">
                {game.players
                  .filter((p) => !p.name.startsWith('AI ') && !p.name.startsWith('🧠AI '))
                  .map((p) => {
                    const hasContinued = playersContinued.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
                          hasContinued ? 'bg-[#1f3f2b] text-[#f5d98f]' : 'bg-[#163124] text-[#c6d4cb]'
                        }`}
                      >
                        <span className="text-xl">{hasContinued ? '✅' : '⏳'}</span>
                        <span className="font-semibold">{p.name}</span>
                        {!hasContinued && (
                          <span className="ml-auto text-xs opacity-70">{t('game.waitingForPlayerLabel')}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : isCurrentPlayerGameWinner ? (
            <div
              className={`relative z-10 text-center rounded-2xl shadow-xl border px-8 py-8 max-w-md mx-4 pointer-events-auto ${animationsEnabled && !isDesktop ? 'animate-bounce-in' : ''}`}
              style={{
                backgroundColor: 'var(--game-surface)',
                borderColor: 'var(--game-border)',
              }}
            >
              {animationsEnabled && !isDesktop && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                  {['👑', '🎊', '✨', '🎉', '🌟', '🎈'].map((emoji, i) => (
                    <span
                      key={i}
                      className="absolute animate-float"
                      style={{
                        left: `${10 + i * 14}%`,
                        top: `${8 + (i % 3) * 20}%`,
                        animationDelay: `${i * 0.2}s`,
                        fontSize: '22px',
                        opacity: 0.85,
                      }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
              <div
                className={`mb-3 ${animationsEnabled && !isDesktop ? 'animate-float' : ''}`}
                style={{ fontSize: isDesktop ? '2.5rem' : '5.5rem', lineHeight: 1 }}
              >
                👑
              </div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--game-accent-text)' }}>
                {t('game.dobbelkoning')}
              </h1>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--game-text)' }}>
                {gameWinnerPlayer?.name || t('common.unknownPlayer')}
              </h2>
              <div
                className="text-base font-semibold rounded-xl px-4 py-2.5 mb-6 border"
                style={{
                  color: 'var(--game-accent-text)',
                  backgroundColor: 'var(--game-surface-soft)',
                  borderColor: 'var(--game-border-strong)',
                }}
              >
                {t('game.result.youWinGame')}
              </div>
              <button
                onClick={handleGameEndContinue}
                className="px-6 py-3 rounded-xl font-bold text-base shadow transition-colors border"
                style={{
                  backgroundColor: 'var(--game-surface-soft)',
                  borderColor: 'var(--game-border-strong)',
                  color: 'var(--game-accent-text)',
                }}
              >
                {t('game.continue')}
              </button>
            </div>
          ) : (
            <div
              className={`relative z-10 text-center rounded-2xl shadow-xl border px-8 py-8 max-w-md mx-4 pointer-events-auto ${animationsEnabled && !isDesktop ? 'animate-bounce-in' : ''}`}
              style={{
                backgroundColor: 'var(--game-surface)',
                borderColor: 'var(--game-border)',
              }}
            >
              {!isDesktop && <div className="text-4xl mb-3">😔</div>}
              <h1
                className="text-2xl md:text-3xl font-bold mb-3"
                style={{ color: 'var(--game-accent-text)' }}
              >
                {t('game.result.opponentHasWonGame', {
                  playerName: gameWinnerPlayer?.name || t('common.unknownPlayer'),
                })}
              </h1>
              <div
                className="text-base font-semibold rounded-xl px-4 py-2.5 mb-6 border"
                style={{
                  color: 'var(--game-accent-text)',
                  backgroundColor: 'var(--game-surface-soft)',
                  borderColor: 'var(--game-border-strong)',
                }}
              >
                {t('game.result.youLoseGame')}
              </div>
              <button
                onClick={handleGameEndContinue}
                className="px-6 py-3 rounded-xl font-bold text-base shadow transition-colors border"
                style={{
                  backgroundColor: 'var(--game-surface-soft)',
                  borderColor: 'var(--game-border-strong)',
                  color: 'var(--game-accent-text)',
                }}
              >
                {t('game.continue')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Matchpoint notification - styled prominently, gold/yellow theme */}
      {showMatchpoint && matchpointPlayerId && (
        <div
          className="fixed top-1/4 left-1/2 -translate-x-1/2 z-[9999] border-4 rounded-2xl px-8 py-6 md:px-12 md:py-8 shadow-2xl max-w-[95vw] text-center animate-bounce-in"
          style={{ 
            backgroundColor: '#2e2417', 
            borderColor: '#f2c96d',
            boxShadow: '0 0 40px 10px rgba(242, 201, 109, 0.6)'
          }}
        >
          <div className="text-4xl md:text-6xl font-extrabold mb-2 animate-pulse" style={{ 
            color: '#f2c96d',
            textShadow: '0 0 20px rgba(242, 201, 109, 0.8)'
          }}>
            MATCHPOINT!
          </div>
          <p className="text-lg md:text-2xl font-bold" style={{ color: '#f7f3e8' }}>
            {game.players.find(p => p.id === matchpointPlayerId)?.name || t("common.unknownPlayer")}
          </p>
          <p className="text-sm md:text-base mt-1" style={{ color: '#d9b45a' }}>
            {t("game.matchpointMessage")}
          </p>
        </div>
      )}

      {/* Player left notification - styled like bid element, compact on mobile */}
      {playerLeftNotification && (
        <div
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[9998] border-2 rounded-xl px-3 py-2 md:px-6 md:py-4 shadow-2xl max-w-[95vw]"
          style={{ backgroundColor: 'var(--game-surface)', borderColor: 'var(--game-border-strong)' }}
        >
          <p className="text-center text-sm md:text-lg font-medium" style={{ color: 'var(--game-accent-text)' }}>
            {t("game.playerLeftNotification", { playerName: playerLeftNotification })}
          </p>
        </div>
      )}

      {/* Statistics Display Modal */}
      <StatisticsDisplay 
        isOpen={showStatistics}
        onClose={() => setShowStatistics(false)}
      />

      {/* Chat Panel - for multiplayer games on mobile/tablet */}
      {isMultiplayerGame && useMobileLayout && (
        <ChatPanel
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          messages={game.chatMessages ?? []}
          playerId={localPlayerId}
          playerName={game.players.find(p => p.id === localPlayerId)?.name ?? ''}
          gameId={game.id}
          isMobile={useMobileLayout}
          playerColors={game.players.reduce((acc, player) => {
            acc[player.id] = player.color ? getPlayerColorFromString(player.color) : '#f5d98f';
            return acc;
          }, {} as Record<string, string>)}
        />
      )}

      {/* End Game confirmation dialog (host only) */}
      {showEndGameConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="border-2 rounded-2xl px-6 py-5 md:px-8 md:py-6 shadow-2xl max-w-sm w-full mx-4"
            style={{ backgroundColor: 'var(--game-surface)', borderColor: 'var(--game-border-strong)' }}
          >
            <h2 className="text-lg md:text-xl font-bold mb-2 text-center" style={{ color: 'var(--game-accent-text)' }}>
              {t("game.endGame")}
            </h2>
            <p className="text-sm md:text-base text-center mb-4" style={{ color: 'var(--game-text)' }}>
              {t("game.endGameConfirm")}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={async () => {
                  setShowEndGameConfirm(false);
                  if (gameId && localPlayerId) {
                    try {
                      await gameApi.endGame(gameId, localPlayerId);
                    } catch (err) {
                      console.error("End game failed:", err);
                    }
                  }
                  onBack?.();
                }}
                className="px-4 py-1.5 md:px-5 md:py-2 rounded-lg font-semibold text-sm md:text-base border transition-colors"
                style={{ backgroundColor: '#7f1d1d', borderColor: '#991b1b', color: '#fca5a5' }}
              >
                {t("game.endGame")}
              </button>
              <button
                onClick={() => setShowEndGameConfirm(false)}
                className="px-4 py-1.5 md:px-5 md:py-2 rounded-lg font-semibold text-sm md:text-base border-2 transition-colors"
                style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border)', color: 'var(--game-text)' }}
              >
                {t("game.leaveConfirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Tutorial overlay */}
      {minitutorial && !tutorialDismissed && game.state === 'IN_PROGRESS' && (
        <MiniTutorial
          game={game}
          localPlayerId={localPlayerId}
          onDismiss={() => setTutorialDismissed(true)}
          isMobile={useMobileLayout}
        />
      )}

      {/* Shared dealer chip — fixed + highest game z-index; slowly eases back to dealer player */}
      {dealerChipPos.visible && (
        <div
          className={`fixed z-[9000] touch-none select-none ${
            dealerChipDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            left: dealerChipPos.x,
            top: dealerChipPos.y,
            transform: 'translate(-50%, -50%)',
          }}
          onPointerDown={handleDealerPointerDown}
          onPointerMove={handleDealerPointerMove}
          onPointerUp={handleDealerPointerUp}
          onPointerCancel={handleDealerPointerUp}
          title="Drag dealer chip"
        >
          <div className="inline-flex items-center justify-center w-8 h-8 bg-[#173d2b] border-2 border-[#8a6a1d] rounded-full shadow-xl hover:scale-110 active:scale-95 transition-transform">
            <span className="text-[#f5d98f] text-sm font-bold pointer-events-none">D</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;
