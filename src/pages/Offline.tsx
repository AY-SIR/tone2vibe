import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Play, RotateCcw, Mic, ArrowLeft, Delete } from "lucide-react";

// In-memory storage for high score (persists during session only)
let storedHighScore = 0;

// --- HELPER FUNCTION: Generates equations with scaling difficulty ---
function generateEquation(currentScore = 0) {
  let operations = ["+", "-", "×"];
  let maxNum = 20;
  let multMax = 12;

  if (currentScore >= 30) {
    operations.push("÷");
    maxNum = 50;
    multMax = 20;
  } else if (currentScore >= 20) {
    operations.push("÷");
    maxNum = 30;
    multMax = 15;
  } else if (currentScore >= 10) {
    maxNum = 35;
    multMax = 15;
  }

  const operation = operations[Math.floor(Math.random() * operations.length)];
  let num1, num2, answer;

  if (operation === "÷") {
    const divisor = Math.floor(Math.random() * 10) + 2;
    const result = Math.floor(Math.random() * 12) + 1;
    num1 = divisor * result;
    num2 = divisor;
    answer = result;
  } else {
    if (operation === "×") {
      num1 = Math.floor(Math.random() * multMax) + 1;
      num2 = Math.floor(Math.random() * multMax) + 2;
    } else {
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
    }

    if (operation === "+") answer = num1 + num2;
    else if (operation === "-") {
      if (currentScore > 5 && Math.random() > 0.5) [num1, num2] = [num2, num1];
      answer = num1 - num2;
    } else answer = num1 * num2;
  }

  const displayOperation = operation === "×" ? "×" : operation === "÷" ? "÷" : operation;
  return { num1, num2, operation: displayOperation, answer };
}

