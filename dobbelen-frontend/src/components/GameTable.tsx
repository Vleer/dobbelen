import React, { useState, useEffect } from 'react';
import { Game, Player, CreateGameRequest } from '../types/game';
import { gameApi } from '../api/gameApi';
import { aiService } from '../services/aiService';
import LocalPlayer from './LocalPlayer';
import OpponentPlayer from './OpponentPlayer';
import BidDisplay from './BidDisplay';
import BidSelector from './BidSelector';
import GameSetup from './GameSetup';

const GameTable: React.FC = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const createGame = async (playerNames: string[], userUsername: string) => {
    setIsLoading(true);
    setError('');
    try {
      const request: CreateGameRequest = { playerNames };
      const gameResponse = await gameApi.createGame(request);
      setGame(gameResponse);
      setUsername(userUsername);
      
      // Find the human player (first player in AI mode, or by username)
      const humanPlayer = gameResponse.players.find(p => p.name === userUsername) || gameResponse.players[0];
      setLocalPlayerId(humanPlayer.id);
      
      // Register AI players
      gameResponse.players.forEach(player => {
        if (player.name.startsWith('AI Player') || player.id !== humanPlayer.id) {
          aiService.registerAIPlayer(player.id, player.name);
        }
      });
    } catch (err) {
      setError('Failed to create game');
      console.error('Error creating game:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshGame = async () => {
    if (!game) return;
    
    try {
      const gameResponse = await gameApi.getGame(game.id);
      setGame(gameResponse);
    } catch (err) {
      console.error('Error refreshing game:', err);
    }
  };

  const handleAction = async (action: string, data?: any) => {
    if (!game || !localPlayerId) return;

    setIsLoading(true);
    setError('');

    try {
      let response;
      switch (action) {
        case 'bid':
          response = await gameApi.makeBid(game.id, {
            playerId: localPlayerId,
            quantity: data.quantity,
            faceValue: data.faceValue
          });
          setGame(response.game);
          break;
        case 'doubt':
          response = await gameApi.doubtBid(game.id, { playerId: localPlayerId });
          setGame(response.game);
          break;
        case 'spotOn':
          response = await gameApi.spotOn(game.id, { playerId: localPlayerId });
          setGame(response.game);
          break;
        default:
          throw new Error('Unknown action');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || `Failed to ${action}`;
      setError(errorMessage);
      console.error(`Error with ${action}:`, err);
      
      // If there's an error, try to refresh the game state
      if (game) {
        refreshGame();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalPlayer = (): Player | null => {
    if (!game || !localPlayerId) return null;
    return game.players.find(p => p.id === localPlayerId) || null;
  };

  const getOpponents = (): Player[] => {
    if (!game || !localPlayerId) return [];
    return game.players.filter(p => p.id !== localPlayerId);
  };

  const isAITurn = (): boolean => {
    return game?.currentPlayerId ? aiService.isAIPlayer(game.currentPlayerId) : false;
  };

  // Handle AI turns
  useEffect(() => {
    console.log('Game state check:', {
      game: game?.id,
      state: game?.state,
      currentPlayerId: game?.currentPlayerId,
      isAITurn: isAITurn(),
      isLoading,
      gameWinner: game?.gameWinner
    });
    
    if (game && isAITurn() && !isLoading && game.state === 'IN_PROGRESS') {
      const handleAITurn = async () => {
        try {
          setIsLoading(true);
          await aiService.simulateThinking();
          
          const aiAction = aiService.generateRandomAction(game.currentBid, game.players.length);
          const currentPlayer = game.players.find(p => p.id === game.currentPlayerId);
          console.log(`AI ${currentPlayer?.name} chooses:`, aiAction);
          console.log('Current bid:', game.currentBid);
          console.log('AI action data:', aiAction.data);
          
          let response;
          switch (aiAction.action) {
            case 'bid':
              response = await gameApi.makeBid(game.id, {
                playerId: game.currentPlayerId,
                quantity: aiAction.data.quantity,
                faceValue: aiAction.data.faceValue
              });
              setGame(response.game);
              break;
            case 'doubt':
              response = await gameApi.doubtBid(game.id, { playerId: game.currentPlayerId });
              setGame(response.game);
              break;
            case 'spotOn':
              response = await gameApi.spotOn(game.id, { playerId: game.currentPlayerId });
              setGame(response.game);
              break;
            default:
              throw new Error('Unknown AI action');
          }
        } catch (err: any) {
            console.error('AI action failed:', err);
            console.error('Error details:', err.response?.data);
            const errorMessage = err.response?.data?.message || err.message || 'AI action failed';
            setError(errorMessage);
            
            // Refresh game state on AI error
            refreshGame();
          } finally {
            setIsLoading(false);
          }
      };

      handleAITurn();
    }
  }, [game?.currentPlayerId, game?.state, isLoading]);

  const isMyTurn = (): boolean => {
    return game?.currentPlayerId === localPlayerId;
  };

  if (!game) {
    return <GameSetup onCreateGame={createGame} isLoading={isLoading} error={error} />;
  }

  // Check for game completion
  if (game.gameWinner) {
    const winner = game.players.find(p => p.id === game.gameWinner);
    return (
      <div className="game-table relative w-full h-screen bg-green-800 overflow-hidden flex items-center justify-center">
        {/* Background */}
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-30"
          style={{ backgroundImage: "url(resources/bg.webp)" }}
        />
        
        {/* Victory Screen */}
        <div className="relative z-10 text-center bg-yellow-400 p-12 rounded-3xl shadow-2xl border-4 border-yellow-600">
          <div className="text-6xl mb-4">🎲👑</div>
          <h1 className="text-5xl font-bold text-green-800 mb-4">
            Dobbelkoning!
          </h1>
          <h2 className="text-3xl font-bold text-green-700 mb-6">
            {winner?.name} has won the game!
          </h2>
          <div className="text-xl text-green-600 mb-8">
            {winner?.name} collected 7 win tokens and is the ultimate Liar's Dice champion!
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-xl shadow-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const localPlayer = getLocalPlayer();
  const opponents = getOpponents();

  return (
    <div className="game-table relative w-full h-screen bg-green-800 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-30"
        style={{ backgroundImage: "url(resources/bg.webp)" }}
      />
      
      {/* Local Player - Bottom Center */}
      {localPlayer && (
        <LocalPlayer 
          player={localPlayer} 
          isMyTurn={isMyTurn()}
          isDealer={game.dealerId === localPlayer.id}
          onAction={handleAction}
          disabled={isLoading}
          currentBid={game.currentBid}
          previousBid={game.previousBid}
        />
      )}

      {/* Opponents */}
      {opponents.map((opponent, index) => (
        <OpponentPlayer
          key={opponent.id}
          player={opponent}
          position={index}
          isMyTurn={game.currentPlayerId === opponent.id}
          isDealer={game.dealerId === opponent.id}
          showDice={game.state === 'ROUND_ENDED' || game.winner !== null}
          previousBid={game.previousBid}
        />
      ))}

      {/* Center Bid Display */}
      <BidDisplay 
        currentBid={game.currentBid}
        currentPlayerId={game.currentPlayerId}
        players={game.players}
        roundNumber={game.roundNumber}
        winner={game.winner || undefined}
      />

      {/* Bid Selector - Draggable */}
      {localPlayer && isMyTurn() && !localPlayer.eliminated && (
        <BidSelector
          currentBid={game.currentBid}
          onBidSelect={(quantity, faceValue) => handleAction('bid', { quantity, faceValue })}
          disabled={isLoading}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Game Info */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
        <div>Game ID: {game.id}</div>
        <div>Round: {game.roundNumber}</div>
        <div>State: {game.state}</div>
      </div>
    </div>
  );
};

export default GameTable;
