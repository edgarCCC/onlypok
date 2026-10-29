import {
  Home, CalendarDays, Layers, Users, MessageSquare, TrendingUp,
  type LucideIcon,
} from 'lucide-react'

/* ── Design tokens partagés par la navigation coach ──────────────────────── */
export const NAV = {
  bg:      'rgba(4,4,10,0.95)',
  panel:   'rgba(9,10,16,0.98)',
  border:  'rgba(255,255,255,0.07)',
  cream:   '#e8eaf0',
  dim:     'rgba(232,234,240,0.42)',
  faint:   'rgba(232,234,240,0.25)',
  violet:  '#7c3aed',
  amber:   '#f59e0b',
  red:     '#ef4444',
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

/* 6 onglets visibles. Agenda regroupe Demandes / Sessions / Calendrier,
   Contenus pointe sur la gestion des contenus (sortie du dashboard à l'étape 3). */
export const COACH_TABS: CoachTab[] = [
  { href: '/coach/dashboard',         label: 'Accueil',  icon: Home,          match: ['/coach/dashboard'], mobile: true },
  { href: '/coach/agenda',            label: 'Agenda',   icon: CalendarDays,  match: ['/coach/agenda', '/coach/requests', '/coach/sessions', '/coach/calendar'], badge: 'agenda', mobile: true },
  { href: '/coach/dashboard#content', label: 'Contenus', icon: Layers,        match: ['/coach/formations'], mobile: true },
  { href: '/coach/students',          label: 'Élèves',   icon: Users,         match: ['/coach/students'] },
  { href: '/coach/messages',          label: 'Messages', icon: MessageSquare, match: ['/coach/messages'], badge: 'messages', mobile: true },
  { href: '/coach/revenue',           label: 'Revenus',  icon: TrendingUp,    match: ['/coach/revenue'] },
]

export function isTabActive(tab: CoachTab, pathname: string): boolean {
  return tab.match.some(p => pathname === p || pathname.startsWith(p + '/'))
}
