import React from "react";
import DiceSVG from "./DiceSVG";

interface DiceHandSVGProps {
  diceValues: number[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  vertical?: boolean;
  noWrap?: boolean;
}

const DiceHandSVG: React.FC<DiceHandSVGProps> = ({ diceValues, size = 'md', vertical = false, noWrap = false }) => {
  return (
    <div className={`flex gap-1 min-w-0 ${vertical ? 'flex-col' : noWrap ? 'flex-nowrap' : 'flex-wrap'}`}>
      {diceValues.map((value, index) => (
        <DiceSVG key={index} value={value} size={size} />
      ))}
    </div>
  );
};

export default DiceHandSVG;
