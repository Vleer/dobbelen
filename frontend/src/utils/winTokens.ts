import type { Player } from '../types/game';

/** First row of score pips / normal race target. */
export const BASE_POINTS_TO_WIN = 7;
/** Tokens at which a player is at matchpoint (one away from base win). */
export const MATCHPOINT_THRESHOLD = BASE_POINTS_TO_WIN - 1;
/** Once two players reach matchpoint, must lead by this many points. */
export const WIN_MARGIN = 2;

export function sortedWinTokens(players: Player[]): number[] {
  return players.map((p) => p.winTokens || 0).sort((a, b) => b - a);
}

/** Two or more players at matchpoint → win-by-2 overtime is active. */
export function isMatchpointOvertime(players: Player[]): boolean {
  return players.filter((p) => (p.winTokens || 0) >= MATCHPOINT_THRESHOLD).length >= 2;
}

/**
 * How many overtime pips to show on the second (reverse) row.
 * Rows appear only when relevant: always exactly one empty slot ahead.
 * max=6 → 1; max=7 → 1; max=8 → 2; …
 */
export function getOvertimeSlotCount(players: Player[]): number {
  if (!isMatchpointOvertime(players)) return 0;
  const max = sortedWinTokens(players)[0] ?? 0;
  return Math.max(1, max - MATCHPOINT_THRESHOLD);
}
