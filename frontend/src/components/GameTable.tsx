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
import HistoryPanel, { trackPlayerAction } from './HistoryPanel';

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
  const [showBidDisplay, setShowBidDisplay] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{playerId: string, actionType: 'DOUBT' | 'SPOT_ON'} | null>(null);
  const [lastTrackedAction, setLastTrackedAction] = useState<string | null>(null);
  const [previousRoundNumber, setPreviousRoundNumber] = useState<number>(1);

  // Connect WebSocket for all games (all games are multiplayer)
  useEffect(() => {
    console.log("WebSocket useEffect triggered:", {
      gameId: game?.id,
      localPlayerId,
    });
    if (game && localPlayerId) {
      console.log("Connecting WebSocket for game:", game.id);

      // Register AI players when game is loaded
      game.players.forEach((player) => {
        if (player.name.startsWith("AI ") || player.name.startsWith("🧠AI ")) {
          aiService.registerAIPlayer(player.id, player.name);
          console.log("Registered AI player:", player.name, player.id);
        }
      });

      try {
        webSocketService.connect(game.id, (updatedGame) => {
          console.log("WebSocket game update received:", updatedGame);

          // Register any new AI players
          updatedGame.players.forEach((player) => {
            if (player.name.startsWith("AI ") || player.name.startsWith("🧠AI ")) {
              aiService.registerAIPlayer(player.id, player.name);
            }
          });

          setGame(updatedGame);
        });
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        // Fallback to polling if WebSocket fails
        console.log("Falling back to polling for game");
      }

      // Cleanup on unmount
      return () => {
        console.log("Disconnecting WebSocket for game:", game.id);
        webSocketService.disconnect();
      };
    } else {
      console.log("WebSocket not connected - conditions not met:", {
        hasGame: !!game,
        hasLocalPlayerId: !!localPlayerId,
      });
    }
  }, [game?.id, localPlayerId, game]);

  // Handle bid display and betting delay when round ends or showAllDice changes
  useEffect(() => {
    if (game?.state === 'ROUND_ENDED' || game?.showAllDice) {
      setShowBidDisplay(false);
      setBettingDisabled(true);
      const timer = setTimeout(() => {
        setShowBidDisplay(true);
        setBettingDisabled(false);
        // Clear round tracking when the delay ends and new round starts
        if (game) {
          aiService.clearRoundTracking(game.id);
        }
      }, 6000); // 6 second delay
      return () => clearTimeout(timer);
    } else {
      setShowBidDisplay(true);
      setBettingDisabled(false);
      // Also clear round tracking when showAllDice becomes false (new round started)
      if (game) {
        aiService.clearRoundTracking(game.id);
      }
    }
  }, [game]);

  // Polling fallback for all games (in case WebSocket fails)
  useEffect(() => {
    console.log("Polling useEffect triggered:", {
      gameId: game?.id,
      localPlayerId,
    });
    if (game && localPlayerId) {
      console.log("Starting polling for game:", game.id);
      const pollInterval = setInterval(async () => {
        try {
          console.log("Polling game updates for game:", game.id);
          const updatedGame = await gameApi.getMultiplayerGame(game.id);
          console.log(
            "Polled game state:",
            updatedGame.state,
            "currentPlayerId:",
            updatedGame.currentPlayerId,
            "myPlayerId:",
            localPlayerId
          );

          // Check if showAllDice state changed
          if (game.showAllDice !== updatedGame.showAllDice) {
            console.log(
              "🟠 SHOW_ALL_DICE CHANGE DETECTED! Old:",
              game.showAllDice,
              "New:",
              updatedGame.showAllDice,
              "at",
              new Date().toISOString()
            );
          }

          // Check if the current player has changed
          if (game.currentPlayerId !== updatedGame.currentPlayerId) {
            console.log(
              "🎯 TURN CHANGE DETECTED! Old:",
              game.currentPlayerId,
              "New:",
              updatedGame.currentPlayerId
            );
          }

          setGame(updatedGame);
        } catch (err) {
          console.error("Error polling game updates:", err);
        }
      }, 1000); // Poll every 1 second for faster updates

      return () => {
        console.log("Clearing polling interval for game:", game.id);
        clearInterval(pollInterval);
      };
    } else {
      console.log("Polling not started - conditions not met:", {
        hasGame: !!game,
        hasLocalPlayerId: !!localPlayerId,
      });
    }
  }, [game?.id, localPlayerId, game]);

  // Clear pending action when round ends (actual tracking is done in the next useEffect for all actions)
  useEffect(() => {
    if (!pendingAction || !game) return;
    
    // Check if we have the result (round ended with elimination data)
    if (game.lastEliminatedPlayerId && game.lastActionPlayerId === pendingAction.playerId) {
      // Clear the pending action (tracking is handled by the all-actions useEffect below)
      setPendingAction(null);
    }
  }, [pendingAction, game, game?.lastEliminatedPlayerId, game?.lastActionPlayerId]);

  // Track round number changes but DON'T clear the action tracker
  // (We need to keep the tracker so we don't re-track the same action in the new round)
  useEffect(() => {
    if (!game) return;
    
    // Just update the previous round number for logging purposes
    if (game.roundNumber !== previousRoundNumber) {
      console.log('🔄 Round changed from', previousRoundNumber, 'to', game.roundNumber);
      setPreviousRoundNumber(game.roundNumber);
    }
  }, [game?.roundNumber, previousRoundNumber, game]);

  // Track all actions (including AI) when they occur
  useEffect(() => {
    if (!game || !game.lastActionPlayerId || !game.lastEliminatedPlayerId) return;
    
    // Only track DOUBT and SPOT_ON actions (not RAISE)
    if (game.lastActionType !== 'DOUBT' && game.lastActionType !== 'SPOT_ON') return;

    // Create a unique identifier for this action WITHOUT round number
    // This prevents re-tracking the same action when transitioning to a new round
    const actionId = `${game.id}-${game.lastActionPlayerId}-${game.lastActionType}-E${game.lastEliminatedPlayerId}`;
    
    console.log('🔍 Action tracking check:', {
      actionId,
      lastTracked: lastTrackedAction,
      willTrack: lastTrackedAction !== actionId,
      gameState: game.state,
      showAllDice: game.showAllDice,
      canContinue: game.canContinue,
      roundNumber: game.roundNumber
    });
    
    // Skip if we've already tracked this exact action
    if (lastTrackedAction === actionId) {
      console.log('⏭️ Skipping - already tracked this action');
      return;
    }

    const player = game.players.find(p => p.id === game.lastActionPlayerId);
    if (!player) return;

    // Determine if action was correct
    const wasCorrect = game.lastEliminatedPlayerId !== game.lastActionPlayerId;

    console.log('📊 TRACKING ACTION:', {
      actionId,
      player: player.name,
      type: game.lastActionType,
      wasCorrect,
      roundNumber: game.roundNumber,
      timestamp: new Date().toISOString()
    });

    // Track the action
    trackPlayerAction(
      game.id,
      game.lastActionPlayerId,
      player.name,
      game.lastActionType as 'DOUBT' | 'SPOT_ON',
      wasCorrect
    );

    // Mark this action as tracked
    setLastTrackedAction(actionId);
  }, [game, lastTrackedAction]);

  const createGame = async (playerNames: string[], userUsername: string) => {
    setIsLoading(true);
    setError("");
    try {
      const request: CreateGameRequest = { playerNames };
      const gameResponse = await gameApi.createGame(request);
      setGame(gameResponse);

      // Find the human player (first player in AI mode, or by username)
      const humanPlayer =
        gameResponse.players.find((p) => p.name === userUsername) ||
        gameResponse.players[0];
      setLocalPlayerId(humanPlayer.id);

      // Register AI players
      gameResponse.players.forEach((player) => {
        if (player.name.startsWith("AI ") || player.id !== humanPlayer.id) {
          aiService.registerAIPlayer(player.id, player.name);
        }
      });
    } catch (err) {
      setError("Failed to create game");
      console.error("Error creating game:", err);
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
      console.error("Error refreshing game:", err);
    }
  }, [game]);

  const handleAction = async (action: string, data?: any) => {
    if (!game || !localPlayerId) return;

    setIsLoading(true);
    setError("");

    try {
      // Use WebSocket for all games (all games are multiplayer)
      const actionName = action === "spotOn" ? "SPOT_ON" : action.toUpperCase();
      webSocketService.sendAction(actionName, data, localPlayerId);

      // Track doubt/spot-on actions immediately when button is pressed
      if (action === "doubt" || action === "spotOn") {
        setPendingAction({
          playerId: localPlayerId,
          actionType: action === "spotOn" ? "SPOT_ON" : "DOUBT"
        });

        setBettingDisabled(true);

        // Re-enable betting after 15 seconds
        setTimeout(() => {
          setBettingDisabled(false);
        }, 15000);
      }

      // The game state will be updated via WebSocket subscription
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || `Failed to ${action}`;
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
    return game.players.find((p) => p.id === localPlayerId) || null;
  };

  const getOpponentsInTurnOrder = (): Player[] => {
    if (!game || !localPlayerId) return [];

    // Find the local player's index in the players array
    const localPlayerIndex = game.players.findIndex(
      (p) => p.id === localPlayerId
    );
    if (localPlayerIndex === -1)
      return game.players.filter((p) => p.id !== localPlayerId);

    // Create a new array starting from the player after the local player
    const reorderedPlayers: Player[] = [];
    for (let i = 1; i < game.players.length; i++) {
      const playerIndex = (localPlayerIndex + i) % game.players.length;
      reorderedPlayers.push(game.players[playerIndex]);
    }

    return reorderedPlayers;
  };

  // AI logic is now handled by the backend - no frontend AI turn handler needed

  const isMyTurn = (): boolean => {
    return game?.currentPlayerId === localPlayerId;
  };

  if (!game) {
    return (
      <GameSetup
        onCreateGame={createGame}
        onMultiplayer={() => {}}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // Check for game completion
  if (game.gameWinner) {
    const winner = game.players.find((p) => p.id === game.gameWinner);
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
            {t("game.dobbelkoning")}
          </h1>
          <h2 className="text-3xl font-bold text-green-700 mb-6">
            {t("game.result.winsRound", {
              playerName: winner?.name || "Unknown Player",
            })}
          </h2>
          <div className="text-xl text-green-600 mb-8">
            {winner?.name} {t("game.result.collected7Tokens")}{" "}
            {t("game.result.champion")}!
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-xl shadow-lg"
          >
            {t("common.playAgain")}
          </button>
        </div>
      </div>
    );
  }

  const localPlayer = getLocalPlayer();
  const opponentsInTurnOrder = getOpponentsInTurnOrder();

  return (
    <div className="game-table relative w-full h-screen bg-green-800 overflow-hidden select-none">
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-30"
        style={{ backgroundImage: "url(resources/bg.webp)" }}
      />

      {/* Mobile Layout - Clean Vertical Stack with fixed bottom elements */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Scrollable content area - opponents and results/bid display */}
        <div className="flex-1 overflow-y-auto pb-80 pt-16">
          {/* Opponent Players - Top section with natural flow, below header */}
          <div className="px-2">
            <div className="flex flex-wrap justify-center gap-1">
              {opponentsInTurnOrder.map((opponent, index) => {
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

          {/* Mobile Bid Display - Below opponents (when no results showing) */}
          {game.currentBid &&
            game.state !== "ROUND_ENDED" &&
            !game.showAllDice &&
            showBidDisplay && (
              <div className="px-3 py-2">
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

          {/* Mobile Game Result Display - Below opponents */}
          {game.showAllDice && (
            <div className="px-3 py-2">
              <div className="rounded-2xl p-3 shadow-2xl border-4" style={{ backgroundColor: '#3d1f0d', borderColor: '#78350f' }}>
                {/* Compact Header - Action and Who */}
                <div className="text-center mb-2">
                  <div className="text-base font-bold text-amber-200">
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
                </div>

                {/* Result - Correct/Incorrect with Clear Visual Indicator */}
                {game.lastActualCount !== undefined &&
                  game.lastBidQuantity !== undefined &&
                  game.lastBidFaceValue !== undefined && (
                    <div
                      className={`text-center mb-2 p-2 rounded-lg ${
                        game.lastActualCount >= game.lastBidQuantity
                          ? "bg-green-950 border-2 border-green-700"
                          : "bg-red-950 border-2 border-red-800"
                      }`}
                    >
                      <div
                        className={`text-lg font-bold ${
                          game.lastActualCount >= game.lastBidQuantity
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {game.lastActualCount >= game.lastBidQuantity
                          ? `✓ ${t("game.result.thereWere", {
                              actualCount: game.lastActualCount,
                              faceValue: game.lastBidFaceValue,
                            })}`
                          : `✗ ${t("game.result.thereWereOnly", {
                              actualCount: game.lastActualCount,
                              faceValue: game.lastBidFaceValue,
                            })}`}
                      </div>
                    </div>
                  )}

                {/* Winner - Prominent */}
                {game.winner && (
                  <div className="text-center mb-2 p-2 bg-green-950 rounded-lg border-2 border-green-700">
                    <div className="text-xl font-bold text-green-400">
                      🏆{" "}
                      {t("game.result.winsRound", {
                        playerName:
                          game.players.find((p) => p.id === game.winner)
                            ?.name || "Unknown Player",
                      })}
                    </div>
                  </div>
                )}

                {/* Eliminated Player - Very Prominent */}
                {game.lastEliminatedPlayerId && (
                  <div className="text-center mb-2 p-2 bg-red-950 rounded-lg border-2 border-red-800">
                    <div className="text-lg font-bold text-red-900">
                      💀{" "}
                      {t("game.result.isEliminated", {
                        playerName:
                          game.players.find(
                            (p) => p.id === game.lastEliminatedPlayerId
                          )?.name || "Unknown Player",
                      })}
                    </div>
                  </div>
                )}

                {/* Compact Dice Analysis Chart */}
                <DiceAnalysisChart game={game} />
              </div>
            </div>
          )}

          {/* Waiting Message - In scrollable area, below results */}
          {localPlayer && (!isMyTurn() || localPlayer.eliminated) && (
            <div className="px-3 py-2">
              <div className="bg-gray-800 p-4 rounded-3xl shadow-lg border-4 border-gray-600 max-w-sm w-full mx-auto">
                <div className="text-center text-white text-lg font-bold">
                  {localPlayer.eliminated
                    ? t("game.waitingForNextRound")
                    : t("game.waitingForTurn")}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bid Selector - Fixed above local player (only when active turn) */}
        {showBidDisplay &&
          localPlayer &&
          isMyTurn() &&
          !localPlayer.eliminated && (
            <div className="fixed bottom-24 left-0 right-0 z-45 px-3">
              <BidSelector
                currentBid={game.currentBid}
                previousBid={game.previousBid}
                onBidSelect={(quantity, faceValue) =>
                  handleAction("bid", { quantity, faceValue })
                }
                onDoubt={() => handleAction("doubt")}
                onSpotOn={() => handleAction("spotOn")}
                disabled={isLoading || bettingDisabled}
                isMobile={true}
              />
            </div>
          )}

        {/* Local Player - Fixed to bottom */}
        {localPlayer && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
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
        {opponentsInTurnOrder.map((opponent, index) => {
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
            previousBid={game.previousBid}
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
      {game.state !== "ROUND_ENDED" && !game.showAllDice && showBidDisplay && (
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
      )}

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
      <div className="absolute top-0 left-0 right-0 z-50 p-2 md:p-4">
        <div className="flex items-center justify-between">
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

          {/* Right side - History Button, Game Info and Language Selector */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* History Button - Always visible */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg hover:bg-opacity-70 font-medium shadow-lg text-sm transition-all duration-200"
            >
              {t("game.history.title")}
            </button>

            {/* Game Info - Desktop only */}
            <div className="hidden md:block bg-black bg-opacity-50 text-white rounded-lg shadow-lg">
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
                  <div>
                    {t("game.round", { roundNumber: game.roundNumber })}
                  </div>
                  <div>
                    {t("common.state")}: {game.state}
                  </div>
                </div>
              )}
            </div>

            {/* Language Selector - Desktop only */}
            <div className="hidden md:block bg-black bg-opacity-50 text-white rounded-lg shadow-lg">
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* History Panel - Positioned below the header */}
        {isHistoryOpen && (
          <div className="mt-2 flex justify-end">
            <HistoryPanel
              game={game}
              isOpen={isHistoryOpen}
              onClose={() => setIsHistoryOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTable;
