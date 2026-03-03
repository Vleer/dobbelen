import React, { useState, useRef } from 'react';
import { Bid, Player } from '../types/game';
import { useLanguage } from "../contexts/LanguageContext";
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('bidDisplayPosition');
    return saved ? JSON.parse(saved) : null; // null = center of screen
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag functionality (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };
        setPosition(newPosition);
        localStorage.setItem("bidDisplayPosition", JSON.stringify(newPosition));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!currentBid) {
    return "";
  }

  // Get the player name who made the bid
  const bidderName = playerName || (players && currentPlayerId ? 
    players.find(p => p.id === currentBid.playerId)?.name : 
    t('common.unknownPlayer'));

  // Create an array of dice values for visualization
  const diceValues = Array(currentBid.quantity).fill(currentBid.faceValue);

  if (isMobile) {
    return (
      <div className="border-2 rounded-xl px-2 py-1.5 shadow-lg" style={{ backgroundColor: '#3d1f0d', borderColor: '#78350f' }}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-bold text-white truncate">{bidderName}</span>
          <div className="flex items-center flex-shrink-0">
            <DiceHandSVG diceValues={diceValues} size="xs" noWrap />
          </div>
        </div>
      </div>
    );
  }

  const isCentered = position === null;
  return (
    <div
      ref={containerRef}
      className="border-2 rounded-xl px-6 py-4 shadow-lg z-40 min-w-96 select-none relative"
      style={{
        backgroundColor: '#3d1f0d',
        borderColor: '#78350f',
        position: "fixed",
        ...(isCentered
          ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
          : { left: position.x, top: position.y }),
        zIndex: 1000,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-center space-x-6 drag-handle">
        <div className="text-xl font-bold text-white">{bidderName}</div>

        {/* Dice Visualization */}
        <div className="flex items-center space-x-2">
          <DiceHandSVG diceValues={diceValues} size="lg" />
        </div>
      </div>
    </div>
  );
};

export default BidDisplay;