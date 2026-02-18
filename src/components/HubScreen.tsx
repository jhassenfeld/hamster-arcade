import HamsterHabitat from './HamsterHabitat'
import AlertBanner from './AlertBanner'
import CoinCounter from './CoinCounter'
import LifeTimer from './LifeTimer'
import ActionBar from './ActionBar'
import './HubScreen.css'

export default function HubScreen() {
  return (
    <div className="hub-screen screen-enter">
      <div className="hub-header">
        <h1 className="hub-title">Hamster Arcade</h1>
        <div className="hub-header-right">
          <LifeTimer />
          <CoinCounter />
        </div>
      </div>
      <AlertBanner />
      <HamsterHabitat />
      <ActionBar />
    </div>
  )
}
