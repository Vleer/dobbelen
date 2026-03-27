import React, { useState, useRef, useEffect } from 'react';
import { Bid, Player } from '../types/game';
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import DiceHandSVG from './DiceHandSVG';

interface BidDisplayProps {
  currentBid: Bid | null;
  currentPlayerId?: string;
  players?: Player[];
  roundNumber?: number;
  winner?: string;
  playerName?: string;
  isMobile?: boolean;
}

const BidDisplay: React.FC<BidDisplayProps> = ({ currentBid, currentPlayerId, players, roundNumber, winner, playerName, isMobile = false }) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();
  const [showSlideAnim, setShowSlideAnim] = useState(false);
  const prevBidKeyRef = useRef('');

  // Animate whenever the bid changes
  useEffect(() => {
    if (!currentBid) return;
    const newKey = `${currentBid.quantity}-${currentBid.faceValue}-${currentBid.playerId}`;
    if (newKey !== prevBidKeyRef.current && animationsEnabled) {
      prevBidKeyRef.current = newKey;
      setShowSlideAnim(true);
      const timer = setTimeout(() => setShowSlideAnim(false), 400);
      return () => clearTimeout(timer);
    }
    prevBidKeyRef.current = newKey;
  }, [currentBid, animationsEnabled]);

  if (!currentBid) {
    return null;
  }

  // Get the player name who made the bid
  const bidderName = playerName || (players && currentPlayerId ? 
    players.find(p => p.id === currentBid.playerId)?.name : 
    t('common.unknownPlayer'));

  // Create an array of dice values for visualization
  const diceValues = Array(currentBid.quantity).fill(currentBid.faceValue);

  if (isMobile) {
    return (
      <div className={`border-2 rounded-xl px-3 py-2 shadow-lg ${showSlideAnim && animationsEnabled ? 'animate-slide-up' : ''}`} style={{ backgroundColor: 'var(--game-surface)', borderColor: 'var(--game-border-strong)' }}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--game-text)' }}>{bidderName}</span>
          <div className="flex items-center flex-shrink-0">
            <DiceHandSVG diceValues={diceValues} size="xs" noWrap />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 rounded-xl px-6 py-4 shadow-lg z-40 min-w-96 select-none relative ${showSlideAnim && animationsEnabled ? 'animate-slide-up' : ''}`}
      style={{
        backgroundColor: 'var(--game-surface)',
        borderColor: 'var(--game-border-strong)',
        position: "fixed",
        left: "50%",
        top: "calc(50% + 64px)",
        transform: "translateX(-50%)",
        zIndex: 1000
      }}
    >
      <div className="flex items-center justify-center space-x-6">
        <div className="text-xl font-bold" style={{ color: 'var(--game-text)' }}>{bidderName}</div>

        {/* Dice Visualization */}
        <div className="flex items-center space-x-2">
          <DiceHandSVG diceValues={diceValues} size="lg" />
        </div>
      </div>
    </div>
  );
};

export default BidDisplay;