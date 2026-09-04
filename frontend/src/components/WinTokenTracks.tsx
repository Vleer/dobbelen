import React from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../types/game';
import {
  BASE_POINTS_TO_WIN,
  getOvertimeSlotCount,
} from '../utils/winTokens';

interface WinTokenTracksProps {
  player: Player;
  /** All players — used to decide when overtime pips appear. */
  players: Player[];
  /** Pip height classes (match existing mobile/desktop sizes). */
  pipClassName?: string;
  className?: string;
}

/**
 * Base row of 7 pips (L→R), plus a reverse overtime row.
 * Overtime uses the same 7-column flex layout (invisible spacers) so
 * pip widths match the base row.
 */
const WinTokenTracks: React.FC<WinTokenTracksProps> = ({
  player,
  players,
  pipClassName = 'h-2.5',
  className = '',
}) => {
  const tokens = player.winTokens || 0;
  const baseFilled = Math.min(tokens, BASE_POINTS_TO_WIN);
  const overtimeCount = getOvertimeSlotCount(players);

  const pipStyle = (filled: boolean): CSSProperties => ({
    backgroundColor: filled ? 'var(--game-highlight)' : 'transparent',
    borderColor: filled ? 'var(--game-highlight)' : 'var(--game-border-strong)',
  });

  const overtimeRows: { start: number; count: number }[] = [];
  for (let start = 0; start < overtimeCount; start += BASE_POINTS_TO_WIN) {
    overtimeRows.push({
      start,
      count: Math.min(BASE_POINTS_TO_WIN, overtimeCount - start),
    });
  }

  return (
    <div className={`w-full flex flex-col gap-0.5 ${className}`}>
      <div className="w-full flex items-center justify-between gap-1">
        {Array.from({ length: BASE_POINTS_TO_WIN }, (_, index) => (
          <div
            key={`base-${index}`}
            className={`${pipClassName} flex-1 rounded-md border ${
              index < baseFilled ? '' : 'bg-transparent'
            }`}
            style={pipStyle(index < baseFilled)}
          />
        ))}
      </div>

      {overtimeRows.map((row) => (
        <div
          key={`ot-row-${row.start}`}
          className="w-full flex flex-row-reverse items-center justify-between gap-1"
          aria-label="Overtime points"
        >
          {Array.from({ length: BASE_POINTS_TO_WIN }, (_, i) => {
            if (i >= row.count) {
              return (
                <div
                  key={`ot-spacer-${row.start}-${i}`}
                  className={`${pipClassName} flex-1 invisible`}
                  aria-hidden
                />
              );
            }
            const index = row.start + i;
            const filled = tokens >= BASE_POINTS_TO_WIN + 1 + index;
            return (
              <div
                key={`ot-${index}`}
                className={`${pipClassName} flex-1 rounded-md border ${
                  filled ? '' : 'bg-transparent'
                }`}
                style={pipStyle(filled)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default WinTokenTracks;
