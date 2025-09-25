import React from "react";
import DiceSVG from "./DiceSVG";

interface DiceHandSVGProps {
  diceValues: number[];
  size?: 'sm' | 'md' | 'lg';
}

const DiceHandSVG: React.FC<DiceHandSVGProps> = ({ diceValues, size = 'md' }) => {
  return (
    <div className="flex flex-wrap gap-1">
      {diceValues.map((value, index) => (
        <DiceSVG key={index} value={value} size={size} />
      ))}
    </div>
  );
};

export default DiceHandSVG;
