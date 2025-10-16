import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, Play, RotateCcw, Mic, ArrowLeft, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

// --- LOCAL STORAGE HELPERS ---
const getStoredHighScore = (level: string) => parseInt(localStorage.getItem(`snakeHighScore_${level}`)) || 0;
const setStoredHighScore = (level: string, score: number) => localStorage.setItem(`snakeHighScore_${level}`, score.toString());
const getStoredLastScore = () => parseInt(localStorage.getItem("snakeLastScore")) || 0;
const setStoredLastScore = (score: number) => localStorage.setItem("snakeLastScore", score.toString());

// --- TYPES ---
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };
type Difficulty = "easy" | "medium" | "hard" | "pro";

interface DifficultyConfig {
  speed: number;
  gridSize: number;
  label: string;
  color: string;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { speed: 200, gridSize: 15, label: "Easy", color: "bg-green-500" },
  medium: { speed: 150, gridSize: 18, label: "Medium", color: "bg-blue-500" },
  hard: { speed: 100, gridSize: 20, label: "Hard", color: "bg-orange-500" },
  pro: { speed: 70, gridSize: 22, label: "Pro", color: "bg-red-500" },
};

// --- Snake Game Component ---
const SnakeGame = ({ onBack, difficulty }: { onBack: (score: number) => void; difficulty: Difficulty }) => {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const [snake, setSnake] = useState<Position[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Position>({ x: 10, y: 10 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [nextDirection, setNextDirection] = useState<Direction>("RIGHT");
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(getStoredHighScore(difficulty));
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate random food position
  const generateFood = useCallback((snakeBody: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * config.gridSize),
        y: Math.floor(Math.random() * config.gridSize),
      };
    } while (snakeBody.some((segment) => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, [config.gridSize]);

  // Start game
  const startGame = () => {
    const startPos = Math.floor(config.gridSize / 2);
    const initialSnake = [{ x: startPos, y: startPos }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection("RIGHT");
    setNextDirection("RIGHT");
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    gameLoopRef.current = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let newHead: Position;

        // Update direction
        setDirection(nextDirection);

        // Calculate new head position
        switch (nextDirection) {
          case "UP":
            newHead = { x: head.x, y: head.y - 1 };
            break;
          case "DOWN":
            newHead = { x: head.x, y: head.y + 1 };
            break;
          case "LEFT":
            newHead = { x: head.x - 1, y: head.y };
            break;
          case "RIGHT":
            newHead = { x: head.x + 1, y: head.y };
            break;
        }

        // Check wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= config.gridSize ||
          newHead.y < 0 ||
          newHead.y >= config.gridSize
        ) {
          setIsPlaying(false);
          setGameOver(true);
          if (score > highScore) {
            setHighScore(score);
            setStoredHighScore(difficulty, score);
          }
          setStoredLastScore(score);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsPlaying(false);
          setGameOver(true);
          if (score > highScore) {
            setHighScore(score);
            setStoredHighScore(difficulty, score);
          }
          setStoredLastScore(score);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((prev) => prev + 1);
          setFood(generateFood(newSnake));
          return newSnake;
        }

        // Remove tail if no food eaten
        newSnake.pop();
        return newSnake;
      });
    }, config.speed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, gameOver, nextDirection, food, config, generateFood, highScore, score, difficulty]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          if (direction !== "DOWN") setNextDirection("UP");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          if (direction !== "UP") setNextDirection("DOWN");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          if (direction !== "RIGHT") setNextDirection("LEFT");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          if (direction !== "LEFT") setNextDirection("RIGHT");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying, gameOver, direction]);

  // Touch/swipe controls
  const touchStart = useRef<Position | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !isPlaying || gameOver) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStart.current.x;
    const deltaY = touchEnd.y - touchStart.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 30 && direction !== "LEFT") setNextDirection("RIGHT");
      else if (deltaX < -30 && direction !== "RIGHT") setNextDirection("LEFT");
    } else {
      if (deltaY > 30 && direction !== "UP") setNextDirection("DOWN");
      else if (deltaY < -30 && direction !== "DOWN") setNextDirection("UP");
    }

    touchStart.current = null;
  };

  // Draw game on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = canvas.width / config.gridSize;

    // Clear canvas
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i <= config.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 2 - 2,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Draw snake
    snake.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = "#000000";
      } else {
        ctx.fillStyle = "#4b5563";
      }
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });
  }, [snake, food, config.gridSize]);

  return (
    <div
      className="flex flex-col items-center justify-center w-full min-h-screen bg-white p-2 sm:p-4 relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={() => onBack(score)}
        className="fixed top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-black z-30 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-2"
      >
        <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6" />
        <span className="text-xs sm:text-sm font-medium">Back</span>
      </button>

      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg flex flex-col items-center space-y-3 sm:space-y-4">
        <div className="text-center mt-4 sm:mt-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 flex justify-center items-center flex-wrap">
            RE
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-1" />
            LEX
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm md:text-base">
            Snake Game - {config.label}
          </p>
        </div>

        <div className="flex justify-around text-center border border-black/10 rounded-xl p-2 sm:p-3 w-full text-xs sm:text-sm md:text-base">
          <div className="flex-1">
            <p className="text-gray-500 text-xs sm:text-sm">SCORE</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">{score}</p>
          </div>
          <div className="border-l border-black/10" />
          <div className="flex-1">
            <p className="text-gray-500 text-xs sm:text-sm">BEST</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">{highScore}</p>
          </div>
        </div>

        {!isPlaying && !gameOver ? (
          <div className="text-center py-4 sm:py-6 w-full">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🐍</div>
            <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm md:text-base px-2">
              Use arrow keys or swipe to control the snake.
              <br />
              Eat food and grow longer!
            </p>
            <button
              onClick={startGame}
              className="w-full max-w-xs sm:max-w-sm px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors text-sm sm:text-base"
            >
              START
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center py-4 sm:py-6 w-full">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎮</div>
            <p className="text-xl sm:text-2xl font-bold">Score: {score}</p>
            <p className="text-gray-600 text-xs sm:text-sm md:text-base px-2">
              {score > highScore && score > 0 ? "New high score!" : "Keep playing!"}
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 mx-auto px-4 sm:px-6 py-2 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors mt-3 sm:mt-4 text-sm sm:text-base"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> RETRY
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center relative">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="border-2 border-black rounded-lg w-full max-w-[300px] aspect-square"
            />

            {/* Mobile Direction Controls */}
            <div className="fixed bottom-20 right-4 flex flex-col items-center gap-1 sm:hidden z-20">
              <button
                onClick={() => direction !== "DOWN" && setNextDirection("UP")}
                className="w-14 h-14 bg-black/80 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => direction !== "RIGHT" && setNextDirection("LEFT")}
                  className="w-14 h-14 bg-black/80 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => direction !== "LEFT" && setNextDirection("RIGHT")}
                  className="w-14 h-14 bg-black/80 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={() => direction !== "UP" && setNextDirection("DOWN")}
                className="w-14 h-14 bg-black/80 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
              {window.innerWidth < 640 ? "Swipe or use buttons" : "Use arrow keys or WASD"}
            </p>
          </div>
        )}

        <div className="text-center pt-4 text-xs sm:text-sm text-gray-400">
          <a
            href="https://tone2vibe.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors"
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [lastScore, setLastScore] = useState(getStoredLastScore());
  const [showDifficultySelection, setShowDifficultySelection] = useState(false);

  const handleBackFromGame = (score: number) => {
    setLastScore(score);
    setShowGame(false);
    setSelectedDifficulty(null);
    setShowDifficultySelection(false);
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    setShowGame(true);
    setShowDifficultySelection(false);
  };

  const handlePlayClick = () => {
    setShowDifficultySelection(true);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-white overflow-hidden p-2 sm:p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:2rem_2rem] sm:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)]" />

      {!showGame ? (
        <div className="relative z-10 flex flex-col items-center w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto px-2 sm:px-4">
          <div className="mb-4 sm:mb-6 flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center">
            <WifiOff className="w-8 h-8 sm:w-12 sm:h-12 text-black" strokeWidth={1.5} />
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-black via-gray-600 to-black bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]">
              You're Offline
            </h1>
          </div>

          <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4 sm:mb-6 text-center px-2">
            Challenge your mind with a tone2vibe game
          </p>

          {lastScore > 0 && (
            <div className="mb-3 sm:mb-4 text-center">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Last Score</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold">{lastScore}</p>
            </div>
          )}

          {!showDifficultySelection ? (
            <div className="w-full max-w-xs sm:max-w-sm space-y-4 mb-4">
              <button
                onClick={handlePlayClick}
                className="w-full px-6 py-4 bg-black text-white font-bold text-lg rounded-lg hover:scale-105 transition-all flex items-center justify-center gap-3 group"
              >
                <Play className="w-6 h-6" />
                Play Snake Game
              </button>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Quick Start</p>
                <div className="flex gap-2 justify-center">
                  {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((difficulty) => {
                    const config = DIFFICULTY_CONFIGS[difficulty];
                    return (
                      <button
                        key={difficulty}
                        onClick={() => handleDifficultySelect(difficulty)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg hover:scale-105 transition-all ${config.color} text-white`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-xs sm:max-w-sm space-y-2 mb-4">
              <p className="text-center text-sm font-semibold text-gray-700 mb-3">
                Select Difficulty
              </p>
              {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((difficulty) => {
                const config = DIFFICULTY_CONFIGS[difficulty];
                const highScore = getStoredHighScore(difficulty);
                return (
                  <button
                    key={difficulty}
                    onClick={() => handleDifficultySelect(difficulty)}
                    className="w-full px-4 py-3 bg-black text-white font-semibold rounded-lg hover:scale-105 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.color}`} />
                      <span>{config.label}</span>
                    </div>
                    {highScore > 0 && (
                      <span className="text-xs text-gray-300">Best: {highScore}</span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => setShowDifficultySelection(false)}
                className="w-full px-4 py-2 text-gray-600 hover:text-black transition-colors text-sm"
              >
                ← Back
              </button>
            </div>
          )}

          <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-400 text-center px-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Reconnect anytime to sync your progress</span>
            </div>
            <a
              href="https://tone2vibe.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-black transition-colors text-xs sm:text-sm"
            >
              tone2vibe.in
            </a>
          </div>
        </div>
      ) : selectedDifficulty ? (
        <SnakeGame onBack={handleBackFromGame} difficulty={selectedDifficulty} />
      ) : null}

      <style>
        {`
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          @media (max-width: 640px) {
            .min-h-screen {
              min-height: 100vh;
              min-height: 100dvh;
            }
          }
        `}
      </style>
    </div>
  );
}
