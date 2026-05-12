import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/bookings/check?coach_id=xxx
// Returns whether the current user has a paid booking pending schedule with this coach
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ authorized: false, reason: 'unauthenticated' })

  const coachId     = req.nextUrl.searchParams.get('coach_id')
  const formationId = req.nextUrl.searchParams.get('formation_id')

  if (!coachId) return NextResponse.json({ authorized: false, reason: 'missing_coach_id' })

  const query = supabase
    .from('bookings')
    .select('id, status, scheduled_at, formation_id, pack_index')
    .eq('student_id', user.id)
    .eq('coach_id', coachId)
    .in('status', ['paid_pending_schedule', 'scheduled'])

  if (formationId) query.eq('formation_id', formationId)

  const { data: bookings } = await query

  if (!bookings?.length) {
    return NextResponse.json({ authorized: false, reason: 'no_paid_booking' })
  }

  const pending   = bookings.filter(b => b.status === 'paid_pending_schedule')
  const scheduled = bookings.filter(b => b.status === 'scheduled')

  return NextResponse.json({
    authorized: true,
    pending_count:   pending.length,
    scheduled_count: scheduled.length,
    bookings,
  })
}
