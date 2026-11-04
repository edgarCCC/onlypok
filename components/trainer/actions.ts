/* Le vocabulaire du trainer : les positions, les profondeurs, et la famille visuelle de chaque action. */
export type Position = 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB'
export type ActionFamily = 'raise' | 'allin' | 'limp' | 'threebet' | 'call' | 'tight' | 'loose' | 'fold'

export const POSITIONS: Position[] = ['LJ', 'HJ', 'CO', 'BTN', 'SB']
export const STACKS = [100, 50, 25, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]
export const TOTAL_COMBOS = 1326
export const SEATS = ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const

export const CUSTOM_ACTIONS = ['Raise', 'All-in', '3-bet', 'Call', 'Limp', 'Fold'] as const
export type CustomAction = typeof CUSTOM_ACTIONS[number]

export function familyOf(action?: string | null): ActionFamily {
  if (!action) return 'fold'
  if (action.startsWith('Raise')) return 'raise'
  if (action === 'All-in') return 'allin'
  if (action === 'Limp') return 'limp'
  if (action === '3-bet') return 'threebet'
  if (action === 'Call') return 'call'
  if (action === 'Tightifie') return 'tight'
  if (action === 'Loosifie') return 'loose'
  return 'fold'
}

/** Raccourci clavier de chaque action jouable. */
export const ACTION_KEY: Record<string, string> = { Fold: 'f', Raise: 'r', 'All-in': 'a', Limp: 'l', Tightifie: 't', Loosifie: 'o' }

export const formatPct = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
