'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchOwnProfile } from '@/lib/own-profile'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import ProofGalleryModal from '@/components/ProofGalleryModal'
import type { Proof } from '@/components/ProofGalleryModal'
import Link from 'next/link'
import {
  Upload, Trash2, Check, Eye, ExternalLink, Calendar, Star, BookOpen,
  Save, ImageIcon, Camera, Plus, Minus, Video, UserCheck, RefreshCw,
  MessageSquare, PlayCircle, Target, FileText, Settings, TrendingUp,
  ChevronDown, ChevronUp, Zap, BarChart2, Trophy, Users,
  Monitor, Layers, Landmark, CreditCard, Smartphone, X, RotateCcw, Edit2,
  Fish, Swords, GraduationCap, Flame, Clock, AlertCircle, ShieldCheck,
} from 'lucide-react'
import SelectInput from '@/components/ui/SelectInput'

/* ── Palette ── */
const CREAM  = 'var(--text)'
const SILVER = 'var(--text-2)'
const DIM    = 'color-mix(in srgb, var(--brand) 20%, transparent)'
const VIOLET = 'var(--brand)'
const CYAN   = 'var(--brand)'
const CARD   = 'color-mix(in srgb, var(--brand) 3%, transparent)'
const BORDER = 'color-mix(in srgb, var(--brand) 8%, transparent)'

/* ── Constants ── */
const ROOMS = [
  'PokerStars','GGPoker','Winamax','888poker',
  'PartyPoker','iPoker','Unibet','Betclic','bwin','Autre',
]
const VARIANTS = [
  { id: 'MTT',      desc: 'Tournois multi-tables' },
  { id: 'Cash',     desc: 'Cash game en ligne' },
  { id: 'Live',     desc: 'Poker en salle' },
  { id: 'Expresso', desc: 'Jackpot Sit & Go' },
  { id: 'Mental',   desc: 'Mental game & bankroll' },
]
const TARGET_PLAYERS = [
  { id: 'fish',    label: 'Poissons',        sub: 'Récréatifs & débutants', Icon: Fish,          color: 'var(--brand)' },
  { id: 'regular', label: 'Réguliers',       sub: 'Grinders & gagnants',    Icon: BarChart2,     color: 'var(--gain)' },
  { id: 'semipro', label: 'Semi-pros',       sub: 'Objectif profit durable', Icon: GraduationCap, color: 'var(--brand)' },
  { id: 'shark',   label: 'Sharks / Pros',  sub: 'High-stakes & élite',    Icon: Swords,        color: 'var(--brand)' },
]

const ADVANTAGES = [
  { id: 'video',      label: 'Analyse vidéo',         Icon: Video },
  { id: 'suivi',      label: 'Suivi personnalisé',     Icon: UserCheck },
  { id: 'replay',     label: 'Replay des sessions',    Icon: RefreshCw },
  { id: 'hbh',        label: 'Feedback hand by hand',  Icon: MessageSquare },
  { id: 'ressources', label: 'Ressources exclusives',  Icon: BookOpen },
  { id: 'live',       label: 'Sessions en direct',     Icon: PlayCircle },
  { id: 'exercices',  label: 'Exercices pratiques',    Icon: Target },
  { id: 'hh',         label: 'Review HH post-session',  Icon: FileText },
  { id: 'solver',     label: 'Travail solver / GTO',   Icon: Settings },
  { id: 'mental',     label: 'Mental game & bankroll', Icon: TrendingUp },
]

type ProofCat = {
  value: string; label: string; Icon: React.ElementType
  recommended: number; required: boolean; desc: string; color: string
  unlimited?: boolean
}
const PROOF_CATS: ProofCat[] = [
  { value: 'stats',     label: 'Stats officielles',      Icon: BarChart2, recommended: 5, required: true,  desc: 'SharkScope · HM3/PT4 · Hendon Mob, selon ton format', color: 'var(--brand)' },
  { value: 'longterme', label: 'Long terme',             Icon: Flame,     recommended: 3, required: false, desc: 'Courbe de gains sur 6 mois minimum',                     color: 'var(--brand)' },
  { value: 'perf',      label: 'Meilleures perfs',       Icon: Trophy,    recommended: 4, required: false, desc: 'Plus gros gains · top résultats · max 4 photos',         color: 'var(--brand)' },
  { value: 'eleves',    label: 'Transformations élèves', Icon: Users,     recommended: 1, required: false, desc: 'Avant/après · avec accord de l\'élève',                 color: 'var(--brand)', unlimited: true },
]
const TOTAL_RECOMMENDED = PROOF_CATS.reduce((s, c) => s + c.recommended, 0)

