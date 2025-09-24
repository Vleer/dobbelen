import React from 'react';
import { Bid, Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import DiceHand from './DiceHand';

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
    <div className="bg-amber-900 border-4 border-amber-700 rounded-3xl p-6 shadow-2xl">
      <div className="text-center">
        <div className="text-xl font-bold text-white mb-3">
          {bidderName} {t('game.bids')}
        </div>
        <div className="text-2xl font-bold text-amber-200 mb-4">
          {currentBid.quantity} {faceValueNames[currentBid.faceValue as keyof typeof faceValueNames]}
        </div>
        
        {/* Dice Visualization */}
        <div className="flex justify-center mb-3">
          <DiceHand diceValues={diceValues} />
        </div>
        
        <div className="text-sm text-red-200">
          {currentBid.quantity} {t('game.dice')} {t('common.showing')} {currentBid.faceValue}
        </div>
      </div>
    </div>
  );
};

export default BidDisplay;