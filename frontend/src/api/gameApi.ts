import axiosInstance from "./axios";
import { 
  CreateGameRequest, 
  BidRequest, 
  ActionRequest, 
  ActionResponse,
  GameResponse
} from "../types/game";
import { normalizeGame } from "../utils/normalizeGame";

const normalizeActionResponse = (data: ActionResponse): ActionResponse => ({
  ...data,
  game: normalizeGame(data.game),
});

export const gameApi = {
  // Create a new game
  createGame: async (request: CreateGameRequest): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>("/api/games", request);
    return normalizeGame(response.data);
  },

  // Get game by ID
  getGame: async (gameId: string, playerId?: string): Promise<GameResponse> => {
    const response = await axiosInstance.get<GameResponse>(`/api/games/${gameId}`, {
      params: playerId ? { playerId } : {},
    });
    return normalizeGame(response.data);
  },

  // Get all games
  getAllGames: async (): Promise<GameResponse[]> => {
    const response = await axiosInstance.get<GameResponse[]>("/api/games");
    return response.data.map((g) => normalizeGame(g));
  },

  // Start new round
  startNewRound: async (gameId: string): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>(`/api/games/${gameId}/rounds`);
    return normalizeGame(response.data);
  },

  // Make a bid
  makeBid: async (gameId: string, request: BidRequest): Promise<ActionResponse> => {
    const response = await axiosInstance.post<ActionResponse>(`/api/games/${gameId}/bid`, request);
    return normalizeActionResponse(response.data);
  },

  // Doubt a bid
  doubtBid: async (gameId: string, request: ActionRequest): Promise<ActionResponse> => {
    const response = await axiosInstance.post<ActionResponse>(`/api/games/${gameId}/doubt`, request);
    return normalizeActionResponse(response.data);
  },

  // Call spot on
  spotOn: async (gameId: string, request: ActionRequest): Promise<ActionResponse> => {
    const response = await axiosInstance.post<ActionResponse>(`/api/games/${gameId}/spot-on`, request);
    return normalizeActionResponse(response.data);
  },

  // Health check
  healthCheck: async (): Promise<string> => {
    const response = await axiosInstance.get<string>("/api/games/health");
    return response.data;
  },

  // Multiplayer endpoints
  listMultiplayerGames: async (): Promise<GameResponse[]> => {
    const response = await axiosInstance.get<GameResponse[]>("/api/games/multiplayer");
    return response.data.map((g) => normalizeGame(g));
  },

  createMultiplayerGame: async (isPrivate: boolean = false): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>(
      `/api/games/multiplayer/create?private=${isPrivate}`
    );
    return normalizeGame(response.data);
  },

  joinMultiplayerGame: async (gameId: string, playerName: string): Promise<GameResponse> => {
    // Backend only needs playerName in request body
    const response = await axiosInstance.post<GameResponse>(`/api/games/multiplayer/${gameId}/join`, { playerName });
    return normalizeGame(response.data);
  },

  getMultiplayerGame: async (gameId: string, playerId?: string): Promise<GameResponse> => {
    const response = await axiosInstance.get<GameResponse>(`/api/games/multiplayer/${gameId}`, {
      params: playerId ? { playerId } : {},
    });
    return normalizeGame(response.data);
  },

  startMultiplayerGame: async (gameId: string, playerId: string): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>(`/api/games/multiplayer/${gameId}/start`, { playerId });
    return normalizeGame(response.data);
  },

  reorderPlayers: async (gameId: string, playerId: string, playerIds: string[]): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>(`/api/games/multiplayer/${gameId}/player-order`, {
      playerId,
      playerIds,
    });
    return normalizeGame(response.data);
  },

  randomizePlayerOrder: async (gameId: string, playerId: string): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>(`/api/games/multiplayer/${gameId}/randomize-order`, {
      playerId,
    });
    return normalizeGame(response.data);
  },

  removePlayer: async (gameId: string, playerId: string): Promise<GameResponse> => {
    const response = await axiosInstance.delete<GameResponse>(`/api/games/multiplayer/${gameId}/players/${playerId}`);
    return normalizeGame(response.data);
  },

  leaveGame: async (gameId: string, playerId: string): Promise<void> => {
    await axiosInstance.post(`/api/games/multiplayer/${gameId}/leave`, { playerId });
  },

  heartbeat: async (gameId: string, playerId: string): Promise<void> => {
    await axiosInstance.post(`/api/games/multiplayer/${gameId}/heartbeat`, { playerId });
  },

  /** Host only: while the lobby tab is visible, keeps the game on the public lobby list */
  lobbyPresence: async (gameId: string, playerId: string): Promise<void> => {
    await axiosInstance.post(`/api/games/multiplayer/${gameId}/lobby-presence`, { playerId });
  },

  cancelMultiplayerGame: async (gameId: string, playerId: string): Promise<void> => {
    await axiosInstance.delete(`/api/games/multiplayer/${gameId}`, {
      params: { playerId },
    });
  },

  playerContinue: async (gameId: string, playerId: string): Promise<import('../types/game').Game> => {
    const response = await axiosInstance.post<import('../types/game').Game>(`/api/games/multiplayer/${gameId}/player-continue`, { playerId });
    return normalizeGame(response.data);
  },

  sendChatMessage: async (gameId: string, playerId: string, text: string): Promise<void> => {
    await axiosInstance.post(`/api/games/multiplayer/${gameId}/chat`, { playerId, text });
  },

  endGame: async (gameId: string, playerId: string): Promise<void> => {
    await axiosInstance.post(`/api/games/multiplayer/${gameId}/end`, { playerId });
  },

  /** Fetch only the requesting player's own dice (hidden in broadcasts for multiplayer). */
  getMyDice: async (gameId: string, playerId: string): Promise<number[]> => {
    const response = await axiosInstance.get<number[]>(`/api/games/${gameId}/my-dice`, {
      params: { playerId },
    });
    return response.data;
  },
};
