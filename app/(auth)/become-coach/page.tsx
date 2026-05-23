'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, BookOpen, TrendingUp, Users, BarChart2, Eye, EyeOff, ChevronLeft, CheckCircle } from 'lucide-react'
import SelectInput from '@/components/ui/SelectInput'

const CREAM  = '#f0f4ff'
const VIOLET = '#7c3aed'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.22)'

const PERKS = [
  { icon: BookOpen,   label: 'Formations & vidéos',  sub: 'Chapitres, quiz, contenu exclusif' },
  { icon: TrendingUp, label: 'Revenus',               sub: 'Abonnements, packs, sessions' },
  { icon: Users,      label: 'Élèves',                sub: 'Suivi, stats, progression' },
  { icon: BarChart2,  label: 'Tableau de bord',       sub: 'Analytics & revenus en temps réel' },
]

const CALLING_CODES = [
  { code: '+33',  flag: '🇫🇷', label: 'France' },
  { code: '+32',  flag: '🇧🇪', label: 'Belgique' },
  { code: '+41',  flag: '🇨🇭', label: 'Suisse' },
  { code: '+352', flag: '🇱🇺', label: 'Luxembourg' },
  { code: '+44',  flag: '🇬🇧', label: 'Royaume-Uni' },
  { code: '+1',   flag: '🇺🇸', label: 'États-Unis / Canada' },
  { code: '+49',  flag: '🇩🇪', label: 'Allemagne' },
  { code: '+34',  flag: '🇪🇸', label: 'Espagne' },
  { code: '+39',  flag: '🇮🇹', label: 'Italie' },
]

