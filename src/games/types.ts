export interface GameConfig {
  id: string
  name: string
  description: string
  icon: string
  coinRate: string
  unlockCost: number
}

export interface GameCallbacks {
  onScore: (points: number) => void
  onLifeLost: () => void
  onPowerUp: () => void
  onGameOver: (finalScore: number) => void
  onHighScore: (score: number) => void
}

export interface GameEngine {
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
  cleanup: () => void
  getScore: () => number
  getLives: () => number
  isPaused: () => boolean
  isOver: () => boolean
}
