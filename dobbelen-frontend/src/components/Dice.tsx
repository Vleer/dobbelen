// Dice.tsx
import React from 'react';

interface DiceProps {
  value: number;
}

const Dice: React.FC<DiceProps> = ({ value }) => {
  const renderDots = (num: number) => {
    let dots = [];
    for (let i = 0; i < num; i++) {
      dots.push(<div key={i} className="dot"></div>);
    }
    return dots;
  };

  return (
    <div className="dice">
      {renderDots(value)}
    </div>
  );
};

export default Dice;
