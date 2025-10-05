import React from 'react';
import { Game, Player } from '../types/game';
import DiceSVG from './DiceSVG';
import { getPlayerHexColor } from '../utils/playerColors';

interface DiceAnalysisChartProps {
  game?: Game;
  players?: Player[];
}

const DiceAnalysisChart: React.FC<DiceAnalysisChartProps> = ({ game, players }) => {
  // Use either provided players or game.players
  const activePlayers = players || game?.players || [];

  // Group dice by player and face value
  const diceByPlayer: { [playerId: string]: { [faceValue: number]: number[] } } = {};
  
  activePlayers.forEach((player, index) => {
    if (player.dice) {
      diceByPlayer[player.id] = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      player.dice.forEach(die => {
        if (die >= 1 && die <= 6) {
          diceByPlayer[player.id][die].push(die);
        }
      });
    }
  });

  // Calculate max height needed for alignment
  const maxDiceCount = Math.max(
    ...[1, 2, 3, 4, 5, 6].map(faceValue => {
      const allDiceOfValue = activePlayers.map(player => ({
        dice: diceByPlayer[player.id]?.[faceValue] || []
      })).filter(({ dice }) => dice.length > 0);
      return allDiceOfValue.reduce((sum, { dice }) => sum + dice.length, 0);
    }),
    1 // Minimum of 1 to avoid zero height
  );

  // Calculate height: each die is 28px (h-7) + 2px gap between dice
  const columnHeight = Math.max(maxDiceCount * 30, 80); // 30px per die (28px + 2px gap), min 80px

  return (
    <div className="mt-2 p-2 bg-green-800 border-2 border-black rounded-xl">
      
      {/* Bar chart with dice stacked vertically - Compact version */}
      <div className="grid grid-cols-6 gap-1.5">
        {[1, 2, 3, 4, 5, 6].map(faceValue => {
          // Collect all dice of this face value from all players
          const allDiceOfValue = activePlayers.map(player => ({
            player,
            dice: diceByPlayer[player.id][faceValue] || []
          })).filter(({ dice }) => dice.length > 0);
          
          const totalCount = allDiceOfValue.reduce((sum, { dice }) => sum + dice.length, 0);
          
          return (
            <div key={faceValue} className="flex flex-col items-center">
              <div className="text-xs text-green-300 mb-1 font-bold">{faceValue}</div>
              <div 
                className="flex flex-col justify-end w-8 bg-green-700 rounded border border-black p-0.5"
                style={{ height: `${columnHeight}px` }}
              >
                {/* Stack dice vertically */}
                <div className="flex flex-col-reverse gap-0.5">
                  {allDiceOfValue.map(({ player, dice }, playerIndex) => 
                    dice.map((_, diceIndex) => (
                      <div
                        key={`${player.id}-${diceIndex}`}
                        className="w-7 h-7 rounded border border-black flex items-center justify-center"
                        style={{ backgroundColor: getPlayerHexColor(activePlayers.indexOf(player)) }}
                      >
                        <DiceSVG value={faceValue} size="xs" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="text-xs text-green-200 mt-0.5 font-bold">{totalCount}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiceAnalysisChart;