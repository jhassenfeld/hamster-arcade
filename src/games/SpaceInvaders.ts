import { type GameEngine, type GameCallbacks } from './types'

const CANVAS_W = 480
const CANVAS_H = 640

const ENEMY_COLS = 11
const ENEMY_ROWS = 5
const ENEMY_SPACING_X = 38
const ENEMY_SPACING_Y = 38
const ENEMY_RADIUS = 12
const ENEMY_START_X = 40
const ENEMY_START_Y = 80

const PLAYER_Y = CANVAS_H - 50
const PLAYER_WIDTH = 36
const PLAYER_HEIGHT = 20
const PLAYER_SPEED = 4

const BULLET_SPEED = 6
const ENEMY_BULLET_SPEED = 3

const SHIELD_BLOCK_W = 12
const SHIELD_BLOCK_H = 10
const SHIELD_COLS = 4
const SHIELD_ROWS = 3

const INVINCIBLE_FRAMES = 90
const BONUS_INTERVAL = 600 // frames between bonus UFO spawns

interface Enemy {
  x: number
  y: number
  row: number
  alive: boolean
}

interface PlayerBullet {
  x: number
  y: number
}

interface EnemyBullet {
  x: number
  y: number
}

interface ShieldBlock {
  x: number
  y: number
  alive: boolean
}

