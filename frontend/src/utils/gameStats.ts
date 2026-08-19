import { Game } from '../types/game';

export interface PlayerGameStats {
  playerId: string;
  playerName: string;
  correctDoubts: number;
  wrongDoubts: number;
  correctSpotOns: number;
  wrongSpotOns: number;
  /** Bid held when someone doubted you (actual >= bid) */
  bluffsHeld: number;
  /** Your bid was successfully doubted (actual < bid) */
  bluffsCaught: number;
  /** Times someone called spot-on on your bid */
  spotOnsFaced: number;
  /** Times you were eliminated from a hand */
  eliminations: number;
}

export type GameStatsMap = Record<string, PlayerGameStats>;

interface GameStatsStore {
  players: GameStatsMap;
  processedEvents: string[];
}

const STORAGE_PREFIX = 'game_stats_v2_';
export const GAME_STATS_UPDATED_EVENT = 'dobbelen-game-stats-updated';

export function emptyPlayerStats(
  playerId: string,
  playerName: string
): PlayerGameStats {
  return {
    playerId,
    playerName,
    correctDoubts: 0,
    wrongDoubts: 0,
    correctSpotOns: 0,
    wrongSpotOns: 0,
    bluffsHeld: 0,
    bluffsCaught: 0,
    spotOnsFaced: 0,
    eliminations: 0,
  };
}

function storageKey(gameId: string): string {
  return `${STORAGE_PREFIX}${gameId}`;
}

function loadStore(gameId: string): GameStatsStore {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (!raw) return { players: {}, processedEvents: [] };
    const parsed = JSON.parse(raw) as GameStatsStore;
    return {
      players: parsed.players || {},
      processedEvents: parsed.processedEvents || [],
    };
  } catch {
    return { players: {}, processedEvents: [] };
  }
}

function saveStore(gameId: string, store: GameStatsStore): void {
  localStorage.setItem(storageKey(gameId), JSON.stringify(store));
  window.dispatchEvent(
    new CustomEvent(GAME_STATS_UPDATED_EVENT, { detail: { gameId } })
  );
}

export function loadGameStats(gameId: string): GameStatsMap {
  return loadStore(gameId).players;
}

function ensurePlayer(
  store: GameStatsStore,
  playerId: string,
  playerName: string
): PlayerGameStats {
  if (!store.players[playerId]) {
    store.players[playerId] = emptyPlayerStats(playerId, playerName);
  } else {
    store.players[playerId].playerName = playerName;
  }
  return store.players[playerId];
}

function resolveName(game: Game, playerId: string | undefined | null): string {
  if (!playerId) return 'Unknown';
  const fromCurrent = game.players.find((p) => p.id === playerId);
  if (fromCurrent) return fromCurrent.name;
  const fromPrevious = game.previousRoundPlayers?.find((p) => p.id === playerId);
  return fromPrevious?.name || 'Unknown';
}

/**
 * Unique id for a reveal so the same challenge is never counted twice
 * (including correct spot-ons with no elimination).
 */
export function buildRevealEventId(game: Game): string | null {
  if (
    !game.lastActionPlayerId ||
    (game.lastActionType !== 'DOUBT' && game.lastActionType !== 'SPOT_ON') ||
    game.lastActualCount === undefined ||
    game.lastBidQuantity === undefined ||
    game.lastBidFaceValue === undefined
  ) {
    return null;
  }

  return [
    game.id,
    `r${game.roundNumber}`,
    game.lastActionType,
    game.lastActionPlayerId,
    game.lastBidPlayerId || 'nobid',
    `${game.lastBidQuantity}x${game.lastBidFaceValue}`,
    `a${game.lastActualCount}`,
    `e${game.lastEliminatedPlayerId || 'NONE'}`,
  ].join('|');
}

/**
 * Record stats for a doubt/spot-on reveal. Safe to call repeatedly; deduped by event id.
 * Returns true if this event was newly recorded.
 */
export function recordRevealStats(game: Game): boolean {
  const eventId = buildRevealEventId(game);
  if (!eventId || !game.lastActionPlayerId || !game.lastActionType) {
    return false;
  }

  const store = loadStore(game.id);
  if (store.processedEvents.includes(eventId)) {
    return false;
  }

  const actorId = game.lastActionPlayerId;
  const bidderId = game.lastBidPlayerId;
  const eliminatedId = game.lastEliminatedPlayerId || null;
  const actual = game.lastActualCount!;
  const quantity = game.lastBidQuantity!;

  const actor = ensurePlayer(store, actorId, resolveName(game, actorId));
  const bidder = bidderId
    ? ensurePlayer(store, bidderId, resolveName(game, bidderId))
    : null;

  if (game.lastActionType === 'DOUBT') {
    // Correct doubt: bid was too high → bidder loses
    const doubtCorrect = actual < quantity;

    if (doubtCorrect) {
      actor.correctDoubts += 1;
      if (bidder && bidderId !== actorId) {
        bidder.bluffsCaught += 1;
      }
    } else {
      actor.wrongDoubts += 1;
      if (bidder && bidderId !== actorId) {
        bidder.bluffsHeld += 1;
      }
    }
  } else if (game.lastActionType === 'SPOT_ON') {
    // Correct spot-on: exact count → no elimination, hand resets
    const spotOnCorrect = actual === quantity;

    if (spotOnCorrect) {
      actor.correctSpotOns += 1;
    } else {
      actor.wrongSpotOns += 1;
    }

    if (bidder && bidderId !== actorId) {
      bidder.spotOnsFaced += 1;
    }
  }

  if (eliminatedId) {
    const eliminated = ensurePlayer(
      store,
      eliminatedId,
      resolveName(game, eliminatedId)
    );
    eliminated.eliminations += 1;
  }

  store.processedEvents.push(eventId);
  // Cap processed list so localStorage does not grow forever
  if (store.processedEvents.length > 200) {
    store.processedEvents = store.processedEvents.slice(-100);
  }

  saveStore(game.id, store);
  return true;
}
