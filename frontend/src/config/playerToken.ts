import { getSessionLikeStorage } from './storage';

/**
 * Client-side store for the per-player session tokens issued by the backend on join.
 *
 * <p>The backend used to trust `playerId` as a credential. Player ids are broadcast to every client
 * in the game payload and appear in query strings, so anybody could read another player's hidden
 * dice or act as the host. The token returned once at join time is now the real credential and must
 * be sent on every request that acts as, or reveals data to, this player.
 *
 * <p>Tokens are kept per game *and* per player. A game can hold several players that this browser
 * knows about - the local user, plus the AI players a host adds on their behalf - and each has its
 * own credential. A single slot per game let one player's token overwrite another's: adding an AI
 * replaced the host's token, so every later host request (start game, heartbeat, lobby presence)
 * was sent with somebody else's credential and rejected with 403.
 *
 * <p>Stored per game id so switching between games does not overwrite the active credentials.
 */

const TOKEN_KEY_PREFIX = 'player_token_';

function storageKey(gameId: string): string {
  return `${TOKEN_KEY_PREFIX}${gameId}`;
}

interface StoredTokens {
  /** The player this browser controls in this game. */
  localPlayerId: string | null;
  /** playerId -> session token */
  tokens: Record<string, string>;
}

/** The game the user is currently in; used as a fallback when a URL has no game id. */
let activeGameId: string | null = null;

/** In-memory mirror so the axios interceptor does not hit storage on every request. */
let cachedGameId: string | null = null;
let cachedStore: StoredTokens | null = null;

function emptyStore(): StoredTokens {
  return { localPlayerId: null, tokens: {} };
}

function readStore(gameId: string): StoredTokens {
  if (cachedGameId === gameId && cachedStore) return cachedStore;

  let store = emptyStore();
  try {
    const raw = getSessionLikeStorage().getItem(storageKey(gameId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredTokens> | null;
      const tokens: Record<string, string> = {};
      const parsedTokens = parsed?.tokens;
      if (parsedTokens && typeof parsedTokens === 'object') {
        for (const [playerId, token] of Object.entries(parsedTokens)) {
          if (typeof token === 'string' && token.length > 0) tokens[playerId] = token;
        }
      }
      store = {
        localPlayerId: typeof parsed?.localPlayerId === 'string' ? parsed.localPlayerId : null,
        tokens,
      };
    }
  } catch {
    /* storage unavailable (private mode etc.) or an older format - start empty */
  }

  cachedGameId = gameId;
  cachedStore = store;
  return store;
}

function writeStore(gameId: string, store: StoredTokens): void {
  cachedGameId = gameId;
  cachedStore = store;
  try {
    getSessionLikeStorage().setItem(storageKey(gameId), JSON.stringify(store));
  } catch {
    /* non-fatal: the in-memory cache still works for this tab */
  }
}

export function setActiveGameId(gameId: string | null): void {
  activeGameId = gameId;
}

export function getActiveGameId(): string | null {
  return activeGameId;
}

/**
 * Store a session token for one player of a game.
 *
 * @param isLocalPlayer true when this browser is the one playing that player. Only the local
 *   player's token is used for requests that do not name a player.
 */
export function setPlayerToken(
  gameId: string,
  playerId: string,
  token: string,
  isLocalPlayer = false
): void {
  if (!playerId || !token) return;
  const store = readStore(gameId);
  store.tokens[playerId] = token;
  if (isLocalPlayer) store.localPlayerId = playerId;
  writeStore(gameId, store);
}

/**
 * The token for `gameId`.
 *
 * @param playerId the player the request acts as. A credential belongs to exactly one player, so
 *   when a player is named only that player's token is returned - handing out somebody else's
 *   would make the server reject the call with 403.
 */
export function getPlayerToken(gameId?: string | null, playerId?: string | null): string | null {
  if (!gameId) return null;
  const store = readStore(gameId);
  if (playerId) return store.tokens[playerId] ?? null;
  if (store.localPlayerId) return store.tokens[store.localPlayerId] ?? null;
  return null;
}

export function clearPlayerToken(gameId: string): void {
  if (cachedGameId === gameId) {
    cachedGameId = null;
    cachedStore = null;
  }
  try {
    getSessionLikeStorage().removeItem(storageKey(gameId));
  } catch {
    /* ignore */
  }
}
