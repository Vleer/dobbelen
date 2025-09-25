// Color palette for players - matte colors
// Local player (index 0): dark green
// First two opponents (index 1, 2): dark blue, dark red
// Rest: random colors
export const PLAYER_COLORS = [
  'bg-green-700', // Local player - dark green
  'bg-blue-700',  // First opponent - dark blue
  'bg-red-700',   // Second opponent - dark red
  'bg-yellow-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-orange-600'
];

export const PLAYER_BORDER_COLORS = [
  'border-green-400', // Local player
  'border-blue-400',  // First opponent
  'border-red-400',   // Second opponent
  'border-yellow-400', 'border-purple-400', 'border-pink-400', 'border-indigo-400', 'border-orange-400'
];

export const PLAYER_TEXT_COLORS = [
  'text-green-200', // Local player
  'text-blue-200',  // First opponent
  'text-red-200',   // Second opponent
  'text-yellow-200', 'text-purple-200', 'text-pink-200', 'text-indigo-200', 'text-orange-200'
];

// Color mapping for dice analysis (hex colors)
export const PLAYER_HEX_COLORS = [
  '#15803d', // dark green
  '#1d4ed8', // dark blue
  '#b91c1c', // dark red
  '#ca8a04', '#9333ea', '#db2777', '#4f46e5', '#ea580c'
];

export function getPlayerColor(playerIndex: number, type: 'bg' | 'border' | 'text' = 'bg'): string {
  const colors = type === 'bg' ? PLAYER_COLORS : type === 'border' ? PLAYER_BORDER_COLORS : PLAYER_TEXT_COLORS;
  return colors[playerIndex % colors.length];
}

export function getPlayerHexColor(playerIndex: number): string {
  return PLAYER_HEX_COLORS[playerIndex % PLAYER_HEX_COLORS.length];
}
