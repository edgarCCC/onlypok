'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import DVDBounce from '@/components/DVDBounce'

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
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */

import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, ImageIcon, TrendingUp, Users, Star,
  Calendar, Settings, ChevronDown, BookOpen, MessageSquare,
  Bell, ClipboardList, Video, ShieldAlert, LogOut,
} from 'lucide-react'

const GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/coach/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
      { href: '/coach/profile',     label: 'Mon profil',     icon: ImageIcon },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/coach/formations',  label: 'Mes formations', icon: BookOpen },
      { href: '/coach/revenue',     label: 'Revenus',        icon: TrendingUp },
      { href: '/coach/students',    label: 'Élèves',         icon: Users },
      { href: '/coach/reviews',     label: 'Avis',           icon: Star },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/coach/calendar',    label: 'Calendrier',     icon: Calendar },
      { href: '/coach/sessions',    label: 'Sessions',       icon: Video },
      { href: '/coach/requests',    label: 'Demandes',       icon: ClipboardList },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/coach/messages',      label: 'Messages',       icon: MessageSquare },
      { href: '/coach/notifications', label: 'Notifications',  icon: Bell },
    ],
  },
]

const BG     = 'rgba(5,7,9,0.96)'
const BORDER = 'rgba(255,255,255,0.07)'
const CREAM  = '#e8eaf0'
const DIM    = 'rgba(232,234,240,0.32)'
const VIOLET = '#7c3aed'

function CoachHeader({ profile }: { profile: any }) {
  const pathname = usePathname()
  const { signOut } = useUser()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* active section label for the trigger button */
  const allItems = GROUPS.flatMap(g => g.items)
  const active = allItems.find(i => pathname === i.href || pathname.startsWith(i.href + '/'))
  const initials = (profile?.username ?? 'C').slice(0, 2).toUpperCase()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, height: 62,
      background: 'rgba(5,7,9,0.94)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(20px,4vw,48px)',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: CREAM }}>
          ONLYPOK
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: VIOLET, padding: '2px 7px', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 4 }}>
          Coach
        </span>
      </Link>

      {/* Dropdown nav — centré */}
      <div ref={ref} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: open ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${open ? 'rgba(124,58,237,0.35)' : BORDER}`,
            borderRadius: 10, padding: '7px 14px 7px 16px',
            cursor: 'pointer', transition: 'all 0.18s',
          }}
        >
          {active ? (
            <>
              <active.icon size={13} color={VIOLET} strokeWidth={2.2} />
              <span style={{ fontSize: 13, fontWeight: 600, color: CREAM, letterSpacing: '-0.1px' }}>
                {active.label}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>Navigation</span>
          )}
          <ChevronDown size={13} color={DIM} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', marginLeft: 2 }} />
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
            background: BG, border: `1px solid ${BORDER}`, borderRadius: 14,
            padding: '10px 8px', minWidth: 280,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
          }}>
            {GROUPS.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <div style={{ height: 1, background: BORDER, margin: '6px 8px' }} />}
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(232,234,240,0.2)', padding: '4px 10px 6px' }}>
                  {group.label}
                </p>
                {group.items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link key={href} href={href} onClick={() => setOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
                        background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                        color: isActive ? CREAM : DIM,
                        fontSize: 13, fontWeight: isActive ? 600 : 400,
                        transition: 'all 0.13s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; if (!isActive) e.currentTarget.style.color = 'rgba(232,234,240,0.7)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; if (!isActive) e.currentTarget.style.color = DIM }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: isActive ? `${VIOLET}18` : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} color={isActive ? VIOLET : 'rgba(232,234,240,0.4)'} strokeWidth={isActive ? 2.2 : 1.8} />
                      </div>
                      {label}
                      {isActive && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: VIOLET, boxShadow: `0 0 6px ${VIOLET}` }} />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right — avatar + signout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', boxShadow: '0 0 0 2px rgba(124,58,237,0.3)' }}>
          {initials}
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(232,234,240,0.45)', letterSpacing: '-0.1px' }}>
          {profile?.username ?? 'Coach'}
        </span>
        <div style={{ width: 1, height: 14, background: BORDER }} />
        <button onClick={signOut}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(232,234,240,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,234,240,0.25)'; e.currentTarget.style.background = 'none' }}
        >
          <LogOut size={12} />
          Déco
        </button>
      </div>
    </header>
  )
}
