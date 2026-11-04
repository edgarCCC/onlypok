'use client'
import { CoachHeader } from '@/app/(coach)/CoachLayoutClient'
import Logo from '@/components/ui/Logo'
import { useUser } from '@/hooks/useUser'
import SiteNav from './SiteNav'
import StudentHeader from './StudentHeader'

/* La même barre partout : un outil public (trainer, tracker, pages légales) garde la navigation de celui qui le regarde.
   Pendant la lecture du profil, le logo seul : pas de clignotement « Se connecter » pour une personne déjà connectée. */
export default function RoleHeader() {
  const { profile, loading } = useUser()
  if (profile?.role === 'coach') return <CoachHeader profile={profile} />
  if (profile) return <StudentHeader />
  if (loading) {
    return (
      <header className="ui-nav" aria-busy="true">
        <div className="ui-wrap ui-nav-bar is-wide"><Logo /></div>
      </header>
    )
  }
  return <SiteNav wide />
}
