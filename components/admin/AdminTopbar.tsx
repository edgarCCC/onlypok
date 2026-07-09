'use client'
import { ShieldCheck, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const BORDER = 'rgba(232,228,220,0.08)'

export default function AdminTopbar({ email }: { email: string }) {
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px clamp(20px,5vw,64px)', borderBottom: `1px solid ${BORDER}`, background: 'rgba(4,4,10,0.9)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={17} color={VIOLET} />
        <span style={{ fontSize: 14, fontWeight: 800, color: CREAM, letterSpacing: '-0.2px' }}>OnlyPok — Admin</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 12, color: SILVER }}>{email}</span>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 8, color: SILVER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <LogOut size={13} /> Déconnexion
        </button>
      </div>
    </header>
  )
}
