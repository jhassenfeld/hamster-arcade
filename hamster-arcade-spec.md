# Hamster Arcade — Game Specification

## Overview

Hamster Arcade is a virtual pet game where you keep your hamster alive and happy by playing classic arcade mini-games. Earn coins from gameplay, spend them on food and accessories, and manage an ever-growing hamster family. If you forget to feed a hamster for 5 minutes, it gets sick and eventually dies.

The visual style is **soft pastel pink and light blue** throughout — cute, rounded, and retro.

---

## Tech Stack

- **React** (single-page app)
- **HTML Canvas** for arcade mini-games
- **CSS** for UI, animations, and layout (no external UI library)
- All in a single repository; mini-games are components rendered onto `<canvas>` elements

---

## Visual Design

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `--pink` | `#FFB6C1` | Primary UI, buttons, borders |
| `--pink-light` | `#FFE4E8` | Backgrounds, cards |
| `--pink-dark` | `#FF8FAA` | Hover states, accents |
| `--blue` | `#B0D4F1` | Secondary UI, alternating sections |
| `--blue-light` | `#DAE8F5` | Subtle backgrounds |
| `--blue-dark` | `#7EB8DA` | Interactive accents |
| `--cream` | `#FFF5F7` | Page background |
| `--text` | `#5A4060` | Body text (soft purple-gray) |
| `--danger` | `#FF6B8A` | Warnings, sick hamster indicators |
| `--gold` | `#FFD700` | Coins, rewards |

### Typography
- Display/headers: a rounded, playful font (e.g., `Fredoka One` or `Bubblegum Sans` from Google Fonts)
- Body: a clean rounded sans-serif (e.g., `Nunito`)

### General Style
- Rounded corners everywhere (12–20px)
- Soft drop shadows (`0 4px 12px rgba(0,0,0,0.08)`)
- Subtle pixel-art hamster sprites (can be CSS/SVG or emoji placeholder initially)
- Pastel gradient backgrounds on cards and panels
- Gentle CSS animations: bounce on feed, wiggle when hungry, fade to gray when sick

---

## Core Architecture

### Global State (React Context or Zustand)

```ts
interface GameState {
  coins: number;
  totalScore: number;
  hamsters: Hamster[];
  inventory: InventoryItem[];
  unlockedGames: string[]; // which arcade games are available
  currentScreen: "hub" | "arcade" | "shop" | "hamster-detail";
  currentGame: string | null;
  gameActive: boolean;
}

interface Hamster {
  id: string;
  name: string;
  hunger: number;        // 0–100, drains over time. 0 = dead
  happiness: number;     // 0–100, affected by toys/play
  health: "healthy" | "hungry" | "sick" | "dead";
  lastFedAt: number;     // timestamp
  accessories: string[]; // equipped accessory IDs
  expression: "happy" | "neutral" | "watching" | "excited" | "worried" | "sick" | "dead";
  color: string;         // hamster fur color
  createdAt: number;
}

interface InventoryItem {
  id: string;
  type: "food" | "toy" | "accessory" | "hamster-token";
  name: string;
  quantity: number;
}
```

### Timing System
- A global timer ticks every second and updates all hamster hunger values
- **Hunger drain rate:** each hamster loses ~1 hunger point every 3 seconds (reaches 0 from 100 in 5 minutes)
- At hunger ≤ 30: hamster status becomes `"hungry"`, expression becomes `"worried"`
- At hunger ≤ 10: hamster status becomes `"sick"`, expression becomes `"sick"`, hamster visually wilts
- At hunger = 0: hamster dies. Status becomes `"dead"`. This is permanent.
- Feeding resets hunger to 100 and costs 1 food item from inventory

---

## Screens

### 1. Hub Screen (Main View)

The default screen. Shows:

- **Hamster Habitat** (top 60% of screen): A pastel-colored enclosure showing all living hamsters wandering around. Each hamster displays its name and a small hunger bar above it. Hamsters with accessories show them visually. Clicking a hamster opens its detail view.
- **Bottom Action Bar**: Buttons for "Play Arcade", "Shop", "Feed All" (if you have food)
- **Coin Counter**: Always visible in the top-right corner with a gold coin icon
- **Alert Banner**: Flashes pink-red when any hamster is hungry or sick, with the hamster's name

