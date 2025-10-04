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
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('bidDisplayPosition');
    return saved ? JSON.parse(saved) : { x: window.innerWidth / 2 - 200, y: 20 };
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag functionality
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
    return (
      <div className="text-center text-gray-500 italic">
        {t("game.noCurrentBid")}
      </div>
    );
  }

  // Get the player name who made the bid
  const bidderName = playerName || (players && currentPlayerId ? 
    players.find(p => p.id === currentBid.playerId)?.name : 
    t('common.unknownPlayer'));

  // Create an array of dice values for visualization
  const diceValues = Array(currentBid.quantity).fill(currentBid.faceValue);

  if (isMobile) {
    return (
      <div className="bg-amber-900 border-2 border-amber-700 rounded-xl px-4 py-3 shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <div className="text-lg font-bold text-white">{bidderName}</div>

          {/* Dice Visualization */}
          <div className="flex items-center space-x-1">
            <DiceHandSVG diceValues={diceValues} size="sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-amber-900 border-2 border-amber-700 rounded-xl px-6 py-4 shadow-lg z-40 min-w-96 select-none relative"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
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