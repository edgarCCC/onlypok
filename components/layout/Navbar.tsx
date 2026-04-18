'use client'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'

export default function Navbar() {
  const { user, profile, signOut } = useUser()

  return (
    <nav style={{
      background: 'rgba(8,12,16,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 32px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>♠</div>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>OnlyPok</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {[['Formations', '/formations'], ['Coachs', '/coaches']].map(([label, href]) => (
          <Link key={href} href={href} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, fontWeight: 500, letterSpacing: '-0.1px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            {profile?.role === 'coach' && (
              <Link href="/coach/dashboard" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, transition: 'all 0.15s' }}>Dashboard</Link>
            )}
            <button onClick={signOut} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 14px' }}>Déconnexion</button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', padding: '7px 14px' }}>Connexion</Link>
            <Link href="/register" style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', padding: '8px 18px', background: 'var(--accent)', borderRadius: 8, letterSpacing: '-0.1px' }}>S'inscrire</Link>
          </>
        )}
      </div>
    </nav>
  )
}
