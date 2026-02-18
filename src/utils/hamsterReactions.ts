import { type HamsterExpression } from '../state/gameStore'

export type ReactionEvent =
  | 'score'
  | 'life-lost'
  | 'power-up'
  | 'game-over'
  | 'high-score'
  | 'idle'
  | 'hungry-during-game'

export type ReactionAnimation = 'jump' | 'cover-eyes' | 'cheer' | 'sad' | 'party' | 'sleep' | 'tug' | 'none'

export interface Reaction {
  expression: HamsterExpression
  bubble: string
  animation: ReactionAnimation
  duration: number // ms
}

export function getReaction(event: ReactionEvent): Reaction {
  switch (event) {
    case 'score':
      return { expression: 'excited', bubble: '✨', animation: 'jump', duration: 800 }
    case 'life-lost':
      return { expression: 'worried', bubble: '😱', animation: 'cover-eyes', duration: 1200 }
    case 'power-up':
      return { expression: 'excited', bubble: '🎉', animation: 'cheer', duration: 1000 }
    case 'game-over':
      return { expression: 'worried', bubble: '😢', animation: 'sad', duration: 2000 }
    case 'high-score':
      return { expression: 'excited', bubble: '🎊', animation: 'party', duration: 3000 }
    case 'idle':
      return { expression: 'neutral', bubble: '💤', animation: 'sleep', duration: 5000 }
    case 'hungry-during-game':
      return { expression: 'worried', bubble: '🍕', animation: 'tug', duration: 2000 }
    default:
      return { expression: 'neutral', bubble: '', animation: 'none', duration: 0 }
  }
}
