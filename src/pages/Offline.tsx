import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Play, RotateCcw, Mic, ArrowLeft, Delete } from "lucide-react";

// In-memory storage for high score (session only)
let storedHighScore = 0;

// --- HELPER FUNCTION: Generates equations with scaling difficulty ---
function generateEquation(currentScore = 0) {
  let operations = ["+", "-", "×"];
  let maxNum = 20;
  let multMax = 12;

  // Difficulty scaling
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

    if (operation === "+") {
      answer = num1 + num2;
    } else if (operation === "-") {
      if (currentScore > 5 && Math.random() > 0.5) {
        [num1, num2] = [Math.min(num1, num2), Math.max(num1, num2)];
      }
      answer = num1 - num2;
    } else {
      answer = num1 * num2;
    }
  }

  return { num1, num2, operation, answer };
}

// --- Math Runner Game Component ---
const MathRunner = ({ onBack }) => {
  const [score, setScore] = useState(0);
  const [equation, setEquation] = useState(() => generateEquation(0));
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(storedHighScore);
  const [feedback, setFeedback] = useState("");

  // Update stored high score
  useEffect(() => {
    storedHighScore = highScore;
  }, [highScore]);

  // Timer effect
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, isPlaying]);

  // Auto-submit when enough digits entered
  useEffect(() => {
    if (!isPlaying || !userAnswer || userAnswer === "-") return;
    const correctAnswerStr = equation.answer.toString();
    if (userAnswer.length >= correctAnswerStr.length) {
      handleSubmit(userAnswer);
    }
  }, [userAnswer, isPlaying, equation.answer]);

  // ✅ Keyboard Input Handler
  useEffect(() => {
    if (!isPlaying) return;
    const handleKeyDown = (e) => {
      if (feedback) return;

      if (e.key >= "0" && e.key <= "9") {
        setUserAnswer((prev) => prev + e.key);
      } else if (e.key === "Backspace") {
        setUserAnswer((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        handleSubmit(userAnswer);
      } else if (e.key === "-") {
        handleNegativeToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, userAnswer, feedback]);

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
    // ✅ FIX: Update high score even if previous best was 0
    if (score >= highScore) {
      setHighScore(score);
    }
  };

  const handleSubmit = (answer) => {
    if (!isPlaying) return;
    const numAnswer = parseInt(answer);
    if (isNaN(numAnswer)) return;

    if (numAnswer === equation.answer) {
      setFeedback("✓");
      setTimeout(() => {
        const newScore = score + 1;
        setScore(newScore);
        setEquation(generateEquation(newScore));
        setUserAnswer("");
        setFeedback("");
      }, 300);
    } else {
      setFeedback("✗");
      setTimeout(() => {
        endGame();
      }, 500);
    }
  };

  const handleNumberClick = (num) => {
    if (!isPlaying || feedback) return;
    setUserAnswer(userAnswer + num);
  };

  const handleNegativeToggle = () => {
    if (!isPlaying || feedback) return;
    if (userAnswer.startsWith("-")) {
      setUserAnswer(userAnswer.substring(1));
    } else {
      setUserAnswer("-" + userAnswer);
    }
  };

  const handleClear = () => {
    if (!isPlaying) return;
    setUserAnswer("");
  };

  const handleBack = () => {
    onBack(score, highScore);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-white p-4 relative">
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-black z-30"
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col items-center space-y-6">
        <div className="text-center mt-6">
          <h1 className="text-4xl font-bold mb-1 flex justify-center items-center">
            RE
            <Mic className="w-8 h-8 inline-block mx-1" />
            LEX
          </h1>
          <p className="text-gray-500 text-base">Solve equations as fast as you can</p>
        </div>

        <div className="flex justify-around text-center border border-black/10 rounded-xl p-4 w-full">
          <div className="flex-1">
            <p className="text-sm text-gray-500">SCORE</p>
            <p className="text-3xl font-bold">{score}</p>
          </div>
          <div className="border-l border-black/10" />
          <div className="flex-1">
            <p className="text-sm text-gray-500">TIME</p>
            <p className="text-3xl font-bold">{timeLeft}s</p>
          </div>
          <div className="border-l border-black/10" />
          <div className="flex-1">
            <p className="text-sm text-gray-500">BEST</p>
            <p className="text-3xl font-bold">{highScore}</p>
          </div>
        </div>

        {!isPlaying && !gameOver ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-gray-600 mb-4">
              Test your math skills.<br />Solve equations before time runs out.
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              START
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-2xl font-bold">Score: {score}</p>
            <p className="text-gray-600">
              {score > highScore && score > 0 ? "New high score!" : "Keep practicing!"}
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors mt-4"
            >
              <RotateCcw className="w-5 h-5" /> RETRY
            </button>
          </div>
        ) : (
          <>
            <div className="text-center py-8 border border-black/10 rounded-xl relative w-full">
              <p className="text-gray-500 mb-4">EQUATION</p>
              <p className="text-5xl font-bold mb-6">
                {equation.num1} {equation.operation} {equation.num2} = ?
              </p>
              <div className="h-16 flex items-center justify-center">
                <p className="text-5xl font-bold min-w-[120px] border-b-4 border-black pb-2 text-center">
                  {userAnswer || " "}
                </p>
              </div>
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

            <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 0].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num.toString())}
                  className="aspect-square border-2 border-black text-3xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="aspect-square border-2 border-black text-xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-8 h-8" />
              </button>
              <button
                onClick={handleNegativeToggle}
                className="aspect-square border-2 border-black text-3xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center"
              >
                -
              </button>
            </div>
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

// --- Main Offline Component ---
export default function Offline() {
  const [showGame, setShowGame] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentHighScore, setCurrentHighScore] = useState(storedHighScore);

  const handleBackFromGame = (score, highScore) => {
    setCurrentScore(score);
    setCurrentHighScore(highScore);
    setShowGame(false);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-white overflow-hidden p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)]" />

      {!showGame ? (
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto px-4">
          <div className="mb-8 flex items-center justify-center gap-4">
            <WifiOff className="w-12 h-12 text-black" strokeWidth={1.5} />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-black via-gray-600 to-black bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%] whitespace-nowrap">
              You're Offline
            </h1>
          </div>

          <p className="text-lg text-gray-600 mb-10 text-center">
            Challenge your mind with a tone2vibe game
          </p>

          {currentScore > 0 && (
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Last Score</p>
              <p className="text-3xl font-bold">{currentScore}</p>
              <p className="text-xs text-gray-400 mt-1">Best: {currentHighScore}</p>
            </div>
          )}

          <button
            onClick={() => setShowGame(true)}
            className="px-8 py-4 bg-black text-white font-semibold rounded-full hover:scale-105 transition-all"
          >
            <Play className="w-5 h-5 inline-block mr-2" fill="currentColor" />
            {currentScore > 0 ? "Play Again" : "Start Playing"}
          </button>

          <div className="mt-12 text-xs text-gray-400 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Wifi className="w-4 h-4" />
              <span>Reconnect anytime to sync your progress</span>
            </div>
            <a
              href="https://tone2vibe.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-black transition-colors"
            >
              tone2vibe.in
            </a>
          </div>
        </div>
      ) : (
        <MathRunner onBack={handleBackFromGame} />
      )}

      <style>
        {`
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}
      </style>
    </div>
  );
}
