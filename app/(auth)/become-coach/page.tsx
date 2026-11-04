'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import AuthShell from '@/components/auth/AuthShell'
import { FormError, PasswordField, TextField } from '@/components/auth/fields'
import SelectInput from '@/components/ui/SelectInput'

const CALLING_CODES = [
  { code: '+33',  label: 'France' },
  { code: '+32',  label: 'Belgique' },
  { code: '+41',  label: 'Suisse' },
  { code: '+352', label: 'Luxembourg' },
  { code: '+44',  label: 'Royaume-Uni' },
  { code: '+1',   label: 'États-Unis / Canada' },
  { code: '+49',  label: 'Allemagne' },
  { code: '+34',  label: 'Espagne' },
  { code: '+39',  label: 'Italie' },
]

/* Conditions coach : le texte dédié n'existe pas encore (tâche L5, relecture
   juridique prévue). En attendant, on pointe vers la page légale la plus
   proche : CGU, section 4 « Conditions applicables aux Coachs ». */
const COACH_TERMS_HREF = '/legal/cgu'

/* Ce qui attend l'élève après la validation (l'annuaire ne montre que les
   coachs dont l'onboarding est terminé). */
const NEXT_STEPS = [
  'Tu acceptes les conditions coach et tu actives ton espace.',
  'Tu complètes ton profil coach : expérience, tarifs, preuves de résultats.',
  'Ton profil apparaît dans l\'annuaire une fois ce profil finalisé.',
]

const TERMS_REQUIRED_MESSAGE = 'Coche la case des conditions coach pour continuer.'

/* Seule voie de passage en coach : la route serveur vérifie l'acceptation,
   écrit le rôle, l'horodatage et remet onboarding_completed à false. Renvoie
   un message d'erreur lisible, ou null si tout s'est bien passé. */
