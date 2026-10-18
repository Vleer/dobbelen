import { getSessionLikeStorage } from './storage';

/**
 * Client-side store for the per-player session token issued by the backend on join.
 *
 * <p>The backend used to trust `playerId` as a credential. Player ids are broadcast to every client
 * in the game payload and appear in query strings, so anybody could read another player's hidden
 * dice or act as the host. The token returned once at join time is now the real credential and must
 * be sent on every request that acts as, or reveals data to, this player.
 *
 * <p>Stored per game id so switching between games does not overwrite the active credential.
 */

const TOKEN_KEY_PREFIX = 'player_token_';

function storageKey(gameId: string): string {
  return `${TOKEN_KEY_PREFIX}${gameId}`;
}

/** In-memory mirror so the axios interceptor does not hit storage on every request. */
let cachedToken: string | null = null;
let cachedGameId: string | null = null;

/** The game the user is currently in; used as a fallback when a URL has no game id. */
let activeGameId: string | null = null;

export function setActiveGameId(gameId: string | null): void {
  activeGameId = gameId;
}

export function getActiveGameId(): string | null {
  return activeGameId;
}

export function getPlayerToken(gameId?: string | null): string | null {
  if (!gameId) return null;
  if (cachedGameId === gameId && cachedToken) return cachedToken;
  try {
    const stored = getSessionLikeStorage().getItem(storageKey(gameId));
    if (stored) {
      cachedGameId = gameId;
      cachedToken = stored;
      return stored;
    }
  } catch {
    /* storage unavailable (private mode etc.) - fall through */
  }
  return null;
}

export function setPlayerToken(gameId: string, token: string): void {
  cachedGameId = gameId;
  cachedToken = token;
  try {
    getSessionLikeStorage().setItem(storageKey(gameId), token);
  } catch {
    /* non-fatal: the in-memory cache still works for this tab */
  }
}

export function clearPlayerToken(gameId: string): void {
  if (cachedGameId === gameId) {
    cachedGameId = null;
    cachedToken = null;
  }
  try {
    getSessionLikeStorage().removeItem(storageKey(gameId));
  } catch {
    /* ignore */
  }
}