'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/auth/AuthShell'
import { FormError, PasswordField } from '@/components/auth/fields'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

const MIN_PASSWORD_LENGTH = 8
const SESSION_CHECK_TIMEOUT_MS = 2500

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status,   setStatus]   = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
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
    router.push(profile?.role === 'coach' ? '/coach/dashboard' : '/dashboard')
  }

  if (status === 'checking') {
    return (
      <AuthShell>
        <p className="au-status" role="status"><span className="ui-spinner" aria-hidden="true" /> Vérification du lien…</p>
      </AuthShell>
    )
  }
  if (status === 'invalid') {
    return (
      <AuthShell title="Lien invalide ou expiré" subtitle="Ce lien n’est plus valable. Demande-en un nouveau, il arrive en quelques secondes.">
        <Link href="/forgot-password" className="ui-btn ui-btn-primary au-submit">Demander un nouveau lien</Link>
      </AuthShell>
    )
  }
  if (status === 'done') {
    return (
      <AuthShell title="Mot de passe mis à jour" subtitle="Ton mot de passe a bien été changé. Tu es connecté.">
        <button type="button" className="ui-btn ui-btn-primary au-submit" onClick={goToSpace}>Aller à mon espace</button>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Nouveau mot de passe" subtitle={`Choisis un nouveau mot de passe, ${MIN_PASSWORD_LENGTH} caractères au moins.`}>
      <form className="au-form" onSubmit={handleSubmit}>
        <PasswordField label="Nouveau mot de passe" value={password} onChange={setPassword} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
        <PasswordField label="Confirme le mot de passe" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
        <FormError>{error}</FormError>
        <button type="submit" className="ui-btn ui-btn-primary au-submit" disabled={loading} aria-busy={loading}>
          {loading && <span className="ui-spinner" aria-hidden="true" />}
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
      <p className="au-switch"><Link href="/login" className="au-quiet">Retour à la connexion</Link></p>
    </AuthShell>
  )
}
