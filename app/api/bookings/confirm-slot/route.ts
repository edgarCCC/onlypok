import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendCoachSlotConfirmedEmail, sendStudentSlotConfirmedEmail } from '@/lib/email'

// POST /api/bookings/confirm-slot
// Body: { booking_id, scheduled_at }
// Confirms a time slot for a paid booking — only allowed for the student who owns it
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { booking_id, scheduled_at } = await req.json()

  if (!booking_id || !scheduled_at) {
    return NextResponse.json({ error: 'Missing booking_id or scheduled_at' }, { status: 400 })
  }

  // Verify ownership and status
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, student_id, status')
    .eq('id', booking_id)
    .eq('student_id', user.id)          // must own the booking
    .eq('status', 'paid_pending_schedule') // must not already be scheduled
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found or already scheduled' }, { status: 404 })
  }

  // Check the slot is not already taken by another booking for this coach
  const { data: conflict } = await supabase
    .from('bookings')
    .select('id')
    .eq('coach_id', (await supabase.from('bookings').select('coach_id').eq('id', booking_id).single()).data?.coach_id)
    .eq('scheduled_at', scheduled_at)
    .eq('status', 'scheduled')
    .single()

  if (conflict) {
    return NextResponse.json({ error: 'Ce créneau est déjà pris' }, { status: 409 })
  }

  const meetSlug   = `onlypok-${booking_id.replace(/-/g, '').slice(0, 16)}`
  const meetingUrl = `https://meet.jit.si/${meetSlug}`

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'scheduled', scheduled_at, meeting_url: meetingUrl })
    .eq('id', booking_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  /* Fetch names for emails */
  const { data: fullBooking } = await supabase
    .from('bookings')
    .select('coach_id, student_id, formation:formations(title), coach:profiles!coach_id(username), student:profiles!student_id(username)')
    .eq('id', booking_id)
    .single()

  if (fullBooking) {
    const formationTitle = (fullBooking.formation as any)?.title ?? 'votre coaching'
    const coachUsername  = (fullBooking.coach as any)?.username ?? 'Votre coach'
    const studentUsername = (fullBooking.student as any)?.username ?? 'L\'élève'

    sendCoachSlotConfirmedEmail({
      coachId: fullBooking.coach_id,
      studentUsername,
      formationTitle,
      scheduledAt: scheduled_at,
      meetingUrl,
    }).catch(err => console.error('[confirm-slot] coach email error:', err.message))

    sendStudentSlotConfirmedEmail({
      studentId: fullBooking.student_id,
      coachUsername,
      formationTitle,
      scheduledAt: scheduled_at,
      meetingUrl,
    }).catch(err => console.error('[confirm-slot] student email error:', err.message))
  }

  return NextResponse.json({ success: true })
}
