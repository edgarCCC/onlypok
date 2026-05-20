import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/* ── Minimal ICS parser ───────────────────────────────────────── */
type BusySlot = { date: string; hour: string } // "2026-05-04", "14:00"

function parseIcs(text: string, weekStart: Date, weekEnd: Date): BusySlot[] {
  const results: BusySlot[] = []
  const events = text.split('BEGIN:VEVENT').slice(1)

  for (const block of events) {
    const dtStartMatch = block.match(/DTSTART(?:[^:]*)?:([\dTZ]+)/i)
    const dtEndMatch   = block.match(/DTEND(?:[^:]*)?:([\dTZ]+)/i)
    if (!dtStartMatch) continue

    const start = parseIcsDate(dtStartMatch[1])
    const end   = dtEndMatch ? parseIcsDate(dtEndMatch[1]) : null
    if (!start) continue

    /* Generate one slot per occupied hour */
    const cursor = new Date(start)
    const limit  = end ? new Date(end) : new Date(start.getTime() + 3600000)

    while (cursor < limit) {
      if (cursor >= weekStart && cursor < weekEnd) {
        const dateStr = cursor.toISOString().slice(0, 10)
        const hour    = cursor.toTimeString().slice(0, 5)
        results.push({ date: dateStr, hour })
      }
      cursor.setHours(cursor.getHours() + 1)
    }
  }

  return results
}

function parseIcsDate(raw: string): Date | null {
  try {
    /* All-day: YYYYMMDD */
    if (/^\d{8}$/.test(raw)) {
      return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T00:00:00Z`)
    }
    /* UTC: YYYYMMDDTHHmmssZ */
    if (raw.endsWith('Z')) {
      const y = raw.slice(0,4), mo = raw.slice(4,6), d = raw.slice(6,8)
      const h = raw.slice(9,11), mi = raw.slice(11,13)
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`)
    }
    /* Floating local: YYYYMMDDTHHmmss (treat as UTC for simplicity) */
    if (/^\d{15}$/.test(raw.replace('T',''))) {
      const y = raw.slice(0,4), mo = raw.slice(4,6), d = raw.slice(6,8)
      const h = raw.slice(9,11), mi = raw.slice(11,13)
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`)
    }
    return null
  } catch {
    return null
  }
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
  const weekParam = req.nextUrl.searchParams.get('week') // "2026-05-04"
  const weekStart = weekParam ? new Date(`${weekParam}T00:00:00Z`) : getMondayUTC(new Date())
  const weekEnd   = new Date(weekStart.getTime() + 7 * 86400000)

  try {
    const icsUrl = calUrl.replace(/^webcal:\/\//i, 'https://')
    const res = await fetch(icsUrl, {
      headers: { 'User-Agent': 'OnlyPok/1.0 Calendar Sync' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`ICS fetch failed: ${res.status}`)
    const text = await res.text()
    const busy = parseIcs(text, weekStart, weekEnd)
    return NextResponse.json({ busy })
  } catch (err: any) {
    console.error('[calendar/busy-times]', err.message)
    return NextResponse.json({ error: err.message, busy: [] }, { status: 502 })
  }
}

function getMondayUTC(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return d
}
