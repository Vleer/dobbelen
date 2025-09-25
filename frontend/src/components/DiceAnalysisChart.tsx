import React from 'react';
import { Game, Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import DiceSVG from './DiceSVG';
import { getPlayerColor, getPlayerHexColor } from '../utils/playerColors';

interface DiceAnalysisChartProps {
  game: Game;
}

const DiceAnalysisChart: React.FC<DiceAnalysisChartProps> = ({ game }) => {
  const { t } = useLanguage();

  // Group dice by player and face value
  const diceByPlayer: { [playerId: string]: { [faceValue: number]: number[] } } = {};
  
  game.players.forEach((player, index) => {
    if (player.dice) {
      diceByPlayer[player.id] = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      player.dice.forEach(die => {
        if (die >= 1 && die <= 6) {
          diceByPlayer[player.id][die].push(die);
        }
      });
    }
  });

  const totalDice = game.players.reduce((sum, player) => sum + (player.dice?.length || 0), 0);

  return (
    <div className="mt-4 p-4 bg-green-800 border-2 border-black rounded-2xl">
      
      {/* Bar chart with dice stacked vertically */}
      <div className="grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map(faceValue => {
          // Collect all dice of this face value from all players
          const allDiceOfValue = game.players.map(player => ({
            player,
            dice: diceByPlayer[player.id][faceValue] || []
          })).filter(({ dice }) => dice.length > 0);
          
          const totalCount = allDiceOfValue.reduce((sum, { dice }) => sum + dice.length, 0);
          
          return (
            <div key={faceValue} className="flex flex-col items-center">
              <div className="text-xs text-green-300 mb-2 font-bold">{faceValue}</div>
              <div className="flex flex-col justify-end h-24 w-8 bg-green-700 rounded border border-black p-1">
                {/* Stack dice vertically */}
                <div className="flex flex-col-reverse gap-0.5">
                  {allDiceOfValue.map(({ player, dice }, playerIndex) => 
                    dice.map((_, diceIndex) => (
                      <div
                        key={`${player.id}-${diceIndex}`}
                        className="w-6 h-6 rounded border border-black flex items-center justify-center"
                        style={{ backgroundColor: getPlayerHexColor(game.players.indexOf(player)) }}
                      >
                        <DiceSVG value={faceValue} size="xs" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="text-xs text-green-200 mt-1 font-bold">{totalCount}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiceAnalysisChart;
