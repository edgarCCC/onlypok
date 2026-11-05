'use client'
import { Star } from 'lucide-react'

/* ─── Design tokens de l'annuaire coachs ──────────────────────────────────────
   Tout passe par les tokens de la palette : aucune couleur par coach, l'accent est réservé aux actions et aux états. */
export const BG       = 'var(--bg)'
export const CREAM    = 'var(--text)'
export const MUTED    = 'var(--text-2)'
export const SILVER   = 'var(--text-3)'
export const DIM      = 'var(--border)'
export const CARD     = 'var(--surface)'
export const CARD_HOV = 'var(--surface)'
export const BORDER_HOV = 'color-mix(in srgb, var(--accent) 45%, transparent)'
export const VIO      = 'var(--brand)'
export const CYAN     = 'var(--brand)'
/* L'accent garde le rôle de l'ancien ambre : les prix et les notes. */
export const AMBER    = 'var(--accent-text)'

export const VARIANTS_LIST = ['NLH', 'PLO', 'MTT', 'Cash', 'Expresso', 'SNG', 'PKO', 'Heads-Up']

export const PRICE_OPTS = [
  { label: '< €50/h',   min: 0,   max: 49 },
  { label: '€50–100',   min: 50,  max: 100 },
  { label: '€100–150',  min: 101, max: 150 },
  { label: '€150+',     min: 151, max: 99999 },
]

export function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size}
          fill={s <= Math.round(rating) ? 'var(--accent)' : 'none'}
          color={s <= Math.round(rating) ? 'var(--accent)' : 'var(--text-3)'}
        />
      ))}
    </div>
  )
}
