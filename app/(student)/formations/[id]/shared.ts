/* ─── Shared constants & pure helpers for the formation detail page ─────────── */
import { generateWeeklySlots, DEFAULT_COACH_TIMEZONE } from '@/lib/timezone'
import { MIN_LEAD_MINUTES } from '@/lib/slots'

export const CREAM  = 'var(--text)'
export const SILVER = 'var(--text-2)'

export const VARIANT_COLORS: Record<string, string> = {
  NLH: 'var(--brand)', MTT: 'var(--brand)', Cash: 'var(--brand)',
  Expresso: 'var(--accent-text)', Live: 'var(--brand)', PLO: 'var(--brand)',
}
export const TYPE_COLORS: Record<string, string> = {
  formation: 'var(--brand)', video: 'var(--brand)', coaching: 'var(--brand)',
}
export const TYPE_LABELS: Record<string, string> = {
  formation: 'Formation', video: 'Vidéo', coaching: 'Coaching',
}

export const REVIEW_CATEGORIES = [
  { key: 'pedagogy',      label: 'Pédagogie',     desc: 'Qualité de l\'enseignement' },
  { key: 'clarity',       label: 'Clarté',         desc: 'Explications compréhensibles' },
  { key: 'communication', label: 'Communication',  desc: 'Échanges avec le coach' },
  { key: 'progress',      label: 'Progression',    desc: 'Amélioration ressentie' },
  { key: 'punctuality',   label: 'Ponctualité',    desc: 'Respect des horaires' },
  { key: 'value',         label: 'Qualité-prix',   desc: 'Rapport qualité / prix' },
]

export const VARIANT_OPTIONS = [
  { id: 'MTT',      label: 'MTT',        desc: 'Tournois multi-tables',    color: 'var(--brand)' },
  { id: 'Cash',     label: 'Cash Game',  desc: 'Tables cash 6-max / HU',  color: 'var(--brand)' },
  { id: 'Expresso', label: 'Expresso',   desc: 'Sit & Go hyper-turbo',    color: 'var(--error)' },
  { id: 'Live',     label: 'Live',       desc: 'Poker en casino / cercle', color: 'var(--brand)' },
  { id: 'PLO',      label: 'PLO',        desc: 'Pot-Limit Omaha',         color: 'var(--brand)' },
]

export const HEADER_FIELDS: Record<string, { key: string; label: string; placeholder: string; options: string[] }[]> = {
  formations: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'price',    label: 'Prix',     placeholder: 'Tous',   options: ['Gratuit', '< 30€', '30–60€', '> 60€'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 2h', '2h – 5h', '> 5h'] },
  ],
  videos: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'level',    label: 'Niveau',   placeholder: 'Tous',   options: ['Débutant', 'Intermédiaire', 'Avancé'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 15min', '15–45min', '> 45min'] },
  ],
  coaching: [
    { key: 'variant',  label: 'Variante',      placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'budget',   label: 'Budget',         placeholder: 'Tous',   options: ['< 50€/h', '50–100€/h', '> 100€/h'] },
    { key: 'dispo',    label: 'Disponibilité',  placeholder: 'Quand ?',options: ['Cette semaine', 'Ce mois', 'Flexible'] },
  ],
}

export const HEADER_TAB_COLORS: Record<string, string> = {
  formations: 'var(--accent)', videos: 'var(--accent)', coaching: 'var(--accent)',
}

/* ─── calendar helpers ──────────────────────────────────────────────────────── */
export const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
export const CAL_DAYS    = ['Lu','Ma','Me','Je','Ve','Sa','Di']

export function calFormatDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function calIsSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
export function calGetMonthDays(year: number, month: number) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { offset: (firstDay + 6) % 7, daysInMonth }
}
/* Créneaux déjà occupés chez un coach (tous élèves confondus) — via le serveur,
   la RLS ne laissant voir à l'élève que ses propres réservations. */
export async function fetchTakenSlots(coachId: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/bookings/taken-slots?coach_id=${encodeURIComponent(coachId)}`)
    if (!res.ok) return []
    const json = await res.json() as { taken?: string[] }
    return json.taken ?? []
  } catch {
    return []
  }
}

export function generateSlots(
  availabilities: { day_of_week: number; slot: string }[],
  bookedTimestamps: string[],
  weeksAhead = 8
): Date[] {
  /* 'HH:MM' = heure murale du coach (Europe/Paris) : instants absolus,
     affichés ensuite dans le fuseau du navigateur de l'élève. */
  return generateWeeklySlots(availabilities, bookedTimestamps, { weeksAhead, timeZone: DEFAULT_COACH_TIMEZONE, minLeadMinutes: MIN_LEAD_MINUTES })
}

/* ─── video url helpers ─────────────────────────────────────────────────────── */
export const getYtId    = (u: string) => u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
export const getVimeoId = (u: string) => u.match(/vimeo\.com\/(\d+)/)?.[1]

/* ─── helpers temps relatif ─────────────────────────────────────────────────── */
export function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days < 7)  return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  if (days < 30) { const w = Math.floor(days / 7);  return `Il y a ${w} semaine${w > 1 ? 's' : ''}` }
  if (days < 365){ const m = Math.floor(days / 30);  return `Il y a ${m} mois` }
  const y = Math.floor(days / 365); return `Il y a ${y} an${y > 1 ? 's' : ''}`
}

export function memberSince(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days < 30)  return 'Nouveau sur OnlyPok'
  if (days < 365) { const m = Math.floor(days / 30);  return `${m} mois sur OnlyPok` }
  const y = Math.floor(days / 365); return `${y} an${y > 1 ? 's' : ''} sur OnlyPok`
}

/* ─── rating label ──────────────────────────────────────────────────────────── */
export function ratingLabel(avg: number): { title: string; desc: string } {
  if (avg >= 4.8) return { title: 'Top Coach',       desc: 'Parmi les meilleurs coaches poker de la communauté OnlyPok.' }
  if (avg >= 4.5) return { title: 'Très recommandé', desc: 'Très bien noté par les élèves de la communauté OnlyPok.' }
  if (avg >= 4.0) return { title: 'Bien évalué',     desc: 'Reçoit une note favorable de la part des élèves.' }
  return               { title: 'Évalué',             desc: 'Évalué par la communauté des joueurs OnlyPok.' }
}
