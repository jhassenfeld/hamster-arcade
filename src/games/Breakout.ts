import { type GameEngine, type GameCallbacks } from './types'

const CANVAS_W = 480
const CANVAS_H = 640

const BRICK_ROWS = 8
const BRICK_COLS = 10
const BRICK_GAP = 2
const BRICK_TOP_OFFSET = 60
const BRICK_HEIGHT = 20
const BRICK_WIDTH = (CANVAS_W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS

const PADDLE_DEFAULT_WIDTH = 80
const PADDLE_WIDE_WIDTH = 120
const PADDLE_HEIGHT = 14
const PADDLE_Y = CANVAS_H - 40
const PADDLE_SPEED = 7

const BALL_RADIUS = 6
const BALL_BASE_SPEED = 4.5

const POWERUP_CHANCE = 0.15
const POWERUP_RADIUS = 12
const POWERUP_FALL_SPEED = 2.5

const WIDE_PADDLE_DURATION = 10_000
const SLOW_BALL_DURATION = 8_000
const SLOW_BALL_FACTOR = 0.6

const ROW_COLORS = [
  '#FF8FAA', '#FF9BB5', '#FFA7BF', '#FFB6C1',
  '#C8DAF0', '#BED2EE', '#B0D4F1', '#DAE8F5',
]

type PowerUpType = 'multi' | 'wide' | 'slow'

interface Brick {
  x: number
  y: number
  w: number
  h: number
  row: number
  alive: boolean
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
}

interface PowerUp {
  x: number
  y: number
  type: PowerUpType
}

const POWERUP_DEFS: Record<PowerUpType, { emoji: string; color: string }> = {
  multi: { emoji: '\u26A1', color: '#4488FF' },
  wide:  { emoji: '\u2194\uFE0F', color: '#44CC44' },
  slow:  { emoji: '\uD83D\uDC0C', color: '#FFDD44' },
}

export function createBreakoutEngine(
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

  let paddleX = CANVAS_W / 2
  let paddleWidth = PADDLE_DEFAULT_WIDTH
  let widePaddleTimer = 0
  let slowBallTimer = 0

  let balls: Ball[] = []
  let bricks: Brick[] = []
  let powerUps: PowerUp[] = []
  let ballAttached = true

  const keys = new Set<string>()

  // ---------- helpers ----------

  function buildBricks() {
    bricks = []
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_GAP + c * (BRICK_WIDTH + BRICK_GAP),
          y: BRICK_TOP_OFFSET + r * (BRICK_HEIGHT + BRICK_GAP),
          w: BRICK_WIDTH,
          h: BRICK_HEIGHT,
          row: r,
          alive: true,
        })
      }
    }
  }

  function newBall(): Ball {
    const speed = BALL_BASE_SPEED + (level - 1) * 0.3
    return {
      x: paddleX,
      y: PADDLE_Y - BALL_RADIUS - 1,
      vx: 0,
      vy: -speed,
      speed,
    }
  }

  function launchBall(b: Ball) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4
    b.vx = Math.cos(angle) * b.speed
    b.vy = Math.sin(angle) * b.speed
  }

  function roundedRect(
    rx: number, ry: number, rw: number, rh: number, radius: number
  ) {
    ctx.beginPath()
    ctx.moveTo(rx + radius, ry)
    ctx.lineTo(rx + rw - radius, ry)
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius)
    ctx.lineTo(rx + rw, ry + rh - radius)
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh)
    ctx.lineTo(rx + radius, ry + rh)
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius)
    ctx.lineTo(rx, ry + radius)
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry)
    ctx.closePath()
  }

  function effectiveSpeed(b: Ball): number {
    return slowBallTimer > 0 ? b.speed * SLOW_BALL_FACTOR : b.speed
  }

  function normalizeBallSpeed(b: Ball) {
    const s = effectiveSpeed(b)
    const mag = Math.hypot(b.vx, b.vy)
    if (mag > 0) {
      b.vx = (b.vx / mag) * s
      b.vy = (b.vy / mag) * s
    }
  }

  function spawnPowerUp(x: number, y: number) {
    if (Math.random() > POWERUP_CHANCE) return
    const types: PowerUpType[] = ['multi', 'wide', 'slow']
    const type = types[Math.floor(Math.random() * types.length)]
    powerUps.push({ x, y, type })
  }

  function applyPowerUp(type: PowerUpType) {
    callbacks.onPowerUp()
    if (type === 'multi') {
      const extra: Ball[] = []
      for (const b of balls) {
        const clone: Ball = { ...b, vx: -b.vx }
        normalizeBallSpeed(clone)
        extra.push(clone)
      }
      balls.push(...extra)
    } else if (type === 'wide') {
      paddleWidth = PADDLE_WIDE_WIDTH
      widePaddleTimer = WIDE_PADDLE_DURATION
    } else if (type === 'slow') {
      slowBallTimer = SLOW_BALL_DURATION
      for (const b of balls) {
        normalizeBallSpeed(b)
      }
    }
  }

  function checkRowCleared(row: number) {
    const anyAlive = bricks.some(b => b.row === row && b.alive)
    if (!anyAlive) {
      score += 50
      callbacks.onScore(50)
    }
  }

  // ---------- update ----------

  function update(dt: number) {
    // Paddle movement
    if (keys.has('ArrowLeft')) {
      paddleX -= PADDLE_SPEED
    }
    if (keys.has('ArrowRight')) {
      paddleX += PADDLE_SPEED
    }
    paddleX = Math.max(paddleWidth / 2, Math.min(CANVAS_W - paddleWidth / 2, paddleX))

    // Launch
    if (ballAttached) {
      if (balls.length > 0) {
        balls[0].x = paddleX
        balls[0].y = PADDLE_Y - BALL_RADIUS - 1
      }
      if (keys.has(' ')) {
        ballAttached = false
        if (balls.length > 0) launchBall(balls[0])
      }
      return
    }

    // Timers
    if (widePaddleTimer > 0) {
      widePaddleTimer -= dt
      if (widePaddleTimer <= 0) {
        widePaddleTimer = 0
        paddleWidth = PADDLE_DEFAULT_WIDTH
      }
    }
    if (slowBallTimer > 0) {
      slowBallTimer -= dt
      if (slowBallTimer <= 0) {
        slowBallTimer = 0
        for (const b of balls) normalizeBallSpeed(b)
      }
    }

    // Ball physics
    const deadBalls: Ball[] = []

    for (const ball of balls) {
      ball.x += ball.vx
      ball.y += ball.vy

      // Wall collisions
      if (ball.x - BALL_RADIUS <= 0) {
        ball.x = BALL_RADIUS
        ball.vx = Math.abs(ball.vx)
      }
      if (ball.x + BALL_RADIUS >= CANVAS_W) {
        ball.x = CANVAS_W - BALL_RADIUS
        ball.vx = -Math.abs(ball.vx)
      }
      if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS
        ball.vy = Math.abs(ball.vy)
      }

      // Fell below
      if (ball.y - BALL_RADIUS > CANVAS_H) {
        deadBalls.push(ball)
        continue
      }

      // Paddle collision
      const pLeft = paddleX - paddleWidth / 2
      const pRight = paddleX + paddleWidth / 2
      if (
        ball.vy > 0 &&
        ball.y + BALL_RADIUS >= PADDLE_Y &&
        ball.y + BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT + 4 &&
        ball.x >= pLeft &&
        ball.x <= pRight
      ) {
        // Where on the paddle? -1 to 1
        const hitPos = (ball.x - paddleX) / (paddleWidth / 2)
        // Angle between -65 and -115 degrees (mapped to -pi/2 range)
        const angle = -Math.PI / 2 + hitPos * (Math.PI / 3)
        const s = effectiveSpeed(ball)
        ball.vx = Math.cos(angle) * s
        ball.vy = Math.sin(angle) * s
        ball.y = PADDLE_Y - BALL_RADIUS
      }

      // Brick collisions
      for (const brick of bricks) {
        if (!brick.alive) continue

        // AABB vs circle
        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w))
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h))
        const dx = ball.x - closestX
        const dy = ball.y - closestY

        if (dx * dx + dy * dy < BALL_RADIUS * BALL_RADIUS) {
          brick.alive = false
          score += 10
          callbacks.onScore(10)

          // Determine reflection axis
          const overlapX = BALL_RADIUS - Math.abs(dx)
          const overlapY = BALL_RADIUS - Math.abs(dy)
          if (overlapX < overlapY) {
            ball.vx = -ball.vx
          } else {
            ball.vy = -ball.vy
          }

          checkRowCleared(brick.row)
          spawnPowerUp(brick.x + brick.w / 2, brick.y + brick.h / 2)
          break // one brick per frame per ball
        }
      }
    }

    // Remove dead balls
    balls = balls.filter(b => !deadBalls.includes(b))

    if (balls.length === 0) {
      lives--
      callbacks.onLifeLost()
      if (lives <= 0) {
        gameOver = true
        callbacks.onGameOver(score)
        if (score > 0) callbacks.onHighScore(score)
        return
      }
      // Reset ball
      ballAttached = true
      balls = [newBall()]
    }

    // Power-ups
    powerUps = powerUps.filter(p => {
      p.y += POWERUP_FALL_SPEED

      // Catch
      const pLeft = paddleX - paddleWidth / 2
      const pRight = paddleX + paddleWidth / 2
      if (
        p.y + POWERUP_RADIUS >= PADDLE_Y &&
        p.y - POWERUP_RADIUS <= PADDLE_Y + PADDLE_HEIGHT &&
        p.x >= pLeft &&
        p.x <= pRight
      ) {
        applyPowerUp(p.type)
        return false
      }

      // Off screen
      if (p.y > CANVAS_H + POWERUP_RADIUS) return false
      return true
    })

    // Level complete
    if (bricks.every(b => !b.alive)) {
      level++
      buildBricks()
      ballAttached = true
      balls = [newBall()]
      for (const b of balls) {
        b.speed = BALL_BASE_SPEED + (level - 1) * 0.3
      }
      powerUps = []
      paddleWidth = PADDLE_DEFAULT_WIDTH
      widePaddleTimer = 0
      slowBallTimer = 0
    }
  }

  // ---------- draw ----------

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Background
    ctx.fillStyle = '#1a1a3e'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Bricks
    for (const brick of bricks) {
      if (!brick.alive) continue
      ctx.fillStyle = ROW_COLORS[brick.row]
      roundedRect(brick.x, brick.y, brick.w, brick.h, 3)
      ctx.fill()
    }

    // Power-ups
    for (const p of powerUps) {
      const def = POWERUP_DEFS[p.type]
      ctx.fillStyle = def.color
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(p.x, p.y, POWERUP_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(def.emoji, p.x, p.y)
    }

    // Paddle
    const pLeft = paddleX - paddleWidth / 2
    ctx.fillStyle = '#F4A460'
    roundedRect(pLeft, PADDLE_Y, paddleWidth, PADDLE_HEIGHT, 6)
    ctx.fill()

    // Ears
    ctx.fillStyle = '#F4A460'
    ctx.beginPath()
    ctx.ellipse(pLeft + 12, PADDLE_Y - 4, 6, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(pLeft + paddleWidth - 12, PADDLE_Y - 4, 6, 7, 0, 0, Math.PI * 2)
    ctx.fill()

    // Inner ear
    ctx.fillStyle = '#FFB6C1'
    ctx.beginPath()
    ctx.ellipse(pLeft + 12, PADDLE_Y - 4, 3, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(pLeft + paddleWidth - 12, PADDLE_Y - 4, 3, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    ctx.fillStyle = '#222'
    ctx.beginPath()
    ctx.arc(paddleX - 8, PADDLE_Y + 5, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(paddleX + 8, PADDLE_Y + 5, 2, 0, Math.PI * 2)
    ctx.fill()

    // Nose
    ctx.fillStyle = '#FF8FAA'
    ctx.beginPath()
    ctx.arc(paddleX, PADDLE_Y + 8, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Balls
    for (const ball of balls) {
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.beginPath()
      ctx.arc(ball.x - 2, ball.y - 2, BALL_RADIUS * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // HUD
    ctx.fillStyle = '#FFB6C1'
    ctx.font = 'bold 18px Nunito, sans-serif'
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${score}`, 10, 10)
    ctx.textAlign = 'center'
    ctx.fillText(`Level ${level}`, CANVAS_W / 2, 10)
    ctx.textAlign = 'right'
    ctx.fillText('\u2764\uFE0F'.repeat(lives), CANVAS_W - 10, 10)

    // Active power-up timers
    let timerY = 34
    if (widePaddleTimer > 0) {
      ctx.fillStyle = '#44CC44'
      ctx.font = '12px Nunito, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`\u2194\uFE0F ${(widePaddleTimer / 1000).toFixed(1)}s`, CANVAS_W - 10, timerY)
      timerY += 16
    }
    if (slowBallTimer > 0) {
      ctx.fillStyle = '#FFDD44'
      ctx.font = '12px Nunito, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`\uD83D\uDC0C ${(slowBallTimer / 1000).toFixed(1)}s`, CANVAS_W - 10, timerY)
    }

    // Ball attached hint
    if (ballAttached && !gameOver) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '16px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Press SPACE to launch', CANVAS_W / 2, CANVAS_H / 2 + 60)
    }

    // Game over
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, CANVAS_H / 2 - 60, CANVAS_W, 120)
      ctx.fillStyle = '#FFB6C1'
      ctx.font = 'bold 32px "Fredoka One", cursive'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 10)
      ctx.font = '18px Nunito, sans-serif'
      ctx.fillText(
        `Final Score: ${score}  |  Coins: +${Math.floor(score / 10)}`,
        CANVAS_W / 2,
        CANVAS_H / 2 + 25
      )
    }
  }

  // ---------- loop ----------

  let lastTimestamp = 0

  function loop(time: number) {
    if (!running) return
    if (paused || gameOver) {
      draw()
      animId = requestAnimationFrame(loop)
      return
    }

    if (lastTimestamp === 0) lastTimestamp = time
    const dt = Math.min(time - lastTimestamp, 32) // cap at ~30fps min
    lastTimestamp = time

    update(dt)
    draw()
    animId = requestAnimationFrame(loop)
  }

  // ---------- keyboard ----------

  function onKeyDown(e: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault()
    }
    keys.add(e.key)
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key)
  }

  // ---------- engine interface ----------

  return {
    start() {
      running = true
      paused = false
      gameOver = false
      score = 0
      lives = 3
      level = 1
      paddleX = CANVAS_W / 2
      paddleWidth = PADDLE_DEFAULT_WIDTH
      widePaddleTimer = 0
      slowBallTimer = 0
      lastTimestamp = 0
      ballAttached = true
      powerUps = []
      keys.clear()

      canvas.width = CANVAS_W
      canvas.height = CANVAS_H

      buildBricks()
      balls = [newBall()]

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
      ctx.textBaseline = 'middle'
      ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2)
    },

    resume() {
      paused = false
      lastTimestamp = 0
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
