import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FormationsPageClient from './FormationsPageClient'

export default async function FormationsPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: formations }, { data: reviews }] = await Promise.all([
    supabase
      .from('formations')
      .select('*, coach:profiles(id, username, avatar_url, is_pro, years_experience, variants)')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('rating, category_ratings, coach_id, content_type')
      .limit(500),
  ])

  const { data: { user } } = await supabase.auth.getUser()
  let userRole: 'coach' | 'student' | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    userRole = (profile?.role as 'coach' | 'student') ?? null
  }

  return (
    <Suspense>
      <FormationsPageClient
        initialFormations={formations ?? []}
        initialReviews={reviews ?? []}
        initialUserRole={userRole}
      />
    </Suspense>
  )
}
