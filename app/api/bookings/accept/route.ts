import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendStudentBookingAcceptedEmail } from '@/lib/email'

function createMeetingUrl(bookingId: string): string {
  // Jitsi Meet — free, no API key, unguessable room name
  const room = `onlypok-${bookingId.replace(/-/g, '').slice(0, 20)}`
  return `https://meet.jit.si/${room}`
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { booking_id } = await req.json()
  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, coach_id, student_id, stripe_payment_intent_id, status, formation_id, scheduled_at')
    .eq('id', booking_id)
    .eq('coach_id', user.id)
    .eq('status', 'pending_coach_approval')
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Capture Stripe payment
  if (booking.stripe_payment_intent_id) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
    try {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id)
    } catch (err: any) {
      // Already captured = idempotent success
      if (err?.message?.includes('already been captured') || err?.code === 'charge_already_captured') {
        // Paiement déjà capturé — on continue
      } else {
        console.error('[bookings/accept] stripe capture failed:', err.message)
        return NextResponse.json({ error: 'Stripe capture failed: ' + err.message }, { status: 500 })
      }
    }
  }

  // Generate meeting URL (Jitsi — free, no API key required)
  const meetingUrl = createMeetingUrl(booking_id)

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'scheduled', ...(meetingUrl ? { meeting_url: meetingUrl } : {}) })
    .eq('id', booking_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: formation } = await supabase
    .from('formations').select('title').eq('id', booking.formation_id).single()

  const { data: coach } = await supabase
    .from('profiles').select('username').eq('id', user.id).single()

  await supabase.from('notifications').insert({
    user_id: booking.student_id,
    type:    'booking_accepted',
    title:   'Coaching confirmé !',
    body:    `Votre session "${formation?.title ?? 'coaching'}" est confirmée.${booking.scheduled_at ? ' Retrouvez le lien de visio dans votre planning.' : ''}`,
    data:    { booking_id, meeting_url: meetingUrl },
  })

  sendStudentBookingAcceptedEmail({
    studentId:      booking.student_id,
    coachUsername:  coach?.username ?? 'Votre coach',
    formationTitle: formation?.title ?? 'votre coaching',
    bookingId:      booking_id,
  }).catch(err => console.error('[bookings/accept] email error:', err.message))

  return NextResponse.json({ success: true, meeting_url: meetingUrl })
}