interface BonusUFO {
  x: number
  y: number
  dir: number
  active: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

function getEnemyColor(row: number): string {
  if (row === 0) return '#FFB6C1'    // top row: small cats (pink)
  if (row <= 2) return '#B0D4F1'     // middle rows: medium dogs (blue)
  return '#FFE4E8'                    // bottom rows: large cats (light pink)
}

function getEnemyScore(row: number): number {
  if (row === 0) return 30
  if (row <= 2) return 20
  return 10
}

// Deterministic star positions
const STARS: Array<{ x: number; y: number; brightness: number }> = []
for (let i = 0; i < 80; i++) {
  STARS.push({
    x: (i * 7919 + 1) % CANVAS_W,
    y: (i * 6271 + 3) % CANVAS_H,
    brightness: 0.15 + ((i * 3571) % 100) / 200,
  })
}

export function createSpaceInvadersEngine(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks
): GameEngine {
  let animId = 0
  let running = false
  let paused = false
  let gameOver = false
  let score = 0
  let lives = 3
  let level = 1

  let playerX = CANVAS_W / 2
  let playerInvincible = 0

  let playerBullet: PlayerBullet | null = null
  let enemyBullets: EnemyBullet[] = []
  let enemies: Enemy[] = []
  let shields: ShieldBlock[][] = []
  let particles: Particle[] = []

  let enemyDirX = 1 // 1 = right, -1 = left
  let enemySpeed = 1
  let enemyMoveTimer = 0
  let enemyMoveInterval = 30 // frames between enemy steps
  let enemyDropping = false

  let bonusUFO: BonusUFO = { x: 0, y: 0, dir: 1, active: false }
  let bonusTimer = 0

  const keys = new Set<string>()

  function initEnemies() {
    enemies = []
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        enemies.push({
          x: ENEMY_START_X + col * ENEMY_SPACING_X,
          y: ENEMY_START_Y + row * ENEMY_SPACING_Y,
          row,
          alive: true,
        })
      }
    }
  }

  function initShields() {
    shields = []
    const shieldY = CANVAS_H - 140
    const totalWidth = 4 * (SHIELD_COLS * SHIELD_BLOCK_W) + 3 * 50
    const startX = (CANVAS_W - totalWidth) / 2

    for (let s = 0; s < 4; s++) {
      const blocks: ShieldBlock[] = []
      const sx = startX + s * (SHIELD_COLS * SHIELD_BLOCK_W + 50)
      for (let r = 0; r < SHIELD_ROWS; r++) {
        for (let c = 0; c < SHIELD_COLS; c++) {
          blocks.push({
            x: sx + c * SHIELD_BLOCK_W,
            y: shieldY + r * SHIELD_BLOCK_H,
            alive: true,
          })
        }
      }
      shields.push(blocks)
    }
  }

  function spawnParticles(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15 + Math.random() * 15,
        color,
      })
    }
  }

  function aliveEnemies(): Enemy[] {
    return enemies.filter(e => e.alive)
  }

  function recalcEnemySpeed() {
    const alive = aliveEnemies().length
    const total = ENEMY_ROWS * ENEMY_COLS
    if (alive === 0) return
    // Speed ramps as enemies are destroyed
    const ratio = alive / total
    if (ratio > 0.7) enemyMoveInterval = Math.max(8, 30 - (level - 1) * 3)
    else if (ratio > 0.4) enemyMoveInterval = Math.max(5, 18 - (level - 1) * 2)
    else if (ratio > 0.2) enemyMoveInterval = Math.max(3, 10 - (level - 1))
    else enemyMoveInterval = Math.max(2, 5 - Math.floor((level - 1) / 2))
  }

  function updateEnemies() {
    enemyMoveTimer++
    if (enemyMoveTimer < enemyMoveInterval) return

    enemyMoveTimer = 0
    const alive = aliveEnemies()
    if (alive.length === 0) return

    if (enemyDropping) {
      // Drop all enemies one step
      for (const e of alive) {
        e.y += ENEMY_SPACING_Y / 2
      }
      // Check if any enemy reached the bottom (player row)
      for (const e of alive) {
        if (e.y >= PLAYER_Y - 10) {
          gameOver = true
          callbacks.onGameOver(score)
          if (score > 0) callbacks.onHighScore(score)
          return
        }
      }
      enemyDirX = -enemyDirX
      enemyDropping = false
      return
    }

    // Move horizontally
    let needDrop = false
    for (const e of alive) {
      e.x += enemySpeed * enemyDirX * 8
    }

    // Check edges
    for (const e of alive) {
      if (e.x >= CANVAS_W - 20 || e.x <= 20) {
        needDrop = true
        break
      }
    }

    if (needDrop) {
      // Undo horizontal move
      for (const e of alive) {
        e.x -= enemySpeed * enemyDirX * 8
      }
      enemyDropping = true
    }
  }

  function enemyFire() {
    const alive = aliveEnemies()
    if (alive.length === 0) return

    // Higher chance with fewer enemies, scaled by level
    const baseChance = 0.005 + (1 - alive.length / (ENEMY_ROWS * ENEMY_COLS)) * 0.015
    const chance = baseChance + level * 0.002

    if (Math.random() < chance) {
      // Pick random alive enemy from the bottom-most row of each column
      const columns = new Map<number, Enemy>()
      for (const e of alive) {
        const col = Math.round((e.x - ENEMY_START_X) / ENEMY_SPACING_X)
        const existing = columns.get(col)
        if (!existing || e.y > existing.y) {
          columns.set(col, e)
        }
      }
      const bottomEnemies = Array.from(columns.values())
      const shooter = bottomEnemies[Math.floor(Math.random() * bottomEnemies.length)]
      enemyBullets.push({ x: shooter.x, y: shooter.y + ENEMY_RADIUS })
    }
  }

  function updateBonusUFO() {
    bonusTimer++
    if (!bonusUFO.active && bonusTimer >= BONUS_INTERVAL) {
      bonusTimer = 0
      bonusUFO.active = true
      bonusUFO.dir = Math.random() < 0.5 ? 1 : -1
      bonusUFO.x = bonusUFO.dir === 1 ? -30 : CANVAS_W + 30
      bonusUFO.y = 35
    }
    if (bonusUFO.active) {
      bonusUFO.x += bonusUFO.dir * 2.5
      if (bonusUFO.x < -40 || bonusUFO.x > CANVAS_W + 40) {
        bonusUFO.active = false
      }
    }
  }

  function checkCollisions() {
    // Player bullet vs enemies
    if (playerBullet) {
      for (const e of enemies) {
        if (!e.alive) continue
        const dx = playerBullet.x - e.x
        const dy = playerBullet.y - e.y
        if (Math.abs(dx) < ENEMY_RADIUS && Math.abs(dy) < ENEMY_RADIUS) {
          e.alive = false
          const pts = getEnemyScore(e.row)
          score += pts
          callbacks.onScore(pts)
          spawnParticles(e.x, e.y, 6, getEnemyColor(e.row))
          playerBullet = null
          recalcEnemySpeed()
          break
        }
      }
    }

    // Player bullet vs bonus UFO
    if (playerBullet && bonusUFO.active) {
      const dx = playerBullet.x - bonusUFO.x
      const dy = playerBullet.y - bonusUFO.y
      if (Math.abs(dx) < 18 && Math.abs(dy) < 10) {
        bonusUFO.active = false
        score += 100
        callbacks.onScore(100)
        spawnParticles(bonusUFO.x, bonusUFO.y, 8, '#FF69B4')
        playerBullet = null
      }
    }

    // Player bullet vs shields
    if (playerBullet) {
      for (const shieldGroup of shields) {
        for (const block of shieldGroup) {
          if (!block.alive) continue
          if (
            playerBullet.x >= block.x &&
            playerBullet.x <= block.x + SHIELD_BLOCK_W &&
            playerBullet.y >= block.y &&
            playerBullet.y <= block.y + SHIELD_BLOCK_H
          ) {
            block.alive = false
            playerBullet = null
            break
          }
        }
        if (!playerBullet) break
      }
    }

    // Enemy bullets vs shields
    const bulletsToRemove = new Set<EnemyBullet>()
    for (const b of enemyBullets) {
      for (const shieldGroup of shields) {
        for (const block of shieldGroup) {
          if (!block.alive) continue
          if (
            b.x >= block.x &&
            b.x <= block.x + SHIELD_BLOCK_W &&
            b.y >= block.y &&
            b.y <= block.y + SHIELD_BLOCK_H
          ) {
            block.alive = false
            bulletsToRemove.add(b)
            break
          }
        }
        if (bulletsToRemove.has(b)) break
      }
    }

    // Enemy bullets vs player
    if (playerInvincible <= 0) {
      for (const b of enemyBullets) {
        if (bulletsToRemove.has(b)) continue
        const dx = b.x - playerX
        const dy = b.y - PLAYER_Y
        if (Math.abs(dx) < PLAYER_WIDTH / 2 && Math.abs(dy) < PLAYER_HEIGHT / 2) {
          bulletsToRemove.add(b)
          lives--
          callbacks.onLifeLost()
          spawnParticles(playerX, PLAYER_Y, 8, '#F4A460')
          playerInvincible = INVINCIBLE_FRAMES

          if (lives <= 0) {
            gameOver = true
            callbacks.onGameOver(score)
            if (score > 0) callbacks.onHighScore(score)
            return
          }
        }
      }
    }

    enemyBullets = enemyBullets.filter(b => !bulletsToRemove.has(b))

    // Enemies vs shields (enemies destroy shield blocks they touch)
    for (const e of enemies) {
      if (!e.alive) continue
      for (const shieldGroup of shields) {
        for (const block of shieldGroup) {
          if (!block.alive) continue
          if (
            Math.abs(e.x - (block.x + SHIELD_BLOCK_W / 2)) < ENEMY_RADIUS + SHIELD_BLOCK_W / 2 &&
            Math.abs(e.y - (block.y + SHIELD_BLOCK_H / 2)) < ENEMY_RADIUS + SHIELD_BLOCK_H / 2
          ) {
            block.alive = false
          }
        }
      }
    }
  }

  function update() {
    // Player input
    if (keys.has('ArrowLeft') || keys.has('left')) {
      playerX = Math.max(PLAYER_WIDTH / 2, playerX - PLAYER_SPEED)
    }
    if (keys.has('ArrowRight') || keys.has('right')) {
      playerX = Math.min(CANVAS_W - PLAYER_WIDTH / 2, playerX + PLAYER_SPEED)
    }
    if ((keys.has(' ') || keys.has('action')) && !playerBullet) {
      playerBullet = { x: playerX, y: PLAYER_Y - PLAYER_HEIGHT / 2 }
    }

    if (playerInvincible > 0) playerInvincible--

    // Update player bullet
    if (playerBullet) {
      playerBullet.y -= BULLET_SPEED
      if (playerBullet.y < 0) playerBullet = null
    }

    // Update enemy bullets
    enemyBullets = enemyBullets.filter(b => {
      b.y += ENEMY_BULLET_SPEED
      return b.y < CANVAS_H
    })

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.life--
      return p.life > 0
    })

    updateEnemies()
    enemyFire()
    updateBonusUFO()
    checkCollisions()

    // Check wave complete
    if (aliveEnemies().length === 0 && !gameOver) {
      level++
      enemyBullets = []
      playerBullet = null
      initEnemies()
      recalcEnemySpeed()
      enemyDirX = 1
      enemyMoveTimer = 0
      enemyDropping = false
      bonusUFO.active = false
      bonusTimer = 0
    }
  }

  function drawEnemy(e: Enemy) {
    const color = getEnemyColor(e.row)
    ctx.fillStyle = color

    if (e.row === 0) {
      // Small cat: circle with pointy ears
      ctx.beginPath()
      ctx.arc(e.x, e.y, 8, 0, Math.PI * 2)
      ctx.fill()
      // Ears
      ctx.beginPath()
      ctx.moveTo(e.x - 7, e.y - 5)
      ctx.lineTo(e.x - 4, e.y - 12)
      ctx.lineTo(e.x - 1, e.y - 5)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(e.x + 1, e.y - 5)
      ctx.lineTo(e.x + 4, e.y - 12)
      ctx.lineTo(e.x + 7, e.y - 5)
      ctx.fill()
      // Eyes
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc(e.x - 3, e.y - 1, 1.5, 0, Math.PI * 2)
      ctx.arc(e.x + 3, e.y - 1, 1.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (e.row <= 2) {
      // Medium dog: slightly larger circle with floppy ears
      ctx.beginPath()
      ctx.arc(e.x, e.y, 9, 0, Math.PI * 2)
      ctx.fill()
      // Floppy ears
      ctx.beginPath()
      ctx.ellipse(e.x - 10, e.y, 4, 7, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(e.x + 10, e.y, 4, 7, 0.3, 0, Math.PI * 2)
      ctx.fill()
      // Eyes
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc(e.x - 3, e.y - 2, 1.5, 0, Math.PI * 2)
      ctx.arc(e.x + 3, e.y - 2, 1.5, 0, Math.PI * 2)
      ctx.fill()
      // Nose
      ctx.beginPath()
      ctx.arc(e.x, e.y + 2, 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Large cat: bigger circle with rounded ears
      ctx.beginPath()
      ctx.arc(e.x, e.y, 11, 0, Math.PI * 2)
      ctx.fill()
      // Rounded ears
      ctx.beginPath()
      ctx.arc(e.x - 8, e.y - 10, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(e.x + 8, e.y - 10, 5, 0, Math.PI * 2)
      ctx.fill()
      // Inner ears
      ctx.fillStyle = '#FFB6C1'
      ctx.beginPath()
      ctx.arc(e.x - 8, e.y - 10, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(e.x + 8, e.y - 10, 3, 0, Math.PI * 2)
      ctx.fill()
      // Eyes
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc(e.x - 4, e.y - 2, 2, 0, Math.PI * 2)
      ctx.arc(e.x + 4, e.y - 2, 2, 0, Math.PI * 2)
      ctx.fill()
      // Whiskers
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(e.x - 5, e.y + 2)
      ctx.lineTo(e.x - 14, e.y)
      ctx.moveTo(e.x - 5, e.y + 3)
      ctx.lineTo(e.x - 14, e.y + 4)
      ctx.moveTo(e.x + 5, e.y + 2)
      ctx.lineTo(e.x + 14, e.y)
      ctx.moveTo(e.x + 5, e.y + 3)
      ctx.lineTo(e.x + 14, e.y + 4)
      ctx.stroke()
    }
  }

  function drawPlayer() {
    if (playerInvincible > 0 && Math.floor(playerInvincible / 6) % 2 === 0) {
      return // blink
    }

    const px = playerX
    const py = PLAYER_Y

    // UFO body (oval)
    ctx.fillStyle = '#F4A460'
    ctx.beginPath()
    ctx.ellipse(px, py, PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#D2691E'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Dome (glass)
    ctx.fillStyle = 'rgba(173, 216, 230, 0.5)'
    ctx.beginPath()
    ctx.ellipse(px, py - 8, 14, 10, 0, Math.PI, 0)
    ctx.fill()
    ctx.strokeStyle = 'rgba(100, 180, 220, 0.7)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Hamster face inside dome
    ctx.fillStyle = '#F4A460'
    ctx.beginPath()
    ctx.arc(px, py - 8, 6, 0, Math.PI * 2)
    ctx.fill()
    // Ears
    ctx.beginPath()
    ctx.arc(px - 5, py - 14, 3, 0, Math.PI * 2)
    ctx.arc(px + 5, py - 14, 3, 0, Math.PI * 2)
    ctx.fill()
    // Inner ears
    ctx.fillStyle = '#FFB6C1'
    ctx.beginPath()
    ctx.arc(px - 5, py - 14, 1.5, 0, Math.PI * 2)
    ctx.arc(px + 5, py - 14, 1.5, 0, Math.PI * 2)
    ctx.fill()
    // Eyes
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(px - 2.5, py - 9, 1.2, 0, Math.PI * 2)
    ctx.arc(px + 2.5, py - 9, 1.2, 0, Math.PI * 2)
    ctx.fill()
    // Nose
    ctx.fillStyle = '#FF9999'
    ctx.beginPath()
    ctx.arc(px, py - 7, 1, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawShields() {
    ctx.fillStyle = '#FFD700'
    for (const shieldGroup of shields) {
      for (const block of shieldGroup) {
        if (!block.alive) continue
        // Cheese block with holes
        ctx.fillStyle = '#FFD700'
        ctx.fillRect(block.x, block.y, SHIELD_BLOCK_W, SHIELD_BLOCK_H)
        // Cheese hole
        ctx.fillStyle = '#E6BE00'
        ctx.beginPath()
        ctx.arc(
          block.x + SHIELD_BLOCK_W * 0.6,
          block.y + SHIELD_BLOCK_H * 0.4,
          2, 0, Math.PI * 2
        )
        ctx.fill()
      }
    }
  }

  function drawBonusUFO() {
    if (!bonusUFO.active) return
    const bx = bonusUFO.x
    const by = bonusUFO.y

    // Saucer body
    ctx.fillStyle = '#FF69B4'
    ctx.beginPath()
    ctx.ellipse(bx, by, 16, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    // Dome
    ctx.fillStyle = '#FFB6C1'
    ctx.beginPath()
    ctx.ellipse(bx, by - 4, 8, 6, 0, Math.PI, 0)
    ctx.fill()
    // Lights
    ctx.fillStyle = '#FFF'
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.arc(bx + i * 5, by + 2, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Background
    ctx.fillStyle = '#1a1a3e'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Stars
    for (const star of STARS) {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
      ctx.fillRect(star.x, star.y, 1.5, 1.5)
    }

    // Enemies
    for (const e of enemies) {
      if (e.alive) drawEnemy(e)
    }

    // Bonus UFO
    drawBonusUFO()

    // Shields
    drawShields()

    // Player
    if (!gameOver) drawPlayer()

    // Player bullet (seed)
    if (playerBullet) {
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.ellipse(playerBullet.x, playerBullet.y, 2, 4, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Enemy bullets
    ctx.fillStyle = '#FF6B8A'
    for (const b of enemyBullets) {
      ctx.beginPath()
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = p.life / 30
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // HUD
    ctx.fillStyle = '#FFB6C1'
    ctx.font = 'bold 18px Nunito, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${score}`, 10, 25)
    ctx.textAlign = 'center'
    ctx.fillText(`Level ${level}`, CANVAS_W / 2, 25)
    ctx.textAlign = 'right'
    ctx.fillText('❤️'.repeat(lives), CANVAS_W - 10, 25)

    // Game over overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, CANVAS_H / 2 - 60, CANVAS_W, 120)
      ctx.fillStyle = '#FFB6C1'
      ctx.font = 'bold 32px "Fredoka One", cursive'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 10)
      ctx.font = '18px Nunito, sans-serif'
      ctx.fillText(
        `Final Score: ${score}  |  Coins: +${Math.floor(score / 10)}`,
        CANVAS_W / 2,
        CANVAS_H / 2 + 25
      )
    }
  }

  function loop() {
    if (!running) return
    if (paused || gameOver) {
      draw()
      animId = requestAnimationFrame(loop)
      return
    }
    update()
    draw()
    animId = requestAnimationFrame(loop)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault()
    }
    keys.add(e.key)
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key)
  }

  return {
    start() {
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H

      running = true
      paused = false
      gameOver = false
      score = 0
      lives = 3
      level = 1
      playerX = CANVAS_W / 2
      playerInvincible = 0
      playerBullet = null
      enemyBullets = []
      particles = []
      enemyDirX = 1
      enemySpeed = 1
      enemyMoveTimer = 0
      enemyDropping = false
      bonusTimer = 0
      bonusUFO = { x: 0, y: 0, dir: 1, active: false }
      keys.clear()

      initEnemies()
      initShields()
      recalcEnemySpeed()

      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)

      animId = requestAnimationFrame(loop)
    },

    stop() {
      running = false
      cancelAnimationFrame(animId)
    },

    pause() {
      paused = true
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#FFB6C1'
      ctx.font = 'bold 28px "Fredoka One", cursive'
      ctx.textAlign = 'center'
      ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2)
    },

    resume() {
      paused = false
    },

    cleanup() {
      running = false
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },

    getScore() { return score },
    getLives() { return lives },
    isPaused() { return paused },
    isOver() { return gameOver },
  }
}

export function injectKey(_engine: GameEngine, key: string, down: boolean) {
  const event = new KeyboardEvent(down ? 'keydown' : 'keyup', { key })
  window.dispatchEvent(event)
}
