import { getActiveGameId, getPlayerToken } from '../config/playerToken';

/**
 * Pull the game id out of a request path so we attach that game's token.
 *
 * Covers `/api/games/{id}/...` and `/api/games/multiplayer/{id}/...`. Returns null for endpoints
 * that are not game-scoped (`/api/games`, `/api/games/health`, `/api/games/multiplayer/create`).
 */
function gameIdFromPath(url?: string): string | null {
  if (!url) return null;
  const path = url.split('?')[0];

  const multiplayer = path.match(/\/api\/games\/multiplayer\/([^/]+)/);
  if (multiplayer && multiplayer[1] !== 'create') return multiplayer[1];

  const plain = path.match(/\/api\/games\/([^/]+)/);
  if (plain && plain[1] !== 'health' && plain[1] !== 'multiplayer') return plain[1];

  return null;
}

/**
 * The player a request acts as.
 *
 * Read from the request body or the query string, which is where every endpoint that needs a
 * credential names the acting player. Returns null when the request does not name one - those
 * requests are either not player-scoped or only need the local player's token.
 */
function actingPlayerId(config: any): string | null {
  const data = config?.data;
  if (data) {
    if (typeof data === 'object' && typeof data.playerId === 'string') return data.playerId;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed.playerId === 'string') return parsed.playerId;
      } catch {
        /* not JSON - fall through to the query string */
      }
    }
  }

  const params = config?.params;
  if (params && typeof params.playerId === 'string') return params.playerId;

  return null;
}

/**
 * Attach the caller's per-player session token to every player-scoped request.
 *
 * The backend rejects (403) any player-scoped call whose token does not match the playerId in the
 * request, which is what stops a copied player id from being used to impersonate someone else.
 *
 * The game id is taken from the request path when possible (so background polling for a specific
 * game always sends the right credential) and falls back to the currently active game. The token
 * is the one belonging to the player the request acts as - a credential belongs to a single
 * player, so the wrong one would only ever be rejected.
 */
export function installAuthInterceptor(instance: {
  interceptors: {
    request: {
      use: (onFulfilled: (config: any) => any, onRejected?: (error: any) => any) => number;
    };
  };
}): void {
  instance.interceptors.request.use((config: any) => {
    const gameId = gameIdFromPath(config?.url) ?? getActiveGameId();
    if (!gameId) return config;

    const token = getPlayerToken(gameId, actingPlayerId(config));
    if (!token) return config;

    config.headers = config.headers ?? {};
    config.headers['X-Player-Token'] = token;
    return config;
  });
}
