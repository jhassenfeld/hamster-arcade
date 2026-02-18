import { type GameEngine, type GameCallbacks } from './types'

const CANVAS_W = 480
const CANVAS_H = 640
const COLS = 21
const ROWS = 27
const TILE_SIZE = Math.floor(CANVAS_W / COLS) // ~22
const OFFSET_Y = 40

// Maze cell types
const PATH = 0
const WALL = 1
const DOT = 2
const POWER = 3

// Hardcoded 21x27 maze layout
// Symmetric design with 4 power pellets in corners
function createMaze(): number[][] {
  // prettier-ignore
  const template: number[][] = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
    [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,0,1,1,1,0,1,1,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,0,0,0,1,1,0,1,2,1,1,1,1],
    [0,0,0,0,2,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0],
    [1,1,1,1,2,1,0,1,0,0,0,0,0,1,0,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,0,0,0],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
    [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ]
  return template
}

interface Position {
  x: number
  y: number
}

interface Ghost {
  col: number
  row: number
  px: number // pixel x (for smooth interpolation)
  py: number // pixel y
  targetPx: number
  targetPy: number
  moveProgress: number
  dir: Direction
  color: string
  frightened: boolean
  eaten: boolean
  aiType: 'chase' | 'random' | 'patrol1' | 'patrol2'
  patrolCorner: Position
  speed: number
}

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const DIR_OFFSETS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
}

const GHOST_COLORS = ['#FFB6C1', '#B0D4F1', '#FFD700', '#90EE90']
const GHOST_AI: Array<Ghost['aiType']> = ['chase', 'random', 'patrol1', 'patrol2']
const FRIGHTENED_COLOR = '#7EB8DA'
const FRIGHTENED_DURATION = 480 // ~8 seconds at 60fps

const PLAYER_START_COL = 10
const PLAYER_START_ROW = 16

