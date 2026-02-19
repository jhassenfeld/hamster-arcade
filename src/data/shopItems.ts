import { type ItemType } from '../state/gameStore'

export interface ShopItem {
  id: string
  name: string
  type: ItemType
  price: number
  description: string
  icon: string
  imageSrc?: string
  effect?: string
}

export const SHOP_ITEMS: ShopItem[] = [
  // Food (emoji)
  { id: 'pellets', name: 'Pellets', type: 'food', price: 5, description: 'Basic hamster food', icon: '🥜', effect: 'Restores hunger to 100' },
  { id: 'carrots', name: 'Carrots', type: 'food', price: 8, description: 'Fresh and crunchy', icon: '🥕', effect: 'Restores hunger to 100' },
  { id: 'sunflower-seeds', name: 'Sunflower Seeds', type: 'food', price: 12, description: 'A hamster favorite', icon: '🌻', effect: 'Restores hunger to 100' },
  { id: 'cheese', name: 'Cheese', type: 'food', price: 20, description: 'Gourmet treat', icon: '🧀', effect: 'Restores hunger to 100' },

  // Toys (PNG — room items that boost happiness)
  { id: 'wheel', name: 'Exercise Wheel', type: 'toy', price: 30, description: 'Spin all day!', icon: '🎡', imageSrc: '/items/accessories/wheel.png', effect: '+10 happiness' },
  { id: 'swing', name: 'Swing', type: 'toy', price: 40, description: 'Swinging fun!', icon: '🎠', imageSrc: '/items/accessories/swing.png', effect: '+15 happiness' },
  { id: 'tv', name: 'TV', type: 'toy', price: 60, description: 'Hamster entertainment', icon: '📺', imageSrc: '/items/accessories/tv.png', effect: '+20 happiness' },
  { id: 'fishtank', name: 'Fish Tank', type: 'toy', price: 80, description: 'Relaxing to watch', icon: '🐟', imageSrc: '/items/accessories/fishtank.png', effect: '+25 happiness' },
  { id: 'climbing-wall', name: 'Climbing Wall', type: 'toy', price: 100, description: 'Adventure awaits!', icon: '🧗', imageSrc: '/items/accessories/climbing-wall.png', effect: '+30 happiness' },
  { id: 'tubes', name: 'Tube System', type: 'toy', price: 120, description: 'Explore and hide', icon: '🕳️', imageSrc: '/items/accessories/tubes.png', effect: '+35 happiness' },

  // Wearable Accessories (emoji — equippable on hamsters)
  { id: 'hat', name: 'Tiny Hat', type: 'accessory', price: 50, description: 'A dapper look', icon: '🎩' },
  { id: 'bow-tie', name: 'Bow Tie', type: 'accessory', price: 75, description: 'Fancy!', icon: '🎀' },
  { id: 'sunglasses', name: 'Sunglasses', type: 'accessory', price: 100, description: 'Too cool', icon: '🕶️' },
  { id: 'cape', name: 'Cape', type: 'accessory', price: 150, description: 'Super hamster!', icon: '🦸' },
  { id: 'crown', name: 'Crown', type: 'accessory', price: 200, description: 'Royalty', icon: '👑' },

  // Furniture (PNG — room decorations)
  { id: 'lamp', name: 'Lamp', type: 'furniture', price: 25, description: 'Cozy lighting', icon: '💡', imageSrc: '/items/furniture/hamster-lamp.png' },
  { id: 'wall-lamp', name: 'Wall Lamp', type: 'furniture', price: 30, description: 'Ambient glow', icon: '🔦', imageSrc: '/items/furniture/wall-lamp.png' },
  { id: 'small-shelf', name: 'Small Shelf', type: 'furniture', price: 25, description: 'Tiny storage', icon: '📦', imageSrc: '/items/furniture/small-shelf.png' },
  { id: 'rug', name: 'Rug', type: 'furniture', price: 35, description: 'Soft and warm', icon: '🟫', imageSrc: '/items/furniture/hamster-rug.png' },
  { id: 'chair', name: 'Chair', type: 'furniture', price: 40, description: 'Take a seat', icon: '🪑', imageSrc: '/items/furniture/hamster-chair.png' },
  { id: 'table', name: 'Table', type: 'furniture', price: 50, description: 'A tiny surface', icon: '🪵', imageSrc: '/items/furniture/hamster-table.png' },
  { id: 'armchair', name: 'Armchair', type: 'furniture', price: 60, description: 'Extra comfy', icon: '🛋️', imageSrc: '/items/furniture/hamster-armchair.png' },
  { id: 'bookshelf', name: 'Bookshelf', type: 'furniture', price: 70, description: 'Full of stories', icon: '📚', imageSrc: '/items/furniture/bookshelf.png' },
  { id: 'bed', name: 'Bed', type: 'furniture', price: 75, description: 'Naptime!', icon: '🛏️', imageSrc: '/items/furniture/bed.png' },
  { id: 'couch', name: 'Couch', type: 'furniture', price: 80, description: 'Lounge in style', icon: '🛋️', imageSrc: '/items/furniture/hamster-couch.png' },
  { id: 'stove', name: 'Stove', type: 'furniture', price: 90, description: 'Tiny kitchen', icon: '🍳', imageSrc: '/items/furniture/stove.png' },
  { id: 'comfy-bed', name: 'Comfy Bed', type: 'furniture', price: 100, description: 'Luxurious sleep', icon: '😴', imageSrc: '/items/furniture/comfy-bed.png' },

  // Decorations (PNG — wall/room decor)
  { id: 'family-pic', name: 'Family Photo', type: 'decoration', price: 15, description: 'Cherished memories', icon: '🖼️', imageSrc: '/items/decorations/family-pic.png' },
  { id: 'clock', name: 'Clock', type: 'decoration', price: 20, description: 'Tick tock!', icon: '🕐', imageSrc: '/items/decorations/clock.png' },
  { id: 'plant', name: 'Plant', type: 'decoration', price: 25, description: 'A touch of green', icon: '🪴', imageSrc: '/items/decorations/plant.png' },
  { id: 'fairy-lights', name: 'Fairy Lights', type: 'decoration', price: 30, description: 'Magical sparkle', icon: '✨', imageSrc: '/items/decorations/fairy-lights.png' },
  { id: 'space', name: 'Space Poster', type: 'decoration', price: 40, description: 'To the stars!', icon: '🚀', imageSrc: '/items/decorations/space.png' },
  { id: 'taylor-swift', name: 'Taylor Swift Poster', type: 'decoration', price: 50, description: 'Shake it off!', icon: '🎤', imageSrc: '/items/decorations/taylor-swift.png' },
]

const TOY_HAPPINESS: Record<string, number> = {
  wheel: 10,
  swing: 15,
  tv: 20,
  fishtank: 25,
  'climbing-wall': 30,
  tubes: 35,
}

export function getToyHappiness(toyId: string): number {
  return TOY_HAPPINESS[toyId] || 0
}

export function getHamsterTokenPrice(currentCount: number): number {
  return 500 * Math.pow(2, Math.max(0, currentCount - 1))
}
