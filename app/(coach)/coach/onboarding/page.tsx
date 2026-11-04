'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { fetchOwnProfile } from '@/lib/own-profile'
import { useUser } from '@/hooks/useUser'
import {
  Plus, Minus, Trash2, Upload, Check, Zap, CalendarCheck,
  Video, UserCheck, RefreshCw, MessageSquare, BookOpen,
  PlayCircle, Target, FileText, Settings, TrendingUp,
} from 'lucide-react'
import SelectInput from '@/components/ui/SelectInput'

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

/* ─── Palette ─── */
const CREAM  = 'var(--text)'
const SILVER = 'var(--text-2)'
const DIM    = 'color-mix(in srgb, var(--brand) 20%, transparent)'
const VIOLET = 'var(--brand)'
const CARD   = 'color-mix(in srgb, var(--overlay) 3%, transparent)'
const BORDER = 'color-mix(in srgb, var(--overlay) 8%, transparent)'

/* ─── Données ─── */
// Les IDs doivent correspondre EXACTEMENT aux valeurs stockées dans profiles.rooms / profiles.variants
const ROOMS = [
  { id: 'PokerStars', label: 'PokerStars' },
  { id: 'GGPoker',    label: 'GGPoker' },
  { id: 'Winamax',    label: 'Winamax' },
  { id: 'PMU Poker',  label: 'PMU Poker' },
  { id: '888poker',   label: '888poker' },
  { id: 'PartyPoker', label: 'PartyPoker' },
  { id: 'iPoker',     label: 'iPoker' },
  { id: 'Unibet',     label: 'Unibet' },
  { id: 'Betclic',    label: 'Betclic' },
  { id: 'bwin',       label: 'bwin' },
  { id: 'Autre',      label: 'Autre' },
]

const VARIANTS = [
  { id: 'MTT',      label: 'MTT',      desc: 'Tournois multi-tables' },
  { id: 'NLH',      label: 'NLH',      desc: 'No Limit Hold\'em' },
  { id: 'Cash',     label: 'Cash',     desc: '6-max / Heads-Up' },
  { id: 'Expresso', label: 'Expresso', desc: 'Jackpot Sit & Go' },
  { id: 'PLO',      label: 'PLO',      desc: 'Pot Limit Omaha' },
  { id: 'SNG',      label: 'SNG',      desc: 'Sit & Go classiques' },
  { id: 'Heads-Up', label: 'Heads-Up', desc: 'Duel 1 contre 1' },
  { id: 'PKO',      label: 'PKO',      desc: 'Tournois à primes' },
]

