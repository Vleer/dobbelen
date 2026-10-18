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
 * Attach the caller's per-player session token to every game-scoped request.
 *
 * The backend rejects (403) any player-scoped call whose token does not match the playerId in the
 * request, which is what stops a copied player id from being used to impersonate someone else.
 *
 * The game id is taken from the request path when possible (so background polling for a specific
 * game always sends the right credential) and falls back to the currently active game.
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

    const token = getPlayerToken(gameId);
    if (!token) return config;

    config.headers = config.headers ?? {};
    config.headers['X-Player-Token'] = token;
    return config;
  });
}