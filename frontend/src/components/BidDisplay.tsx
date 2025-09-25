import React from 'react';
import { Bid, Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import DiceHand from './DiceHand';
import DiceHandSVG from './DiceHandSVG';

interface BidDisplayProps {
  currentBid: Bid | null;
  currentPlayerId?: string;
  players?: Player[];
  roundNumber?: number;
  winner?: string;
  playerName?: string;
}

const BidDisplay: React.FC<BidDisplayProps> = ({ currentBid, currentPlayerId, players, roundNumber, winner, playerName }) => {
  const { t } = useLanguage();
  
  if (!currentBid) {
    return (
      <div className="text-center text-gray-500 italic">
        {t('game.noCurrentBid')}
      </div>
    );
  }

  const faceValueNames = {
    1: t('game.ones'),
    2: t('game.twos'), 
    3: t('game.threes'),
    4: t('game.fours'),
    5: t('game.fives'),
    6: t('game.sixes')
  };

  // Get the player name who made the bid
  const bidderName = playerName || (players && currentPlayerId ? 
    players.find(p => p.id === currentBid.playerId)?.name : 
    t('common.unknownPlayer'));

  // Create an array of dice values for visualization
  const diceValues = Array(currentBid.quantity).fill(currentBid.faceValue);

  return (
    <div className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2 bg-amber-900 border-2 border-amber-700 rounded-xl px-3 py-2 md:px-6 md:py-4 shadow-lg z-40 min-w-80 md:min-w-96">
      <div className="flex items-center justify-center space-x-3 md:space-x-6">
        <div className="text-lg md:text-xl font-bold text-white">
          {bidderName} {t('game.bids')}
        </div>
        <div className="text-xl md:text-2xl font-bold text-amber-200">
          {currentBid.quantity} {faceValueNames[currentBid.faceValue as keyof typeof faceValueNames]}
        </div>
        
        {/* Dice Visualization */}
        <div className="flex items-center space-x-1 md:space-x-2">
          <DiceHandSVG diceValues={diceValues} size="sm" />
        </div>
      </div>
    </div>
  );
};

export default BidDisplay;