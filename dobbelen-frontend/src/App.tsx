import DataFetcher from "./components/DataFetcher";
import DataPoster from "./components/DataPoster";
import DiceHand from "./components/DiceHand";

function App() {
  return (
    <div className="App bg-blue-700 p-4 text-white">
      <DataFetcher />
      <DataPoster />
      <DiceHand diceValues={[1, 2, 3, 4, 5]} />
      {/* const [diceValues, setDiceValues] = useState<number[]>([1, 2, 3, 4, 5]); */}
    </div>
  );
}

export default App;
