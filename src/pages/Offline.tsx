import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, Play, RotateCcw, Mic, ArrowLeft, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Delete } from "lucide-react";

// In-memory storage
let gameData = {
  train: {
    easy: 0,
    medium: 0,
    hard: 0,
    pro: 0
  },
  math: 0,
  lastScores: {
    train: 0,
    math: 0
  }
};

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

// --- MATH GAME HELPER ---
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

  const displayOperation = operation === "×" ? "×" : operation === "÷" ? "÷" : operation;
  return { num1, num2, operation: displayOperation, answer };
}

// --- TRAIN RUNNER GAME ---
const TrainRunner = ({ onBack, difficulty }: { onBack: (score: number) => void; difficulty: Difficulty }) => {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const [train, setTrain] = useState<Position[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Position>({ x: 10, y: 10 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [nextDirection, setNextDirection] = useState<Direction>("RIGHT");
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(gameData.train[difficulty]);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);



  const generateFood = useCallback((trainBody: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * config.gridSize),
        y: Math.floor(Math.random() * config.gridSize),
      };
    } while (trainBody.some((segment) => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, [config.gridSize]);

  const startGame = () => {
    const startPos = Math.floor(config.gridSize / 2);
    const initialTrain = [{ x: startPos, y: startPos }];
    setTrain(initialTrain);
    setFood(generateFood(initialTrain));
    setDirection("RIGHT");
    setNextDirection("RIGHT");
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    gameLoopRef.current = setInterval(() => {
      setTrain((prevTrain) => {
        const head = prevTrain[0];
        let newHead: Position;

        setDirection(nextDirection);

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
            gameData.train[difficulty] = score;
          }
          gameData.lastScores.train = score;
          return prevTrain;
        }

        if (prevTrain.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsPlaying(false);
          setGameOver(true);
          if (score > highScore) {
            setHighScore(score);
            gameData.train[difficulty] = score;
          }
          gameData.lastScores.train = score;
          return prevTrain;
        }

        const newTrain = [newHead, ...prevTrain];

        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((prev) => prev + 1);
          setFood(generateFood(newTrain));
          return newTrain;
        }

        newTrain.pop();
        return newTrain;
      });
    }, config.speed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, gameOver, nextDirection, food, config, generateFood, highScore, score, difficulty]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = canvas.width / config.gridSize;

    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    // Draw station (food)
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(
      food.x * cellSize + 2,
      food.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      food.x * cellSize + 2,
      food.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );

    // Draw train (engine + bogies)
    train.forEach((segment, index) => {
      if (index === 0) {
        // Engine
        ctx.fillStyle = "#1e40af";
        ctx.fillRect(
          segment.x * cellSize + 1,
          segment.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
        ctx.fillStyle = "#60a5fa";
        ctx.fillRect(
          segment.x * cellSize + cellSize / 4,
          segment.y * cellSize + cellSize / 4,
          cellSize / 2,
          cellSize / 2
        );
      } else {
        // Bogies
        ctx.fillStyle = "#065f46";
        ctx.fillRect(
          segment.x * cellSize + 1,
          segment.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          segment.x * cellSize + 3,
          segment.y * cellSize + 3,
          cellSize - 6,
          cellSize - 6
        );
      }
    });
  }, [train, food, config.gridSize]);

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
            ⚡ Train Runner - {config.label}
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
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">⚡</div>
            <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm md:text-base px-2">
              Control the train to collect passengers at stations.
              <br />
              Add more bogies and grow longer!
            </p>
            <button
              onClick={startGame}
              className="w-full max-w-xs sm:max-w-sm px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors text-sm sm:text-base"
            >
              START JOURNEY
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center py-4 sm:py-6 w-full">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎯</div>
            <p className="text-xl sm:text-2xl font-bold">Score: {score}</p>
            <p className="text-gray-600 text-xs sm:text-sm md:text-base px-2">
              {score > highScore && score > 0 ? "New record journey!" : "Keep traveling!"}
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 mx-auto px-4 sm:px-6 py-2 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors mt-3 sm:mt-4 text-sm sm:text-base"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> RETRY
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center relative overflow-hidden min-h-screen relative">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="border-2 border-black rounded-lg w-full max-w-[300px] aspect-square"
            />


            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 sm:hidden z-20">
  {/* Left Button */}
  <button onClick={() => direction !== "RIGHT" && setNextDirection("LEFT")} className="w-14 h-14 bg-black/40 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg">
    <ChevronLeft className="w-6 h-6" />
  </button>

  {/* Up & Down Buttons Column */}
  <div className="flex flex-col gap-2">
    <button onClick={() => direction !== "DOWN" && setNextDirection("UP")} className="w-14 h-14 bg-black/40 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg">
      <ArrowUp className="w-6 h-6" />
    </button>
    <button onClick={() => direction !== "UP" && setNextDirection("DOWN")} className="w-14 h-14 bg-black/40 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg">
      <ArrowDown className="w-6 h-6" />
    </button>
  </div>

  {/* Right Button */}
  <button onClick={() => direction !== "LEFT" && setNextDirection("RIGHT")} className="w-14 h-14 bg-black/40 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg">
    <ChevronRight className="w-6 h-6" />
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

