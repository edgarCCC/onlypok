'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'student' | 'coach'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, role } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email, username, role, xp: 0 })
    }
    router.push(role === 'coach' ? '/coach/dashboard' : '/formations')
  }

  const inputStyle = { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>OnlyPok</span></Link>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>Crée ton compte</p>
      </div>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Je suis…</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['student', 'coach'] as Role[]).map(r => (
                <div key={r} onClick={() => setRole(r)} style={{ flex: 1, border: `2px solid ${role === r ? 'var(--accent)' : 'var(--border)'}`, background: role === r ? 'var(--accent-glow)' : 'var(--bg-card)', borderRadius: 10, padding: '16px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: role === r ? 'var(--accent)' : 'var(--text-primary)' }}>{r === 'student' ? '🎓 Élève' : '🏆 Coach'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r === 'student' ? 'Je veux progresser' : 'Je veux enseigner'}</div>
                </div>
              ))}
            </div>
          </div>
          {[
            { label: 'Pseudo', value: username, setter: setUsername, type: 'text', placeholder: 'PokerPro69' },
            { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'toi@exemple.com' },
            { label: 'Mot de passe', value: password, setter: setPassword, type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} required placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          Déjà un compte ? <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
