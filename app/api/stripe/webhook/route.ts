import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendAdminAlertEmail } from '@/lib/email'
import { recordPurchaseFromSession } from '@/lib/purchases'
import { ensureCoachingBookings } from '@/lib/bookings'

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

    /* Toujours enregistrer l'achat (upsert partagé, montants inclus).
       En cas d'échec, on renvoie 500 pour que Stripe retente le webhook. */
    const { error: purchaseError } = await recordPurchaseFromSession(supabase, session)
    if (purchaseError) {
      console.error('[stripe/webhook] purchase insert error:', purchaseError.message)
      sendAdminAlertEmail({
        subject: 'Webhook Stripe — insert formation_purchases échoué',
        details: { stripe_session: session.id, formation_id: formationId, user_id: userId, erreur: purchaseError.message },
      }).catch(() => {})
      return NextResponse.json({ error: 'purchase insert failed' }, { status: 500 })
    }

    /* Pour les coachings : bookings + notifications via la lib partagée
       (même chemin que verify-session — idempotence incluse) */
    if (contentType === 'coaching' && coachId) {
      const { error: bookingError } = await ensureCoachingBookings(supabase, stripe, session)
      if (bookingError) {
        /* Un élève a payé mais sa session n'existe pas : 500 pour que Stripe
           retente (l'idempotence de la lib reprendra où on s'est arrêté). */
        console.error('[stripe/webhook] booking error:', bookingError.message)
        sendAdminAlertEmail({
          subject: 'Webhook Stripe — booking payé non créé',
          details: {
            stripe_session: session.id, formation_id: formationId,
            student_id: userId, coach_id: coachId, erreur: bookingError.message,
          },
        }).catch(() => {})
        return NextResponse.json({ error: 'booking insert failed' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
