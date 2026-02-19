import { useGameStore } from './state/gameStore'
import HubScreen from './components/HubScreen'
import ArcadeScreen from './components/ArcadeScreen'
import ShopScreen from './components/ShopScreen'
import HamsterDetail from './components/HamsterDetail'
import GameWrapper from './games/GameWrapper'

// One-time save reset for v2 item migration
if (!localStorage.getItem('hamster-arcade-v3-reset')) {
  localStorage.removeItem('hamster-arcade-save')
  localStorage.setItem('hamster-arcade-v3-reset', '1')
  window.location.reload()
}

function App() {
  const currentScreen = useGameStore((s) => s.currentScreen)
  const currentGame = useGameStore((s) => s.currentGame)
  const navigate = useGameStore((s) => s.navigate)
  const setCurrentGame = useGameStore((s) => s.setCurrentGame)

  // If a game is active, render the game wrapper
  if (currentGame) {
    return (
      <GameWrapper
        gameId={currentGame}
        onQuit={() => {
          setCurrentGame(null)
          navigate('arcade')
        }}
      />
    )
  }

  switch (currentScreen) {
    case 'hub':
      return <HubScreen />
    case 'arcade':
      return <ArcadeScreen />
    case 'shop':
      return <ShopScreen />
    case 'hamster-detail':
      return <HamsterDetail />
    default:
      return <HubScreen />
  }
}

export default App
