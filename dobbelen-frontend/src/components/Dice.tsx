// Dice.tsx
import React from 'react';

interface DiceProps {
  value: number;
}

const Dice: React.FC<DiceProps> = ({ value }) => {
  const renderDots = (num: number) => {
    let dots = [];
    for (let i = 0; i < num; i++) {
      dots.push(
        <div key={i} className="w-2 h-2 bg-black rounded-full absolute"></div>
      );
    }
    return dots;
  };

  return (
    <div className="relative w-12 h-12 bg-white border border-black flex flex-wrap items-center justify-center m-1">
      {renderDots(value)}
    </div>
  );
};

export default Dice;