export default function BecomeCoachPage() {
  const router = useRouter()
  const [firstName,       setFirstName]      = useState('')
  const [lastName,        setLastName]       = useState('')
  const [birthDate,       setBirthDate]      = useState('')
  const [username,        setUsername]       = useState('')
  const [email,           setEmail]          = useState('')
  const [password,        setPassword]       = useState('')
  const [showPw,          setShowPw]         = useState(false)
  const [phoneCode,       setPhoneCode]      = useState('+33')
  const [phone,           setPhone]          = useState('')
  const [marketingOptOut, setMarketingOptOut] = useState(false)
  const [error,           setError]          = useState('')
  const [loading,         setLoading]        = useState(false)

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
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id, email, username,
          role: 'coach', xp: 0, onboarding_completed: false,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() ? `${phoneCode}${phone.trim()}` : null,
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          birth_date: birthDate || null,
          marketing_opt_out: marketingOptOut,
        })
        router.push('/coach/onboarding')
      } catch {
        setError('Une erreur est survenue lors de la création du profil.')
        setLoading(false)
      }
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
  const focusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = `${VIOLET}80`
    e.currentTarget.style.background  = 'rgba(255,255,255,0.06)'
  }
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
    e.currentTarget.style.background  = 'rgba(255,255,255,0.04)'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#04040a' }}>

      {/* ═══ LEFT PANEL ═══ */}
      <div style={{
        width: '38%', minWidth: 320, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: '48px 48px 40px',
        background: 'linear-gradient(160deg, #080412 0%, #04040a 60%, #060412 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Ambient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: 480, height: 480, background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 65%)', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '-15%', width: 360, height: 360, background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        </div>

        {/* Ghost poker suits */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025 }}>
          {['♠', '♥', '♦', '♣'].map((s, i) => (
            <span key={i} style={{ position: 'absolute', fontSize: 80, color: '#fff', userSelect: 'none', top: `${[15, 45, 62, 30][i]}%`, left: `${[10, 55, 20, 72][i]}%`, transform: `rotate(${[-12, 8, -6, 15][i]}deg)` }}>{s}</span>
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
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 16px', borderRadius: 14,
              background: `${VIOLET}08`,
              border: `1px solid ${VIOLET}18`,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${VIOLET}15`, border: `1px solid ${VIOLET}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={VIOLET} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'rgba(240,244,255,0.35)' }}>{sub}</div>
              </div>
              <CheckCircle size={14} color="#4ade80" style={{ marginLeft: 'auto', flexShrink: 0, marginTop: 2 }} />
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
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-0.6px', margin: '0 0 8px', lineHeight: 1.2, fontFamily: 'var(--font-syne,sans-serif)' }}>
              Devenir coach
            </h1>
            <p style={{ fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
              Partagez votre expertise, construisez votre audience.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Prénom + Nom */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Prénom</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  required placeholder="Jean" style={inp}
                  onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>Nom</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  required placeholder="Dupont" style={inp}
                  onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>

            {/* Date de naissance */}
            <div>
              <label style={lbl}>Date de naissance</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                required style={{ ...inp, colorScheme: 'dark' }}
                onFocus={focusIn} onBlur={focusOut} />
            </div>

            {/* Pseudo */}
            <div>
              <label style={lbl}>Pseudo coach</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                required placeholder="GTO_King" style={inp}
                onFocus={focusIn} onBlur={focusOut} />
            </div>

            {/* Email */}
            <div>
              <label style={lbl}>Adresse email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="vous@exemple.com" autoComplete="email" style={inp}
                onFocus={focusIn} onBlur={focusOut} />
            </div>

            {/* Mot de passe */}
            <div>
              <label style={lbl}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" minLength={6}
                  autoComplete="new-password"
                  style={{ ...inp, paddingRight: 48 }}
                  onFocus={focusIn} onBlur={focusOut}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Masquer' : 'Afficher'}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: DIM, padding: 4, display: 'flex', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label style={lbl}>Téléphone</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <SelectInput value={phoneCode} onChange={setPhoneCode}
                  options={CALLING_CODES.map(c => ({ value: c.code, label: `${c.flag} ${c.code} ${c.label}` }))}
                  style={{ width: 'auto', flexShrink: 0 }} />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="6 12 34 56 78" style={{ ...inp, flex: 1 }}
                  onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>

            {/* Commission notice */}
            <div style={{ background: `${VIOLET}08`, border: `1px solid ${VIOLET}25`, borderRadius: 12, padding: '13px 16px', fontSize: 13, color: SILVER, lineHeight: 1.6 }}>
              OnlyPok prélève une commission de{' '}
              <strong style={{ color: CREAM }}>10 %</strong>{' '}
              sur chaque vente. Vous conservez 90 % de vos revenus.
            </div>

            {/* Marketing opt-out */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={marketingOptOut} onChange={e => setMarketingOptOut(e.target.checked)}
                style={{ marginTop: 2, accentColor: VIOLET, flexShrink: 0, cursor: 'pointer', width: 15, height: 15 }} />
              <span style={{ fontSize: 13, color: DIM, lineHeight: 1.55 }}>
                Je ne souhaite pas recevoir de communications commerciales ni de newsletters de la part d'OnlyPok.
              </span>
            </label>

            {error && (
              <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '11px 16px', fontSize: 13, color: '#fca5a5' }}>
                {error}
              </div>
            )}

            {/* CTA */}
            <button type="submit" disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '15px', borderRadius: 13, border: 'none',
                background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
                color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: `0 0 28px ${VIOLET}60, 0 4px 12px rgba(0,0,0,0.4)`,
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) scale(1.01)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}>
              {loading
                ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Création…</>
                : <>Créer mon espace coach <ArrowRight size={15} /></>
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
              border: `1.5px solid ${VIOLET}35`,
              background: `${VIOLET}08`,
              color: '#c4b5fd', fontSize: 14, fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${VIOLET}18`; e.currentTarget.style.borderColor = `${VIOLET}60` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${VIOLET}08`; e.currentTarget.style.borderColor = `${VIOLET}35` }}
          >
            Se connecter <ArrowRight size={14} />
          </Link>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: DIM, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = SILVER)}
              onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
              <ChevronLeft size={13} /> Retour à l'accueil
            </Link>
            <Link href="/register"
              style={{ fontSize: 12, color: 'rgba(6,182,212,0.6)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#06b6d4')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(6,182,212,0.6)')}>
              Créer un compte élève →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 720px) {
          .coach-left { display: none !important; }
        }
      `}</style>
    </div>
  )
}
