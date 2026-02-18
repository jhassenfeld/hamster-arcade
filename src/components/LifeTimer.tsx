import { useGameStore } from '../state/gameStore'
import './LifeTimer.css'

export default function LifeTimer() {
  const hamsters = useGameStore((s) => s.hamsters)

  const livingHamsters = hamsters.filter(h => h.health !== 'dead')
  if (livingHamsters.length === 0) return null

  // Find the hungriest (lowest hunger) living hamster
  const hungriest = livingHamsters.reduce((min, h) =>
    h.hunger < min.hunger ? h : min
  , livingHamsters[0])

  // Calculate seconds remaining: hunger drains at 1/18 per second
  const secondsRemaining = Math.floor(hungriest.hunger * 18)
  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const urgent = hungriest.hunger <= 30
  const warning = hungriest.hunger <= 50 && hungriest.hunger > 30

  return (
    <div className={`life-timer ${urgent ? 'life-timer-urgent' : warning ? 'life-timer-warning' : ''}`}>
      <span className="life-timer-icon">⏱️</span>
      <div className="life-timer-info">
        <span className="life-timer-time">{timeStr}</span>
        <span className="life-timer-label">
          {livingHamsters.length === 1 ? hungriest.name : `${hungriest.name} (lowest)`}
        </span>
      </div>
    </div>
  )
}
