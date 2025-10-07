// Color palette for players - sophisticated, muted tones for dark background
// Uses color theory principles: complementary and analogous colors with good contrast
// Local player (index 0): teal (calming, distinctive)
// Opponents: warm/cool balance with distinct hues
export const PLAYER_COLORS = [
  'bg-teal-700',     // Local player - sophisticated teal
  'bg-indigo-800',   // First opponent - deep indigo
  'bg-rose-800',     // Second opponent - muted rose
  'bg-amber-700',    // Third - warm amber
  'bg-purple-800',   // Fourth - rich purple
  'bg-emerald-800',  // Fifth - deep emerald
  'bg-orange-800',   // Sixth - burnt orange
  'bg-sky-800'       // Seventh - sky blue
];

export const PLAYER_BORDER_COLORS = [
  'border-teal-400',     // Local player - bright teal accent
  'border-indigo-400',   // First opponent
  'border-rose-400',     // Second opponent
  'border-amber-400',    // Third
  'border-purple-400',   // Fourth
  'border-emerald-400',  // Fifth
  'border-orange-400',   // Sixth
  'border-sky-400'       // Seventh
];

export const PLAYER_TEXT_COLORS = [
  'text-teal-200',     // Local player
  'text-indigo-200',   // First opponent
  'text-rose-200',     // Second opponent
  'text-amber-200',    // Third
  'text-purple-200',   // Fourth
  'text-emerald-200',  // Fifth
  'text-orange-200',   // Sixth
  'text-sky-200'       // Seventh
];

// Color mapping for dice analysis (hex colors) - updated to match new palette
export const PLAYER_HEX_COLORS = [
  '#0f766e', // teal-700
  '#3730a3', // indigo-800
  '#9f1239', // rose-800
  '#b45309', // amber-700
  '#6b21a8', // purple-800
  '#065f46', // emerald-800
  '#9a3412', // orange-800
  '#075985'  // sky-800
];

// Map backend color strings to hex colors - darker, classy jewel tones for poker table theme
export const COLOR_STRING_TO_HEX: { [key: string]: string } = {
  'blue': '#6366f1',   // indigo-500 (rich royal indigo)
  'red': '#f43f5e',    // rose-500 (deep rose red)
  'green': '#10b981',  // emerald-500 (elegant emerald)
  'yellow': '#f59e0b', // amber-500 (sophisticated gold)
  'brown': '#d97706',  // amber-600 (rich cognac brown)
  'cyan': '#06b6d4',   // cyan-500 (luxe teal cyan)
  'purple': '#a855f7', // purple-500 (royal purple)
  'pink': '#ec4899',   // pink-500 (elegant fuchsia)
};

export function getPlayerColor(playerIndex: number, type: 'bg' | 'border' | 'text' = 'bg'): string {
  const colors = type === 'bg' ? PLAYER_COLORS : type === 'border' ? PLAYER_BORDER_COLORS : PLAYER_TEXT_COLORS;
  return colors[playerIndex % colors.length];
}

export function getPlayerHexColor(playerIndex: number): string {
  return PLAYER_HEX_COLORS[playerIndex % PLAYER_HEX_COLORS.length];
}

export function getPlayerColorFromString(colorString: string): string {
  return COLOR_STRING_TO_HEX[colorString.toLowerCase()] || '#1d4ed8'; // default to blue
}
