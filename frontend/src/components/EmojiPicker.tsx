import React, { useState, useRef, useEffect } from 'react';

/**
 * EmojiPicker Component - Game Reactions
 * 
 * A focused reaction picker with 10 game-emotion reactions:
 * - Mix of emoji and text shortcuts for quick emotional expression
 * - Single category, no tabs needed
 * - Click-outside-to-close functionality
 * - Smooth animations and hover effects
 */
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// 10 funky game-emotion reactions: emoji + text shortcuts
const GAME_REACTIONS = [
  '🎲',  // the dice / the game itself
  '😄',  // happy / good roll
  '😭',  // crying / terrible roll
  '😤',  // steam from nose / frustrated
  '🤔',  // thinking / calculating odds
  '😎',  // cool / confident
  '🤯',  // mind blown / lucky break
  '🎉',  // celebration / victory
  '🤡',  // clown / bad play
  '🤝',  // handshake / "gg"
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, isOpen, onClose }) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 left-0 rounded-lg shadow-2xl border-2 animate-slide-up z-50"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        width: '280px',
        maxHeight: '360px',
      }}
    >
      {/* Reactions grid */}
      <div className="p-4">
        <div className="grid grid-cols-5 gap-2">
          {GAME_REACTIONS.map((reaction, index) => (
            <button
              key={`${reaction}-${index}`}
              onClick={() => {
                onEmojiSelect(reaction);
                onClose();
              }}
              className="text-3xl p-2 rounded flex items-center justify-center hover:bg-opacity-20 transition-all hover:scale-110 active:scale-90"
              style={{
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(138, 106, 29, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {reaction}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
