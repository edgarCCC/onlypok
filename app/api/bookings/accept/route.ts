import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendStudentBookingAcceptedEmail } from '@/lib/email'
import { createMeetingRoom, isBookingRefunded } from '@/lib/bookings'
import { object, readJsonBody, uuid } from '@/lib/validate'

// POST /api/bookings/accept — Body: { booking_id }
// Q11 : schéma (UUID) avant toute lecture en base ; 415 / 413 / 400 gérés par readJsonBody.
const AcceptBody = object({ booking_id: uuid() })

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await readJsonBody(req, AcceptBody, { tag: 'bookings/accept' })
  if (!body.ok) return body.response
  const { booking_id } = body.data

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

  if (error) {
    // Paiement déjà capturé côté Stripe : à rapprocher à la main (détail dans les logs seulement).
    console.error('[RECONCILE] paiement capturé mais statut non mis à jour', { booking_id, error: error.message })
    return NextResponse.json({ error: 'Paiement encaissé mais confirmation non enregistrée : réessayez ou contactez le support.' }, { status: 500 })
  }

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
    scheduledAt:    booking.scheduled_at ?? null,
  }).catch(err => console.error('[bookings/accept] email error:', err.message))

  return NextResponse.json({ success: true, meeting_url: meetingUrl })
}