export function createPacManEngine(
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
  let frameCount = 0

  let maze: number[][] = []
  let totalDots = 0
  let dotsEaten = 0

  // Player state
  let playerCol = PLAYER_START_COL
  let playerRow = PLAYER_START_ROW
  let playerPx = 0
  let playerPy = 0
  let playerTargetPx = 0
  let playerTargetPy = 0
  let playerMoveProgress = 1 // 1 = at destination
  let playerDir: Direction = 'none'
  let queuedDir: Direction = 'none'
  let mouthAngle = 0
  let mouthOpening = true

  // Ghost state
  let ghosts: Ghost[] = []
  let frightenedTimer = 0
  let ghostsEatenThisRound = 0

  // Ghost speed multiplier (increases per level)
  let ghostSpeedMult = 1
  const PLAYER_SPEED = 0.08
  const BASE_GHOST_SPEED = 0.06

  function tileToPixel(col: number, row: number): Position {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2 + OFFSET_Y,
    }
  }

  function isWalkable(col: number, row: number): boolean {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false
    return maze[row][col] !== WALL
  }

  function canMove(col: number, row: number, dir: Direction): boolean {
    const off = DIR_OFFSETS[dir]
    const nc = col + off.x
    const nr = row + off.y
    // Allow wrapping through tunnel rows
    if (nc < 0 || nc >= COLS) {
      // Check if it's a tunnel row (rows with path at edges)
      if (row === 9) return true
      return false
    }
    return isWalkable(nc, nr)
  }

  function wrapCol(col: number): number {
    if (col < 0) return COLS - 1
    if (col >= COLS) return 0
    return col
  }

  function initMaze() {
    maze = createMaze()
    totalDots = 0
    dotsEaten = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (maze[r][c] === DOT || maze[r][c] === POWER) {
          totalDots++
        }
      }
    }
  }

  function resetPlayer() {
    playerCol = PLAYER_START_COL
    playerRow = PLAYER_START_ROW
    const pos = tileToPixel(playerCol, playerRow)
    playerPx = pos.x
    playerPy = pos.y
    playerTargetPx = pos.x
    playerTargetPy = pos.y
    playerMoveProgress = 1
    playerDir = 'none'
    queuedDir = 'none'
  }

  function initGhosts() {
    ghosts = []
    const ghostStarts: Position[] = [
      { x: 9, y: 9 },
      { x: 10, y: 9 },
      { x: 11, y: 9 },
      { x: 10, y: 10 },
    ]
    const patrolCorners: Position[] = [
      { x: 1, y: 1 },
      { x: COLS - 2, y: 1 },
      { x: 1, y: ROWS - 6 },
      { x: COLS - 2, y: ROWS - 6 },
    ]
    for (let i = 0; i < 4; i++) {
      const startPos = ghostStarts[i]
      const pos = tileToPixel(startPos.x, startPos.y)
      ghosts.push({
        col: startPos.x,
        row: startPos.y,
        px: pos.x,
        py: pos.y,
        targetPx: pos.x,
        targetPy: pos.y,
        moveProgress: 1,
        dir: 'up',
        color: GHOST_COLORS[i],
        frightened: false,
        eaten: false,
        aiType: GHOST_AI[i],
        patrolCorner: patrolCorners[i],
        speed: BASE_GHOST_SPEED,
      })
    }
  }

  function resetGhosts() {
    const ghostStarts: Position[] = [
      { x: 9, y: 9 },
      { x: 10, y: 9 },
      { x: 11, y: 9 },
      { x: 10, y: 10 },
    ]
    for (let i = 0; i < 4; i++) {
      const startPos = ghostStarts[i]
      const pos = tileToPixel(startPos.x, startPos.y)
      ghosts[i].col = startPos.x
      ghosts[i].row = startPos.y
      ghosts[i].px = pos.x
      ghosts[i].py = pos.y
      ghosts[i].targetPx = pos.x
      ghosts[i].targetPy = pos.y
      ghosts[i].moveProgress = 1
      ghosts[i].dir = 'up'
      ghosts[i].frightened = false
      ghosts[i].eaten = false
    }
    frightenedTimer = 0
    ghostsEatenThisRound = 0
  }

  function getAvailableDirections(col: number, row: number, excludeDir?: Direction): Direction[] {
    const dirs: Direction[] = ['up', 'down', 'left', 'right']
    return dirs.filter(d => {
      if (excludeDir && d === excludeDir) return false
      return canMove(col, row, d)
    })
  }

  function distSq(x1: number, y1: number, x2: number, y2: number): number {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)
  }

  function chooseGhostDirection(ghost: Ghost): Direction {
    const available = getAvailableDirections(ghost.col, ghost.row, OPPOSITE[ghost.dir])

    if (available.length === 0) {
      // If no direction except reverse, allow reverse
      const allDirs = getAvailableDirections(ghost.col, ghost.row)
      if (allDirs.length === 0) return 'none'
      return allDirs[Math.floor(Math.random() * allDirs.length)]
    }

    if (available.length === 1) return available[0]

    if (ghost.frightened) {
      // Run away: pick random direction
      return available[Math.floor(Math.random() * available.length)]
    }

    // AI behavior
    let targetCol: number
    let targetRow: number

    switch (ghost.aiType) {
      case 'chase':
        // Chase player directly
        targetCol = playerCol
        targetRow = playerRow
        break
      case 'random':
        // Move randomly
        return available[Math.floor(Math.random() * available.length)]
      case 'patrol1':
        // Patrol corner, but chase if close to player
        if (distSq(ghost.col, ghost.row, playerCol, playerRow) < 64) {
          targetCol = playerCol
          targetRow = playerRow
        } else {
          targetCol = ghost.patrolCorner.x
          targetRow = ghost.patrolCorner.y
        }
        break
      case 'patrol2':
        // Patrol other corner, chase if close
        if (distSq(ghost.col, ghost.row, playerCol, playerRow) < 64) {
          targetCol = playerCol
          targetRow = playerRow
        } else {
          targetCol = ghost.patrolCorner.x
          targetRow = ghost.patrolCorner.y
        }
        break
      default:
        targetCol = playerCol
        targetRow = playerRow
    }

    // Pick direction that minimizes distance to target
    let bestDir = available[0]
    let bestDist = Infinity
    for (const d of available) {
      const off = DIR_OFFSETS[d]
      const nc = ghost.col + off.x
      const nr = ghost.row + off.y
      const dist = distSq(nc, nr, targetCol, targetRow)
      if (dist < bestDist) {
        bestDist = dist
        bestDir = d
      }
    }
    return bestDir
  }

  function moveGhost(ghost: Ghost) {
    if (ghost.moveProgress < 1) {
      ghost.moveProgress += ghost.speed * ghostSpeedMult
      if (ghost.moveProgress >= 1) {
        ghost.moveProgress = 1
        ghost.px = ghost.targetPx
        ghost.py = ghost.targetPy
      } else {
        ghost.px = ghost.px + (ghost.targetPx - ghost.px) * 0.15
        ghost.py = ghost.py + (ghost.targetPy - ghost.py) * 0.15
        return
      }
    }

    // At destination tile, choose next direction
    const newDir = chooseGhostDirection(ghost)
    if (newDir === 'none') return

    ghost.dir = newDir
    const off = DIR_OFFSETS[newDir]
    const nc = wrapCol(ghost.col + off.x)
    let nr = ghost.row + off.y
    if (nr < 0) nr = 0
    if (nr >= ROWS) nr = ROWS - 1

    ghost.col = nc
    ghost.row = nr
    const targetPos = tileToPixel(nc, nr)
    ghost.targetPx = targetPos.x
    ghost.targetPy = targetPos.y
    ghost.moveProgress = 0
  }

  function updatePlayer() {
    // Animate mouth
    if (mouthOpening) {
      mouthAngle += 0.06
      if (mouthAngle >= 0.6) mouthOpening = false
    } else {
      mouthAngle -= 0.06
      if (mouthAngle <= 0.05) mouthOpening = true
    }

    if (playerMoveProgress < 1) {
      playerMoveProgress += PLAYER_SPEED
      if (playerMoveProgress >= 1) {
        playerMoveProgress = 1
        playerPx = playerTargetPx
        playerPy = playerTargetPy
      } else {
        playerPx = playerPx + (playerTargetPx - playerPx) * 0.15
        playerPy = playerPy + (playerTargetPy - playerPy) * 0.15
        return
      }
    }

    // At destination tile, try queued direction first
    let moved = false
    if (queuedDir !== 'none' && canMove(playerCol, playerRow, queuedDir)) {
      playerDir = queuedDir
      queuedDir = 'none'
      moved = true
    } else if (playerDir !== 'none' && canMove(playerCol, playerRow, playerDir)) {
      moved = true
    }

    if (moved) {
      const off = DIR_OFFSETS[playerDir]
      const nc = wrapCol(playerCol + off.x)
      let nr = playerRow + off.y
      if (nr < 0) nr = 0
      if (nr >= ROWS) nr = ROWS - 1

      playerCol = nc
      playerRow = nr
      const targetPos = tileToPixel(nc, nr)
      playerTargetPx = targetPos.x
      playerTargetPy = targetPos.y
      playerMoveProgress = 0

      // Eat dot/pellet at new tile
      const cell = maze[playerRow][playerCol]
      if (cell === DOT) {
        maze[playerRow][playerCol] = PATH
        score += 10
        dotsEaten++
        callbacks.onScore(10)
      } else if (cell === POWER) {
        maze[playerRow][playerCol] = PATH
        score += 50
        dotsEaten++
        callbacks.onScore(50)
        callbacks.onPowerUp()
        // Activate frightened mode
        frightenedTimer = FRIGHTENED_DURATION
        ghostsEatenThisRound = 0
        for (const g of ghosts) {
          if (!g.eaten) {
            g.frightened = true
            // Reverse direction
            g.dir = OPPOSITE[g.dir]
          }
        }
      }
    }
  }

  function checkGhostCollisions() {
    const playerCenterX = playerPx
    const playerCenterY = playerPy

    for (const ghost of ghosts) {
      if (ghost.eaten) continue
      const dx = playerCenterX - ghost.px
      const dy = playerCenterY - ghost.py
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < TILE_SIZE * 0.8) {
        if (ghost.frightened) {
          // Eat the ghost
          ghost.eaten = true
          ghostsEatenThisRound++
          const pts = 200 * Math.pow(2, ghostsEatenThisRound - 1)
          score += pts
          callbacks.onScore(pts)
          // Respawn ghost at center
          ghost.col = 10
          ghost.row = 9
          const pos = tileToPixel(10, 9)
          ghost.px = pos.x
          ghost.py = pos.y
          ghost.targetPx = pos.x
          ghost.targetPy = pos.y
          ghost.moveProgress = 1
          ghost.frightened = false
          ghost.eaten = false
          ghost.dir = 'up'
        } else {
          // Player dies
          lives--
          callbacks.onLifeLost()
          if (lives <= 0) {
            gameOver = true
            callbacks.onGameOver(score)
            if (score > 0) callbacks.onHighScore(score)
            return
          }
          resetPlayer()
          resetGhosts()
          return
        }
      }
    }
  }

  function checkLevelComplete() {
    if (dotsEaten >= totalDots) {
      level++
      ghostSpeedMult = 1 + (level - 1) * 0.1
      initMaze()
      resetPlayer()
      resetGhosts()
    }
  }

  function update() {
    frameCount++

    // Update frightened timer
    if (frightenedTimer > 0) {
      frightenedTimer--
      if (frightenedTimer <= 0) {
        for (const g of ghosts) {
          g.frightened = false
        }
        ghostsEatenThisRound = 0
      }
    }

    updatePlayer()

    for (const ghost of ghosts) {
      moveGhost(ghost)
    }

    checkGhostCollisions()
    checkLevelComplete()
  }

  // --- Drawing ---

  function drawMaze() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = maze[r][c]
        const px = c * TILE_SIZE
        const py = r * TILE_SIZE + OFFSET_Y

        if (cell === WALL) {
          ctx.fillStyle = '#B0D4F1'
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
          // Add slight inner shadow for depth
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.fillRect(px, py, TILE_SIZE, 1)
          ctx.fillRect(px, py, 1, TILE_SIZE)
        } else if (cell === DOT) {
          ctx.fillStyle = '#FFB6C1'
          ctx.beginPath()
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 2.5, 0, Math.PI * 2)
          ctx.fill()
        } else if (cell === POWER) {
          // Pulsing power pellet
          const pulse = 1 + 0.3 * Math.sin(frameCount * 0.1)
          ctx.fillStyle = '#FFB6C1'
          ctx.beginPath()
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 6 * pulse, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  function drawPlayer() {
    ctx.save()
    ctx.translate(playerPx, playerPy)

    // Determine rotation based on direction
    let rotation = 0
    switch (playerDir) {
      case 'right': rotation = 0; break
      case 'down': rotation = Math.PI / 2; break
      case 'left': rotation = Math.PI; break
      case 'up': rotation = -Math.PI / 2; break
    }
    ctx.rotate(rotation)

    const radius = TILE_SIZE / 2 - 2

    // Body (hamster color)
    ctx.fillStyle = '#F4A460'
    ctx.beginPath()
    ctx.arc(0, 0, radius, mouthAngle, Math.PI * 2 - mouthAngle)
    ctx.lineTo(0, 0)
    ctx.closePath()
    ctx.fill()

    // Ears (relative to unrotated, i.e., facing right)
    ctx.fillStyle = '#DEB887'
    ctx.beginPath()
    ctx.arc(-2, -radius + 1, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-2, radius - 1, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // Inner ear
    ctx.fillStyle = '#FFB6C1'
    ctx.beginPath()
    ctx.arc(-2, -radius + 1, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-2, radius - 1, 2, 0, Math.PI * 2)
    ctx.fill()

    // Eye
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(3, -3, 1.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  function drawGhost(ghost: Ghost) {
    ctx.save()
    ctx.translate(ghost.px, ghost.py)

    const radius = TILE_SIZE / 2 - 2
    const color = ghost.frightened ? FRIGHTENED_COLOR : ghost.color

    // Wavy offset when frightened
    const wobble = ghost.frightened ? Math.sin(frameCount * 0.3 + ghosts.indexOf(ghost)) * 2 : 0

    // Body (rounded top, wavy bottom)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(0 + wobble, -2, radius, Math.PI, 0)
    // Wavy bottom
    const bottomY = radius - 2
    ctx.lineTo(radius + wobble, bottomY)
    for (let i = 0; i < 4; i++) {
      const segW = (radius * 2) / 4
      const cx = radius - segW * i - segW / 2 + wobble
      const isUp = i % 2 === 0
      ctx.quadraticCurveTo(
        cx,
        bottomY + (isUp ? 4 : -2),
        radius - segW * (i + 1) + wobble,
        bottomY
      )
    }
    ctx.closePath()
    ctx.fill()

    // Triangular ears
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-radius + 2 + wobble, -4)
    ctx.lineTo(-radius + 5 + wobble, -radius - 3)
    ctx.lineTo(-radius + 8 + wobble, -4)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(radius - 8 + wobble, -4)
    ctx.lineTo(radius - 5 + wobble, -radius - 3)
    ctx.lineTo(radius - 2 + wobble, -4)
    ctx.closePath()
    ctx.fill()

    // Eyes
    if (ghost.frightened) {
      // Frightened eyes: simple dots
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(-3 + wobble, -3, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(3 + wobble, -3, 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Normal eyes: white with pupil
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(-3, -3, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(3, -3, 3, 0, Math.PI * 2)
      ctx.fill()

      // Pupils (look toward player)
      const dx = playerPx - ghost.px
      const dy = playerPy - ghost.py
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const pupilOff = 1.2
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(-3 + (dx / len) * pupilOff, -3 + (dy / len) * pupilOff, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(3 + (dx / len) * pupilOff, -3 + (dy / len) * pupilOff, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  function drawHUD() {
    // Score top-left
    ctx.fillStyle = '#FF69B4'
    ctx.font = 'bold 16px Nunito, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${score}`, 10, 26)

    // Level center
    ctx.textAlign = 'center'
    ctx.fillText(`Level ${level}`, CANVAS_W / 2, 26)

    // Lives top-right
    ctx.textAlign = 'right'
    ctx.fillText('❤️'.repeat(lives), CANVAS_W - 10, 26)
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.fillStyle = '#FFB6C1'
    ctx.font = 'bold 36px "Fredoka One", cursive'
    ctx.textAlign = 'center'
    ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 20)

    ctx.font = '20px Nunito, sans-serif'
    ctx.fillText(`Final Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 20)
    ctx.fillText(`Coins: +${Math.floor(score / 10)}`, CANVAS_W / 2, CANVAS_H / 2 + 50)
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Background
    ctx.fillStyle = '#FFF5F7'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    drawMaze()
    drawPlayer()

    for (const ghost of ghosts) {
      drawGhost(ghost)
    }

    drawHUD()

    if (gameOver) {
      drawGameOver()
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

  // --- Keyboard handlers ---
  function onKeyDown(e: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
    }
    switch (e.key) {
      case 'ArrowUp':
        queuedDir = 'up'
        break
      case 'ArrowDown':
        queuedDir = 'down'
        break
      case 'ArrowLeft':
        queuedDir = 'left'
        break
      case 'ArrowRight':
        queuedDir = 'right'
        break
    }
  }

  function onKeyUp(_e: KeyboardEvent) {
    // No action needed on key up for Pac-Man style controls
    // The queued direction persists until used
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
      frameCount = 0
      ghostSpeedMult = 1
      mouthAngle = 0
      mouthOpening = true

      initMaze()
      resetPlayer()
      initGhosts()

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
}

// Touch input injection -- GameWrapper calls these
export function injectKey(_engine: GameEngine, key: string, down: boolean) {
  const event = new KeyboardEvent(down ? 'keydown' : 'keyup', { key })
  window.dispatchEvent(event)
}
