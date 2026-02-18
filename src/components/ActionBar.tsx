import { useGameStore } from '../state/gameStore'
import './ActionBar.css'

export default function ActionBar() {
  const navigate = useGameStore((s) => s.navigate)
  const feedAll = useGameStore((s) => s.feedAll)
  const inventory = useGameStore((s) => s.inventory)

  const totalFood = inventory.filter(i => i.type === 'food').reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="action-bar">
      <button className="btn action-btn" onClick={() => navigate('arcade')}>
        <span className="action-icon">🕹️</span>
        <span>Play</span>
      </button>
      <button className="btn action-btn" onClick={() => navigate('shop')}>
        <span className="action-icon">🛒</span>
        <span>Shop</span>
      </button>
      <button
        className="btn action-btn action-feed"
        onClick={feedAll}
        disabled={totalFood === 0}
      >
        <span className="action-icon">🥕</span>
        <span>Feed All</span>
        {totalFood > 0 && <span className="food-badge">{totalFood}</span>}
      </button>
    </div>
  )
}
