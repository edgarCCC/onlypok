'use client'
import { useUser } from '@/hooks/useUser'
import { CoachHeader } from '@/app/(coach)/CoachLayoutClient'
import Navbar from '@/components/landing/Navbar'

export default function TrackerLayoutClient({ children }: { children: React.ReactNode }) {
  const { profile } = useUser()
  const isCoach = profile?.role === 'coach'

  return (
    <>
      {isCoach ? <CoachHeader profile={profile} /> : <Navbar />}
      {children}
    </>
  )
}