async function applyAsCoach(accepted: boolean): Promise<string | null> {
  try {
    const res = await fetch('/api/coach/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptTerms: accepted }),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) return json.error ?? 'Activation impossible, réessaie dans un instant.'
    return null
  } catch {
    return 'Connexion impossible, vérifie ton réseau et réessaie.'
  }
}

export default function BecomeCoachPage() {
  const { user, profile, loading: authLoading } = useUser()
  const [firstName,       setFirstName]      = useState('')
  const [lastName,        setLastName]       = useState('')
  const [birthDate,       setBirthDate]      = useState('')
  const [username,        setUsername]       = useState('')
  const [email,           setEmail]          = useState('')
  const [password,        setPassword]       = useState('')
  const [phoneCode,       setPhoneCode]      = useState('+33')
  const [phone,           setPhone]          = useState('')
  const [marketingOptOut, setMarketingOptOut] = useState(false)
  const [acceptTerms,     setAcceptTerms]    = useState(false)
  const [error,           setError]          = useState('')
  const [loading,         setLoading]        = useState(false)
  /* Vrai pendant tout le parcours visiteur : signUp ouvre une session, et sans
     ce verrou la page basculerait sur le panneau « connecté » en plein envoi. */
  const [visitorSubmitting, setVisitorSubmitting] = useState(false)

  /* Navigation complète : le ProfileContext repart avec le nouveau rôle. */
  const goToOnboarding = () => { window.location.assign('/coach/onboarding') }

  /* Visiteur : conditions vérifiées avant toute création, pseudo pré-vérifié
     (profiles.username est unique), compte créé en élève, puis passage en
     coach côté serveur. Après signUp, le compte existe quoi qu'il arrive :
     chaque échec renvoie vers le panneau connecté, dont le bouton rappelle la
     route (qui recrée un profil élève minimal si l'upsert a échoué). */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) { setError(TERMS_REQUIRED_MESSAGE); return }
    setLoading(true)
    setVisitorSubmitting(true)
    setError('')
    const fail = (message: string) => { setError(message); setLoading(false); setVisitorSubmitting(false) }
    const supabase = createClient()
    const uname = username.trim()

    const { data: taken, error: checkError } = await supabase
      .from('profiles').select('id').eq('username', uname).limit(1).maybeSingle()
    if (checkError) { fail('Vérification du pseudo impossible, réessaie dans un instant.'); return }
    if (taken) { fail('Ce pseudo est déjà pris, choisis-en un autre.'); return }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: uname, role: 'student' } },
    })
    if (signUpError) { fail(signUpError.message); return }
    if (!data.user || !data.session) {
      // Confirmation d'email active : pas de session, donc ni profil ni appel
      // à la route. Une fois connecté, cette page proposera l'activation.
      fail('Compte créé : confirme ton adresse email avec le lien reçu, puis connecte-toi. Cette page te proposera alors d\'activer ton espace coach.')
      return
    }
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id, email, username: uname, role: 'student', xp: 0,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim() ? `${phoneCode}${phone.trim()}` : null,
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      birth_date: birthDate || null,
      marketing_opt_out: marketingOptOut,
    })
    if (profileError) {
      fail(profileError.code === '23505'
        ? 'Compte créé, mais ce pseudo vient d\'être pris. Active ton espace coach ci-dessous.'
        : 'Compte créé, mais le profil n\'a pas pu être enregistré. Active ton espace coach ci-dessous.')
      return
    }
    const applyError = await applyAsCoach(acceptTerms)
    if (applyError) { fail(applyError); return }
    goToOnboarding()
  }

  /* Élève connecté : acceptation des conditions puis passage en coach. */
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) { setError(TERMS_REQUIRED_MESSAGE); return }
    setLoading(true)
    setError('')
    const applyError = await applyAsCoach(acceptTerms)
    if (applyError) { setError(applyError); setLoading(false); return }
    goToOnboarding()
  }

  const commissionNotice = (
    <p className="au-note">OnlyPok prélève une commission de <strong>8 %</strong> sur chaque vente de coaching. Tu conserves 92 % de tes revenus.</p>
  )

  /* Case obligatoire (validation native au submit) + lien vers les conditions,
     ouvert dans un nouvel onglet pour ne pas perdre le formulaire. */
  const termsCheckbox = (
    <label className="au-check">
      <input type="checkbox" required checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} />
      <span>J’accepte les <Link href={COACH_TERMS_HREF} target="_blank" rel="noopener noreferrer" className="au-link">conditions coach</Link> (commission, reversements, statut d’indépendant).</span>
    </label>
  )

  const role = profile?.role ?? null

  /* Session en cours de lecture : pas de formulaire d'inscription qui clignote pour un élève connecté */
  if (authLoading) {
    return (
      <AuthShell wide title="Devenir coach" subtitle="Partage ton expertise, construis ton audience.">
        <p className="au-status" role="status"><span className="ui-spinner" aria-hidden="true" /> Un instant…</p>
      </AuthShell>
    )
  }

  /* Déjà coach : rien à faire ici */
  if (user && !visitorSubmitting && role === 'coach') {
    const onboardingDone = profile?.onboarding_completed === true
    return (
      <AuthShell title="Tu es déjà coach" subtitle={onboardingDone ? 'Ton espace coach est actif.' : 'Il te reste à finaliser ton profil pour apparaître dans l’annuaire.'}>
        <Link href={onboardingDone ? '/coach/dashboard' : '/coach/onboarding'} className="ui-btn ui-btn-primary au-submit">
          {onboardingDone ? 'Ouvrir mon espace coach' : 'Finaliser mon profil coach'}
        </Link>
      </AuthShell>
    )
  }

  /* Admin : la route refuse (403), on le dit avant le clic */
  if (user && !visitorSubmitting && role === 'admin') {
    return (
      <AuthShell title="Compte administrateur" subtitle="Un compte administrateur ne devient pas coach depuis cette page.">
        <Link href="/admin" className="ui-btn ui-btn-primary au-submit">Ouvrir l’administration</Link>
      </AuthShell>
    )
  }

  /* Élève connecté : conditions, POST /api/coach/apply, onboarding */
  if (user && !visitorSubmitting) {
    return (
      <AuthShell wide title="Devenir coach" subtitle="Ton compte élève devient un compte coach. Tes achats et tes séances restent accessibles.">
        <form className="au-form" onSubmit={handleApply}>
          <div className="au-account">
            <span className="ui-avatar" aria-hidden="true">{(profile?.username || user.email || 'E').charAt(0).toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <p className="au-account-name">{profile?.username || 'Ton compte'}</p>
              <p className="au-account-mail">{profile?.email || user.email}</p>
            </div>
            <span className="ui-nav-role">Élève</span>
          </div>
          <ol className="au-steps">{NEXT_STEPS.map((text) => <li key={text}>{text}</li>)}</ol>
          {commissionNotice}
          {termsCheckbox}
          <FormError>{error}</FormError>
          <button type="submit" className="ui-btn ui-btn-primary au-submit" disabled={loading} aria-busy={loading}>
            {loading && <span className="ui-spinner" aria-hidden="true" />}
            {loading ? 'Activation…' : 'Activer mon espace coach'}
          </button>
        </form>
        <p className="au-switch"><Link href="/formations" className="au-quiet">Retour à la marketplace</Link></p>
      </AuthShell>
    )
  }

  /* Visiteur : inscription et acceptation des conditions */
  return (
    <AuthShell wide title="Devenir coach" subtitle="Partage ton expertise, construis ton audience.">
      <form className="au-form" onSubmit={handleRegister}>
        <div className="au-row2">
          <TextField label="Prénom" value={firstName} onChange={setFirstName} autoComplete="given-name" required />
          <TextField label="Nom" value={lastName} onChange={setLastName} autoComplete="family-name" required />
        </div>
        <TextField label="Date de naissance" type="date" value={birthDate} onChange={setBirthDate} autoComplete="bday" required />
        <TextField label="Pseudo coach" value={username} onChange={setUsername} autoComplete="username" required />
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="toi@exemple.com" autoComplete="email" required />
        <PasswordField label="Mot de passe" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} help="6 caractères au moins." />
        <div className="ui-field">
          <label className="ui-field-label" htmlFor="bc-phone">Téléphone</label>
          <div className="au-inline">
            <SelectInput value={phoneCode} onChange={setPhoneCode} options={CALLING_CODES.map((c) => ({ value: c.code, label: `${c.code} ${c.label}` }))} style={{ width: 'auto', flexShrink: 0 }} />
            <input id="bc-phone" className="ui-input" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel-national" placeholder="6 12 34 56 78" />
          </div>
        </div>
        {commissionNotice}
        {termsCheckbox}
        <label className="au-check">
          <input type="checkbox" checked={marketingOptOut} onChange={(event) => setMarketingOptOut(event.target.checked)} />
          <span>Je ne souhaite pas recevoir de communications commerciales ni de newsletters d’OnlyPok.</span>
        </label>
        <FormError>{error}</FormError>
        <button type="submit" className="ui-btn ui-btn-primary au-submit" disabled={loading} aria-busy={loading}>
          {loading && <span className="ui-spinner" aria-hidden="true" />}
          {loading ? 'Création…' : 'Créer mon espace coach'}
        </button>
      </form>
      <p className="au-switch">
        <span>Déjà inscrit ? <Link href="/login" className="au-link">Se connecter</Link></span>
        <Link href="/register" className="au-quiet">Créer un compte élève</Link>
      </p>
    </AuthShell>
  )
}
