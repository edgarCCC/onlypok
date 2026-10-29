import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendStudentBookingAcceptedEmail } from '@/lib/email'
import { createMeetingRoom, isBookingRefunded } from '@/lib/bookings'

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
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string }
      // Already captured = idempotent success
      if (err.message?.includes('already been captured') || err.code === 'charge_already_captured') {
        // Paiement déjà capturé (séance 2+ d'un pack) — sauf si CETTE séance a été remboursée
        if (await isBookingRefunded(stripe, booking.stripe_payment_intent_id, booking_id)) {
          return NextResponse.json({ error: 'Cette séance a déjà été remboursée, elle ne peut plus être confirmée.' }, { status: 409 })
        }
      } else {
        console.error('[bookings/accept] stripe capture failed:', err.message)
        return NextResponse.json({ error: 'Le paiement n\u2019a pas pu être encaissé (autorisation expirée ?). Contactez le support.' }, { status: 500 })
      }
    }
  }

  // Room visio Daily (onlypok.daily.co) avec repli Jitsi si l'API échoue
  const meetingUrl = await createMeetingRoom(booking_id, booking.scheduled_at)

  // Écriture service-role (propriété + statut vérifiés ci-dessus ; aucune écriture client sur bookings — RLS)
  const { error } = await createAdminSupabaseClient()
    .from('bookings')
    .update({ status: 'scheduled', ...(meetingUrl ? { meeting_url: meetingUrl } : {}) })
    .eq('id', booking_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: formation } = await supabase
    .from('formations').select('title').eq('id', booking.formation_id).single()

  const { data: coach } = await supabase
    .from('profiles').select('username').eq('id', user.id).single()

  // Notifications : insertion réservée au service-role (RLS)
  await createAdminSupabaseClient().from('notifications').insert({
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