const MathRunner = ({ onBack }) => {
  const [score, setScore] = useState(0);
  const [equation, setEquation] = useState(() => generateEquation(0));
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(storedHighScore);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    storedHighScore = highScore;
  }, [highScore]);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) endGame();
  }, [timeLeft, isPlaying]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    setEquation(generateEquation(0));
    setUserAnswer("");
    setFeedback("");
  };

  const endGame = () => {
    setIsPlaying(false);
    setGameOver(true);
    if (score > highScore) setHighScore(score);
  };

  const handleSubmit = (answer) => {
    if (!isPlaying) return;
    const numAnswer = parseInt(answer);
    if (isNaN(numAnswer)) return;

    if (numAnswer === equation.answer) {
      const newScore = score + 1;
      setScore(newScore);
      setFeedback("✓");
      setTimeout(() => {
        setEquation(generateEquation(newScore));
        setUserAnswer("");
        setFeedback("");
      }, 300);
    } else {
      setFeedback("✗");
      setTimeout(() => endGame(), 500);
    }
  };

  // ✅ Auto-correct check when typing
  const handleNumberClick = (num) => {
    if (!isPlaying) return;
    const newAnswer = userAnswer + num;
    setUserAnswer(newAnswer);

    // Auto check instantly if correct
    if (parseInt(newAnswer) === equation.answer) {
      handleSubmit(newAnswer);
    } else if (newAnswer.length >= equation.answer.toString().length + 1) {
      handleSubmit(newAnswer);
    }
  };

  const handleNegativeToggle = () => {
    if (!isPlaying) return;
    if (userAnswer.startsWith("-")) setUserAnswer(userAnswer.substring(1));
    else setUserAnswer("-" + userAnswer);
  };

  const handleClear = () => {
    setUserAnswer("");
    setFeedback("");
  };

  const handleBack = () => onBack(score, highScore);

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-white p-4 relative">
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-black z-30"
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="w-full max-w-lg flex flex-col items-center space-y-4">
        <div className="text-center mt-6">
          <h1 className="text-4xl font-bold mb-1 flex justify-center items-center">
            RE <Mic className="w-8 h-8 inline-block mx-1" /> LEX
          </h1>
          <p className="text-gray-500 text-sm">Solve equations as fast as you can</p>
        </div>

        {/* Score, Time, Highscore */}
        <div className="flex justify-around text-center border border-black/10 rounded-xl p-3 w-full">
          <div>
            <p className="text-xs text-gray-500">SCORE</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
          <div className="border-l border-black/10" />
          <div>
            <p className="text-xs text-gray-500">TIME</p>
            <p className="text-2xl font-bold">{timeLeft}s</p>
          </div>
          <div className="border-l border-black/10" />
          <div>
            <p className="text-xs text-gray-500">BEST</p>
            <p className="text-2xl font-bold">{highScore}</p>
          </div>
        </div>

        {/* Game Screens */}
        {!isPlaying && !gameOver ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-gray-600 mb-4">Test your math skills before time runs out!</p>
            <button onClick={startGame} className="px-8 py-3 bg-black text-white rounded-full">
              START
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-2xl font-bold">Score: {score}</p>
            <p className="text-sm text-gray-600">
              {score >= highScore && score > 0 ? "New high score!" : "Keep practicing!"}
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 mx-auto mt-3 px-6 py-2 bg-black text-white rounded-full"
            >
              <RotateCcw className="w-4 h-4" /> RETRY
            </button>
          </div>
        ) : (
          <>
            <div className="text-center py-8 border border-black/10 rounded-xl relative w-full">
              <p className="text-sm text-gray-500 mb-3">EQUATION</p>
              <p className="text-4xl font-bold mb-6">
                {equation.num1} {equation.operation} {equation.num2} = ?
              </p>
              <p className="text-4xl font-bold border-b-4 border-black pb-2 min-h-[60px]">
                {userAnswer || " "}
              </p>

              {feedback && (
                <div
                  className={`absolute inset-0 flex items-center justify-center text-8xl ${
                    feedback === "✓" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {feedback}
                </div>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full mt-4 max-w-md mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num.toString())}
                  className="aspect-square border-2 border-black text-2xl font-bold rounded-xl hover:bg-black hover:text-white active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="aspect-square border-2 border-red-500 bg-red-500 text-white rounded-xl active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-7 h-7" />
              </button>
              <button
                onClick={() => handleNumberClick("0")}
                className="aspect-square border-2 border-black text-2xl font-bold rounded-xl hover:bg-black hover:text-white active:scale-95"
              >
                0
              </button>
            </div>

            <button
              onClick={handleNegativeToggle}
              className="w-full max-w-md mx-auto py-3 border-2 border-black text-xl font-bold rounded-xl hover:bg-black hover:text-white mt-2"
            >
              +/−
            </button>
          </>
        )}

        <div className="text-center pt-4">
          <a
            href="https://tone2vibe.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-black transition-colors"
          >
            tone2vibe.in
          </a>
        </div>
      </div>
    </div>
  );
};

export default function Offline() {
  const [showGame, setShowGame] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentHighScore, setCurrentHighScore] = useState(storedHighScore);

  useEffect(() => {
    setShowGame(false); // ✅ Fix reload bug
  }, []);

  const handleBackFromGame = (score, highScore) => {
    setCurrentScore(score);
    setCurrentHighScore(highScore);
    setShowGame(false);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-white overflow-hidden p-4">
      {!showGame ? (
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <WifiOff className="w-12 h-12 text-black" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-black via-gray-600 to-black bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]">
              You're Offline
            </h1>
          </div>
          <p className="text-gray-600 mb-6">Challenge your mind with a tone2vibe game</p>
          {currentScore > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Last Score</p>
              <p className="text-3xl font-bold">{currentScore}</p>
              <p className="text-xs text-gray-400 mt-1">Best: {currentHighScore}</p>
            </div>
          )}
          <button
            onClick={() => setShowGame(true)}
            className="px-8 py-3 bg-black text-white font-semibold rounded-full hover:scale-105 transition-transform"
          >
            <Play className="inline-block mr-2" fill="currentColor" />{" "}
            {currentScore > 0 ? "Play Again" : "Start Playing"}
          </button>
        </div>
      ) : (
        <MathRunner onBack={handleBackFromGame} />
      )}
    </div>
  );
              }
