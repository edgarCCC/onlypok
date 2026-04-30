'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, TrendingUp, Users } from 'lucide-react'

const perks = [
  { Icon: BookOpen,    label: 'Formations',  sub: 'Vidéos, chapitres, quiz' },
  { Icon: TrendingUp,  label: 'Revenus',     sub: 'Abos, packs, sessions' },
  { Icon: Users,       label: 'Élèves',      sub: 'Stats, progression' },
]

const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'rgba(240,244,255,0.35)',
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 7,
}
const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8,
  padding: '11px 14px', color: '#f0f4ff', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

export default function BecomeCoachPage() {
  const router = useRouter()
  const [firstName,       setFirstName]       = useState('')
  const [lastName,        setLastName]         = useState('')
  const [birthDate,       setBirthDate]        = useState('')
  const [username,        setUsername]          = useState('')
  const [email,           setEmail]            = useState('')
  const [password,        setPassword]         = useState('')
  const [marketingOptOut, setMarketingOptOut]  = useState(false)
  const [error,           setError]            = useState('')
  const [loading,         setLoading]          = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, role: 'coach' } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email, username,
        role: 'coach', xp: 0, onboarding_completed: false,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        birth_date: birthDate || null,
        marketing_opt_out: marketingOptOut,
      })
    }
    router.push('/coach/onboarding')
  }

  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: '#f0f4ff' }}>ONLYPOK</span>
        </Link>
        <h1 style={{ color: '#f0f4ff', fontSize: 20, fontWeight: 700, margin: '14px 0 6px' }}>Devenir coach</h1>
        <p style={{ color: 'rgba(240,244,255,0.4)', fontSize: 13, margin: 0 }}>Partagez votre expertise, construisez votre audience</p>
      </div>

      {/* Perks */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {perks.map(({ Icon, label, sub }) => (
          <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
            <Icon size={16} color="rgba(240,244,255,0.4)" />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4ff', marginTop: 8, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'rgba(240,244,255,0.3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ background: '#0c1017', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 28px 24px' }}>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Prénom</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Jean" style={inp} />
            </div>
            <div>
              <label style={lbl}>Nom</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Dupont" style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Date de naissance</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required style={{ ...inp, colorScheme: 'dark' }} />
          </div>
          <div>
            <label style={lbl}>Pseudo coach</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="GTO_King" style={inp} />
          </div>
          <div>
            <label style={lbl}>Adresse email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com" style={inp} />
          </div>
          <div>
            <label style={lbl}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" style={inp} />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={marketingOptOut} onChange={e => setMarketingOptOut(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#7c3aed', flexShrink: 0, cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: 'rgba(240,244,255,0.3)', lineHeight: 1.55 }}>
              Je ne souhaite pas recevoir de communications commerciales ni de newsletters de la part d'OnlyPok.
            </span>
          </label>

          {error && <p style={{ color: '#e11d48', fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '0.01em' }}>
            {loading ? 'Création du compte…' : 'Créer mon espace coach'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(240,244,255,0.3)' }}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ color: 'rgba(240,244,255,0.6)', textDecoration: 'underline' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
