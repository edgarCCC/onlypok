'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, ArrowRight, ChevronLeft, ShieldCheck, AlertTriangle, Lock } from 'lucide-react'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

const MIN_PASSWORD_LENGTH = 8
const SESSION_CHECK_TIMEOUT_MS = 2500

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status,   setStatus]   = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const resolved = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    const markReady = () => {
      if (resolved.current) return
      resolved.current = true
      setStatus('ready')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') markReady()
    })

    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) markReady()
    })

    // Le lien Supabase contient ?code=… — le client l'échange automatiquement au
    // chargement, mais si rien n'arrive on tente l'échange manuel avant d'abandonner.
    const timer = setTimeout(async () => {
      if (resolved.current) return
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { markReady(); return }
      }
      resolved.current = true
      setStatus('invalid')
    }, SESSION_CHECK_TIMEOUT_MS)

    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD_LENGTH) { setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message.includes('different from the old')
        ? "Le nouveau mot de passe doit être différent de l'ancien."
        : 'Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.')
      return
    }
    setStatus('done')
  }

  const goToSpace = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    router.push(profile?.role === 'coach' ? '/coach/dashboard' : '/formations')
  }

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
  const iconBox = (bg: string, bd: string): React.CSSProperties => ({
    width: 52, height: 52, borderRadius: 14, marginBottom: 24,
    background: bg, border: `1px solid ${bd}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })
  const h1: React.CSSProperties = {
    fontSize: 26, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.6px',
    margin: '0 0 10px', lineHeight: 1.25, fontFamily: 'var(--font-syne,sans-serif)',
  }
  const sub: React.CSSProperties = { fontSize: 14, color: 'rgba(240,244,255,0.4)', margin: '0 0 32px', lineHeight: 1.7 }
  const cta: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '15px', borderRadius: 13, border: 'none', width: '100%',
    background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
    cursor: 'pointer',
    boxShadow: '0 0 28px rgba(6,182,212,0.33), 0 4px 12px rgba(0,0,0,0.4)',
    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04040a', padding: '48px 24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', color: '#f0f4ff' }}>ONLYPOK</span>
        </Link>

        {status === 'checking' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(240,244,255,0.4)', fontSize: 14 }}>
            <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Vérification du lien…
          </div>
        )}

        {status === 'invalid' && (
          <div>
            <div style={iconBox('rgba(239,68,68,0.08)', 'rgba(239,68,68,0.3)')}>
              <AlertTriangle size={22} color="#f87171" />
            </div>
            <h1 style={h1}>Lien invalide ou expiré</h1>
            <p style={sub}>
              Ce lien de réinitialisation n'est plus valide. Les liens expirent après une heure — demande-en un nouveau.
            </p>
            <Link href="/forgot-password" style={{ ...cta, textDecoration: 'none', display: 'inline-flex', width: 'auto', padding: '14px 24px' }}>
              Demander un nouveau lien <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <div>
            <div style={iconBox('rgba(6,182,212,0.1)', 'rgba(6,182,212,0.3)')}>
              <Lock size={22} color="#06b6d4" />
            </div>
            <h1 style={h1}>Nouveau mot de passe</h1>
            <p style={sub}>Choisis un nouveau mot de passe pour ton compte ({MIN_PASSWORD_LENGTH} caractères minimum).</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={lbl}>Nouveau mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••" minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    style={{ ...inp, paddingRight: 48 }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Masquer' : 'Afficher'}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,244,255,0.22)', padding: 4, display: 'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={lbl}>Confirme le mot de passe</label>
                <input
                  type={showPw ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required placeholder="••••••••" minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  style={inp}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                />
              </div>

              {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '11px 16px', fontSize: 13, color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ ...cta, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading
                  ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Mise à jour…</>
                  : <>Enregistrer le mot de passe <ArrowRight size={15} /></>
                }
              </button>
            </form>
          </div>
        )}

        {status === 'done' && (
          <div>
            <div style={iconBox('rgba(74,222,128,0.1)', 'rgba(74,222,128,0.3)')}>
              <ShieldCheck size={22} color="#4ade80" />
            </div>
            <h1 style={h1}>Mot de passe mis à jour</h1>
            <p style={sub}>Ton mot de passe a bien été changé. Tu es connecté — bonne session&nbsp;!</p>
            <button onClick={goToSpace} style={{ ...cta, width: 'auto', padding: '14px 24px' }}>
              Accéder à mon espace <ArrowRight size={15} />
            </button>
          </div>
        )}

        {status !== 'checking' && status !== 'done' && (
          <div>
            <Link href="/login"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 32, fontSize: 12, color: 'rgba(240,244,255,0.22)', textDecoration: 'none' }}>
              <ChevronLeft size={13} /> Retour à la connexion
            </Link>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
