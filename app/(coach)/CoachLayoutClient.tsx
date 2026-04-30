'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import CoachHeader from '@/components/layout/CoachHeader'
import DVDBounce from '@/components/DVDBounce'

export default function CoachLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile, loading } = useUser()
  const isOnboarding = pathname === '/coach/onboarding'

  useEffect(() => {
    if (loading) return
    if (!profile) return
    // Only redirect if the column exists AND is explicitly false
    const completed = (profile as any).onboarding_completed
    if (completed === false && !isOnboarding) {
      router.replace('/coach/onboarding')
    }
  }, [loading, profile, isOnboarding, router])

  if (isOnboarding) return <>{children}</>

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', position: 'relative' }}>
      <DVDBounce />
      <CoachHeader />
      <main>{children}</main>
    </div>
  )
}
