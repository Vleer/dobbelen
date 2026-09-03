import type { CSSProperties } from 'react';

/** Shared visual language for in-round alive vs eliminated player cards. */

export function playerCardSurfaceStyle(opts: {
  eliminated: boolean;
  emphasized: boolean; // active turn or round winner
}): CSSProperties {
  const { eliminated, emphasized } = opts;
  if (eliminated) {
    return {
      backgroundColor: 'var(--game-surface-soft)',
      borderColor: 'var(--game-border)',
      opacity: 0.42,
      filter: 'grayscale(0.85) brightness(0.7)',
    };
  }
  return {
    backgroundColor: 'var(--game-surface)',
    // Still-in players: bright border so remaining count reads clearly
    borderColor: emphasized ? 'var(--game-highlight)' : 'var(--game-border-strong)',
    boxShadow: emphasized
      ? '0 0 0 1px var(--game-highlight), 0 0 14px color-mix(in srgb, var(--game-highlight) 40%, transparent)'
      : '0 0 0 1px color-mix(in srgb, var(--game-border-strong) 55%, transparent)',
    opacity: 1,
    filter: 'none',
  };
}
