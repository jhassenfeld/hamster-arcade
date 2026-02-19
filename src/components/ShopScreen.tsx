import { useState } from 'react'
import { useGameStore, type ItemType } from '../state/gameStore'
import { SHOP_ITEMS, type ShopItem, getHamsterTokenPrice, getToyHappiness } from '../data/shopItems'
import CoinCounter from './CoinCounter'
import './ShopScreen.css'

type Tab = 'food' | 'toy' | 'accessory' | 'furniture' | 'decoration' | 'hamster-token'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'food', label: 'Food', icon: '🥕' },
  { id: 'toy', label: 'Toys', icon: '🎡' },
  { id: 'accessory', label: 'Wearables', icon: '🎩' },
  { id: 'furniture', label: 'Furniture', icon: '🛋️' },
  { id: 'decoration', label: 'Decor', icon: '🖼️' },
  { id: 'hamster-token', label: 'Hamsters', icon: '🐹' },
]

export default function ShopScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('food')
  const navigate = useGameStore((s) => s.navigate)
  const coins = useGameStore((s) => s.coins)
  const spendCoins = useGameStore((s) => s.spendCoins)
  const addInventoryItem = useGameStore((s) => s.addInventoryItem)
  const inventory = useGameStore((s) => s.inventory)
  const hamsters = useGameStore((s) => s.hamsters)
  const addHamster = useGameStore((s) => s.addHamster)

  const items = SHOP_ITEMS.filter(i => i.type === activeTab)
  const livingCount = hamsters.filter(h => h.health !== 'dead').length

  const handleBuy = (item: ShopItem) => {
    if (!spendCoins(item.price)) return

    if (item.type === 'toy') {
      const boost = getToyHappiness(item.id)
      const state = useGameStore.getState()
      useGameStore.setState({
        hamsters: state.hamsters.map(h =>
          h.health !== 'dead'
            ? { ...h, happiness: Math.min(100, h.happiness + boost) }
            : h
        ),
      })
    }

    addInventoryItem({ id: item.id, type: item.type, name: item.name })
  }

  const handleBuyHamster = () => {
    const price = getHamsterTokenPrice(livingCount)
    if (!spendCoins(price)) return
    if (livingCount >= 8) return

    const colors = ['#F4A460', '#D2B48C', '#DEB887', '#FFDAB9', '#E8C8A0', '#C8A882', '#B8956A', '#F5DEB3']
    const names = ['Peanut', 'Biscuit', 'Mochi', 'Cookie', 'Waffle', 'Caramel', 'Nugget', 'Toffee']
    const idx = hamsters.length % colors.length
    addHamster(names[idx], colors[idx])
  }

  const getOwnedQty = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId)
    return item ? item.quantity : 0
  }

  return (
    <div className="shop-screen screen-enter">
      <div className="shop-header">
        <button className="btn btn-small" onClick={() => navigate('hub')}>← Back</button>
        <h2>Shop</h2>
        <CoinCounter />
      </div>

      <div className="shop-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`shop-tab ${activeTab === tab.id ? 'shop-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="shop-items">
        {activeTab !== 'hamster-token' ? (
          items.map(item => {
            const owned = getOwnedQty(item.id)
            return (
              <div key={item.id} className="shop-item card">
                <span className="shop-item-icon">
                  {item.imageSrc ? (
                    <>
                      <img src={item.imageSrc} alt={item.name} className="shop-item-img" />
                      {owned > 0 && <span className="shop-item-qty-badge">{owned}</span>}
                    </>
                  ) : (
                    item.icon
                  )}
                </span>
                <div className="shop-item-info">
                  <h3>{item.name}</h3>
                  <p className="shop-item-desc">{item.description}</p>
                  {item.effect && <p className="shop-item-effect">{item.effect}</p>}
                  {!item.imageSrc && owned > 0 && <p className="shop-item-owned">Owned: {owned}</p>}
                </div>
                <button
                  className="btn btn-small"
                  onClick={() => handleBuy(item)}
                  disabled={coins < item.price}
                >
                  🪙 {item.price}
                </button>
              </div>
            )
          })
        ) : (
          <div className="shop-hamster-section">
            <div className="shop-item card">
              <span className="shop-item-icon">🐹</span>
              <div className="shop-item-info">
                <h3>Adopt New Hamster</h3>
                <p className="shop-item-desc">
                  {livingCount >= 8
                    ? 'Habitat is full! (max 8)'
                    : `Welcome a new friend! (${livingCount}/8)`}
                </p>
              </div>
              <button
                className="btn btn-small"
                onClick={handleBuyHamster}
                disabled={coins < getHamsterTokenPrice(livingCount) || livingCount >= 8}
              >
                🪙 {getHamsterTokenPrice(livingCount)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