type AdvItem = { id: string; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
const ADVANTAGES: AdvItem[] = [
  { id: 'video',     label: 'Analyse vidéo de tes sessions',     Icon: Video },
  { id: 'suivi',     label: 'Suivi personnalisé entre sessions',  Icon: UserCheck },
  { id: 'replay',    label: 'Replay des sessions',               Icon: RefreshCw },
  { id: 'hbh',       label: 'Feedback hand by hand détaillé',    Icon: MessageSquare },
  { id: 'ressources',label: 'Accès ressources exclusives',        Icon: BookOpen },
  { id: 'live',      label: 'Sessions en direct',                 Icon: PlayCircle },
  { id: 'exercices', label: 'Exercices pratiques entre sessions', Icon: Target },
  { id: 'hh',        label: 'Review HH post-session',             Icon: FileText },
  { id: 'solver',    label: 'Travail sur solver / GTO',           Icon: Settings },
  { id: 'mental',    label: 'Mental game & gestion bankroll',     Icon: TrendingUp },
]

// Les valeurs doivent correspondre aux catégories du profil (profiles.coach_proofs.category)
const PROOF_CATS = [
  { value: 'stats',     label: 'Stats officielles',      note: 'Obligatoire · SharkScope, HM3/PT4 ou Hendon Mob', max: 5,    unlimited: false },
  { value: 'longterme', label: 'Long terme',             note: '6 mois minimum',                                 max: 3,    unlimited: false },
  { value: 'perf',      label: 'Meilleures perfs',       note: 'Plus gros gains · top résultats',                max: 4,    unlimited: false },
  { value: 'eleves',    label: 'Transformations élèves', note: 'Avec accord de l\'élève',                       max: null, unlimited: true  },
]

/* ─── Types ─── */
type Package = { id: string; name: string; sessions: number; price: string; desc: string }
type FormData = {
  rooms: string[]; yearsExp: number; isPro: boolean | null; variants: string[]
  advantages: string[]; bio: string; vision: string
  coachingMode: 'auto' | 'manual' | null
  hourlyRate: string; packages: Package[]
  phone: string; addressLine: string; city: string; zipCode: string; country: string
  isCompany: boolean | null; companyName: string; siret: string; vatNumber: string
}

const EMPTY: FormData = {
  rooms: [], yearsExp: 3, isPro: null, variants: [],
  advantages: [], bio: '', vision: '',
  coachingMode: null,
  hourlyRate: '80', packages: [],
  phone: '', addressLine: '', city: '', zipCode: '', country: 'France',
  isCompany: null, companyName: '', siret: '', vatNumber: '',
}

/* ─── Progress ─── */
const TOTAL = 12
// Phase 1: 0-3 (4) | Phase 2: 4-7 (4) | Phase 3: 8-12 (5)
const phaseProgress = (step: number, phase: number) => {
  if (phase === 0) return step > 3 ? 1 : Math.min(1, (step + 1) / 4)
  if (phase === 1) return step < 4 ? 0 : step > 7 ? 1 : Math.min(1, (step - 3) / 4)
  return step < 8 ? 0 : Math.min(1, (step - 7) / 4)
}

/* ══════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════ */
export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useUser()
  const fileRef        = useRef<HTMLInputElement>(null)
  const uploadedKeys   = useRef<Set<string>>(new Set())
  const uploadCategory = useRef<string>('stats')
  const initialized    = useRef(false)

  const [step,      setStep]      = useState(0)
  const [form,      setForm]      = useState<FormData>(EMPTY)
  const [proofs,    setProofs]    = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')
  const [catError,  setCatError]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const [phoneCode, setPhoneCode] = useState('+33')

  /* ── Init : charge le profil existant + step sauvegardé ── */
  useEffect(() => {
    if (!user || initialized.current) return
    initialized.current = true
    ;(async () => {
      const [{ data: p }, { data: pr }] = await Promise.all([
        fetchOwnProfile(supabase, user.id),
        supabase.from('coach_proofs').select('*').eq('coach_id', user.id).order('order_index'),
      ])

      // Guard rôle — un élève ne peut pas accéder à l'onboarding coach
      if (p?.role && p.role !== 'coach') {
        window.location.href = '/formations'
        return
      }

      // Si onboarding déjà terminé → redirige vers le profil
      if (p?.onboarding_completed) {
        window.location.href = '/coach/profile'
        return
      }

      // Restore step depuis localStorage
      const savedStep = localStorage.getItem(`pokme_onboarding_step_${user.id}`)
      if (savedStep !== null) setStep(Math.min(TOTAL - 1, Math.max(0, Number(savedStep) || 0)))

      // Pré-remplir le form avec les données déjà en base
      if (p) {
        setForm({
          rooms:        p.rooms ?? [],
          yearsExp:     p.years_experience ?? 3,
          isPro:        p.is_pro ?? null,
          variants:     p.variants ?? [],
          advantages:   p.advantages ?? [],
          bio:          p.bio ?? '',
          vision:       p.vision ?? '',
          coachingMode: p.coaching_mode ?? null,
          hourlyRate:   String(p.hourly_rate ?? 80),
          packages:     p.coaching_packages ?? [],
          phone:        p.phone ?? '',
          addressLine:  p.address_line ?? '',
          city:         p.city ?? '',
          zipCode:      p.zip_code ?? '',
          country:      p.country ?? 'France',
          isCompany:    p.is_company ?? null,
          companyName:  p.company_name ?? '',
          siret:        p.siret ?? '',
          vatNumber:    p.vat_number ?? '',
        })
      }

      setProofs(pr ?? [])
      setLoading(false)
    })()
  }, [user, supabase])

  /* ── Sauvegarde automatique du step courant ── */
  useEffect(() => {
    if (!user || loading) return
    localStorage.setItem(`pokme_onboarding_step_${user.id}`, String(step))
  }, [step, user, loading])

  const canNext = (() => {
    if (step === 1) return form.rooms.length > 0
    if (step === 2) return form.isPro !== null
    if (step === 3) return form.variants.length > 0
    if (step === 5) return form.advantages.length > 0
    if (step === 8) return form.coachingMode !== null
    if (step === 9) return Number(form.hourlyRate) > 0
    if (step === 11) return (
      form.phone.trim().length > 0 &&
      form.addressLine.trim().length > 0 &&
      form.city.trim().length > 0 &&
      form.zipCode.trim().length > 0 &&
      form.isCompany !== null &&
      (form.isCompany === false || (form.companyName.trim().length > 0 && form.siret.trim().length > 0))
    )
    return true
  })()

  const go = (dir: 1 | -1) => setStep(s => Math.max(0, Math.min(TOTAL - 1, s + dir)))

  const buildProfilePayload = () => ({
    bio:               form.bio || null,
    vision:            form.vision || null,
    years_experience:  form.yearsExp,
    is_pro:            form.isPro,
    rooms:             form.rooms,
    variants:          form.variants,
    advantages:        form.advantages,
    coaching_mode:     form.coachingMode,
    hourly_rate:       Number(form.hourlyRate) || null,
    coaching_packages: form.packages,
    phone:             form.phone.trim() ? `${phoneCode}${form.phone.trim()}` : null,
    address_line:      form.addressLine || null,
    city:              form.city || null,
    zip_code:          form.zipCode || null,
    country:           form.country,
    is_company:        form.isCompany,
    company_name:      form.companyName || null,
    siret:             form.siret || null,
    vat_number:        form.vatNumber || null,
  })

  const saveFormToProfile = async (): Promise<boolean> => {
    if (!user) return false
    const { error } = await supabase.from('profiles').update(buildProfilePayload()).eq('id', user.id)
    if (error) {
      setSaveError(`Erreur lors de la sauvegarde : ${error.message}`)
      return false
    }
    return true
  }

  const finish = async () => {
    if (!user) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('profiles').update({
      ...buildProfilePayload(),
      onboarding_completed: true,
    }).eq('id', user.id)
    if (error) {
      setSaveError(`Erreur lors de la finalisation : ${error.message}`)
      setSaving(false)
      return
    }
    localStorage.removeItem(`pokme_onboarding_step_${user.id}`)
    // Upsert coaching listing in marketplace
    const username = (profile as any)?.username ?? 'Coach'
    const { data: existing } = await supabase.from('formations')
      .select('id').eq('coach_id', user.id).eq('content_type', 'coaching').maybeSingle()
    const coachingRow = {
      coach_id: user.id,
      content_type: 'coaching',
      title: `${username} — Coaching`,
      published: true,
      price: Number(form.hourlyRate) || 0,
      short_desc: form.bio?.slice(0, 200) || null,
      variant: form.variants[0] || null,
      duration_minutes: 60,
      modules_count: 0,
    }
    if (existing?.id) {
      await supabase.from('formations').update(coachingRow).eq('id', existing.id)
    } else {
      await supabase.from('formations').insert(coachingRow)
    }

    window.location.href = '/coach/dashboard'
  }

  const saveAndQuit = async () => {
    if (!user) return
    const ok = await saveFormToProfile()
    if (ok) window.location.href = '/coach/dashboard'
  }

  /* Proof upload */
  const uploadProof = async (file: File) => {
    if (!user) return
    const key = `${file.name}_${file.size}`
    if (uploadedKeys.current.has(key)) return
    setUploading(true)
    const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('coach-proofs').upload(path, file, { contentType: file.type })
    if (!error) {
      uploadedKeys.current.add(key)
      const { data: url } = supabase.storage.from('coach-proofs').getPublicUrl(path)
      const { data: row } = await supabase.from('coach_proofs').insert({
        coach_id: user.id, url: url.publicUrl,
        caption: '', category: uploadCategory.current, order_index: proofs.length,
      }).select().single()
      if (row) setProofs(p => [...p, row])
    }
    setUploading(false)
  }

  const deleteProof = async (id: string, url: string) => {
    const parts = url.split('/coach-proofs/')
    if (parts[1]) await supabase.storage.from('coach-proofs').remove([parts[1]])
    await supabase.from('coach_proofs').delete().eq('id', id)
    setProofs(p => p.filter(x => x.id !== id))
  }

  const changeCategory = (id: string, cat: string) => {
    const perfCount = proofs.filter(x => x.id !== id && x.category === 'perf').length
    if (cat === 'perf' && perfCount >= 6) { setCatError('Maximum 6 photos pour "Meilleures perfs"'); return }
    setCatError('')
    supabase.from('coach_proofs').update({ category: cat }).eq('id', id)
    setProofs(prev => prev.map(x => x.id === id ? { ...x, category: cat } : x))
  }

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const toggle = (field: 'rooms' | 'advantages', id: string) =>
    setForm(f => ({ ...f, [field]: f[field].includes(id) ? f[field].filter(x => x !== id) : [...f[field], id] }))

  const toggleVariant = (id: string) => setForm(f => {
    if (f.variants.includes(id)) return { ...f, variants: f.variants.filter(x => x !== id) }
    if (f.variants.length >= 3) return f
    return { ...f, variants: [...f.variants, id] }
  })

  /* ─── STEPS ─── */
  const renderStep = () => {
    switch (step) {

      /* ══ SPLASH 1 ══ */
      case 0: return (
        <Splash
          phase="Étape 1 sur 3"
          title="Parlons de ton jeu"
          body="On va te demander sur quelles rooms tu joues, tes spécialités et ton expérience. Les élèves trouveront ainsi le coach qui leur correspond."
        />
      )

      /* ══ ROOMS ══ */
      case 1: return (
        <StepShell title="Sur quelle(s) room(s) joues-tu ?">
          <Grid3>
            {ROOMS.map(r => (
              <SelectCard key={r.id} selected={form.rooms.includes(r.id)} onClick={() => toggle('rooms', r.id)}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{r.label}</span>
              </SelectCard>
            ))}
          </Grid3>
        </StepShell>
      )

      /* ══ EXPÉRIENCE ══ */
      case 2: return (
        <StepShell title="Ton expérience">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div>
              <Label>Depuis combien d'années joues-tu au poker ?</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
                <StepperBtn onClick={() => set('yearsExp', Math.max(0, form.yearsExp - 1))}><Minus size={16} /></StepperBtn>
                <span style={{ fontSize: 52, fontWeight: 700, color: CREAM, letterSpacing: '-2px', minWidth: 64, textAlign: 'center' }}>{form.yearsExp}</span>
                <StepperBtn onClick={() => set('yearsExp', form.yearsExp + 1)}><Plus size={16} /></StepperBtn>
                <span style={{ fontSize: 14, color: SILVER }}>an{form.yearsExp > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div>
              <Label>Es-tu joueur professionnel ?</Label>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                {[{ v: true, l: 'Oui, je vis du poker' }, { v: false, l: 'Non, je joue en amateur' }].map(({ v, l }) => (
                  <button key={String(v)} onClick={() => set('isPro', v)}
                    style={{ flex: 1, padding: '18px 20px', borderRadius: 14, border: `1.5px solid ${form.isPro === v ? VIOLET : BORDER}`, background: form.isPro === v ? `color-mix(in srgb, ${VIOLET} 9%, transparent)` : CARD, color: form.isPro === v ? CREAM : SILVER, fontSize: 14, fontWeight: form.isPro === v ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </StepShell>
      )

      /* ══ VARIANTES — max 3 ══ */
      case 3: return (
        <StepShell title="Tes spécialités" subtitle={`Sélectionne jusqu'à 3 variantes que tu enseignes. (${form.variants.length}/3)`}>
          <Grid3>
            {VARIANTS.map(v => {
              const sel = form.variants.includes(v.id)
              const disabled = !sel && form.variants.length >= 3
              return (
                <SelectCard key={v.id} selected={sel} onClick={() => !disabled && toggleVariant(v.id)}
                  style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{v.label}</span>
                  <span style={{ fontSize: 11, color: SILVER }}>{v.desc}</span>
                </SelectCard>
              )
            })}
          </Grid3>
        </StepShell>
      )

      /* ══ SPLASH 2 ══ */
      case 4: return (
        <Splash
          phase="Étape 2 sur 3"
          title="Démarque-toi avec tes preuves"
          body="Ajoute tes captures SharkScope, tes classements et résultats. Choisis les avantages que tu offres à tes élèves. Plus ton profil est complet, plus tu inspires confiance."
        />
      )

      /* ══ AVANTAGES — avec icônes ══ */
      case 5: return (
        <StepShell title="Ce que tu proposes à tes élèves" subtitle="Sélectionne tout ce qui correspond à ton coaching.">
          <Grid2>
            {ADVANTAGES.map(({ id, label, Icon }) => {
              const sel = form.advantages.includes(id)
              return (
                <SelectCard key={id} selected={sel} onClick={() => toggle('advantages', id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${sel ? VIOLET : BORDER}`, background: sel ? `color-mix(in srgb, ${VIOLET} 9%, transparent)` : 'color-mix(in srgb, var(--overlay) 2%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    <Icon size={15} color={sel ? 'var(--brand)' : SILVER} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: sel ? CREAM : SILVER }}>{label}</span>
                </SelectCard>
              )
            })}
          </Grid2>
        </StepShell>
      )

      /* ══ PREUVES PAR CATÉGORIE ══ */
      case 6: return (
        <StepShell title="Tes preuves" subtitle="La même photo ne peut pas être importée deux fois.">
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={async e => {
              for (const f of Array.from(e.target.files ?? [])) await uploadProof(f)
              e.target.value = ''
            }} />
          {catError && <p style={{ color: 'var(--brand)', fontSize: 12, margin: '0 0 16px' }}>{catError}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {PROOF_CATS.map(cat => {
              const catProofs = proofs.filter(p => p.category === cat.value)
              const maxReached = cat.max !== null && catProofs.length >= cat.max
              const noteColor = cat.note === 'Obligatoire' ? 'var(--brand)' : cat.note === 'Conseillé' ? 'var(--gain)' : SILVER
              return (
                <div key={cat.value} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 24 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{cat.label}</span>
                    {cat.note && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: noteColor, background: 'color-mix(in srgb, var(--overlay) 4%, transparent)', border: `1px solid color-mix(in srgb, ${noteColor} 19%, transparent)`, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.04em' }}>{cat.note}</span>
                    )}
                    {catProofs.length > 0 && (
                      <span style={{ fontSize: 11, color: SILVER, marginLeft: 'auto' }}>
                        {catProofs.length}{cat.unlimited ? ' · illimité' : cat.max ? ` / ${cat.max}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Grid */}
                  {catProofs.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                      {catProofs.map(p => (
                        <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg)' }}>
                            <Image src={p.url} alt="" fill sizes="150px" style={{ objectFit: 'cover' }} />
                            <button onClick={() => deleteProof(p.id, p.url)}
                              style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={10} color="var(--error)" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload zone */}
                  {maxReached ? (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Maximum atteint pour cette catégorie.</p>
                  ) : (
                    <div
                      onClick={() => {
                        if (uploading) return
                        uploadCategory.current = cat.value
                        fileRef.current?.click()
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px dashed color-mix(in srgb, var(--overlay) 10%, transparent)', borderRadius: 10, cursor: uploading ? 'wait' : 'pointer', transition: 'border-color 0.2s', width: 'fit-content' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'color-mix(in srgb, var(--brand) 40%, transparent)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'color-mix(in srgb, var(--overlay) 10%, transparent)'}
                    >
                      {uploading && uploadCategory.current === cat.value
                        ? <div style={{ width: 14, height: 14, border: '2px solid color-mix(in srgb, var(--overlay) 10%, transparent)', borderTopColor: CREAM, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        : <Upload size={13} color={SILVER} />}
                      <span style={{ fontSize: 13, color: SILVER }}>{catProofs.length === 0 ? 'Ajouter' : 'Ajouter d\'autres'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </StepShell>
      )

      /* ══ DESCRIPTION ══ */
      case 7: return (
        <StepShell title="Décris-toi" subtitle="Ces textes apparaîtront sur ta page publique.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <Label>Ta bio · {form.bio.length}/500</Label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value.slice(0, 500))}
                placeholder="Raconte ton parcours : comment tu as commencé, tes résultats marquants, ta progression…"
                rows={5}
                style={{ width: '100%', padding: '14px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 14, color: CREAM, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.2s', marginTop: 10 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--brand) 50%, transparent)')}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
            </div>
            <div>
              <Label>Ta vision du poker · {form.vision.length}/300</Label>
              <textarea value={form.vision} onChange={e => set('vision', e.target.value.slice(0, 300))}
                placeholder="Ta philosophie, ton approche du jeu, ce que tu cherches à transmettre…"
                rows={4}
                style={{ width: '100%', padding: '14px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 14, color: CREAM, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.2s', marginTop: 10 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--brand) 50%, transparent)')}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
            </div>
          </div>
        </StepShell>
      )

      /* ══ MODE COACHING ══ */
      case 8: return (
        <StepShell title="Comment gères-tu les demandes ?" subtitle="Tu peux modifier ce paramètre à tout moment depuis ton profil.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { v: 'manual' as const, Icon: CalendarCheck, label: 'Je valide à la main', sub: 'Tu approuves chaque demande avant confirmation. Idéal pour sélectionner tes élèves.', badge: 'Recommandé' },
              { v: 'auto'   as const, Icon: Zap,           label: "Accepter d'office",   sub: 'Les élèves réservent directement sans validation. Tu maximises tes réservations.' },
            ].map(({ v, Icon, label, sub, badge }) => (
              <button key={v} onClick={() => set('coachingMode', v)}
                style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 18, padding: '22px 24px', borderRadius: 16, border: `1.5px solid ${form.coachingMode === v ? VIOLET : BORDER}`, background: form.coachingMode === v ? `color-mix(in srgb, ${VIOLET} 7%, transparent)` : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <div style={{ color: form.coachingMode === v ? VIOLET : SILVER, marginTop: 2, flexShrink: 0 }}><Icon size={22} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: CREAM }}>{label}</span>
                    {badge && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gain)', background: 'color-mix(in srgb, var(--gain) 10%, transparent)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.06em' }}>{badge}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.55 }}>{sub}</p>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${form.coachingMode === v ? VIOLET : BORDER}`, background: form.coachingMode === v ? VIOLET : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {form.coachingMode === v && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--on-brand)' }} />}
                </div>
              </button>
            ))}
          </div>
        </StepShell>
      )

      /* ══ PRIX SEMAINE ══ */
      case 9: return (
        <StepShell title="Ton tarif horaire" subtitle="Prix pour une session de coaching. Tu pourras le modifier à tout moment.">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 56, fontWeight: 300, color: SILVER }}>€</span>
              <input
                type="number" min="0" max="9999"
                value={form.hourlyRate}
                onChange={e => set('hourlyRate', e.target.value)}
                style={{ fontSize: 80, fontWeight: 700, color: CREAM, background: 'transparent', border: 'none', outline: 'none', width: 180, textAlign: 'center', letterSpacing: '-4px', fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: 18, color: SILVER, fontWeight: 300 }}>/h</span>
            </div>
            <div style={{ height: 1, width: 120, background: 'color-mix(in srgb, var(--overlay) 12%, transparent)' }} />
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Prix conseillé pour débuter : 80 €/h</p>
            {Number(form.hourlyRate) > 0 && (
              <div style={{ fontSize: 13, color: SILVER, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 20px' }}>
                Prix payé par l'élève (frais +8 %) ≈{' '}
                <strong style={{ color: CREAM }}>€{Math.round(Number(form.hourlyRate) * 1.08)}</strong>
              </div>
            )}
          </div>
        </StepShell>
      )

      /* ══ FORFAITS ══ */
      case 10: return (
        <StepShell title="Propose des forfaits" subtitle="Packs multi-sessions à prix réduit. Facultatif, tu peux passer cette étape.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.packages.map((pkg, i) => (
              <div key={pkg.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input value={pkg.name}
                    onChange={e => setForm(f => ({ ...f, packages: f.packages.map((p, j) => j === i ? { ...p, name: e.target.value } : p) }))}
                    placeholder="Nom du forfait (ex: Pack Starter)"
                    style={inputStyle} />
                  <button onClick={() => setForm(f => ({ ...f, packages: f.packages.filter((_, j) => j !== i) }))}
                    style={{ padding: '0 12px', borderRadius: 8, border: `1px solid color-mix(in srgb, var(--error) 30%, transparent)`, background: 'color-mix(in srgb, var(--error) 7%, transparent)', color: 'var(--error)', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="cob-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Sessions</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <StepperBtn onClick={() => setForm(f => ({ ...f, packages: f.packages.map((p, j) => j === i ? { ...p, sessions: Math.max(1, p.sessions - 1) } : p) }))}><Minus size={13} /></StepperBtn>
                      <span style={{ fontSize: 22, fontWeight: 700, color: CREAM, minWidth: 28, textAlign: 'center' }}>{pkg.sessions}</span>
                      <StepperBtn onClick={() => setForm(f => ({ ...f, packages: f.packages.map((p, j) => j === i ? { ...p, sessions: p.sessions + 1 } : p) }))}><Plus size={13} /></StepperBtn>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Prix total (€)</label>
                    <input value={pkg.price} placeholder="ex: 320"
                      onChange={e => setForm(f => ({ ...f, packages: f.packages.map((p, j) => j === i ? { ...p, price: e.target.value } : p) }))}
                      style={{ ...inputStyle, marginTop: 4 }} />
                  </div>
                </div>
                <input value={pkg.desc}
                  onChange={e => setForm(f => ({ ...f, packages: f.packages.map((p, j) => j === i ? { ...p, desc: e.target.value } : p) }))}
                  placeholder="Description courte (optionnel)"
                  style={inputStyle} />

                {/* Discount vs hourly rate */}
                {Number(form.hourlyRate) > 0 && Number(pkg.price) > 0 && (() => {
                  const full = pkg.sessions * Number(form.hourlyRate)
                  const saved = full - Number(pkg.price)
                  const pct = Math.round((saved / full) * 100)
                  if (saved <= 0) return null
                  return (
                    <div style={{ fontSize: 12, color: 'var(--gain)', background: 'color-mix(in srgb, var(--gain) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 15%, transparent)', borderRadius: 8, padding: '7px 12px' }}>
                      Économie de <strong>{saved} €</strong> · <strong>−{pct} %</strong> par rapport au tarif unitaire ({full} €)
                    </div>
                  )
                })()}
              </div>
            ))}
            <button
              onClick={() => setForm(f => ({ ...f, packages: [...f.packages, { id: Date.now().toString(), name: '', sessions: 5, price: String(Math.round(Number(f.hourlyRate || 80) * 4.5)), desc: '' }] }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, border: `1.5px dashed ${BORDER}`, background: 'transparent', color: SILVER, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in srgb, var(--brand) 40%, transparent)'; (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
              <Plus size={16} /> Ajouter un forfait
            </button>
          </div>
        </StepShell>
      )

      /* ══ INFOS PERSO + STATUT LÉGAL (fusionnés) ══ */
      case 11: return (
        <StepShell title="Informations & statut légal" subtitle="Confidentielles — jamais visibles des élèves. Obligatoires pour les paiements.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Coordonnées */}
            <div className="cob-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Téléphone *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <SelectInput
                    value={phoneCode}
                    onChange={setPhoneCode}
                    options={CALLING_CODES.map(c => ({ value: c.code, label: `${c.flag} ${c.code}` }))}
                    style={{ width: 'auto', flexShrink: 0 }}
                    selectStyle={{ padding: '11px 32px 11px 10px', fontSize: 13 }}
                  />
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="6 12 34 56 78" type="tel"
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Pays *</label>
                <SelectInput value={form.country} onChange={v => set('country', v)}
                  options={['France', 'Belgique', 'Suisse', 'Canada', 'Luxembourg', 'Autre'].map(c => ({ value: c, label: c }))} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Adresse *</label>
                <input value={form.addressLine} onChange={e => set('addressLine', e.target.value)} placeholder="12 rue de la Paix" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Code postal *</label>
                <input value={form.zipCode} onChange={e => set('zipCode', e.target.value)} placeholder="75001" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ville *</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Paris" style={inputStyle} />
              </div>
            </div>

            {/* Statut légal */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
              <Label>Exerces-tu en tant qu'entreprise ? *</Label>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                {[{ v: false, l: 'Particulier / Auto-entrepreneur' }, { v: true, l: 'Entreprise (SARL, SAS…)' }].map(({ v, l }) => (
                  <button key={String(v)} onClick={() => set('isCompany', v)}
                    style={{ flex: 1, padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${form.isCompany === v ? VIOLET : BORDER}`, background: form.isCompany === v ? `color-mix(in srgb, ${VIOLET} 8%, transparent)` : CARD, color: form.isCompany === v ? CREAM : SILVER, fontSize: 13, fontWeight: form.isCompany === v ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {form.isCompany && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
                <div>
                  <label style={labelStyle}>Raison sociale *</label>
                  <input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Ma Société SAS" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Numéro SIRET *</label>
                  <input value={form.siret} onChange={e => set('siret', e.target.value)} placeholder="123 456 789 00012" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>N° TVA intracommunautaire (si applicable)</label>
                  <input value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="FR12345678901" style={inputStyle} />
                </div>
              </div>
            )}

            {!canNext && (
              <p style={{ fontSize: 12, color: 'var(--brand)', margin: 0 }}>
                Remplis tous les champs obligatoires (*) pour finaliser ton profil.
              </p>
            )}
          </div>
        </StepShell>
      )

      default: return null
    }
  }

  const isLast = step === TOTAL - 1

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 32, height: 32, border: '2px solid color-mix(in srgb, var(--brand) 20%, transparent)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Chargement de ton profil…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: CREAM, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 700px) {
          .cob-header { padding: 0 16px !important; }
          .cob-main { padding: 32px 16px 0 !important; }
          .cob-footer-row { padding: 14px 16px !important; }
          .cob-grid3 { grid-template-columns: 1fr !important; }
          .cob-splash { flex-direction: column !important; gap: 32px !important; }
          .cob-splash h1 { font-size: 32px !important; letter-spacing: -1px !important; }
        }
        @media (max-width: 560px) {
          .cob-grid2 { grid-template-columns: 1fr !important; }
          .cob-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="cob-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, background: 'var(--bg)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--brand)' }} />
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: VIOLET, padding: '2px 7px', border: `1px solid color-mix(in srgb, var(--brand) 35%, transparent)`, borderRadius: 4 }}>COACH</span>
        </div>
        <button onClick={saveAndQuit}
          style={{ fontSize: 13, fontWeight: 600, color: SILVER, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 16px', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = CREAM)}
          onMouseLeave={e => (e.currentTarget.style.color = SILVER)}>
          Enregistrer et quitter
        </button>
      </header>

      {/* ── Contenu ── */}
      <main style={{ flex: 1, paddingTop: 64, paddingBottom: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div className="cob-main" style={{ width: '100%', maxWidth: 700, padding: '48px 40px 0' }}>
          {renderStep()}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--bg)', borderTop: `1px solid ${BORDER}`, backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', height: 3 }}>
          {[0, 1, 2].map(phase => (
            <div key={phase} style={{ flex: 1, background: 'color-mix(in srgb, var(--overlay) 6%, transparent)', position: 'relative', marginRight: phase < 2 ? 2 : 0 }}>
              <div style={{ position: 'absolute', inset: 0, background: VIOLET, transformOrigin: 'left', transform: `scaleX(${phaseProgress(step, phase)})`, transition: 'transform 0.4s ease' }} />
            </div>
          ))}
        </div>

        <div className="cob-footer-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 40px' }}>
          <button onClick={() => go(-1)} disabled={step === 0}
            style={{ fontSize: 14, fontWeight: 600, color: step === 0 ? 'var(--text-3)' : SILVER, background: 'transparent', border: 'none', cursor: step === 0 ? 'default' : 'pointer', transition: 'color 0.2s', padding: '8px 0' }}
            onMouseEnter={e => { if (step > 0) (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = step === 0 ? 'var(--text-3)' : SILVER}>
            Retour
          </button>

          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{step + 1} / {TOTAL}</span>

          {isLast ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {saveError && <p style={{ fontSize: 11, color: 'var(--error)', margin: 0, maxWidth: 260, textAlign: 'right' }}>{saveError}</p>}
              <button onClick={finish} disabled={!canNext || saving}
                style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: canNext ? VIOLET : 'color-mix(in srgb, var(--brand) 30%, transparent)', color: canNext ? 'var(--on-brand)' : 'var(--text-3)', fontSize: 14, fontWeight: 700, cursor: canNext && !saving ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: canNext ? 'none' : 'none' }}>
                {saving ? 'Finalisation…' : 'Terminer'}
              </button>
            </div>
          ) : (
            <button onClick={() => go(1)} disabled={!canNext}
              style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: canNext ? VIOLET : 'color-mix(in srgb, var(--brand) 30%, transparent)', color: canNext ? 'var(--on-brand)' : 'var(--text-3)', fontSize: 14, fontWeight: 700, cursor: canNext ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: canNext ? 'none' : 'none' }}>
              Suivant
            </button>
          )}
        </div>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SOUS-COMPOSANTS
══════════════════════════════════════════════════════ */

function Splash({ phase, title, body }: { phase: string; title: string; body: string }) {
  return (
    <div className="cob-splash" style={{ display: 'flex', alignItems: 'center', gap: 60, minHeight: '60vh' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 16 }}>{phase}</p>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: 'var(--text)', letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 24px', fontFamily: 'var(--font-syne, sans-serif)' }}>{title}</h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.75, margin: 0, maxWidth: 440 }}>{body}</p>
      </div>
    </div>
  )
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 32, fontWeight: 600, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1.15, margin: '0 0 10px', fontFamily: 'var(--font-syne, sans-serif)' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 32px', lineHeight: 1.6 }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 32 }} />}
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>{children}</label>
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="cob-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>{children}</div>
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="cob-grid2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>{children}</div>
}

function SelectCard({ selected, onClick, children, style }: { selected: boolean; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${selected ? VIOLET : BORDER}`, background: selected ? `color-mix(in srgb, ${VIOLET} 8%, transparent)` : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', ...(style ?? {}) }}>
      {children}
    </button>
  )
}

function StepperBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${BORDER}`, background: CARD, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = VIOLET; (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${VIOLET} 9%, transparent)` }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.background = CARD }}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'color-mix(in srgb, var(--overlay) 3%, transparent)',
  border: '1px solid color-mix(in srgb, var(--overlay) 8%, transparent)',
  borderRadius: 10, fontSize: 14, color: 'var(--brand)',
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-3)',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block', marginBottom: 8,
}
