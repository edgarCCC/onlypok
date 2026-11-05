import type { CSSProperties } from 'react'
import { cx } from '@/lib/cx'
import { ALL_169, getGridCoords } from '@/lib/ranges/gto'
import { verdictLookup, type OpeningRange } from '@/lib/ranges/drill'

interface RangeGridProps {
  range: OpeningRange
  /** Main courante : mise en évidence, et point de départ de la révélation. */
  hand?: string
  /** Révélée : les cellules prennent leurs trois paliers (range, frontière, hors range). */
  revealed: boolean
  /** Fragment : plus petite, sans étiquettes. */
  mini?: boolean
  className?: string
}

/** Grille 13 × 13, aria-hidden : elle est doublée d'une phrase lisible dans le composant appelant.
    Avant la révélation : trois surfaces réelles (paires, assorties, dépareillées). Ensuite, la révélation part de la main jouée :
    c'est ta réponse qui ouvre la grille (apple-design §8, le mouvement dit d'où vient le résultat). */
export default function RangeGrid({ range, hand, revealed, mini = false, className }: RangeGridProps) {
  const verdictOf = verdictLookup(range)
  const origin = hand ? getGridCoords(hand) : null
  return (
    <div className={cx('lp-rg', revealed && 'is-revealed', mini && 'lp-rg-mini', className)} aria-hidden="true">
      {ALL_169.map((combo) => {
        const verdict = verdictOf(combo)
        const tier = combo.length === 2 ? 'p' : combo.endsWith('s') ? 's' : 'o'
        const [row, col] = getGridCoords(combo)
        const distance = origin ? Math.max(Math.abs(row - origin[0]), Math.abs(col - origin[1])) : 0
        return (
          <div
            key={combo}
            className={cx('c', tier, verdict === 'in' && 'in', verdict === 'allin' && 'ai', verdict === 'border' && 'bd', combo === hand && 'cur')}
            style={{ '--d': distance } as CSSProperties}
          >
            {mini ? null : combo}
          </div>
        )
      })}
    </div>
  )
}
