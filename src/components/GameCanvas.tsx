import { useEffect, useRef, useState } from 'react';
import { GameState, updateGameState, isLevelComplete, Obstacle } from '@/lib/gameEngine';

interface GameCanvasProps {
  gameState: GameState;
  onUpdate: (state: GameState) => void;
  onComplete: () => void;
  onGameOver: () => void;
}

export const GameCanvas = ({ gameState, onUpdate, onComplete, onGameOver }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isJumping, setIsJumping] = useState(false);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (gameState.isGameOver) {
      onGameOver();
      return;
    }

    if (isLevelComplete(gameState.scrollOffset, 30)) {
      onComplete();
      return;
    }

    const gameLoop = () => {
      const newState = updateGameState(gameState, isJumping);
      onUpdate(newState);
      setIsJumping(false);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(0, 430);
      ctx.lineTo(canvas.width, 430);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const drawObstacle = (obstacle: Obstacle, x: number) => {
        if (obstacle.type === 'spike') {
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(x + 15, obstacle.y - 30);
          ctx.lineTo(x, obstacle.y);
          ctx.lineTo(x + 30, obstacle.y);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#8b5cf6';
          ctx.shadowColor = '#8b5cf6';
          ctx.shadowBlur = 15;
          ctx.fillRect(x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
          ctx.shadowBlur = 0;
        }
      };

      gameState.obstacles.forEach((obstacle) => {
        const screenX = obstacle.x - gameState.scrollOffset;
        if (screenX > -100 && screenX < canvas.width + 100) {
          drawObstacle(obstacle, screenX);
        }
      });

      const rotation = (gameState.scrollOffset % 360) * (Math.PI / 180);
      ctx.save();
      ctx.translate(gameState.player.x + gameState.player.size / 2, gameState.player.y + gameState.player.size / 2);
      ctx.rotate(rotation);
      ctx.fillStyle = '#0ea5e9';
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 20;
      ctx.fillRect(-gameState.player.size / 2, -gameState.player.size / 2, gameState.player.size, gameState.player.size);
      ctx.shadowBlur = 0;
      ctx.restore();

      const progress = (gameState.scrollOffset / (30 * 100)) * 100;
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, (canvas.width * progress) / 100, 5);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, isJumping, onUpdate, onComplete, onGameOver]);

  const handleJump = () => {
    if (!gameState.isGameOver) {
      setIsJumping(true);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={450}
      className="game-canvas border-2 border-primary/50 rounded-lg cursor-pointer neon-box"
      style={{ borderColor: 'hsl(var(--neon-blue))' }}
      onClick={handleJump}
      onTouchStart={handleJump}
    />
  );
};
