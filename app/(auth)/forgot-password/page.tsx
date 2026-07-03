'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, ChevronLeft, MailCheck, KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setError("Impossible d'envoyer l'email. Réessaie dans quelques minutes."); return }
    setSent(true)
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04040a', padding: '48px 24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', color: '#f0f4ff' }}>ONLYPOK</span>
        </Link>

        {sent ? (
          <div>
            <div style={{
              width: 52, height: 52, borderRadius: 14, marginBottom: 24,
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MailCheck size={22} color="#4ade80" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.6px', margin: '0 0 10px', lineHeight: 1.25, fontFamily: 'var(--font-syne,sans-serif)' }}>
              Vérifie ta boîte mail
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(240,244,255,0.4)', margin: '0 0 32px', lineHeight: 1.7 }}>
              Si un compte existe pour <strong style={{ color: '#f0f4ff' }}>{email}</strong>, tu recevras un lien pour réinitialiser ton mot de passe. Pense à vérifier tes spams.
            </p>
            <Link href="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 14, fontWeight: 600, color: '#67e8f9', textDecoration: 'none',
              }}>
              <ChevronLeft size={15} /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <div>
            <div style={{
              width: 52, height: 52, borderRadius: 14, marginBottom: 24,
              background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <KeyRound size={22} color="#06b6d4" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.6px', margin: '0 0 10px', lineHeight: 1.25, fontFamily: 'var(--font-syne,sans-serif)' }}>
              Mot de passe oublié&nbsp;?
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(240,244,255,0.4)', margin: '0 0 36px', lineHeight: 1.7 }}>
              Entre ton adresse email et on t'envoie un lien pour choisir un nouveau mot de passe.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={lbl}>Adresse email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="toi@exemple.com"
                  autoComplete="email"
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

              <button type="submit" disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '15px', borderRadius: 13, border: 'none',
                  background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 28px rgba(6,182,212,0.33), 0 4px 12px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) scale(1.01)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}>
                {loading
                  ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Envoi…</>
                  : <>Envoyer le lien <ArrowRight size={15} /></>
                }
              </button>
            </form>

            <Link href="/login"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 32, fontSize: 12, color: 'rgba(240,244,255,0.22)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.22)')}>
              <ChevronLeft size={13} /> Retour à la connexion
            </Link>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
