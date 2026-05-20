import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// GET /api/debug/session?session_id=cs_xxx
// Shows exactly what verify-session would see for a given Stripe session
export async function GET(req: NextRequest) {
  const session_id = req.nextUrl.searchParams.get('session_id')
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  const admin  = createAdminSupabaseClient()

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Stripe session not found', detail: e.message }, { status: 404 })
  }

  const meta = session.metadata ?? {}
  const pi   = session.payment_intent as Stripe.PaymentIntent | null

  const { data: bookings } = await admin
    .from('bookings')
    .select('id, status, stripe_session_id, student_id, coach_id')
    .or(`stripe_session_id.eq.${session_id},stripe_session_id.like.${session_id}_%`)

  const { data: formation } = meta.formation_id
    ? await admin.from('formations').select('id, title, content_type, coach_id, coaching_packs').eq('id', meta.formation_id).single()
    : { data: null }

  return NextResponse.json({
    stripe: {
      payment_status: session.payment_status,
      payment_intent_status: pi?.status ?? '(not expanded)',
    },
    metadata: {
      formation_id: meta.formation_id,
      user_id:      meta.user_id,
      coach_id:     meta.coach_id || '⚠️ EMPTY',
      content_type: meta.content_type,
      pack_index:   meta.pack_index || '(none)',
    },
    formation: formation ?? '⚠️ NOT FOUND',
    bookings_found: bookings?.length ?? 0,
    bookings,
  })
}
