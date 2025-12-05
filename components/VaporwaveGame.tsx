import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { drawBackground, drawEntities } from '../engine/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT, InputKeys, COLORS } from '../constants';
import { PlayerForm, GameState } from '../types';

export const VaporwaveGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const requestRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [hudState, setHudState] = useState({ hp: 100, score: 0, level: 1, form: 'NORMAL' });

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (engineRef.current.gameState === GameState.PLAYING) {
        engineRef.current.setKey(e.key, true);
      } else if (e.key === InputKeys.ENTER) {
        handleStateTransition();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.setKey(e.key, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handleStateTransition = () => {
    const engine = engineRef.current;
    if (engine.gameState === GameState.MENU || engine.gameState === GameState.GAME_OVER) {
      engine.resetLevel(1);
      engine.score = 0;
      engine.gameState = GameState.PLAYING;
    } else if (engine.gameState === GameState.LEVEL_COMPLETE) {
      engine.resetLevel(engine.level + 1);
      engine.gameState = GameState.PLAYING;
    }
    setGameState(engine.gameState);
  };

  const gameLoop = useCallback(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Logic Update
    engine.update();

    // Check for state changes from engine (e.g., dying)
    if (engine.gameState !== gameState) {
      setGameState(engine.gameState);
    }

    // React State Update (throttled visually, but let's do every frame for smoothness in this demo)
    if (engine.gameState === GameState.PLAYING) {
      setHudState({
        hp: engine.player.hp,
        score: engine.score,
        level: engine.level,
        form: (engine.player as any).form
      });
    }

    // Render
    ctx.imageSmoothingEnabled = false;
    drawBackground(ctx, engine.camera, engine.level);
    drawEntities(ctx, engine.entities, engine.camera, Date.now() / 16); // basic frame counter

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameLoop]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-black">
      <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-cyan-500 shadow-[0_0_20px_#00f0ff] rounded-lg block bg-black"
        />

        {/* UI Overlay */}
        <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between font-[Press Start 2P] text-white retro-text uppercase">
          <div className="flex flex-col gap-2">
            <div className="text-cyan-400">HP: {hudState.hp}%</div>
            <div className="text-yellow-400">SCORE: {hudState.score}</div>
          </div>
          <div className="flex flex-col gap-2 text-right">
             <div className="text-magenta-500">LEVEL {hudState.level}</div>
             <div className="text-sm text-gray-300">FORM: {hudState.form}</div>
          </div>
        </div>

        {/* Menu Screens */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 backdrop-blur-sm">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8 retro-text animate-pulse">
              NEON MIDNIGHT
            </h1>
            <p className="text-white mb-8 text-xl">VAPORWAVE RUN</p>
            <div className="text-cyan-300 text-center space-y-2 mb-8">
                <p>Arrows to Move • Z to Shoot • Space to Jump</p>
            </div>
            <button 
                onClick={handleStateTransition}
                className="px-8 py-4 bg-fuchsia-600 text-white font-bold rounded shadow-[0_0_15px_#ff00ff] hover:bg-fuchsia-500 transition-all retro-text">
              START GAME
            </button>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/50 z-10 backdrop-blur-sm">
            <h2 className="text-5xl text-red-500 mb-4 retro-text glitch-text">SYSTEM FAILURE</h2>
            <p className="text-white mb-8">Score: {hudState.score}</p>
            <button 
                onClick={handleStateTransition}
                className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-black transition-colors retro-text">
              REBOOT SYSTEM
            </button>
          </div>
        )}

        {gameState === GameState.LEVEL_COMPLETE && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-900/50 z-10 backdrop-blur-sm">
            <h2 className="text-4xl text-cyan-400 mb-4 retro-text">STAGE CLEARED</h2>
            <button 
                onClick={handleStateTransition}
                className="px-6 py-3 bg-cyan-600 text-white shadow-[0_0_15px_#00f0ff] hover:bg-cyan-500 transition-colors retro-text">
              NEXT WAVE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};