import { type GameEngine, type GameCallbacks } from './types'

interface Ship {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  radius: number
  invincible: number // countdown frames
  thrusting: boolean
}

interface Asteroid {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  tier: number // 0=large, 1=medium, 2=small
  vertices: number[] // offsets for jagged shape
}

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

const CANVAS_W = 480
const CANVAS_H = 640

const TIER_RADIUS = [30, 16, 8]
const TIER_SCORE = [20, 50, 100]
const TIER_SPEED = [1.2, 2, 3]

const SHIP_RADIUS = 12
const BULLET_SPEED = 7
const BULLET_LIFE = 60
const THRUST = 0.12
const FRICTION = 0.99
const ROTATE_SPEED = 0.06
const FIRE_COOLDOWN = 10
const INVINCIBLE_FRAMES = 120

export function createAsteroidsEngine(
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
  let fireCooldown = 0
  let lastTime = 0

  const keys = new Set<string>()

  const ship: Ship = {
    x: CANVAS_W / 2,
    y: CANVAS_H / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: SHIP_RADIUS,
    invincible: INVINCIBLE_FRAMES,
    thrusting: false,
  }

  let asteroids: Asteroid[] = []
  let bullets: Bullet[] = []
  let particles: Particle[] = []

  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number, y: number
      // Spawn away from ship
      do {
        x = Math.random() * CANVAS_W
        y = Math.random() * CANVAS_H
      } while (Math.hypot(x - ship.x, y - ship.y) < 120)

      const angle = Math.random() * Math.PI * 2
      const speed = TIER_SPEED[0] * (0.5 + Math.random() * 0.5)
      asteroids.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: TIER_RADIUS[0],
        tier: 0,
        vertices: makeVertices(8),
      })
    }
  }

  function makeVertices(count: number): number[] {
    const verts: number[] = []
    for (let i = 0; i < count; i++) {
      verts.push(0.7 + Math.random() * 0.6) // radius multiplier 0.7-1.3
    }
    return verts
  }

  function spawnParticles(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 20,
        color,
      })
    }
  }

  function wrap(obj: { x: number; y: number }) {
    if (obj.x < 0) obj.x += CANVAS_W
    if (obj.x > CANVAS_W) obj.x -= CANVAS_W
    if (obj.y < 0) obj.y += CANVAS_H
    if (obj.y > CANVAS_H) obj.y -= CANVAS_H
  }

  function circleCollision(a: { x: number; y: number; radius: number }, b: { x: number; y: number; radius: number }): boolean {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy < (a.radius + b.radius) * (a.radius + b.radius)
  }

  function resetShip() {
    ship.x = CANVAS_W / 2
    ship.y = CANVAS_H / 2
    ship.vx = 0
    ship.vy = 0
    ship.angle = -Math.PI / 2
    ship.invincible = INVINCIBLE_FRAMES
    ship.thrusting = false
  }

  function update() {
    if (fireCooldown > 0) fireCooldown--

    // Input
    if (keys.has('ArrowLeft') || keys.has('left')) ship.angle -= ROTATE_SPEED
    if (keys.has('ArrowRight') || keys.has('right')) ship.angle += ROTATE_SPEED

    ship.thrusting = keys.has('ArrowUp') || keys.has('up')
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * THRUST
      ship.vy += Math.sin(ship.angle) * THRUST
    }

    if ((keys.has(' ') || keys.has('action')) && fireCooldown <= 0) {
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * ship.radius,
        y: ship.y + Math.sin(ship.angle) * ship.radius,
        vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.5,
        vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.5,
        life: BULLET_LIFE,
      })
      fireCooldown = FIRE_COOLDOWN
    }

    // Ship physics
    ship.vx *= FRICTION
    ship.vy *= FRICTION
    ship.x += ship.vx
    ship.y += ship.vy
    wrap(ship)

    if (ship.invincible > 0) ship.invincible--

    // Bullets
    bullets = bullets.filter(b => {
      b.x += b.vx
      b.y += b.vy
      b.life--
      wrap(b)
      return b.life > 0
    })

    // Asteroids
    for (const a of asteroids) {
      a.x += a.vx
      a.y += a.vy
      wrap(a)
    }

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.life--
      return p.life > 0
    })

    // Bullet-asteroid collisions
    const newAsteroids: Asteroid[] = []
    const destroyedBullets = new Set<Bullet>()
    const destroyedAsteroids = new Set<Asteroid>()

    for (const b of bullets) {
      for (const a of asteroids) {
        if (destroyedAsteroids.has(a)) continue
        if (circleCollision({ ...b, radius: 3 }, a)) {
          destroyedBullets.add(b)
          destroyedAsteroids.add(a)

          // Score
          const pts = TIER_SCORE[a.tier]
          score += pts
          callbacks.onScore(pts)

          // Split
          if (a.tier < 2) {
            const newTier = a.tier + 1
            for (let i = 0; i < 2; i++) {
              const angle = Math.random() * Math.PI * 2
              const speed = TIER_SPEED[newTier] * (0.7 + Math.random() * 0.6)
              newAsteroids.push({
                x: a.x,
                y: a.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: TIER_RADIUS[newTier],
                tier: newTier,
                vertices: makeVertices(7),
              })
            }
          }

          // Particles
          spawnParticles(a.x, a.y, 6, a.tier === 2 ? '#FFB6C1' : '#B0D4F1')
          break
        }
      }
    }

    bullets = bullets.filter(b => !destroyedBullets.has(b))
    asteroids = asteroids.filter(a => !destroyedAsteroids.has(a))
    asteroids.push(...newAsteroids)

    // Ship-asteroid collision
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (circleCollision(ship, a)) {
          lives--
          callbacks.onLifeLost()
          spawnParticles(ship.x, ship.y, 12, '#FFB6C1')

          if (lives <= 0) {
            gameOver = true
            callbacks.onGameOver(score)
            if (score > 0) callbacks.onHighScore(score)
            return
          }

          resetShip()
          break
        }
      }
    }

    // Level complete
    if (asteroids.length === 0) {
      level++
      spawnAsteroids(3 + level)
    }
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Background
    ctx.fillStyle = '#1a1a3e'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Stars (static)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    for (let i = 0; i < 50; i++) {
      // Deterministic "random" positions from seed
      const sx = ((i * 7919 + 1) % CANVAS_W)
      const sy = ((i * 6271 + 3) % CANVAS_H)
      ctx.fillRect(sx, sy, 1, 1)
    }

    // Asteroids
    for (const a of asteroids) {
      ctx.strokeStyle = '#B0D4F1'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < a.vertices.length; i++) {
        const angle = (i / a.vertices.length) * Math.PI * 2
        const r = a.radius * a.vertices[i]
        const px = a.x + Math.cos(angle) * r
        const py = a.y + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // Bullets
    ctx.fillStyle = '#FFB6C1'
    for (const b of bullets) {
      ctx.beginPath()
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = p.life / 40
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Ship
    if (!gameOver) {
      // Blink when invincible
      if (ship.invincible > 0 && Math.floor(ship.invincible / 6) % 2 === 0) {
        // Skip drawing (blink effect)
      } else {
        ctx.save()
        ctx.translate(ship.x, ship.y)
        ctx.rotate(ship.angle)

        // Ship body (triangle)
        ctx.strokeStyle = '#FFB6C1'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(ship.radius, 0)
        ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.6)
        ctx.lineTo(-ship.radius * 0.4, 0)
        ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.6)
        ctx.closePath()
        ctx.stroke()

        // Hamster silhouette in cockpit (small circle with ears)
        ctx.fillStyle = '#F4A460'
        ctx.beginPath()
        ctx.arc(0, 0, 4, 0, Math.PI * 2)
        ctx.fill()
        // Tiny ears
        ctx.beginPath()
        ctx.arc(-2, -4, 2, 0, Math.PI * 2)
        ctx.arc(2, -4, 2, 0, Math.PI * 2)
        ctx.fill()

        // Thrust flame
        if (ship.thrusting) {
          ctx.fillStyle = `hsl(${30 + Math.random() * 20}, 100%, 60%)`
          ctx.beginPath()
          ctx.moveTo(-ship.radius * 0.4, -3)
          ctx.lineTo(-ship.radius * 1.2 - Math.random() * 8, 0)
          ctx.lineTo(-ship.radius * 0.4, 3)
          ctx.fill()
        }

        ctx.restore()
      }
    }

    // HUD
    ctx.fillStyle = '#FFB6C1'
    ctx.font = 'bold 18px Nunito, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${score}`, 10, 25)
    ctx.textAlign = 'right'
    ctx.fillText(`Lives: ${'❤️'.repeat(lives)}`, CANVAS_W - 10, 25)
    ctx.fillText(`Level ${level}`, CANVAS_W - 10, 48)

    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, CANVAS_H / 2 - 60, CANVAS_W, 120)
      ctx.fillStyle = '#FFB6C1'
      ctx.font = 'bold 32px "Fredoka One", cursive'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 10)
      ctx.font = '18px Nunito, sans-serif'
      ctx.fillText(`Final Score: ${score}  |  Coins: +${Math.floor(score / 10)}`, CANVAS_W / 2, CANVAS_H / 2 + 25)
    }
  }

  function loop(time: number) {
    if (!running) return
    if (paused || gameOver) {
      draw()
      animId = requestAnimationFrame(loop)
      return
    }

    // Cap delta to avoid big jumps
    if (lastTime === 0) lastTime = time
    lastTime = time

    update()
    draw()
    animId = requestAnimationFrame(loop)
  }

  // Keyboard handlers
  function onKeyDown(e: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault()
    }
    keys.add(e.key)
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key)
  }

  return {
    start() {
      running = true
      paused = false
      gameOver = false
      score = 0
      lives = 3
      level = 1
      fireCooldown = 0
      lastTime = 0
      asteroids = []
      bullets = []
      particles = []
      keys.clear()
      resetShip()
      ship.invincible = INVINCIBLE_FRAMES
      spawnAsteroids(4)

      canvas.width = CANVAS_W
      canvas.height = CANVAS_H

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
      // Draw pause overlay
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

  // Public method to inject touch input
  // Accessed by GameWrapper via casting
}

// Touch input injection — GameWrapper calls these
export function injectKey(_engine: GameEngine, key: string, down: boolean) {
  const event = new KeyboardEvent(down ? 'keydown' : 'keyup', { key })
  window.dispatchEvent(event)
}
