'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, ArrowRight, BookOpen, Users, ChevronLeft } from 'lucide-react'

type Mode = 'student' | 'coach'

export default function LoginPage() {
  const router     = useRouter()
  const [mode,     setMode]     = useState<Mode>('student')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    router.push(profile?.role === 'coach' ? '/coach/dashboard' : '/formations')
  }

  const isCoach  = mode === 'coach'
  const accent   = isCoach ? '#7c3aed' : '#06b6d4'
  const accentLo = isCoach ? 'rgba(124,58,237,0.18)' : 'rgba(6,182,212,0.15)'
  const accentBd = isCoach ? 'rgba(124,58,237,0.45)' : 'rgba(6,182,212,0.4)'

  const ROLES: { v: Mode; label: string; Icon: React.ElementType; sub: string; color: string; colorLo: string; colorBd: string }[] = [
    { v: 'student', label: 'Élève',  Icon: BookOpen, sub: 'Formations & coaching', color: '#06b6d4', colorLo: 'rgba(6,182,212,0.12)',   colorBd: 'rgba(6,182,212,0.35)' },
    { v: 'coach',   label: 'Coach',  Icon: Users,    sub: 'Dashboard & élèves',    color: '#7c3aed', colorLo: 'rgba(124,58,237,0.12)', colorBd: 'rgba(124,58,237,0.35)' },
  ]

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12, fontSize: 15, color: '#f0f4ff',
    fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'rgba(240,244,255,0.35)',
    display: 'block', marginBottom: 8,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#04040a' }}>

      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-split-left" style={{
        width: '42%', minWidth: 320, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: '48px 48px 40px',
        background: 'linear-gradient(160deg, #0a0612 0%, #04040a 60%, #040a12 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Ambient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '-10%', left: '-20%',
            width: 480, height: 480,
            background: `radial-gradient(ellipse, ${isCoach ? 'rgba(124,58,237,0.22)' : 'rgba(6,182,212,0.18)'} 0%, transparent 65%)`,
            filter: 'blur(50px)', transition: 'background 0.6s ease',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', right: '-15%',
            width: 360, height: 360,
            background: `radial-gradient(ellipse, ${isCoach ? 'rgba(168,85,247,0.14)' : 'rgba(6,182,212,0.10)'} 0%, transparent 65%)`,
            filter: 'blur(60px)', transition: 'background 0.6s ease',
          }} />
        </div>

        {/* Subtle poker grid pattern */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025 }}>
          {['♠','♥','♦','♣'].map((s, i) => (
            <span key={i} style={{
              position: 'absolute', fontSize: 80, color: '#fff', userSelect: 'none',
              top: `${[15, 45, 62, 30][i]}%`,
              left: `${[10, 55, 20, 72][i]}%`,
              transform: `rotate(${[-12, 8, -6, 15][i]}deg)`,
            }}>{s}</span>
          ))}
        </div>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, marginBottom: 'auto' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', color: '#f0f4ff' }}>ONLYPOK</span>
        </Link>

        {/* Role selector — center of panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,244,255,0.28)', marginBottom: 14, margin: '0 0 14px' }}>
              Tu es…
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROLES.map(({ v, label, Icon, sub, color, colorLo, colorBd }) => {
                const active = mode === v
                return (
                  <button key={v} onClick={() => { setMode(v); setError('') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '18px 20px', borderRadius: 16,
                      border: `1.5px solid ${active ? colorBd : 'rgba(255,255,255,0.07)'}`,
                      background: active ? colorLo : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                      transform: active ? 'scale(1.02)' : 'scale(1)',
                    }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? colorBd : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.22s',
                    }}>
                      <Icon size={18} color={active ? color : 'rgba(240,244,255,0.28)'} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: active ? '#f0f4ff' : 'rgba(240,244,255,0.45)', marginBottom: 2, transition: 'color 0.2s' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 12, color: active ? 'rgba(240,244,255,0.45)' : 'rgba(240,244,255,0.22)', transition: 'color 0.2s' }}>
                        {sub}
                      </div>
                    </div>
                    {active && (
                      <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p style={{ fontSize: 12, color: 'rgba(240,244,255,0.18)', position: 'relative', zIndex: 1, margin: 0, lineHeight: 1.6 }}>
          La plateforme poker <br />qui te fait progresser.
        </p>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="auth-split-right" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Heading */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.6px', margin: '0 0 8px', lineHeight: 1.2, fontFamily: 'var(--font-syne,sans-serif)' }}>
              {isCoach ? 'Espace coach' : 'Espace élève'}
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(240,244,255,0.35)', margin: 0, lineHeight: 1.6 }}>
              {isCoach
                ? 'Retrouve ton dashboard, tes élèves et tes revenus.'
                : 'Continue ta progression et accède à tes formations.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <label style={lbl}>Adresse email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="toi@exemple.com"
                autoComplete="email"
                style={inp}
                onFocus={e => { e.currentTarget.style.borderColor = accentBd; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <label style={lbl}>Mot de passe</label>
                <Link href="/forgot-password"
                  style={{ fontSize: 12, color: 'rgba(240,244,255,0.3)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = accent)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.3)')}>
                  Mot de passe oublié&nbsp;?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...inp, paddingRight: 48 }}
                  onFocus={e => { e.currentTarget.style.borderColor = accentBd; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Masquer' : 'Afficher'}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,244,255,0.22)', padding: 4, display: 'flex', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.22)')}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '11px 16px', fontSize: 13, color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '15px', borderRadius: 13, border: 'none',
                background: isCoach
                  ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                  : 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: `0 0 28px ${accent}55, 0 4px 12px rgba(0,0,0,0.4)`,
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) scale(1.01)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}>
              {loading
                ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Connexion…</>
                : <>{isCoach ? 'Accéder à mon espace coach' : 'Accéder à mon espace élève'} <ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 12, color: 'rgba(240,244,255,0.22)', whiteSpace: 'nowrap' }}>Pas encore de compte&nbsp;?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Register CTA */}
          {isCoach ? (
            <Link href="/become-coach"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px', borderRadius: 13, textDecoration: 'none',
                border: '1.5px solid rgba(124,58,237,0.3)',
                background: 'rgba(124,58,237,0.07)',
                color: '#c4b5fd', fontSize: 14, fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.14)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.07)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
            >
              Créer mon espace coach <ArrowRight size={14} />
            </Link>
          ) : (
            <Link href="/register"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px', borderRadius: 13, textDecoration: 'none',
                border: '1.5px solid rgba(6,182,212,0.28)',
                background: 'rgba(6,182,212,0.06)',
                color: '#67e8f9', fontSize: 14, fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.13)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.06)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.28)' }}
            >
              Créer un compte élève <ArrowRight size={14} />
            </Link>
          )}

          {/* Back */}
          <Link href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 32, fontSize: 12, color: 'rgba(240,244,255,0.22)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.22)')}>
            <ChevronLeft size={13} /> Retour à l'accueil
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 720px) {
          .auth-split-left { display: none !important; }
          .auth-split-right { padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  )
}
