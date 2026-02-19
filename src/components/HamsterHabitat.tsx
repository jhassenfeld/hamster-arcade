import { useRef, useCallback } from 'react'
import { useGameStore, type Hamster } from '../state/gameStore'
import { SHOP_ITEMS } from '../data/shopItems'
import HamsterSprite from './HamsterSprite'
import HungerBar from './HungerBar'
import './HamsterHabitat.css'

// Default positions for placed items (% based)
const DEFAULT_ITEM_POSITIONS: { left: number; top: number }[] = [
  { left: 75, top: 55 },
  { left: 15, top: 50 },
  { left: 45, top: 60 },
  { left: 30, top: 45 },
  { left: 85, top: 45 },
  { left: 60, top: 50 },
  { left: 20, top: 60 },
  { left: 50, top: 45 },
  { left: 10, top: 55 },
  { left: 70, top: 60 },
  { left: 40, top: 50 },
  { left: 90, top: 55 },
]

// Default hamster positions spread across the floor
function getDefaultHamsterPosition(index: number, total: number): { left: number; top: number } {
  const baseLeft = total === 1 ? 50 : 15 + (70 * index) / (total - 1)
  return { left: Math.max(10, Math.min(90, baseLeft)), top: 72 }
}

const DRAG_THRESHOLD = 6 // pixels before a mousedown becomes a drag

interface PlacedItem {
  id: string
  name: string
  icon: string
  imageSrc?: string
  left: number
  top: number
  category: 'toy' | 'furniture' | 'decoration'
}

