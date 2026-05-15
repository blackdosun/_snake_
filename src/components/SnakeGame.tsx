/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, Play, Pause, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

// --- 常數定義 ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20; // 每個網格的大小
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const INITIAL_DIRECTION = 'RIGHT';
const FPS = 10; // 遊戲速度

// --- 型別定義 ---
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 使用 useRef 儲存遊戲狀態，避免在迴圈中發生閉包過時問題
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Direction>(INITIAL_DIRECTION);
  const foodRef = useRef<Point>({ x: 15, y: 15 });
  const lastTimeRef = useRef<number>(0);
  const requestIdRef = useRef<number>(0);

  // 隨機生成食物位置
  const generateFood = useCallback((snake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)),
      };
      // 確保食物不會生在蛇身上
      const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  // 重置遊戲
  const resetGame = () => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    foodRef.current = generateFood(INITIAL_SNAKE);
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setHasStarted(true);
  };

  // 繪製遊戲畫面
  const draw = (ctx: CanvasRenderingContext2D) => {
    // 清除畫布
    ctx.fillStyle = '#020202'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 繪製網格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // 繪製食物
    ctx.fillStyle = '#FF0055'; 
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF0055';
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
      foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // 繪製蛇
    snakeRef.current.forEach((segment, index) => {
      const opacity = 1 - (index / snakeRef.current.length) * 0.5;
      ctx.fillStyle = `rgba(0, 255, 65, ${opacity})`;
      ctx.shadowBlur = index === 0 ? 20 : 10;
      ctx.shadowColor = '#00FF41';
      
      const padding = 1;
      ctx.fillRect(
        segment.x * GRID_SIZE + padding,
        segment.y * GRID_SIZE + padding,
        GRID_SIZE - padding * 2,
        GRID_SIZE - padding * 2
      );
      
      // 畫出眼睛 (如果是蛇頭)
      if (index === 0) {
        ctx.fillStyle = '#000000';
        const eyeSize = 3;
        const offset = 4;
        if (directionRef.current === 'RIGHT' || directionRef.current === 'LEFT') {
          ctx.fillRect(segment.x * GRID_SIZE + offset, segment.y * GRID_SIZE + offset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + offset, segment.y * GRID_SIZE + GRID_SIZE - offset - eyeSize, eyeSize, eyeSize);
        } else {
          ctx.fillRect(segment.x * GRID_SIZE + offset, segment.y * GRID_SIZE + offset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + GRID_SIZE - offset - eyeSize, segment.y * GRID_SIZE + offset, eyeSize, eyeSize);
        }
      }
      ctx.shadowBlur = 0;
    });
  };

  // 遊戲邏輯更新
  const update = () => {
    if (gameOver || isPaused || !hasStarted) return;

    directionRef.current = nextDirectionRef.current;
    const head = { ...snakeRef.current[0] };

    // 根據方向移動蛇頭
    switch (directionRef.current) {
      case 'UP': head.y -= 1; break;
      case 'DOWN': head.y += 1; break;
      case 'LEFT': head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
    }

    // 檢查碰撞牆壁
    if (
      head.x < 0 ||
      head.x >= CANVAS_WIDTH / GRID_SIZE ||
      head.y < 0 ||
      head.y >= CANVAS_HEIGHT / GRID_SIZE
    ) {
      setGameOver(true);
      return;
    }

    // 檢查碰撞自己
    if (snakeRef.current.some((segment, index) => index !== 0 && segment.x === head.x && segment.y === head.y)) {
      setGameOver(true);
      return;
    }

    const newSnake = [head, ...snakeRef.current];

    // 檢查是否吃到食物
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore(prev => {
        const newScore = prev + 10;
        if (newScore > highScore) setHighScore(newScore);
        return newScore;
      });
      foodRef.current = generateFood(newSnake);
    } else {
      // 沒吃到食物，移除蛇尾
      newSnake.pop();
    }

    snakeRef.current = newSnake;
  };

  // 遊戲迴圈
  const gameLoop = useCallback((time: number) => {
    const deltaTime = time - lastTimeRef.current;

    if (deltaTime > 1000 / FPS) {
      update();
      lastTimeRef.current = time;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    }

    requestIdRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, isPaused, hasStarted, generateFood]);

  useEffect(() => {
    requestIdRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestIdRef.current);
  }, [gameLoop]);

  // 控制鍵盤事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP';
          break;
        case 'ArrowDown':
          if (directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN';
          break;
        case 'ArrowLeft':
          if (directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT';
          break;
        case 'ArrowRight':
          if (directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT';
          break;
        case ' ': // 空白鍵暫停
          if (hasStarted && !gameOver) setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, gameOver]);

  return (
    <div className="w-[1024px] h-[768px] bg-[#050505] text-[#e0e0e0] font-sans flex flex-col overflow-hidden select-none mx-auto shadow-2xl border border-white/5">
      {/* Header Section */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-10 bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#00FF41] rounded-sm shadow-[0_0_15px_rgba(0,255,65,0.6)] flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full"></div>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Snake<span className="text-[#00FF41]">.os</span></h1>
        </div>
        
        <div className="flex gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">目前分數</span>
            <span className="text-2xl font-mono font-bold text-[#00FF41] leading-none">
              {score.toString().padStart(6, '0')}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">最高紀錄</span>
            <span className="text-2xl font-mono font-bold text-white leading-none">
              {highScore.toString().padStart(6, '0')}
            </span>
          </div>
        </div>
      </header>
    
      {/* Main Game Layout */}
      <main className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Sidebar / Stats */}
        <aside className="w-64 flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md">
            <h2 className="text-xs font-semibold text-white/60 uppercase mb-4 tracking-widest">系統狀態</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/80">移動速度</span>
                <span className="text-sm font-mono text-[#00FF41]">等級 {Math.floor(score / 50) + 1}</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-[#00FF41] h-full shadow-[0_0_8px_#00FF41] transition-all duration-500" 
                  style={{ width: `${Math.min((score % 50) * 2, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/80">得分加成</span>
                <span className="text-sm font-mono text-[#FF0055]">x{1 + (score / 100).toFixed(1)}</span>
              </div>
            </div>
          </div>
    
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex-1 flex flex-col">
            <h2 className="text-xs font-semibold text-white/60 uppercase mb-4 tracking-widest">操作指令</h2>
            <div className="space-y-4 flex flex-col items-center flex-1 justify-center">
              <div className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center bg-white/5 shadow-inner">↑</div>
              <div className="flex gap-2">
                <div className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center bg-white/5 shadow-inner">←</div>
                <div className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center bg-white/5 shadow-inner">↓</div>
                <div className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center bg-white/5 shadow-inner">→</div>
              </div>
              <p className="text-[10px] text-white/30 text-center mt-4 leading-relaxed italic uppercase font-mono tracking-tight text-wrap">
                使用方向鍵引導網格導航。避免碰撞牆壁或自身節點。
              </p>
            </div>
            
            <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95 text-[10px] font-bold tracking-widest uppercase"
              >
                {isPaused ? "繼續" : "暫停"}
              </button>
              <button 
                onClick={resetGame}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95 text-[10px] font-bold tracking-widest uppercase"
              >
                重置
              </button>
            </div>
          </div>
        </aside>
    
        {/* Primary Game Board */}
        <div className="flex-1 relative bg-[#020202] rounded-2xl border-4 border-white/5 shadow-2xl overflow-hidden group">
          {/* Game Canvas */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
             <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="max-w-full max-h-full object-contain"
              />
          </div>

          {/* HUD Scanlines Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(0,255,65,0.02),rgba(0,0,0,0),rgba(255,0,85,0.02))] bg-[length:100%_4px,3px_100%] opacity-40"></div>
          
          {/* Progress Decoration */}
          <div className="absolute top-4 left-4 flex gap-1 items-center z-10 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse"></div>
            <span className="text-[9px] font-mono text-[#00FF41]/60 tracking-tighter uppercase">連線狀態：穩定</span>
          </div>

          <div className="absolute top-4 right-4 flex gap-1 items-center z-10 pointer-events-none">
            <span className="text-[9px] font-mono text-white/40 tracking-tighter uppercase">節點 ID: 0x4F2A</span>
          </div>

          {/* Game Over / Pause / Start Overlay */}
          <AnimatePresence>
            {(gameOver || isPaused || !hasStarted) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-[4px]"
              >
                <div className="text-center p-12">
                  {gameOver ? (
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                    >
                      <h2 className="text-6xl font-black text-[#FF0055] uppercase tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,0,85,0.5)]">遊戲結束</h2>
                      <p className="text-white/60 mb-8 font-mono uppercase tracking-widest text-sm">最終得分：{score} 單位</p>
                      <button 
                        onClick={resetGame}
                        className="px-10 py-4 bg-[#00FF41] text-black font-bold uppercase tracking-widest rounded-sm hover:scale-105 transition-transform active:scale-95 shadow-[0_0_20px_rgba(0,255,65,0.4)]"
                      >
                        重新初始化連線
                      </button>
                    </motion.div>
                  ) : isPaused ? (
                    <div className="space-y-6">
                      <h2 className="text-6xl font-black text-[#FFCC00] uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(255,204,0,0.5)]">暫停中</h2>
                      <button 
                        onClick={() => setIsPaused(false)}
                        className="px-10 py-4 bg-[#00FF41] text-black font-bold uppercase tracking-widest rounded-sm hover:scale-105 transition-transform active:scale-95"
                      >
                        繼續數據流
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-7xl font-black text-white uppercase tracking-tighter">Snake<span className="text-[#00FF41]">.os</span></h2>
                        <p className="text-white/40 font-mono text-xs uppercase tracking-[0.3em]">進階神經元導航介面</p>
                      </div>
                      <button 
                        onClick={resetGame}
                        className="px-12 py-5 bg-[#00FF41] text-black font-black uppercase tracking-[0.2em] rounded-sm hover:scale-105 transition-transform active:scale-95 shadow-[0_0_30px_rgba(0,255,65,0.3)]"
                      >
                        啟動核心引擎
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    
      {/* Footer Status Bar */}
      <footer className="h-10 bg-black border-t border-white/5 px-10 flex items-center justify-between text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2"><span className="w-1 h-1 bg-[#00FF41] rounded-full"></span> 環境狀態：穩定</span>
          <span>FPS: {FPS}.00</span>
          <span className="text-white/10">|</span>
          <span>網格大小: {GRID_SIZE}px</span>
        </div>
        <div>Vite • React • TypeScript • {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
