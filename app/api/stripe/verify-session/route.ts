import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendAdminAlertEmail } from '@/lib/email'
import { recordPurchaseFromSession } from '@/lib/purchases'

// POST /api/stripe/verify-session
// Fallback: called on success redirect if webhook hasn't fired yet.
// Verifies the Stripe session, creates booking/purchase if missing.
export async function POST(req: NextRequest) {
  try {
    return await handleVerifySession(req)
  } catch (err: any) {
    console.error('[verify-session] UNHANDLED EXCEPTION:', err?.message ?? err, err?.stack)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}

async function handleVerifySession(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

  let body: any
  try {
    body = await req.json()
  } catch (e: any) {
    console.error('[verify-session] failed to parse request body:', e.message)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { session_id } = body
  if (!session_id) {
    console.error('[verify-session] missing session_id in request body')
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }


  const supabase      = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[verify-session] unauthenticated — cookie missing or expired', { session_id })
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch (e: any) {
    console.error('[verify-session] stripe session not found', { session_id, err: e.message })
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }


  // For coaching (manual capture): payment_status stays 'unpaid' until capture — check session.status instead
  const isAuthorized = session.payment_status === 'paid' || session.status === 'complete'
  if (!isAuthorized) {
    console.error('[verify-session] not paid', {
      session_id,
      payment_status: session.payment_status,
      session_status: session.status,
    })
    return NextResponse.json({ error: 'Not paid' }, { status: 402 })
  }

  const meta        = session.metadata ?? {}
  const formationId = meta.formation_id
  const userId      = meta.user_id
  // Normalise empty strings from Stripe metadata to proper values
  const coachId     = meta.coach_id      || null
  const contentType = meta.content_type  || null
  // Safe packIndex: guard against '' and NaN
  const rawPackIndex = meta.pack_index
  const packIndex   = rawPackIndex && rawPackIndex !== '' ? Number(rawPackIndex) : null
  const scheduledAt = meta.scheduled_at  || null


  // Security: the logged-in user must match the session user
  if (userId !== user.id) {
    console.error('[verify-session] user mismatch', { metaUserId: userId, authUserId: user.id, session_id })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!formationId || !userId) {
    console.error('[verify-session] missing metadata', { formationId, userId, meta })
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  // Always ensure purchase row exists (upsert partagé, montants inclus)
  const { error: purchaseError } = await recordPurchaseFromSession(adminSupabase, session)
  if (purchaseError) {
    /* Non-fatal : le webhook Stripe insère aussi le purchase de son côté,
       mais on alerte pour ne pas perdre la trace d'un paiement. */
    console.error('[verify-session] purchase insert error:', purchaseError.message, purchaseError.code)
    sendAdminAlertEmail({
      subject: 'verify-session — insert formation_purchases échoué',
      details: { stripe_session: session_id, formation_id: formationId, user_id: userId, erreur: purchaseError.message },
    }).catch(() => {})
  }

  // For coaching: ensure booking(s) exist
  if (contentType === 'coaching') {
    if (!coachId) {
      console.error('[verify-session] coachId is null/empty — booking will be created without coach_id', {
        session_id, formationId, meta,
      })
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as any)?.id ?? null

    // Determine how many sessions this pack covers
    let sessionsCount = 1
    if (packIndex !== null && !isNaN(packIndex)) {
      const { data: formData, error: formError } = await adminSupabase
        .from('formations').select('coaching_packs').eq('id', formationId).single()
      if (formError) console.error('[verify-session] coaching_packs fetch error:', formError.message)
      const pack = (formData?.coaching_packs as any[])?.[packIndex]
      if (!pack) console.error('[verify-session] pack not found at index', packIndex, 'formation', formationId)
      if (pack?.hours && pack.hours > 1) sessionsCount = pack.hours
    }

    // Idempotency: count existing bookings for this payment
    const [anchorRes, suffixRes] = await Promise.all([
      adminSupabase.from('bookings').select('id', { count: 'exact', head: true }).eq('stripe_session_id', session_id),
      adminSupabase.from('bookings').select('id', { count: 'exact', head: true }).like('stripe_session_id', `${session_id}_%`),
    ])
    if (anchorRes.error) console.error('[verify-session] idempotency anchor query error:', anchorRes.error.message, anchorRes.error.code)
    if (suffixRes.error) console.error('[verify-session] idempotency suffix query error:', suffixRes.error.message, suffixRes.error.code)

    const startIdx = (anchorRes.count ?? 0) + (suffixRes.count ?? 0)

    if (startIdx >= sessionsCount) {
      return NextResponse.json({ ok: true, type: 'coaching', coach_id: coachId, formation_id: formationId })
    }

    for (let i = startIdx; i < sessionsCount; i++) {
      const isFirst = i === 0
      const full: Record<string, unknown> = {
        formation_id:             formationId,
        student_id:               userId,
        coach_id:                 coachId,
        pack_index:               packIndex,
        status:                   'paid_pending_schedule',
        scheduled_at:             isFirst ? scheduledAt : null,
        stripe_session_id:        i === 0 ? session_id : `${session_id}_${i}`,
        stripe_payment_intent_id: paymentIntentId,
      }

      const { error: bookingError } = await adminSupabase.from('bookings').insert(full)

      if (bookingError) {
        if (bookingError.code === '23505') {
          continue
        }
        console.error('[verify-session] booking insert FAILED', { i, error: bookingError.message, code: bookingError.code })
        sendAdminAlertEmail({
          subject: 'verify-session — booking payé non créé',
          details: {
            stripe_session: session_id, formation_id: formationId,
            student_id: userId, coach_id: coachId,
            session_index: `${i + 1}/${sessionsCount}`, erreur: bookingError.message, code: bookingError.code,
          },
        }).catch(() => {})
        return NextResponse.json({ error: bookingError.message }, { status: 500 })
      }

    }

    return NextResponse.json({ ok: true, type: 'coaching', coach_id: coachId, formation_id: formationId })
  }

  return NextResponse.json({ ok: true, type: contentType, formation_id: formationId })
}
