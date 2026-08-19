import { Game } from '../types/game';

/** Jackson serializes boolean `isFoo` fields as `foo` — map them back for the frontend. */
type RawBooleanAliases = {
  multiplayer?: boolean;
  private?: boolean;
  waitingForPlayers?: boolean;
};

export function normalizeGame<T extends Partial<Game> & RawBooleanAliases>(raw: T): T & Game {
  const game = raw as T & Game & RawBooleanAliases;
  return {
    ...game,
    isMultiplayer:
      typeof game.isMultiplayer === 'boolean' ? game.isMultiplayer : !!game.multiplayer,
    isPrivate: typeof game.isPrivate === 'boolean' ? game.isPrivate : !!game.private,
    isWaitingForPlayers:
      typeof game.isWaitingForPlayers === 'boolean'
        ? game.isWaitingForPlayers
        : !!game.waitingForPlayers,
  };
}
