'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { homeForRole, safeNext, withNext } from '@/lib/auth-redirect'
import AuthShell from '@/components/auth/AuthShell'
import { FormError, GoogleButton, PasswordField, TextField } from '@/components/auth/fields'

/* /login est prérendue : useSearchParams exige une frontière Suspense (doc Next 16,
   use-search-params). Le fallback est le même formulaire sans `next`, pour que
   le HTML initial soit le formulaire complet et non un écran vide. */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm next={null} />}>
      <LoginFormWithNext />
    </Suspense>
  )
}

/* `next` : page interne à rouvrir après connexion (posée par le proxy, la fiche
   formation ou DetailHeader). Toute autre valeur est ignorée par safeNext. */
function LoginFormWithNext() {
  const next = safeNext(useSearchParams().get('next'))
  return <LoginForm next={next} />
}

function LoginForm({ next }: { next: string | null }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${withNext('/auth/callback', next)}` },
    })
    if (error) setError('Connexion Google indisponible pour le moment.')
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    router.push(next ?? homeForRole(profile?.role))
  }

  return (
    <AuthShell title="Connexion" subtitle="Retrouve tes formations, tes sessions et ton tracker.">
      <form className="au-form" onSubmit={handleLogin}>
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="toi@exemple.com" autoComplete="email" required />
        <PasswordField
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          labelAction={<Link href="/forgot-password" className="au-quiet">Mot de passe oublié ?</Link>}
        />
        <FormError>{error}</FormError>
        <button type="submit" className="ui-btn ui-btn-primary au-submit" disabled={loading} aria-busy={loading}>
          {loading && <span className="ui-spinner" aria-hidden="true" />}
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="au-divider">ou</p>
      <GoogleButton label="Continuer avec Google" onClick={handleGoogle} />
      <p className="au-switch">
        <span>Pas encore de compte ? <Link href={withNext('/register', next)} className="au-link">Crée-le</Link></span>
        <Link href="/become-coach" className="au-quiet">Devenir coach</Link>
      </p>
    </AuthShell>
  )
}
