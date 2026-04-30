'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import CoachHeader from '@/components/layout/CoachHeader'
import DVDBounce from '@/components/DVDBounce'

export default function CoachLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const { profile, loading } = useUser()
  const isOnboarding = pathname === '/coach/onboarding'

  if (isOnboarding) return <>{children}</>

  const incomplete = !loading && profile && (profile as any).onboarding_completed === false

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', position: 'relative' }}>
      <DVDBounce />
      <CoachHeader />

      {incomplete && (
        <div style={{ background: 'rgba(124,58,237,0.12)', borderBottom: '1px solid rgba(124,58,237,0.25)', padding: '10px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.7)' }}>
            Votre profil coach n'est pas encore finalisé — complétez-le pour apparaître dans la marketplace.
          </span>
          <Link href="/coach/onboarding" style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 14px', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8 }}>
            Finaliser →
          </Link>
        </div>
      )}

      <main>{children}</main>
    </div>
  )
}
