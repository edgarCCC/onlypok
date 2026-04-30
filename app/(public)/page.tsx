import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import SocialProofBar from '@/components/landing/SocialProofBar'
import ManifestoSection from '@/components/landing/ManifestoSection'
import FeaturesScroll from '@/components/landing/FeaturesScroll'
import StatsSection from '@/components/landing/StatsSection'
import CoachesSpotlight from '@/components/landing/CoachesSpotlight'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import FinalCTA from '@/components/landing/FinalCTA'
import Footer from '@/components/landing/Footer'

const AVATAR_COLORS = ['#7c3aed','#e11d48','#06b6d4','#a855f7','#8b5cf6','#22d3ee']

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const admin = createAdminSupabaseClient()

  const [
    { count: playerCount },
    { data: recentProfiles },
    { count: coachCount },
    { count: formationCount },
    { data: reviewsData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('username').eq('role', 'student').order('created_at', { ascending: false }).limit(3),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach'),
    supabase.from('formations').select('*', { count: 'exact', head: true }),
    admin.from('reviews').select('rating'),
  ])

  const avgRating = reviewsData && reviewsData.length > 0
    ? reviewsData.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewsData.length
    : 0

  const recentUsers = (recentProfiles ?? []).map((p, i) => ({
    username: p.username ?? '?',
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }))

  return (
    <main style={{ background: '#04040a', minHeight: '100vh' }}>
      <Navbar />
      <HeroSection playerCount={playerCount ?? 0} recentUsers={recentUsers} />
      <SocialProofBar />
      <ManifestoSection />
      <FeaturesScroll />
      <StatsSection
        studentCount={playerCount ?? 0}
        coachCount={coachCount ?? 0}
        formationCount={formationCount ?? 0}
        avgRating={avgRating}
      />
      <CoachesSpotlight />
      <TestimonialsSection />
      <FinalCTA />
      <Footer />
    </main>
  )
}
