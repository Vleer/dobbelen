import React from 'react';
import { Game, Player } from '../types/game';
import DiceSVG from './DiceSVG';
import { getPlayerColorFromString } from "../utils/playerColors";

interface DiceAnalysisChartProps {
  game?: Game;
  players?: Player[];
}

const DiceAnalysisChart: React.FC<DiceAnalysisChartProps> = ({
  game,
  players,
}) => {
  // Use either provided players or game.players
  const allPlayers = players || game?.players || [];

  // When using previousRoundPlayers, we need to merge with current game.players to get colors
  const playersWithColors = allPlayers.map(player => {
    const currentPlayerData = game?.players.find(p => p.id === player.id);
    return {
      ...player,
      color: currentPlayerData?.color || player.color || '#888'
    };
  });

  // Include active players + the just-eliminated player (but not previously eliminated)
  const lastEliminatedId = game?.lastEliminatedPlayerId;
  const activePlayers = playersWithColors.filter(
    (player) =>
      !player.eliminated ||
      (player.eliminated && player.id === lastEliminatedId)
  );

  // Use previousRoundPlayers when showing results (contains dice state at time of doubt/spot-on)
  // Use current players as fallback for when results aren't being shown
  const playersToAnalyze = (game?.showAllDice && (game.previousRoundPlayers?.length || 0) > 0)
    ? game!.previousRoundPlayers!
    : game?.players || [];

  // Group dice by player and face value
  const diceByPlayer: {
    [playerId: string]: { [faceValue: number]: number[] };
  } = {};

  activePlayers.forEach((player, index) => {
    // For the just-eliminated player, use their dice from previousRoundPlayers (before elimination)
    let playerDice = player.dice;

    if (
      player.eliminated &&
      player.id === lastEliminatedId &&
      game?.previousRoundPlayers
    ) {
      const previousPlayer = game.previousRoundPlayers.find(
        (p) => p.id === player.id
      );
      if (previousPlayer && previousPlayer.dice) {
        playerDice = previousPlayer.dice;
      }
    }

    if (playerDice && playerDice.length > 0) {
      diceByPlayer[player.id] = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      playerDice.forEach((die) => {
        if (die >= 1 && die <= 6) {
          diceByPlayer[player.id][die].push(die);
        }
      });
    }
  });

  // Calculate max height needed for alignment
  const maxDiceCount = Math.max(
    ...[1, 2, 3, 4, 5, 6].map((faceValue) => {
      const allDiceOfValue = activePlayers
        .map((player) => ({
          dice: diceByPlayer[player.id]?.[faceValue] || [],
        }))
        .filter(({ dice }) => dice.length > 0);
      return allDiceOfValue.reduce((sum, { dice }) => sum + dice.length, 0);
    }),
    1 // Minimum of 1 to avoid zero height
  );

  // Calculate height: each die is 28px (h-7) + 2px gap between dice
  const columnHeight = Math.max(maxDiceCount * 30, 80); // 30px per die (28px + 2px gap), min 80px

  return (
    <div className="mt-2 p-2 bg-green-950 border-2 border-green-700 rounded-xl">
      {/* Bar chart with dice stacked vertically - Compact version */}
      <div className="grid grid-cols-6 gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((faceValue) => {
          // Collect all dice of this face value from all players
          const allDiceOfValue = activePlayers
            .map((player) => ({
              player,
              dice: diceByPlayer[player.id][faceValue] || [],
            }))
            .filter(({ dice }) => dice.length > 0);

          const totalCount = allDiceOfValue.reduce(
            (sum, { dice }) => sum + dice.length,
            0
          );

          return (
            <div key={faceValue} className="flex flex-col items-center">
              <div className="text-xs text-green-300 mb-1 font-bold">
                {faceValue}
              </div>
              <div
                className="flex flex-col justify-end w-8 bg-green-900 rounded border border-green-700 p-0.5"
                style={{ height: `${columnHeight}px` }}
              >
                {/* Stack dice vertically */}
                <div className="flex flex-col-reverse gap-0.5">
                  {allDiceOfValue.map(({ player, dice }, playerIndex) =>
                    dice.map((_, diceIndex) => {
                      // Use the player's assigned color from backend
                      const playerColor = getPlayerColorFromString(
                        player.color
                      );

                      return (
                        <div
                          key={`${player.id}-${diceIndex}`}
                          className="w-7 h-7 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: playerColor,
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderColor: playerColor,
                          }}
                        >
                          <DiceSVG value={faceValue} size="xs" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="text-xs text-green-200 mt-0.5 font-bold">
                {totalCount}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiceAnalysisChart;