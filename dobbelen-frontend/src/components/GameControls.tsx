import React from 'react';

interface GameControlsProps {
  onNewGame: () => void;
  onRefresh: () => void;
  disabled: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({ onNewGame, onRefresh, disabled }) => {
  return (
    <div className="absolute top-4 left-4 space-x-2">
      <button
        onClick={onNewGame}
        disabled={disabled}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        New Game
      </button>
      <button
        onClick={onRefresh}
        disabled={disabled}
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
      >
        Refresh
      </button>
    </div>
  );
};

export default GameControls;
