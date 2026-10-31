import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendAdminAlertEmail } from '@/lib/email'
import { recordPurchaseFromSession } from '@/lib/purchases'
import { ensureCoachingBookings } from '@/lib/bookings'
import { object, readJsonBody, string } from '@/lib/validate'

// POST /api/stripe/verify-session
// Fallback: called on success redirect if webhook hasn't fired yet.
// Verifies the Stripe session, creates booking/purchase if missing.

// Body: { session_id } — Q11 : identifiant de session Checkout Stripe (cs_…), borné.
const VerifySessionBody = object({ session_id: string({ min: 1, max: 255, pattern: /^cs_[A-Za-z0-9_]+$/ }) })

export async function POST(req: NextRequest) {
  try {
    return await handleVerifySession(req)
  } catch (err: unknown) {
    // Détail (Stripe, Supabase) dans les logs seulement, jamais renvoyé au client.
    console.error('[verify-session] UNHANDLED EXCEPTION:', err instanceof Error ? err.message : err, err instanceof Error ? err.stack : undefined)
    return NextResponse.json({ error: 'Vérification du paiement impossible, réessaie.' }, { status: 500 })
  }
}

async function handleVerifySession(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

  const supabase      = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[verify-session] unauthenticated — cookie missing or expired')
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const body = await readJsonBody(req, VerifySessionBody, { tag: 'stripe/verify-session' })
  if (!body.ok) return body.response
  const { session_id } = body.data

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch (e: unknown) {
    console.error('[verify-session] stripe session not found', { session_id, err: e instanceof Error ? e.message : e })
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

  // For coaching: bookings + notifications via la lib partagée
  // (même chemin que le webhook Stripe — idempotence incluse)
  if (contentType === 'coaching') {
    if (!coachId) {
      console.error('[verify-session] coachId is null/empty — booking will be created without coach_id', {
        session_id, formationId, meta,
      })
    }

    const { error: bookingError, firstStatus, alreadyComplete } =
      await ensureCoachingBookings(adminSupabase, stripe, session)

    if (bookingError) {
      console.error('[verify-session] booking FAILED', { error: bookingError.message, code: bookingError.code })
      sendAdminAlertEmail({
        subject: 'verify-session — booking payé non créé',
        details: {
          stripe_session: session_id, formation_id: formationId,
          student_id: userId, coach_id: coachId,
          erreur: bookingError.message, code: bookingError.code,
        },
      }).catch(() => {})
      // Détail dans les logs et l'alerte admin ; le client reçoit un message générique.
      return NextResponse.json({ error: 'Paiement reçu mais réservation non créée : contacte le support.' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true, type: 'coaching', coach_id: coachId, formation_id: formationId,
      first_status: firstStatus ?? null, already_complete: alreadyComplete ?? false,
    })
  }

  return NextResponse.json({ ok: true, type: contentType, formation_id: formationId })
}
