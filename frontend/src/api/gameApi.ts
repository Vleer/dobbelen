import axiosInstance from "./axios";
import { 
  CreateGameRequest, 
  BidRequest, 
  ActionRequest, 
  ActionResponse, 
  GameResponse,
  JoinGameRequest
} from "../types/game";

export const gameApi = {
  // Create a new game
  createGame: async (request: CreateGameRequest): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>("/api/games", request);
    return response.data;
  },

  // Get game by ID
  getGame: async (gameId: string): Promise<GameResponse> => {
    const response = await axiosInstance.get<GameResponse>(`/api/games/${gameId}`);
    return response.data;
  },

  // Get all games
  getAllGames: async (): Promise<GameResponse[]> => {
    const response = await axiosInstance.get<GameResponse[]>("/api/games");
    return response.data;
  },

  // Start new round
  startNewRound: async (gameId: string): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>(`/api/games/${gameId}/rounds`);
    return response.data;
  },

  // Make a bid
  makeBid: async (gameId: string, request: BidRequest): Promise<ActionResponse> => {
    const response = await axiosInstance.post<ActionResponse>(`/api/games/${gameId}/bid`, request);
    return response.data;
  },

  // Doubt a bid
  doubtBid: async (gameId: string, request: ActionRequest): Promise<ActionResponse> => {
    const response = await axiosInstance.post<ActionResponse>(`/api/games/${gameId}/doubt`, request);
    return response.data;
  },

  // Call spot on
  spotOn: async (gameId: string, request: ActionRequest): Promise<ActionResponse> => {
    const response = await axiosInstance.post<ActionResponse>(`/api/games/${gameId}/spot-on`, request);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<string> => {
    const response = await axiosInstance.get<string>("/api/games/health");
    return response.data;
  },

  // Multiplayer endpoints
  createMultiplayerGame: async (): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>("/api/games/multiplayer/create");
    return response.data;
  },

  joinMultiplayerGame: async (gameId: string, playerName: string): Promise<GameResponse> => {
    const request: JoinGameRequest = { gameId, playerName };
    const response = await axiosInstance.post<GameResponse>(`/api/games/multiplayer/${gameId}/join`, request);
    return response.data;
  },

  getMultiplayerGame: async (gameId: string): Promise<GameResponse> => {
    const response = await axiosInstance.get<GameResponse>(`/api/games/multiplayer/${gameId}`);
    return response.data;
  },

  startMultiplayerGame: async (gameId: string): Promise<GameResponse> => {
    const response = await axiosInstance.post<GameResponse>(`/api/games/multiplayer/${gameId}/start`);
    return response.data;
  },

  removePlayer: async (gameId: string, playerId: string): Promise<GameResponse> => {
    const response = await axiosInstance.delete<GameResponse>(`/api/games/multiplayer/${gameId}/players/${playerId}`);
    return response.data;
  }
};
