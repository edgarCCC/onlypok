import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
    const contentType = meta.content_type
    const packIndex   = meta.pack_index !== '' ? Number(meta.pack_index) : null

    if (!formationId || !userId) {
      console.error('[stripe/webhook] missing metadata', meta)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    /* Toujours enregistrer l'achat */
    const { error: purchaseError } = await supabase.from('formation_purchases').insert({
      formation_id: formationId,
      user_id:      userId,
    })
    if (purchaseError && purchaseError.code !== '23505') {
      console.error('[stripe/webhook] purchase insert error:', purchaseError.message)
    }

    /* Pour les coachings : créer un booking en attente de planification */
    if (contentType === 'coaching' && coachId) {
      const { error: bookingError } = await supabase.from('bookings').insert({
        formation_id: formationId,
        student_id:   userId,
        coach_id:     coachId,
        pack_index:   packIndex,
        status:       'paid_pending_schedule',
        stripe_session_id: session.id,
      })
      if (bookingError && bookingError.code !== '23505') {
        console.error('[stripe/webhook] booking insert error:', bookingError.message)
      }
    }
  }

  return NextResponse.json({ received: true })
}
