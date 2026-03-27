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
    <div className={`flex gap-1.5 min-w-0 justify-center items-center ${vertical ? 'flex-col' : noWrap ? 'flex-nowrap' : 'flex-wrap'}`}>
      {diceValues.map((value, index) => (
        <div key={index} className="min-w-8 min-h-8 flex items-center justify-center">
          <DiceSVG value={value} size={size} />
        </div>
      ))}
    </div>
  );
};

export default DiceHandSVG;
