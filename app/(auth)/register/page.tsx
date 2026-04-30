'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, role: 'student' } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email, username, role: 'student', xp: 0 })
    }
    router.push('/formations')
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#f0f4ff', fontSize: 14, outline: 'none' }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 24, fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OnlyPok</span>
        </Link>
        <p style={{ color: 'rgba(240,244,255,0.5)', marginTop: 8, fontSize: 14 }}>Crée ton compte élève</p>
      </div>
      <div style={{ background: '#0c1017', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 32 }}>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Pseudo', value: username, setter: setUsername, type: 'text', placeholder: 'PokerPro69' },
            { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'toi@exemple.com' },
            { label: 'Mot de passe', value: password, setter: setPassword, type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 13, color: 'rgba(240,244,255,0.5)', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} required placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
          {error && <p style={{ color: '#e11d48', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(240,244,255,0.5)' }}>
          Déjà un compte ? <Link href="/login" style={{ color: '#a855f7', textDecoration: 'none' }}>Se connecter</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'rgba(240,244,255,0.35)' }}>
          Tu veux coacher ? <Link href="/become-coach" style={{ color: '#7c3aed', textDecoration: 'none' }}>Devenir coach</Link>
        </p>
      </div>
    </div>
  )
}
