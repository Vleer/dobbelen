// DiceHand.tsx
import React from "react";
import Dice from "./Dice";

interface DiceHandProps {
  diceValues: number[];
}

const DiceHand: React.FC<DiceHandProps> = ({ diceValues }) => {
  return (
    <div className="flex flex-wrap">
      {diceValues.map((value, index) => (
        <Dice key={index} value={value} />
      ))}
    </div>
  );
};

export default DiceHand;
