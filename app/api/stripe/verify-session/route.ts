import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

// POST /api/stripe/verify-session
// Fallback: called on success redirect if webhook hasn't fired yet.
// Verifies the Stripe session, creates booking/purchase if missing.
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const supabase     = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Not paid' }, { status: 402 })
  }

  const meta        = session.metadata ?? {}
  const formationId = meta.formation_id
  const userId      = meta.user_id
  const coachId     = meta.coach_id
  const contentType = meta.content_type
  const packIndex   = meta.pack_index !== '' ? Number(meta.pack_index) : null
  const scheduledAt = meta.scheduled_at !== '' ? meta.scheduled_at : null

  // Security: the logged-in user must match the session user
  if (userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!formationId || !userId) return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })

  // Always ensure purchase row exists
  const { error: purchaseError } = await adminSupabase.from('formation_purchases').insert({
    formation_id: formationId,
    user_id:      userId,
  })
  if (purchaseError && purchaseError.code !== '23505') {
    console.error('[verify-session] purchase insert error:', purchaseError.message)
  }

  // For coaching: ensure booking exists
  if (contentType === 'coaching' && coachId) {
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as any)?.id ?? null

    // Determine how many sessions this pack covers
    let sessionsCount = 1
    if (packIndex !== null) {
      const { data: formData } = await adminSupabase
        .from('formations').select('coaching_packs').eq('id', formationId).single()
      const pack = (formData?.coaching_packs as any[])?.[packIndex]
      if (pack?.hours && pack.hours > 1) sessionsCount = pack.hours
    }

    // Idempotency: count bookings already created for this Stripe session
    const { count: existingCount } = await adminSupabase
      .from('bookings').select('id', { count: 'exact', head: true })
      .eq('stripe_session_id', session_id)

    const toCreate = sessionsCount - (existingCount ?? 0)
    for (let i = 0; i < toCreate; i++) {
      const isFirst = (existingCount ?? 0) + i === 0
      const { error: bookingError } = await adminSupabase.from('bookings').insert({
        formation_id:             formationId,
        student_id:               userId,
        coach_id:                 coachId,
        pack_index:               packIndex,
        status:                   scheduledAt && isFirst ? 'scheduled' : 'paid_pending_schedule',
        scheduled_at:             scheduledAt && isFirst ? scheduledAt : null,
        stripe_session_id:        session_id,
        stripe_payment_intent_id: paymentIntentId,
      })
      if (bookingError && bookingError.code !== '23505') {
        console.error('[verify-session] booking insert error:', bookingError.message)
        return NextResponse.json({ error: bookingError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, type: 'coaching', coach_id: coachId, formation_id: formationId })
  }

  return NextResponse.json({ ok: true, type: contentType, formation_id: formationId })
}
