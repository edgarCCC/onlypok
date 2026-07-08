// ── Series config shared between the dashboard page and the lazy-loaded charts ──
export const SERIES_CFG = [
  { key: 'betclic_spin', label: 'Expresso', color: '#7c3aed', dash: undefined,  room: 'betclic', spin: true  },
  { key: 'betclic_mtt',  label: 'Tournois', color: '#a78bfa', dash: '5 3',      room: 'betclic', spin: false },
  { key: 'winamax_mtt',  label: 'Tournois', color: '#fb923c', dash: undefined,  room: 'winamax', spin: false },
  { key: 'winamax_spin', label: 'Expresso', color: '#fbbf24', dash: '5 3',      room: 'winamax', spin: true  },
] as const

export type SeriesKey = typeof SERIES_CFG[number]['key']
