import { useState, useEffect } from "react";
import { ethers } from "ethers";
import LotteryABI from "./abis/LotteryABI.json";
import background from "./assets/images/lottery_bg_1.webp";

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

// Hardhat default account private key (e.g., Account #0)
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const PROVIDER_URL = "http://127.0.0.1:8545";

function App() {
  const [money, setMoney] = useState(0);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);

  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [result, setResult] = useState("");
  const [gameRunning, setGameRunning] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Setup contract using Hardhat account (no MetaMask)
  useEffect(() => {
    const setupContract = async () => {
      const _provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, _provider);
      const lotteryContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        LotteryABI.abi,
        wallet
      );
      setAccount(wallet.address);
      setContract(lotteryContract);
      setProvider(_provider);

      try {
        const ownerAddress = await lotteryContract.owner();
        setIsOwner(wallet.address.toLowerCase() === ownerAddress.toLowerCase());
      } catch (err) {
        console.error("Failed to get owner address:", err);
      }
    };

    setupContract();
  }, []);

  // Fetch ETH balance from blockchain
  useEffect(() => {
    if (!provider || !account) return;

    const fetchBalance = async () => {
      try {
        const balanceWei = await provider.getBalance(account);
        const balanceEth = ethers.utils.formatEther(balanceWei);
        setMoney(parseFloat(balanceEth));
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      }
    };

    fetchBalance();

    // Optional: refresh balance every 15 seconds
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [provider, account]);

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

  const startGame = async () => {
    if (selectedNumbers.length !== 6 || gameRunning || money < 10) return;

    try {
      const hasEntered = await contract.hasEntered(account);
      if (hasEntered) {
        setResult("You have already entered the lottery.");
        return;
      }

      // 🔍 Estimate gas before sending transaction
      try {
        const gasEstimate = await contract.estimateGas.enterLottery(
          selectedNumbers,
          {
            value: ethers.utils.parseEther("0.01"),
          }
        );
        console.log("Estimated gas:", gasEstimate.toString());
      } catch (estimateErr) {
        console.error("Gas estimation failed:", estimateErr);
        setResult("Gas estimation failed: " + estimateErr.message);
        return;
      }

      setGameRunning(true);
      setMoney((prev) => prev - 10);
      setCountdown(10);
      setDrawnNumbers([]);
      setResult("");

      // ✅ Proceed with the transaction if estimation succeeded
      const tx = await contract.enterLottery(selectedNumbers, {
        value: ethers.utils.parseEther("0.01"),
      });

      await tx.wait();
      console.log("Transaction confirmed:", tx.hash);
    } catch (err) {
      console.error("Transaction failed:", err);
      setResult("Transaction failed or was rejected.");
      setGameRunning(false);
    }
  };

  // Reset lottery to allow starting again (only owner)
  const handleResetLottery = async () => {
    if (!contract) return;

    try {
      const tx = await contract.resetLottery();
      await tx.wait();
      console.log("Lottery reset");

      // Reset frontend state to allow new game
      setSelectedNumbers([]);
      setDrawnNumbers([]);
      setCountdown(null);
      setResult("");
      setGameRunning(false);
    } catch (err) {
      console.error("Reset failed:", err);
      setResult("Only the contract owner can reset the lottery.");
    }
  };

  // Countdown logic and drawing numbers after countdown ends
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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.9, // reduce opacity here
          zIndex: -1,
        }}
      ></div>
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Lottery Game</h1>
        {account && (
          <p className="mb-1 text-sm text-gray-500">Connected: {account}</p>
        )}
        <p className="mb-2 text-lg font-semibold">ETH Balance: {money} ETH</p>
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
        {/* BET AMOUNT DISPLAY */}
        <p className="my-2 text-md font-semibold text-red-700">
          Bet Amount: 0.01 ETH
        </p>

        {!gameRunning && drawnNumbers.length > 0 && isOwner ? (
          <button
            onClick={handleResetLottery}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            Play Again (Reset)
          </button>
        ) : (
          <button
            onClick={startGame}
            disabled={selectedNumbers.length !== 6 || gameRunning || money < 10}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded-xl disabled:opacity-50"
          >
            Start Game
          </button>
        )}

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
