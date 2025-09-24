import React, { useState, useEffect } from 'react';
import { Game, Player, CreateGameRequest } from '../types/game';
import { gameApi } from '../api/gameApi';
import { aiService } from '../services/aiService';
import { webSocketService } from '../services/websocketService';
import LocalPlayer from './LocalPlayer';
import OpponentPlayer from './OpponentPlayer';
import BidDisplay from './BidDisplay';
import BidSelector from './BidSelector';
import GameSetup from './GameSetup';

interface GameTableProps {
  game?: Game | null;
  username?: string;
  playerId?: string;
  onBack?: () => void;
}

const GameTable: React.FC<GameTableProps> = ({ 
  game: initialGame, 
  username: initialUsername, 
  playerId: initialPlayerId, 
  onBack
}) => {
  const [game, setGame] = useState<Game | null>(initialGame || null);
  const [localPlayerId, setLocalPlayerId] = useState<string>(initialPlayerId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bettingDisabled, setBettingDisabled] = useState(false);

  // Connect WebSocket for all games (all games are multiplayer)
  useEffect(() => {
    console.log('WebSocket useEffect triggered:', { gameId: game?.id, localPlayerId });
    if (game && localPlayerId) {
      console.log('Connecting WebSocket for game:', game.id);
      try {
        webSocketService.connect(game.id, (updatedGame) => {
          console.log('WebSocket game update received:', updatedGame);
          setGame(updatedGame);
        });
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        // Fallback to polling if WebSocket fails
        console.log('Falling back to polling for game');
      }
      
      // Cleanup on unmount
      return () => {
        console.log('Disconnecting WebSocket for game:', game.id);
        webSocketService.disconnect();
      };
    } else {
      console.log('WebSocket not connected - conditions not met:', { hasGame: !!game, hasLocalPlayerId: !!localPlayerId });
    }
  }, [game?.id, localPlayerId, game]);

  // Polling fallback for all games (in case WebSocket fails)
  useEffect(() => {
    console.log('Polling useEffect triggered:', { gameId: game?.id, localPlayerId });
    if (game && localPlayerId) {
      console.log('Starting polling for game:', game.id);
      const pollInterval = setInterval(async () => {
        try {
          console.log('Polling game updates for game:', game.id);
          const updatedGame = await gameApi.getMultiplayerGame(game.id);
          console.log('Polled game state:', updatedGame.state, 'currentPlayerId:', updatedGame.currentPlayerId, 'myPlayerId:', localPlayerId);
          
          // Check if the current player has changed
          if (game.currentPlayerId !== updatedGame.currentPlayerId) {
            console.log('🎯 TURN CHANGE DETECTED! Old:', game.currentPlayerId, 'New:', updatedGame.currentPlayerId);
          }
          
          setGame(updatedGame);
        } catch (err) {
          console.error('Error polling game updates:', err);
        }
      }, 1000); // Poll every 1 second for faster updates

      return () => {
        console.log('Clearing polling interval for game:', game.id);
        clearInterval(pollInterval);
      };
    } else {
      console.log('Polling not started - conditions not met:', { hasGame: !!game, hasLocalPlayerId: !!localPlayerId });
    }
  }, [game?.id, localPlayerId, game]);

  const createGame = async (playerNames: string[], userUsername: string) => {
    setIsLoading(true);
    setError('');
    try {
      const request: CreateGameRequest = { playerNames };
      const gameResponse = await gameApi.createGame(request);
      setGame(gameResponse);
      
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
      // Use WebSocket for all games (all games are multiplayer)
      webSocketService.sendAction(action.toUpperCase(), data, localPlayerId);
      
      // If doubt or spot-on, disable betting for 5 seconds
      if (action === 'doubt' || action === 'spotOn') {
        setBettingDisabled(true);
        
        // Re-enable betting after 5 seconds
        setTimeout(() => {
          setBettingDisabled(false);
        }, 5000);
      }
      
      // The game state will be updated via WebSocket subscription
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
      gameWinner: game?.gameWinner,
      showAllDice: game?.showAllDice
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
          
          // Use WebSocket for AI actions (all games are multiplayer)
          switch (aiAction.action) {
            case 'bid':
              webSocketService.sendAction('BID', aiAction.data, game.currentPlayerId);
              break;
            case 'doubt':
              webSocketService.sendAction('DOUBT', {}, game.currentPlayerId);
              break;
            case 'spotOn':
              webSocketService.sendAction('SPOT_ON', {}, game.currentPlayerId);
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
  }, [game?.currentPlayerId, game?.state, isLoading, game, isAITurn]);

  const isMyTurn = (): boolean => {
    return game?.currentPlayerId === localPlayerId;
  };

  if (!game) {
    return <GameSetup onCreateGame={createGame} onMultiplayer={() => {}} isLoading={isLoading} error={error} />;
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
          disabled={isLoading || bettingDisabled}
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
          showDice={game.showAllDice || game.state === 'ROUND_ENDED' || game.winner !== null}
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
          onDoubt={() => handleAction('doubt')}
          onSpotOn={() => handleAction('spotOn')}
          disabled={isLoading || bettingDisabled}
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
        <div>Mode: Multiplayer</div>
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          ← Back
        </button>
      )}
    </div>
  );
};

export default GameTable;
