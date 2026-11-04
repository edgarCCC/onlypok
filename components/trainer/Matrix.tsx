'use client'
import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { cx } from '@/lib/cx'
import { ALL_169, getGridCoords } from '@/lib/ranges/gto'
import { familyOf } from './actions'

export interface MatrixProps {
  /** Action de chaque main : `undefined` = hors range. */
  actionOf: (combo: string) => string | undefined
  /** Main mise en évidence : la main jouée, ou la main survolée. */
  current?: string | null
  /** Révélée : les cellules prennent la couleur de leur action. Sinon, trois surfaces (paires, assorties, dépareillées). */
  revealed: boolean
  /** Filtre de l'explorateur : seules ces actions gardent leur couleur. */
  filter?: string[]
  onHover?: (combo: string | null) => void
  /** Mode peinture : appui puis glisser, à la souris comme au doigt. */
  onPaint?: (combo: string) => void
}

/** Grille 13 × 13, aria-hidden : l'appelant double toujours l'information par une phrase lisible.
    La révélation part de la main jouée (apple-design §8) : c'est ta réponse qui ouvre la grille. */
export default function Matrix({ actionOf, current, revealed, filter = [], onHover, onPaint }: MatrixProps) {
  const painting = useRef(false)
  const lastPainted = useRef<string | null>(null)
  const origin = current ? getGridCoords(current) : null

  const comboAt = (event: PointerEvent) => {
    const node = document.elementFromPoint(event.clientX, event.clientY)
    return node instanceof HTMLElement ? node.dataset.combo ?? null : null
  }
  const paint = (combo: string | null) => {
    if (!combo || combo === lastPainted.current) return
    lastPainted.current = combo
    onPaint?.(combo)
  }
  const paintHandlers = onPaint ? {
    onPointerDown: (event: PointerEvent) => { event.preventDefault(); painting.current = true; lastPainted.current = null; paint(comboAt(event)) },
    onPointerMove: (event: PointerEvent) => { if (painting.current) paint(comboAt(event)) },
    onPointerUp: () => { painting.current = false },
    onPointerCancel: () => { painting.current = false },
    onPointerLeave: () => { painting.current = false },
  } : {}

  return (
    <div className={cx('tr-mx', revealed && 'is-revealed', onPaint && 'is-paint')} aria-hidden="true" onPointerLeave={onHover ? () => onHover(null) : undefined} {...paintHandlers}>
      {ALL_169.map((combo) => {
        const action = actionOf(combo)
        const tier = combo.length === 2 ? 'p' : combo.endsWith('s') ? 's' : 'o'
        const [row, col] = getGridCoords(combo)
        const distance = origin ? Math.max(Math.abs(row - origin[0]), Math.abs(col - origin[1])) : 0
        const muted = filter.length > 0 && !(action && filter.includes(action))
        return (
          <div
            key={combo}
            data-combo={combo}
            data-fam={revealed && action && !muted ? familyOf(action) : undefined}
            className={cx('c', tier, combo === current && 'cur')}
            style={{ '--d': distance } as CSSProperties}
            onPointerEnter={onHover ? () => onHover(combo) : undefined}
          >
            {combo}
          </div>
        )
      })}
    </div>
  )
}
