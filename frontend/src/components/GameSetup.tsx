import React, { useState } from 'react';

interface GameSetupProps {
  onCreateGame: (playerNames: string[], username: string) => void;
  onMultiplayer: () => void;
  isLoading: boolean;
  error: string;
}

const GameSetup: React.FC<GameSetupProps> = ({ onCreateGame, onMultiplayer, isLoading, error }) => {
  const [username, setUsername] = useState('');
  const [playerNames, setPlayerNames] = useState<string[]>(['AI Player 1', 'AI Player 2']);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [aiCount, setAiCount] = useState(2);

  const addPlayer = () => {
    if (newPlayerName.trim() && playerNames.length < 8) {
      setPlayerNames([...playerNames, newPlayerName.trim()]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const updateAiCount = (count: number) => {
    if (count >= 1 && count <= 6) {
      setAiCount(count);
      const newPlayerNames = [];
      for (let i = 1; i <= count; i++) {
        newPlayerNames.push(`AI Player ${i}`);
      }
      setPlayerNames(newPlayerNames);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerNames.length >= 1 && username.trim()) {
      // Add the human player to the list with AI opponents
      const finalPlayerNames = [username.trim(), ...playerNames];
      onCreateGame(finalPlayerNames, username.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-800 select-none">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-green-800">
          Liar's Dice - Endurance Round
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of AI Players (1-6)
            </label>
            <div className="flex space-x-2 mb-4">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => updateAiCount(count)}
                  className={`px-3 py-2 rounded ${
                    aiCount === count
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              {playerNames.map((name, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="flex-1 p-2 border rounded bg-gray-50">{name}</span>
                  <button
                    type="button"
                    onClick={() => removePlayer(index)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Add custom AI name"
              className="flex-1 p-2 border rounded"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayer())}
            />
            <button
              type="button"
              onClick={addPlayer}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={playerNames.length < 1 || isLoading || !username.trim()}
            className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Game...' : 'Start AI Game'}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600 text-center">
          <p>Each player starts with 5 dice.</p>
          <p>Take turns bidding, doubting, or calling spot-on!</p>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onMultiplayer}
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-lg"
          >
            🎮 Play Multiplayer Online
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Create or join a game with friends using a shareable link
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
