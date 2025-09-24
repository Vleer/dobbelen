import React, { useState, useEffect } from "react";
import GameTable from "./components/GameTable";
import MultiplayerLobby from "./components/MultiplayerLobby";
import LanguageSelector from "./components/LanguageSelector";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Game } from "./types/game";

type AppState = 'lobby' | 'game';

function App() {
  const [appState, setAppState] = useState<AppState>('lobby');
  const [game, setGame] = useState<Game | null>(null);
  const [username, setUsername] = useState('');
  const [playerId, setPlayerId] = useState('');
  // Removed unused state variables

  // Check for gameId in URL on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    if (gameId) {
      // If there's a gameId in URL, we're joining an existing game
      console.log('Found gameId in URL:', gameId);
    }
  }, []);

  const handleGameStart = (gameData: Game, userPlayerId: string, userUsername: string) => {
    console.log('🎮 Game started with data:', { 
      id: gameData.id, 
      isMultiplayer: gameData.isMultiplayer, 
      state: gameData.state,
      players: gameData.players.length 
    });
    setGame(gameData);
    setPlayerId(userPlayerId);
    setUsername(userUsername);
    setAppState('game');
  };

  const handleBackToLobby = () => {
    setAppState('lobby');
    setGame(null);
    setUsername('');
    setPlayerId('');
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gray-900 relative">
        {/* Language Selector - Only show in lobby */}
        {appState === 'lobby' && (
          <div className="absolute top-4 right-4 z-50">
            <LanguageSelector />
          </div>
        )}

        {appState === 'lobby' ? (
          <MultiplayerLobby
            onGameStart={handleGameStart}
            onBack={() => {}} // No back button needed since this is the main page
          />
        ) : appState === 'game' ? (
          <GameTable
            game={game}
            username={username}
            playerId={playerId}
            onBack={handleBackToLobby}
          />
        ) : null}
      </div>
    </LanguageProvider>
  );
}

export default App;
