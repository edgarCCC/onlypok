'use client'
import { Star } from 'lucide-react'

/* ─── Design tokens de l'annuaire coachs ──────────────────────────────────────
   Palette volontairement restreinte : neutres teintés + 3 accents de marque.
   Violet/cyan = action principale, ambre = note & prix (sémantique coaching).
   Pas de couleur par coach : les cartes restent neutres, l'accent est réservé
   aux actions et aux états. */
export const BG       = '#07090e'
export const CREAM    = '#f0f4ff'
export const MUTED    = 'rgba(232,228,220,0.45)'
export const SILVER   = 'rgba(232,228,220,0.28)'
export const DIM      = 'rgba(232,228,220,0.07)'
export const CARD     = 'rgba(255,255,255,0.028)'
export const CARD_HOV = 'rgba(255,255,255,0.048)'
export const BORDER_HOV = 'rgba(232,228,220,0.16)'
export const VIO      = '#7c3aed'
export const CYAN     = '#06b6d4'
export const AMBER    = '#f59e0b'
/* CTA de l'univers coach — dégradé 3 teintes : la classe .op-cta l'étire et
   le fait dériver lentement (background-position animé) pour un effet vivant */
export const AMBER_GRAD = 'linear-gradient(110deg, #ea580c, #f59e0b, #fbbf24)'

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
          fill={s <= Math.round(rating) ? AMBER : 'none'}
          color={s <= Math.round(rating) ? AMBER : 'rgba(232,228,220,0.18)'}
        />
      ))}
    </div>
  )
}
