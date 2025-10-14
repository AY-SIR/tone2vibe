import React, { useState, useEffect } from "react";
import { RotateCcw, Mic, ArrowLeft } from "lucide-react";

export default function MathRunner() {
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(generateTarget());
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  function generateTarget() {
    return Math.floor(Math.random() * 9);
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
    setTarget(generateTarget());
  };

  const endGame = () => {
    setIsPlaying(false);
    setGameOver(true);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  const handleClick = (num) => {
    if (!isPlaying) return;

    if (num === target) {
      setScore(score + 1);
      setTarget(generateTarget());
    } else {
      endGame();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="max-w-md w-full space-y-6">



        {/* Header */}
        <div className="text-center cursor-pointer"  onClick={() => window.history.back()}>
          <h1 className="text-3xl md:text-4xl font-bold mb-1 flex justify-center items-center">
            RE
            <Mic className="w-8 h-8 md:w-10 md:h-10 inline-block mx-1" />
            LEX
          </h1>
          <p className="text-sm text-gray-500">Click the target number</p>
        </div>

        {/* Score Bar */}
        <div className="flex justify-between text-center border border-black/10 rounded-xl p-3">
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

        {/* Game Area */}
        {!isPlaying && !gameOver ? (
          <div className="text-center space-y-4 py-8">
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-gray-600">Test your reflexes.<br/>Click the target number before time runs out.</p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              START
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center space-y-4 py-8">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-2xl font-bold">Score: {score}</p>
            <p className="text-gray-600">
              {score > highScore ? "New high score!" : "Keep practicing!"}
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              RETRY
            </button>
          </div>
        ) : (
          <>
            {/* Target Display */}
            <div className="text-center py-8 border border-black/10 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">TARGET</p>
              <p className="text-7xl font-bold">{target}</p>
            </div>

            {/* Number Grid */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => handleClick(num)}
                  className="aspect-square border-2 border-black text-3xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
            </div>
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
}