'use client'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'

export default function Navbar() {
  const { user, profile, signOut } = useUser()

  return (
    <nav style={{
      background: 'var(--bg)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid color-mix(in srgb, var(--overlay) 6%, transparent)',
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
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>OnlyPok</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {[['Formations', '/formations'], ['Coachs', '/coaches']].map(([label, href]) => (
          <Link key={href} href={href} style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13, fontWeight: 500, letterSpacing: '-0.1px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            {profile?.role === 'coach' && (
              <Link href="/coach/dashboard" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', padding: '7px 14px', border: '1px solid color-mix(in srgb, var(--overlay) 10%, transparent)', borderRadius: 8, transition: 'all 0.15s' }}>Dashboard</Link>
            )}
            <button onClick={signOut} style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 14px' }}>Déconnexion</button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', padding: '7px 14px' }}>Connexion</Link>
            <Link href="/register" style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-brand)', textDecoration: 'none', padding: '8px 18px', background: 'var(--accent)', borderRadius: 8, letterSpacing: '-0.1px' }}>S'inscrire</Link>
          </>
        )}
      </div>
    </nav>
  )
}
