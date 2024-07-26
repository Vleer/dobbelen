import DataFetcher from "./components/DataFetcher";
import DataPoster from "./components/DataPoster";
import DiceFetcher from "./components/DiceFetcher";
import DiceHand from "./components/DiceHand";
import React, { useState } from "react";

function App() {
  const [diceValues, setDiceValues] = useState<number[]>([1, 2, 3, 4, 5, 6, 5]);
  return (
    <div className="App bg-green-600 text-black fixed inset-0">
      <div
        className="fixed inset-0 bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: "url(resources/bg.webp)" }}
      >
        <DataFetcher />
        <DataPoster />
        <h1>Dice Game</h1>
        <DiceHand diceValues={diceValues} />
        <DiceHand diceValues={diceValues} />
        <DiceHand diceValues={diceValues} />
        <DiceHand diceValues={diceValues} />
        <DiceHand diceValues={diceValues} />
        <DiceHand diceValues={diceValues} />
        <DiceFetcher />
      </div>
    </div>
  );
}

export default App;
