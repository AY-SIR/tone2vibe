import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Play, Zap, RotateCcw, Mic, ArrowLeft } from "lucide-react";

const MathRunner = ({ onBack }) => {
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

        {/* Back Button */}
        <div className="flex justify-start">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center">
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
};

export default function Offline() {
  const [play, setPlay] = useState(false);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-white overflow-hidden p-4">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] md:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)]" />

      {/* Floating orbs */}
      <div className="absolute top-10 left-10 md:top-20 md:left-20 w-40 h-40 md:w-72 md:h-72 bg-black/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 md:bottom-20 md:right-20 w-48 h-48 md:w-96 md:h-96 bg-black/3 rounded-full blur-3xl animate-pulse delay-1000" />

      {!play ? (
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto px-4 sm:px-6">
          {/* Heading with animated ring */}
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

          {/* Subheading with icon inline */}
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 md:mb-12 max-w-md flex items-center gap-2 justify-center text-center px-4 mt-4">
            <span>Challenge your mind with a tone2vibe game</span>
          </p>

          {/* CTA Button */}
          <button
            onClick={() => setPlay(true)}
            className="group relative px-6 py-3 sm:px-8 sm:py-4 bg-black text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] text-sm sm:text-base"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center gap-2">
              <Play className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              Start Playing
            </span>
          </button>

          {/* Bottom hint */}
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
          <MathRunner onBack={() => setPlay(false)} />
        </div>
      )}

      {/* Keyframes for shimmer animation */}
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