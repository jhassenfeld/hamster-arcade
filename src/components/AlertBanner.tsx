import { useGameStore } from '../state/gameStore'
import './AlertBanner.css'

export default function AlertBanner() {
  const hamsters = useGameStore((s) => s.hamsters)

  const sickHamsters = hamsters.filter(h => h.health === 'sick')
  const hungryHamsters = hamsters.filter(h => h.health === 'hungry')

  if (sickHamsters.length === 0 && hungryHamsters.length === 0) return null

  const message = sickHamsters.length > 0
    ? sickHamsters.length === 1
      ? `${sickHamsters[0].name} is sick!`
      : `${sickHamsters.length} hamsters are sick!`
    : hungryHamsters.length === 1
      ? `${hungryHamsters[0].name} is hungry!`
      : `${hungryHamsters.length} hamsters are hungry!`

  const isSick = sickHamsters.length > 0

  return (
    <div className={`alert-banner ${isSick ? 'alert-sick' : 'alert-hungry'}`}>
      <span className="alert-icon">{isSick ? '🚨' : '⚠️'}</span>
      <span>{message}</span>
    </div>
  )
}
