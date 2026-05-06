import { createServerSupabaseClient } from '@/lib/supabase/server'
import CoachesClient from './CoachesClient'

export default async function CoachesPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: coachesRaw }, { data: reviews }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, variants, is_pro, years_experience, hourly_rate, coaching_mode, coaching_packages, formations(count)')
      .eq('role', 'coach')
      .order('created_at', { ascending: false }),
    supabase.from('reviews').select('coach_id, rating').limit(2000),
  ])

  const ratingMap: Record<string, { sum: number; count: number }> = {}
  for (const r of reviews ?? []) {
    if (!ratingMap[r.coach_id]) ratingMap[r.coach_id] = { sum: 0, count: 0 }
    ratingMap[r.coach_id].sum += r.rating
    ratingMap[r.coach_id].count++
  }

  const coaches = (coachesRaw ?? []).map((c: any) => ({
    ...c,
    avgRating: ratingMap[c.id] ? ratingMap[c.id].sum / ratingMap[c.id].count : null,
    reviewCount: ratingMap[c.id]?.count ?? 0,
  }))

  return <CoachesClient initialCoaches={coaches} />
}
