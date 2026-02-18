import { type Hamster } from '../state/gameStore'
import './HamsterSprite.css'

interface Props {
  hamster: Hamster
  size?: 'small' | 'medium' | 'large'
  onClick?: () => void
  showName?: boolean
}

// Map hamster colors to image variants (1-4)
// Colors cycle through: #F4A460, #D2B48C, #DEB887, #FFDAB9, #E8C8A0, #C8A882, #B8956A, #F5DEB3
const COLOR_TO_VARIANT: Record<string, number> = {
  '#F4A460': 1, // sandy brown → golden hamster
  '#D2B48C': 2, // tan → brown hamster
  '#DEB887': 1, // burlywood → golden hamster
  '#FFDAB9': 3, // peach → grey hamster
  '#E8C8A0': 2, // light tan → brown hamster
  '#C8A882': 4, // darker tan → dark brown hamster
  '#B8956A': 4, // brown → dark brown hamster
  '#F5DEB3': 3, // wheat → grey hamster
}

function getImageVariant(color: string): number {
  return COLOR_TO_VARIANT[color] || ((color.charCodeAt(1) % 4) + 1)
}

export default function HamsterSprite({ hamster, size = 'medium', onClick, showName = true }: Props) {
  const sizeClass = `hamster-${size}`
  const expressionClass = `expr-${hamster.expression}`
  const healthClass = `health-${hamster.health}`
  const variant = getImageVariant(hamster.color)
  const imgSrc = `/hamsters/hamster-${variant}.png`

  return (
    <div
      className={`hamster-sprite ${sizeClass} ${expressionClass} ${healthClass}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="hamster-body">
        <img
          className="hamster-img"
          src={imgSrc}
          alt={hamster.name}
          draggable={false}
        />

        {/* Accessories */}
        {hamster.accessories.includes('hat') && <div className="accessory accessory-hat">🎩</div>}
        {hamster.accessories.includes('crown') && <div className="accessory accessory-hat">👑</div>}
        {hamster.accessories.includes('bow-tie') && <div className="accessory accessory-bowtie">🎀</div>}
        {hamster.accessories.includes('sunglasses') && <div className="accessory accessory-sunglasses">🕶️</div>}
        {hamster.accessories.includes('cape') && <div className="accessory accessory-cape">🦸</div>}
      </div>

      {showName && size !== 'small' && (
        <div className="hamster-name">{hamster.name}</div>
      )}
    </div>
  )
}
