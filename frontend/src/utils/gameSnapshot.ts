import { Game } from "../types/game";
import { getSessionLikeStorage } from "../config/storage";

const SNAPSHOT_KEY = "game_snapshot";

type GameSnapshot = {
  game: Game;
  playerId: string;
  savedAt: number;
};

/** Persist last known game for instant paint on refresh (session-scoped on web). */
export function saveGameSnapshot(game: Game, playerId: string): void {
  if (!game?.id || !playerId) return;
  try {
    const payload: GameSnapshot = { game, playerId, savedAt: Date.now() };
    getSessionLikeStorage().setItem(SNAPSHOT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / serialization */
  }
}

export function loadGameSnapshot(maxAgeMs = 5 * 60_000): GameSnapshot | null {
  try {
    const raw = getSessionLikeStorage().getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSnapshot;
    if (!parsed?.game?.id || !parsed.playerId || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) {
      clearGameSnapshot();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGameSnapshot(): void {
  try {
    getSessionLikeStorage().removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}
