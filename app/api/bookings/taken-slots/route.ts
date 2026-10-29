import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /api/bookings/taken-slots?coach_id=xxx
// Créneaux futurs déjà occupés chez ce coach (réservés ou en attente de validation).
// Service-role : la RLS cache à l'élève les réservations des autres élèves, le
// calendrier proposait donc des créneaux déjà pris. On ne renvoie QUE les dates,
// jamais l'identité des élèves.
export async function GET(req: NextRequest) {
  const coachId = req.nextUrl.searchParams.get('coach_id')
  if (!coachId || !UUID_RE.test(coachId)) {
    return NextResponse.json({ error: 'Invalid coach_id' }, { status: 400 })
  }

  // x-real-ip est posé par Vercel (non falsifiable par le client) ; la limite
  // par coach borne aussi l'abus si l'IP change à chaque requête.
  const ip = req.headers.get('x-real-ip') ?? 'unknown'
  const byIp    = rateLimit(`taken-slots:ip:${ip}`, 60, 60_000)
  if (!byIp.ok) return tooManyRequests(byIp.retryAfter)
  const byCoach = rateLimit(`taken-slots:coach:${coachId}`, 300, 60_000)
  if (!byCoach.ok) return tooManyRequests(byCoach.retryAfter)

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('bookings')
    .select('scheduled_at')
    .eq('coach_id', coachId)
    .in('status', ['scheduled', 'pending_coach_approval'])
    .gte('scheduled_at', new Date().toISOString())

  if (error) {
    console.error('[bookings/taken-slots]', error.message)
    return NextResponse.json({ error: 'Indisponible', taken: [] }, { status: 500 })
  }

  const taken = (data ?? []).map(b => b.scheduled_at).filter(Boolean)
  return NextResponse.json({ taken })
}
