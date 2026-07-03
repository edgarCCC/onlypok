import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendCoachNewBookingEmail, sendAdminAlertEmail } from '@/lib/email'

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

    /* Toujours enregistrer l'achat.
       En cas d'échec (hors doublon), on renvoie 500 pour que Stripe retente le webhook. */
    const { error: purchaseError } = await supabase.from('formation_purchases').insert({
      formation_id: formationId,
      user_id:      userId,
    })
    if (purchaseError && purchaseError.code !== '23505') {
      console.error('[stripe/webhook] purchase insert error:', purchaseError.message)
      sendAdminAlertEmail({
        subject: 'Webhook Stripe — insert formation_purchases échoué',
        details: { stripe_session: session.id, formation_id: formationId, user_id: userId, erreur: purchaseError.message },
      }).catch(() => {})
      return NextResponse.json({ error: 'purchase insert failed' }, { status: 500 })
    }

    /* Pour les coachings : créer N bookings selon pack.hours */
    if (contentType === 'coaching' && coachId) {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as any)?.id ?? null

      /* Fetch formation first to determine sessions count */
      const { data: formation } = await supabase
        .from('formations').select('title, coaching_packs').eq('id', formationId).single()

      let sessionsCount = 1
      const pack = packIndex !== null && Array.isArray(formation?.coaching_packs)
        ? (formation!.coaching_packs as any[])[packIndex]
        : null
      if (pack?.hours && pack.hours > 1) sessionsCount = pack.hours

      /* Idempotency: count existing bookings for this session */
      const [{ count: anchorCount }, { count: suffixedCount }] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('stripe_session_id', session.id),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).like('stripe_session_id', `${session.id}_%`),
      ])

      const startIdx = (anchorCount ?? 0) + (suffixedCount ?? 0)
      if (startIdx < sessionsCount) {
        for (let i = startIdx; i < sessionsCount; i++) {
          const isFirst = i === 0
          const { error: bookingError } = await supabase.from('bookings').insert({
            formation_id:             formationId,
            student_id:               userId,
            coach_id:                 coachId,
            pack_index:               packIndex,
            status:                   'paid_pending_schedule',
            scheduled_at:             isFirst ? (scheduledAt ?? null) : null,
            stripe_session_id:        i === 0 ? session.id : `${session.id}_${i}`,
            stripe_payment_intent_id: paymentIntentId,
          })
          if (bookingError && bookingError.code !== '23505') {
            /* Un élève a payé mais sa session n'existe pas : 500 pour que Stripe
               retente (l'idempotence ci-dessus reprendra où on s'est arrêté). */
            console.error('[stripe/webhook] booking insert error:', bookingError.message)
            sendAdminAlertEmail({
              subject: 'Webhook Stripe — booking payé non créé',
              details: {
                stripe_session: session.id, formation_id: formationId,
                student_id: userId, coach_id: coachId,
                session_index: `${i + 1}/${sessionsCount}`, erreur: bookingError.message,
              },
            }).catch(() => {})
            return NextResponse.json({ error: 'booking insert failed' }, { status: 500 })
          }
        }
      }

      /* Notification pour le coach */
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
