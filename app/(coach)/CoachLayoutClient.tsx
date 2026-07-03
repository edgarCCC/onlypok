'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import DVDBounce from '@/components/DVDBounce'
import LegalFooter from '@/components/layout/LegalFooter'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, ImageIcon, TrendingUp, Users, Star,
  Calendar, Settings, MessageSquare, Bell,
  ClipboardList, Video, ChevronDown, LogOut,
  BarChart2, Target, Zap,
} from 'lucide-react'

/* ── Design tokens ───────────────────────────────────────────────────────── */
const BG     = 'rgba(5,7,9,0.96)'
const BORDER = 'rgba(255,255,255,0.07)'
const CREAM  = '#e8eaf0'
const DIM    = 'rgba(232,234,240,0.38)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

/* ── Nav groups ──────────────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    id: 'principal',
    label: 'Principal',
    icon: LayoutDashboard,
    color: VIOLET,
    items: [
      { href: '/coach/dashboard', label: 'Dashboard',  icon: LayoutDashboard, desc: 'Vue globale' },
      { href: '/coach/profile',   label: 'Mon profil', icon: ImageIcon,       desc: 'Modifier votre page coach' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: TrendingUp,
    color: '#10b981',
    items: [
      { href: '/coach/revenue',    label: 'Revenus',        icon: TrendingUp,  desc: 'Suivi des paiements' },
      { href: '/coach/students',   label: 'Élèves',         icon: Users,       desc: 'Vos apprenants' },
      { href: '/coach/reviews',    label: 'Avis',           icon: Star,        desc: 'Évaluations reçues' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: Calendar,
    color: '#f59e0b',
    items: [
      { href: '/coach/calendar',  label: 'Calendrier', icon: Calendar,      desc: 'Disponibilités' },
      { href: '/coach/sessions',  label: 'Sessions',   icon: Video,         desc: 'Séances planifiées' },
      { href: '/coach/requests',  label: 'Demandes',   icon: ClipboardList, desc: 'Réservations en attente' },
    ],
  },
  {
    id: 'comms',
    label: 'Comms',
    icon: MessageSquare,
    color: CYAN,
    items: [
      { href: '/coach/messages',      label: 'Messages',      icon: MessageSquare, desc: 'Conversations' },
      { href: '/coach/notifications', label: 'Notifications', icon: Bell,          desc: 'Alertes et actus' },
    ],
  },
  {
    id: 'outils',
    label: 'Outils',
    icon: Zap,
    color: '#a78bfa',
    items: [
      { href: '/tracker',  label: 'Tracker',  icon: BarChart2, desc: 'Suivi de sessions poker' },
      { href: '/coach/trainer', label: 'Trainer', icon: Target, desc: 'Quiz de ranges & équité' },
    ],
  },
]

/* ── CoachHeader ─────────────────────────────────────────────────────────── */
export function CoachHeader({ profile }: { profile: any }) {
  const pathname = usePathname()
  const { signOut } = useUser()
  const [openId, setOpenId] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initials = (profile?.username ?? 'C').slice(0, 2).toUpperCase()

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleGroupEnter = useCallback((id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenId(id)
  }, [])

  const handleGroupLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenId(null), 150)
  }, [])

  /* is any item within a group currently active? */
  const groupActive = (groupId: string) => {
    const group = NAV_GROUPS.find(g => g.id === groupId)
    return group?.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/')) ?? false
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 200, height: 58,
      background: 'rgba(4,4,10,0.95)', backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(16px,3vw,40px)',
    }}>

      {/* ── Logo ── */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontWeight: 700, fontSize: 13, letterSpacing: '0.18em', color: CREAM }}>
          ONLYPOK
        </span>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: VIOLET, padding: '2px 6px', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 4 }}>
          Coach
        </span>
      </Link>

      {/* ── Group nav ── */}
      <nav ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {NAV_GROUPS.map(group => {
          const isOpen   = openId === group.id
          const isActive = groupActive(group.id)
          const GroupIcon = group.icon

          return (
            <div key={group.id} style={{ position: 'relative' }}
              onMouseEnter={() => handleGroupEnter(group.id)}
              onMouseLeave={handleGroupLeave}
            >
              {/* Trigger */}
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isOpen ? `${group.color}14` : isActive ? `${group.color}10` : 'transparent',
                color: isActive || isOpen ? CREAM : DIM,
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
              }}>
                <GroupIcon size={13} color={isActive || isOpen ? group.color : 'currentColor'} strokeWidth={isActive ? 2.2 : 1.8} />
                {group.label}
                <ChevronDown size={11} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }} />
              </button>

              {/* Dropdown */}
              {isOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                  background: BG, border: `1px solid ${BORDER}`, borderRadius: 12,
                  padding: 6, minWidth: 220,
                  boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(24px)',
                  animation: 'dropIn 0.15s ease',
                }}>
                  {/* color accent top */}
                  <div style={{ height: 2, background: `linear-gradient(90deg, ${group.color}, ${group.color}40, transparent)`, borderRadius: '6px 6px 0 0', marginBottom: 6 }} />

                  {group.items.map(({ href, label, icon: Icon, desc }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    return (
                      <Link key={href} href={href} onClick={() => setOpenId(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
                          background: active ? `${group.color}12` : 'transparent',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          background: active ? `${group.color}18` : 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={14} color={active ? group.color : 'rgba(232,234,240,0.35)'} strokeWidth={active ? 2.2 : 1.8} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? CREAM : 'rgba(232,234,240,0.7)', lineHeight: 1.2 }}>
                            {label}
                          </p>
                          <p style={{ fontSize: 10, color: 'rgba(232,234,240,0.28)', marginTop: 1 }}>{desc}</p>
                        </div>
                        {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: group.color, boxShadow: `0 0 6px ${group.color}`, flexShrink: 0 }} />}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Settings standalone */}
        <Link href="/coach/settings"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
            background: pathname.startsWith('/coach/settings') ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: pathname.startsWith('/coach/settings') ? CREAM : DIM,
            fontSize: 13, fontWeight: pathname.startsWith('/coach/settings') ? 600 : 400,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = CREAM }}
          onMouseLeave={e => { e.currentTarget.style.background = pathname.startsWith('/coach/settings') ? 'rgba(255,255,255,0.06)' : 'transparent'; e.currentTarget.style.color = pathname.startsWith('/coach/settings') ? CREAM : DIM }}
        >
          <Settings size={13} strokeWidth={1.8} />
          Paramètres
        </Link>
      </nav>

      {/* ── Right ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', boxShadow: '0 0 0 2px rgba(124,58,237,0.25)', flexShrink: 0, overflow: 'hidden' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(232,234,240,0.4)' }}>
          {profile?.username ?? 'Coach'}
        </span>
        <div style={{ width: 1, height: 14, background: BORDER }} />
        <button onClick={signOut}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(232,234,240,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,234,240,0.25)'; e.currentTarget.style.background = 'none' }}
        >
          <LogOut size={12} />
        </button>
      </div>

      <style>{`@keyframes dropIn { from { opacity:0; transform:translateX(-50%) translateY(-6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </header>
  )
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
export default function CoachLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, loading } = useUser()
  const isOnboarding = pathname === '/coach/onboarding'

  if (isOnboarding) return <>{children}</>

  const incomplete = !loading && profile && (profile as any).onboarding_completed === false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#04040a', position: 'relative' }}>
      <DVDBounce />
      <CoachHeader profile={profile} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {incomplete && (
          <div style={{ background: 'rgba(124,58,237,0.12)', borderBottom: '1px solid rgba(124,58,237,0.25)', padding: '10px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.7)' }}>
              Votre profil coach n'est pas encore finalisé — complétez-le pour apparaître dans la marketplace.
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
