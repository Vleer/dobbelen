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
  const sourcePlayers =
    players ||
    (game?.showAllDice && (game.previousRoundPlayers?.length || 0) > 0
      ? game.previousRoundPlayers
      : game?.players) ||
    [];

  // Merge colors from current game.players when analyzing a previous-round snapshot
  const playersWithColors = sourcePlayers.map((player) => {
    const currentPlayerData = game?.players.find((p) => p.id === player.id);
    return {
      ...player,
      color: currentPlayerData?.color || player.color || 'blue',
    };
  });

  // Include active players + the just-eliminated player (but not previously eliminated)
  const lastEliminatedId = game?.lastEliminatedPlayerId;
  const activePlayers = playersWithColors.filter(
    (player) =>
      !player.eliminated ||
      (player.eliminated && player.id === lastEliminatedId)
  );

  // Group dice by player and face value
  const diceByPlayer: {
    [playerId: string]: { [faceValue: number]: number[] };
  } = {};

  activePlayers.forEach((player) => {
    let playerDice = player.dice;

    if (
      player.eliminated &&
      player.id === lastEliminatedId &&
      game?.previousRoundPlayers
    ) {
      const previousPlayer = game.previousRoundPlayers.find(
        (p) => p.id === player.id
      );
      if (previousPlayer?.dice) {
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

  if (activePlayers.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-1 p-2 rounded-xl border overflow-x-auto"
      style={{
        backgroundColor: 'var(--game-surface-strong)',
        borderColor: 'var(--game-border)',
      }}
    >
      <div
        className="grid gap-x-2 gap-y-1 min-w-max"
        style={{
          gridTemplateColumns: `1.5rem repeat(${activePlayers.length}, minmax(2.5rem, 1fr))`,
        }}
      >
        {/* Header: empty corner + colored player names */}
        <div aria-hidden />
        {activePlayers.map((player) => {
          const playerColor = getPlayerColorFromString(player.color);
          return (
            <div
              key={`name-${player.id}`}
              className="text-center text-xs font-bold truncate px-0.5"
              style={{ color: playerColor }}
              title={player.name}
            >
              {player.name}
            </div>
          );
        })}

        {/* Divider under names */}
        <div
          className="col-span-full h-px my-0.5"
          style={{ backgroundColor: 'var(--game-border)' }}
        />

        {/* Rows: face value × player dice */}
        {[1, 2, 3, 4, 5, 6].map((faceValue) => (
          <React.Fragment key={faceValue}>
            <div
              className="flex items-center justify-center text-xs font-bold"
              style={{ color: 'var(--game-text-muted)' }}
            >
              {faceValue}
            </div>
            {activePlayers.map((player) => {
              const dice = diceByPlayer[player.id]?.[faceValue] || [];
              const playerColor = getPlayerColorFromString(player.color);

              return (
                <div
                  key={`${player.id}-${faceValue}`}
                  className="flex flex-wrap items-center justify-center gap-0.5 min-h-7"
                >
                  {dice.map((_, diceIndex) => (
                    <div
                      key={`${player.id}-${faceValue}-${diceIndex}`}
                      className="w-7 h-7 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: playerColor,
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: playerColor,
                      }}
                    >
                      <DiceSVG value={faceValue} size="xs" />
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default DiceAnalysisChart;
