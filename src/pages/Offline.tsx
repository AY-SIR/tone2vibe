import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Wifi, WifiOff, Play, RotateCcw, Mic, ArrowLeft, Delete, Check,
  Target, Calculator, Gamepad2, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon,
  Baseball, Bot
} from "lucide-react";

// --- In-memory storage for high scores (persists during session only) ---
let storedHighScores = {
  math: 0,
  snake: 0,
  cricket: 0,
};

// ######################################################################
// # 1. MATH RUNNER GAME COMPONENT (Your existing code, slightly adapted) #
// ######################################################################

function generateEquation(currentScore = 0) {
  let operations = ["+", "-", "×"];
  let maxNum = 20, multMax = 12;

  if (currentScore >= 30) { operations.push("÷"); maxNum = 50; multMax = 20; } 
  else if (currentScore >= 20) { operations.push("÷"); maxNum = 30; multMax = 15; } 
  else if (currentScore >= 10) { maxNum = 35; multMax = 15; }

  const operation = operations[Math.floor(Math.random() * operations.length)];
  let num1, num2, answer;

  if (operation === "÷") {
    const divisor = Math.floor(Math.random() * 10) + 2;
    const result = Math.floor(Math.random() * 12) + 1;
    num1 = divisor * result; num2 = divisor; answer = result;
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
  return { num1, num2, operation, answer };
}

const MathRunner = ({ onBack, initialHighScore }) => {
  const [score, setScore] = useState(0);
  const [equation, setEquation] = useState(() => generateEquation(0));
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(initialHighScore);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) endGame();
  }, [timeLeft, isPlaying]);
  
  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameOver(true);
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  const handleSubmit = useCallback((answer) => {
    if (!isPlaying) return;
    const numAnswer = parseInt(answer, 10);
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
      setTimeout(endGame, 500);
    }
  }, [isPlaying, equation.answer, score, endGame]);

  useEffect(() => {
    if (!isPlaying || !userAnswer || userAnswer === "-") return;
    const correctAnswerString = equation.answer.toString();
    if (userAnswer.length === correctAnswerString.length) {
      const submissionTimer = setTimeout(() => handleSubmit(userAnswer), 100);
      return () => clearTimeout(submissionTimer);
    }
  }, [userAnswer, equation.answer, isPlaying, handleSubmit]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    setEquation(generateEquation(0));
    setUserAnswer("");
    setFeedback("");
  };

  const handleBack = () => onBack(score, highScore);
  const handleNumberClick = (num) => { if (isPlaying) setUserAnswer(prev => prev + num); };
  const handleNegativeToggle = () => { if(isPlaying) setUserAnswer(prev => prev.startsWith("-") ? prev.substring(1) : "-" + prev); };
  const handleClear = () => { setUserAnswer(""); setFeedback(""); };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-screen bg-white p-4">
      <div className="w-full max-w-md flex flex-col items-center space-y-4 flex-grow justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold flex justify-center items-center">RE<Mic className="w-8 h-8 inline-block mx-1" />LEX</h1>
          <p className="text-lg text-gray-500">Math Challenge</p>
        </div>

        <div className="flex justify-around text-center border border-black/10 rounded-xl p-4 w-full">
          <div><p className="text-sm text-gray-500">SCORE</p><p className="text-3xl font-bold">{score}</p></div>
          <div className="border-l border-black/10" />
          <div><p className="text-sm text-gray-500">TIME</p><p className="text-3xl font-bold">{timeLeft}s</p></div>
          <div className="border-l border-black/10" />
          <div><p className="text-sm text-gray-500">BEST</p><p className="text-3xl font-bold">{highScore}</p></div>
        </div>

        {!isPlaying && !gameOver ? (
          <div className="text-center space-y-4 py-8 w-full"><div className="text-6xl mb-4">⚡</div><p className="text-gray-600">Solve equations before time runs out.</p><button onClick={startGame} className="px-8 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800">START</button></div>
        ) : gameOver ? (
          <div className="text-center space-y-4 py-8 w-full"><div className="text-6xl mb-4">🎯</div><p className="text-2xl font-bold">Score: {score}</p><p className="text-gray-600">{score > initialHighScore ? "New high score!" : "Keep practicing!"}</p><button onClick={startGame} className="flex items-center gap-2 mx-auto px-6 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800"><RotateCcw className="w-4 h-4" />RETRY</button></div>
        ) : (
          <>
            <div className="text-center py-10 border border-black/10 rounded-xl relative w-full overflow-hidden">
              <p className="text-base text-gray-500 mb-4">EQUATION</p>
              <p className="text-5xl font-bold mb-8">{equation.num1} {equation.operation} {equation.num2} = ?</p>
              <div className="h-20 flex items-center justify-center">
                <p className="text-5xl font-bold min-w-[140px] border-b-4 border-black pb-2 text-center">{userAnswer || " "}</p>
              </div>
              {feedback && <div className={`absolute inset-0 flex items-center justify-center text-8xl ${feedback === "✓" ? "text-green-500" : "text-red-500"}`}>{feedback}</div>}
            </div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (<button key={num} onClick={() => handleNumberClick(num.toString())} className="aspect-square border-2 border-black text-3xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95">{num}</button>))}
              <button onClick={() => handleNumberClick("0")} className="col-span-2 aspect-auto border-2 border-black text-3xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95">0</button>
              <button onClick={handleClear} className="aspect-square border-2 border-red-500 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center"><Delete className="w-8 h-8" /></button>
            </div>
            <button onClick={handleNegativeToggle} className="w-full max-w-xs mx-auto py-3 border-2 border-black text-2xl font-bold rounded-xl hover:bg-black hover:text-white transition-all active:scale-95 mt-2">+/−</button>
          </>
        )}
      </div>
      <button onClick={handleBack} className="absolute top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-black"><ArrowLeft className="w-6 h-6" /><span>Back</span></button>
    </div>
  );
};


