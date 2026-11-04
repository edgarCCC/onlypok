'use client'
import { ShieldCheck, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CREAM  = 'var(--text)'
const SILVER = 'var(--text-2)'
const VIOLET = 'var(--brand)'
const BORDER = 'color-mix(in srgb, var(--brand) 8%, transparent)'

export default function AdminTopbar({ email }: { email: string }) {
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px clamp(20px,5vw,64px)', borderBottom: `1px solid ${BORDER}`, background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={17} color={VIOLET} />
        <span style={{ fontSize: 14, fontWeight: 800, color: CREAM, letterSpacing: '-0.2px' }}>OnlyPok — Admin</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 12, color: SILVER }}>{email}</span>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'color-mix(in srgb, var(--overlay) 5%, transparent)', border: `1px solid ${BORDER}`, borderRadius: 8, color: SILVER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <LogOut size={13} /> Déconnexion
        </button>
      </div>
    </header>
  )
}
