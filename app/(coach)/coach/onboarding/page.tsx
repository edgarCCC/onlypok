'use client'
import { useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import {
  Plus, Minus, Trash2, Upload, Check, Zap, CalendarCheck,
  Video, UserCheck, RefreshCw, MessageSquare, BookOpen,
  PlayCircle, Target, FileText, Settings, TrendingUp,
} from 'lucide-react'

/* ─── Palette ─── */
const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.2)'
const VIOLET = '#7c3aed'
const CARD   = 'rgba(255,255,255,0.03)'
const BORDER = 'rgba(255,255,255,0.08)'

/* ─── Données ─── */
const ROOMS = [
  { id: 'pokerstars', label: 'PokerStars' },
  { id: 'ggpoker',    label: 'GGPoker' },
  { id: 'winamax',    label: 'Winamax' },
  { id: 'pmu',        label: 'PMU Poker' },
  { id: '888poker',   label: '888poker' },
  { id: 'partypoker', label: 'PartyPoker' },
  { id: 'ipoker',     label: 'iPoker' },
  { id: 'unibet',     label: 'Unibet' },
  { id: 'betclic',    label: 'Betclic' },
  { id: 'bwin',       label: 'bwin' },
  { id: 'autre',      label: 'Autre' },
]

const VARIANTS = [
  { id: 'mtt',     label: 'MTT',          desc: 'Tournois multi-tables' },
  { id: 'cash',    label: 'Cash NLH',     desc: '6-max / Heads-Up' },
  { id: 'expresso',label: 'Expresso',     desc: 'Jackpot Sit & Go' },
  { id: 'plo',     label: 'PLO',          desc: 'Pot Limit Omaha' },
  { id: 'sng',     label: 'SNG',          desc: 'Sit & Go classiques' },
  { id: 'hu',      label: 'Heads-Up',     desc: 'Duel 1 contre 1' },
  { id: 'mixed',   label: 'Mixed Games',  desc: 'HORSE, 8-game…' },
  { id: 'pko',     label: 'PKO / Bounty', desc: 'Tournois à primes' },
]

