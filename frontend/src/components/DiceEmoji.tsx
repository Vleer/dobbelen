import React from "react";

interface DiceEmojiProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

const DiceEmoji: React.FC<DiceEmojiProps> = ({ value, size = 'md' }) => {
  const getDiceEmoji = (num: number) => {
    switch (num) {
      case 1: return '⚀';
      case 2: return '⚁';
      case 3: return '⚂';
      case 4: return '⚃';
      case 5: return '⚄';
      case 6: return '⚅';
      default: return '⚀';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-lg';
      case 'lg':
        return 'text-4xl';
      default: // 'md'
        return 'text-2xl';
    }
  };

  return (
    <span className={`${getSizeClasses()} select-none`}>
      {getDiceEmoji(value)}
    </span>
  );
};

export default DiceEmoji;
