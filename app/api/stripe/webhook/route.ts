import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendCoachNewBookingEmail } from '@/lib/email'

/* Disable body parsing — Stripe needs the raw buffer to verify the signature */
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[stripe/webhook] signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session     = event.data.object as Stripe.Checkout.Session
    const meta        = session.metadata ?? {}
    const formationId = meta.formation_id
    const userId      = meta.user_id
    const coachId     = meta.coach_id
    const contentType  = meta.content_type
    const packIndex    = meta.pack_index !== '' ? Number(meta.pack_index) : null
    const scheduledAt  = meta.scheduled_at !== '' ? meta.scheduled_at : null

    if (!formationId || !userId) {
      console.error('[stripe/webhook] missing metadata', meta)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    /* Toujours enregistrer l'achat */
    const { error: purchaseError } = await supabase.from('formation_purchases').insert({
      formation_id: formationId,
      user_id:      userId,
    })
    if (purchaseError && purchaseError.code !== '23505') {
      console.error('[stripe/webhook] purchase insert error:', purchaseError.message)
    }

    /* Pour les coachings : booking en attente d'approbation coach (like Airbnb) */
    if (contentType === 'coaching' && coachId) {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as any)?.id ?? null

      const { error: bookingError } = await supabase.from('bookings').insert({
        formation_id:              formationId,
        student_id:                userId,
        coach_id:                  coachId,
        pack_index:                packIndex,
        status:                    scheduledAt ? 'scheduled' : 'paid_pending_schedule',
        scheduled_at:              scheduledAt,
        stripe_session_id:         session.id,
        stripe_payment_intent_id:  paymentIntentId,
      })
      if (bookingError && bookingError.code !== '23505') {
        console.error('[stripe/webhook] booking insert error:', bookingError.message)
      }

      /* Notification pour le coach */
      const { data: formation } = await supabase
        .from('formations').select('title, coaching_packs').eq('id', formationId).single()
      const { data: student } = await supabase
        .from('profiles').select('username').eq('id', userId).single()

      await supabase.from('notifications').insert({
        user_id: coachId,
        type:    'new_request',
        title:   'Nouvelle réservation de coaching',
        body:    `${student?.username ?? 'Un élève'} a réservé "${formation?.title ?? 'votre coaching'}". Acceptez ou refusez dans 48h.`,
        data:    { booking_formation_id: formationId, student_id: userId },
      })

      /* Email au coach */
      const pack = packIndex != null && Array.isArray((formation as any)?.coaching_packs)
        ? (formation as any).coaching_packs[packIndex]
        : null

      sendCoachNewBookingEmail({
        coachId,
        studentUsername: student?.username ?? 'Un élève',
        formationTitle:  formation?.title ?? 'votre coaching',
        packLabel:       pack?.label ?? null,
        price:           pack?.price ?? null,
      }).catch(err => console.error('[stripe/webhook] email error:', err.message))
    }
  }

  return NextResponse.json({ received: true })
}
