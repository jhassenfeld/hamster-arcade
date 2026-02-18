import './HungerBar.css'

interface Props {
  hunger: number
  size?: 'small' | 'normal'
}

export default function HungerBar({ hunger, size = 'normal' }: Props) {
  const display = Math.max(0, Math.floor(hunger))
  const color = hunger > 60 ? '#4CAF50' : hunger > 30 ? '#FFC107' : 'var(--danger)'
  const pulsing = hunger <= 30 && hunger > 0

  return (
    <div className={`hunger-bar hunger-bar-${size} ${pulsing ? 'hunger-pulse' : ''}`}>
      <div
        className="hunger-bar-fill"
        style={{
          width: `${display}%`,
          backgroundColor: color,
        }}
      />
      {size === 'normal' && (
        <span className="hunger-bar-label">{display}</span>
      )}
    </div>
  )
}
