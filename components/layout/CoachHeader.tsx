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

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: 64,
      background: 'rgba(4,4,10,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 clamp(20px,4vw,48px)',
    }}>

      {/* Logo — même style que landing */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 7, height: 7, borderRadius: 2,
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-syne, sans-serif)',
          fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: '#f0f4ff',
        }}>ONLYPOK</span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#7c3aed',
          padding: '2px 7px', border: '1px solid rgba(124,58,237,0.35)',
          borderRadius: 4,
        }}>Coach</span>
      </Link>

      {/* Nav centré */}
      <nav style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: 4, gap: 2,
      }}>
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{
              padding: '7px 20px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? '#f0f4ff' : 'rgba(240,244,255,0.35)',
              background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
              transition: 'all 0.15s',
              letterSpacing: active ? '-0.1px' : '0',
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,244,255,0.65)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,244,255,0.35)' }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>
            {(profile?.username ?? 'C')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(240,244,255,0.55)' }}>
            {profile?.username ?? 'Coach'}
          </span>
        </div>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <button onClick={signOut} style={{
          fontSize: 12, color: 'rgba(240,244,255,0.28)',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 8px', borderRadius: 6, transition: 'color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.65)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.28)')}>
          Déconnexion
        </button>
      </div>
    </header>
  )
}