type AdvItem = { id: string; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
const ADVANTAGES: AdvItem[] = [
  { id: 'video',     label: 'Analyse vidéo de vos sessions',     Icon: Video },
  { id: 'suivi',     label: 'Suivi personnalisé entre sessions',  Icon: UserCheck },
  { id: 'replay',    label: 'Replay des sessions',               Icon: RefreshCw },
  { id: 'hbh',       label: 'Feedback hand by hand détaillé',    Icon: MessageSquare },
  { id: 'ressources',label: 'Accès ressources exclusives',        Icon: BookOpen },
  { id: 'live',      label: 'Sessions en direct',                 Icon: PlayCircle },
  { id: 'exercices', label: 'Exercices pratiques entre sessions', Icon: Target },
  { id: 'hh',        label: 'Revue HH post-session',             Icon: FileText },
  { id: 'solver',    label: 'Travail sur solver / GTO',           Icon: Settings },
  { id: 'mental',    label: 'Mental game & gestion bankroll',     Icon: TrendingUp },
]

const PROOF_CATS = [
  { value: 'sharscope', label: 'SharkScope',          note: 'Obligatoire',  max: null },
  { value: 'perf',      label: 'Meilleures perfs',    note: 'Max 6',        max: 6 },
  { value: 'setup',     label: 'Photo du setup',      note: 'Conseillé',    max: null },
  { value: 'palmares',  label: 'Palmarès',            note: null,           max: null },
  { value: 'eleves',    label: 'Résultats élèves',    note: null,           max: null },
]

/* ─── Types ─── */
type Package = { id: string; name: string; sessions: number; price: string; desc: string }
type FormData = {
  rooms: string[]; yearsExp: number; isPro: boolean | null; variants: string[]
  advantages: string[]; bio: string; vision: string
  coachingMode: 'auto' | 'manual' | null
  hourlyRate: string; weekendPct: number; packages: Package[]
  phone: string; addressLine: string; city: string; zipCode: string; country: string
  isCompany: boolean | null; companyName: string; siret: string; vatNumber: string
}

const EMPTY: FormData = {
  rooms: [], yearsExp: 3, isPro: null, variants: [],
  advantages: [], bio: '', vision: '',
  coachingMode: null,
  hourlyRate: '80', weekendPct: 0, packages: [],
  phone: '', addressLine: '', city: '', zipCode: '', country: 'France',
  isCompany: null, companyName: '', siret: '', vatNumber: '',
}

/* ─── Progress ─── */
const TOTAL = 13
// Phase 1: 0-3 (4) | Phase 2: 4-7 (4) | Phase 3: 8-12 (5)
const phaseProgress = (step: number, phase: number) => {
  if (phase === 0) return step > 3 ? 1 : Math.min(1, (step + 1) / 4)
  if (phase === 1) return step < 4 ? 0 : step > 7 ? 1 : Math.min(1, (step - 3) / 4)
  return step < 8 ? 0 : Math.min(1, (step - 7) / 5)
}

/* ══════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════ */
export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useUser()
  const fileRef  = useRef<HTMLInputElement>(null)
  const uploadedKeys   = useRef<Set<string>>(new Set())
  const uploadCategory = useRef<string>('sharscope')

  const [step,     setStep]     = useState(0)
  const [form,     setForm]     = useState<FormData>(EMPTY)
  const [proofs,   setProofs]   = useState<any[]>([])
  const [uploading,setUploading]= useState(false)
  const [saving,   setSaving]   = useState(false)
  const [catError, setCatError] = useState('')

  const canNext = (() => {
    if (step === 1) return form.rooms.length > 0
    if (step === 2) return form.isPro !== null
    if (step === 3) return form.variants.length > 0
    if (step === 5) return form.advantages.length > 0
    if (step === 8) return form.coachingMode !== null
    if (step === 9) return Number(form.hourlyRate) > 0
    if (step === 12) return (
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

  const finish = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      bio: form.bio || null,
      years_experience: form.yearsExp,
      is_pro: form.isPro,
      rooms: form.rooms,
      variants: form.variants,
      advantages: form.advantages,
      coaching_mode: form.coachingMode,
      hourly_rate: Number(form.hourlyRate) || null,
      weekend_rate_pct: form.weekendPct,
      coaching_packages: form.packages,
      phone: form.phone || null,
      address_line: form.addressLine || null,
      city: form.city || null,
      zip_code: form.zipCode || null,
      country: form.country,
      is_company: form.isCompany,
      company_name: form.companyName || null,
      siret: form.siret || null,
      vat_number: form.vatNumber || null,
      onboarding_completed: true,
    }).eq('id', user.id)
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
    await supabase.from('profiles').update({
      rooms: form.rooms, variants: form.variants,
      bio: form.bio || null,
    }).eq('id', user.id)
    window.location.href = '/coach/dashboard'
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
          title="Parlons de votre jeu"
          body="Nous allons vous demander sur quelles rooms vous jouez, vos spécialités et votre expérience. Cela permettra aux élèves de trouver le coach qui leur correspond."
          visual={<SuitVisual />}
        />
      )

      /* ══ ROOMS ══ */
      case 1: return (
        <StepShell title="Sur quelle(s) salle(s) exercez-vous ?">
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
        <StepShell title="Votre expérience">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div>
              <Label>Depuis combien d'années jouez-vous au poker ?</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
                <StepperBtn onClick={() => set('yearsExp', Math.max(0, form.yearsExp - 1))}><Minus size={16} /></StepperBtn>
                <span style={{ fontSize: 52, fontWeight: 800, color: CREAM, letterSpacing: '-2px', minWidth: 64, textAlign: 'center' }}>{form.yearsExp}</span>
                <StepperBtn onClick={() => set('yearsExp', form.yearsExp + 1)}><Plus size={16} /></StepperBtn>
                <span style={{ fontSize: 14, color: SILVER }}>an{form.yearsExp > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div>
              <Label>Êtes-vous joueur professionnel ?</Label>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                {[{ v: true, l: 'Oui, je vis du poker' }, { v: false, l: 'Non, je joue en amateur' }].map(({ v, l }) => (
                  <button key={String(v)} onClick={() => set('isPro', v)}
                    style={{ flex: 1, padding: '18px 20px', borderRadius: 14, border: `1.5px solid ${form.isPro === v ? VIOLET : BORDER}`, background: form.isPro === v ? `${VIOLET}18` : CARD, color: form.isPro === v ? CREAM : SILVER, fontSize: 14, fontWeight: form.isPro === v ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
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
        <StepShell title="Vos spécialités" subtitle={`Sélectionnez jusqu'à 3 variantes que vous enseignez. (${form.variants.length}/3)`}>
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
          title="Démarquez-vous avec vos preuves"
          body="Ajoutez vos captures SharkScope, vos classements et résultats. Choisissez les avantages que vous offrez à vos élèves. Plus votre profil est complet, plus vous inspirez confiance."
          visual={<TrophyVisual />}
        />
      )

      /* ══ AVANTAGES — avec icônes ══ */
      case 5: return (
        <StepShell title="Ce que vous proposez à vos élèves" subtitle="Sélectionnez tout ce qui correspond à votre coaching.">
          <Grid2>
            {ADVANTAGES.map(({ id, label, Icon }) => {
              const sel = form.advantages.includes(id)
              return (
                <SelectCard key={id} selected={sel} onClick={() => toggle('advantages', id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${sel ? VIOLET : BORDER}`, background: sel ? `${VIOLET}18` : 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    <Icon size={15} color={sel ? '#a78bfa' : SILVER} />
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
        <StepShell title="Vos preuves" subtitle="La même photo ne peut pas être importée deux fois.">
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={async e => {
              for (const f of Array.from(e.target.files ?? [])) await uploadProof(f)
              e.target.value = ''
            }} />
          {catError && <p style={{ color: '#fbbf24', fontSize: 12, margin: '0 0 16px' }}>{catError}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {PROOF_CATS.map(cat => {
              const catProofs = proofs.filter(p => p.category === cat.value)
              const maxReached = cat.max !== null && catProofs.length >= cat.max
              const noteColor = cat.note === 'Obligatoire' ? '#fbbf24' : cat.note === 'Conseillé' ? '#34d399' : SILVER
              return (
                <div key={cat.value} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 24 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{cat.label}</span>
                    {cat.note && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: noteColor, background: 'rgba(255,255,255,0.04)', border: `1px solid ${noteColor}30`, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.04em' }}>{cat.note}</span>
                    )}
                    {catProofs.length > 0 && (
                      <span style={{ fontSize: 11, color: SILVER, marginLeft: 'auto' }}>
                        {catProofs.length}{cat.max ? ` / ${cat.max}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Grid */}
                  {catProofs.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                      {catProofs.map(p => (
                        <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0c0f17' }}>
                            <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button onClick={() => deleteProof(p.id, p.url)}
                              style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={10} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload zone */}
                  {maxReached ? (
                    <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Maximum atteint pour cette catégorie.</p>
                  ) : (
                    <div
                      onClick={() => {
                        if (uploading) return
                        uploadCategory.current = cat.value
                        fileRef.current?.click()
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 10, cursor: uploading ? 'wait' : 'pointer', transition: 'border-color 0.2s', width: 'fit-content' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.4)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                    >
                      {uploading && uploadCategory.current === cat.value
                        ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: CREAM, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
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
        <StepShell title="Décrivez-vous" subtitle="Ces textes apparaîtront sur votre page publique.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <Label>Votre bio · {form.bio.length}/500</Label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value.slice(0, 500))}
                placeholder="Racontez votre parcours : comment vous avez commencé, vos résultats marquants, votre progression…"
                rows={5}
                style={{ width: '100%', padding: '14px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 14, color: CREAM, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.2s', marginTop: 10 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
            </div>
            <div>
              <Label>Votre vision du poker · {form.vision.length}/300</Label>
              <textarea value={form.vision} onChange={e => set('vision', e.target.value.slice(0, 300))}
                placeholder="Votre philosophie, votre approche du jeu, ce que vous cherchez à transmettre…"
                rows={4}
                style={{ width: '100%', padding: '14px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 14, color: CREAM, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.2s', marginTop: 10 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
            </div>
          </div>
        </StepShell>
      )

      /* ══ MODE COACHING ══ */
      case 8: return (
        <StepShell title="Comment gérez-vous les demandes ?" subtitle="Vous pouvez modifier ce paramètre à tout moment depuis votre profil.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { v: 'manual' as const, Icon: CalendarCheck, label: 'Je valide à la main', sub: 'Vous approuvez chaque demande avant confirmation. Idéal pour sélectionner vos élèves.', badge: 'Recommandé' },
              { v: 'auto'   as const, Icon: Zap,           label: "Accepter d'office",   sub: 'Les élèves réservent directement sans validation. Maximisez vos réservations.' },
            ].map(({ v, Icon, label, sub, badge }) => (
              <button key={v} onClick={() => set('coachingMode', v)}
                style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 18, padding: '22px 24px', borderRadius: 16, border: `1.5px solid ${form.coachingMode === v ? VIOLET : BORDER}`, background: form.coachingMode === v ? `${VIOLET}12` : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <div style={{ color: form.coachingMode === v ? VIOLET : SILVER, marginTop: 2, flexShrink: 0 }}><Icon size={22} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: CREAM }}>{label}</span>
                    {badge && <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.06em' }}>{badge}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.55 }}>{sub}</p>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${form.coachingMode === v ? VIOLET : BORDER}`, background: form.coachingMode === v ? VIOLET : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {form.coachingMode === v && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </button>
            ))}
          </div>
        </StepShell>
      )

      /* ══ PRIX SEMAINE ══ */
      case 9: return (
        <StepShell title="Votre tarif horaire" subtitle="Prix pour une session de coaching en semaine. Vous pourrez le modifier à tout moment.">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 56, fontWeight: 300, color: SILVER }}>€</span>
              <input
                type="number" min="0" max="9999"
                value={form.hourlyRate}
                onChange={e => set('hourlyRate', e.target.value)}
                style={{ fontSize: 80, fontWeight: 800, color: CREAM, background: 'transparent', border: 'none', outline: 'none', width: 180, textAlign: 'center', letterSpacing: '-4px', fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: 18, color: SILVER, fontWeight: 300 }}>/h</span>
            </div>
            <div style={{ height: 1, width: 120, background: 'rgba(255,255,255,0.12)' }} />
            <p style={{ fontSize: 13, color: DIM, margin: 0 }}>Prix conseillé pour débuter : 80 €/h</p>
            {Number(form.hourlyRate) > 0 && (
              <div style={{ fontSize: 13, color: SILVER, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 20px' }}>
                Prix payé par l'élève (frais +8 %) ≈{' '}
                <strong style={{ color: CREAM }}>€{Math.round(Number(form.hourlyRate) * 1.08)}</strong>
              </div>
            )}
          </div>
        </StepShell>
      )

      /* ══ PRIX WEEK-END — stepper ══ */
      case 10: return (
        <StepShell title="Tarif week-end" subtitle="Ajoutez un supplément pour les vendredis, samedis et dimanches.">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 72, fontWeight: 800, color: CREAM, letterSpacing: '-3px' }}>
                {Math.round(Number(form.hourlyRate || 0) * (1 + form.weekendPct / 100))}
              </span>
              <span style={{ fontSize: 28, color: SILVER, fontWeight: 300 }}> €/h</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: SILVER }}>Supplément week-end</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <StepperBtn onClick={() => set('weekendPct', Math.max(0, form.weekendPct - 5))}><Minus size={16} /></StepperBtn>
                <div style={{ minWidth: 72, textAlign: 'center', fontSize: 40, fontWeight: 800, color: CREAM, letterSpacing: '-1px' }}>
                  {form.weekendPct}<span style={{ fontSize: 22, fontWeight: 400, color: SILVER }}>%</span>
                </div>
                <StepperBtn onClick={() => set('weekendPct', Math.min(50, form.weekendPct + 5))}><Plus size={16} /></StepperBtn>
              </div>
              <p style={{ fontSize: 12, color: DIM, margin: 0 }}>
                {form.weekendPct === 0
                  ? 'Même tarif tous les jours — laissez à 0 % si vous préférez.'
                  : `+${form.weekendPct} % le week-end · par tranches de 5 %`}
              </p>
            </div>
          </div>
        </StepShell>
      )

      /* ══ FORFAITS ══ */
      case 11: return (
        <StepShell title="Proposez des forfaits" subtitle="Packs multi-sessions à prix réduit. Optionnel — vous pouvez passer cette étape.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.packages.map((pkg, i) => (
              <div key={pkg.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input value={pkg.name}
                    onChange={e => setForm(f => ({ ...f, packages: f.packages.map((p, j) => j === i ? { ...p, name: e.target.value } : p) }))}
                    placeholder="Nom du forfait (ex: Pack Starter)"
                    style={inputStyle} />
                  <button onClick={() => setForm(f => ({ ...f, packages: f.packages.filter((_, j) => j !== i) }))}
                    style={{ padding: '0 12px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.07)', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                    <div style={{ fontSize: 12, color: '#4ade80', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '7px 12px' }}>
                      Économie de <strong>{saved} €</strong> · <strong>−{pct} %</strong> par rapport au tarif unitaire ({full} €)
                    </div>
                  )
                })()}
              </div>
            ))}
            <button
              onClick={() => setForm(f => ({ ...f, packages: [...f.packages, { id: Date.now().toString(), name: '', sessions: 5, price: String(Math.round(Number(f.hourlyRate || 80) * 4.5)), desc: '' }] }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, border: `1.5px dashed ${BORDER}`, background: 'transparent', color: SILVER, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
              <Plus size={16} /> Ajouter un forfait
            </button>
          </div>
        </StepShell>
      )

      /* ══ INFOS PERSO + STATUT LÉGAL (fusionnés) ══ */
      case 12: return (
        <StepShell title="Informations & statut légal" subtitle="Confidentielles — jamais visibles des élèves. Obligatoires pour les paiements.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Coordonnées */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Téléphone *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+33 6 00 00 00 00" type="tel" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pays *</label>
                <select value={form.country} onChange={e => set('country', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['France', 'Belgique', 'Suisse', 'Canada', 'Luxembourg', 'Autre'].map(c => <option key={c} value={c} style={{ background: '#1a1d24' }}>{c}</option>)}
                </select>
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
              <Label>Exercez-vous en tant qu'entreprise ? *</Label>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                {[{ v: false, l: 'Particulier / Auto-entrepreneur' }, { v: true, l: 'Entreprise (SARL, SAS…)' }].map(({ v, l }) => (
                  <button key={String(v)} onClick={() => set('isCompany', v)}
                    style={{ flex: 1, padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${form.isCompany === v ? VIOLET : BORDER}`, background: form.isCompany === v ? `${VIOLET}14` : CARD, color: form.isCompany === v ? CREAM : SILVER, fontSize: 13, fontWeight: form.isCompany === v ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
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
              <p style={{ fontSize: 12, color: '#fbbf24', margin: 0 }}>
                Remplissez tous les champs obligatoires (*) pour finaliser votre profil.
              </p>
            )}
          </div>
        </StepShell>
      )

      default: return null
    }
  }

  const isLast = step === TOTAL - 1

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, background: 'rgba(4,4,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }} />
          <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: VIOLET, padding: '2px 7px', border: `1px solid rgba(124,58,237,0.35)`, borderRadius: 4 }}>COACH</span>
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
        <div style={{ width: '100%', maxWidth: 700, padding: '48px 40px 0' }}>
          {renderStep()}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(4,4,10,0.97)', borderTop: `1px solid ${BORDER}`, backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', height: 3 }}>
          {[0, 1, 2].map(phase => (
            <div key={phase} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', position: 'relative', marginRight: phase < 2 ? 2 : 0 }}>
              <div style={{ position: 'absolute', inset: 0, background: VIOLET, transformOrigin: 'left', transform: `scaleX(${phaseProgress(step, phase)})`, transition: 'transform 0.4s ease' }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 40px' }}>
          <button onClick={() => go(-1)} disabled={step === 0}
            style={{ fontSize: 14, fontWeight: 600, color: step === 0 ? DIM : SILVER, background: 'transparent', border: 'none', cursor: step === 0 ? 'default' : 'pointer', transition: 'color 0.2s', padding: '8px 0' }}
            onMouseEnter={e => { if (step > 0) (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = step === 0 ? DIM : SILVER}>
            Retour
          </button>

          <span style={{ fontSize: 11, color: DIM }}>{step + 1} / {TOTAL}</span>

          {isLast ? (
            <button onClick={finish} disabled={!canNext || saving}
              style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: canNext ? VIOLET : 'rgba(124,58,237,0.3)', color: canNext ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 700, cursor: canNext && !saving ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: canNext ? '0 0 24px rgba(124,58,237,0.35)' : 'none' }}>
              {saving ? 'Finalisation…' : 'Terminer'}
            </button>
          ) : (
            <button onClick={() => go(1)} disabled={!canNext}
              style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: canNext ? VIOLET : 'rgba(124,58,237,0.3)', color: canNext ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 700, cursor: canNext ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: canNext ? '0 0 24px rgba(124,58,237,0.35)' : 'none' }}>
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

function Splash({ phase, title, body, visual }: { phase: string; title: string; body: string; visual: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 60, minHeight: '60vh' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(240,244,255,0.35)', letterSpacing: '0.1em', marginBottom: 16 }}>{phase}</p>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 24px', fontFamily: 'var(--font-syne, sans-serif)' }}>{title}</h1>
        <p style={{ fontSize: 16, color: 'rgba(240,244,255,0.5)', lineHeight: 1.75, margin: 0, maxWidth: 440 }}>{body}</p>
      </div>
      <div style={{ flexShrink: 0 }}>{visual}</div>
    </div>
  )
}

function SuitVisual() {
  return (
    <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {[
        { s: '♠', c: '#7c3aed', x: -50, y: -50 },
        { s: '♥', c: '#e11d48', x: 50,  y: -50 },
        { s: '♦', c: '#e11d48', x: -50, y: 50  },
        { s: '♣', c: '#06b6d4', x: 50,  y: 50  },
      ].map(({ s, c, x, y }) => (
        <span key={s} style={{ position: 'absolute', fontSize: 64, color: c, opacity: 0.7, transform: `translate(${x}px, ${y}px)`, textShadow: `0 0 30px ${c}60` }}>{s}</span>
      ))}
    </div>
  )
}

function TrophyVisual() {
  return (
    <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ fontSize: 100, color: '#f59e0b', opacity: 0.8, textShadow: '0 0 40px rgba(245,158,11,0.4)' }}>♛</span>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />
      </div>
    </div>
  )
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 32, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-1px', lineHeight: 1.15, margin: '0 0 10px', fontFamily: 'var(--font-syne, sans-serif)' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 14, color: 'rgba(240,244,255,0.4)', margin: '0 0 32px', lineHeight: 1.6 }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 32 }} />}
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,244,255,0.5)', display: 'block', marginBottom: 4 }}>{children}</label>
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>{children}</div>
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>{children}</div>
}

function SelectCard({ selected, onClick, children, style }: { selected: boolean; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${selected ? VIOLET : BORDER}`, background: selected ? `${VIOLET}14` : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', ...(style ?? {}) }}>
      {children}
    </button>
  )
}

function StepperBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${BORDER}`, background: CARD, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = VIOLET; (e.currentTarget as HTMLButtonElement).style.background = `${VIOLET}18` }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.background = CARD }}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, fontSize: 14, color: '#f0f4ff',
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  color: 'rgba(240,244,255,0.35)',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block', marginBottom: 8,
}
