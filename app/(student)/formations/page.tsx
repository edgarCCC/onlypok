import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FormationsPageClient from './FormationsPageClient'

export const metadata = {
  title: 'Formations poker — cours vidéo par des coachs certifiés',
  description:
    'Explore le catalogue de formations poker : MTT, cash game, spin & go. Cours vidéo créés par des coachs aux résultats vérifiés.',
  alternates: { canonical: '/formations' },
}

export default async function FormationsPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: formations }, { data: reviews }, { data: qualifiedProofs }, { data: coachesRaw }, { data: coachReviews }] = await Promise.all([
    supabase
      .from('formations')
      .select('*, coach:profiles(id, username, avatar_url, is_pro, years_experience, variants)')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('rating, category_ratings, coach_id, content_type')
      .limit(500),
    supabase
      .from('coach_proofs')
      .select('coach_id, category')
      .in('category', ['stats', 'longterme']),
    supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, variants, is_pro, years_experience, hourly_rate, coaching_mode, coaching_packages, formations(count)')
      .eq('role', 'coach')
      .order('created_at', { ascending: false }),
    supabase.from('reviews').select('coach_id, rating').limit(2000),
  ])

  // Build set of coach_ids that have BOTH required proof categories
  const proofsByCoach = new Map<string, Set<string>>()
  for (const p of qualifiedProofs ?? []) {
    if (!proofsByCoach.has(p.coach_id)) proofsByCoach.set(p.coach_id, new Set())
    proofsByCoach.get(p.coach_id)!.add(p.category)
  }
  const eligibleCoachIds = new Set(
    [...proofsByCoach.entries()]
      .filter(([, cats]) => cats.has('stats') && cats.has('longterme'))
      .map(([id]) => id)
  )
  const visibleFormations = formations ?? []

  // Annuaire coachs (onglet Coachs) — notes moyennes + flag "Non vérifié"
  const ratingMap: Record<string, { sum: number; count: number }> = {}
  for (const r of coachReviews ?? []) {
    if (!ratingMap[r.coach_id]) ratingMap[r.coach_id] = { sum: 0, count: 0 }
    ratingMap[r.coach_id].sum += r.rating
    ratingMap[r.coach_id].count++
  }
  // Réservation express : première offre coaching publiée de chaque coach
  // (les formations sont triées de la plus récente à la plus ancienne)
  const coachingByCoach = new Map<string, string>()
  for (const f of visibleFormations) {
    if ((f.content_type ?? 'formation') === 'coaching' && f.coach?.id && !coachingByCoach.has(f.coach.id)) {
      coachingByCoach.set(f.coach.id, f.id)
    }
  }

  const coaches = (coachesRaw ?? []).map((c: any) => ({
    ...c,
    unverified: !eligibleCoachIds.has(c.id),
    avgRating: ratingMap[c.id] ? ratingMap[c.id].sum / ratingMap[c.id].count : null,
    reviewCount: ratingMap[c.id]?.count ?? 0,
    coachingFormationId: coachingByCoach.get(c.id) ?? null,
  }))

  const { data: { user } } = await supabase.auth.getUser()
  let userRole: 'coach' | 'student' | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    userRole = (profile?.role as 'coach' | 'student') ?? null
  }

  return (
    <Suspense>
      <FormationsPageClient
        initialFormations={visibleFormations}
        initialReviews={reviews ?? []}
        initialUserRole={userRole}
        initialEligibleCoachIds={[...eligibleCoachIds]}
        initialCoaches={coaches}
      />
    </Suspense>
  )
}
