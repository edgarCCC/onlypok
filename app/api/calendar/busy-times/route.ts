import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchPublicText } from '@/lib/net-guard'
import { DEFAULT_COACH_TIMEZONE, getZonedParts, isValidTimeZone, zonedTimeToUtc } from '@/lib/timezone'

export const runtime = 'nodejs'

/* ── Minimal ICS parser ───────────────────────────────────────── */
/* date/hour sont exprimés dans le fuseau du coach (heure murale), comme
   `availabilities.slot` : Europe/Paris tant qu'aucune colonne profiles.timezone n'existe. */
type BusySlot = { date: string; hour: string } // "2026-05-04", "14:00"

const COACH_TIMEZONE = DEFAULT_COACH_TIMEZONE
const HOUR_MS = 3600000
const MAX_HOURS_PER_EVENT = 24 * 31 // garde-fou contre un DTEND aberrant

const pad = (n: number) => String(n).padStart(2, '0')

function parseIcs(text: string, weekStart: Date, weekEnd: Date, timeZone: string): BusySlot[] {
  const results: BusySlot[] = []
  const seen = new Set<string>()
  const events = text.split('BEGIN:VEVENT').slice(1)

  for (const block of events) {
    // DTSTART;TZID=Europe/Paris:20260504T140000 | DTSTART:20260504T120000Z | DTSTART;VALUE=DATE:20260504
    const dtStartMatch = block.match(/DTSTART([^:\r\n]*):(\d{8}(?:T\d{4,6}Z?)?)/i)
    const dtEndMatch   = block.match(/DTEND([^:\r\n]*):(\d{8}(?:T\d{4,6}Z?)?)/i)
    if (!dtStartMatch) continue

    const start = parseIcsDate(dtStartMatch[2], tzidOf(dtStartMatch[1]) ?? timeZone)
    const end   = dtEndMatch ? parseIcsDate(dtEndMatch[2], tzidOf(dtEndMatch[1]) ?? timeZone) : null
    if (!start) continue

    /* Une entrée par heure occupée, en heure murale du coach */
    const limit = end && end > start ? end.getTime() : start.getTime() + HOUR_MS
    let cursor  = Math.floor(start.getTime() / HOUR_MS) * HOUR_MS // aligné sur l'heure pleine
    for (let i = 0; cursor < limit && i < MAX_HOURS_PER_EVENT; i++, cursor += HOUR_MS) {
      if (cursor < weekStart.getTime() || cursor >= weekEnd.getTime()) continue
      const p = getZonedParts(new Date(cursor), timeZone)
      const slot = { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, hour: `${pad(p.hour)}:${pad(p.minute)}` }
      const key = `${slot.date} ${slot.hour}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push(slot)
    }
  }

  return results
}

/* Paramètre TZID=… d'une propriété ICS, s'il désigne un fuseau IANA connu */
function tzidOf(params: string): string | null {
  const m = params.match(/TZID=("?)([^;:"]+)\1/i)
  return m && isValidTimeZone(m[2]) ? m[2] : null
}

/* Heure UTC (suffixe Z) → instant exact. Heure « flottante » ou avec TZID →
   heure murale dans le fuseau donné. Journée entière → minuit dans ce fuseau. */
function parseIcsDate(raw: string, timeZone: string): Date | null {
  const y = Number(raw.slice(0, 4)), mo = Number(raw.slice(4, 6)), d = Number(raw.slice(6, 8))
  if (!y || !mo || !d) return null
  if (raw.length === 8) return zonedTimeToUtc(y, mo, d, 0, 0, timeZone)
  const h = Number(raw.slice(9, 11)), mi = Number(raw.slice(11, 13))
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null
  if (raw.endsWith('Z')) return new Date(Date.UTC(y, mo - 1, d, h, mi))
  return zonedTimeToUtc(y, mo, d, h, mi, timeZone)
}

/* ── Route ────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  /* Get cal_url from profile */
  const { data: profile } = await supabase
    .from('profiles')
    .select('cal_url')
    .eq('id', user.id)
    .single()

  const calUrl = profile?.cal_url
  if (!calUrl) return NextResponse.json({ busy: [] })

  /* Parse week param — defaults to current week Mon */
  // Semaine en heure murale du coach : lundi 00:00 → lundi suivant 00:00 (Europe/Paris)
  const weekParam = req.nextUrl.searchParams.get('week') // "2026-05-04"
  const monday    = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
    ? { y: Number(weekParam.slice(0, 4)), m: Number(weekParam.slice(5, 7)), d: Number(weekParam.slice(8, 10)) }
    : currentMonday(COACH_TIMEZONE)
  const weekStart = zonedTimeToUtc(monday.y, monday.m, monday.d, 0, 0, COACH_TIMEZONE)
  const weekEnd   = zonedTimeToUtc(monday.y, monday.m, monday.d + 7, 0, 0, COACH_TIMEZONE)

  try {
    const icsUrl = calUrl.replace(/^webcal:\/\//i, 'https://')
    // Anti-SSRF : l'URL de calendrier est fournie par le coach ; on impose https
    // et on rejette toute IP interne. La réponse ICS est bornée en taille.
    const text = await fetchPublicText(icsUrl, {
      protocols: ['https:'],
      headers: { 'User-Agent': 'OnlyPok/1.0 Calendar Sync' },
      timeoutMs: 8000,
    })
    const busy = parseIcs(text, weekStart, weekEnd, COACH_TIMEZONE)
    return NextResponse.json({ busy })
  } catch (err: unknown) {
    // On ne renvoie jamais le message brut (oracle SSRF) : réponse générique.
    console.error('[calendar/busy-times]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Calendrier indisponible', busy: [] }, { status: 502 })
  }
}

/* Lundi de la semaine courante, en date murale du fuseau donné */
function currentMonday(timeZone: string): { y: number; m: number; d: number } {
  const p   = getZonedParts(new Date(), timeZone)
  const dow = (p.weekday + 6) % 7 // 0 = lundi
  const cal = new Date(Date.UTC(p.year, p.month - 1, p.day - dow))
  return { y: cal.getUTCFullYear(), m: cal.getUTCMonth() + 1, d: cal.getUTCDate() }
}
