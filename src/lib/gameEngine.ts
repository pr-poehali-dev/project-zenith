export interface Obstacle {
  x: number;
  y: number;
  type: 'spike' | 'block';
  width: number;
  height: number;
}

export interface Player {
  x: number;
  y: number;
  velocityY: number;
  isJumping: boolean;
  size: number;
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  scrollOffset: number;
  isGameOver: boolean;
  isCompleted: boolean;
  startTime: number | null;
  elapsedTime: number;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -9;
const PLAYER_SIZE = 30;
const GROUND_Y = 400;
const SCROLL_SPEED = 5;

export const createPlayer = (): Player => ({
  x: 100,
  y: GROUND_Y,
  velocityY: 0,
  isJumping: false,
  size: PLAYER_SIZE,
});

export const generateObstacles = (levelDifficulty: number, levelLength: number): Obstacle[] => {
  const obstacles: Obstacle[] = [];
  const obstacleCount = 15 + levelDifficulty * 10;
  const spacing = (levelLength * 100) / obstacleCount;

  for (let i = 0; i < obstacleCount; i++) {
    const x = 600 + i * spacing + Math.random() * spacing * 0.5;
    
    obstacles.push({
      x,
      y: GROUND_Y + PLAYER_SIZE,
      type: 'spike',
      width: 30,
      height: 30,
    });
  }

  return obstacles;
};

export const updateGameState = (state: GameState, jump: boolean): GameState => {
  const newState = { ...state };
  const player = { ...newState.player };

  if (jump && !player.isJumping) {
    player.velocityY = JUMP_FORCE;
    player.isJumping = true;
  }

  player.velocityY += GRAVITY;
  player.y += player.velocityY;

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.velocityY = 0;
    player.isJumping = false;
  }

  if (player.y < 0) {
    player.y = 0;
    player.velocityY = 0;
  }

  newState.player = player;
  newState.scrollOffset += SCROLL_SPEED;

  const collision = checkCollisions(player, state.obstacles, state.scrollOffset);
  if (collision) {
    newState.isGameOver = true;
  }

  if (newState.startTime) {
    newState.elapsedTime = Date.now() - newState.startTime;
  }

  return newState;
};

export const checkCollisions = (player: Player, obstacles: Obstacle[], scrollOffset: number): boolean => {
  for (const obstacle of obstacles) {
    const obstacleScreenX = obstacle.x - scrollOffset;
    
    if (
      player.x < obstacleScreenX + obstacle.width &&
      player.x + player.size > obstacleScreenX &&
      player.y < obstacle.y &&
      player.y + player.size > obstacle.y - obstacle.height
    ) {
      return true;
    }
  }
  return false;
};

export const isLevelComplete = (scrollOffset: number, levelLength: number): boolean => {
  return scrollOffset >= levelLength * 100;
};