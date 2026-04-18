'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Users, Calendar, Settings, LogOut } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

const links = [
  { href: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach/formations', label: 'Formations', icon: BookOpen },
  { href: '/coach/students', label: 'Élèves', icon: Users },
  { href: '/coach/calendar', label: 'Calendrier', icon: Calendar },
  { href: '/coach/settings', label: 'Paramètres', icon: Settings },
]

export default function CoachSidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useUser()

  return (
    <aside style={{
      width: 240,
      background: '#080c10',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
      flexShrink: 0,
    }}>
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>♠</div>
          <div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', display: 'block' }}>OnlyPok</span>
            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Coach</span>
          </div>
        </Link>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', marginBottom: 4 }}>Espace coach</p>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 13,
              fontWeight: active ? 600 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.4)', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', transition: 'all 0.15s',
            }}>
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              {label}
              {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {(profile?.username ?? 'C')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{profile?.username ?? 'Coach'}</div>
            <div style={{ fontSize: 11, color: 'var(--accent)' }}>Espace coach</div>
          </div>
        </div>
        <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
