import { useState, useEffect } from "react";

function App() {
  const [money, setMoney] = useState(100);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [result, setResult] = useState("");
  const [gameRunning, setGameRunning] = useState(false);

  const toggleNumber = (num) => {
    if (gameRunning) return;
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      } else if (prev.length < 6) {
        return [...prev, num];
      }
      return prev;
    });
  };

  const startGame = () => {
    if (selectedNumbers.length !== 6 || gameRunning || money < 10) return;
    setMoney((prev) => prev - 10);
    setCountdown(10);
    setGameRunning(true);
    setDrawnNumbers([]);
    setResult("");
  };

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    if (countdown === 1) {
      const randomNumbers = Array.from(
        new Set(
          Array.from({ length: 6 }, () => Math.floor(Math.random() * 49) + 1)
        )
      );
      setDrawnNumbers(randomNumbers);
      const matches = selectedNumbers.filter((num) =>
        randomNumbers.includes(num)
      );
      let winnings = 0;
      if (matches.length >= 3) winnings = matches.length * 20;
      setMoney((prev) => prev + winnings);
      setResult(`You matched ${matches.length} number(s) and won $${winnings}`);
      setGameRunning(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Lottery Game</h1>
        <p className="mb-2 text-lg font-semibold">Money: ${money}</p>
        <div className="grid grid-cols-7 gap-2 my-4">
          {Array.from({ length: 49 }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              className={`w-10 h-10 rounded-full ${
                selectedNumbers.includes(num)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
              disabled={gameRunning}
            >
              {num}
            </button>
          ))}
        </div>
        <button
          onClick={startGame}
          disabled={selectedNumbers.length !== 6 || gameRunning || money < 10}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-xl disabled:opacity-50"
        >
          Start Game
        </button>
        {countdown !== null && (
          <p className="mt-4 text-xl font-bold">Countdown: {countdown}</p>
        )}
        {drawnNumbers.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold">Drawn Numbers:</p>
            <div className="flex justify-center gap-2 mt-2">
              {drawnNumbers.map((num) => (
                <div
                  key={num}
                  className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}
        {result && <p className="mt-4 font-bold text-blue-700">{result}</p>}
      </div>
    </div>
  );
}

export default App;
