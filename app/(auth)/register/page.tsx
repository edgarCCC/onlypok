'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeNext, withNext } from '@/lib/auth-redirect'
import AuthShell from '@/components/auth/AuthShell'
import { FormError, GoogleButton, PasswordField, TextField } from '@/components/auth/fields'

const Q_LEVELS = ['Débutant', 'Intermédiaire', 'Avancé']
const Q_VARIANTS = ['MTT', 'Cash', 'Expresso', 'Spin & Go', 'Autre']
const Q_GOALS = [
  { key: 'stakes', label: 'Monter de stakes', sub: 'Progresser au niveau suivant' },
  { key: 'technique', label: 'Améliorer ma technique', sub: 'GTO, solver, décisions' },
  { key: 'pro', label: 'Jouer en pro', sub: 'En vivre ou générer des revenus' },
  { key: 'fun', label: 'Prendre du plaisir', sub: 'Jouer mieux et apprécier le jeu' },
]

/* /register est prérendue : useSearchParams exige une frontière Suspense (doc Next 16,
   use-search-params). Le fallback est le même formulaire sans `next`, pour que
   le HTML initial soit le formulaire complet et non un écran vide. */
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterForm next={null} />}>
      <RegisterFormWithNext />
    </Suspense>
  )
}

/* `next` : page interne à rouvrir une fois le compte créé (fiche formation,
   lien depuis /login). Toute autre valeur est ignorée par safeNext. */
function RegisterFormWithNext() {
  const next = safeNext(useSearchParams().get('next'))
  return <RegisterForm next={next} />
}

function RegisterForm({ next }: { next: string | null }) {
  const router   = useRouter()
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  /* questionnaire */
  const [step,      setStep]      = useState<'form' | 'questionnaire'>('form')
  const [userId,    setUserId]    = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [qLevel,    setQLevel]    = useState('')
  const [qVariant,  setQVariant]  = useState('')
  const [qGoal,     setQGoal]     = useState('')
  const [qSaving,   setQSaving]   = useState(false)

  const handleGoogle = async () => {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${withNext('/auth/callback', next)}` },
    })
    if (error) setError('Inscription Google indisponible pour le moment.')
  }

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
      setUserId(data.user.id)
    }
    setHasSession(!!data.session)
    setLoading(false)
    setStep('questionnaire')
  }

  const handleQuestionnaire = async () => {
    setQSaving(true)
    if (userId) {
      const supabase = createClient()
      await supabase.from('profiles').update({
        privacy_prefs: { onboarding: { level: qLevel, variant: qVariant, goal: qGoal } },
      }).eq('id', userId)
    }
    if (hasSession) {
      router.push(next ?? '/formations')
    } else {
      setEmailSent(true)
    }
    setQSaving(false)
  }

  if (emailSent) {
    return (
      <AuthShell title="Vérifie tes emails" subtitle={<>Un lien de confirmation a été envoyé à <strong>{email}</strong>. Clique dessus pour activer ton compte.</>}>
        <Link href={withNext('/login', next)} className="ui-btn ui-btn-primary au-submit">Retour à la connexion</Link>
      </AuthShell>
    )
  }

  if (step === 'questionnaire') {
    return (
      <AuthShell wide title="Parle-nous de toi" subtitle="Trois questions pour mettre en avant ce qui te sert.">
        <div className="au-form">
          <fieldset className="au-group">
            <legend className="t-caps">Ton niveau</legend>
            <div className="au-chips">
              {Q_LEVELS.map((level) => <button key={level} type="button" className="au-chip" aria-pressed={qLevel === level} onClick={() => setQLevel(level)}>{level}</button>)}
            </div>
          </fieldset>
          <fieldset className="au-group">
            <legend className="t-caps">Ta variante</legend>
            <div className="au-chips">
              {Q_VARIANTS.map((variant) => <button key={variant} type="button" className="au-chip" aria-pressed={qVariant === variant} onClick={() => setQVariant(variant)}>{variant}</button>)}
            </div>
          </fieldset>
          <fieldset className="au-group">
            <legend className="t-caps">Ton objectif</legend>
            {Q_GOALS.map((goal) => (
              <button key={goal.key} type="button" className="au-option" aria-pressed={qGoal === goal.key} onClick={() => setQGoal(goal.key)}>
                <b>{goal.label}</b>
                <span>{goal.sub}</span>
              </button>
            ))}
          </fieldset>
          <button type="button" className="ui-btn ui-btn-primary au-submit" disabled={qSaving} aria-busy={qSaving} onClick={handleQuestionnaire}>
            {qSaving && <span className="ui-spinner" aria-hidden="true" />}
            {qSaving ? 'Enregistrement…' : 'Accéder à mon espace'}
          </button>
          <button type="button" className="ui-btn ui-btn-secondary au-skip" onClick={() => { if (hasSession) router.push(next ?? '/formations'); else setEmailSent(true) }}>Passer cette étape</button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Crée ton compte" subtitle="Gratuit, sans carte bancaire.">
      <form className="au-form" onSubmit={handleRegister}>
        <TextField label="Pseudo" value={username} onChange={setUsername} autoComplete="username" required />
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="toi@exemple.com" autoComplete="email" required />
        <PasswordField label="Mot de passe" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} help="6 caractères au moins." />
        <FormError>{error}</FormError>
        <button type="submit" className="ui-btn ui-btn-primary au-submit" disabled={loading} aria-busy={loading}>
          {loading && <span className="ui-spinner" aria-hidden="true" />}
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p className="au-divider">ou</p>
      <GoogleButton label="Continuer avec Google" onClick={handleGoogle} />
      <p className="au-switch">
        <span>Déjà inscrit ? <Link href={withNext('/login', next)} className="au-link">Se connecter</Link></span>
        <Link href="/become-coach" className="au-quiet">Devenir coach</Link>
      </p>
    </AuthShell>
  )
}
