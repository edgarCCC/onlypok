import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import FormationDetailClient from './FormationDetailClient'
import { notFound } from 'next/navigation'

export default async function FormationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ payment?: string; session_id?: string }>
}) {
  const { id } = await params
  const { payment, session_id } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: formation, error } = await supabase
    .from('formations')
    .select('*, coach:profiles(id, username, bio, avatar_url, weekend_rate_pct, created_at, variants, years_experience, rooms, advantages, target_players, is_pro)')
    .eq('id', id)
    .single()

  if (error || !formation) notFound()

  const isFormationType = !formation.content_type || formation.content_type === 'formation'

  const { data: { user } } = await supabase.auth.getUser()

  /* ── Verify Stripe session and record purchase immediately after redirect ─── */
  if (payment === 'success' && session_id && user) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
      const stripeSession = await stripe.checkout.sessions.retrieve(session_id)

      if (
        stripeSession.payment_status === 'paid' &&
        stripeSession.metadata?.user_id === user.id &&
        stripeSession.metadata?.formation_id === id
      ) {
        // Admin client bypasses RLS — insert is server-verified via Stripe signature
        const admin = createAdminSupabaseClient()
        await admin.from('formation_purchases').insert({
          formation_id: id,
          user_id: user.id,
        })
      }
    } catch {
      // Non-blocking — webhook will cover production; log silently
    }
  }

  const results = await Promise.allSettled([
    /* 0 — chapters (formation type only) */
    isFormationType
      ? supabase
          .from('formation_chapters')
          .select('*, formation_lessons(*)')
          .eq('formation_id', id)
          .order('order_index')
          .then(r => r.data ?? [])
      : Promise.resolve([]),

    /* 1 — coach proofs */
    formation.coach?.id
      ? supabase.from('coach_proofs').select('*').eq('coach_id', formation.coach.id).eq('validation_status', 'approved').order('order_index').then(r => r.data ?? [])
      : Promise.resolve([]),

    /* 2 — reviews */
    formation.coach?.id
      ? supabase
          .from('reviews')
          .select('*, student:profiles!student_id(username, avatar_url, created_at)')
          .eq('coach_id', formation.coach.id)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(r => r.data ?? [])
      : Promise.resolve([]),

    /* 3 — co-coaches */
    (formation.co_coach_ids as string[] | undefined)?.length
      ? supabase.from('profiles').select('id, username').in('id', formation.co_coach_ids).then(r => r.data ?? [])
      : Promise.resolve([]),

    /* 4 — purchase status */
    user
      ? supabase
          .from('formation_purchases').select('id')
          .eq('formation_id', id).eq('user_id', user.id).single()
          .then(r => !!r.data || formation.price === 0)
      : Promise.resolve(formation.price === 0),
  ])

  const val = (i: number, fallback: unknown) =>
    results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<unknown>).value : fallback

  const chapters      = val(0, []) as any[]
  const proofs        = val(1, []) as any[]
  const reviews       = val(2, []) as any[]
  const coCoaches     = val(3, []) as any[]
  const hasPurchased  = val(4, formation.price === 0) as boolean
  const userHasReview = user ? reviews.some((rv: any) => rv.student_id === user.id) : false

  return (
    <FormationDetailClient
      formationId={id}
      initialFormation={formation}
      initialChapters={chapters}
      initialReviews={reviews}
      initialProofs={proofs}
      initialCoCoaches={coCoaches}
      initialHasPurchased={hasPurchased}
      initialUserHasReview={userHasReview}
    />
  )
}
