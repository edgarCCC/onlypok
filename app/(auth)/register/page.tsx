'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, ArrowRight, CheckCircle, BookOpen, Users, Brain, BarChart2, ChevronLeft, Mail } from 'lucide-react'

const CREAM   = '#f0f4ff'
const CYAN    = '#06b6d4'
const VIOLET  = '#7c3aed'
const SILVER  = 'rgba(240,244,255,0.45)'
const DIM     = 'rgba(240,244,255,0.22)'

const PERKS = [
  { icon: BookOpen, label: 'Formations & vidéos',  sub: 'Contenu exclusif par des pros' },
  { icon: Users,    label: 'Coaching 1-to-1',       sub: 'Sessions avec les meilleurs coachs' },
  { icon: Brain,    label: 'Trainer interactif',    sub: 'Drills de ranges & quiz mains' },
  { icon: BarChart2,label: 'Tracker de sessions',   sub: 'Analyse tes stats et ta progression' },
]

export default function RegisterPage() {
  const router   = useRouter()
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [emailSent, setEmailSent] = useState(false)

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
    if (data.session) {
      router.push('/formations')
    } else {
      setEmailSent(true)
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12, fontSize: 15, color: CREAM,
    fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'rgba(240,244,255,0.35)',
    display: 'block', marginBottom: 8,
  }

  /* ── Email sent state ── */
  if (emailSent) return (
    <div style={{ minHeight: '100vh', background: '#04040a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 500, background: `radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, transparent 65%)`, filter: 'blur(60px)' }} />
        {['♠','♣','♦','♥'].map((s, i) => (
          <span key={i} style={{ position: 'absolute', fontSize: 80, color: '#fff', userSelect: 'none', opacity: 0.025, top: `${[15,55,35,70][i]}%`, left: `${[8,75,45,20][i]}%`, transform: `rotate(${[-12,8,-6,15][i]}deg)` }}>{s}</span>
        ))}
      </div>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(6,182,212,0.12)', border: '2px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <Mail size={32} color={CYAN} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: CREAM, margin: '0 0 12px', fontFamily: 'var(--font-syne,sans-serif)', letterSpacing: '-0.5px' }}>
          Vérifie tes emails
        </h1>
        <p style={{ color: SILVER, fontSize: 14, lineHeight: 1.7, margin: '0 0 10px' }}>
          Un lien de confirmation a été envoyé à
        </p>
        <p style={{ color: CYAN, fontWeight: 700, fontSize: 15, margin: '0 0 28px', wordBreak: 'break-all' }}>{email}</p>
        <p style={{ color: DIM, fontSize: 13, lineHeight: 1.6, margin: '0 0 28px' }}>
          Clique dessus pour activer ton compte et accéder à l'espace élève.
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 28px', borderRadius: 12, textDecoration: 'none',
          background: `linear-gradient(135deg, #0891b2, ${CYAN})`,
          color: '#fff', fontSize: 14, fontWeight: 700,
          boxShadow: `0 4px 24px rgba(6,182,212,0.35)`,
        }}>
          Retour à la connexion <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )

  /* ── Main split layout ── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#04040a' }}>

      {/* ═══ LEFT PANEL ═══ */}
      <div style={{
        width: '42%', minWidth: 320, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: '48px 48px 40px',
        background: 'linear-gradient(160deg, #040a12 0%, #04040a 60%, #0a0612 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Ambient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: 480, height: 480, background: 'radial-gradient(ellipse, rgba(6,182,212,0.18) 0%, transparent 65%)', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '-15%', width: 360, height: 360, background: 'radial-gradient(ellipse, rgba(124,58,237,0.10) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        </div>

        {/* Ghost poker suits */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025 }}>
          {['♠','♥','♦','♣'].map((s, i) => (
            <span key={i} style={{ position: 'absolute', fontSize: 80, color: '#fff', userSelect: 'none', top: `${[15,45,62,30][i]}%`, left: `${[10,55,20,72][i]}%`, transform: `rotate(${[-12,8,-6,15][i]}deg)` }}>{s}</span>
          ))}
        </div>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, marginBottom: 'auto' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
        </Link>

        {/* Perks list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,244,255,0.28)', margin: '0 0 16px' }}>
            Ce que tu obtiens
          </p>
          {PERKS.map(({ icon: Icon, label, sub }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(6,182,212,0.05)',
              border: '1px solid rgba(6,182,212,0.1)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={CYAN} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'rgba(240,244,255,0.35)' }}>{sub}</div>
              </div>
              <CheckCircle size={14} color={`${CYAN}`} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.5 }} />
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <p style={{ fontSize: 12, color: 'rgba(240,244,255,0.18)', position: 'relative', zIndex: 1, margin: 0, lineHeight: 1.6 }}>
          La plateforme poker <br />qui te fait progresser.
        </p>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-0.6px', margin: '0 0 8px', lineHeight: 1.2, fontFamily: 'var(--font-syne,sans-serif)' }}>
              Crée ton compte élève
            </h1>
            <p style={{ fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
              Gratuit et sans carte bancaire — commence maintenant.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <label style={lbl}>Pseudo</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                required placeholder="PokerPro69" autoComplete="username"
                style={inp}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              />
            </div>

            <div>
              <label style={lbl}>Adresse email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="toi@exemple.com" autoComplete="email"
                style={inp}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              />
            </div>

            <div>
              <label style={lbl}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" minLength={6}
                  autoComplete="new-password"
                  style={{ ...inp, paddingRight: 48 }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Masquer' : 'Afficher'}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: DIM, padding: 4, display: 'flex', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
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
                background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: `0 0 28px rgba(6,182,212,0.45), 0 4px 12px rgba(0,0,0,0.4)`,
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) scale(1.01)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}>
              {loading
                ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Création…</>
                : <>Créer mon compte élève <ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 12, color: DIM, whiteSpace: 'nowrap' }}>Déjà inscrit ?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <Link href="/login"
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
            Se connecter <ArrowRight size={14} />
          </Link>

          {/* Coach link + back */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: DIM, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = SILVER)}
              onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
              <ChevronLeft size={13} /> Retour à l'accueil
            </Link>
            <Link href="/become-coach"
              style={{ fontSize: 12, color: 'rgba(167,139,250,0.6)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(167,139,250,0.6)')}>
              Devenir coach →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 720px) {
          .register-left { display: none !important; }
        }
      `}</style>
    </div>
  )
}
