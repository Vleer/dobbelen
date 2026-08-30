import { Game } from "../types/game";

/**
 * Merges authoritative server state with local client state.
 * Preserves local player's dice during multiplayer bidding when server broadcasts
 * mask player dice for privacy.
 */
export function mergeGameState(
  incomingGame: Game,
  previousGame: Game | null,
  localPlayerId: string | null
): Game {
  if (!previousGame) {
    return incomingGame;
  }

  // Strictly older round snapshots should not overwrite current round
  if (incomingGame.roundNumber < previousGame.roundNumber) {
    return previousGame;
  }

  const isMultiplayer =
    typeof incomingGame.isMultiplayer === "boolean"
      ? incomingGame.isMultiplayer
      : previousGame.isMultiplayer;

  const next: Game = {
    ...incomingGame,
    isMultiplayer,
  };

  // During hidden-hand multiplayer bidding, preserve the local player's dice
  // so the player's own hand doesn't flicker or empty on incoming broadcasts
  if (localPlayerId && next.isMultiplayer && !next.showAllDice && next.state === "IN_PROGRESS") {
    const prevLocal = previousGame.players.find((p) => p.id === localPlayerId);
    const nextLocal = next.players.find((p) => p.id === localPlayerId);

    if (
      prevLocal &&
      nextLocal &&
      prevLocal.dice.length > 0 &&
      nextLocal.dice.length === 0 &&
      prevLocal.dice.length === nextLocal.diceCount
    ) {
      return {
        ...next,
        players: next.players.map((p) =>
          p.id === localPlayerId ? { ...p, dice: prevLocal.dice } : p
        ),
      };
    }
  }

  return next;
}

