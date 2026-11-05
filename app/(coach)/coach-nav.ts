import {
  Home, CalendarDays, Layers, Users, MessageSquare, TrendingUp, Target, BarChart2,
  type LucideIcon,
} from 'lucide-react'

/* ── Design tokens partagés par la navigation coach ──────────────────────── */
export const NAV = {
  bg:      'var(--bg)',
  panel:   'var(--bg)',
  border:  'color-mix(in srgb, var(--overlay) 7%, transparent)',
  cream:   'var(--text)',
  dim:     'var(--text-2)',
  faint:   'var(--text-3)',
  violet:  'var(--brand)',
  amber:   'var(--brand)',
  red:     'var(--error)',
} as const

export type BadgeKey = 'agenda' | 'messages'

export interface CoachTab {
  href: string
  label: string
  icon: LucideIcon
  /* préfixes d'URL qui rendent l'onglet actif (pages fusionnées dans l'onglet) */
  match: string[]
  badge?: BadgeKey
  /* affiché dans la barre du bas sur mobile (sinon dans « Plus ») */
  mobile?: boolean
}

/* 8 onglets visibles. Agenda regroupe Demandes / Sessions / Calendrier,
   Contenus pointe sur la gestion des contenus (sortie du dashboard à l'étape 3).
   Trainer et Tracker, comme dans le header élève ; sur téléphone, ils sont dans « Plus ». */
export const COACH_TABS: CoachTab[] = [
  { href: '/coach/dashboard',         label: 'Accueil',  icon: Home,          match: ['/coach/dashboard'], mobile: true },
  { href: '/coach/agenda',            label: 'Agenda',   icon: CalendarDays,  match: ['/coach/agenda', '/coach/requests', '/coach/sessions', '/coach/calendar'], badge: 'agenda', mobile: true },
  { href: '/coach/dashboard#content', label: 'Contenus', icon: Layers,        match: ['/coach/formations'], mobile: true },
  { href: '/coach/students',          label: 'Élèves',   icon: Users,         match: ['/coach/students'] },
  { href: '/coach/messages',          label: 'Messages', icon: MessageSquare, match: ['/coach/messages'], badge: 'messages', mobile: true },
  { href: '/coach/revenue',           label: 'Revenus',  icon: TrendingUp,    match: ['/coach/revenue'] },
  { href: '/coach/trainer',           label: 'Trainer',  icon: Target,        match: ['/coach/trainer', '/trainer'] },
  { href: '/tracker',                 label: 'Tracker',  icon: BarChart2,     match: ['/tracker'] },
]

export function isTabActive(tab: CoachTab, pathname: string): boolean {
  return tab.match.some(p => pathname === p || pathname.startsWith(p + '/'))
}