### 2. Arcade Screen

A grid of available arcade games displayed as pastel game cartridge cards. Each card shows:
- Game name and pixel-art icon
- High score
- Coin reward rate

**While playing any arcade game:**
- The hamster habitat is visible as a small panel in the corner (roughly 150×100px)
- Hamsters react to gameplay in real-time (see Hamster Reactions below)
- Hunger timers continue running — you must pause/quit to feed
- A small "Feed" shortcut button is accessible during gameplay
- Score/coins earned display at game over

### 3. Shop Screen

A scrollable catalog of purchasable items, organized in tabs:

| Tab | Items | Price Range |
|---|---|---|
| Food | Pellets, Carrots, Sunflower Seeds, Cheese | 5–20 coins |
| Toys | Wheel, Ball, Tunnel, Swing | 30–100 coins |
| Accessories | Tiny Hat, Bow Tie, Sunglasses, Cape, Crown | 50–200 coins |
| Hamsters | "Adopt New Hamster" token | 500 coins (escalating: 500, 1000, 2000...) |

Buying food adds it to inventory. Buying a toy increases all hamsters' happiness passively. Buying an accessory lets you equip it on a specific hamster. Buying a hamster token adds a new hamster to the habitat.

### 4. Hamster Detail Screen

Full-screen view of one hamster showing:
- Large hamster sprite with equipped accessories
- Name (editable)
- Stats: hunger bar, happiness bar, health status
- Accessory slots (head, body, face) — tap to equip from inventory
- Feed button
- Activity log ("Luna ate a carrot", "Luna is watching you play Asteroids")

---

## Arcade Mini-Games

All games render on an HTML `<canvas>` element. Controls are keyboard (arrow keys + space) with optional on-screen touch buttons for mobile.

Each game awards coins based on score: `coins = Math.floor(score / 10)`.

### Game 1: Asteroids

- Classic vector-style asteroids but drawn with pastel pink/blue outlines on a dark navy background
- Player ship is a small rocket with a hamster silhouette in the cockpit
- Asteroids break into smaller pieces when shot
- Controls: Arrow keys to rotate/thrust, Space to shoot
- Scoring: 20 pts for large asteroid, 50 for medium, 100 for small

### Game 2: Pac-Man

- Classic maze gameplay but the maze walls are pastel blue, dots are pink, and the background is cream
- Pac-Man is replaced by a hamster face that opens and closes its mouth
- Ghosts are replaced by cats (4 colors of pastel cats)
- Power pellets are sunflower seeds — eating one lets you chase the cats
- Controls: Arrow keys
- Scoring: 10 pts per dot, 50 per power pellet, 200/400/800/1600 for cats

### Game 3: Space Invaders

- Rows of descending enemies are cartoon cats/dogs
- Player ship is a hamster in a tiny UFO
- Barriers/shields are made of cheese blocks that degrade when hit
- Pastel color scheme: enemies in pinks/blues, projectiles are seeds
- Controls: Left/Right arrows to move, Space to shoot
- Scoring: 10/20/30 pts per enemy row, 100 for bonus UFO

### Game 4: Breakout (Bonus — since Pac-Man was listed twice)

- Paddle is a hamster running back and forth
- Bricks are colorful pastel blocks in pink/blue gradient rows
- Ball is a sunflower seed
- Power-ups drop from broken bricks: multi-ball, wide paddle, slow ball
- Controls: Left/Right arrows (or mouse)
- Scoring: 10 pts per brick, bonus for clearing a row

---

## Hamster Reactions System

While the player is in an arcade game, each hamster has a small animated sprite visible in the corner panel. Hamsters react to gameplay events:

| Game Event | Hamster Reaction |
|---|---|
| Player scores points | Jumps up excitedly, sparkle eyes |
| Player loses a life | Covers eyes with paws, worried face |
| Player gets power-up | Cheers, waves tiny paws |
| Player dies / game over | Sad face, ears droop |
| High score beaten | Party animation, confetti around hamster |
| Idle (no action for 5s) | Falls asleep, tiny Z's float up |
| Hamster getting hungry | Tugs on screen edge, looks at player pleadingly |

