import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import DiceSVG from './DiceSVG';
import { playerCardSurfaceStyle } from '../utils/playerCardStyles';
import WinTokenTracks from './WinTokenTracks';

interface LocalPlayerProps {
  player: Player;
  players: Player[];
  isMyTurn: boolean;
  isDealer: boolean;
  onAction: (action: string, data?: any) => void;
  disabled: boolean;
  currentBid: any;
  previousBid?: { quantity: number; faceValue: number; playerId: string } | null;
  isMobile?: boolean;
  isRoundEnded?: boolean;
  isRoundLoser?: boolean;
  isRoundWinner?: boolean;
  landscapeMobile?: boolean;
  compactDesktopLandscape?: boolean;
  docked?: boolean;
}

const LocalPlayer: React.FC<LocalPlayerProps> = ({
  player,
  players,
  isMyTurn,
  isDealer,
  onAction,
  disabled,
  currentBid,
  previousBid,
  isMobile = false,
  isRoundEnded = false,
  isRoundLoser = false,
  isRoundWinner = false,
  landscapeMobile = false,
  compactDesktopLandscape = false,
  docked = false,
}) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();
  const [showTurnAnim, setShowTurnAnim] = useState(false);
  const [showElimAnim, setShowElimAnim] = useState(false);
  const [showLoserAnim, setShowLoserAnim] = useState(false);
  const prevIsMyTurnRef = useRef(isMyTurn);
  const prevEliminatedRef = useRef(player.eliminated);
  const prevIsRoundLoserRef = useRef(false);

  const diceValues = player.dice || [];

  useEffect(() => {
    if (animationsEnabled && isMyTurn && !prevIsMyTurnRef.current) {
      setShowTurnAnim(true);
      const timer = setTimeout(() => setShowTurnAnim(false), 600);
      return () => clearTimeout(timer);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, animationsEnabled]);

  useEffect(() => {
    if (animationsEnabled && player.eliminated && !prevEliminatedRef.current) {
      setShowElimAnim(true);
      const timer = setTimeout(() => setShowElimAnim(false), 700);
      return () => clearTimeout(timer);
    }
    prevEliminatedRef.current = player.eliminated;
  }, [player.eliminated, animationsEnabled]);

  useEffect(() => {
    if (animationsEnabled && isRoundLoser && !prevIsRoundLoserRef.current) {
      setShowLoserAnim(true);
      const timer = setTimeout(() => setShowLoserAnim(false), 700);
      return () => clearTimeout(timer);
    }
    prevIsRoundLoserRef.current = isRoundLoser;
  }, [isRoundLoser, animationsEnabled]);

  const activeTurn = isMyTurn && !isRoundEnded;

  const animClasses = [
    showTurnAnim && animationsEnabled ? 'animate-turn-start' : '',
    activeTurn && animationsEnabled ? 'animate-turn-glow' : '',
    (showElimAnim || showLoserAnim) && animationsEnabled ? 'animate-elim-flash' : '',
    isRoundWinner && animationsEnabled ? 'animate-pulse-green' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (isMobile) {
    return (
      <div
        className={`relative z-[1200] pt-4 ${landscapeMobile ? 'max-w-[min(100%,22rem)] mx-auto' : ''}`}
        data-player-card={player.id}
      >
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="above"
          className="absolute left-1/2 top-0 w-0 h-0"
        />
        <div className="px-2 mb-1">
          <WinTokenTracks player={player} players={players} pipClassName="h-2.5" />
        </div>
        <div
          className={`w-full p-3 shadow-2xl select-none transition-all duration-300 rounded-t-3xl border-x border-t ${
            activeTurn ? 'border-t-4' : isRoundWinner ? 'border-t-4' : 'border-t-2'
          } ${animClasses} ${landscapeMobile ? 'h-[64px] p-2' : 'h-[76px]'}`}
          style={{
            ...playerCardSurfaceStyle({
              eliminated: player.eliminated,
              emphasized: activeTurn || isRoundWinner,
            }),
            backgroundColor: player.eliminated
              ? 'var(--game-surface-soft)'
              : 'var(--game-surface-strong)',
            overflow: 'visible',
          }}
        >
          <div className="h-full flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex items-center gap-1.5">
              <span
                className="font-bold text-sm truncate"
                style={{ color: 'var(--game-accent-text)' }}
              >
                {player.name}
              </span>
            </div>
            <div className="flex-1 h-full flex items-center justify-end overflow-visible">
              <div className="flex items-center gap-1 flex-nowrap relative z-50">
                {diceValues.slice(0, 6).map((value, index) => (
                  <DiceSVG key={index} value={value} size="sm" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={docked ? 'relative z-[1200]' : 'absolute z-[1200]'}
      style={
        docked
          ? undefined
          : {
              left: '50%',
              bottom: '2rem',
              transform: 'translateX(-50%)',
            }
      }
    >
      <div className={`relative ${docked ? 'pt-0' : 'pt-5'}`} data-player-card={player.id}>
        <div
          data-dealer-anchor={player.id}
          data-dealer-placement="above"
          className={`absolute left-1/2 w-0 h-0 ${docked ? '-top-1' : 'top-0'}`}
        />
        <div className={`w-full px-1 ${docked ? 'mb-1.5 mt-0.5' : 'mb-2'}`}>
          <div
            className={`max-w-[80vw] ${
              compactDesktopLandscape ? 'w-[min(360px,80vw)]' : 'w-[min(420px,80vw)]'
            }`}
          >
            <WinTokenTracks
              player={player}
              players={players}
              pipClassName={docked ? 'h-3' : 'h-3.5'}
            />
          </div>
        </div>
        <div
          className={`p-3 rounded-3xl shadow-2xl select-none transition-all duration-300 ${
            activeTurn ? 'border-[6px] scale-[1.03]' : isRoundWinner ? 'border-[6px]' : 'border-4'
          } ${animClasses}`}
          style={{
            ...playerCardSurfaceStyle({
              eliminated: player.eliminated,
              emphasized: activeTurn || isRoundWinner,
            }),
            backgroundColor: player.eliminated
              ? 'var(--game-surface-soft)'
              : 'var(--game-surface-strong)',
            width: compactDesktopLandscape ? 'min(360px, 80vw)' : 'min(420px, 80vw)',
            height: compactDesktopLandscape ? '100px' : '112px',
            maxWidth: '80vw',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'visible',
          }}
        >
          <div className="w-full h-full flex items-center justify-between gap-4">
            <div
              className={`${
                compactDesktopLandscape ? 'w-[120px]' : 'w-[140px]'
              } shrink-0 flex flex-col justify-center gap-1`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-bold text-xl truncate"
                  style={{ color: 'var(--game-accent-text)' }}
                >
                  {player.name}
                </span>
              </div>
              {previousBid &&
                previousBid.playerId === player.id &&
                !player.eliminated && (
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {Array.from({ length: previousBid.quantity }).map((_, index) => (
                      <DiceSVG key={index} value={previousBid.faceValue} size="xs" />
                    ))}
                  </div>
                )}
            </div>

            <div className="flex-1 flex items-center justify-end overflow-visible">
              <div className="flex items-center gap-1.5 flex-nowrap relative z-50">
                {diceValues.slice(0, 6).map((value, index) => (
                  <DiceSVG
                    key={index}
                    value={value}
                    size={compactDesktopLandscape ? 'sm' : 'md'}
                  />
                ))}
              </div>
            </div>
          </div>

          {player.eliminated && (
            <div
              className="text-center font-medium text-sm rounded-lg p-2 border opacity-60"
              style={{
                color: 'var(--game-text-muted)',
                backgroundColor: 'var(--game-surface)',
                borderColor: 'var(--game-border)',
              }}
            >
              {t('game.eliminated')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalPlayer;
