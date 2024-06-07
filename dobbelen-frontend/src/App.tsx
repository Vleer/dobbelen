import DataFetcher from "./components/DataFetcher";
import DataPoster from "./components/DataPoster";
import DiceHand from "./components/DiceHand";
import React, { useState } from "react";

function App() {
  const [diceValues, setDiceValues] = useState<number[]>([1, 2, 3, 4, 5, 6, 5]);
  return (
    <div className="App bg-blue-700 p-4 text-white">
      <DataFetcher />
      <DataPoster />
      <h1>Dice Game</h1>
      <DiceHand diceValues={diceValues} />
    </div>
  );
}

export default App;
