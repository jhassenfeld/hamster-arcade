import { useGameStore } from '../state/gameStore'
import { GAME_CONFIGS } from '../data/gameConfigs'
import CoinCounter from './CoinCounter'
import './ArcadeScreen.css'

const IMPLEMENTED_GAMES = new Set(['asteroids', 'pacman', 'space-invaders', 'breakout'])

export default function ArcadeScreen() {
  const navigate = useGameStore((s) => s.navigate)
  const setCurrentGame = useGameStore((s) => s.setCurrentGame)
  const highScores = useGameStore((s) => s.highScores)
  const unlockedGames = useGameStore((s) => s.unlockedGames)

  const handlePlay = (gameId: string) => {
    if (!IMPLEMENTED_GAMES.has(gameId)) return
    if (!unlockedGames.includes(gameId)) return
    setCurrentGame(gameId)
  }

  return (
    <div className="arcade-screen screen-enter">
      <div className="arcade-header">
        <button className="btn btn-small" onClick={() => navigate('hub')}>← Back</button>
        <h2>Arcade</h2>
        <CoinCounter />
      </div>

      <div className="arcade-grid">
        {GAME_CONFIGS.map((game) => {
          const unlocked = unlockedGames.includes(game.id)
          const implemented = IMPLEMENTED_GAMES.has(game.id)
          const highScore = highScores[game.id] || 0

          return (
            <button
              key={game.id}
              className={`arcade-card card ${!implemented ? 'arcade-card-coming' : ''}`}
              onClick={() => handlePlay(game.id)}
              disabled={!implemented || !unlocked}
            >
              <span className="arcade-card-icon">{game.icon}</span>
              <h3>{game.name}</h3>
              <p className="arcade-card-desc">{game.description}</p>
              {implemented ? (
                <>
                  {highScore > 0 && (
                    <p className="arcade-card-score">Best: {highScore}</p>
                  )}
                  <p className="arcade-card-rate">{game.coinRate}</p>
                </>
              ) : (
                <p className="arcade-card-coming-text">Coming Soon</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
