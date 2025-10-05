import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';
import DiceSVG from './DiceSVG';
import DiceAnalysisChart from './DiceAnalysisChart';
import { useLanguage } from '../contexts/LanguageContext';

interface HistoryPanelProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  onTrackAction?: (playerId: string, actionType: 'DOUBT' | 'SPOT_ON') => void;
}

// Export function to track actions - can be called from outside
export const trackPlayerAction = (gameId: string, playerId: string, playerName: string, actionType: 'DOUBT' | 'SPOT_ON', wasCorrect: boolean) => {
  const storageKey = `game_stats_${gameId}`;
  const savedStats = localStorage.getItem(storageKey);
  const stats: Record<string, PlayerStats> = savedStats ? JSON.parse(savedStats) : {};

  if (!stats[playerId]) {
    stats[playerId] = {
      playerId,
      playerName,
      correctDoubts: 0,
      wrongDoubts: 0,
      correctSpotOns: 0,
      wrongSpotOns: 0,
    };
  }

  if (actionType === 'DOUBT') {
    if (wasCorrect) {
      stats[playerId].correctDoubts += 1;
    } else {
      stats[playerId].wrongDoubts += 1;
    }
  } else if (actionType === 'SPOT_ON') {
    if (wasCorrect) {
      stats[playerId].correctSpotOns += 1;
    } else {
      stats[playerId].wrongSpotOns += 1;
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(stats));
};

interface PlayerStats {
  playerId: string;
  playerName: string;
  correctDoubts: number;
  wrongDoubts: number;
  correctSpotOns: number;
  wrongSpotOns: number;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ game, isOpen, onClose }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'currentHand' | 'lastHand' | 'stats'>('currentHand');
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});

  // Load stats from storage and refresh when panel opens or game changes
  useEffect(() => {
    const storageKey = `game_stats_${game.id}`;
    
    const savedStats = localStorage.getItem(storageKey);
    const stats: Record<string, PlayerStats> = savedStats ? JSON.parse(savedStats) : {};

    // Ensure all current players have entries
    game.players.forEach(player => {
      if (!stats[player.id]) {
        stats[player.id] = {
          playerId: player.id,
          playerName: player.name,
          correctDoubts: 0,
          wrongDoubts: 0,
          correctSpotOns: 0,
          wrongSpotOns: 0,
        };
      } else {
        // Update player name in case it changed
        stats[player.id].playerName = player.name;
      }
    });

    setPlayerStats(stats);
  }, [game.id, game.players, isOpen]); // Refresh when panel opens

  // Get the last hand data from previousRoundPlayers
  const lastHandPlayers = game.previousRoundPlayers || [];
  const hasLastHandData = lastHandPlayers.length > 0;

  // Get action details with colored player name
  const getActionDescription = () => {
    if (!game.lastActionType || !game.lastActionPlayerId) {
      return <span>{t('game.history.noAction')}</span>;
    }

    const actionPlayer = game.players.find(p => p.id === game.lastActionPlayerId);
    const actionPlayerName = actionPlayer?.name || t('common.unknownPlayer');
    const playerColor = actionPlayer?.color || '#fff';

    const renderColoredPlayerName = (text: string) => {
      // Replace the {{playerName}} placeholder with colored version
      const parts = text.split('{{playerName}}');
      if (parts.length === 2) {
        return (
          <span>
            {parts[0]}
            <span style={{ color: playerColor, fontWeight: 'bold' }}>
              {actionPlayerName}
            </span>
            {parts[1]}
          </span>
        );
      }
      // Fallback if translation doesn't have placeholder
      return <span>{text}</span>;
    };

    switch (game.lastActionType) {
      case 'DOUBT':
        return renderColoredPlayerName(t('game.action.doubt', { playerName: '{{playerName}}' }));
      case 'SPOT_ON':
        return renderColoredPlayerName(t('game.action.spotOn', { playerName: '{{playerName}}' }));
      case 'RAISE':
        return renderColoredPlayerName(t('game.action.raise', { playerName: '{{playerName}}' }));
      default:
        return <span>{t('game.history.unknownAction')}</span>;
    }
  };

  const getOutcomeDescription = () => {
    if (!game.lastEliminatedPlayerId) {
      return null;
    }

    const eliminatedPlayer = game.players.find(p => p.id === game.lastEliminatedPlayerId);
    const eliminatedPlayerName = eliminatedPlayer?.name || t('common.unknownPlayer');

    return (
      <div className="mt-2 text-red-400 font-semibold">
        {t('game.history.playerEliminated', { playerName: eliminatedPlayerName })}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-lg shadow-2xl border-2 border-amber-700 w-[calc(100vw-1rem)] md:w-96 max-h-[80vh] overflow-y-auto">
        {/* Tabs */}
        <div className="flex border-b border-amber-700">
          <button
            onClick={() => setActiveTab('currentHand')}
            className={`flex-1 py-2 px-3 text-sm font-semibold transition-colors ${
              activeTab === 'currentHand'
                ? 'bg-amber-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t('game.history.currentHand')}
          </button>
          <button
            onClick={() => setActiveTab('lastHand')}
            className={`flex-1 py-2 px-3 text-sm font-semibold transition-colors ${
              activeTab === 'lastHand'
                ? 'bg-amber-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t('game.history.lastHand')}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-3 text-sm font-semibold transition-colors ${
              activeTab === 'stats'
                ? 'bg-amber-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t('game.history.stats')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'currentHand' && (
            <div>
              {game.currentHandBidHistory && game.currentHandBidHistory.length > 0 ? (
                <div className="space-y-2">
                  {game.currentHandBidHistory.map((bid, index) => {
                    const bidPlayer = game.players.find(p => p.id === bid.playerId);
                    const bidPlayerName = bidPlayer?.name || t('common.unknownPlayer');
                    const bidPlayerColor = bidPlayer?.color || '#fff';
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: bidPlayerColor }}
                          />
                          <span 
                            className="font-semibold"
                            style={{ color: bidPlayerColor }}
                          >
                            {bidPlayerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {Array.from({ length: bid.quantity }).map((_, diceIndex) => (
                            <DiceSVG key={diceIndex} value={bid.faceValue} size="sm" />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  {t('game.history.noBidsYet')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lastHand' && (
            <div>
              {hasLastHandData ? (
                <>
                  {/* Action Description */}
                  <div className="mb-4 p-3 bg-amber-900 bg-opacity-50 rounded-lg border border-amber-700">
                    <div className="text-white">
                      {getActionDescription()}
                    </div>
                    {game.lastBidQuantity !== undefined && game.lastBidFaceValue && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-gray-300 text-sm">
                          {(() => {
                            // The bid was made by someone - try multiple sources
                            // 1. Check previousBid first (most likely to have the right player)
                            // 2. If action was RAISE, use lastActionPlayerId (they made the bid)
                            // 3. Otherwise try currentBid
                            let bidPlayerId = game.previousBid?.playerId;
                            
                            if (!bidPlayerId && game.lastActionType === 'RAISE') {
                              bidPlayerId = game.lastActionPlayerId;
                            }
                            
                            if (!bidPlayerId) {
                              bidPlayerId = game.currentBid?.playerId;
                            }

                            // Try to find in current players first, then in previousRoundPlayers
                            let bidPlayer = bidPlayerId ? game.players.find(p => p.id === bidPlayerId) : null;
                            if (!bidPlayer && bidPlayerId) {
                              bidPlayer = lastHandPlayers.find(p => p.id === bidPlayerId);
                            }
                            
                            const bidPlayerName = bidPlayer?.name || t('common.unknownPlayer');
                            return (
                              <>
                                <span style={{ color: bidPlayer?.color || '#fff', fontWeight: 'bold' }}>
                                  {bidPlayerName}
                                </span>
                                {t('game.history.bidPossessive')}
                              </>
                            );
                          })()}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {Array.from({ length: game.lastBidQuantity }).map((_, index) => (
                            <DiceSVG key={index} value={game.lastBidFaceValue!} size="xs" />
                          ))}
                        </div>
                      </div>
                    )}
                    {game.lastActualCount !== undefined && game.lastBidFaceValue && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-gray-300 text-sm">{t('game.history.actualCount')}:</span>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {Array.from({ length: game.lastActualCount }).map((_, index) => (
                            <DiceSVG key={index} value={game.lastBidFaceValue!} size="xs" />
                          ))}
                        </div>
                      </div>
                    )}
                    {getOutcomeDescription()}
                  </div>

                  {/* Players and Their Dice */}
                  <div className="space-y-2">
                    {lastHandPlayers.map((player) => {
                      // Find current player to get color
                      const currentPlayer = game.players.find(p => p.id === player.id);
                      
                      return (
                        <div
                          key={player.id}
                          className="flex items-center gap-2 p-2 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
                        >
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: currentPlayer?.color || '#888' }}
                          />
                          <span 
                            className="font-semibold flex-shrink-0"
                            style={{ color: currentPlayer?.color || '#fff' }}
                          >
                            {player.name}
                          </span>
                          {/* Display dice inline */}
                          <div className="flex flex-wrap gap-1">
                            {player.dice.map((diceValue, index) => (
                              <DiceSVG key={index} value={diceValue} size="sm" />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dice Analysis Chart */}
                  <div className="mt-4">
                    <DiceAnalysisChart game={game} players={lastHandPlayers} />
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  {t('game.history.noData')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 className="text-amber-400 font-semibold mb-3">
                {t('game.history.playerActions')}
              </h3>
              <div className="space-y-3">
                {game.players.map((player) => {
                  const stats = playerStats[player.id] || {
                    playerId: player.id,
                    playerName: player.name,
                    correctDoubts: 0,
                    wrongDoubts: 0,
                    correctSpotOns: 0,
                    wrongSpotOns: 0,
                  };
                  
                  const totalActions = stats.correctDoubts + stats.wrongDoubts + stats.correctSpotOns + stats.wrongSpotOns;
                  
                  return (
                    <div
                      key={player.id}
                      className="p-3 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: player.color }}
                        />
                        <span 
                          className="font-semibold"
                          style={{ color: player.color }}
                        >
                          {player.name}
                        </span>
                        {totalActions === 0 && (
                          <span className="text-xs text-gray-500 ml-auto">
                            ({t('game.history.noActions')})
                          </span>
                        )}
                      </div>
                      
                      {totalActions > 0 && (
                        <div className="space-y-2 text-sm">
                          {/* Doubts Section */}
                          {(stats.correctDoubts > 0 || stats.wrongDoubts > 0) && (
                            <div>
                              <div className="text-gray-300 font-semibold mb-1">{t('game.history.doubts')}:</div>
                              <div className="flex justify-between pl-2">
                                <span className="text-gray-400">{t('game.history.correct')}:</span>
                                <span className="text-green-400 font-semibold">{stats.correctDoubts}</span>
                              </div>
                              <div className="flex justify-between pl-2">
                                <span className="text-gray-400">{t('game.history.wrong')}:</span>
                                <span className="text-red-400 font-semibold">{stats.wrongDoubts}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Spot Ons Section */}
                          {(stats.correctSpotOns > 0 || stats.wrongSpotOns > 0) && (
                            <div>
                              <div className="text-gray-300 font-semibold mb-1">{t('game.history.spotOns')}:</div>
                              <div className="flex justify-between pl-2">
                                <span className="text-gray-400">{t('game.history.correct')}:</span>
                                <span className="text-green-400 font-semibold">{stats.correctSpotOns}</span>
                              </div>
                              <div className="flex justify-between pl-2">
                                <span className="text-gray-400">{t('game.history.wrong')}:</span>
                                <span className="text-red-400 font-semibold">{stats.wrongSpotOns}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default HistoryPanel;
