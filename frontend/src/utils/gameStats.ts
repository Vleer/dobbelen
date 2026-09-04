import { Game, Player } from '../types/game';

export type HandType =
  | 'pair'
  | 'twoPair'
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'yahtzee'
  | 'canis';

export const HAND_TYPES: HandType[] = [
  'pair',
  'twoPair',
  'threeOfAKind',
  'fourOfAKind',
  'fullHouse',
  'yahtzee',
  'canis',
];

export interface HandCounts {
  pair: number;
  twoPair: number;
  threeOfAKind: number;
  fourOfAKind: number;
  fullHouse: number;
  yahtzee: number;
  canis: number;
}

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
  /** Times you were still in when the round reached the last two players */
  finalsReached: number;
  /** Poker-style hand tallies from each revealed roll */
  hands: HandCounts;
}

export type GameStatsMap = Record<string, PlayerGameStats>;

interface GameStatsStore {
  players: GameStatsMap;
  processedEvents: string[];
}

const STORAGE_PREFIX = 'game_stats_v3_';
const LEGACY_STORAGE_PREFIX = 'game_stats_v2_';
export const GAME_STATS_UPDATED_EVENT = 'dobbelen-game-stats-updated';

export function emptyHandCounts(): HandCounts {
  return {
    pair: 0,
    twoPair: 0,
    threeOfAKind: 0,
    fourOfAKind: 0,
    fullHouse: 0,
    yahtzee: 0,
    canis: 0,
  };
}

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
    finalsReached: 0,
    hands: emptyHandCounts(),
  };
}

/**
 * Classify a 5-dice roll into a poker-style hand.
 * Canis = all different faces (no pairs).
 */
export function classifyHand(dice: number[]): HandType | null {
  if (!dice || dice.length !== 5) return null;
  if (dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) return null;

  const counts = new Map<number, number>();
  for (const face of dice) {
    counts.set(face, (counts.get(face) || 0) + 1);
  }

  const multiplicities = Array.from(counts.values()).sort((a, b) => b - a);
  const key = multiplicities.join(',');

  switch (key) {
    case '5':
      return 'yahtzee';
    case '4,1':
      return 'fourOfAKind';
    case '3,2':
      return 'fullHouse';
    case '3,1,1':
      return 'threeOfAKind';
    case '2,2,1':
      return 'twoPair';
    case '2,1,1,1':
      return 'pair';
    case '1,1,1,1,1':
      return 'canis';
    default:
      return null;
  }
}

function storageKey(gameId: string): string {
  return `${STORAGE_PREFIX}${gameId}`;
}

function legacyStorageKey(gameId: string): string {
  return `${LEGACY_STORAGE_PREFIX}${gameId}`;
}

function normalizeHands(raw: Partial<HandCounts> | undefined): HandCounts {
  const empty = emptyHandCounts();
  if (!raw) return empty;
  return {
    pair: Number(raw.pair) || 0,
    twoPair: Number(raw.twoPair) || 0,
    threeOfAKind: Number(raw.threeOfAKind) || 0,
    fourOfAKind: Number(raw.fourOfAKind) || 0,
    fullHouse: Number(raw.fullHouse) || 0,
    yahtzee: Number(raw.yahtzee) || 0,
    canis: Number(raw.canis) || 0,
  };
}

function normalizePlayerStats(
  raw: Partial<PlayerGameStats> | undefined,
  playerId: string,
  playerName: string
): PlayerGameStats {
  const base = emptyPlayerStats(playerId, playerName);
  if (!raw) return base;
  return {
    playerId,
    playerName: raw.playerName || playerName,
    correctDoubts: Number(raw.correctDoubts) || 0,
    wrongDoubts: Number(raw.wrongDoubts) || 0,
    correctSpotOns: Number(raw.correctSpotOns) || 0,
    wrongSpotOns: Number(raw.wrongSpotOns) || 0,
    bluffsHeld: Number(raw.bluffsHeld) || 0,
    bluffsCaught: Number(raw.bluffsCaught) || 0,
    spotOnsFaced: Number(raw.spotOnsFaced) || 0,
    eliminations: Number(raw.eliminations) || 0,
    finalsReached: Number(raw.finalsReached) || 0,
    hands: normalizeHands(raw.hands),
  };
}

function parseStore(raw: string | null): GameStatsStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameStatsStore;
    const players: GameStatsMap = {};
    Object.entries(parsed.players || {}).forEach(([id, stats]) => {
      players[id] = normalizePlayerStats(stats, id, stats?.playerName || 'Unknown');
    });
    return {
      players,
      processedEvents: Array.isArray(parsed.processedEvents)
        ? parsed.processedEvents
        : [],
    };
  } catch {
    return null;
  }
}

function loadStore(gameId: string): GameStatsStore {
  const current = parseStore(localStorage.getItem(storageKey(gameId)));
  if (current) return current;

  // One-time migrate from v2 (challenge counters only)
  const legacy = parseStore(localStorage.getItem(legacyStorageKey(gameId)));
  if (legacy) {
    saveStore(gameId, legacy);
    return legacy;
  }

  return { players: {}, processedEvents: [] };
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
    store.players[playerId] = normalizePlayerStats(
      store.players[playerId],
      playerId,
      playerName
    );
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

function revealPlayers(game: Game): Player[] {
  if (game.previousRoundPlayers && game.previousRoundPlayers.length > 0) {
    return game.previousRoundPlayers;
  }
  // Fallback while dice are shown (e.g. round/game end)
  if (game.showAllDice) {
    return game.players.filter((p) => (p.dice?.length || 0) === 5);
  }
  return [];
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
  const playersAtReveal = revealPlayers(game);

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

  // Hand tallies from the dice that were just revealed
  for (const player of playersAtReveal) {
    const hand = classifyHand(player.dice || []);
    if (!hand) continue;
    const stats = ensurePlayer(store, player.id, player.name || resolveName(game, player.id));
    stats.hands[hand] += 1;
  }

  // Finals: first time this round drops from 3+ active to exactly 2
  if (
    eliminatedId &&
    playersAtReveal.length > 2 &&
    playersAtReveal.length - 1 === 2
  ) {
    for (const player of playersAtReveal) {
      if (player.id === eliminatedId) continue;
      const survivor = ensurePlayer(
        store,
        player.id,
        player.name || resolveName(game, player.id)
      );
      survivor.finalsReached += 1;
    }
  }

  store.processedEvents.push(eventId);
  // Cap processed list so localStorage does not grow forever
  if (store.processedEvents.length > 200) {
    store.processedEvents = store.processedEvents.slice(-100);
  }

  saveStore(game.id, store);
  return true;
}
