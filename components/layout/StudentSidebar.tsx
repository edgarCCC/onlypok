'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Users, BarChart2, MessageSquare, LogOut, Spade } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

const links = [
  { href: '/formations', label: 'Formations', icon: BookOpen },
  { href: '/coaches', label: 'Coachs', icon: Users },
  { href: '/student/track', label: 'Tracker', icon: BarChart2 },
  { href: '/student/messages', label: 'Messages', icon: MessageSquare },
]

export default function StudentSidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useUser()

  return (
    <aside style={{
      width: 240,
      background: '#080c10',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      position: 'sticky',
      top: 0,
      height: '100vh',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>♠</div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>OnlyPok</span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', marginBottom: 4 }}>Menu</p>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? '#fff' : 'rgba(255,255,255,0.4)',
              background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'all 0.15s',
              letterSpacing: '-0.1px',
            }}>
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              {label}
              {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {(profile?.username ?? 'U')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.username ?? 'Joueur'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{profile?.xp ?? 0} XP</div>
          </div>
        </div>
        <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)' )}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
