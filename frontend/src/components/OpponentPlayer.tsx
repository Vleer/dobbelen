import React, { useState, useRef, useEffect } from "react";
import { Player } from "../types/game";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import DiceSVG from "./DiceSVG";

interface OpponentPlayerProps {
  player: Player;
  position: number; // 0 = left, 1 = right, 2 = across, etc.
  totalOpponents?: number;
  isMyTurn: boolean;
  isDealer: boolean;
  showDice?: boolean; // Show dice when revealed at end of round
  previousBid?: {
    quantity: number;
    faceValue: number;
    playerId: string;
  } | null;
  previousRoundPlayer?: Player; // Player from previous round for dice display
  isMobile?: boolean; // Mobile layout flag
  playerIndex?: number; // Index for color coding
  isRoundEnded?: boolean; // Round has ended – suppress turn-indicator animations
  isRoundLoser?: boolean; // This player lost a die this round – flash red briefly
  isRoundWinner?: boolean; // This player won this round – glow green
  compactMobile?: boolean; // Extra snug spacing for dense mobile layouts
}

const OpponentPlayer: React.FC<OpponentPlayerProps> = ({
  player,
  position,
  isMyTurn,
  isDealer,
  showDice = false,
  previousBid,
  previousRoundPlayer,
  isMobile = false,
  playerIndex = 0,
  isRoundEnded = false,
  isRoundLoser = false,
  isRoundWinner = false,
  totalOpponents = 0,
  compactMobile = false,
}) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();

  useEffect(() => {
    console.log("OpponentPlayer color:", player.color);
  }, [player.color]);
  const [showTurnAnim, setShowTurnAnim] = useState(false);
  const [showDiceAnim, setShowDiceAnim] = useState(false);
  const [showElimAnim, setShowElimAnim] = useState(false);
  const [showLoserAnim, setShowLoserAnim] = useState(false);
  const prevIsMyTurnRef = useRef(isMyTurn);
  const prevShowDiceRef = useRef(showDice);
  const prevEliminatedRef = useRef(player.eliminated);
  const prevIsRoundLoserRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("OpponentPlayer rendering:", {
      playerName: player.name,
      playerColor: player.color,
      playerId: player.id,
      playerIndex,
    });
  }, [player.name, player.color, player.id, playerIndex]);

  // Animate when it becomes this opponent's turn
  useEffect(() => {
    if (animationsEnabled && isMyTurn && !prevIsMyTurnRef.current) {
      setShowTurnAnim(true);
      const timer = setTimeout(() => setShowTurnAnim(false), 600);
      return () => clearTimeout(timer);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, animationsEnabled]);

  // Animate dice when they become visible (round reveal)
  useEffect(() => {
    if (animationsEnabled && showDice && !prevShowDiceRef.current) {
      setShowDiceAnim(true);
      const timer = setTimeout(() => setShowDiceAnim(false), 800);
      return () => clearTimeout(timer);
    }
    prevShowDiceRef.current = showDice;
  }, [showDice, animationsEnabled]);

  // Animate when this opponent gets eliminated
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

  // Debug logging
  console.log(`OpponentPlayer ${player.name}:`, {
    showDice,
    hasDice: player.dice && player.dice.length > 0,
    diceValues: player.dice,
    previousRoundPlayer: previousRoundPlayer
      ? {
          id: previousRoundPlayer.id,
          name: previousRoundPlayer.name,
          hasDice:
            previousRoundPlayer.dice && previousRoundPlayer.dice.length > 0,
          diceValues: previousRoundPlayer.dice,
        }
      : null,
  });

  const getDesktopPositionStyle = (): React.CSSProperties => {
    // 2 opponents: left and right at same height.
    // 3 opponents: simple arch around the local player.
    if (totalOpponents === 2) {
      return position === 0
        ? { left: "22%", top: "24%", transform: "translateX(-50%)" }
        : { left: "78%", top: "24%", transform: "translateX(-50%)" };
    }
    if (totalOpponents === 3) {
      if (position === 0) return { left: "22%", top: "24%", transform: "translateX(-50%)" };
      if (position === 1) return { left: "50%", top: "15%", transform: "translateX(-50%)" };
      return { left: "78%", top: "24%", transform: "translateX(-50%)" };
    }

    const spread = Math.max(totalOpponents, 1);
    const slot = Math.min(position + 1, spread);
    const leftPercent = (slot / (spread + 1)) * 100;
    return { left: `${leftPercent}%`, top: "18%", transform: "translateX(-50%)" };
  };

  const revealedDice = previousRoundPlayer?.dice || [];

  if (isMobile) {
    return (
      <div className={`relative ${compactMobile ? "mb-2" : "mb-6"}`} data-player-card={player.id}>
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="below"
          className="absolute left-1/2 bottom-0 w-0 h-0"
        />
        <div
          className={`rounded-xl shadow-lg select-none transition-all duration-300 ${
            activeTurn ? 'border-[3px]' : isRoundWinner ? 'border-[3px]' : 'border-2'
          } ${player.eliminated ? "opacity-50" : ""} ${compactMobile ? "p-1.5 h-[72px]" : "p-2 h-[82px]"} min-w-0 flex-shrink-0 w-full ${animClasses}`}
          style={{
            backgroundColor: 'var(--game-surface)',
            borderColor: activeTurn || isRoundWinner ? 'var(--game-highlight)' : 'var(--game-border)',
          }}
        >
          <div className={`h-full w-full flex flex-col justify-between ${compactMobile ? "gap-0.5" : "gap-1"}`}>
            <div className="flex items-center justify-center gap-1 min-w-0">
              <span className={`font-bold ${compactMobile ? "text-[10px]" : "text-[11px]"} truncate`} style={{ color: 'var(--game-accent-text)' }}>{player.name}</span>
            </div>
            <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
              {showDice && revealedDice.length > 0 ? (
                <div className="flex items-center gap-0.5 flex-nowrap">
                  {revealedDice.slice(0, 6).map((value, index) => (
                    <div
                      key={index}
                      className={showDiceAnim && animationsEnabled ? 'animate-dice-land' : ''}
                      style={{ animationDelay: showDiceAnim && animationsEnabled ? `${index * 55}ms` : '0ms' }}
                    >
                      <DiceSVG value={value} size="xs" />
                    </div>
                  ))}
                </div>
              ) : (
                <span className={`${compactMobile ? "text-[9px]" : "text-[10px]"} font-medium`} style={{ color: 'var(--game-text-muted)' }}>{t("game.diceHidden") || "Hidden"}</span>
              )}
            </div>
          </div>
        </div>
        <div className={`${compactMobile ? "mt-0.5" : "mt-1"} w-full flex items-center justify-between gap-0.5 px-1`}>
          {Array.from({ length: scoreSlots }, (_, index) => (
            <div
              key={`opp-mobile-score-${player.id}-${index}`}
              className={`${compactMobile ? "h-1" : "h-1.5"} flex-1 rounded-[2px] border ${
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
    );
  }

  return (
    <div
      className="absolute"
      style={getDesktopPositionStyle()}
    >
      <div className="relative pb-6 flex flex-col items-center" data-player-card={player.id}>
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="below"
          className="absolute left-1/2 bottom-0 w-0 h-0"
        />
        {/* Player Container - Rounded Rectangle with Green Background */}
        <div
          ref={containerRef}
          className={`w-72 h-[136px] rounded-2xl shadow-lg select-none transition-all duration-300 ${
            activeTurn ? 'border-[6px]' : isRoundWinner ? 'border-[6px]' : 'border-4'
          } ${
            player.eliminated ? "opacity-50" : ""
          } ${animClasses} flex flex-col items-center justify-between p-3`}
          style={{
            backgroundColor: 'var(--game-surface)',
            borderColor: activeTurn || isRoundWinner ? 'var(--game-highlight)' : 'var(--game-border)',
          }}
        >
          <div className="w-full h-full flex flex-col items-center justify-between">
          {/* Username with Dealer Button and Win Tokens */}
          <div className="text-center mb-1 min-h-8 flex items-center justify-center">
            <div className="flex items-center justify-center space-x-1">
              <span className="font-bold text-sm break-words" style={{ color: 'var(--game-accent-text)' }}>
                {player.name}
              </span>
            </div>
          </div>

          <div className="w-full flex-1 flex items-center justify-center px-1 overflow-hidden">
            {showDice && revealedDice.length > 0 ? (
              <div className="flex items-center gap-1 flex-nowrap">
                {revealedDice.slice(0, 6).map((value, index) => (
                  <div
                    key={index}
                    className={showDiceAnim && animationsEnabled ? 'animate-dice-land' : ''}
                    style={{ animationDelay: showDiceAnim && animationsEnabled ? `${index * 55}ms` : '0ms' }}
                  >
                    <DiceSVG value={value} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm font-medium" style={{ color: 'var(--game-text-muted)' }}>
                {t("game.diceHidden") || "Hidden"}
              </div>
            )}
          </div>

          {/* Previous Bid Display - Only show when relevant to current game state */}
          {previousBid &&
            previousBid.playerId === player.id &&
            !player.eliminated && (
              <div className="text-center text-xs font-bold mb-1 break-words" style={{ color: 'var(--game-accent-text)' }}>
                {t("game.previousBid", {
                  quantity: previousBid.quantity,
                  faceValue: previousBid.faceValue,
                })}
              </div>
            )}

        </div>
        </div>
        <div className="mt-1 w-72 flex items-center justify-between gap-1 px-1">
          {Array.from({ length: scoreSlots }, (_, index) => (
            <div
              key={`opp-desktop-score-${player.id}-${index}`}
              className={`h-2 flex-1 rounded-[2px] border ${
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
    </div>
  );
};

export default OpponentPlayer;
