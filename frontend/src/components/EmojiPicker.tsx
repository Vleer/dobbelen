import React, { useState, useRef, useEffect } from 'react';

/**
 * EmojiPicker Component
 * 
 * A comprehensive emoji picker with:
 * - 6 categorized emoji collections (Smileys, Gestures, Emotions, Games, Food, Symbols)
 * - Tab-based category navigation
 * - Click-outside-to-close functionality
 * - Smooth animations and hover effects
 * - Grid layout optimized for mobile and desktop
 * - Custom scrollbar styling
 */
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '👏', '🙌', '👐', '🤲', '🤜', '🤛', '✊', '👊', '🤚'],
  'Emotions': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️'],
  'Games': ['🎲', '🎯', '🎰', '🎮', '🕹️', '🎳', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻'],
  'Food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍖', '🍗', '🥩', '🍞', '🥐', '🥖', '🥨', '🥯', '🧀', '🥗', '🥙', '🌮', '🌯', '🥪', '🍕', '🍝', '🍜', '🍲'],
  'Symbols': ['⭐', '🌟', '✨', '⚡', '🔥', '💥', '💫', '💦', '💨', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌊', '💧', '💦']
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Smileys');
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
        maxHeight: '300px',
      }}
    >
      {/* Category tabs */}
      <div
        className="flex overflow-x-auto border-b"
        style={{ borderColor: 'var(--panel-border)' }}
      >
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === category ? 'border-b-2' : ''
            }`}
            style={{
              color: activeCategory === category ? 'var(--accent-gold)' : 'var(--text-muted)',
              borderColor: activeCategory === category ? 'var(--accent-gold-strong)' : 'transparent',
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 overflow-y-auto chat-scrollbar" style={{ maxHeight: '240px' }}>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              className="text-2xl p-1 rounded hover:bg-opacity-20 transition-all hover:scale-125 active:scale-95"
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
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
