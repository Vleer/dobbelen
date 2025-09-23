import React, { useState } from 'react';

interface GameSetupProps {
  onCreateGame: (playerNames: string[], username: string) => void;
  isLoading: boolean;
  error: string;
}

const GameSetup: React.FC<GameSetupProps> = ({ onCreateGame, isLoading, error }) => {
  const [username, setUsername] = useState('');
  const [playerNames, setPlayerNames] = useState<string[]>(['AI Player 1', 'AI Player 2']);
  const [newPlayerName, setNewPlayerName] = useState('');

  const addPlayer = () => {
    if (newPlayerName.trim() && playerNames.length < 6) {
      setPlayerNames([...playerNames, newPlayerName.trim()]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
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
    <div className="flex items-center justify-center min-h-screen bg-green-800">
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
              AI Opponents (1-4 AI players)
            </label>
            <div className="space-y-2">
              {playerNames.map((name, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="flex-1 p-2 border rounded">{name}</span>
                  {playerNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePlayer(index)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {playerNames.length < 4 && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
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
          )}

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
      </div>
    </div>
  );
};

export default GameSetup;
