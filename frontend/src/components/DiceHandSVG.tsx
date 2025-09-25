import React from "react";
import DiceSVG from "./DiceSVG";

interface DiceHandSVGProps {
  diceValues: number[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  vertical?: boolean;
}

const DiceHandSVG: React.FC<DiceHandSVGProps> = ({ diceValues, size = 'md', vertical = false }) => {
  return (
    <div className={`flex gap-1 ${vertical ? 'flex-col' : 'flex-wrap'}`}>
      {diceValues.map((value, index) => (
        <DiceSVG key={index} value={value} size={size} />
      ))}
    </div>
  );
};

export default DiceHandSVG;
