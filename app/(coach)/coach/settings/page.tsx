'use client'
import { useUser } from '@/hooks/useUser'
import { LogOut, Trash2, Bell, Shield } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'

export default function CoachSettingsPage() {
  const { profile, signOut } = useUser()

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '24px 28px', marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: SILVER, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px' }}>{title}</h2>
      {children}
    </div>
  )

  const row = (icon: React.ReactNode, label: string, sub: string, action: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: SILVER }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: CREAM }}>{label}</div>
          <div style={{ fontSize: 12, color: SILVER, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      {action}
    </div>
  )

  return (
    <div style={{ padding: '40px 48px', maxWidth: 680, color: CREAM }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: CREAM, marginBottom: 8, letterSpacing: '-0.5px' }}>Paramètres</h1>
      <p style={{ fontSize: 14, color: SILVER, marginBottom: 32 }}>Gérez votre compte et vos préférences.</p>

      {section('Compte', <>
        {row(<Shield size={18}/>, 'Email', profile?.email ?? '—',
          <span style={{ fontSize: 12, color: SILVER, padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 8 }}>Vérifié</span>
        )}
        {row(<Bell size={18}/>, 'Notifications', 'Emails et alertes plateforme',
          <button style={{ fontSize: 12, color: SILVER, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 14px', cursor: 'default' }}>Bientôt</button>
        )}
      </>)}

      {section('Session', <>
        {row(<LogOut size={18}/>, 'Se déconnecter', 'Fermer cette session',
          <button onClick={signOut} style={{ fontSize: 13, fontWeight: 600, color: '#f0f4ff', background: '#7c3aed', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        )}
      </>)}

      {section('Zone de danger', <>
        {row(<Trash2 size={18}/>, 'Supprimer mon compte', 'Action irréversible — toutes vos données seront perdues',
          <button disabled style={{ fontSize: 12, color: 'rgba(239,68,68,0.5)', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'not-allowed' }}>
            Bientôt disponible
          </button>
        )}
      </>)}
    </div>
  )
}
