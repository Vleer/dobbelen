import React, { useState, useEffect } from "react";
import GameTable from "./components/GameTable";
import MultiplayerLobby from "./components/MultiplayerLobby";
import LanguageSelector from "./components/LanguageSelector";
import SettingsPanel from "./components/SettingsPanel";
import { LanguageProvider } from "./contexts/LanguageContext";
import { StatisticsProvider } from "./contexts/StatisticsContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { Game } from "./types/game";
import { gameApi } from "./api/gameApi";
import { getSessionLikeStorage } from "./config/storage";
import { audioService } from "./services/audioService";

const GAME_SESSION_KEY = "game_session";

type AppState = 'lobby' | 'game';

function App() {
  const [appState, setAppState] = useState<AppState>('lobby');
  const [game, setGame] = useState<Game | null>(null);
  const [username, setUsername] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [restored, setRestored] = useState(false);
  const [lobbyKey, setLobbyKey] = useState(0);
  const [showLobbySettings, setShowLobbySettings] = useState(false);
  const [isLobbyMuted, setIsLobbyMuted] = useState(false);

  // On load: restore in-progress game from sessionStorage so refresh keeps you in the game
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    const storage = getSessionLikeStorage();
    const raw = storage.getItem(GAME_SESSION_KEY);
    if (!raw) return;
    try {
      const { gameId, playerId: savedPlayerId, username: savedUsername } = JSON.parse(raw);
      if (!gameId || !savedPlayerId || !savedUsername) return;
      gameApi.getMultiplayerGame(gameId)
        .then((g) => {
          if (g.state === "IN_PROGRESS") {
            setGame(g);
            setPlayerId(savedPlayerId);
            setUsername(savedUsername);
            setAppState("game");
          } else {
            storage.removeItem(GAME_SESSION_KEY);
          }
        })
        .catch(() => storage.removeItem(GAME_SESSION_KEY));
    } catch {
      getSessionLikeStorage().removeItem(GAME_SESSION_KEY);
    }
  }, [restored]);

  const handleGameStart = (gameData: Game, userPlayerId: string, userUsername: string) => {
    getSessionLikeStorage().setItem(GAME_SESSION_KEY, JSON.stringify({
      gameId: gameData.id,
      playerId: userPlayerId,
      username: userUsername,
    }));
    setGame(gameData);
    setPlayerId(userPlayerId);
    setUsername(userUsername);
    setAppState('game');
  };

  const handleBackToLobby = () => {
    getSessionLikeStorage().removeItem(GAME_SESSION_KEY);
    setAppState('lobby');
    setGame(null);
    setUsername('');
    setPlayerId('');
    setLobbyKey((k) => k + 1);
  };

  useEffect(() => {
    audioService.setMuted(isLobbyMuted);
  }, [isLobbyMuted]);

  return (
    <LanguageProvider>
      <StatisticsProvider>
        <SettingsProvider>
          <div className="min-h-screen relative" style={{ backgroundColor: 'var(--felt-bg)' }}>
            {/* Language Selector + Settings - Only show in lobby */}
            {appState === 'lobby' && (
              <div className="absolute top-0 left-0 right-0 z-50 p-2 md:p-4">
                <div className="mx-auto rounded-full menu-shell menu-header-shell shadow-2xl">
                  <div className="menu-header-row">
                  <button
                    onClick={() => setIsLobbyMuted((m) => !m)}
                    className="rounded-full menu-pill menu-pill-fixed menu-pill-icon font-medium shadow transition-all duration-200"
                    aria-label={isLobbyMuted ? "Unmute" : "Mute"}
                  >
                    {isLobbyMuted ? "🔇" : "🔊"}
                  </button>
                <div className="relative">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setShowLobbySettings((s) => !s)}
                    className="rounded-full menu-pill menu-pill-fixed menu-pill-icon font-medium shadow transition-all duration-200"
                    aria-label="Settings"
                  >
                    ⚙
                  </button>
                  <SettingsPanel
                    isOpen={showLobbySettings}
                    onClose={() => setShowLobbySettings(false)}
                  />
                </div>
                <LanguageSelector buttonClassName="menu-pill menu-pill-fixed menu-pill-label shadow text-[13px]" compact />
                  </div>
                </div>
              </div>
            )}

            {appState === 'lobby' ? (
              <MultiplayerLobby
                key={lobbyKey}
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
        </SettingsProvider>
      </StatisticsProvider>
    </LanguageProvider>
  );
}

export default App;
