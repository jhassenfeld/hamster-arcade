import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export type HamsterHealth = 'healthy' | 'hungry' | 'sick' | 'dead'
export type HamsterExpression = 'happy' | 'neutral' | 'watching' | 'excited' | 'worried' | 'sick' | 'dead'
export type ScreenName = 'hub' | 'arcade' | 'shop' | 'hamster-detail'
export type ItemType = 'food' | 'toy' | 'accessory' | 'furniture' | 'decoration' | 'hamster-token'

export interface Hamster {
  id: string
  name: string
  hunger: number        // 0–100 (fractional internally)
  happiness: number     // 0–100
  health: HamsterHealth
  lastFedAt: number
  accessories: string[]
  expression: HamsterExpression
  color: string
  createdAt: number
}

export interface InventoryItem {
  id: string
  type: ItemType
  name: string
  quantity: number
}

interface GameState {
  coins: number
  totalScore: number
  hamsters: Hamster[]
  inventory: InventoryItem[]
  unlockedGames: string[]
  currentScreen: ScreenName
  currentGame: string | null
  gameActive: boolean
  highScores: Record<string, number>
  selectedHamsterId: string | null
  lastSavedAt: number
  toyPositions: Record<string, { left: number; top: number }>  // toy id → % position
  furniturePositions: Record<string, { left: number; top: number }>
  decorationPositions: Record<string, { left: number; top: number }>
  hamsterPositions: Record<string, { left: number; top: number }>  // hamster id → % position
}

interface GameActions {
  // Navigation
  navigate: (screen: ScreenName) => void
  setCurrentGame: (gameId: string | null) => void
  setGameActive: (active: boolean) => void

  // Economy
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean

  // Hamster management
  feedHamster: (hamsterId: string, foodItemId: string) => void
  feedAll: () => void
  addHamster: (name: string, color: string) => void
  killHamster: (hamsterId: string) => void
  renameHamster: (hamsterId: string, name: string) => void
  playWithToy: (hamsterId: string, toyId: string, happinessBoost: number) => void
  equipAccessory: (hamsterId: string, accessoryId: string) => void
  unequipAccessory: (hamsterId: string, accessoryId: string) => void
  selectHamster: (id: string | null) => void

  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'quantity'>, quantity?: number) => void
  removeInventoryItem: (itemId: string, quantity?: number) => void
  getItemQuantity: (itemId: string) => number

  // Timer
  tickHunger: () => void
  applyRetroactiveDrain: () => void

  // Scores
  updateHighScore: (gameId: string, score: number) => void

  // Unlocking
  unlockGame: (gameId: string) => void

  // Room decoration
  setToyPosition: (toyId: string, left: number, top: number) => void
  setFurniturePosition: (id: string, left: number, top: number) => void
  setDecorationPosition: (id: string, left: number, top: number) => void
  setHamsterPosition: (hamsterId: string, left: number, top: number) => void
}

function deriveHealthAndExpression(hunger: number, happiness: number, currentHealth: HamsterHealth): { health: HamsterHealth; expression: HamsterExpression } {
  if (currentHealth === 'dead') return { health: 'dead', expression: 'dead' }

  if (hunger <= 0) return { health: 'dead', expression: 'dead' }
  if (hunger <= 10) return { health: 'sick', expression: 'sick' }
  if (hunger <= 30) return { health: 'hungry', expression: 'worried' }

  // Healthy — expression based on happiness
  if (happiness > 70) return { health: 'healthy', expression: 'happy' }
  if (happiness > 30) return { health: 'healthy', expression: 'neutral' }
  return { health: 'healthy', expression: 'neutral' }
}

const HUNGER_DRAIN_PER_SECOND = 1 / 18 // 100 -> 0 in 1800 seconds (30 minutes)

function createDefaultHamster(): Hamster {
  return {
    id: 'nibbles-1',
    name: 'Nibbles',
    hunger: 100,
    happiness: 70,
    health: 'healthy',
    lastFedAt: Date.now(),
    accessories: [],
    expression: 'happy',
    color: '#F4A460',
    createdAt: Date.now(),
  }
}

