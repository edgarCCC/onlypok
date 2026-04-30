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
    const session  = event.data.object as Stripe.Checkout.Session
    const meta     = session.metadata ?? {}
    const formationId = meta.formation_id
    const userId      = meta.user_id

    if (!formationId || !userId) {
      console.error('[stripe/webhook] missing metadata', meta)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    /* idempotent insert — ignore if already exists */
    const { error } = await supabase.from('formation_purchases').insert({
      formation_id: formationId,
      user_id:      userId,
    })

    /* 23505 = unique_violation — payment already recorded, that's fine */
    if (error && error.code !== '23505') {
      console.error('[stripe/webhook] insert error:', error.message)
    }
  }

  return NextResponse.json({ received: true })
}
