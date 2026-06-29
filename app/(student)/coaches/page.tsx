import { createServerSupabaseClient } from '@/lib/supabase/server'
import CoachesClient from './CoachesClient'

export default async function CoachesPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: coachesRaw }, { data: reviews }, { data: qualifiedProofs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, variants, is_pro, years_experience, hourly_rate, coaching_mode, coaching_packages, formations(count)')
      .eq('role', 'coach')
      .order('created_at', { ascending: false }),
    supabase.from('reviews').select('coach_id, rating').limit(2000),
    supabase.from('coach_proofs').select('coach_id, category').in('category', ['stats', 'longterme']),
  ])

  // Only show coaches with both required proof categories uploaded
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

  const ratingMap: Record<string, { sum: number; count: number }> = {}
  for (const r of reviews ?? []) {
    if (!ratingMap[r.coach_id]) ratingMap[r.coach_id] = { sum: 0, count: 0 }
    ratingMap[r.coach_id].sum += r.rating
    ratingMap[r.coach_id].count++
  }

  const coaches = (coachesRaw ?? [])
    .map((c: any) => ({
      ...c,
      unverified: !eligibleCoachIds.has(c.id),
      avgRating: ratingMap[c.id] ? ratingMap[c.id].sum / ratingMap[c.id].count : null,
      reviewCount: ratingMap[c.id]?.count ?? 0,
    }))

  return <CoachesClient initialCoaches={coaches} />
}
