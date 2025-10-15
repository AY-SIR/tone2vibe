import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Play, RotateCcw, Mic, ArrowLeft, Delete } from "lucide-react";

// Math Runner Game Component
const MathRunner = ({ onBack }) => {
  const [score, setScore] = useState(0);
  const [equation, setEquation] = useState(generateEquation());
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem("mathRunnerHighScore");
    if (savedHighScore) setHighScore(parseInt(savedHighScore));
  }, []);

  // Save high score to localStorage
  useEffect(() => {
    localStorage.setItem("mathRunnerHighScore", highScore);
  }, [highScore]);

  function generateEquation() {
    const operations = ["+", "-", "×"];
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let answer;
    if (operation === "+") answer = num1 + num2;
    else if (operation === "-") answer = num1 - num2;
    else answer = num1 * num2;

    return { num1, num2, operation, answer };
  }

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, isPlaying]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    setEquation(generateEquation());
    setUserAnswer("");
    setFeedback("");
  };

  const endGame = () => {
    setIsPlaying(false);
    setGameOver(true);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  const handleSubmit = (answer) => {
    if (!isPlaying) return;

    const numAnswer = parseInt(answer);
    if (isNaN(numAnswer)) return;

    if (numAnswer === equation.answer) {
      setScore(score + 1);
      setFeedback("✓");
      setTimeout(() => {
        setEquation(generateEquation());
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
    if (!isPlaying) return;
    const newAnswer = userAnswer + num;
    setUserAnswer(newAnswer);
  };

  const handleClear = () => {
    setUserAnswer("");
    setFeedback("");
  };

  const handleEnter = () => {
    if (userAnswer) {
      handleSubmit(userAnswer);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white p-4 relative">
      {/* Back Button fixed in top-left */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-black z-30"
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="w-full max-w-md flex flex-col items-center space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="text-center mt-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 flex justify-center items-center">
            RE
            <Mic className="w-6 h-6 sm:w-8 sm:h-8 inline-block mx-1" />
            LEX
          </h1>
          <p className="text-sm sm:text-base text-gray-500">Solve equations as fast as you can</p>
        </div>

        {/* Score Bar */}
        <div className="flex justify-between text-center border border-black/10 rounded-xl p-2 sm:p-3 w-full">
          <div>
            <p className="text-xs text-gray-500">SCORE</p>
            <p className="text-xl sm:text-2xl font-bold">{score}</p>
          </div>
          <div className="border-l border-black/10" />
          <div>
            <p className="text-xs text-gray-500">TIME</p>
            <p className="text-xl sm:text-2xl font-bold">{timeLeft}s</p>
          </div>
          <div className="border-l border-black/10" />
          <div>
            <p className="text-xs text-gray-500">BEST</p>
            <p className="text-xl sm:text-2xl font-bold">{highScore}</p>
          </div>
        </div>

        {/* Game Area */}
        {!isPlaying && !gameOver ? (
          <div className="text-center space-y-4 py-8 w-full">
            <div className="text-5xl sm:text-6xl mb-4">⚡</div>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Test your math skills.<br />Solve equations before time runs out.
            </p>
            <button
              onClick={startGame}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-black text-white text-sm sm:text-base font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              START
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center space-y-4 py-8 w-full">
            <div className="text-5xl sm:text-6xl mb-4">🎯</div>
            <p className="text-xl sm:text-2xl font-bold">Score: {score}</p>
            <p className="text-sm sm:text-base text-gray-600">
              {score >= highScore ? "New high score!" : "Keep practicing!"}
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 mx-auto px-5 sm:px-6 py-2 sm:py-3 bg-black text-white text-sm sm:text-base font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              RETRY
            </button>
          </div>
        ) : (
          <>
            {/* Equation Display */}
            <div className="text-center py-6 sm:py-8 border border-black/10 rounded-xl relative w-full">
              <p className="text-xs sm:text-sm text-gray-500 mb-2">EQUATION</p>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                {equation.num1} {equation.operation} {equation.num2} = ?
              </p>
              <div className="h-12 sm:h-16 flex items-center justify-center">
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold min-w-[80px] sm:min-w-[100px] border-b-4 border-black pb-1">
                  {userAnswer || " "}
                </p>
              </div>
              {feedback && (
                <div className={`absolute inset-0 flex items-center justify-center text-6xl sm:text-7xl md:text-8xl ${feedback === "✓" ? "text-green-500" : "text-red-500"}`}>
                  {feedback}
                </div>
              )}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 w-full mt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num.toString())}
                  className="aspect-square border-2 border-black text-2xl sm:text-3xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="aspect-square border-2 border-red-500 text-red-500 text-lg sm:text-xl font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={() => handleNumberClick("0")}
                className="aspect-square border-2 border-black text-2xl sm:text-3xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleEnter}
                className="aspect-square border-2 border-green-600 bg-green-600 text-white text-lg sm:text-xl font-bold rounded-xl hover:bg-green-700 hover:border-green-700 transition-all active:scale-95"
              >
                ✓
              </button>
            </div>

            {/* Negative Number Button */}
            <button
              onClick={() => {
                if (userAnswer === "") {
                  setUserAnswer("-");
                } else if (userAnswer === "-") {
                  setUserAnswer("");
                }
              }}
              className="w-full py-2 sm:py-3 border-2 border-black text-lg sm:text-xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 mt-2"
            >
              +/−
            </button>
          </>
        )}

        {/* Footer */}
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

// Main Offline Component
export default function Offline() {
  const [showGame, setShowGame] = useState(false);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-white overflow-hidden p-4">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] md:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)]" />

      {/* Floating orbs */}
      <div className="absolute top-10 left-10 md:top-20 md:left-20 w-40 h-40 md:w-72 md:h-72 bg-black/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 md:bottom-20 md:right-20 w-48 h-48 md:w-96 md:h-96 bg-black/3 rounded-full blur-3xl animate-pulse delay-1000" />

      {!showGame ? (
        // Offline Landing Screen
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto px-4 sm:px-6">
          <div className="relative mb-6 md:mb-8 flex items-center justify-center gap-3 sm:gap-4 md:gap-5">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 border-2 border-black/20 rounded-full" />
              </div>
              <WifiOff className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-black relative z-10" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-black via-gray-600 to-black bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%] whitespace-nowrap">
              You're Offline
            </h1>
          </div>

          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 md:mb-12 max-w-md flex items-center gap-2 justify-center text-center px-4 mt-4">
            <span>Challenge your mind with a tone2vibe game</span>
          </p>

          <button
            onClick={() => setShowGame(true)}
            className="group relative px-6 py-3 sm:px-8 sm:py-4 bg-black text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] text-sm sm:text-base"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center gap-2">
              <Play className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              Start Playing
            </span>
          </button>

          <div className="mt-12 md:mt-16 flex flex-col items-center gap-3 text-xs sm:text-sm text-gray-400 px-4 text-center">
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Reconnect anytime to sync your progress</span>
            </div>
            <a
              href="https://tone2vibe.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-black transition-colors duration-200"
            >
              tone2vibe.in
            </a>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full h-full">
          <MathRunner onBack={() => setShowGame(false)} />
        </div>
      )}

      {/* Shimmer keyframes */}
      <style>
        {`
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .delay-1000 {
            animation-delay: 1s;
          }
        `}
      </style>
    </div>
  );
}