export default function HamsterHabitat() {
  const hamsters = useGameStore((s) => s.hamsters)
  const inventory = useGameStore((s) => s.inventory)
  const toyPositions = useGameStore((s) => s.toyPositions)
  const furniturePositions = useGameStore((s) => s.furniturePositions)
  const decorationPositions = useGameStore((s) => s.decorationPositions)
  const hamsterPositions = useGameStore((s) => s.hamsterPositions)
  const setToyPosition = useGameStore((s) => s.setToyPosition)
  const setFurniturePosition = useGameStore((s) => s.setFurniturePosition)
  const setDecorationPosition = useGameStore((s) => s.setDecorationPosition)
  const setHamsterPosition = useGameStore((s) => s.setHamsterPosition)
  const navigate = useGameStore((s) => s.navigate)
  const selectHamster = useGameStore((s) => s.selectHamster)
  const habitatRef = useRef<HTMLDivElement>(null)

  const livingHamsters = hamsters.filter(h => h.health !== 'dead')
  const deadHamsters = hamsters.filter(h => h.health === 'dead')

  // Build list of all placed items from inventory
  const placedItems: PlacedItem[] = []
  let posIndex = 0

  const addItems = (type: 'toy' | 'furniture' | 'decoration', positions: Record<string, { left: number; top: number }>) => {
    inventory
      .filter(i => i.type === type)
      .forEach((i) => {
        const shopInfo = SHOP_ITEMS.find(s => s.id === i.id)
        const saved = positions[i.id]
        const fallback = DEFAULT_ITEM_POSITIONS[posIndex % DEFAULT_ITEM_POSITIONS.length]
        posIndex++
        placedItems.push({
          id: i.id,
          name: shopInfo?.name || i.name,
          icon: shopInfo?.icon || '📦',
          imageSrc: shopInfo?.imageSrc,
          left: saved?.left ?? fallback.left,
          top: saved?.top ?? fallback.top,
          category: type,
        })
      })
  }

  addItems('furniture', furniturePositions)
  addItems('decoration', decorationPositions)
  addItems('toy', toyPositions)

  const getSaveFunction = (category: 'toy' | 'furniture' | 'decoration') => {
    switch (category) {
      case 'toy': return setToyPosition
      case 'furniture': return setFurniturePosition
      case 'decoration': return setDecorationPosition
    }
  }

  const handleClick = (hamster: Hamster) => {
    selectHamster(hamster.id)
    navigate('hamster-detail')
  }

  // Generic drag handler — works for both mouse and touch
  const startDrag = useCallback((
    id: string,
    cssSelector: string,
    onSave: (id: string, left: number, top: number) => void,
    onClickInstead: (() => void) | null,
    startEvent: React.MouseEvent | React.TouchEvent,
  ) => {
    startEvent.preventDefault()
    startEvent.stopPropagation()

    const habitat = habitatRef.current
    if (!habitat) return

    const rect = habitat.getBoundingClientRect()
    const el = (startEvent.target as HTMLElement).closest(cssSelector) as HTMLElement
    if (!el) return

    const getClientPos = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
      return { x: e.clientX, y: e.clientY }
    }

    const startPos = 'touches' in startEvent.nativeEvent
      ? { x: startEvent.nativeEvent.touches[0].clientX, y: startEvent.nativeEvent.touches[0].clientY }
      : { x: (startEvent.nativeEvent as MouseEvent).clientX, y: (startEvent.nativeEvent as MouseEvent).clientY }

    let isDragging = false

    const onMove = (e: MouseEvent | TouchEvent) => {
      const { x, y } = getClientPos(e)

      if (!isDragging) {
        const dx = x - startPos.x
        const dy = y - startPos.y
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
        isDragging = true
        el.classList.add('dragging')
      }

      e.preventDefault()
      const left = Math.max(2, Math.min(98, ((x - rect.left) / rect.width) * 100))
      const top = Math.max(2, Math.min(98, ((y - rect.top) / rect.height) * 100))
      el.style.left = `${left}%`
      el.style.top = `${top}%`
    }

    const onEnd = (e: MouseEvent | TouchEvent) => {
      el.classList.remove('dragging')

      if (!isDragging) {
        if (onClickInstead) onClickInstead()
      } else {
        const { x, y } = 'changedTouches' in e
          ? { x: (e as TouchEvent).changedTouches[0].clientX, y: (e as TouchEvent).changedTouches[0].clientY }
          : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }

        const left = Math.max(2, Math.min(98, ((x - rect.left) / rect.width) * 100))
        const top = Math.max(2, Math.min(98, ((y - rect.top) / rect.height) * 100))
        onSave(id, left, top)
      }

      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }, [])

  return (
    <div className="habitat" ref={habitatRef}>
      {/* Room elements */}
      <div className="habitat-window" />
      <div className="habitat-baseboard" />

      {/* All placed items — draggable */}
      {placedItems.map((item) => {
        const saveFn = getSaveFunction(item.category)
        return (
          <div
            key={`${item.category}-${item.id}`}
            className="habitat-toy"
            style={{ left: `${item.left}%`, top: `${item.top}%` }}
            title={`${item.name} — drag to move`}
            onMouseDown={(e) => startDrag(item.id, '.habitat-toy', saveFn, null, e)}
            onTouchStart={(e) => startDrag(item.id, '.habitat-toy', saveFn, null, e)}
          >
            {item.imageSrc ? (
              <img src={item.imageSrc} alt={item.name} className="habitat-item-img" draggable={false} />
            ) : (
              item.icon
            )}
          </div>
        )
      })}

      {/* Living hamsters — draggable, click opens detail */}
      {livingHamsters.map((h, i) => {
        const saved = hamsterPositions[h.id]
        const fallback = getDefaultHamsterPosition(i, livingHamsters.length)
        const left = saved?.left ?? fallback.left
        const top = saved?.top ?? fallback.top

        return (
          <div
            key={h.id}
            className="habitat-hamster"
            style={{ left: `${left}%`, top: `${top}%` }}
            onMouseDown={(e) => startDrag(h.id, '.habitat-hamster', setHamsterPosition, () => handleClick(h), e)}
            onTouchStart={(e) => startDrag(h.id, '.habitat-hamster', setHamsterPosition, () => handleClick(h), e)}
          >
            <HungerBar hunger={h.hunger} size="small" />
            <HamsterSprite hamster={h} size="medium" />
          </div>
        )
      })}

      {/* Gravestones for dead hamsters */}
      {deadHamsters.map((h, i) => {
        const saved = hamsterPositions[h.id]
        const fallback = getDefaultHamsterPosition(livingHamsters.length + i, livingHamsters.length + deadHamsters.length)
        const left = saved?.left ?? fallback.left
        const top = saved?.top ?? fallback.top

        return (
          <div
            key={h.id}
            className="habitat-grave"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="grave-marker">🪦</span>
            <span className="grave-name">{h.name}</span>
          </div>
        )
      })}

      {/* Floor */}
      <div className="habitat-floor" />
    </div>
  )
}