Reactions are displayed as expression changes + small speech bubbles or emojis above the hamster sprite.

---

## Multiple Hamster Mechanics

- Start with 1 hamster (free, named "Nibbles" by default)
- Additional hamsters cost escalating coins: 500, 1000, 2000, 4000...
- Each hamster has independent hunger/happiness timers
- More hamsters = more food consumption = harder to keep everyone alive
- If a hamster dies, it's gone permanently (grave marker appears in habitat)
- Maximum of 8 hamsters

### Difficulty Scaling
| Hamster Count | Food Cost/Min | Effective Difficulty |
|---|---|---|
| 1 | ~1 food / 5 min | Easy — play freely |
| 2–3 | ~2-3 food / 5 min | Moderate — need steady coin income |
| 4–5 | ~4-5 food / 5 min | Hard — must play efficiently |
| 6–8 | ~6-8 food / 5 min | Frantic — constant juggling |

---

## Notifications & Alerts

- At 3 minutes without food: soft chime + hamster name badge pulses yellow
- At 4 minutes: urgent chime + badge turns red + hamster visually distressed
- At 4:30: screen border flashes pink-red briefly even during gameplay
- At 5 minutes: death. Brief sad animation. Notification: "[Name] has passed away..."
- Optional browser notifications if the tab is not focused (request permission)

---

## Persistence

- Save all game state to `localStorage` on every significant action
- On load, calculate elapsed time and apply hunger drain retroactively
  - If enough time passed while away, hamsters may be dead on return
- Save high scores per game

---

## File Structure

```
src/
├── App.tsx
├── main.tsx
├── index.css                    # Global styles, CSS variables, fonts
├── state/
│   └── gameStore.ts             # Global state (Zustand or Context)
├── components/
│   ├── HubScreen.tsx            # Main habitat view
│   ├── ArcadeScreen.tsx         # Game selection grid
│   ├── ShopScreen.tsx           # Store UI
│   ├── HamsterDetail.tsx        # Individual hamster view
│   ├── HamsterSprite.tsx        # Animated hamster component
│   ├── HamsterHabitat.tsx       # Multi-hamster enclosure display
│   ├── MiniHabitatOverlay.tsx   # Small habitat shown during games
│   ├── CoinCounter.tsx          # Persistent coin display
│   ├── HungerBar.tsx            # Visual hunger indicator
│   ├── AlertBanner.tsx          # Warning notifications
│   └── ActionBar.tsx            # Bottom navigation
├── games/
│   ├── GameWrapper.tsx          # Canvas container + score/coin overlay
│   ├── Asteroids.ts             # Asteroids game logic
│   ├── PacMan.ts                # Pac-Man game logic
│   ├── SpaceInvaders.ts         # Space Invaders game logic
│   └── Breakout.ts              # Breakout game logic
├── data/
│   └── shopItems.ts             # Item catalog with prices/descriptions
└── utils/
    ├── timer.ts                 # Hunger tick system
    ├── persistence.ts           # localStorage save/load
    └── hamsterReactions.ts      # Reaction event mapping
```

---

## MVP Priorities (Build Order)

1. **Global state + timer system** — hamster hunger ticking, feeding, death
2. **Hub screen with single hamster** — sprite, hunger bar, feed button
3. **One arcade game (Asteroids)** — playable on canvas, awards coins
4. **Shop (food only)** — buy food with coins, feed hamster
5. **Mini habitat overlay during games** — hamster reactions
6. **Remaining arcade games** — Pac-Man, Space Invaders, Breakout
7. **Full shop** — toys, accessories, new hamsters
8. **Multiple hamster support** — independent timers, escalating difficulty
9. **Hamster detail screen** — accessory equipping, name editing
10. **Polish** — animations, sound effects, mobile touch controls

---

## Optional Enhancements (Post-MVP)

- Sound effects: retro 8-bit bleeps + cute hamster squeaks
- Background music: lo-fi chiptune that shifts per screen
- Hamster personality traits that affect reactions
- Achievements/badges ("Fed Nibbles 100 times", "Scored 10,000 in Asteroids")
- Hamster graveyard memorial screen
- Daily login bonus coins
- Hamster aging system (baby → adult → elder with different sprites)
