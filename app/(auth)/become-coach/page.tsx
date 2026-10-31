'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
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
  const [showPw,          setShowPw]         = useState(false)
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
  const heading: React.CSSProperties = {
    fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-0.6px',
    margin: '0 0 8px', lineHeight: 1.2, fontFamily: 'var(--font-syne,sans-serif)',
  }
  const subheading: React.CSSProperties = { fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }
  const cta = (busy: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '15px', borderRadius: 13, border: 'none',
    background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
    color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
    fontFamily: 'inherit', textDecoration: 'none',
    cursor: busy ? 'not-allowed' : 'pointer',
    boxShadow: `0 0 28px ${VIOLET}60, 0 4px 12px rgba(0,0,0,0.4)`,
    opacity: busy ? 0.7 : 1,
  })
  const backLink: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
    color: DIM, textDecoration: 'none', transition: 'color 0.15s',
  }
  const focusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = `${VIOLET}80`
    e.currentTarget.style.background  = 'rgba(255,255,255,0.06)'
  }
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
    e.currentTarget.style.background  = 'rgba(255,255,255,0.04)'
  }

  const spinner = (
    <div aria-hidden="true" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  )

  const commissionNotice = (
    <div style={{ background: `${VIOLET}08`, border: `1px solid ${VIOLET}25`, borderRadius: 12, padding: '13px 16px', fontSize: 13, color: SILVER, lineHeight: 1.6 }}>
      OnlyPok prélève une commission de{' '}
      <strong style={{ color: CREAM }}>8 %</strong>{' '}
      sur chaque vente de coaching. Vous conservez 92 % de vos revenus.
    </div>
  )

  /* Case obligatoire (validation native au submit) + lien vers les conditions,
     ouvert dans un nouvel onglet pour ne pas perdre le formulaire. */
  const termsCheckbox = (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
      <input type="checkbox" className="bc-check" required checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
        style={{ marginTop: 2, accentColor: VIOLET, flexShrink: 0, cursor: 'pointer', width: 15, height: 15 }} />
      <span style={{ fontSize: 13, color: SILVER, lineHeight: 1.55 }}>
        J&apos;accepte les{' '}
        <Link href={COACH_TERMS_HREF} target="_blank" rel="noopener noreferrer" className="bc-link"
          style={{ color: '#c4b5fd', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          conditions coach
        </Link>
        {' '}(commission, reversements, statut d&apos;indépendant).
      </span>
    </label>
  )

  const errorAlert = error ? (
    <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '11px 16px', fontSize: 13, color: '#fca5a5' }}>
      {error}
    </div>
  ) : null

  /* ── Session en cours de lecture : pas de formulaire d'inscription qui
        clignote pour un élève connecté ── */
  const pendingPanel = (
    <>
      <div style={{ marginBottom: 36 }}>
        <h1 style={heading}>Devenir coach</h1>
        <p style={subheading}>Partagez votre expertise, construisez votre audience.</p>
      </div>
      <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DIM }}>
        <div aria-hidden="true" style={{ width: 15, height: 15, border: '2px solid rgba(240,244,255,0.15)', borderTopColor: CREAM, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Un instant…
      </div>
    </>
  )

  /* ── Élève connecté : conditions → POST /api/coach/apply → onboarding ── */
  const connectedPanel = (
    <>
      <div style={{ marginBottom: 36 }}>
        <h1 style={heading}>Devenir coach</h1>
        <p style={subheading}>Ton compte élève devient un compte coach. Tes achats et tes séances restent accessibles.</p>
      </div>

      <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Compte concerné */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, #06b6d4, ${VIOLET})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
            {(profile?.username || user?.email || 'E').charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: CREAM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.username || 'Ton compte'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(240,244,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.email || user?.email}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: VIOLET, padding: '2px 7px', border: `1px solid ${VIOLET}35`, borderRadius: 4 }}>
            ÉLÈVE
          </span>
        </div>

        {/* Ce qui se passe ensuite */}
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NEXT_STEPS.map((text, i) => (
            <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13, color: SILVER, lineHeight: 1.55 }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: `${VIOLET}15`, border: `1px solid ${VIOLET}30`, color: '#c4b5fd', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        {commissionNotice}
        {termsCheckbox}
        {errorAlert}

        <button type="submit" className="bc-cta" disabled={loading} style={cta(loading)}>
          {loading
            ? <>{spinner} Activation…</>
            : <>Activer mon espace coach <ArrowRight size={15} /></>
          }
        </button>
      </form>

      <div style={{ marginTop: 20 }}>
        <Link href="/formations" className="bc-link" style={backLink}
          onMouseEnter={e => (e.currentTarget.style.color = SILVER)}
          onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
          <ChevronLeft size={13} /> Retour à la marketplace
        </Link>
      </div>
    </>
  )

  /* ── Déjà coach : rien à faire ici ── */
  const onboardingDone = profile?.onboarding_completed === true
  const coachPanel = (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={heading}>Tu es déjà coach</h1>
        <p style={subheading}>
          {onboardingDone
            ? 'Ton espace coach est actif.'
            : 'Il te reste à finaliser ton profil pour apparaître dans l\'annuaire.'}
        </p>
      </div>
      <Link href={onboardingDone ? '/coach/dashboard' : '/coach/onboarding'} className="bc-cta" style={cta(false)}>
        {onboardingDone ? 'Ouvrir mon espace coach' : 'Finaliser mon profil coach'} <ArrowRight size={15} />
      </Link>
    </>
  )

  /* ── Admin : la route refuse (403), on le dit avant le clic ── */
  const adminPanel = (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={heading}>Compte administrateur</h1>
        <p style={subheading}>Un compte administrateur ne devient pas coach depuis cette page.</p>
      </div>
      <Link href="/admin" className="bc-cta" style={cta(false)}>
        Ouvrir l&apos;administration <ArrowRight size={15} />
      </Link>
    </>
  )

  /* ── Visiteur : inscription (parcours existant) + acceptation des conditions ── */
  const visitorPanel = (
    <>
      {/* Heading */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={heading}>Devenir coach</h1>
        <p style={subheading}>Partagez votre expertise, construisez votre audience.</p>
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

        {commissionNotice}

        {/* Conditions coach (obligatoire) */}
        {termsCheckbox}

        {/* Marketing opt-out */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <input type="checkbox" className="bc-check" checked={marketingOptOut} onChange={e => setMarketingOptOut(e.target.checked)}
            style={{ marginTop: 2, accentColor: VIOLET, flexShrink: 0, cursor: 'pointer', width: 15, height: 15 }} />
          <span style={{ fontSize: 13, color: DIM, lineHeight: 1.55 }}>
            Je ne souhaite pas recevoir de communications commerciales ni de newsletters de la part d&apos;OnlyPok.
          </span>
        </label>

        {errorAlert}

        {/* CTA */}
        <button type="submit" className="bc-cta" disabled={loading} style={cta(loading)}>
          {loading
            ? <>{spinner} Création…</>
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

      <Link href="/login" className="bc-link"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px', borderRadius: 13, textDecoration: 'none',
          border: `1.5px solid ${VIOLET}35`,
          background: `${VIOLET}08`,
          color: '#c4b5fd', fontSize: 14, fontWeight: 600,
          transition: 'background 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${VIOLET}18`; e.currentTarget.style.borderColor = `${VIOLET}60` }}
        onMouseLeave={e => { e.currentTarget.style.background = `${VIOLET}08`; e.currentTarget.style.borderColor = `${VIOLET}35` }}
      >
        Se connecter <ArrowRight size={14} />
      </Link>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="bc-link" style={backLink}
          onMouseEnter={e => (e.currentTarget.style.color = SILVER)}
          onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
          <ChevronLeft size={13} /> Retour à l&apos;accueil
        </Link>
        <Link href="/register" className="bc-link"
          style={{ fontSize: 12, color: 'rgba(6,182,212,0.6)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#06b6d4')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(6,182,212,0.6)')}>
          Créer un compte élève →
        </Link>
      </div>
    </>
  )

  const role = profile?.role ?? null
  const rightPanel = authLoading
    ? pendingPanel
    : (!user || visitorSubmitting)
      ? visitorPanel
      : role === 'coach'
        ? coachPanel
        : role === 'admin'
          ? adminPanel
          : connectedPanel

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#04040a' }}>

      {/* ═══ LEFT PANEL ═══ */}
      <div className="coach-left" style={{
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
          {rightPanel}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .bc-cta { transition: transform 160ms cubic-bezier(0.23,1,0.32,1), opacity 160ms ease; }
        @media (hover: hover) and (pointer: fine) {
          .bc-cta:hover:not(:disabled) { transform: translateY(-1px) scale(1.01); }
        }
        .bc-cta:active:not(:disabled) { transform: scale(0.98); }
        .bc-cta:focus-visible, .bc-check:focus-visible, .bc-link:focus-visible {
          outline: 2px solid ${CREAM}; outline-offset: 3px;
        }
        .bc-check:focus-visible { border-radius: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .bc-cta { transition: opacity 160ms ease; }
          .bc-cta:hover:not(:disabled), .bc-cta:active:not(:disabled) { transform: none; }
        }
        @media (max-width: 720px) {
          .coach-left { display: none !important; }
        }
      `}</style>
    </div>
  )
}
