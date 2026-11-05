'use client'
import { LogOut } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/client'

const SILVER = 'var(--text-2)'
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
        <Logo href="/admin" label="OnlyPok, administration" />
        <span className="ui-nav-role">Admin</span>
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
