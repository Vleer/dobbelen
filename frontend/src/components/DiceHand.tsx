// DiceHand.tsx
import React from "react";
import Dice from "./Dice";

interface DiceHandProps {
  diceValues: number[];
  size?: 'sm' | 'md' | 'lg';
}

const DiceHand: React.FC<DiceHandProps> = ({ diceValues, size = 'md' }) => {
  return (
    <div className="flex flex-wrap">
      {diceValues.map((value, index) => (
        <Dice key={index} value={value} size={size} />
      ))}
    </div>
  );
};

export default DiceHand;
