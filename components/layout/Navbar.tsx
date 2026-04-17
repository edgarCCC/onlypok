'use client'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'

export default function Navbar() {
  const { user, profile, signOut } = useUser()

  return (
    <nav style={{ background: 'rgba(8,12,16,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>OnlyPok</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link href="/formations" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14 }}>Formations</Link>
        <Link href="/coaches" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14 }}>Coachs</Link>
        {user ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {profile?.role === 'coach' && (
              <Link href="/coach/dashboard" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>Dashboard</Link>
            )}
            <button onClick={signOut} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Déconnexion</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, padding: '6px 14px' }}>Connexion</Link>
            <Link href="/register" style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: 14, padding: '6px 16px', borderRadius: 8, fontWeight: 500 }}>S'inscrire</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
