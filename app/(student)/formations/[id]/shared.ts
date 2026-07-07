/* ─── Shared constants & pure helpers for the formation detail page ─────────── */

export const CREAM  = '#f0f4ff'
export const SILVER = 'rgba(240,244,255,0.45)'

export const VARIANT_COLORS: Record<string, string> = {
  NLH: '#7c3aed', MTT: '#7c3aed', Cash: '#06b6d4',
  Expresso: '#ef4444', Live: '#f59e0b', PLO: '#a855f7',
}
export const TYPE_COLORS: Record<string, string> = {
  formation: '#7c3aed', video: '#06b6d4', coaching: '#a855f7',
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
  { id: 'MTT',      label: 'MTT',        desc: 'Tournois multi-tables',    color: '#7c3aed' },
  { id: 'Cash',     label: 'Cash Game',  desc: 'Tables cash 6-max / HU',  color: '#06b6d4' },
  { id: 'Expresso', label: 'Expresso',   desc: 'Sit & Go hyper-turbo',    color: '#ef4444' },
  { id: 'Live',     label: 'Live',       desc: 'Poker en casino / cercle', color: '#f59e0b' },
  { id: 'PLO',      label: 'PLO',        desc: 'Pot-Limit Omaha',         color: '#a855f7' },
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
  formations: '#7c3aed', videos: '#06b6d4', coaching: '#a855f7',
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
export function generateSlots(
  availabilities: { day_of_week: number; slot: string }[],
  bookedTimestamps: string[],
  weeksAhead = 8
): Date[] {
  const now    = new Date()
  const cutoff = new Date(now.getTime() + weeksAhead * 7 * 24 * 3600 * 1000)
  const booked = new Set(bookedTimestamps.map(t => new Date(t).toISOString()))
  const result: Date[] = []
  for (const avail of availabilities) {
    const jsDow = avail.day_of_week % 7
    const [hh, mm] = avail.slot.split(':').map(Number)
    const cur = new Date(now)
    const diff = (jsDow - cur.getDay() + 7) % 7
    cur.setDate(cur.getDate() + (diff === 0 ? 0 : diff))
    cur.setHours(hh, mm, 0, 0)
    if (cur <= now) cur.setDate(cur.getDate() + 7)
    while (cur <= cutoff) {
      if (!booked.has(cur.toISOString())) result.push(new Date(cur))
      cur.setDate(cur.getDate() + 7)
    }
  }
  result.sort((a, b) => a.getTime() - b.getTime())
  return result
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
