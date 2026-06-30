import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/assert-admin'

// GET /api/debug/booking-check?session_id=cs_xxx
export async function GET(req: NextRequest) {
  const adminUser = await assertAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session_id = req.nextUrl.searchParams.get('session_id')
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  const admin  = createAdminSupabaseClient()

  // Auth context from assertAdmin
  const user = adminUser

  // 2. Stripe session
  let session: Stripe.Checkout.Session | null = null
  let stripeError: string | null = null
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent'] })
  } catch (e: any) {
    stripeError = e.message
  }

  const meta = session?.metadata ?? {}
  const pi   = session?.payment_intent as Stripe.PaymentIntent | null

  // 3. Existing bookings
  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select('id, status, stripe_session_id, student_id, coach_id, formation_id, created_at')
    .or(`stripe_session_id.eq.${session_id},stripe_session_id.like.${session_id}_%`)

  // 4. Formation
  const { data: formation } = meta.formation_id
    ? await admin.from('formations').select('id, title, content_type, coach_id, coaching_packs').eq('id', meta.formation_id).single()
    : { data: null }

  // 5. Diagnose
  const issues: string[] = []
  if (stripeError)                                          issues.push(`Stripe error: ${stripeError}`)
  if (!session)                                             issues.push('Stripe session not found')
  if (session && session.payment_status !== 'paid' && session.status !== 'complete')
                                                            issues.push(`Not authorized: payment_status=${session.payment_status} status=${session.status}`)
  if (!meta.formation_id)                                   issues.push('metadata.formation_id is empty')
  if (!meta.user_id)                                        issues.push('metadata.user_id is empty')
  if (!meta.coach_id)                                       issues.push('metadata.coach_id is EMPTY — this causes booking block to be skipped!')
  if (!meta.content_type)                                   issues.push('metadata.content_type is empty')
  if (meta.content_type !== 'coaching')                     issues.push(`content_type is "${meta.content_type}", not "coaching"`)
  if (user && meta.user_id && user.id !== meta.user_id)     issues.push(`User mismatch: auth=${user.id} meta=${meta.user_id}`)
  if (!user)                                                issues.push('No auth session — verify-session will return 401')
  if (!formation)                                           issues.push('Formation not found in DB')
  if (formation && !(formation as any).coach_id)            issues.push('Formation has no coach_id in DB')
  if (bookingsError)                                        issues.push(`Bookings query error: ${bookingsError.message}`)

  return NextResponse.json({
    auth: user ? { id: user.id, email: user.email } : null,
    stripe: session ? {
      status:         session.status,
      payment_status: session.payment_status,
      pi_status:      pi?.status ?? null,
      pi_id:          pi?.id ?? null,
    } : { error: stripeError },
    metadata: {
      formation_id: meta.formation_id   || '⚠️ EMPTY',
      user_id:      meta.user_id        || '⚠️ EMPTY',
      coach_id:     meta.coach_id       || '⚠️ EMPTY — booking will be SKIPPED',
      content_type: meta.content_type   || '⚠️ EMPTY',
      pack_index:   meta.pack_index     || '(none)',
      scheduled_at: meta.scheduled_at   || '(none)',
    },
    formation:      formation          ?? '⚠️ NOT FOUND',
    bookings_found: bookings?.length   ?? 0,
    bookings,
    issues: issues.length ? issues : ['No issues detected'],
  })
}
