import { useGameStore } from '../state/gameStore'
import './CoinCounter.css'

export default function CoinCounter() {
  const coins = useGameStore((s) => s.coins)

  return (
    <div className="coin-counter">
      <span className="coin-icon">🪙</span>
      <span className="coin-amount">{coins}</span>
    </div>
  )
}
