'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    router.refresh()
    router.push(profile?.role === 'coach' ? '/coach/dashboard' : '/formations')
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#f0f4ff', fontSize: 14, outline: 'none' }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 24, fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OnlyPok</span>
        </Link>
        <p style={{ color: 'rgba(240,244,255,0.5)', marginTop: 8, fontSize: 14 }}>Connexion à ton compte</p>
      </div>
      <div style={{ background: '#0c1017', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 32 }}>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: 'rgba(240,244,255,0.5)', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="toi@exemple.com" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'rgba(240,244,255,0.5)', display: 'block', marginBottom: 6 }}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
          </div>
          {error && <p style={{ color: '#e11d48', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(240,244,255,0.5)' }}>
          Pas encore de compte ? <Link href="/register" style={{ color: '#a855f7', textDecoration: 'none' }}>S'inscrire</Link>
        </p>
      </div>
    </div>
  )
}
