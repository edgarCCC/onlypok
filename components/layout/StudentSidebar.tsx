'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Users, BarChart2, MessageSquare, LogOut } from 'lucide-react'
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
    <aside style={{ width: 220, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', position: 'sticky', top: 0, height: '100vh' }}>
      <Link href="/" style={{ textDecoration: 'none', padding: '8px 12px', marginBottom: 24 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>OnlyPok</span>
      </Link>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--accent)' : 'var(--text-secondary)', background: active ? 'var(--accent-glow)' : 'transparent', transition: 'all 0.15s' }}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ padding: '8px 12px', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.username ?? 'Joueur'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{profile?.xp ?? 0} XP</div>
        </div>
        <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
