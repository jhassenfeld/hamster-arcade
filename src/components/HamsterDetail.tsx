import { useState } from 'react'
import { useGameStore } from '../state/gameStore'
import { SHOP_ITEMS, getToyHappiness } from '../data/shopItems'
import HamsterSprite from './HamsterSprite'
import HungerBar from './HungerBar'
import CoinCounter from './CoinCounter'
import './HamsterDetail.css'

export default function HamsterDetail() {
  const navigate = useGameStore((s) => s.navigate)
  const selectedHamsterId = useGameStore((s) => s.selectedHamsterId)
  const hamsters = useGameStore((s) => s.hamsters)
  const inventory = useGameStore((s) => s.inventory)
  const feedHamster = useGameStore((s) => s.feedHamster)
  const renameHamster = useGameStore((s) => s.renameHamster)
  const playWithToy = useGameStore((s) => s.playWithToy)
  const equipAccessory = useGameStore((s) => s.equipAccessory)
  const unequipAccessory = useGameStore((s) => s.unequipAccessory)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showAccessoryPicker, setShowAccessoryPicker] = useState<string | null>(null)

  const hamster = hamsters.find(h => h.id === selectedHamsterId)
  if (!hamster) {
    return (
      <div className="detail-screen screen-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Hamster not found</p>
          <button className="btn" onClick={() => navigate('hub')}>← Back</button>
        </div>
      </div>
    )
  }

  const foodItems = inventory.filter(i => i.type === 'food')
  const toyItems = inventory.filter(i => i.type === 'toy')
  const accessoryItems = inventory.filter(i => i.type === 'accessory')

  const handleStartRename = () => {
    setNameInput(hamster.name)
    setEditingName(true)
  }

  const handleSaveRename = () => {
    if (nameInput.trim()) {
      renameHamster(hamster.id, nameInput.trim())
    }
    setEditingName(false)
  }

  const handleFeed = (foodId: string) => {
    feedHamster(hamster.id, foodId)
  }

  const accessorySlots = [
    { slot: 'head', label: 'Head', ids: ['hat', 'crown'] },
    { slot: 'face', label: 'Face', ids: ['sunglasses'] },
    { slot: 'body', label: 'Body', ids: ['bow-tie', 'cape'] },
  ]

  const getEquippedForSlot = (slotIds: string[]) => {
    return hamster.accessories.find(a => slotIds.includes(a))
  }

  const availableForSlot = (slotIds: string[]) => {
    return accessoryItems.filter(i => slotIds.includes(i.id))
  }

  const isDead = hamster.health === 'dead'

  return (
    <div className="detail-screen screen-enter">
      <div className="detail-header">
        <button className="btn btn-small" onClick={() => navigate('hub')}>← Back</button>
        <h2>Hamster Details</h2>
        <CoinCounter />
      </div>

      <div className="detail-content">
        {/* Large sprite */}
        <div className="detail-sprite-area">
          <HamsterSprite hamster={hamster} size="large" showName={false} />
        </div>

        {/* Name */}
        <div className="detail-name-area">
          {editingName ? (
            <div className="detail-name-edit">
              <input
                className="detail-name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                autoFocus
                maxLength={16}
              />
              <button className="btn btn-small" onClick={handleSaveRename}>Save</button>
            </div>
          ) : (
            <div className="detail-name-display" onClick={!isDead ? handleStartRename : undefined}>
              <h2>{hamster.name}</h2>
              {!isDead && <span className="detail-name-edit-hint">✏️</span>}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="detail-status card">
          <div className="detail-stat">
            <span className="detail-stat-label">Hunger</span>
            <HungerBar hunger={hamster.hunger} />
          </div>
          <div className="detail-stat">
            <span className="detail-stat-label">Happiness</span>
            <div className="happiness-bar">
              <div
                className="happiness-bar-fill"
                style={{ width: `${hamster.happiness}%` }}
              />
            </div>
          </div>
          <div className="detail-stat">
            <span className="detail-stat-label">Health</span>
            <span className={`detail-health-badge health-${hamster.health}`}>
              {hamster.health}
            </span>
          </div>
        </div>

        {/* Feed section */}
        {!isDead && (
          <div className="detail-section">
            <h3>Feed {hamster.name}</h3>
            {foodItems.length > 0 ? (
              <div className="detail-food-grid">
                {foodItems.map(food => {
                  const shopInfo = SHOP_ITEMS.find(s => s.id === food.id)
                  return (
                    <button
                      key={food.id}
                      className="btn btn-small detail-food-btn"
                      onClick={() => handleFeed(food.id)}
                    >
                      {shopInfo?.icon || '🍽️'} {food.name} ({food.quantity})
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="detail-empty">No food! Visit the shop.</p>
            )}
          </div>
        )}

        {/* Toys */}
        {!isDead && (
          <div className="detail-section">
            <h3>Play with Toys</h3>
            {toyItems.length > 0 ? (
              <div className="detail-food-grid">
                {toyItems.map(toy => {
                  const shopInfo = SHOP_ITEMS.find(s => s.id === toy.id)
                  const boost = getToyHappiness(toy.id)
                  return (
                    <button
                      key={toy.id}
                      className="btn btn-small detail-food-btn"
                      onClick={() => playWithToy(hamster.id, toy.id, boost)}
                    >
                      {shopInfo?.icon || '🎮'} {toy.name} ({toy.quantity}) +{boost}😊
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="detail-empty">No toys! Visit the shop.</p>
            )}
          </div>
        )}

        {/* Accessories */}
        {!isDead && (
          <div className="detail-section">
            <h3>Accessories</h3>
            <div className="detail-slots">
              {accessorySlots.map(({ slot, label, ids }) => {
                const equipped = getEquippedForSlot(ids)
                const available = availableForSlot(ids)
                const equippedInfo = equipped ? SHOP_ITEMS.find(s => s.id === equipped) : null

                return (
                  <div key={slot} className="detail-slot">
                    <span className="detail-slot-label">{label}</span>
                    {equipped ? (
                      <button
                        className="detail-slot-item"
                        onClick={() => unequipAccessory(hamster.id, equipped)}
                        title="Click to unequip"
                      >
                        {equippedInfo?.icon || '?'}
                      </button>
                    ) : (
                      <button
                        className="detail-slot-empty"
                        onClick={() => setShowAccessoryPicker(showAccessoryPicker === slot ? null : slot)}
                        disabled={available.length === 0}
                      >
                        +
                      </button>
                    )}
                    {showAccessoryPicker === slot && available.length > 0 && (
                      <div className="detail-slot-picker">
                        {available.map(item => {
                          const info = SHOP_ITEMS.find(s => s.id === item.id)
                          return (
                            <button
                              key={item.id}
                              className="btn btn-small"
                              onClick={() => {
                                equipAccessory(hamster.id, item.id)
                                setShowAccessoryPicker(null)
                              }}
                            >
                              {info?.icon} {info?.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isDead && (
          <div className="detail-dead-message card">
            <p>💔 {hamster.name} has passed away...</p>
            <p>They will be remembered.</p>
          </div>
        )}
      </div>
    </div>
  )
}
