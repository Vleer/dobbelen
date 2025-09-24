export interface Player {
  id: string;
  name: string;
  diceCount: number;
  eliminated: boolean;
  dice: number[];
  winTokens: number;
}

export interface Bid {
  playerId: string;
  quantity: number;
  faceValue: number;
  type: string;
}

export interface Game {
  id: string;
  players: Player[];
  state: string;
  currentPlayerId: string;
  currentBid: Bid | null;
  previousBid: Bid | null;
  eliminatedPlayers: string[];
  roundNumber: number;
  winner: string | null;
  gameWinner: string | null;
  dealerId: string | null;
}

export interface CreateGameRequest {
  playerNames: string[];
}

export interface BidRequest {
  playerId: string;
  quantity: number;
  faceValue: number;
}

export interface ActionRequest {
  playerId: string;
}

export interface ActionResponse {
  game: Game;
  message: string;
  eliminatedPlayerId?: string;
  actualCount?: number;
  bidQuantity?: number;
  roundEnded: boolean;
  roundWinner?: string;
}

export interface GameResponse {
  id: string;
  players: Player[];
  state: string;
  currentPlayerId: string;
  currentBid: Bid | null;
  previousBid: Bid | null;
  eliminatedPlayers: string[];
  roundNumber: number;
  winner: string | null;
  gameWinner: string | null;
  dealerId: string | null;
}