// --- MATH RUNNER GAME ---
const MathRunner = ({ onBack }: { onBack: (score: number) => void }) => {
  const [score, setScore] = useState(0);
  const [equation, setEquation] = useState(() => generateEquation(0));
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(gameData.math);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !userAnswer || userAnswer === "-") return;

    const correctAnswerStr = equation.answer.toString();

    if (userAnswer.length >= correctAnswerStr.length) {
      handleSubmit(userAnswer);
    }
  }, [userAnswer, isPlaying, equation.answer]);

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
    if (score > highScore) {
      setHighScore(score);
      gameData.math = score;
    }
    gameData.lastScores.math = score;
  };

  const handleSubmit = (answer: string) => {
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

  const handleNumberClick = (num: string) => {
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

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-white p-4 relative">
      <button
        onClick={() => onBack(score)}
        className="fixed top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-black z-30 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-2"
      >
        <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6" />
        <span className="text-xs sm:text-sm font-medium">Back</span>
      </button>

      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col items-center space-y-4 md:space-y-6">
        <div className="text-center mt-6 md:mt-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-1 flex justify-center items-center">
            RE
            <Mic className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 inline-block mx-1" />
            LEX
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-500">⚡ Math Runner - Speed Challenge</p>
        </div>

        <div className="flex justify-around text-center border border-black/10 rounded-xl p-3 md:p-4 lg:p-5 w-full">
          <div className="flex-1">
            <p className="text-xs md:text-sm text-gray-500">SCORE</p>
            <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold">{score}</p>
          </div>
          <div className="border-l border-black/10" />
          <div className="flex-1">
            <p className="text-xs md:text-sm text-gray-500">TIME</p>
            <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold">{timeLeft}s</p>
          </div>
          <div className="border-l border-black/10" />
          <div className="flex-1">
            <p className="text-xs md:text-sm text-gray-500">BEST</p>
            <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold">{highScore}</p>
          </div>
        </div>

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
              START CHALLENGE
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center space-y-4 py-8 w-full">
            <div className="text-5xl sm:text-6xl mb-4">🎯</div>
            <p className="text-xl sm:text-2xl font-bold">Score: {score}</p>
            <p className="text-sm sm:text-base text-gray-600">
              {score > highScore && score > 0 ? "New high score!" : "Keep practicing!"}
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
            <div className="text-center py-8 md:py-10 lg:py-12 border border-black/10 rounded-xl relative w-full overflow-hidden">
              <p className="text-xs sm:text-sm md:text-base text-gray-500 mb-3 md:mb-4">EQUATION</p>
              <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-8">
                {equation.num1} {equation.operation} {equation.num2} = ?
              </p>
              <div className="h-14 sm:h-16 md:h-20 flex items-center justify-center">
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold min-w-[100px] md:min-w-[140px] lg:min-w-[180px] border-b-4 border-black pb-2 text-center">
                  {userAnswer || " "}
                </p>
              </div>
              {feedback && (
                <div className={`absolute inset-0 flex items-center justify-center text-6xl sm:text-8xl md:text-9xl ${feedback === "✓" ? "text-green-500" : "text-red-500"}`}>
                  {feedback}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4 lg:gap-5 w-full mt-4 max-w-md md:max-w-lg mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num.toString())}
                  className="aspect-square border-2 border-black text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="aspect-square border-2 border-black text-lg md:text-xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-6 h-6 md:w-8 md:h-8 lg:w-9 lg:h-9" />
              </button>
              <button
                onClick={() => handleNumberClick("0")}
                className="aspect-square border-2 border-black text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center"
              >
                0
              </button>
              <button
                onClick={handleNegativeToggle}
                className="aspect-square border-2 border-black text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center"
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

// --- MAIN OFFLINE COMPONENT ---
export default function Offline() {
  const [showGame, setShowGame] = useState<"train" | "math" | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [showGameSelection, setShowGameSelection] = useState(false);
  const [showDifficultySelection, setShowDifficultySelection] = useState(false);

  const handleBackFromGame = (score: number) => {
    setShowGame(null);
    setSelectedDifficulty(null);
    setShowGameSelection(false);
    setShowDifficultySelection(false);
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    setShowGame("train");
    setShowDifficultySelection(false);
  };

  const handlePlayClick = () => {
    setShowGameSelection(true);
  };

  const handleTrainGameSelect = () => {
    setShowGameSelection(false);
    setShowDifficultySelection(true);
  };

  const handleMathGameSelect = () => {
    setShowGameSelection(false);
    setShowGame("math");
  };

  const handleBackToGames = () => {
    setShowDifficultySelection(false);
    setShowGameSelection(true);
  };



  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-white overflow-hidden p-2 sm:p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:2rem_2rem] sm:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)]" />

      {showGame === "train" && selectedDifficulty ? (
        <TrainRunner onBack={handleBackFromGame} difficulty={selectedDifficulty} />
      ) : showGame === "math" ? (
        <MathRunner onBack={handleBackFromGame} />
      ) : (
        <div className="relative z-10 flex flex-col items-center w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto px-2 sm:px-4">
          {/* Back button at top */}
          {(showGameSelection || showDifficultySelection) && (
            <button
              onClick={() => {
                if (showDifficultySelection) {
                  handleBackToGames();
                } else {
                  setShowGameSelection(false);
                }
              }}
              className="fixed top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-black z-30 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-2"
            >
              <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-medium">Back</span>
            </button>
          )}

          {/* Offline Header - Only show on main page */}
          {!showGameSelection && !showDifficultySelection && (
            <>
              <div className="mb-4 sm:mb-6 flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center">
                <WifiOff className="w-8 h-8 sm:w-12 sm:h-12 text-black" strokeWidth={1.5} />
                <h1 className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-black via-gray-600 to-black bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]">
                  You're Offline
                </h1>
              </div>

              <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4 sm:mb-6 text-center px-2">
                Challenge your mind with tone2vibe games
              </p>
            </>
          )}

          {/* Last Scores */}
          {(gameData.lastScores.train > 0 || gameData.lastScores.math > 0) && !showGameSelection && !showDifficultySelection && (
            <div className="mb-4 sm:mb-6 w-full">
              <p className="text-xs sm:text-sm text-gray-500 mb-2 text-center">Last Scores</p>
              <div className="flex gap-3 justify-center">
                {gameData.lastScores.train > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">⚡ Train</p>
                    <p className="text-xl sm:text-2xl font-bold">{gameData.lastScores.train}</p>
                  </div>
                )}
                {gameData.lastScores.math > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">⚡ Math</p>
                    <p className="text-xl sm:text-2xl font-bold">{gameData.lastScores.math}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game Selection */}
          {!showGameSelection && !showDifficultySelection ? (
            <div className="w-full max-w-xs sm:max-w-sm space-y-4 mb-4">
            <button
  onClick={handlePlayClick}
  className="w-full px-6 py-4 bg-black text-white font-bold text-lg rounded-full hover:scale-105 transition-all flex items-center justify-center gap-3 group"
>
  <Play className="w-6 h-6" />
  Play Games
</button>

            </div>
          ) : showGameSelection ? (
            <div className="w-full max-w-xs sm:max-w-sm space-y-3 mb-4 mt-12">
             <h1 className=" mb-10 text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-1 flex justify-center items-center">
          RE
            <Mic className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 inline-block mx-1" />
            LEX
          </h1>

              <button
                onClick={handleTrainGameSelect}
                className="w-full px-6 py-5 bg-white text-black font-bold rounded-xl hover:scale-105 transition-all flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl ">⚡</span>
                  <div className="text-left">
                    <p className="text-lg font-bold">Train Runner</p>
                    <p className="text-xs opacity-90">Collect passengers & grow your train</p>
                  </div>
                </div>
                {gameData.train.easy > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    Best: {Math.max(...Object.values(gameData.train))}
                  </span>
                )}
              </button>

              <button
                onClick={handleMathGameSelect}
                className="w-full px-6 py-5 bg-black text-white font-bold rounded-xl hover:scale-105 transition-all flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚡</span>
                  <div className="text-left">
                    <p className="text-lg font-bold">Math Runner</p>
                    <p className="text-xs opacity-90">Solve equations against the clock</p>
                  </div>
                </div>
                {gameData.math > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    Best: {gameData.math}
                  </span>
                )}
              </button>
            </div>
          ) : showDifficultySelection ? (
            <div className="w-full max-w-xs sm:max-w-sm space-y-2 mb-4 mt-12">
              <p className="text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl  mb-1 font-bold text-gray-800 mb-4">
                ⚡ Train Runner
              </p>



              <p className="text-center text-sm font-semibold text-gray-600 mb-3">
                Select Difficulty
              </p>
              {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((difficulty) => {
                const config = DIFFICULTY_CONFIGS[difficulty];
                const highScore = gameData.train[difficulty];
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
            </div>
          ) : null}

          {/* Footer */}
          {!showGameSelection && !showDifficultySelection && (
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
          )}
        </div>
      )}

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
