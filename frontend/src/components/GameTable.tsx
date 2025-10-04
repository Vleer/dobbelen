import React, { useState, useEffect, useCallback } from 'react';
import { Game, Player, CreateGameRequest } from '../types/game';
import { gameApi } from '../api/gameApi';
import { aiService } from '../services/aiService';
import { webSocketService } from '../services/websocketService';
import { useLanguage } from '../contexts/LanguageContext';
import LocalPlayer from './LocalPlayer';
import OpponentPlayer from './OpponentPlayer';
import BidDisplay from './BidDisplay';
import BidSelector from './BidSelector';
import GameResultDisplay from './GameResultDisplay';
import GameSetup from './GameSetup';
import LanguageSelector from './LanguageSelector';
import DiceAnalysisChart from './DiceAnalysisChart';

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
  const { t } = useLanguage();
  const [game, setGame] = useState<Game | null>(initialGame || null);
  const [localPlayerId, setLocalPlayerId] = useState<string>(initialPlayerId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bettingDisabled, setBettingDisabled] = useState(false);
  const [isGameInfoMinimized, setIsGameInfoMinimized] = useState(true); // Auto-collapse on mobile
  const [isContinuing, setIsContinuing] = useState(false);

  // Connect WebSocket for all games (all games are multiplayer)
  useEffect(() => {
    console.log('WebSocket useEffect triggered:', { gameId: game?.id, localPlayerId });
    if (game && localPlayerId) {
      console.log('Connecting WebSocket for game:', game.id);
      
      // Register AI players when game is loaded
      game.players.forEach(player => {
        if (player.name.startsWith('AI ')) {
          aiService.registerAIPlayer(player.id, player.name);
          console.log('Registered AI player:', player.name, player.id);
        }
      });
      
      try {
        webSocketService.connect(game.id, (updatedGame) => {
          console.log('WebSocket game update received:', updatedGame);
          
          // Register any new AI players
          updatedGame.players.forEach(player => {
            if (player.name.startsWith('AI ')) {
              aiService.registerAIPlayer(player.id, player.name);
            }
          });
          
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
          
          // Check if showAllDice state changed
          if (game.showAllDice !== updatedGame.showAllDice) {
            console.log('🟠 SHOW_ALL_DICE CHANGE DETECTED! Old:', game.showAllDice, 'New:', updatedGame.showAllDice, 'at', new Date().toISOString());
          }
          
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
        if (player.name.startsWith('AI ') || player.id !== humanPlayer.id) {
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

  const refreshGame = useCallback(async () => {
    if (!game) return;
    
    try {
      const gameResponse = await gameApi.getGame(game.id);
      setGame(gameResponse);
    } catch (err) {
      console.error('Error refreshing game:', err);
    }
  }, [game]);

  const handleAction = async (action: string, data?: any) => {
    if (!game || !localPlayerId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Use WebSocket for all games (all games are multiplayer)
      const actionName = action === 'spotOn' ? 'SPOT_ON' : action.toUpperCase();
      webSocketService.sendAction(actionName, data, localPlayerId);
      
      // If doubt or spot-on, disable betting for 15 seconds
      if (action === 'doubt' || action === 'spotOn') {
        setBettingDisabled(true);
        
        // Re-enable betting after 15 seconds
        setTimeout(() => {
          setBettingDisabled(false);
        }, 15000);
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

  const isAITurn = useCallback((): boolean => {
    return game?.currentPlayerId ? aiService.isAIPlayer(game.currentPlayerId) : false;
  }, [game?.currentPlayerId]);



  // Handle spacebar press to continue (mobile)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && game?.showAllDice && game.canContinue && !(localPlayerId ? aiService.isAIPlayer(localPlayerId) : false)) {
        e.preventDefault();
        handleMobileContinue();
      }
    };

    if (game?.showAllDice) {
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [game?.showAllDice, game?.canContinue, localPlayerId]);



  const handleMobileContinue = () => {
    setIsContinuing(true);
    webSocketService.sendAction('CONTINUE', {}, '');
    
    // Reset the continuing state after 1 second
    setTimeout(() => {
      setIsContinuing(false);
    }, 1000);
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
      showAllDice: game?.showAllDice,
      registeredAIPlayers: Array.from(aiService.registeredPlayers)
    });
    
    if (game && isAITurn() && !isLoading && game.state === 'IN_PROGRESS' && !game.showAllDice) {
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
  }, [game?.currentPlayerId, game?.state, isLoading, game, isAITurn, refreshGame]);

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
            {t('game.dobbelkoning')}
          </h1>
          <h2 className="text-3xl font-bold text-green-700 mb-6">
            {t('game.result.winsRound', { playerName: winner?.name || 'Unknown Player' })}
          </h2>
          <div className="text-xl text-green-600 mb-8">
            {winner?.name} {t('game.result.collected7Tokens')} {t('game.result.champion')}!
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-xl shadow-lg"
          >
            {t('common.playAgain')}
          </button>
        </div>
      </div>
    );
  }

  const localPlayer = getLocalPlayer();
  const opponents = getOpponents();

  return (
    <div className="game-table relative w-full h-screen bg-green-800 overflow-hidden select-none">
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-30"
        style={{ backgroundImage: "url(resources/bg.webp)" }}
      />

      {/* Mobile Layout - Clean Vertical Stack */}
      <div className="md:hidden">
        {/* Opponent Players - Top section positioned at header level */}
        <div className="absolute top-0 left-0 right-0 pt-2 px-2 z-40">
          <div className="flex flex-wrap justify-center gap-1 mt-1">
            {opponents.map((opponent, index) => {
              const previousRoundPlayer = game.previousRoundPlayers?.find(
                (p) => p.id === opponent.id
              );
              const originalIndex = game.players.findIndex(
                (p) => p.id === opponent.id
              );
              return (
                <OpponentPlayer
                  key={opponent.id}
                  player={opponent}
                  position={index}
                  isMyTurn={game.currentPlayerId === opponent.id}
                  isDealer={game.dealerId === opponent.id}
                  showDice={
                    game.showAllDice ||
                    game.state === "ROUND_ENDED" ||
                    game.winner !== null
                  }
                  previousBid={game.previousBid}
                  previousRoundPlayer={previousRoundPlayer}
                  isMobile={true}
                  playerIndex={originalIndex}
                />
              );
            })}
          </div>
        </div>

        {/* Spacer for absolutely positioned opponents - adjust based on opponents height */}
        <div className="h-20"></div>

        {/* Mobile Bid Display - Below players with separator */}
        {game.currentBid && (
          <div className="px-4 py-2">
            <BidDisplay
              currentBid={game.currentBid}
              currentPlayerId={game.currentPlayerId}
              players={game.players}
              roundNumber={game.roundNumber}
              winner={game.winner || undefined}
              isMobile={true}
            />
          </div>
        )}

        {/* Mobile Game Result Display - Below bid display, above bid selector */}
        {game.showAllDice && (
          <div className="px-4 py-2">
            <div className="bg-amber-900 border-4 border-amber-700 rounded-3xl p-6 shadow-2xl text-center">
              {/* Action and Result Status */}
              <div className="text-xl font-bold text-amber-200 mb-2">
                {game.lastActionType &&
                  game.lastActionPlayerId &&
                  (game.lastActionType === "DOUBT"
                    ? t("game.action.doubt", {
                        playerName:
                          game.players.find(
                            (p) => p.id === game.lastActionPlayerId
                          )?.name || t("common.unknownPlayer"),
                      })
                    : game.lastActionType === "SPOT_ON"
                    ? t("game.action.spotOn", {
                        playerName:
                          game.players.find(
                            (p) => p.id === game.lastActionPlayerId
                          )?.name || t("common.unknownPlayer"),
                      })
                    : t("game.action.raise", {
                        playerName:
                          game.players.find(
                            (p) => p.id === game.lastActionPlayerId
                          )?.name || t("common.unknownPlayer"),
                      }))}
              </div>
              <div className="text-lg font-semibold text-amber-100 mb-3">
                {game.lastActualCount !== undefined &&
                game.lastBidQuantity !== undefined &&
                game.lastBidFaceValue !== undefined
                  ? game.lastActualCount >= game.lastBidQuantity
                    ? t("game.result.thereWere", {
                        actualCount: game.lastActualCount,
                        faceValue: game.lastBidFaceValue,
                      }) +
                      " " +
                      t(" ")
                    : t(" ", {
                        actualCount: game.lastActualCount,
                        faceValue: game.lastBidFaceValue,
                      }) +
                      " " +
                      t("game.result.bidWasWrong")
                  : ""}
              </div>

              {/* Winner Message */}
              {game.winner && (
                <div className="text-2xl font-bold text-green-300 mb-3">
                  {t("game.result.winsRound", {
                    playerName:
                      game.players.find((p) => p.id === game.winner)?.name ||
                      "Unknown Player",
                  })}
                </div>
              )}

              {/* Eliminated Player */}
              {game.lastEliminatedPlayerId && (
                <div className="text-lg font-bold text-red-300 mb-4">
                  {t("game.result.isEliminated", {
                    playerName:
                      game.players.find(
                        (p) => p.id === game.lastEliminatedPlayerId
                      )?.name || "Unknown Player",
                  })}
                </div>
              )}

              {/* Analysis Section - Always Visible */}
              <DiceAnalysisChart game={game} />

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3 mt-4">
                {/* Continue Button */}
                <button
                  onClick={handleMobileContinue}
                  disabled={
                    isContinuing ||
                    !game.canContinue ||
                    (localPlayerId
                      ? aiService.isAIPlayer(localPlayerId)
                      : false)
                  }
                  className={`px-4 py-2 font-bold rounded-xl transition-all duration-200 border-2 ${
                    isContinuing ||
                    !game.canContinue ||
                    (localPlayerId
                      ? aiService.isAIPlayer(localPlayerId)
                      : false)
                      ? "bg-amber-800 text-amber-400 border-amber-600 cursor-not-allowed"
                      : "bg-amber-900 hover:bg-amber-800 text-amber-200 border-amber-700 hover:border-amber-600"
                  }`}
                >
                  {isContinuing
                    ? t("game.continuing")
                    : `${t("game.continue")} (Space)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bid Selector - Center section with proper spacing */}
        <div className="px-4 py-4">
          {localPlayer && isMyTurn() && !localPlayer.eliminated ? (
            <BidSelector
              currentBid={game.currentBid}
              onBidSelect={(quantity, faceValue) =>
                handleAction("bid", { quantity, faceValue })
              }
              onDoubt={() => handleAction("doubt")}
              onSpotOn={() => handleAction("spotOn")}
              disabled={isLoading || bettingDisabled}
              isMobile={true}
            />
          ) : (
            <div className="bg-gray-800 p-4 rounded-3xl shadow-lg border-4 border-gray-600 max-w-sm w-full mx-auto">
              <div className="text-center text-white text-lg font-bold">
                {localPlayer && isMyTurn()
                  ? t("game.makeYourBid")
                  : t("game.waitingForTurn")}
              </div>
            </div>
          )}
        </div>

        {/* Local Player - Bottom section */}
        {localPlayer && (
          <div className="px-2 py-2">
            <LocalPlayer
              player={localPlayer}
              isMyTurn={isMyTurn()}
              isDealer={game.dealerId === localPlayer.id}
              onAction={handleAction}
              disabled={isLoading || bettingDisabled}
              currentBid={game.currentBid}
              previousBid={game.previousBid}
              showDice={
                game.showAllDice ||
                game.state === "ROUND_ENDED" ||
                game.winner !== null
              }
              previousRoundPlayer={game.previousRoundPlayers?.find(
                (p) => p.id === localPlayer.id
              )}
              isMobile={true}
            />
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
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
            showDice={
              game.showAllDice ||
              game.state === "ROUND_ENDED" ||
              game.winner !== null
            }
            previousRoundPlayer={game.previousRoundPlayers?.find(
              (p) => p.id === localPlayer.id
            )}
          />
        )}

        {/* Opponents */}
        {opponents.map((opponent, index) => {
          const previousRoundPlayer = game.previousRoundPlayers?.find(
            (p) => p.id === opponent.id
          );
          const originalIndex = game.players.findIndex(
            (p) => p.id === opponent.id
          );
          console.log(`GameTable - Opponent ${opponent.name}:`, {
            showAllDice: game.showAllDice,
            state: game.state,
            winner: game.winner,
            playerIndex: originalIndex,
            previousRoundPlayer: previousRoundPlayer
              ? {
                  id: previousRoundPlayer.id,
                  name: previousRoundPlayer.name,
                  dice: previousRoundPlayer.dice,
                }
              : null,
            previousRoundPlayers: game.previousRoundPlayers?.map((p) => ({
              id: p.id,
              name: p.name,
              dice: p.dice,
            })),
          });
          return (
            <OpponentPlayer
              key={opponent.id}
              player={opponent}
              position={index}
              isMyTurn={game.currentPlayerId === opponent.id}
              isDealer={game.dealerId === opponent.id}
              showDice={
                game.showAllDice ||
                game.state === "ROUND_ENDED" ||
                game.winner !== null
              }
              previousBid={game.previousBid}
              previousRoundPlayer={previousRoundPlayer}
              playerIndex={originalIndex}
            />
          );
        })}

        {/* Bid Selector - Draggable on desktop */}
        {localPlayer && isMyTurn() && !localPlayer.eliminated && (
          <BidSelector
            currentBid={game.currentBid}
            onBidSelect={(quantity, faceValue) =>
              handleAction("bid", { quantity, faceValue })
            }
            onDoubt={() => handleAction("doubt")}
            onSpotOn={() => handleAction("spotOn")}
            disabled={isLoading || bettingDisabled}
          />
        )}
      </div>

      {/* Center Bid Display - Desktop only */}
      <div className="hidden md:block">
        <BidDisplay
          currentBid={game.currentBid}
          currentPlayerId={game.currentPlayerId}
          players={game.players}
          roundNumber={game.roundNumber}
          winner={game.winner || undefined}
          isMobile={false}
        />
      </div>

      {/* Game Result Display - Desktop only */}
      <div className="hidden md:block">
        <GameResultDisplay game={game} currentPlayerId={localPlayerId} />
      </div>

      {/* Error Display - Only show critical errors, not WebSocket warnings */}
      {error &&
        !error.toLowerCase().includes("stomp") &&
        !error.toLowerCase().includes("websocket") &&
        !error.toLowerCase().includes("connection") && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded z-50">
            {error}
          </div>
        )}

      {/* Top Header Bar - Absolute positioning for both mobile and desktop */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-50 p-2 md:p-4">
        {/* Left side - Back Button */}
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg hover:bg-opacity-70 font-medium shadow-lg text-sm transition-all duration-200"
            >
              ← Back
            </button>
          )}
        </div>

        {/* Right side - Game Info and Language Selector (hidden on mobile) */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Game Info */}
          <div className="bg-black bg-opacity-50 text-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-2">
              <button
                onClick={() => setIsGameInfoMinimized(!isGameInfoMinimized)}
                className="text-white hover:text-gray-300 mr-2 text-sm"
              >
                {isGameInfoMinimized ? "▶" : "▼"}
              </button>
              <span className="text-sm font-bold">Game Info</span>
            </div>
            {!isGameInfoMinimized && (
              <div className="px-2 pb-2 text-sm">
                <div>
                  {t("lobby.gameId")}: {game.id}
                </div>
                <div>{t("game.round", { roundNumber: game.roundNumber })}</div>
                <div>
                  {t("common.state")}: {game.state}
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="bg-black bg-opacity-50 text-white rounded-lg shadow-lg">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTable;
