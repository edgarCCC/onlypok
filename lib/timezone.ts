/* ─── Fuseaux horaires — sans dépendance, uniquement Intl ────────────────────
   `availabilities.slot` vaut 'HH:MM' SANS fuseau : c'est l'heure murale du
   coach. Tant qu'aucune colonne `profiles.timezone` n'existe, tous les coachs
   sont réputés être à Paris. Utilisable côté client et côté serveur. */

export const DEFAULT_COACH_TIMEZONE = 'Europe/Paris'

/* Délai (heures) laissé au coach pour accepter ou refuser une demande.
   Source unique, importable côté client comme côté serveur (emails, planning élève).
   Purement informatif : aucune expiration automatique n'existe à ce jour. */
export const COACH_APPROVAL_HOURS = 48

const HOUR_MS = 3600_000
const DAY_MS  = 24 * HOUR_MS

export type ZonedParts = {
  year: number
  month: number   // 1-12
  day: number
  hour: number    // 0-23
  minute: number
  weekday: number // 0 = dimanche … 6 = samedi (convention JS)
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const formatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone)
  if (cached) return cached
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  formatterCache.set(timeZone, f)
  return f
}

/** Vrai si `timeZone` est un identifiant IANA reconnu par Intl. */
export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** Heure murale d'un instant dans un fuseau donné. */
export function getZonedParts(date: Date, timeZone: string = DEFAULT_COACH_TIMEZONE): ZonedParts {
  const map: Record<string, string> = {}
  for (const p of partsFormatter(timeZone).formatToParts(date)) map[p.type] = p.value
  return {
    year:    Number(map.year),
    month:   Number(map.month),
    day:     Number(map.day),
    hour:    Number(map.hour) % 24,
    minute:  Number(map.minute),
    weekday: WEEKDAYS[map.weekday] ?? 0,
  }
}

/* Décalage (ms) du fuseau à un instant donné : heure murale − UTC. */
function offsetMs(instantMs: number, timeZone: string): number {
  const p = getZonedParts(new Date(instantMs), timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  return asUtc - Math.floor(instantMs / 60_000) * 60_000
}

/** Convertit une heure murale (dans `timeZone`) en instant UTC.
    Gère les changements d'heure ; une heure inexistante (saut de printemps)
    est décalée vers l'avant. `month` est 1-12. */
export function zonedTimeToUtc(
  year: number, month: number, day: number, hour: number, minute: number,
  timeZone: string = DEFAULT_COACH_TIMEZONE,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const first = guess - offsetMs(guess, timeZone)
  const second = guess - offsetMs(first, timeZone)
  return new Date(second)
}

/** Fuseau du navigateur (ou du serveur), repli sur le fuseau coach. */
export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_COACH_TIMEZONE
  } catch {
    return DEFAULT_COACH_TIMEZONE
  }
}

/** Libellé court du fuseau à une date (ex. « UTC+1 », « UTC−5 »). */
export function shortTimeZoneName(date: Date, timeZone: string): string {
  try {
    const part = new Intl.DateTimeFormat('fr-FR', { timeZone, timeZoneName: 'short' })
      .formatToParts(date)
      .find(p => p.type === 'timeZoneName')
    return part?.value ?? timeZone
  } catch {
    return timeZone
  }
}

/** Mention à afficher à côté des horaires côté élève. */
export function timeZoneNotice(coachTimeZone: string = DEFAULT_COACH_TIMEZONE, at: Date = new Date()): string {
  const local = getLocalTimeZone()
  const sameOffset = shortTimeZoneName(at, local) === shortTimeZoneName(at, coachTimeZone)
  if (local === coachTimeZone || sameOffset) {
    return `Horaires affichés à l'heure de Paris (${shortTimeZoneName(at, coachTimeZone)})`
  }
  return `Horaires convertis dans ton fuseau : ${local} (${shortTimeZoneName(at, local)}). Le coach est à l'heure de Paris (${shortTimeZoneName(at, coachTimeZone)}).`
}

/** Génère les créneaux à venir à partir des disponibilités hebdomadaires.
    `day_of_week` : 1 = lundi … 7 = dimanche ; `slot` : 'HH:MM' dans le fuseau du coach.
    Les instants renvoyés sont absolus : l'affichage local (toLocale*) les convertit
    automatiquement dans le fuseau de l'élève. */
export function generateWeeklySlots(
  availabilities: { day_of_week: number; slot: string }[],
  bookedTimestamps: string[],
  { weeksAhead = 8, timeZone = DEFAULT_COACH_TIMEZONE, now = new Date() }: {
    weeksAhead?: number; timeZone?: string; now?: Date
  } = {},
): Date[] {
  const cutoff = now.getTime() + weeksAhead * 7 * DAY_MS
  const booked = new Set(
    bookedTimestamps.map(t => new Date(t)).filter(d => !Number.isNaN(d.getTime())).map(d => d.toISOString()),
  )
  const today = getZonedParts(now, timeZone)
  const seen = new Set<number>()
  const result: Date[] = []

  for (const avail of availabilities) {
    const [hh, mm] = avail.slot.split(':').map(Number)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue
    const diff = ((avail.day_of_week % 7) - today.weekday + 7) % 7
    // weeksAhead + 1 itérations : couvre la semaine partielle en fin de fenêtre
    for (let week = 0; week <= weeksAhead; week++) {
      // Arithmétique de calendrier en UTC pur (pas de décalage local)
      const cal = new Date(Date.UTC(today.year, today.month - 1, today.day + diff + week * 7))
      const slot = zonedTimeToUtc(cal.getUTCFullYear(), cal.getUTCMonth() + 1, cal.getUTCDate(), hh, mm, timeZone)
      const t = slot.getTime()
      if (t <= now.getTime() || t > cutoff) continue
      if (booked.has(slot.toISOString()) || seen.has(t)) continue
      seen.add(t)
      result.push(slot)
    }
  }
  return result.sort((a, b) => a.getTime() - b.getTime())
}
