'use client'
import { useUser } from '@/hooks/useUser'
import { CoachHeader } from '@/app/(coach)/CoachLayoutClient'
import Navbar from '@/components/landing/Navbar'

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useUser()
  const isCoach = profile?.role === 'coach'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07090e' }}>
      {isCoach ? <CoachHeader profile={profile} /> : <Navbar />}
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
