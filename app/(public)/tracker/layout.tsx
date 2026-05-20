'use client'
import { useUser } from '@/hooks/useUser'
import CoachHeader from '@/components/layout/CoachHeader'
import Navbar from '@/components/landing/Navbar'

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useUser()
  const isCoach = profile?.role === 'coach'

  return (
    <>
      {isCoach ? <CoachHeader /> : <Navbar />}
      {children}
    </>
  )
}
