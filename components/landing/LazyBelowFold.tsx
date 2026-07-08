'use client'

import dynamic from 'next/dynamic'

// Below-the-fold landing sections all rely on gsap (+ ScrollTrigger / useGSAP).
// Loading them through next/dynamic keeps gsap out of the critical (above-the-fold)
// bundle shipped with Navbar/HeroSection — it is fetched as separate chunks instead.
const ManifestoSection = dynamic(() => import('./ManifestoSection'))
const FeaturesScroll = dynamic(() => import('./FeaturesScroll'))
const StatsSection = dynamic(() => import('./StatsSection'))
const CoachesSpotlight = dynamic(() => import('./CoachesSpotlight'))
const TestimonialsSection = dynamic(() => import('./TestimonialsSection'))
const FinalCTA = dynamic(() => import('./FinalCTA'))

interface LazyBelowFoldProps {
  studentCount: number
  coachCount: number
  formationCount: number
  avgRating: number
}

export default function LazyBelowFold({ studentCount, coachCount, formationCount, avgRating }: LazyBelowFoldProps) {
  return (
    <>
      <ManifestoSection />
      <FeaturesScroll />
      <StatsSection
        studentCount={studentCount}
        coachCount={coachCount}
        formationCount={formationCount}
        avgRating={avgRating}
      />
      <CoachesSpotlight />
      <TestimonialsSection />
      <FinalCTA />
    </>
  )
}