function getColor(s: string) {
  const palette = ['var(--brand)','var(--brand)','var(--brand)','var(--error)','var(--brand)','var(--brand)']
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

const VARIANT_COLORS: Record<string, string> = {
  'MTT':      'var(--brand)',
  'Cash':     'var(--gain)',
  'Live':     'var(--brand)',
  'Expresso': 'var(--error)',
  'Mental':   'var(--brand)',
}

function getBannerColor(variants: string[], fallback: string) {
  for (const v of variants) {
    if (VARIANT_COLORS[v]) return VARIANT_COLORS[v]
  }
  return fallback
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function CoachProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, refreshProfile } = useUser()
  const avatarRef     = useRef<HTMLInputElement>(null)
  const proofFileRef  = useRef<HTMLInputElement>(null)

  /* ── Profile fields ── */
  const [username,     setUsername]     = useState('')
  const [usernameErr,  setUsernameErr]  = useState('')
  const [bio,          setBio]          = useState('')
  const [vision,       setVision]       = useState('')
  const [yearsExp,     setYearsExp]     = useState(3)
  const [isPro,        setIsPro]        = useState<boolean | null>(null)
  const [rooms,        setRooms]        = useState<string[]>([])
  const [variants,     setVariants]     = useState<string[]>([])
  const [advantages,   setAdvantages]   = useState<string[]>([])
  const [targetPlayers, setTargetPlayers] = useState<string[]>([])
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null)
  const [hourlyRate,   setHourlyRate]   = useState<number | null>(null)

  /* ── Legal ── */
  const [phone,        setPhone]        = useState('')
  const [addressLine,  setAddressLine]  = useState('')
  const [city,         setCity]         = useState('')
  const [zipCode,      setZipCode]      = useState('')
  const [country,      setCountry]      = useState('France')
  const [isCompany,    setIsCompany]    = useState<boolean | null>(null)
  const [companyName,  setCompanyName]  = useState('')
  const [siret,        setSiret]        = useState('')
  const [vatNumber,    setVatNumber]    = useState('')
  const [legalOpen,    setLegalOpen]    = useState(false)

  /* ── Payment methods ── */
  const [iban,              setIban]              = useState('')
  const [paypalEmail,       setPaypalEmail]       = useState('')
  const [stripeEmail,       setStripeEmail]       = useState('')
  const [revolut,           setRevolut]           = useState('')
  const [paymentNotes,      setPaymentNotes]      = useState('')
  const [preferredPayment,  setPreferredPayment]  = useState<string | null>(null)

  /* ── Proofs ── */
  const [proofs,          setProofs]          = useState<any[]>([])
  const [uploading,       setUploading]       = useState(false)
  const [showModal,       setShowModal]       = useState(false)
  const [pendingCategory, setPendingCategory] = useState('stats')

  /* ── Stats ── */
  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating,   setAvgRating]   = useState<number | null>(null)
  const [formCount,   setFormCount]   = useState(0)

  /* ── Save state ── */
  const [saveStatus,      setSaveStatus]      = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError,     setAvatarError]     = useState('')
  const hasLoaded      = useRef(false)
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveProfileRef = useRef<() => Promise<void>>(async () => {})
  const savingRef      = useRef(false)  // save en cours — évite 2 updates concurrents
  const pendingRef     = useRef(false)  // modifs arrivées pendant un save → re-save à la fin
  const [cropFile,        setCropFile]        = useState<File | null>(null)
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [{ data: p }, { data: pr }, { data: r }, { data: f }, pay] = await Promise.all([
        fetchOwnProfile(supabase, user.id),
        supabase.from('coach_proofs').select('*').eq('coach_id', user.id).order('order_index'),
        supabase.from('reviews').select('rating').eq('coach_id', user.id),
        supabase.from('formations').select('id').eq('coach_id', user.id).eq('published', true),
        // Coordonnées de paiement : chiffrées en base, déchiffrées côté serveur (audit item 41)
        fetch('/api/coach/payment-info')
          .then(res => (res.ok ? (res.json() as Promise<Record<string, string | null>>) : null))
          .catch(() => null),
      ])
      if (p) {
        setUsername(p.username ?? '')
        setBio(p.bio ?? '')
        setVision(p.vision ?? '')
        setYearsExp(p.years_experience ?? 3)
        setIsPro(p.is_pro ?? null)
        setRooms(p.rooms ?? [])
        setVariants(p.variants ?? [])
        setAdvantages(p.advantages ?? [])
        setTargetPlayers(p.target_players ?? [])
        setAvatarUrl(p.avatar_url ?? null)
        setHourlyRate(p.hourly_rate ?? null)
        setPhone(p.phone ?? '')
        setAddressLine(p.address_line ?? '')
        setCity(p.city ?? '')
        setZipCode(p.zip_code ?? '')
        setCountry(p.country ?? 'France')
        setIsCompany(p.is_company ?? null)
        setCompanyName(p.company_name ?? '')
        setSiret(p.siret ?? '')
        setVatNumber(p.vat_number ?? '')
      }
      if (pay) {
        setIban(pay.iban ?? '')
        setPaypalEmail(pay.paypal_email ?? '')
        setStripeEmail(pay.stripe_account ?? '')
        setRevolut(pay.revolut_tag ?? '')
        setPaymentNotes(pay.payment_notes ?? '')
        setPreferredPayment(pay.preferred_payment ?? null)
      }
      setProofs(pr ?? [])
      setReviewCount(r?.length ?? 0)
      if (r && r.length > 0) setAvgRating(r.reduce((a: number, x: any) => a + x.rating, 0) / r.length)
      setFormCount(f?.length ?? 0)
      setLoading(false)
      hasLoaded.current = true
    })()
  }, [user, supabase])

  const saveProfile = async () => {
    if (!user) return
    if (savingRef.current) { pendingRef.current = true; return }
    savingRef.current = true
    setUsernameErr('')
    setSaveStatus('saving')
    /* Les coordonnées de paiement ne partent plus dans le .update() direct :
       elles passent par l'API serveur qui les chiffre (AES-256-GCM) — audit item 41 */
    const [{ error }, paymentError] = await Promise.all([
      supabase.from('profiles').update({
        username:          username || null,
        bio:               bio || null,
        vision:            vision || null,
        years_experience:  yearsExp,
        is_pro:            isPro,
        rooms, variants, advantages,
        target_players:    targetPlayers,
        phone:             phone || null,
        address_line:      addressLine || null,
        city:              city || null,
        zip_code:          zipCode || null,
        country,
        is_company:        isCompany,
        company_name:      companyName || null,
        siret:             siret || null,
        vat_number:        vatNumber || null,
      }).eq('id', user.id),
      fetch('/api/coach/payment-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iban:              iban || null,
          paypal_email:      paypalEmail || null,
          stripe_account:    stripeEmail || null,
          revolut_tag:       revolut || null,
          payment_notes:     paymentNotes || null,
          preferred_payment: preferredPayment || null,
        }),
      })
        .then(res => (res.ok ? null : `payment-info HTTP ${res.status}`))
        .catch((err: unknown) => (err instanceof Error ? err.message : 'payment-info network error')),
    ])
    savingRef.current = false
    // Le pseudo dupliqué s'affiche tout de suite, même si un re-save part derrière
    const isDuplicateUsername = error?.message?.includes('unique') || error?.message?.includes('duplicate')
    if (isDuplicateUsername) setUsernameErr('Ce pseudo est déjà pris')
    if (pendingRef.current) {
      // Des champs ont changé pendant le save : on repart avec les valeurs fraîches
      pendingRef.current = false
      return saveProfileRef.current()
    }
    if (isDuplicateUsername) {
      setSaveStatus('idle')
      return
    }
    if (error || paymentError) {
      console.error('[coach/profile] autosave failed:', error?.message ?? paymentError)
      setSaveStatus('dirty') // le badge reste "modifications non enregistrées"
      return
    }
    await refreshProfile()
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2500)
  }

  saveProfileRef.current = saveProfile

  useEffect(() => {
    if (!hasLoaded.current) return
    setSaveStatus('dirty')
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => { saveProfileRef.current() }, 1500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, bio, vision, yearsExp, isPro, rooms, variants, advantages, targetPlayers, phone, addressLine, city, zipCode, country, isCompany, companyName, siret, vatNumber, iban, paypalEmail, stripeEmail, revolut, paymentNotes, preferredPayment])

  /* ── Avatar (crop then upload via server route — bypasses RLS) ── */
  const uploadCroppedAvatar = async (blob: Blob) => {
    if (!user) return
    setAvatarUploading(true)
    setAvatarError('')
    setCropFile(null)
    try {
      const form = new FormData()
      form.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setAvatarUrl(json.url)
      await refreshProfile()
    } catch (err: any) {
      setAvatarError(err.message ?? 'Erreur upload')
      console.error('uploadCroppedAvatar:', err)
    } finally {
      setAvatarUploading(false)
    }
  }

  /* ── Proof upload (per-category) ── */
  const uploadProofWithCategory = async (file: File, category: string) => {
    if (!user) return
    setUploading(true)
    const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('coach-proofs').upload(path, file, { contentType: file.type })
    if (!error) {
      const { data: urlData } = supabase.storage.from('coach-proofs').getPublicUrl(path)
      const { data: inserted } = await supabase.from('coach_proofs').insert({
        coach_id: user.id, url: urlData.publicUrl,
        caption: '', category, order_index: proofs.length,
        validation_status: 'pending',
      }).select().single()
      if (inserted) setProofs(prev => [...prev, inserted])
    }
    setUploading(false)
  }

  const updateProof = async (id: string, changes: Partial<Proof>) => {
    setProofs(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    await supabase.from('coach_proofs').update(changes).eq('id', id)
  }

  const deleteProof = async (id: string, url: string) => {
    const parts = url.split('/coach-proofs/')
    if (parts[1]) await supabase.storage.from('coach-proofs').remove([decodeURIComponent(parts[1].split('?')[0])])
    await supabase.from('coach_proofs').delete().eq('id', id)
    setProofs(prev => prev.filter(p => p.id !== id))
  }

  const toggleRoom         = (r: string) => setRooms(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  const toggleTargetPlayer = (id: string) => setTargetPlayers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAdvantage = (id: string) => setAdvantages(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleVariant   = (id: string) => setVariants(prev => {
    if (prev.includes(id)) return prev.filter(x => x !== id)
    if (prev.length >= 3) return prev
    return [...prev, id]
  })

  const proofsByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {}
    PROOF_CATS.forEach(c => { groups[c.value] = [] })
    proofs.forEach(p => {
      const cat = p.category || 'longterme'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    })
    return groups
  }, [proofs])

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  const color    = getColor(username || 'Coach')
  const initials = (username || 'C').slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .cprof-container { padding: 24px 16px 80px !important; }
          .cprof-variants { grid-template-columns: 1fr 1fr !important; }
          .cprof-cat-header { flex-wrap: wrap !important; }
        }
        @media (max-width: 560px) {
          .cprof-kpis { grid-template-columns: 1fr !important; }
          .cprof-targets { grid-template-columns: 1fr !important; }
          .cprof-advantages { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="cprof-container" style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '40px 32px 100px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 600, color: CREAM, letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--font-syne,sans-serif)' }}>Mon profil</h1>
            <p style={{ fontSize: 13, color: SILVER, marginTop: 4 }}>Ta carte de visite publique — soigne-la.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveStatus === 'dirty' && (
              <span style={{ fontSize: 12, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
                Non sauvegardé
              </span>
            )}
            {saveStatus === 'saving' && (
              <span style={{ fontSize: 12, color: SILVER, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 11, height: 11, border: `1.5px solid color-mix(in srgb, var(--text) 25%, transparent)`, borderTopColor: SILVER, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                Sauvegarde…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span style={{ fontSize: 12, color: 'var(--gain)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Check size={12} color="var(--gain)" /> Sauvegardé
              </span>
            )}
            <Link href={`/coaches/${user?.id}`} target="_blank"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: `1px solid ${BORDER}`, color: SILVER, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              <ExternalLink size={12} /> Voir ma page
            </Link>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="cprof-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Note',       value: avgRating ? avgRating.toFixed(1) : '—', sub: `${reviewCount} avis`,                        icon: Star },
            { label: 'Formations', value: formCount,                               sub: 'publiées',                                    icon: BookOpen },
            { label: 'Preuves',    value: proofs.length,                           sub: `/${TOTAL_RECOMMENDED} recommandées`,          icon: ImageIcon },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: SILVER, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                <Icon size={11} /> {label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, color: CREAM, letterSpacing: '-1px', lineHeight: 1, marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: 11, color: SILVER }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ══ SECTION 1 — CARTE PUBLIQUE ══ */}
        <Section title="Carte publique" subtitle="Aperçu de ta carte dans la marketplace · clique sur la photo pour la modifier">
          {(() => {
            const bannerColor = getBannerColor(variants, color)
            const variantColor = (v: string) => VARIANT_COLORS[v] ?? color
            return (
              <div style={{ position: 'relative', background: 'color-mix(in srgb, var(--brand) 3%, transparent)', border: `1px solid color-mix(in srgb, var(--brand) 9%, transparent)`, borderRadius: 18, boxShadow: 'var(--shadow-float)' }}>

                {/* hidden file input */}
                <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }} />

                {/* Banner — overflow hidden scoped here only */}
                <div style={{ height: 100, borderRadius: '18px 18px 0 0', overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, color-mix(in srgb, ${bannerColor} 33%, transparent) 0%, color-mix(in srgb, ${bannerColor} 13%, transparent) 50%, color-mix(in srgb, var(--bg) 60%, transparent) 100%)` }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, color-mix(in srgb, var(--bg) 55%, transparent) 100%)' }} />
                  {/* Rate badge */}
                  {hourlyRate && (
                    <div style={{ position: 'absolute', top: 12, right: 14, background: 'color-mix(in srgb, var(--bg) 72%, transparent)', backdropFilter: 'blur(8px)', border: `1px solid color-mix(in srgb, ${bannerColor} 31%, transparent)`, borderRadius: 10, padding: '5px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: CREAM, lineHeight: 1 }}>{hourlyRate}€</span>
                      <span style={{ fontSize: 9, color: SILVER, marginTop: 1 }}>/ heure</span>
                    </div>
                  )}
                  {isPro && (
                    <div style={{ position: 'absolute', top: 12, left: 14, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: `color-mix(in srgb, ${bannerColor} 15%, transparent)`, color: bannerColor, border: `1px solid color-mix(in srgb, ${bannerColor} 31%, transparent)`, letterSpacing: '0.08em' }}>PRO</div>
                  )}
                </div>

                {/* Avatar — sits on top of everything, no overflow clipping */}
                <div
                  onClick={() => avatarRef.current?.click()}
                  title="Cliquer pour changer la photo"
                  style={{ position: 'absolute', top: 72, left: 18, zIndex: 10, width: 56, height: 56, borderRadius: '50%', border: `3px solid var(--bg)`, overflow: 'hidden', cursor: 'pointer', background: avatarUrl ? 'transparent' : `transparent`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--text)', boxShadow: 'none' }}>
                  {avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials}
                  {/* Hover overlay */}
                  <div className="avatar-hover-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: avatarUploading ? 1 : 0, transition: 'opacity 0.18s' }}>
                    {avatarUploading
                      ? <div style={{ width: 16, height: 16, border: '2px solid color-mix(in srgb, var(--overlay) 25%, transparent)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <><Camera size={14} color="#fff" /><span style={{ fontSize: 7, color: 'var(--text)', fontWeight: 700, letterSpacing: '0.04em' }}>Changer</span></>}
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '38px 18px 18px', borderRadius: '0 0 18px 18px' }}>
                  {avatarError && <p style={{ fontSize: 10, color: 'var(--error)', margin: '0 0 8px' }}>{avatarError}</p>}

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: CREAM, fontFamily: 'var(--font-syne,sans-serif)', letterSpacing: '-0.3px' }}>{username || 'Mon pseudo'}</div>
                      {avgRating ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          {[1,2,3,4,5].map(s => <Star key={s} size={9} fill={s <= Math.round(avgRating) ? 'var(--brand)' : 'none'} color={s <= Math.round(avgRating) ? 'var(--brand)' : 'var(--text-3)'} />)}
                          <span style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                          <span style={{ fontSize: 10, color: SILVER }}>({reviewCount})</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: SILVER, marginTop: 3 }}>Aucun avis encore</div>
                      )}
                    </div>
                    {yearsExp > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{yearsExp}</div>
                        <div style={{ fontSize: 9, color: SILVER }}>an{yearsExp > 1 ? 's' : ''} exp.</div>
                      </div>
                    )}
                  </div>

                  {(vision || bio) && (
                    <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.55, margin: '8px 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {vision || bio}
                    </p>
                  )}

                  {variants.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                      {variants.map(v => {
                        const vc = variantColor(v)
                        return <span key={v} style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: `color-mix(in srgb, ${vc} 9%, transparent)`, color: vc, border: `1px solid color-mix(in srgb, ${vc} 25%, transparent)`, letterSpacing: '0.04em' }}>{v}</span>
                      })}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid color-mix(in srgb, var(--brand) 6%, transparent)', paddingTop: 12, display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: CREAM }}>{formCount}</div>
                      <div style={{ fontSize: 9, color: SILVER }}>formation{formCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ width: 1, background: 'color-mix(in srgb, var(--brand) 6%, transparent)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: CREAM }}>{reviewCount}</div>
                      <div style={{ fontSize: 9, color: SILVER }}>avis</div>
                    </div>
                    {isPro && (
                      <>
                        <div style={{ width: 1, background: 'color-mix(in srgb, var(--brand) 6%, transparent)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: bannerColor }}>PRO</div>
                          <div style={{ fontSize: 9, color: SILVER }}>vérifié</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </Section>

        {/* ══ SECTION 2 — IDENTITÉ ══ */}
        <Section title="Identité" subtitle="Bio et présentation affichées sur ta page publique">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Pseudo éditable */}
            <Field label="Pseudo">
              <div style={{ position: 'relative' }}>
                <input
                  value={username}
                  onChange={e => { setUsername(e.target.value); setUsernameErr('') }}
                  placeholder="ton-pseudo"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, var(--brand) 50%, transparent)`)}
                  onBlur={e =>  (e.currentTarget.style.borderColor = BORDER)}
                />
                <Edit2 size={13} color={SILVER} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
              {usernameErr && <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}>{usernameErr}</p>}
            </Field>

            <Field label="Bio">
              <textarea value={bio} onChange={e => { setBio(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                placeholder="Décris ton parcours, tes spécialités, ce qui te distingue…"
                rows={4} style={{ ...textareaStyle, resize: 'none', overflow: 'hidden' }}
                onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, var(--brand) 50%, transparent)`)}
                onBlur={e =>  (e.currentTarget.style.borderColor = BORDER)} />
            </Field>

            <Field label="Phrase d'accroche">
              <textarea value={vision} onChange={e => { setVision(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                placeholder="Ex : Je t'aide à passer de récréationnel à gagnant régulier en 90 jours."
                rows={3} style={{ ...textareaStyle, resize: 'none', overflow: 'hidden' }}
                onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, var(--brand) 50%, transparent)`)}
                onBlur={e =>  (e.currentTarget.style.borderColor = BORDER)} />
            </Field>

            <div className="cprof-targets" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Expérience">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Stepper onClick={() => setYearsExp(y => Math.max(0, y - 1))}><Minus size={14} /></Stepper>
                  <span style={{ fontSize: 28, fontWeight: 600, color: CREAM, minWidth: 36, textAlign: 'center' }}>{yearsExp}</span>
                  <Stepper onClick={() => setYearsExp(y => y + 1)}><Plus size={14} /></Stepper>
                  <span style={{ fontSize: 13, color: SILVER }}>an{yearsExp > 1 ? 's' : ''}</span>
                </div>
              </Field>
              <Field label="Statut">
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  {[{ v: true, l: 'Professionnel' }, { v: false, l: 'Amateur' }].map(({ v, l }) => (
                    <button key={String(v)} onClick={() => setIsPro(v)}
                      style={{ padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${isPro === v ? VIOLET : BORDER}`, background: isPro === v ? `color-mix(in srgb, var(--brand) 14%, transparent)` : CARD, color: isPro === v ? CREAM : SILVER, fontSize: 13, fontWeight: isPro === v ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </Section>

        {/* ══ SECTION 3 — SPÉCIALITÉS ══ */}
        <Section title="Spécialités" subtitle="Sélectionne jusqu'à 3 variantes, et tes salles">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label={`Variantes (${variants.length}/3)`}>
              <div className="cprof-variants" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {VARIANTS.map(v => {
                  const sel = variants.includes(v.id)
                  const disabled = !sel && variants.length >= 3
                  return (
                    <button key={v.id} onClick={() => !disabled && toggleVariant(v.id)}
                      style={{ padding: '10px 8px', borderRadius: 10, border: `1.5px solid ${sel ? VIOLET : BORDER}`, background: sel ? `color-mix(in srgb, var(--brand) 14%, transparent)` : CARD, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'all 0.15s', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: sel ? CREAM : SILVER }}>{v.id}</div>
                      <div style={{ fontSize: 10, color: SILVER, marginTop: 2 }}>{v.desc}</div>
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="Salles de poker">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROOMS.map(r => {
                  const sel = rooms.includes(r)
                  return (
                    <button key={r} onClick={() => toggleRoom(r)}
                      style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: sel ? `color-mix(in srgb, var(--brand) 18%, transparent)` : CARD, border: `1px solid ${sel ? 'color-mix(in srgb, var(--brand) 50%, transparent)' : BORDER}`, color: sel ? 'var(--brand)' : SILVER }}>
                      {r}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Profil des joueurs ciblés">
              <div className="cprof-targets" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {TARGET_PLAYERS.map(({ id, label, sub, Icon, color }) => {
                  const sel = targetPlayers.includes(id)
                  return (
                    <button key={id} onClick={() => toggleTargetPlayer(id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${sel ? `color-mix(in srgb, ${color} 33%, transparent)` : BORDER}`, background: sel ? `color-mix(in srgb, ${color} 7%, transparent)` : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${sel ? `color-mix(in srgb, ${color} 31%, transparent)` : BORDER}`, background: sel ? `color-mix(in srgb, ${color} 9%, transparent)` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} color={sel ? color : SILVER} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: sel ? CREAM : SILVER }}>{label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>
        </Section>

        {/* ══ SECTION 4 — AVANTAGES ══ */}
        <Section title="Ce que tu proposes" subtitle="Sélectionne tout ce qui correspond à ton coaching">
          <div className="cprof-advantages" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {ADVANTAGES.map(({ id, label, Icon }) => {
              const sel = advantages.includes(id)
              return (
                <button key={id} onClick={() => toggleAdvantage(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${sel ? VIOLET : BORDER}`, background: sel ? `color-mix(in srgb, var(--brand) 10%, transparent)` : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${sel ? VIOLET : BORDER}`, background: sel ? `color-mix(in srgb, var(--brand) 15%, transparent)` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={sel ? 'var(--brand)' : SILVER} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? CREAM : SILVER }}>{label}</span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* ══ SECTION 6 — PREUVES (par catégorie) ══ */}
        <Section
          title="Preuves & résultats"
          subtitle="SharkScope, classements, résultats élèves — classés par catégorie"
          action={proofs.length > 0 ? (
            <button onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: CARD, border: `1px solid ${BORDER}`, color: SILVER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Eye size={12} /> Prévisualiser
            </button>
          ) : null}
        >
          {/* Hidden file input shared by all categories */}
          <input ref={proofFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={async e => {
              for (const f of Array.from(e.target.files ?? [])) await uploadProofWithCategory(f, pendingCategory)
              e.target.value = ''
            }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PROOF_CATS.map(cat => {
              const catProofs = proofsByCategory[cat.value] ?? []
              const done = catProofs.length >= cat.recommended
              return (
                <div key={cat.value}>
                  {/* Category header */}
                  <div className="cprof-cat-header" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 14px', background: cat.required ? `color-mix(in srgb, ${cat.color} 7%, transparent)` : `color-mix(in srgb, ${cat.color} 3%, transparent)`, border: `1px solid ${cat.required ? `color-mix(in srgb, ${cat.color} 21%, transparent)` : `color-mix(in srgb, ${cat.color} 13%, transparent)`}`, borderRadius: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${cat.color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${cat.color} 19%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <cat.Icon size={14} color={cat.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{cat.label}</span>
                        {cat.required && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: `color-mix(in srgb, ${cat.color} 13%, transparent)`, color: cat.color, border: `1px solid color-mix(in srgb, ${cat.color} 25%, transparent)`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Obligatoire
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: SILVER }}>{cat.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: done ? 'var(--gain)' : SILVER }}>
                        {cat.unlimited
                          ? `${catProofs.length} photo${catProofs.length !== 1 ? 's' : ''} · illimité`
                          : `${catProofs.length}/${cat.recommended} photo${cat.recommended > 1 ? 's' : ''}`}
                      </span>
                      {done && <Check size={12} color="var(--gain)" />}
                      <button
                        onClick={() => { setPendingCategory(cat.value); proofFileRef.current?.click() }}
                        disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid color-mix(in srgb, ${cat.color} 25%, transparent)`, background: `color-mix(in srgb, ${cat.color} 6%, transparent)`, color: cat.color, fontSize: 11, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer' }}>
                        {uploading && pendingCategory === cat.value
                          ? <div style={{ width: 10, height: 10, border: `1.5px solid color-mix(in srgb, ${cat.color} 19%, transparent)`, borderTopColor: cat.color, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          : <Upload size={11} />}
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Photos grid */}
                  {catProofs.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {catProofs.map((proof: any) => {
                        const vs = proof.validation_status ?? 'pending'
                        const vsConfig = vs === 'approved'
                          ? { label: 'Validé',          color: 'var(--gain)', bg: 'color-mix(in srgb, var(--gain) 12%, transparent)', Icon: ShieldCheck }
                          : vs === 'rejected'
                          ? { label: 'Refusé',          color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 12%, transparent)',  Icon: AlertCircle }
                          : { label: 'En vérification', color: 'var(--brand)', bg: 'color-mix(in srgb, var(--brand) 12%, transparent)', Icon: Clock }
                        return (
                          <div key={proof.id} style={{ background: CARD, border: `1px solid ${vs === 'rejected' ? 'color-mix(in srgb, var(--error) 25%, transparent)' : BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg)' }}>
                              <img src={proof.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: vs === 'rejected' ? 0.5 : 1 }} />
                              <button onClick={() => deleteProof(proof.id, proof.url)}
                                style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={10} color="var(--error)" />
                              </button>
                              {/* Validation badge */}
                              <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, background: vsConfig.bg, backdropFilter: 'blur(4px)', border: `1px solid color-mix(in srgb, ${vsConfig.color} 19%, transparent)` }}>
                                <vsConfig.Icon size={9} color={vsConfig.color} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: vsConfig.color }}>{vsConfig.label}</span>
                              </div>
                            </div>
                            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {vs === 'rejected' && proof.rejection_reason && (
                                <p style={{ fontSize: 10, color: 'var(--error)', margin: 0, lineHeight: 1.4 }}>↳ {proof.rejection_reason}</p>
                              )}
                              <SelectInput value={proof.category} onChange={v => updateProof(proof.id, { category: v })}
                                options={PROOF_CATS.map(c => ({ value: c.value, label: c.label }))}
                                selectStyle={{ fontSize: 10, padding: '4px 24px 4px 8px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6 }} />
                              <input type="text" value={proof.caption ?? ''} onChange={e => updateProof(proof.id, { caption: e.target.value })}
                                placeholder="Légende (optionnel)"
                                style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', color: CREAM, fontSize: 10, outline: 'none', fontFamily: 'inherit' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ border: `1px dashed ${cat.required ? `color-mix(in srgb, ${cat.color} 19%, transparent)` : 'color-mix(in srgb, var(--brand) 6%, transparent)'}`, borderRadius: 10, padding: '20px', textAlign: 'center', background: cat.required ? `color-mix(in srgb, ${cat.color} 2%, transparent)` : 'transparent' }}>
                      <p style={{ fontSize: 12, color: cat.required ? 'var(--text-2)' : 'var(--text-3)', margin: 0 }}>
                        {cat.required ? '⚠ Obligatoire — ' : 'Aucune photo — '}{cat.desc}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        {/* ══ SECTION 7 — LÉGAL + PAIEMENTS (collapsible) ══ */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, marginBottom: 20, overflow: 'hidden' }}>
          <button onClick={() => setLegalOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', background: 'transparent', border: 'none', cursor: 'pointer', color: CREAM }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CREAM, letterSpacing: '0.02em' }}>Informations légales & paiements</div>
              <div style={{ fontSize: 11, color: SILVER, marginTop: 2 }}>Privé — jamais visible des élèves · Requis pour recevoir des paiements</div>
            </div>
            {legalOpen ? <ChevronUp size={16} color={SILVER} /> : <ChevronDown size={16} color={SILVER} />}
          </button>

          {legalOpen && (
            <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ height: 1, background: BORDER, marginBottom: 4 }} />

              {/* Coordonnées */}
              <div>
                <label style={{ ...labelStyle, fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 12 }}>COORDONNÉES</label>
                <div className="cprof-targets" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Téléphone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" type="tel" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Pays</label>
                    <SelectInput value={country} onChange={setCountry}
                      options={['France','Belgique','Suisse','Canada','Luxembourg','Autre'].map(c => ({ value: c, label: c }))} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Adresse</label>
                    <input value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="12 rue de la Paix" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Code postal</label>
                    <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="75001" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ville</label>
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Statut légal */}
              <div>
                <label style={labelStyle}>Statut légal</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ v: false, l: 'Particulier / Auto-entrepreneur' }, { v: true, l: 'Entreprise (SARL, SAS…)' }].map(({ v, l }) => (
                    <button key={String(v)} onClick={() => setIsCompany(v)}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${isCompany === v ? VIOLET : BORDER}`, background: isCompany === v ? `color-mix(in srgb, var(--brand) 12%, transparent)` : CARD, color: isCompany === v ? CREAM : SILVER, fontSize: 13, fontWeight: isCompany === v ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {isCompany && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'color-mix(in srgb, var(--brand) 2%, transparent)', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
                  {[
                    { label: 'Raison sociale',       value: companyName, set: setCompanyName, placeholder: 'Ma Société SAS' },
                    { label: 'Numéro SIRET',          value: siret,       set: setSiret,       placeholder: '123 456 789 00012' },
                    { label: 'N° TVA (si applicable)', value: vatNumber,   set: setVatNumber,   placeholder: 'FR12345678901' },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label style={labelStyle}>{label}</label>
                      <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={inputStyle} />
                    </div>
                  ))}
                </div>
              )}

              {/* ── Moyens de paiement ── */}
              <div>
                <label style={{ ...labelStyle, fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 4 }}>MOYENS DE PAIEMENT</label>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14, marginTop: 2 }}>
                  Renseigne au moins un moyen — utilisé par la plateforme pour te verser tes revenus.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {([
                    { id: 'iban',    Icon: Landmark,   label: 'IBAN / Virement bancaire', value: iban,        set: setIban,        placeholder: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX', type: 'text',  color: 'var(--gain)' },
                    { id: 'paypal',  Icon: CreditCard, label: 'PayPal',                   value: paypalEmail, set: setPaypalEmail, placeholder: 'email@paypal.com',                  type: 'email', color: 'var(--brand)' },
                    { id: 'stripe',  Icon: Zap,        label: 'Stripe',                   value: stripeEmail, set: setStripeEmail, placeholder: 'Email ou lien Stripe Connect',       type: 'text',  color: 'var(--brand)' },
                    { id: 'revolut', Icon: Smartphone, label: 'Revolut',                  value: revolut,     set: setRevolut,     placeholder: '@ton-pseudo Revolut',              type: 'text',  color: 'var(--error)' },
                  ] as const).map(({ id, Icon, label, value, set, placeholder, type, color }) => {
                    const isPref = preferredPayment === id
                    return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: isPref ? `color-mix(in srgb, ${color} 2%, transparent)` : 'color-mix(in srgb, var(--brand) 2%, transparent)', border: `1px solid ${isPref ? `color-mix(in srgb, ${color} 27%, transparent)` : value ? `color-mix(in srgb, ${color} 15%, transparent)` : BORDER}`, borderRadius: 12, transition: 'all 0.2s' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: value ? `color-mix(in srgb, ${color} 8%, transparent)` : CARD, border: `1px solid ${value ? `color-mix(in srgb, ${color} 21%, transparent)` : BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        <Icon size={15} color={value ? color : SILVER} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <label style={{ ...labelStyle, fontSize: 10, textTransform: 'none', letterSpacing: 0, marginBottom: 0 }}>{label}</label>
                          {isPref && (
                            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 99, background: `color-mix(in srgb, ${color} 13%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
                              PRÉFÉRÉ
                            </span>
                          )}
                        </div>
                        <input
                          type={type}
                          value={value}
                          onChange={e => (set as (v: string) => void)(e.target.value)}
                          placeholder={placeholder}
                          style={{ ...inputStyle, padding: '7px 11px', fontSize: 12 }}
                          onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 38%, transparent)`)}
                          onBlur={e =>  (e.currentTarget.style.borderColor = BORDER)}
                        />
                      </div>
                      <button
                        onClick={() => setPreferredPayment(isPref ? null : id)}
                        title={isPref ? 'Retirer le préféré' : 'Définir comme préféré'}
                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${isPref ? `color-mix(in srgb, ${color} 31%, transparent)` : BORDER}`, background: isPref ? `color-mix(in srgb, ${color} 9%, transparent)` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        <Star size={13} fill={isPref ? color : 'none'} color={isPref ? color : SILVER} />
                      </button>
                    </div>
                    )
                  })}

                  {/* Notes libres */}
                  <div>
                    <label style={labelStyle}>Autre / Notes de paiement</label>
                    <input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="Ex : virement préféré, délai 48h, Wise accepté…"
                      style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom auto-save status ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 40 }}>
          {saveStatus === 'dirty' && (
            <span style={{ fontSize: 12, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
              Sauvegarde dans 1 s…
            </span>
          )}
          {saveStatus === 'saving' && (
            <span style={{ fontSize: 12, color: SILVER, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 11, height: 11, border: `1.5px solid color-mix(in srgb, var(--text) 25%, transparent)`, borderTopColor: SILVER, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Sauvegarde…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: 12, color: 'var(--gain)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={12} color="var(--gain)" /> Tout est sauvegardé
            </span>
          )}
        </div>
      </div>

      {showModal && <ProofGalleryModal proofs={proofs} coachName={username} onClose={() => setShowModal(false)} />}
      {cropFile && <AvatarCropModal file={cropFile} onConfirm={uploadCroppedAvatar} onClose={() => setCropFile(null)} />}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        div:hover > .avatar-hover-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   AVATAR CROP MODAL
═══════════════════════════════════════════════════════════ */
function AvatarCropModal({ file, onConfirm, onClose }: {
  file: File
  onConfirm: (blob: Blob) => void
  onClose: () => void
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [img, setImg]       = useState<HTMLImageElement | null>(null)
  const [scale, setScale]   = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef     = useRef({ active: false, lastX: 0, lastY: 0 })
  const fitScaleRef = useRef(0.1)   // dynamic min — updated when image loads
  const [fitScale, setFitScale] = useState(0.1)
  const SIZE = 280

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const fit = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight)
      fitScaleRef.current = fit
      setFitScale(fit)
      setScale(fit)
      setOffset({ x: 0, y: 0 })
      setImg(image)
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setScale(s => Math.min(8, Math.max(fitScaleRef.current, s + e.deltaY * -0.003)))
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !img) return
    const ctx = canvasRef.current.getContext('2d')!
    ctx.clearRect(0, 0, SIZE, SIZE)

    ctx.fillStyle = 'var(--bg)'
    ctx.fillRect(0, 0, SIZE, SIZE)

    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    const x = SIZE / 2 - w / 2 + offset.x
    const y = SIZE / 2 - h / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)

    // Dark vignette outside circle (destination-out trick)
    ctx.save()
    ctx.fillStyle = 'color-mix(in srgb, var(--bg) 75%, transparent)'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Rule-of-thirds grid inside circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.strokeStyle = 'color-mix(in srgb, var(--overlay) 10%, transparent)'
    ctx.lineWidth = 0.5
    ;[SIZE / 3, 2 * SIZE / 3].forEach(p => {
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, SIZE); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(SIZE, p); ctx.stroke()
    })
    ctx.restore()

    ctx.strokeStyle = 'var(--brand)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
  }, [img, scale, offset])

  // Global drag — tracks mouse even when it leaves the canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return
      setOffset(prev => ({
        x: prev.x + ev.clientX - dragRef.current.lastX,
        y: prev.y + ev.clientY - dragRef.current.lastY,
      }))
      dragRef.current.lastX = ev.clientX
      dragRef.current.lastY = ev.clientY
    }
    const onUp = () => {
      dragRef.current.active = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0]
    dragRef.current = { active: true, lastX: t.clientX, lastY: t.clientY }
  }
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!dragRef.current.active || !e.touches[0]) return
    const t = e.touches[0]
    setOffset(prev => ({ x: prev.x + t.clientX - dragRef.current.lastX, y: prev.y + t.clientY - dragRef.current.lastY }))
    dragRef.current.lastX = t.clientX
    dragRef.current.lastY = t.clientY
  }

  const reset = () => {
    setScale(fitScaleRef.current)
    setOffset({ x: 0, y: 0 })
  }

  const handleConfirm = () => {
    if (!img) return
    const EXPORT = 400
    const out = document.createElement('canvas')
    out.width = EXPORT; out.height = EXPORT
    const ctx = out.getContext('2d')!
    ctx.beginPath()
    ctx.arc(EXPORT / 2, EXPORT / 2, EXPORT / 2, 0, Math.PI * 2)
    ctx.clip()
    const ratio = EXPORT / SIZE
    const w = img.naturalWidth * scale * ratio
    const h = img.naturalHeight * scale * ratio
    const x = EXPORT / 2 - w / 2 + offset.x * ratio
    const y = EXPORT / 2 - h / 2 + offset.y * ratio
    ctx.drawImage(img, x, y, w, h)
    out.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.93)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid color-mix(in srgb, var(--brand) 35%, transparent)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 360, boxShadow: 'var(--shadow-float)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand)', margin: 0 }}>Recadrer la photo</h3>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '4px 0 0' }}>Glisse pour repositionner · Scroll ou slider pour zoomer</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid color-mix(in srgb, var(--brand) 10%, transparent)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="var(--text-3)" />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            width={SIZE} height={SIZE}
            style={{ borderRadius: '50%', cursor: 'grab', userSelect: 'none', touchAction: 'none', boxShadow: 'none' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { dragRef.current.active = false }}
          />
        </div>

        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Minus size={12} color="var(--text-3)" />
          <input type="range" min={Math.round(fitScale * 100)} max="800" value={Math.round(scale * 100)}
            onChange={e => setScale(Number(e.target.value) / 100)}
            style={{ flex: 1, accentColor: 'var(--brand)', cursor: 'pointer', height: 4 }} />
          <Plus size={12} color="var(--text-3)" />
          <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={reset}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--brand) 10%, transparent)', background: 'transparent', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <RotateCcw size={12} /> Réinitialiser
          </button>
          <button onClick={handleConfirm}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: 'none' }}>
            Valider la photo
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */
function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: 'color-mix(in srgb, var(--brand) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 7%, transparent)', borderRadius: 18, padding: '24px 28px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0, marginBottom: subtitle ? 5 : 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  )
}

function Stepper({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid color-mix(in srgb, var(--brand) 10%, transparent)', background: 'color-mix(in srgb, var(--brand) 3%, transparent)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand)'; (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--brand) 15%, transparent)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in srgb, var(--brand) 10%, transparent)'; (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--brand) 3%, transparent)' }}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px',
  background: 'color-mix(in srgb, var(--brand) 3%, transparent)',
  border: '1px solid color-mix(in srgb, var(--brand) 8%, transparent)',
  borderRadius: 10, fontSize: 14, color: 'var(--brand)',
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'color-mix(in srgb, var(--brand) 3%, transparent)',
  border: '1px solid color-mix(in srgb, var(--brand) 8%, transparent)',
  borderRadius: 10, fontSize: 14, color: 'var(--brand)',
  fontFamily: 'inherit', resize: 'vertical', outline: 'none',
  lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-3)',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block', marginBottom: 8,
}
