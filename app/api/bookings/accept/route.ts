import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendStudentBookingAcceptedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { booking_id } = await req.json()
  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, coach_id, student_id, stripe_payment_intent_id, status, formation_id')
    .eq('id', booking_id)
    .eq('coach_id', user.id)
    .eq('status', 'pending_coach_approval')
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (booking.stripe_payment_intent_id) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
    try {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id)
    } catch (err: any) {
      console.error('[bookings/accept] stripe capture failed:', err.message)
      return NextResponse.json({ error: 'Stripe capture failed: ' + err.message }, { status: 500 })
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'paid_pending_schedule' })
    .eq('id', booking_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: formation } = await supabase
    .from('formations').select('title').eq('id', booking.formation_id).single()

  const { data: coach } = await supabase
    .from('profiles').select('username').eq('id', user.id).single()

  await supabase.from('notifications').insert({
    user_id: booking.student_id,
    type:    'booking_accepted',
    title:   'Coaching accepté !',
    body:    `Votre coaching "${formation?.title ?? 'coaching'}" a été accepté. Choisissez un créneau dans votre planning.`,
    data:    { booking_id },
  })

  sendStudentBookingAcceptedEmail({
    studentId:      booking.student_id,
    coachUsername:  coach?.username ?? 'Votre coach',
    formationTitle: formation?.title ?? 'votre coaching',
    bookingId:      booking_id,
  }).catch(err => console.error('[bookings/accept] email error:', err.message))

  return NextResponse.json({ success: true })
}
