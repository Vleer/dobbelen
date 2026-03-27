import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import DiceSVG from './DiceSVG';

interface LocalPlayerProps {
  player: Player;
  isMyTurn: boolean;
  isDealer: boolean;
  onAction: (action: string, data?: any) => void;
  disabled: boolean;
  currentBid: any;
  previousBid?: { quantity: number; faceValue: number; playerId: string } | null;
  showDice?: boolean; // Show dice when revealed at end of round
  previousRoundPlayer?: Player; // Player from previous round for dice display
  isMobile?: boolean; // Mobile layout flag
  isRoundEnded?: boolean; // Round has ended – suppress turn-indicator animations
  isRoundLoser?: boolean; // This player lost a die this round – flash red briefly
  isRoundWinner?: boolean; // This player won this round – glow green
  /** Mobile/tablet: shorter bar in landscape */
  landscapeMobile?: boolean;
  /** Desktop: slightly smaller card in landscape */
  compactDesktopLandscape?: boolean;
}

const LocalPlayer: React.FC<LocalPlayerProps> = ({ player, isMyTurn, isDealer, onAction, disabled, currentBid, previousBid, showDice = false, previousRoundPlayer, isMobile = false, isRoundEnded = false, isRoundLoser = false, isRoundWinner = false, landscapeMobile = false, compactDesktopLandscape = false }) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();
  const [isDiceVisible, setIsDiceVisible] = useState(true);
  const [showTurnAnim, setShowTurnAnim] = useState(false);
  const [showElimAnim, setShowElimAnim] = useState(false);
  const [showLoserAnim, setShowLoserAnim] = useState(false);
  const touchHandledRef = useRef(false);
  const prevIsMyTurnRef = useRef(isMyTurn);
  const prevEliminatedRef = useRef(player.eliminated);
  const prevIsRoundLoserRef = useRef(false);
  
  // Use previous round dice if showing reveal, otherwise current dice
  const diceValues = (showDice && previousRoundPlayer) ? previousRoundPlayer.dice : (player.dice || []);
  
  // When showDice is true (end of round reveal), always show dice regardless of toggle
  const shouldShowDice = showDice || isDiceVisible;
  
  // Handle toggle click
  const handleToggleDiceVisibility = () => {
    console.log('=== Eye Toggle Clicked ===');
    console.log('Current isDiceVisible:', isDiceVisible);
    console.log('showDice prop:', showDice);
    const newValue = !isDiceVisible;
    console.log('Setting isDiceVisible to:', newValue);
    setIsDiceVisible(newValue);
  };

  // Eye icon components - with logging
  const EyeOpenIcon = () => {
    console.log('Rendering EyeOpenIcon');
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    );
  };

  const EyeClosedIcon = () => {
    console.log('Rendering EyeClosedIcon');
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    );
  };

  useEffect(() => {
    console.log('LocalPlayer rendering:', {
      playerName: player.name,
      playerColor: player.color,
      playerId: player.id
    });
  }, [player.name, player.color, player.id]);

  // Debug: Log when isDiceVisible changes
  useEffect(() => {
    console.log('isDiceVisible state changed to:', isDiceVisible);
    console.log('shouldShowDice is now:', shouldShowDice);
  }, [isDiceVisible, shouldShowDice]);

  // Animate the container when it becomes the local player's turn
  useEffect(() => {
    if (animationsEnabled && isMyTurn && !prevIsMyTurnRef.current) {
      setShowTurnAnim(true);
      const timer = setTimeout(() => setShowTurnAnim(false), 600);
      return () => clearTimeout(timer);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, animationsEnabled]);

  // Animate the container when this player gets eliminated
  useEffect(() => {
    if (animationsEnabled && player.eliminated && !prevEliminatedRef.current) {
      setShowElimAnim(true);
      const timer = setTimeout(() => setShowElimAnim(false), 700);
      return () => clearTimeout(timer);
    }
    prevEliminatedRef.current = player.eliminated;
  }, [player.eliminated, animationsEnabled]);

  // Flash red briefly when this player is the round loser (lost a die this round)
  useEffect(() => {
    if (animationsEnabled && isRoundLoser && !prevIsRoundLoserRef.current) {
      setShowLoserAnim(true);
      const timer = setTimeout(() => setShowLoserAnim(false), 700);
      return () => clearTimeout(timer);
    }
    prevIsRoundLoserRef.current = isRoundLoser;
  }, [isRoundLoser, animationsEnabled]);

  const scoreSlots = 7;
  const filledScore = Math.min(player.winTokens || 0, scoreSlots);

  // Computed state flags
  const activeTurn = isMyTurn && !isRoundEnded;

  // Computed animation classes (shared between mobile and desktop)
  const animClasses = [
    showTurnAnim && animationsEnabled ? 'animate-turn-start' : '',
    activeTurn && animationsEnabled ? 'animate-turn-glow' : '',
    (showElimAnim || showLoserAnim) && animationsEnabled ? 'animate-elim-flash' : '',
    isRoundWinner && animationsEnabled ? 'animate-pulse-green' : '',
  ].filter(Boolean).join(' ');

  if (isMobile) {
    return (
      <div className={`relative pt-4 ${landscapeMobile ? "max-w-[min(100%,22rem)] mx-auto" : ""}`} data-player-card={player.id}>
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="above"
          className="absolute left-1/2 top-0 w-0 h-0"
        />
        <div className="px-2 mb-1">
          <div className="w-full flex items-center justify-between gap-1">
            {Array.from({ length: scoreSlots }, (_, index) => (
              <div
                key={`local-mobile-score-${index}`}
                className={`h-2.5 flex-1 rounded-sm border ${
                  index < filledScore ? "" : "bg-transparent"
                }`}
                style={{
                  backgroundColor: index < filledScore ? 'var(--game-highlight)' : 'transparent',
                  borderColor: index < filledScore ? 'var(--game-highlight)' : 'var(--game-border-strong)',
                }}
              />
            ))}
          </div>
        </div>
        <div
          className={`w-full p-3 shadow-2xl select-none transition-all duration-300 rounded-t-3xl border-x border-t ${
            activeTurn ? 'border-t-4' : isRoundWinner ? 'border-t-4' : 'border-t-2'
          } ${player.eliminated ? "opacity-70" : ""} ${animClasses} ${landscapeMobile ? "h-[72px] p-2" : "h-[86px]"}`}
          style={{
            backgroundColor: 'var(--game-surface-strong)',
            borderColor: activeTurn || isRoundWinner ? 'var(--game-highlight)' : 'var(--game-border)',
          }}
        >
          <div className="h-full flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-bold text-sm truncate" style={{ color: 'var(--game-accent-text)' }}>{player.name}</span>
              {!showDice && (
                <button
                  type="button"
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    touchHandledRef.current = true;
                    handleToggleDiceVisibility();
                    setTimeout(() => { touchHandledRef.current = false; }, 300);
                  }}
                  onClick={(e) => {
                    if (touchHandledRef.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleDiceVisibility();
                  }}
                  className="p-1 rounded-md border flex-shrink-0 cursor-pointer z-50 relative touch-manipulation min-w-8 min-h-8 flex items-center justify-center"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", borderColor: 'var(--game-border-strong)', backgroundColor: 'var(--game-surface-soft)', color: 'var(--game-accent-text)' }}
                  aria-label={isDiceVisible ? "Hide dice" : "Show dice"}
                >
                  <div className="pointer-events-none w-3 h-3 [&_svg]:w-3 [&_svg]:h-3">
                    {isDiceVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </div>
                </button>
              )}
            </div>
            <div className="flex-1 h-full flex items-center justify-end overflow-hidden">
              {shouldShowDice ? (
                <div className="flex items-center gap-1 flex-nowrap">
                  {diceValues.slice(0, 6).map((value, index) => (
                    <DiceSVG key={index} value={value} size="sm" />
                  ))}
                </div>
              ) : (
                <span className="text-xs italic" style={{ color: 'var(--game-text-muted)' }}>{t("game.diceHidden") || "Hidden"}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute"
      style={{
        left: "50%",
        bottom: "2rem",
        transform: "translateX(-50%)",
      }}
    >
      {/* Relative wrapper for badge + card */}
      <div className="relative pt-5" data-player-card={player.id}>
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="above"
          className="absolute left-1/2 top-0 w-0 h-0"
        />
        <div className="w-full mb-2 px-1">
          <div
            className={`flex items-center justify-between gap-1.5 max-w-[95vw] ${
              compactDesktopLandscape ? "w-[min(360px,88vw)]" : "w-[420px]"
            }`}
          >
            {Array.from({ length: scoreSlots }, (_, index) => (
              <div
                key={`local-desktop-score-${index}`}
                className={`h-3.5 flex-1 rounded-sm border ${
                  index < filledScore ? "" : "bg-transparent"
                }`}
                style={{
                  backgroundColor: index < filledScore ? 'var(--game-highlight)' : 'transparent',
                  borderColor: index < filledScore ? 'var(--game-highlight)' : 'var(--game-border-strong)',
                }}
              />
            ))}
          </div>
        </div>
        {/* Player Container */}
        <div
          className={`p-6 rounded-3xl shadow-2xl select-none transition-all duration-300 ${
            activeTurn ? 'border-[6px] scale-[1.03]' : isRoundWinner ? 'border-[6px]' : 'border-4'
          } ${
            player.eliminated ? "opacity-50" : ""
          } ${animClasses}`}
        style={{
          backgroundColor: 'var(--game-surface-strong)',
          borderColor: activeTurn || isRoundWinner ? 'var(--game-highlight)' : 'var(--game-border)',
          width: compactDesktopLandscape ? "min(360px, 88vw)" : "420px",
          height: compactDesktopLandscape ? "168px" : "190px",
          maxWidth: "95vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          overflow: "hidden",
        }}
      >
          <div className="w-full h-full flex items-center justify-between gap-4">
            {/* Left meta column */}
            <div className="min-w-[140px] max-w-[180px] flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl truncate" style={{ color: 'var(--game-accent-text)' }}>
              {player.name}
            </span>
              </div>
            {/* Win Tokens */}
            {/* Eye toggle button - next to name */}
            {!showDice && (
              <button
                type="button"
                onClick={(e) => {
                  console.log("DESKTOP BUTTON CLICKED!", e);
                  console.log("isDiceVisible before toggle:", isDiceVisible);
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleDiceVisibility();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="rounded-md border transition-all cursor-pointer z-50 relative"
                style={{
                  pointerEvents: "auto",
                  padding: 4,
                  minWidth: 30,
                  minHeight: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: 'var(--game-border-strong)',
                  backgroundColor: 'var(--game-surface-soft)',
                  color: 'var(--game-accent-text)',
                }}
                aria-label={isDiceVisible ? "Hide dice" : "Show dice"}
              >
                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isDiceVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </span>
              </button>
            )}
            </div>

            {/* Right dice row */}
            <div className="flex-1 flex items-center justify-end overflow-hidden">
              {shouldShowDice ? (
                <div className="flex items-center gap-1 flex-nowrap">
                  {diceValues.slice(0, 6).map((value, index) => (
                    <DiceSVG key={index} value={value} size="sm" />
                  ))}
                </div>
              ) : (
                <div className="text-lg italic w-full text-center" style={{ color: 'var(--game-text-muted)' }}>
                  {t("game.diceHidden") || "Hidden"}
                </div>
              )}
            </div>
          </div>

        {/* Previous Bid Display - Only show when relevant to current game state */}
        {previousBid &&
          previousBid.playerId === player.id &&
          !player.eliminated && (
            <div className="text-center font-bold text-sm mb-2" style={{ color: 'var(--game-accent-text)' }}>
              {t("game.previousBid", {
                quantity: previousBid.quantity,
                faceValue: previousBid.faceValue,
              })}
            </div>
          )}

        {/* Eliminated State */}
        {player.eliminated && (
          <div className="text-center font-bold text-xl rounded-lg p-3 border" style={{ color: 'var(--game-accent-text)', backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)' }}>
            {t("game.eliminated")}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default LocalPlayer;