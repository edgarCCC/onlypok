'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Star, Check } from 'lucide-react'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import ProofGalleryModal from '@/components/ProofGalleryModal'
import type { Proof } from '@/components/ProofGalleryModal'
import VideoStudio from '@/components/VideoStudio'
import { HIGHLIGHTS } from '@/lib/highlights'
import {
  CREAM, SILVER, VARIANT_COLORS, TYPE_COLORS, REVIEW_CATEGORIES, generateSlots,
} from './shared'
import DetailHeader from './DetailHeader'
import FormationHero from './FormationHero'
import { SalesVideoSection } from './VideoPreview'
import ProgramSection from './ProgramSection'
import ScheduleCalendar from './ScheduleCalendar'
import PurchaseSidebar, { CreditConfirmModal } from './PurchaseSidebar'
import ReviewSection, { ReviewModal } from './ReviewSection'
import CoachPresentation from './CoachPresentation'

function HighlightRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      <span style={{ color: CREAM, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: CREAM, margin: '0 0 2px' }}>{title}</p>
        <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function FormationDetailClient({
  formationId,
  initialFormation,
  initialChapters,
  initialReviews,
  initialProofs,
  initialCoCoaches,
  initialHasPurchased,
  initialUserHasReview,
}: {
  formationId: string
  initialFormation: any
  initialChapters: any[]
  initialReviews: any[]
  initialProofs: any[]
  initialCoCoaches: any[]
  initialHasPurchased: boolean
  initialUserHasReview: boolean
}) {
  const id     = formationId
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const paymentJustCompleted = searchParams.get('payment') === 'success'

  /* state — initialized from server-fetched data */
  const [formation, setFormation]       = useState<any>(initialFormation)
  const [chapters,  setChapters]        = useState<any[]>(initialChapters)
  const [hasPurchased, setHasPurchased] = useState(initialHasPurchased || paymentJustCompleted)
  const [reviews, setReviews]           = useState<any[]>(initialReviews)
  const [loading, setLoading]           = useState(false)
  const [selectedPack, setSelectedPack] = useState(() => {
    const p = parseInt(searchParams.get('pack') ?? '0', 10)
    return isNaN(p) ? 0 : p
  })

  /* review modal */
  const [showModal, setShowModal]         = useState(false)
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({})
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [userHasReview, setUserHasReview] = useState(initialUserHasReview)
  const [reviewError, setReviewError]     = useState<string | null>(null)

  /* payment */
  const [paying, setPaying] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingCount,        setPendingCount]        = useState(0)
  const [showCreditConfirm,   setShowCreditConfirm]   = useState(false)
  const [creditConfirmTarget, setCreditConfirmTarget] = useState<'slot'|'later'>('later')

  /* native slot picker */
  const [calSlots,    setCalSlots]    = useState<Date[]>([])
  const [calLoading,  setCalLoading]  = useState(false)
  const today = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calSelDay,  setCalSelDay]  = useState<Date | null>(null)
  const [calSelSlot, setCalSelSlot] = useState<Date | null>(null)

  /* header */
  const [isScrolled, setIsScrolled]             = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [slotPast, setSlotPast] = useState(false)

  /* video preview */
  const [showDescModal,  setShowDescModal]  = useState(false)
  const [proofs,         setProofs]         = useState<Proof[]>(initialProofs)
  const [coCoaches,      setCoCoaches]      = useState<any[]>(initialCoCoaches)
  const [showProofModal, setShowProofModal] = useState(false)
  const [previewEnded, setPreviewEnded] = useState(false)

  /* lesson player */
  const [playingLesson, setPlayingLesson] = useState<{ url: string; type: string; title: string } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlayingLesson(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10)
      if (window.scrollY <= 10) setIsSearchOverlayOpen(false)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = document.getElementById('slot-picker')
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => setSlotPast(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* ─── load coach availabilities for slot picker ─────────────────────────── */
  useEffect(() => {
    const coachId = initialFormation?.coach?.id
    if (!coachId || (initialFormation?.content_type ?? 'formation') !== 'coaching') return
    setCalLoading(true)
    const load = async () => {
      const [{ data: avails }, { data: booked }] = await Promise.all([
        supabase.from('availabilities').select('day_of_week, slot').eq('coach_id', coachId).eq('booked', false),
        supabase.from('bookings').select('scheduled_at').eq('coach_id', coachId).eq('status', 'scheduled').not('scheduled_at', 'is', null),
      ])
      const bookedTs = (booked ?? []).map((b: any) => b.scheduled_at).filter(Boolean)
      setCalSlots(generateSlots(avails ?? [], bookedTs))
      setCalLoading(false)
    }
    load()
  }, [initialFormation?.coach?.id, initialFormation?.content_type, supabase])

  /* ─── pending coaching credits for this coach ─── */
  useEffect(() => {
    if (!user || (initialFormation?.content_type ?? 'formation') !== 'coaching') return
    const coachId = initialFormation?.coach?.id
    if (!coachId) return
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('coach_id', coachId)
      .eq('status', 'paid_pending_schedule')
      .then(({ count }: { count: number | null }) => setPendingCount(count ?? 0))
  }, [user, initialFormation?.coach?.id, initialFormation?.content_type, supabase])

  /* ─── update userHasReview when auth user becomes available ── */
  useEffect(() => {
    if (user && reviews.length > 0) {
      setUserHasReview(reviews.some((rv: any) => rv.student_id === user.id))
    }
  }, [user, reviews])

  /* ─── submit review ────────────────────────────────────────────────────── */
  const submitReview = async () => {
    if (!user) { setReviewError('Vous devez être connecté pour laisser un avis.'); return }
    if (!formation?.coach?.id) { setReviewError('Coach introuvable.'); return }
    const rated = Object.values(reviewRatings)
    if (rated.length < REVIEW_CATEGORIES.length) return
    setSubmitting(true)
    setReviewError(null)
    const overall = Math.round(rated.reduce((a, b) => a + b, 0) / rated.length)
    const { error } = await supabase.from('reviews').insert({
      coach_id:         formation.coach.id,
      student_id:       user.id,
      rating:           overall,
      comment:          reviewComment.trim() || null,
      category_ratings: reviewRatings,
      content_type:     contentType,
    })
    if (error) {
      console.error('[review insert]', error.code, error.message, error.details, error.hint)
      setReviewError(`Erreur : ${error.message}`)
      setSubmitting(false)
      return
    }
    const { data: r, error: rErr } = await supabase
      .from('reviews')
      .select('*, student:profiles!student_id(username, avatar_url, created_at)')
      .eq('coach_id', formation.coach.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (rErr) console.error('[reviews post-submit]', rErr.message)
    setReviews(r ?? [])
    setUserHasReview(true)
    setSubmitting(false)
    setShowModal(false)
    setReviewRatings({})
    setReviewComment('')
  }

  /* ─── guards ───────────────────────────────────────────────────────────── */
  if (loading) return <FourAcesLoader />
  if (!formation) return (
    <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER }}>
      Formation introuvable
    </div>
  )

  /* ─── computed values ──────────────────────────────────────────────────── */
  const contentType  = formation.content_type ?? 'formation'
  const typeColor    = TYPE_COLORS[contentType] ?? '#7c3aed'
  const variantColor = VARIANT_COLORS[formation.variant ?? ''] ?? typeColor
  const allLessons   = chapters.flatMap(c => c.formation_lessons ?? [])
  const freeLessons  = allLessons.filter((l: any) => l.is_free).length
  const packs        = formation.coaching_packs ?? []
  const currentPack  = packs[selectedPack]
  const coach        = formation.coach

  /* Weekend pricing — detected client-side (display only; Stripe re-checks server-side) */
  const isWeekend = (() => { const d = new Date().getDay(); return d === 0 || d === 6 })()
  const weekendPct: number = coach?.weekend_rate_pct ?? 0
  const weekendMultiplier = (contentType === 'coaching' && isWeekend && weekendPct > 0) ? 1 + weekendPct / 100 : 1
  const applyWeekend = (price: number) => weekendMultiplier > 1 ? Math.round(price * weekendMultiplier) : price

  const showBigSearch = !isScrolled || isSearchOverlayOpen

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : null

  const uniqueStudentCount = new Set(reviews.map((r: any) => r.student_id)).size
  const isSuperCoach = uniqueStudentCount >= 50 && avgRating !== null && avgRating >= 4.5

  /* distribution 5→1 for bar chart */
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating) === star).length,
    pct: reviews.length > 0
      ? (reviews.filter(r => Math.round(r.rating) === star).length / reviews.length) * 100
      : 0,
  }))

  /* category averages */
  const categoryAvgs = REVIEW_CATEGORIES.map(cat => {
    const withCat = reviews.filter(r => r.category_ratings?.[cat.key])
    const avg = withCat.length > 0
      ? withCat.reduce((a, r) => a + r.category_ratings[cat.key], 0) / withCat.length
      : avgRating ?? 0
    return { ...cat, avg }
  })

  /* CTA — for coaching, prices live in packs, not formation.price (which is always 0) */
  const coachingPackPrice = currentPack ? Number(currentPack.price) : 0
  const isCoachingPaid = contentType === 'coaching' && packs.some((p: any) => Number(p.price) > 0)
  const effectivePrice = contentType === 'coaching'
    ? coachingPackPrice
    : Number(formation.price)

  const needsSlot = contentType === 'coaching' && !hasPurchased && isCoachingPaid
  const slotLabel = calSelSlot
    ? `${calSelSlot.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${calSelSlot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : null

  const ctaLabel = hasPurchased
    ? contentType === 'coaching' ? 'Voir mes sessions →'
    : contentType === 'video'   ? 'Regarder la vidéo →'
    : 'Continuer la formation →'
    : effectivePrice === 0 ? 'Accéder gratuitement'
    : contentType === 'coaching'
      ? calSelSlot
        ? `Réserver · ${slotLabel} — ${applyWeekend(effectivePrice)}€`
        : 'Sélectionne un créneau ↓'
      : `Acheter — ${effectivePrice}€`

  const ctaDisabled = paying || (needsSlot && !calSelSlot)

  const doStripeCheckout = async (withSlot: boolean) => {
    setPaying(true)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation_id:  id,
          pack_index:    contentType === 'coaching' ? selectedPack : undefined,
          scheduled_at:  withSlot ? (calSelSlot?.toISOString() ?? undefined) : undefined,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setCheckoutError(data.error ?? 'Une erreur est survenue. Réessaie.')
    } catch {
      setCheckoutError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      setPaying(false)
    }
  }

  const handleCTA = async () => {
    if (hasPurchased || effectivePrice === 0) {
      if (contentType === 'coaching') {
        router.push('/schedule')
      } else {
        router.push(`/formations/${id}/learn`)
      }
      return
    }

    if (contentType === 'coaching' && !calSelSlot) {
      const el = document.getElementById('slot-picker')
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 480
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }
      return
    }
    if (!user) { router.push('/login'); return }

    if (contentType === 'coaching' && pendingCount > 0) {
      setCreditConfirmTarget('slot')
      setShowCreditConfirm(true)
      return
    }
    await doStripeCheckout(true)
  }

  const handleBuyLater = async () => {
    if (!user) { router.push('/login'); return }
    if (pendingCount > 0) {
      setCreditConfirmTarget('later')
      setShowCreditConfirm(true)
      return
    }
    await doStripeCheckout(false)
  }

  /* video on sales page */
  const showVideoOnPage = contentType === 'video' && formation.video_url
  const videoType = formation.video_url?.includes('vimeo') ? 'vimeo' : 'youtube'
  const canWatchFull = hasPurchased || effectivePrice === 0

  return (
    <div style={{ minHeight: '100vh', background: '#05070a', color: CREAM,
      paddingTop: showBigSearch ? 200 : 80, transition: 'padding-top 0.4s cubic-bezier(0.4,0,0.2,1)' }}>

      {/* Atmospheric glow + grain */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${typeColor}22 0%, transparent 60%), radial-gradient(ellipse 40% 25% at 80% 60%, ${typeColor}08 0%, transparent 55%)` }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.035,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat', backgroundSize: '200px' }} />

      {/* ══ HEADER ══ */}
      <DetailHeader
        initialContentType={initialFormation?.content_type}
        isScrolled={isScrolled}
        isSearchOverlayOpen={isSearchOverlayOpen}
        setIsSearchOverlayOpen={setIsSearchOverlayOpen}
      />

      {/* ══ LESSON VIDEO MODAL ══ */}
      {playingLesson && (
        <VideoStudio
          video={{ url: playingLesson.url, title: playingLesson.title }}
          onClose={() => setPlayingLesson(null)}
        />
      )}

      {/* ══ PROOF GALLERY MODAL ══ */}
      {showProofModal && (
        <ProofGalleryModal
          proofs={proofs}
          coachName={coach?.username ?? 'Coach'}
          accentColor={typeColor}
          onClose={() => setShowProofModal(false)}
        />
      )}

      {/* ══ REVIEW MODAL ══ */}
      {/* ── Credit confirmation modal ── */}
      {showCreditConfirm && (
        <CreditConfirmModal
          typeColor={typeColor}
          pendingCount={pendingCount}
          onConfirm={async () => { setShowCreditConfirm(false); await doStripeCheckout(creditConfirmTarget === 'slot') }}
          onClose={() => setShowCreditConfirm(false)}
        />
      )}

      {showModal && (
        <ReviewModal
          typeColor={typeColor}
          reviewRatings={reviewRatings}
          setReviewRatings={setReviewRatings}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
          reviewError={reviewError}
          submitting={submitting}
          onClose={() => { setShowModal(false); setReviewError(null) }}
          onSubmit={submitReview}
        />
      )}

      {/* ══ HERO ══ */}
      <FormationHero
        formation={formation}
        contentType={contentType}
        typeColor={typeColor}
        variantColor={variantColor}
        coach={coach}
        proofs={proofs}
        reviews={reviews}
        avgRating={avgRating}
        allLessonsCount={allLessons.length}
        chaptersCount={chapters.length}
        onOpenProofModal={() => setShowProofModal(true)}
      />

      {/* ══ BODY ══ */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto',
        padding: '0 40px 100px', display: 'grid', gridTemplateColumns: '1fr 360px',
        gap: 64, alignItems: 'start' }}>

        {/* ── Colonne gauche ── */}
        <div>

          {/* ── VIDEO PLAYER (content_type === video) ── */}
          {showVideoOnPage && (
            <SalesVideoSection
              videoUrl={formation.video_url}
              videoType={videoType}
              canWatchFull={canWatchFull}
              thumbnailUrl={formation.thumbnail_url}
              typeColor={typeColor}
              previewEnded={previewEnded}
              setPreviewEnded={setPreviewEnded}
              paying={paying}
              ctaLabel={ctaLabel}
              onCTA={handleCTA}
            />
          )}

          {/* ── 1. HIGHLIGHTS — choisis par le coach ── */}
          {(() => {
            const chosen: typeof HIGHLIGHTS = formation.highlights?.length
              ? HIGHLIGHTS.filter(h => (formation.highlights as string[]).includes(h.id))
              : contentType === 'coaching'
                ? HIGHLIGHTS.filter(h => ['replay','cancel','individual'].includes(h.id))
                : contentType === 'video'
                  ? HIGHLIGHTS.filter(h => ['hd','lifetime','refund'].includes(h.id))
                  : HIGHLIGHTS.filter(h => ['structured','lifetime','refund'].includes(h.id))
            return (
              <div style={{ padding: '36px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(chosen.length, 3)}, 1fr)`, gap: 2 }}>
                  {chosen.map((h, i) => (
                    <div key={h.id} style={{
                      display: 'flex', flexDirection: 'column', gap: 14,
                      padding: '24px 22px',
                      background: i === 0 ? `${typeColor}08` : 'transparent',
                      borderRadius: i === 0 ? 14 : 0,
                      border: i === 0 ? `1px solid ${typeColor}18` : 'none',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: i === 0 ? `${typeColor}20` : 'rgba(232,228,220,0.06)',
                        border: `1px solid ${i === 0 ? typeColor + '35' : 'rgba(232,228,220,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: i === 0 ? typeColor : SILVER,
                      }}>
                        <h.Icon size={20} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: '0 0 4px', letterSpacing: '-0.2px' }}>{h.label}</p>
                        <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.45)', margin: 0, lineHeight: 1.55 }}>{h.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── 3. DESCRIPTION ── */}
          {formation.description && (
            <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 18 }}>
                {contentType === 'coaching' ? 'À propos de ce coaching' : 'À propos de cette formation'}
              </h2>
              <p style={{
                fontSize: 15, color: 'rgba(232,228,220,0.65)', lineHeight: 1.8, whiteSpace: 'pre-line',
                display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', margin: '0 0 4px',
              } as React.CSSProperties}>
                {formation.description}
              </p>
              <p style={{ fontSize: 15, color: 'rgba(232,228,220,0.3)', margin: '0 0 22px' }}>…</p>
              <button onClick={() => setShowDescModal(true)}
                style={{ background: 'transparent', border: '1px solid rgba(232,228,220,0.25)', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, color: CREAM, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.45)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.25)' }}>
                Lire la suite
              </button>
              {showDescModal && (
                <div onClick={() => setShowDescModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: '#161920', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid rgba(232,228,220,0.07)' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: CREAM, margin: 0 }}>
                        {contentType === 'coaching' ? 'À propos de ce coaching' : 'À propos de cette formation'}
                      </h3>
                      <button onClick={() => setShowDescModal(false)} style={{ background: 'rgba(232,228,220,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: CREAM, fontSize: 16 }}>×</button>
                    </div>
                    <div style={{ overflowY: 'auto', padding: '20px 22px' }}>
                      <p style={{ fontSize: 14, color: 'rgba(232,228,220,0.7)', lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0 }}>
                        {formation.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── COACH ROW — après description, Airbnb host style ── */}
          {coach && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: CREAM, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                  Par {coach.username}
                </h2>
                <p style={{ fontSize: 13, color: SILVER, margin: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {avgRating !== null && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={12} color="#a855f7" fill="#a855f7" />
                      <span style={{ fontWeight: 600, color: CREAM }}>{avgRating.toFixed(2)}</span>
                      <span>·</span>
                    </span>
                  )}
                  <span>{reviews.length} avis</span>
                  {contentType === 'formation' && allLessons.length > 0 && <><span>·</span><span>{allLessons.length} leçons</span></>}
                  {contentType === 'coaching' && packs.length > 0 && <><span>·</span><span>{packs.length} pack{packs.length > 1 ? 's' : ''}</span></>}
                </p>
              </div>
              <Link href={`/coaches/${coach.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {coach.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={coach.avatar_url} alt={coach.username ?? 'Coach'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (coach.username ?? 'C')[0].toUpperCase()}
                </div>
              </Link>
            </div>
          )}

          {/* ── 4a. PROGRAMME (formation) ── */}
          {contentType === 'formation' && chapters.length > 0 && (
            <ProgramSection
              chapters={chapters}
              typeColor={typeColor}
              hasPurchased={hasPurchased}
              allLessonsCount={allLessons.length}
              freeLessons={freeLessons}
              onPlayLesson={setPlayingLesson}
            />
          )}

          {/* ── 4b. PACKS (coaching) ── */}
          {contentType === 'coaching' && packs.length > 0 && (
            <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0 }}>Packs disponibles</h2>
                {weekendMultiplier > 1 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' }}>
                    Tarif week-end +{weekendPct}%
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(packs.length, 3)}, 1fr)`, gap: 12 }}>
                {packs.map((pack: any, i: number) => {
                  const displayPrice = applyWeekend(pack.price)
                  return (
                    <div key={i} onClick={() => setSelectedPack(i)}
                      style={{ background: selectedPack === i ? `${typeColor}12` : 'rgba(232,228,220,0.03)', border: `1px solid ${selectedPack === i ? typeColor + '50' : 'rgba(232,228,220,0.08)'}`, borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{pack.label}</span>
                        {selectedPack === i && <Check size={14} color={typeColor} />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: selectedPack === i ? typeColor : CREAM }}>{displayPrice}€</span>
                        {weekendMultiplier > 1 && <span style={{ fontSize: 11, color: SILVER, textDecoration: 'line-through' }}>{pack.price}€</span>}
                      </div>
                      <div style={{ fontSize: 11, color: SILVER, marginBottom: 8 }}>{pack.hours}h · {pack.hours > 0 && displayPrice > 0 ? Math.round(displayPrice / pack.hours) + '€/h' : ''}</div>
                      {pack.desc && <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.5, margin: 0 }}>{pack.desc}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 4c. NATIVE SLOT PICKER (coaching) ── */}
          {contentType === 'coaching' && (
            <ScheduleCalendar
              typeColor={typeColor}
              calSlots={calSlots}
              calLoading={calLoading}
              calYear={calYear}
              calMonth={calMonth}
              setCalYear={setCalYear}
              setCalMonth={setCalMonth}
              calSelDay={calSelDay}
              setCalSelDay={setCalSelDay}
              calSelSlot={calSelSlot}
              setCalSelSlot={setCalSelSlot}
            />
          )}

        </div>

        {/* ── Colonne droite sticky ── */}
        <PurchaseSidebar
          formation={formation}
          contentType={contentType}
          typeColor={typeColor}
          packs={packs}
          selectedPack={selectedPack}
          setSelectedPack={setSelectedPack}
          currentPack={currentPack}
          applyWeekend={applyWeekend}
          hasPurchased={hasPurchased}
          paying={paying}
          ctaLabel={ctaLabel}
          ctaDisabled={ctaDisabled}
          onCTA={handleCTA}
          onBuyLater={handleBuyLater}
          checkoutError={checkoutError}
          isCoachingPaid={isCoachingPaid}
          calSelSlot={calSelSlot}
          effectivePrice={effectivePrice}
          allLessonsCount={allLessons.length}
          chaptersCount={chapters.length}
          freeLessons={freeLessons}
        />
      </div>

      {/* ══ REVIEWS — pleine largeur centrée (Image #28) ══ */}
      <ReviewSection
        reviews={reviews}
        avgRating={avgRating}
        distribution={distribution}
        categoryAvgs={categoryAvgs}
        typeColor={typeColor}
        hasPurchased={hasPurchased}
        userHasReview={userHasReview}
        onOpenReviewModal={() => setShowModal(true)}
        contentType={contentType}
        formation={formation}
      />

      {/* ══ COACH PRESENTATION — Faites connaissance ══ */}
      {coach && (
        <CoachPresentation
          coach={coach}
          typeColor={typeColor}
          avgRating={avgRating}
          reviewCount={reviews.length}
          isSuperCoach={isSuperCoach}
          proofs={proofs}
          coCoaches={coCoaches}
          onOpenProofModal={() => setShowProofModal(true)}
        />
      )}

      <style>{`
        @keyframes airbnbPop { from { opacity:0; transform:translateY(-8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes ctaPillIn { from { opacity:0; transform:scale(0.92) translateX(12px); } to { opacity:1; transform:scale(1) translateX(0); } }
      `}</style>
    </div>
  )
}