// ##################################################
// # 2. RETRO SNAKE GAME COMPONENT (NEW)            #
// ##################################################

const SnakeGame = ({ onBack, initialHighScore }) => {
  const BOARD_SIZE = 20;
  const initialSnake = [[10, 10], [10, 9]];
  const initialFood = [5, 5];
  const GAME_SPEED = 150;

  const [snake, setSnake] = useState(initialSnake);
  const [food, setFood] = useState(initialFood);
  const [direction, setDirection] = useState([0, 1]); // [y, x] -> Right
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(initialHighScore);

  const generateFood = (currentSnake) => {
    while (true) {
      const newFood = [Math.floor(Math.random() * BOARD_SIZE), Math.floor(Math.random() * BOARD_SIZE)];
      if (!currentSnake.some(segment => segment[0] === newFood[0] && segment[1] === newFood[1])) {
        return newFood;
      }
    }
  };
  
  const startGame = () => {
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection([0, 1]);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const gameLoop = useCallback(() => {
    if (!isPlaying || gameOver) return;

    const newSnake = snake.map(arr => [...arr]);
    const head = [newSnake[0][0] + direction[0], newSnake[0][1] + direction[1]];
    newSnake.unshift(head);
    
    // Wall Collision
    if (head[0] < 0 || head[0] >= BOARD_SIZE || head[1] < 0 || head[1] >= BOARD_SIZE) {
      setIsPlaying(false); setGameOver(true); if (score > highScore) setHighScore(score); return;
    }

    // Self Collision
    for (let i = 1; i < newSnake.length; i++) {
      if (head[0] === newSnake[i][0] && head[1] === newSnake[i][1]) {
        setIsPlaying(false); setGameOver(true); if (score > highScore) setHighScore(score); return;
      }
    }
    
    // Food Collision
    if (head[0] === food[0] && head[1] === food[1]) {
      setScore(s => s + 1);
      setFood(generateFood(newSnake));
    } else {
      newSnake.pop();
    }
    
    setSnake(newSnake);
  }, [snake, direction, isPlaying, gameOver, food, score, highScore]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      let newDirection;
      switch (e.key) {
        case "ArrowUp": newDirection = [-1, 0]; break;
        case "ArrowDown": newDirection = [1, 0]; break;
        case "ArrowLeft": newDirection = [0, -1]; break;
        case "ArrowRight": newDirection = [0, 1]; break;
        default: return;
      }
      // Prevent reversing
      if (direction[0] !== -newDirection[0] || direction[1] !== -newDirection[1]) {
        setDirection(newDirection);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction]);

  useEffect(() => {
    if(isPlaying) {
      const interval = setInterval(gameLoop, GAME_SPEED);
      return () => clearInterval(interval);
    }
  }, [gameLoop, isPlaying]);
  
  const handleDirectionChange = (newDirection) => {
    if (direction[0] !== -newDirection[0] || direction[1] !== -newDirection[1]) {
      setDirection(newDirection);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-screen bg-[#c7f0d8] p-4 font-mono">
      <div className="w-full max-w-sm flex flex-col items-center space-y-4 flex-grow justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black">RETRO SNAKE</h1>
        </div>
        <div className="flex justify-around text-center bg-[#a2d4b4] p-2 rounded w-full border-2 border-black/50">
          <div><p className="text-xs text-black/70">SCORE</p><p className="text-2xl font-bold text-black">{score}</p></div>
          <div className="border-l border-black/50" />
          <div><p className="text-xs text-black/70">BEST</p><p className="text-2xl font-bold text-black">{highScore}</p></div>
        </div>

        <div className="relative bg-[#a2d4b4] border-4 border-black/50 p-1 aspect-square w-full max-w-sm">
          {(!isPlaying && !gameOver) && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#a2d4b4]/90"><div className="text-4xl mb-4">🐍</div><button onClick={startGame} className="px-6 py-2 bg-black text-white font-bold rounded">START</button></div>}
          {gameOver && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#a2d4b4]/90"><div className="text-4xl mb-2">😵</div><p className="text-xl font-bold text-black">Game Over</p><p className="mb-4">Score: {score}</p><button onClick={startGame} className="flex items-center gap-2 px-5 py-2 bg-black text-white font-bold rounded"><RotateCcw className="w-4 h-4"/>RETRY</button></div>}
          <div className="grid grid-cols-20 grid-rows-20 w-full h-full">
            {snake.map((segment, i) => <div key={i} className="bg-black" style={{ gridRow: segment[0] + 1, gridColumn: segment[1] + 1 }}></div>)}
            <div className="bg-black" style={{ gridRow: food[0] + 1, gridColumn: food[1] + 1 }}></div>
          </div>
        </div>
        
        {/* On-screen controls for mobile */}
        <div className="w-full max-w-xs grid grid-cols-3 grid-rows-3 gap-2 md:hidden">
          <div className="col-start-2 row-start-1 flex justify-center"><button onClick={() => handleDirectionChange([-1, 0])} className="w-16 h-16 bg-black/80 text-white rounded-lg flex justify-center items-center active:bg-black"><ArrowUp size={32}/></button></div>
          <div className="col-start-1 row-start-2 flex justify-center"><button onClick={() => handleDirectionChange([0, -1])} className="w-16 h-16 bg-black/80 text-white rounded-lg flex justify-center items-center active:bg-black"><ArrowLeftIcon size={32}/></button></div>
          <div className="col-start-3 row-start-2 flex justify-center"><button onClick={() => handleDirectionChange([0, 1])} className="w-16 h-16 bg-black/80 text-white rounded-lg flex justify-center items-center active:bg-black"><ArrowRightIcon size={32}/></button></div>
          <div className="col-start-2 row-start-3 flex justify-center"><button onClick={() => handleDirectionChange([1, 0])} className="w-16 h-16 bg-black/80 text-white rounded-lg flex justify-center items-center active:bg-black"><ArrowDown size={32}/></button></div>
        </div>

      </div>
       <button onClick={() => onBack(score, highScore)} className="absolute top-4 left-4 flex items-center gap-2 text-black/70 hover:text-black"><ArrowLeft className="w-6 h-6" /><span>Back</span></button>
    </div>
  );
};


// ##################################################
// # 3. POCKET CRICKET GAME COMPONENT (NEW)         #
// ##################################################

const CricketGame = ({ onBack, initialHighScore }) => {
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [gameState, setGameState] = useState('idle'); // idle, bowling, result
  const [feedback, setFeedback] = useState({ message: "", color: "" });
  const [highScore, setHighScore] = useState(initialHighScore);
  const animationRef = useRef();

  const handleBowl = () => {
    setGameState('bowling');
    setFeedback({ message: "", color: "" });
  };
  
  const handleSwing = () => {
    if (gameState !== 'bowling') return;

    const ball = animationRef.current;
    if (!ball) return;
    
    const swingPosition = ball.getBoundingClientRect().top;
    const pitchHeight = ball.parentElement.clientHeight;
    const sweetSpot = pitchHeight * 0.8; // 80% down the pitch
    const timingDifference = Math.abs(swingPosition - sweetSpot);

    let outcome;
    if (timingDifference < 20) outcome = 6;
    else if (timingDifference < 40) outcome = 4;
    else if (timingDifference < 70) outcome = 2;
    else if (timingDifference < 100) outcome = 1;
    else if (Math.random() > 0.4) outcome = 'OUT';
    else outcome = 'MISS';
    
    if (typeof outcome === 'number') {
      setScore(s => s + outcome);
      setFeedback({ message: `${outcome} RUN${outcome > 1 ? 'S' : ''}!`, color: "text-green-600" });
    } else {
      setFeedback({ message: outcome, color: "text-red-600" });
      if (outcome === 'OUT') {
        const newWickets = wickets + 1;
        setWickets(newWickets);
        if (newWickets >= 3) {
            setGameState('gameOver');
            if (score > highScore) setHighScore(score);
            return;
        }
      }
    }

    setGameState('result');
    setTimeout(handleBowl, 1500);
  };
  
  const startGame = () => {
    setScore(0);
    setWickets(0);
    setFeedback({ message: "", color: "" });
    setGameState('idle');
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-screen bg-green-50 p-4">
      <div className="w-full max-w-sm flex flex-col items-center space-y-4 flex-grow justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold flex items-center gap-2">POCKET CRICKET <Baseball/></h1>
        </div>
        <div className="flex justify-around text-center border-2 border-green-200 rounded-xl p-3 w-full bg-white shadow-sm">
          <div><p className="text-sm text-gray-500">SCORE</p><p className="text-3xl font-bold">{score}-{wickets}</p></div>
          <div className="border-l border-green-200" />
          <div><p className="text-sm text-gray-500">BEST</p><p className="text-3xl font-bold">{highScore}</p></div>
        </div>

        <div className="relative w-full h-80 bg-[url('data:image/svg+xml;utf8,<svg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"><line x1=\"50\" y1=\"0\" x2=\"50\" y2=\"100\" stroke=\"%23a3e635\" stroke-width=\"2\" stroke-dasharray=\"4\"/></svg>')] bg-repeat-y bg-center bg-[length:20px_auto] bg-green-200/50 rounded-lg border-4 border-white overflow-hidden shadow-inner">
          {gameState === 'bowling' && 
             <div ref={animationRef} className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-red-600 rounded-full animate-bowl shadow-lg"></div>
          }
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2 h-10 bg-yellow-900 rounded-t-sm"></div>
           <div className="absolute bottom-4 left-[calc(50%-12px)] w-2 h-10 bg-yellow-900 rounded-t-sm"></div>
           <div className="absolute bottom-4 left-[calc(50%+8px)] w-2 h-10 bg-yellow-900 rounded-t-sm"></div>
        </div>

        {gameState === 'idle' && <div className="text-center"><button onClick={handleBowl} className="px-8 py-3 bg-black text-white font-semibold rounded-full text-lg hover:bg-gray-800">BOWL</button></div>}
        {gameState === 'bowling' && <div className="text-center"><button onClick={handleSwing} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full text-lg hover:bg-blue-700 animate-pulse">SWING!</button></div>}
        {gameState === 'result' && <div className={`text-center h-12 flex items-center justify-center font-bold text-3xl ${feedback.color}`}>{feedback.message}</div>}
        {gameState === 'gameOver' && (
             <div className="text-center space-y-3">
                 <p className="text-2xl font-bold">Innings Over!</p>
                 <p className="text-xl">Final Score: {score}</p>
                 {score > initialHighScore && <p className="text-green-600 font-bold">New High Score!</p>}
                 <button onClick={startGame} className="flex items-center gap-2 mx-auto px-6 py-2 bg-black text-white font-medium rounded-full hover:bg-gray-800"><RotateCcw className="w-4 h-4" />Play Again</button>
             </div>
        )}
      </div>
      <button onClick={() => onBack(score, highScore)} className="absolute top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-black"><ArrowLeft className="w-6 h-6" /><span>Back</span></button>
       <style>{`@keyframes bowl { 0% { transform: translate(-50%, 0) scale(0.5); } 100% { transform: translate(-50%, 800%) scale(1.5); } } .animate-bowl { animation: bowl 1.2s linear forwards; } .grid-cols-20 { grid-template-columns: repeat(20, 1fr); } .grid-rows-20 { grid-template-rows: repeat(20, 1fr); }`}</style>
    </div>
  );
};


// ##################################################
// # 4. GAME SELECTION SCREEN (NEW)                 #
// ##################################################

const GameSelection = ({ onSelect, onBack, highScores }) => {
  const GameCard = ({ icon, title, description, gameKey }) => (
    <button onClick={() => onSelect(gameKey)} className="group w-full text-left p-6 bg-white border border-gray-200 rounded-xl hover:border-black hover:shadow-lg transition-all duration-300 flex items-center space-x-5">
      <div className="p-4 bg-gray-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">{icon}</div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-1">Best: {highScores[gameKey]}</p>
      </div>
    </button>
  );

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full p-4">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center">Choose a Game</h1>
        <div className="w-full max-w-md space-y-4">
            <GameCard icon={<Calculator size={28}/>} title="Math Reflex" description="Solve equations on the clock." gameKey="math" />
            <GameCard icon={<Gamepad2 size={28}/>} title="Retro Snake" description="Classic Nokia-style snake." gameKey="snake" />
            <GameCard icon={<Baseball size={28}/>} title="Pocket Cricket" description="Test your timing and swing." gameKey="cricket" />
        </div>
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-black"><ArrowLeft className="w-6 h-6" /><span>Back</span></button>
    </div>
  );
};


// ##################################################
// # 5. MAIN OFFLINE COMPONENT (CONTROLLER)         #
// ##################################################

export default function Offline() {
  const [activeScreen, setActiveScreen] = useState('landing'); // landing, selection, math, snake, cricket
  const [lastScores, setLastScores] = useState({ math: 0, snake: 0, cricket: 0 });
  const [highScores, setHighScores] = useState(storedHighScores);

  const handleBackFromGame = (gameKey, score, newHighScore) => {
    setLastScores(prev => ({ ...prev, [gameKey]: score }));
    if (newHighScore > highScores[gameKey]) {
        const updatedHighScores = { ...highScores, [gameKey]: newHighScore };
        setHighScores(updatedHighScores);
        storedHighScores = updatedHighScores;
    }
    setActiveScreen('selection');
  };
  
  const lastPlayedGame = Object.keys(lastScores).reduce((a, b) => lastScores[a] > 0 ? a : b);

  const renderScreen = () => {
    switch(activeScreen) {
        case 'selection': return <GameSelection onSelect={setActiveScreen} onBack={() => setActiveScreen('landing')} highScores={highScores} />;
        case 'math': return <MathRunner onBack={(s, hs) => handleBackFromGame('math', s, hs)} initialHighScore={highScores.math} />;
        case 'snake': return <SnakeGame onBack={(s, hs) => handleBackFromGame('snake', s, hs)} initialHighScore={highScores.snake} />;
        case 'cricket': return <CricketGame onBack={(s, hs) => handleBackFromGame('cricket', s, hs)} initialHighScore={highScores.cricket} />;
        case 'landing':
        default:
          return (
            <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto px-4 text-center">
                <div className="relative mb-6 flex items-center justify-center gap-4">
                    <div className="relative"><div className="absolute inset-0 animate-ping"><div className="w-12 h-12 border-2 border-black/20 rounded-full"/></div><WifiOff className="w-12 h-12 text-black relative z-10" strokeWidth={1.5} /></div>
                    <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-black via-gray-600 to-black bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]">You're Offline</h1>
                </div>

                <p className="text-lg text-gray-600 mb-10">While you're waiting, challenge your mind with a tone2vibe game.</p>
                
                {lastScores[lastPlayedGame] > 0 && (
                    <div className="mb-6 text-center">
                        <p className="text-sm text-gray-500 mb-1">Last Score ({lastPlayedGame})</p>
                        <p className="text-3xl font-bold">{lastScores[lastPlayedGame]}</p>
                        <p className="text-xs text-gray-400 mt-1">Best: {highScores[lastPlayedGame]}</p>
                    </div>
                )}
                
                <button onClick={() => setActiveScreen('selection')} className="group relative px-8 py-4 bg-black text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center gap-2"><Play className="w-5 h-5" fill="currentColor" />Start Playing</span>
                </button>
                 <div className="mt-16 flex flex-col items-center gap-3 text-sm text-gray-400">
                    <div className="flex items-center gap-2"><Wifi className="w-4 h-4" /><span>Reconnect anytime to sync your progress.</span></div>
                    <a href="https://tone2vibe.in" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black">tone2vibe.in</a>
                 </div>
            </div>
          );
    }
  };
          return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-white overflow-hidden p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)]" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-black/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-black/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="relative z-10 w-full h-full">{renderScreen()}</div>
      <style>{`@keyframes shimmer {0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; }} .delay-1000 {animation-delay: 1s;}`}</style>
    </div>
  );
}
