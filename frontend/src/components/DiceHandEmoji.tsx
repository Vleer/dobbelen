import React from "react";
import DiceEmoji from "./DiceEmoji";

interface DiceHandEmojiProps {
  diceValues: number[];
  size?: 'sm' | 'md' | 'lg';
}

const DiceHandEmoji: React.FC<DiceHandEmojiProps> = ({ diceValues, size = 'md' }) => {
  return (
    <div className="flex flex-wrap gap-1">
      {diceValues.map((value, index) => (
        <DiceEmoji key={index} value={value} size={size} />
      ))}
    </div>
  );
};

export default DiceHandEmoji;
