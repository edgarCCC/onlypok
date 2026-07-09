'use client'
import { useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CARD   = 'rgba(232,228,220,0.03)'
const BORDER = 'rgba(232,228,220,0.08)'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(0,0,0,0.35)',
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  color: CREAM,
  fontSize: 14,
  outline: 'none',
}

export default function AdminLoginPage() {
  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setErr('Identifiants incorrects')
      setLoading(false)
      return
    }

    /* Porte réservée aux admins : tout autre rôle est déconnecté immédiatement */
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setErr("Ce compte n'a pas les droits administrateur")
      setLoading(false)
      return
    }

    // Navigation dure : le middleware relit les cookies de session
    window.location.href = '/admin'
  }

  return (
    <main style={{ minHeight: '100vh', background: '#04040a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '36px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={22} color={VIOLET} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', margin: 0 }}>OnlyPok — Admin</h1>
        </div>
        <p style={{ fontSize: 13, color: SILVER, margin: '0 0 28px' }}>Accès réservé aux administrateurs de la plateforme.</p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: SILVER, marginBottom: 6, letterSpacing: '0.04em' }}>EMAIL</label>
        <input
          type="email" required autoComplete="email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ ...inputStyle, marginBottom: 18 }}
        />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: SILVER, marginBottom: 6, letterSpacing: '0.04em' }}>MOT DE PASSE</label>
        <input
          type="password" required autoComplete="current-password" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: 24 }}
        />

        {err && (
          <div style={{ marginBottom: 18, padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
            {err}
          </div>
        )}

        <button
          type="submit" disabled={loading}
          style={{ width: '100%', padding: '13px 0', background: VIOLET, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Connexion…</> : 'Se connecter'}
        </button>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </form>
    </main>
  )
}
