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
 * Slots cover every point past the base 7 that is still required for a
 * win-by-2 finish — e.g. 7–7 shows two empty boxes (8 and 9).
 */
export function getOvertimeSlotCount(players: Player[]): number {
  if (!isMatchpointOvertime(players)) return 0;
  const [first = 0, second = 0] = sortedWinTokens(players);
  const lead = first - second;
  const scoreNeededToEnd = first + Math.max(0, WIN_MARGIN - lead);
  return Math.max(0, scoreNeededToEnd - BASE_POINTS_TO_WIN);
}
