import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FormationsPageClient from './FormationsPageClient'

export default async function FormationsPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: formations }, { data: reviews }, { data: qualifiedProofs }] = await Promise.all([
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
      />
    </Suspense>
  )
}