function createDefaultInventory(): InventoryItem[] {
  return [
    { id: 'pellets', type: 'food', name: 'Pellets', quantity: 10 },
  ]
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      // Initial state
      coins: 50,
      totalScore: 0,
      hamsters: [createDefaultHamster()],
      inventory: createDefaultInventory(),
      unlockedGames: ['asteroids', 'pacman', 'space-invaders', 'breakout'],
      currentScreen: 'hub' as ScreenName,
      currentGame: null,
      gameActive: false,
      highScores: {},
      selectedHamsterId: null,
      lastSavedAt: Date.now(),
      toyPositions: {},
      furniturePositions: {},
      decorationPositions: {},
      hamsterPositions: {},

      // Navigation
      navigate: (screen) => set({ currentScreen: screen }),

      setCurrentGame: (gameId) => set({ currentGame: gameId }),

      setGameActive: (active) => set({ gameActive: active }),

      // Economy
      addCoins: (amount) => set((s) => ({
        coins: s.coins + amount,
        totalScore: s.totalScore + amount,
      })),

      spendCoins: (amount) => {
        const { coins } = get()
        if (coins < amount) return false
        set({ coins: coins - amount })
        return true
      },

      // Hamster management
      feedHamster: (hamsterId, foodItemId) => {
        const state = get()
        const hamster = state.hamsters.find(h => h.id === hamsterId)
        if (!hamster || hamster.health === 'dead') return

        const foodItem = state.inventory.find(i => i.id === foodItemId && i.type === 'food')
        if (!foodItem || foodItem.quantity <= 0) return

        set({
          hamsters: state.hamsters.map(h =>
            h.id === hamsterId
              ? { ...h, hunger: 100, lastFedAt: Date.now(), health: 'healthy' as HamsterHealth, expression: 'happy' as HamsterExpression }
              : h
          ),
          inventory: state.inventory
            .map(i => i.id === foodItemId ? { ...i, quantity: i.quantity - 1 } : i)
            .filter(i => i.quantity > 0),
        })
      },

      feedAll: () => {
        const state = get()
        const livingHamsters = state.hamsters.filter(h => h.health !== 'dead')
        if (livingHamsters.length === 0) return

        // Find total food available
        const foodItems = state.inventory.filter(i => i.type === 'food')
        let totalFood = foodItems.reduce((sum, i) => sum + i.quantity, 0)
        if (totalFood === 0) return

        // Feed hamsters, prioritizing hungriest first
        const sorted = [...livingHamsters].sort((a, b) => a.hunger - b.hunger)
        const fedIds = new Set<string>()

        for (const hamster of sorted) {
          if (totalFood <= 0) break
          fedIds.add(hamster.id)
          totalFood--
        }

        // Consume food items (use cheapest first)
        let toConsume = fedIds.size
        const newInventory = state.inventory.map(i => {
          if (i.type !== 'food' || toConsume <= 0) return i
          const consumed = Math.min(i.quantity, toConsume)
          toConsume -= consumed
          return { ...i, quantity: i.quantity - consumed }
        }).filter(i => i.quantity > 0)

        set({
          hamsters: state.hamsters.map(h =>
            fedIds.has(h.id)
              ? { ...h, hunger: 100, lastFedAt: Date.now(), health: 'healthy' as HamsterHealth, expression: 'happy' as HamsterExpression }
              : h
          ),
          inventory: newInventory,
        })
      },

      addHamster: (name, color) => {
        const state = get()
        if (state.hamsters.filter(h => h.health !== 'dead').length >= 8) return

        const newHamster: Hamster = {
          id: `hamster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          hunger: 100,
          happiness: 70,
          health: 'healthy',
          lastFedAt: Date.now(),
          accessories: [],
          expression: 'happy',
          color,
          createdAt: Date.now(),
        }

        set({ hamsters: [...state.hamsters, newHamster] })
      },

      killHamster: (hamsterId) => {
        set((s) => ({
          hamsters: s.hamsters.map(h =>
            h.id === hamsterId
              ? { ...h, hunger: 0, health: 'dead' as HamsterHealth, expression: 'dead' as HamsterExpression }
              : h
          ),
        }))
      },

      renameHamster: (hamsterId, name) => {
        set((s) => ({
          hamsters: s.hamsters.map(h =>
            h.id === hamsterId ? { ...h, name } : h
          ),
        }))
      },

      playWithToy: (hamsterId, toyId, happinessBoost) => {
        const state = get()
        const hamster = state.hamsters.find(h => h.id === hamsterId)
        if (!hamster || hamster.health === 'dead') return

        const toyItem = state.inventory.find(i => i.id === toyId && i.type === 'toy')
        if (!toyItem || toyItem.quantity <= 0) return

        set({
          hamsters: state.hamsters.map(h =>
            h.id === hamsterId
              ? { ...h, happiness: Math.min(100, h.happiness + happinessBoost), expression: 'excited' as HamsterExpression }
              : h
          ),
          inventory: state.inventory
            .map(i => i.id === toyId ? { ...i, quantity: i.quantity - 1 } : i)
            .filter(i => i.quantity > 0),
        })
      },

      equipAccessory: (hamsterId, accessoryId) => {
        const state = get()
        const invItem = state.inventory.find(i => i.id === accessoryId && i.type === 'accessory')
        if (!invItem || invItem.quantity <= 0) return

        set({
          hamsters: state.hamsters.map(h =>
            h.id === hamsterId && !h.accessories.includes(accessoryId)
              ? { ...h, accessories: [...h.accessories, accessoryId] }
              : h
          ),
          inventory: state.inventory
            .map(i => i.id === accessoryId ? { ...i, quantity: i.quantity - 1 } : i)
            .filter(i => i.quantity > 0),
        })
      },

      unequipAccessory: (hamsterId, accessoryId) => {
        const state = get()
        const hamster = state.hamsters.find(h => h.id === hamsterId)
        if (!hamster || !hamster.accessories.includes(accessoryId)) return

        const existing = state.inventory.find(i => i.id === accessoryId)
        const SHOP_ITEM_NAMES: Record<string, string> = { hat: 'Tiny Hat', crown: 'Crown', 'bow-tie': 'Bow Tie', sunglasses: 'Sunglasses', cape: 'Cape' }
        set({
          hamsters: state.hamsters.map(h =>
            h.id === hamsterId
              ? { ...h, accessories: h.accessories.filter(a => a !== accessoryId) }
              : h
          ),
          inventory: existing
            ? state.inventory.map(i => i.id === accessoryId ? { ...i, quantity: i.quantity + 1 } : i)
            : [...state.inventory, { id: accessoryId, type: 'accessory' as ItemType, name: SHOP_ITEM_NAMES[accessoryId] || accessoryId, quantity: 1 }],
        })
      },

      selectHamster: (id) => set({ selectedHamsterId: id }),

      // Inventory
      addInventoryItem: (item, quantity = 1) => {
        const state = get()
        const existing = state.inventory.find(i => i.id === item.id)
        if (existing) {
          set({
            inventory: state.inventory.map(i =>
              i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
            ),
          })
        } else {
          set({
            inventory: [...state.inventory, { ...item, quantity }],
          })
        }
      },

      removeInventoryItem: (itemId, quantity = 1) => {
        set((s) => ({
          inventory: s.inventory
            .map(i => i.id === itemId ? { ...i, quantity: i.quantity - quantity } : i)
            .filter(i => i.quantity > 0),
        }))
      },

      getItemQuantity: (itemId) => {
        const item = get().inventory.find(i => i.id === itemId)
        return item ? item.quantity : 0
      },

      // Timer
      tickHunger: () => {
        set((s) => {
          let changed = false
          const newHamsters = s.hamsters.map(h => {
            if (h.health === 'dead') return h

            const newHunger = Math.max(0, h.hunger - HUNGER_DRAIN_PER_SECOND)
            const { health, expression } = deriveHealthAndExpression(newHunger, h.happiness, h.health)

            if (newHunger !== h.hunger || health !== h.health) {
              changed = true
              return { ...h, hunger: newHunger, health, expression }
            }
            return h
          })

          if (!changed) return s
          return { ...s, hamsters: newHamsters, lastSavedAt: Date.now() }
        })
      },

      applyRetroactiveDrain: () => {
        const state = get()
        const elapsed = (Date.now() - state.lastSavedAt) / 1000 // seconds since last save

        if (elapsed < 1) return

        const drain = elapsed * HUNGER_DRAIN_PER_SECOND
        set({
          hamsters: state.hamsters.map(h => {
            if (h.health === 'dead') return h
            const newHunger = Math.max(0, h.hunger - drain)
            const { health, expression } = deriveHealthAndExpression(newHunger, h.happiness, h.health)
            return { ...h, hunger: newHunger, health, expression }
          }),
          lastSavedAt: Date.now(),
        })
      },

      // Scores
      updateHighScore: (gameId, score) => {
        const state = get()
        const current = state.highScores[gameId] || 0
        if (score > current) {
          set({ highScores: { ...state.highScores, [gameId]: score } })
        }
      },

      // Unlocking
      unlockGame: (gameId) => {
        const state = get()
        if (!state.unlockedGames.includes(gameId)) {
          set({ unlockedGames: [...state.unlockedGames, gameId] })
        }
      },

      // Room decoration
      setToyPosition: (toyId, left, top) => {
        set((s) => ({
          toyPositions: { ...s.toyPositions, [toyId]: { left, top } },
        }))
      },

      setFurniturePosition: (id, left, top) => {
        set((s) => ({
          furniturePositions: { ...s.furniturePositions, [id]: { left, top } },
        }))
      },

      setDecorationPosition: (id, left, top) => {
        set((s) => ({
          decorationPositions: { ...s.decorationPositions, [id]: { left, top } },
        }))
      },

      setHamsterPosition: (hamsterId, left, top) => {
        set((s) => ({
          hamsterPositions: { ...s.hamsterPositions, [hamsterId]: { left, top } },
        }))
      },
    }),
    {
      name: 'hamster-arcade-save',
      partialize: (state) => ({
        coins: state.coins,
        totalScore: state.totalScore,
        hamsters: state.hamsters,
        inventory: state.inventory,
        unlockedGames: state.unlockedGames,
        highScores: state.highScores,
        selectedHamsterId: state.selectedHamsterId,
        lastSavedAt: state.lastSavedAt,
        toyPositions: state.toyPositions,
        furniturePositions: state.furniturePositions,
        decorationPositions: state.decorationPositions,
        hamsterPositions: state.hamsterPositions,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.applyRetroactiveDrain()
          }
        }
      },
    }
  )
)
