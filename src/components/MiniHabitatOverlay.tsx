import { useState, useEffect, useCallback, useRef } from 'react'
import { useGameStore } from '../state/gameStore'
import { getReaction, type ReactionEvent, type Reaction } from '../utils/hamsterReactions'
import HamsterSprite from './HamsterSprite'
import './MiniHabitatOverlay.css'

interface Props {
  onFeedRequest?: () => void
}

export interface MiniHabitatRef {
  triggerReaction: (event: ReactionEvent) => void
}

export default function MiniHabitatOverlay({ onFeedRequest }: Props) {
  const hamsters = useGameStore((s) => s.hamsters)
  const livingHamsters = hamsters.filter(h => h.health !== 'dead')

  const [currentReaction, setCurrentReaction] = useState<Reaction | null>(null)
  const [bubble, setBubble] = useState<string>('')
  const lastActionTime = useRef(Date.now())
  const idleTimerRef = useRef<number | null>(null)
  const reactionTimeoutRef = useRef<number | null>(null)

  // Track hungry hamsters
  const hungryHamsters = livingHamsters.filter(h => h.hunger <= 30)
  const hungryAlerted = useRef(false)

  const triggerReaction = useCallback((event: ReactionEvent) => {
    lastActionTime.current = Date.now()
    const reaction = getReaction(event)
    setCurrentReaction(reaction)
    setBubble(reaction.bubble)

    // Clear previous timeout
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current)
    }

    reactionTimeoutRef.current = window.setTimeout(() => {
      setCurrentReaction(null)
      setBubble('')
    }, reaction.duration)
  }, [])

  // Expose triggerReaction globally for GameWrapper to call
  useEffect(() => {
    (window as any).__miniHabitatTrigger = triggerReaction
    return () => {
      delete (window as any).__miniHabitatTrigger
    }
  }, [triggerReaction])

  // Idle detection
  useEffect(() => {
    idleTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - lastActionTime.current
      if (elapsed > 5000 && !currentReaction) {
        triggerReaction('idle')
      }
    }, 1000)

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current)
    }
  }, [currentReaction, triggerReaction])

  // Hungry detection
  useEffect(() => {
    if (hungryHamsters.length > 0 && !hungryAlerted.current) {
      hungryAlerted.current = true
      triggerReaction('hungry-during-game')
    } else if (hungryHamsters.length === 0) {
      hungryAlerted.current = false
    }
  }, [hungryHamsters.length, triggerReaction])

  // Cleanup
  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current)
      if (idleTimerRef.current) clearInterval(idleTimerRef.current)
    }
  }, [])

  const animClass = currentReaction ? `mini-anim-${currentReaction.animation}` : ''

  return (
    <div className="mini-habitat-overlay">
      <div className="mini-habitat-inner">
        {livingHamsters.slice(0, 4).map((h) => (
          <div key={h.id} className={`mini-hamster ${animClass}`}>
            <HamsterSprite
              hamster={{
                ...h,
                expression: currentReaction?.expression || h.expression,
              }}
              size="small"
              showName={false}
            />
          </div>
        ))}

        {/* Speech bubble */}
        {bubble && (
          <div className="mini-bubble">
            {bubble}
          </div>
        )}
      </div>

      {/* Feed shortcut */}
      {hungryHamsters.length > 0 && onFeedRequest && (
        <button className="mini-feed-btn" onClick={onFeedRequest}>
          🥕
        </button>
      )}
    </div>
  )
}
