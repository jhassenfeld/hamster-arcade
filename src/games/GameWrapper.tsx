import { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../state/gameStore'
import { type GameEngine, type GameCallbacks } from './types'
import { createAsteroidsEngine, injectKey } from './Asteroids'
import { createPacManEngine } from './PacMan'
import { createSpaceInvadersEngine } from './SpaceInvaders'
import { createBreakoutEngine } from './Breakout'
import MiniHabitatOverlay from '../components/MiniHabitatOverlay'
import type { ReactionEvent } from '../utils/hamsterReactions'
import './GameWrapper.css'

interface Props {
  gameId: string
  onQuit: () => void
}

const ENGINE_FACTORIES: Record<string, (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cb: GameCallbacks) => GameEngine> = {
  asteroids: createAsteroidsEngine,
  pacman: createPacManEngine,
  'space-invaders': createSpaceInvadersEngine,
  breakout: createBreakoutEngine,
}

export default function GameWrapper({ gameId, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [score, setScore] = useState(0)
  const [paused, setPaused] = useState(false)
  const [gameOverState, setGameOverState] = useState(false)
  const [coinsEarned, setCoinsEarned] = useState(0)

  const addCoins = useGameStore((s) => s.addCoins)
  const updateHighScore = useGameStore((s) => s.updateHighScore)
  const highScores = useGameStore((s) => s.highScores)
  const feedAll = useGameStore((s) => s.feedAll)

  // Trigger hamster reaction via global bridge
  const triggerReaction = useCallback((event: ReactionEvent) => {
    const trigger = (window as any).__miniHabitatTrigger
    if (trigger) trigger(event)
  }, [])

  const buildCallbacks = useCallback((): GameCallbacks => ({
    onScore: (pts) => {
      setScore(prev => prev + pts)
      triggerReaction('score')
    },
    onLifeLost: () => {
      triggerReaction('life-lost')
    },
    onPowerUp: () => {
      triggerReaction('power-up')
    },
    onGameOver: (finalScore) => {
      const coins = Math.floor(finalScore / 10)
      setCoinsEarned(coins)
      setGameOverState(true)
      setScore(finalScore)
      if (coins > 0) addCoins(coins)
      updateHighScore(gameId, finalScore)
      triggerReaction('game-over')
    },
    onHighScore: () => {
      triggerReaction('high-score')
    },
  }), [addCoins, updateHighScore, gameId, triggerReaction])

  const handleQuit = useCallback(() => {
    const engine = engineRef.current
    if (engine) {
      if (!engine.isOver()) {
        const finalScore = engine.getScore()
        const coins = Math.floor(finalScore / 10)
        if (coins > 0) addCoins(coins)
        updateHighScore(gameId, finalScore)
      }
      engine.cleanup()
      engineRef.current = null
    }
    onQuit()
  }, [addCoins, updateHighScore, gameId, onQuit])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const factory = ENGINE_FACTORIES[gameId]
    if (!factory) return

    const engine = factory(ctx, canvas, buildCallbacks())
    engineRef.current = engine
    engine.start()
    setScore(0)
    setPaused(false)
    setGameOverState(false)
    setCoinsEarned(0)

    return () => {
      engine.cleanup()
      engineRef.current = null
    }
  }, [gameId, buildCallbacks])

  // Sync score from engine periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const engine = engineRef.current
      if (engine) {
        setScore(engine.getScore())
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  // Hunger timer — only ticks while a game is actively playing (not paused, not game over)
  useEffect(() => {
    if (paused || gameOverState) return
    const interval = setInterval(() => {
      useGameStore.getState().tickHunger()
    }, 1000)
    return () => clearInterval(interval)
  }, [paused, gameOverState])

  const togglePause = () => {
    const engine = engineRef.current
    if (!engine || engine.isOver()) return
    if (engine.isPaused()) {
      engine.resume()
      setPaused(false)
    } else {
      engine.pause()
      setPaused(true)
    }
  }

  const handleRestart = () => {
    const engine = engineRef.current
    if (engine) {
      engine.cleanup()
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const factory = ENGINE_FACTORIES[gameId]
    if (!factory) return

    const newEngine = factory(ctx, canvas, buildCallbacks())
    engineRef.current = newEngine
    newEngine.start()
    setScore(0)
    setPaused(false)
    setGameOverState(false)
    setCoinsEarned(0)
  }

  // Touch control handlers
  const handleTouchStart = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    injectKey(engineRef.current as any, key, true)
  }

  const handleTouchEnd = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    injectKey(engineRef.current as any, key, false)
  }

  const currentHighScore = highScores[gameId] || 0

  return (
    <div className="game-wrapper">
      {/* Top bar */}
      <div className="game-topbar">
        <button className="btn btn-small" onClick={handleQuit}>Quit</button>
        <div className="game-info">
          <span>🪙 {Math.floor(score / 10)}</span>
          {currentHighScore > 0 && <span className="game-highscore">Best: {currentHighScore}</span>}
        </div>
        <button className="btn btn-small btn-secondary" onClick={togglePause}>
          {paused ? '▶️ Resume' : '⏸ Pause'}
        </button>
      </div>

      {/* Canvas container */}
      <div className="game-canvas-container">
        <canvas ref={canvasRef} className="game-canvas" />
        {/* Mini habitat overlay */}
        <MiniHabitatOverlay onFeedRequest={feedAll} />
      </div>

      {/* Game over overlay */}
      {gameOverState && (
        <div className="game-over-overlay">
          <div className="game-over-card card">
            <h2>Game Over!</h2>
            <p>Score: {score}</p>
            <p>Coins earned: 🪙 {coinsEarned}</p>
            {score >= currentHighScore && score > 0 && (
              <p className="new-highscore">New High Score! 🎉</p>
            )}
            <div className="game-over-buttons">
              <button className="btn" onClick={handleRestart}>Play Again</button>
              <button className="btn btn-secondary" onClick={handleQuit}>Quit</button>
            </div>
          </div>
        </div>
      )}

      {/* Touch controls */}
      <div className="touch-controls">
        <div className="touch-dpad">
          <button
            className="touch-btn touch-up"
            onTouchStart={handleTouchStart('ArrowUp')}
            onTouchEnd={handleTouchEnd('ArrowUp')}
            onMouseDown={handleTouchStart('ArrowUp')}
            onMouseUp={handleTouchEnd('ArrowUp')}
          >▲</button>
          <div className="touch-dpad-row">
            <button
              className="touch-btn touch-left"
              onTouchStart={handleTouchStart('ArrowLeft')}
              onTouchEnd={handleTouchEnd('ArrowLeft')}
              onMouseDown={handleTouchStart('ArrowLeft')}
              onMouseUp={handleTouchEnd('ArrowLeft')}
            >◀</button>
            <button
              className="touch-btn touch-right"
              onTouchStart={handleTouchStart('ArrowRight')}
              onTouchEnd={handleTouchEnd('ArrowRight')}
              onMouseDown={handleTouchStart('ArrowRight')}
              onMouseUp={handleTouchEnd('ArrowRight')}
            >▶</button>
          </div>
          <button
            className="touch-btn touch-down"
            onTouchStart={handleTouchStart('ArrowDown')}
            onTouchEnd={handleTouchEnd('ArrowDown')}
            onMouseDown={handleTouchStart('ArrowDown')}
            onMouseUp={handleTouchEnd('ArrowDown')}
          >▼</button>
        </div>

        <button
          className="touch-btn touch-fire"
          onTouchStart={handleTouchStart(' ')}
          onTouchEnd={handleTouchEnd(' ')}
          onMouseDown={handleTouchStart(' ')}
          onMouseUp={handleTouchEnd(' ')}
        >🔥</button>
      </div>
    </div>
  )
}
