'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

const NAV = [
  { href: '/coach/dashboard', label: 'Dashboard' },
  { href: '/coach/profile',   label: 'Mon profil' },
]

export default function CoachHeader() {
  const pathname = usePathname()
  const { profile, signOut } = useUser()

  const initials = (profile?.username ?? 'C').slice(0, 2).toUpperCase()

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: 62,
      background: 'rgba(5,7,9,0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 clamp(20px,4vw,48px)',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 7, height: 7, borderRadius: 2,
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-syne, sans-serif)',
          fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: '#e8eaf0',
        }}>ONLYPOK</span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#7c3aed',
          padding: '2px 7px',
          border: '1px solid rgba(124,58,237,0.35)',
          borderRadius: 4,
        }}>Coach</span>
      </Link>

      {/* Nav pill — centered */}
      <nav style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '3px',
        gap: 2,
      }}>
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{
              padding: '6px 18px',
              borderRadius: 7,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? '#e8eaf0' : 'rgba(232,234,240,0.32)',
              background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
              transition: 'all 0.18s',
              letterSpacing: active ? '-0.1px' : '0',
              boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.07)' : 'none',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(232,234,240,0.62)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(232,234,240,0.32)' }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Right — avatar + sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#fff',
            boxShadow: '0 0 0 2px rgba(124,58,237,0.3)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(232,234,240,0.5)', letterSpacing: '-0.1px' }}>
            {profile?.username ?? 'Coach'}
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)' }} />

        <button
          onClick={signOut}
          style={{
            fontSize: 12, color: 'rgba(232,234,240,0.25)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: 6,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'rgba(239,68,68,0.7)'
            e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(232,234,240,0.25)'
            e.currentTarget.style.background = 'none'
          }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
