import { type ItemType } from '../state/gameStore'

export interface ShopItem {
  id: string
  name: string
  type: ItemType
  price: number
  description: string
  icon: string
  effect?: string
}

export const SHOP_ITEMS: ShopItem[] = [
  // Food
  { id: 'pellets', name: 'Pellets', type: 'food', price: 5, description: 'Basic hamster food', icon: '🥜', effect: 'Restores hunger to 100' },
  { id: 'carrots', name: 'Carrots', type: 'food', price: 8, description: 'Fresh and crunchy', icon: '🥕', effect: 'Restores hunger to 100' },
  { id: 'sunflower-seeds', name: 'Sunflower Seeds', type: 'food', price: 12, description: 'A hamster favorite', icon: '🌻', effect: 'Restores hunger to 100' },
  { id: 'cheese', name: 'Cheese', type: 'food', price: 20, description: 'Gourmet treat', icon: '🧀', effect: 'Restores hunger to 100' },

  // Toys
  { id: 'wheel', name: 'Exercise Wheel', type: 'toy', price: 30, description: 'Spin all day!', icon: '🎡', effect: '+10 happiness' },
  { id: 'ball', name: 'Hamster Ball', type: 'toy', price: 50, description: 'Roll around freely', icon: '⚽', effect: '+15 happiness' },
  { id: 'tunnel', name: 'Tunnel System', type: 'toy', price: 75, description: 'Explore and hide', icon: '🕳️', effect: '+20 happiness' },
  { id: 'swing', name: 'Tiny Swing', type: 'toy', price: 100, description: 'Wheee!', icon: '🎠', effect: '+25 happiness' },

  // Accessories
  { id: 'hat', name: 'Tiny Hat', type: 'accessory', price: 50, description: 'A dapper look', icon: '🎩' },
  { id: 'bow-tie', name: 'Bow Tie', type: 'accessory', price: 75, description: 'Fancy!', icon: '🎀' },
  { id: 'sunglasses', name: 'Sunglasses', type: 'accessory', price: 100, description: 'Too cool', icon: '🕶️' },
  { id: 'cape', name: 'Cape', type: 'accessory', price: 150, description: 'Super hamster!', icon: '🦸' },
  { id: 'crown', name: 'Crown', type: 'accessory', price: 200, description: 'Royalty', icon: '👑' },
]

const TOY_HAPPINESS: Record<string, number> = {
  wheel: 10,
  ball: 15,
  tunnel: 20,
  swing: 25,
}

export function getToyHappiness(toyId: string): number {
  return TOY_HAPPINESS[toyId] || 0
}

export function getHamsterTokenPrice(currentCount: number): number {
  return 500 * Math.pow(2, Math.max(0, currentCount - 1))
}
