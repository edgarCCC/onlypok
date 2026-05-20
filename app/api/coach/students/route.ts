import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

// GET /api/coach/students
// Returns all purchases + coaching session history with notes for the coach's students
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const admin = createAdminSupabaseClient()

  // Coach's formation IDs
  const { data: formations } = await admin
    .from('formations')
    .select('id')
    .eq('coach_id', user.id)

  const formationIds = (formations ?? []).map((f: any) => f.id)

  // Purchases + bookings in parallel
  const [purchasesRes, bookingsRes] = await Promise.all([
    formationIds.length
      ? admin
          .from('formation_purchases')
          .select('id, created_at, formation_id, user_id, formations(id, title, content_type, price), profiles!user_id(id, username, avatar_url)')
          .in('formation_id', formationIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null },
    admin
      .from('bookings')
      .select('id, created_at, scheduled_at, status, pack_index, student_id, formation_id, formations(id, title), profiles!student_id(id, username, avatar_url)')
      .eq('coach_id', user.id)
      .in('status', ['paid_pending_schedule', 'pending_coach_approval', 'scheduled', 'completed'])
      .order('scheduled_at', { ascending: false }),
  ])

  const bookings = bookingsRes.data ?? []

  // Fetch coaching_sessions notes for all bookings
  const bookingIds = bookings.map((b: any) => b.id)
  const { data: sessionNotes } = bookingIds.length
    ? await admin
        .from('coaching_sessions')
        .select('id, booking_id, notes, tags, progress_score')
        .in('booking_id', bookingIds)
    : { data: [] }

  const notesMap = new Map((sessionNotes ?? []).map((n: any) => [n.booking_id, n]))

  const enrichedBookings = bookings.map((b: any) => ({
    id: b.id,
    created_at: b.created_at,
    scheduled_at: b.scheduled_at,
    status: b.status,
    pack_index: b.pack_index,
    student_id: b.student_id,
    formation: Array.isArray(b.formations) ? b.formations[0] ?? null : b.formations ?? null,
    student: Array.isArray(b.profiles) ? b.profiles[0] ?? null : b.profiles ?? null,
    notes: notesMap.get(b.id)?.notes ?? '',
    tags: notesMap.get(b.id)?.tags ?? [],
    progress_score: notesMap.get(b.id)?.progress_score ?? null,
  }))

  return NextResponse.json({
    purchases: purchasesRes.data ?? [],
    bookings:  enrichedBookings,
  })
}
