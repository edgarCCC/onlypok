'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import DVDBounce from '@/components/DVDBounce'
import LegalFooter from '@/components/layout/LegalFooter'
import { COACH_TABS, isTabActive, NAV } from './coach-nav'
import { useCoachBadges } from './useCoachBadges'
import CoachNotificationsBell from './CoachNotificationsBell'
import CoachAccountMenu from './CoachAccountMenu'
import CoachMobileNav from './CoachMobileNav'
import './coach-nav.css'

type HeaderProfile = { id?: string; username?: string | null; avatar_url?: string | null } | null

/* ── CoachHeader ─────────────────────────────────────────────────────────────
   6 onglets à plat (plus de menus au survol), cloche de notifications et menu
   compte à droite. Sous 900 px : barre d'onglets fixe en bas d'écran.
   Aussi utilisé par /tracker et /trainer quand l'utilisateur est coach. */
export function CoachHeader({ profile }: { profile: HeaderProfile }) {
  const pathname = usePathname()
  const { user, signOut } = useUser()
  const { badges, setNotificationCount } = useCoachBadges(user?.id, pathname)

  const name    = profile?.username ?? 'Coach'
  const coachId = profile?.id ?? user?.id

  return (
    <>
      <header className="coach-header">
        <Link href="/coach/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }} />
          <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontWeight: 700, fontSize: 13, letterSpacing: '0.18em', color: NAV.cream }}>
            ONLYPOK
          </span>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: NAV.violet, padding: '2px 6px', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 4 }}>
            Coach
          </span>
        </Link>

        <nav className="coach-tabs" aria-label="Navigation coach">
          {COACH_TABS.map(tab => {
            const active = isTabActive(tab, pathname)
            const count  = tab.badge ? badges[tab.badge] : 0
            const Icon   = tab.icon
            return (
              <Link key={tab.href} href={tab.href} className="coach-tab" data-active={active || undefined}
                aria-current={active ? 'page' : undefined}>
                <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                {tab.label}
                {count > 0 && <span className="coach-tab-count" aria-label={`${count} en attente`}>{count > 99 ? '99+' : count}</span>}
              </Link>
            )
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <CoachNotificationsBell userId={user?.id} unread={badges.notifications} onChange={setNotificationCount} />
          <CoachAccountMenu coachId={coachId} name={name} avatarUrl={profile?.avatar_url} onSignOut={signOut} />
        </div>
      </header>

      <CoachMobileNav pathname={pathname} badges={badges} coachId={coachId} onSignOut={signOut} />
    </>
  )
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
export default function CoachLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, loading } = useUser()
  const isOnboarding = pathname === '/coach/onboarding'

  if (isOnboarding) return <>{children}</>

  const incomplete = !loading && profile && profile.onboarding_completed === false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#04040a', position: 'relative' }}>
      <DVDBounce />
      <CoachHeader profile={profile as HeaderProfile} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {incomplete && (
          <div style={{ background: 'rgba(124,58,237,0.12)', borderBottom: '1px solid rgba(124,58,237,0.25)', padding: '10px clamp(16px,3vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.7)' }}>
              Votre profil coach n&apos;est pas encore finalisé — complétez-le pour apparaître dans la marketplace.
            </span>
            <Link href="/coach/onboarding" style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 14px', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8 }}>
              Finaliser →
            </Link>
          </div>
        )}
        <main style={{ flex: 1 }}>{children}</main>
        <LegalFooter />
      </div>
    </div>
  )
}
