import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendStudentBookingDeclinedEmail } from '@/lib/email'
import { releaseDeclinedBookingPayment } from '@/lib/bookings'

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

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  const admin  = createAdminSupabaseClient()
  const payment = await releaseDeclinedBookingPayment(admin, stripe, booking)
  if (!payment.ok) {
    console.error('[bookings/decline]', payment.error)
    return NextResponse.json({ error: 'Le remboursement a échoué, réessayez ou contactez le support.' }, { status: 500 })
  }

  // Écriture service-role (propriété + statut vérifiés ci-dessus ; aucune écriture client sur bookings — RLS)
  const { data: updated, error } = await admin
    .from('bookings')
    .update({ status: 'declined_by_coach' })
    .eq('id', booking_id)
    .eq('status', 'pending_coach_approval')
    .select('id')

  if (error) {
    // Stripe a déjà libéré/remboursé : la réservation doit être corrigée à la main.
    console.error('[RECONCILE] paiement libéré mais statut non mis à jour', { booking_id, mode: payment.mode, error: error.message })
    return NextResponse.json({ error: 'Le refus a été enregistré côté paiement mais pas sur la réservation. Réessayez.' }, { status: 500 })
  }
  // Requête concurrente (double clic) : déjà traitée, pas de seconde notification
  if (!updated?.length) return NextResponse.json({ success: true, already: true })

  const { data: formation } = await supabase
    .from('formations').select('title').eq('id', booking.formation_id).single()

  const { data: coach } = await supabase
    .from('profiles').select('username').eq('id', user.id).single()

  // Notifications : insertion réservée au service-role (RLS)
  await admin.from('notifications').insert({
    user_id: booking.student_id,
    type:    'booking_declined',
    title:   'Coaching refusé',
    body:    payment.mode === 'cancelled' && payment.voidedSiblingIds.length
      ? `Votre coaching "${formation?.title ?? 'coaching'}" a été refusé : le pack entier est annulé, aucun montant ne sera débité.`
      : payment.mode === 'refunded'
        ? `Votre session "${formation?.title ?? 'coaching'}" a été refusée. Cette session vous est remboursée sous 5-10 jours ouvrés.`
        : `Votre demande de coaching "${formation?.title ?? 'coaching'}" a été refusée. Aucun montant ne sera débité.`,
    data:    { booking_id, voided_booking_ids: payment.voidedSiblingIds },
  })

  sendStudentBookingDeclinedEmail({
    studentId:      booking.student_id,
    coachUsername:  coach?.username ?? 'Votre coach',
    formationTitle: formation?.title ?? 'votre coaching',
  }).catch(err => console.error('[bookings/decline] email error:', err.message))

  return NextResponse.json({ success: true })
}
