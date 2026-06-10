import React, { useState, useEffect, useRef } from "react";
import GameTable from "./components/GameTable";
import MultiplayerLobby from "./components/MultiplayerLobby";
import LanguageSelector from "./components/LanguageSelector";
import SettingsPanel from "./components/SettingsPanel";
import ChatPanel from "./components/ChatPanel";
import ChatIcon from "./components/ChatIcon";
import { LanguageProvider } from "./contexts/LanguageContext";
import { StatisticsProvider } from "./contexts/StatisticsContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { Game } from "./types/game";
import { gameApi } from "./api/gameApi";
import { getSessionLikeStorage } from "./config/storage";
import { audioService } from "./services/audioService";
import { getPlayerColorFromString } from "./utils/playerColors";
import useWindowSize from "./utils/useWindowSize";

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
  const lobbySettingsAnchorRef = useRef<HTMLDivElement>(null);
  const [lobbyMenuNarrow, setLobbyMenuNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  const [lobbyGame, setLobbyGame] = useState<Game | null>(null);
  const [lobbyPlayerId, setLobbyPlayerId] = useState<string | null>(null);
  const [lobbyPlayerName, setLobbyPlayerName] = useState('');
  const [showLobbyChat, setShowLobbyChat] = useState(false);
  const [lastSeenLobbyChatCount, setLastSeenLobbyChatCount] = useState(0);
  const { isMobile, isTablet } = useWindowSize();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setLobbyMenuNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    const storage = getSessionLikeStorage();
    let gameIdToClear: string | undefined = game?.id;
    if (!gameIdToClear) {
      try {
        const raw = storage.getItem(GAME_SESSION_KEY);
        if (raw) gameIdToClear = JSON.parse(raw)?.gameId;
      } catch {
        /* ignore */
      }
    }
    if (gameIdToClear) {
      storage.removeItem(`lobby_${gameIdToClear}`);
    }
    storage.removeItem(GAME_SESSION_KEY);
    window.history.replaceState(
      {},
      "",
      `${window.location.origin}${window.location.pathname}`
    );
    setAppState('lobby');
    setGame(null);
    setUsername('');
    setPlayerId('');
    setLobbyKey((k) => k + 1);
  };

  useEffect(() => {
    audioService.setMuted(isLobbyMuted);
  }, [isLobbyMuted]);

  const handleLobbyGameStateChange = (game: Game | null, playerId: string | null, playerName: string) => {
    setLobbyGame(game);
    setLobbyPlayerId(playerId);
    setLobbyPlayerName(playerName);
  };

  const handleToggleLobbyChat = () => {
    audioService.playRaise();
    setShowLobbyChat((prev) => {
      const next = !prev;
      if (next && lobbyGame) {
        // Mark all messages as seen when opening
        setLastSeenLobbyChatCount(lobbyGame.chatMessages?.length ?? 0);
      }
      return next;
    });
  };

  return (
    <LanguageProvider>
      <StatisticsProvider>
        <SettingsProvider>
          <div className="min-h-screen relative" style={{ backgroundColor: 'var(--felt-bg)' }}>
            {/* Language Selector + Settings - Only show in lobby */}
            {appState === 'lobby' && (
              <div className="absolute top-0 left-0 right-0 z-50 px-2 pt-1.5 pb-1 md:px-3 md:pt-2 md:pb-1.5">
                <div className="mx-auto rounded-full menu-shell menu-header-shell shadow-2xl">
                  <div className="menu-header-row">
                  <button
                    onClick={() => setIsLobbyMuted((m) => !m)}
                    className="rounded-full menu-pill menu-pill-fixed menu-pill-icon font-medium shadow transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px]"
                    aria-label={isLobbyMuted ? "Unmute" : "Mute"}
                  >
                    {isLobbyMuted ? "🔇" : "🔊"}
                  </button>
                 <div className="relative" ref={lobbySettingsAnchorRef}>
                  <button
                    type="button"
                    onClick={() => setShowLobbySettings((s) => !s)}
                    className="rounded-full menu-pill menu-pill-fixed menu-pill-icon font-medium shadow transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px]"
                    aria-label="Settings"
                    aria-expanded={showLobbySettings}
                  >
                    ⚙
                  </button>
                  <SettingsPanel
                    isOpen={showLobbySettings}
                    onClose={() => setShowLobbySettings(false)}
                    anchorRef={lobbySettingsAnchorRef}
                    mobileCentered={lobbyMenuNarrow}
                  />
                </div>

                {/* Chat button - only show when in a game lobby */}
                {lobbyGame && lobbyPlayerId && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleToggleLobbyChat}
                      className={`rounded-full menu-pill menu-pill-fixed menu-pill-icon font-medium shadow transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] relative flex items-center justify-center hover:scale-105 active:scale-95 ${
                        (lobbyGame.chatMessages?.length ?? 0) - lastSeenLobbyChatCount > 0 ? 'animate-pulse' : ''
                      }`}
                      aria-label="Chat"
                      aria-expanded={showLobbyChat}
                      style={{
                        ...(showLobbyChat ? { backgroundColor: 'var(--menu-button-hover-bg)', borderColor: 'var(--game-border-strong)' } : {})
                      }}
                    >
                      <span className="w-5 h-5 transition-transform" style={{ color: showLobbyChat ? 'var(--game-accent-text)' : 'var(--menu-button-text)' }}>
                        <ChatIcon />
                      </span>
                      {(() => {
                        const unread = (lobbyGame.chatMessages?.length ?? 0) - lastSeenLobbyChatCount;
                        return unread > 0 ? (
                          <span 
                            className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-lg animate-bounce-in"
                            style={{
                              animation: 'bounce-in 0.5s ease-out, pulse-red 2s ease-in-out 0.5s infinite'
                            }}
                          >
                            {unread > 9 ? '9+' : unread}
                          </span>
                        ) : null;
                      })()}
                    </button>
                  </div>
                )}

                <LanguageSelector buttonClassName="menu-pill menu-pill-fixed menu-pill-label shadow text-[13px]" compact />
                  </div>
                </div>
              </div>
            )}

            {appState === 'lobby' ? (
              <>
                <MultiplayerLobby
                  key={lobbyKey}
                  onGameStart={handleGameStart}
                  onBack={() => {}} // No back button needed since this is the main page
                  onGameStateChange={handleLobbyGameStateChange}
                  showChat={showLobbyChat}
                  onToggleChat={handleToggleLobbyChat}
                />
                {/* Chat Panel for lobby */}
                {lobbyGame && lobbyPlayerId && (
                  <ChatPanel
                    isOpen={showLobbyChat}
                    onClose={() => setShowLobbyChat(false)}
                    messages={lobbyGame.chatMessages ?? []}
                    playerId={lobbyPlayerId}
                    playerName={lobbyPlayerName}
                    gameId={lobbyGame.id}
                    isMobile={isMobile || isTablet}
                    playerColors={lobbyGame.players.reduce((acc, player) => {
                      acc[player.id] = player.color ? getPlayerColorFromString(player.color) : '#f5d98f';
                      return acc;
                    }, {} as Record<string, string>)}
                  />
                )}
              </>
            ) : appState === 'game' ? (
              <GameTable
                game={game}
                username={username}
                playerId={playerId}
                onBack={handleBackToLobby}
                minitutorial={localStorage.getItem('minitutorial_enabled') === 'true'}
              />
            ) : null}
          </div>
        </SettingsProvider>
      </StatisticsProvider>
    </LanguageProvider>
  );
}

export default App;
