import { type GameConfig } from '../games/types'

export const GAME_CONFIGS: GameConfig[] = [
  {
    id: 'asteroids',
    name: 'Asteroids',
    description: 'Blast space rocks!',
    icon: '🚀',
    coinRate: '1 coin / 10 pts',
    unlockCost: 0,
  },
  {
    id: 'pacman',
    name: 'Pac-Hamster',
    description: 'Eat dots, avoid cats!',
    icon: '😮',
    coinRate: '1 coin / 10 pts',
    unlockCost: 0,
  },
  {
    id: 'space-invaders',
    name: 'Space Invaders',
    description: 'Defend against cats!',
    icon: '👾',
    coinRate: '1 coin / 10 pts',
    unlockCost: 0,
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Smash pastel bricks!',
    icon: '🧱',
    coinRate: '1 coin / 10 pts',
    unlockCost: 0,
  },
]
