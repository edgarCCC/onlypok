'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Star, Clock, BookOpen, ArrowLeft, Calendar,
  CheckCircle, Users, Zap, FileText, Video,
  UserCheck, RefreshCw, MessageSquare, PlayCircle,
  Target, Settings, TrendingUp, ChevronDown,
} from 'lucide-react'
import FourAcesLoader from '@/components/FourAcesLoader'
import { useUser } from '@/hooks/useUser'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.18)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

const VARIANT_COLORS: Record<string, string> = {
  'MTT': '#f59e0b', 'Cash': '#10b981', 'Live': '#06b6d4',
  'Expresso': '#ef4444', 'Mental': '#a78bfa', 'PKO': '#f97316',
}

const ADVANTAGE_LABELS: Record<string, { label: string; Icon: React.ElementType }> = {
  video:      { label: 'Analyse vidéo',          Icon: Video },
  suivi:      { label: 'Suivi personnalisé',      Icon: UserCheck },
  replay:     { label: 'Replay des sessions',     Icon: RefreshCw },
  hbh:        { label: 'Feedback hand by hand',   Icon: MessageSquare },
  ressources: { label: 'Ressources exclusives',   Icon: FileText },
  live:       { label: 'Sessions en direct',      Icon: PlayCircle },
  exercices:  { label: 'Exercices pratiques',     Icon: Target },
  hh:         { label: 'Revue HH post-session',   Icon: BookOpen },
  solver:     { label: 'Travail solver / GTO',    Icon: Settings },
  mental:     { label: 'Mental game & bankroll',  Icon: TrendingUp },
}

const TARGET_LABELS: Record<string, { label: string; sub: string; color: string }> = {
  fish:    { label: 'Débutants',    sub: 'Récréatifs & poissons',      color: '#06b6d4' },
  regular: { label: 'Réguliers',   sub: 'Grinders & gagnants',        color: '#4ade80' },
  semipro: { label: 'Semi-pros',   sub: 'Objectif profit durable',    color: '#f59e0b' },
  shark:   { label: 'Sharks/Pros', sub: 'High-stakes & élite',        color: '#a855f7' },
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 14 14"
          fill={i < Math.round(rating) ? '#f59e0b' : 'rgba(240,244,255,0.12)'}>
          <polygon points="7,1 8.8,5.5 13.5,5.5 9.8,8.5 11.2,13 7,10.2 2.8,13 4.2,8.5 0.5,5.5 5.2,5.5" />
        </svg>
      ))}
    </span>
  )
}

function ContentLink({ f, cardColor, icon }: { f: Formation; cardColor: string; icon: React.ReactNode }) {
  return (
    <Link href={`/formations/${f.id}`} className="coach-formation-link" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px', borderRadius: 12, border: '1px solid rgba(240,244,255,0.07)', background: 'rgba(240,244,255,0.02)', textDecoration: 'none', transition: 'background 0.15s, border-color 0.15s' }}>
      <div style={{ width: 80, height: 52, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: `linear-gradient(135deg, ${cardColor}40, ${cardColor}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {f.thumbnail_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={f.thumbnail_url} alt={f.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: CREAM, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</p>
        <span style={{ fontSize: 12, fontWeight: 700, color: f.price > 0 ? cardColor : '#4ade80' }}>{f.price > 0 ? `${f.price}€` : 'Gratuit'}</span>
      </div>
      <ChevronDown size={14} color={'rgba(240,244,255,0.18)'} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} />
    </Link>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: '20px 24px' }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>{title}</h2>
      {children}
    </div>
  )
}

type Coach = {
  id: string; username: string | null; avatar_url: string | null
  bio: string | null; vision: string | null; variants: string[] | null
  is_pro: boolean | null; years_experience: number | null; hourly_rate: number | null
  coaching_mode: string | null; coaching_packages: { name: string; sessions: number; price: number }[] | null
  weekend_rate_pct: number | null; advantages: string[] | null; target_players: string[] | null
  rooms: string[] | null
}
type Review = { rating: number; comment: string | null; created_at: string; student: { username: string | null; avatar_url: string | null } | null }
type Formation = { id: string; title: string; price: number; content_type: string | null; thumbnail_url: string | null }

export default function CoachProfilePage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useUser()

  const [coach,         setCoach]         = useState<Coach | null>(null)
  const [reviews,       setReviews]       = useState<Review[]>([])
  const [formations,    setFormations]    = useState<Formation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selectedPkgIdx, setSelectedPkgIdx] = useState(0)

  useEffect(() => {
    const id = params.id
    if (!id) return

    Promise.all([
      supabase.from('profiles')
        .select('id, username, avatar_url, bio, vision, variants, is_pro, years_experience, hourly_rate, coaching_mode, coaching_packages, weekend_rate_pct, advantages, target_players, rooms')
        .eq('id', id).eq('role', 'coach').single(),
      supabase.from('reviews')
        .select('rating, comment, created_at, student:profiles!student_id(username, avatar_url)')
        .eq('coach_id', id).order('created_at', { ascending: false }),
      supabase.from('formations')
        .select('id, title, price, content_type, thumbnail_url')
        .eq('coach_id', id).eq('published', true),
    ]).then(([{ data: c }, { data: r }, { data: f }]) => {
      if (!c) { router.push('/404'); return }
      setCoach(c as Coach)
      setReviews((r ?? []) as Review[])
      setFormations((f ?? []) as Formation[])
      setLoading(false)
    })
  }, [params.id, supabase, router])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )
  if (!coach) return null

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
    : null

  const initials  = (coach.username ?? 'C').slice(0, 2).toUpperCase()
  const colorSeed = coach.username ?? 'coach'
  let h = 0; for (let i = 0; i < colorSeed.length; i++) h = colorSeed.charCodeAt(i) + ((h << 5) - h)
  const palette   = ['#7c3aed', '#06b6d4', '#a855f7', '#ef4444', '#8b5cf6', '#ec4899']
  const fallback  = palette[Math.abs(h) % palette.length]
  const variants: string[] = coach.variants ?? []
  const cardColor = variants.map(v => VARIANT_COLORS[v]).find(Boolean) ?? fallback

  const advantages: string[]    = coach.advantages ?? []
  const targetPlayers: string[] = coach.target_players ?? []
  const packages = coach.coaching_packages ?? []

  const nowDay    = new Date().getDay()
  const isWeekend = nowDay === 0 || nowDay === 6
  const weekendPct: number = coach.weekend_rate_pct ?? 0
  const weekendMul = (isWeekend && weekendPct > 0) ? 1 + weekendPct / 100 : 1
  const applyWeekend = (price: number) => weekendMul > 1 ? Math.round(price * weekendMul) : price

  const coachingFormations = formations.filter(f => f.content_type === 'coaching')
  const videoFormations    = formations.filter(f => f.content_type === 'video')
  const pureFormations     = formations.filter(f => f.content_type !== 'coaching' && f.content_type !== 'video')
  const firstCoaching = coachingFormations[0]
  const bookingHref   = firstCoaching ? `/formations/${firstCoaching.id}` : null

  /* Toutes les options proposées : session à l'unité + forfaits */
  type PricingOption = { label: string; detail: string; price: number; packIndex: number | null }
  const pricingOptions: PricingOption[] = []
  if (coach.hourly_rate) {
    pricingOptions.push({
      label: '1 session',
      detail: `${applyWeekend(coach.hourly_rate)}€${weekendPct > 0 && weekendMul === 1 ? ` (+${weekendPct}% week-end)` : ''}`,
      price: applyWeekend(coach.hourly_rate),
      packIndex: null,
    })
  }
  packages.forEach((pkg, i) => {
    pricingOptions.push({
      label: `${pkg.sessions} session${pkg.sessions > 1 ? 's' : ''}${pkg.name ? ` — ${pkg.name}` : ''}`,
      detail: `${applyWeekend(pkg.price)}€`,
      price: applyWeekend(pkg.price),
      packIndex: i,
    })
  })

  const modeLabel = coach.coaching_mode === 'instant'
    ? { text: 'Réponse rapide', color: '#4ade80', icon: Zap }
    : coach.coaching_mode === 'manual'
    ? { text: 'Sur dossier', color: '#f59e0b', icon: FileText }
    : null

  const heroCta = bookingHref
    ? { href: bookingHref, label: 'Réserver une session', native: true }
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 35% at 50% 0%, ${cardColor}12 0%, transparent 60%), radial-gradient(ellipse 40% 20% at 85% 35%, ${cardColor}06 0%, transparent 55%)`,
        transition: 'background 0.8s ease' }} />

      {/* ── Header fixe ── */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, background: 'rgba(4,4,10,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,3vw,40px)' }}>
        <Link href="/formations" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#7c3aed', padding: '2px 7px', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 4 }}>Élève</span>
        </Link>
        <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: SILVER, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0 }}>
          <ArrowLeft size={13} /> Retour
        </button>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', border: '1.5px solid rgba(6,182,212,0.4)', flexShrink: 0 }}>
          {profile?.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (profile?.username ?? 'E')[0].toUpperCase()}
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '88px 28px 100px' }}>

        {/* ── Hero card ────────────────────────────────────────────────── */}
        <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 20, overflow: 'visible', marginBottom: 24, position: 'relative' }}>

          {/* Banner */}
          <div style={{ height: 220, borderRadius: '20px 20px 0 0', overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, ${cardColor}55 0%, ${cardColor}20 55%, rgba(7,9,14,0.5) 100%)` }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 100% 160% at -5% 60%, ${cardColor}38, transparent 55%)` }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(7,9,14,0.65) 100%)' }} />
            {modeLabel && (
              <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 99, background: 'rgba(7,9,14,0.75)', backdropFilter: 'blur(8px)', border: `1px solid ${modeLabel.color}40`, color: modeLabel.color }}>
                <modeLabel.icon size={11} /> {modeLabel.text}
              </div>
            )}
          </div>

          {/* Avatar */}
          <div style={{ position: 'absolute', top: 176, left: 32, zIndex: 10, width: 88, height: 88, borderRadius: '50%', border: `4px solid #07090e`, overflow: 'hidden', background: coach.avatar_url ? 'transparent' : `linear-gradient(135deg, ${cardColor}, ${cardColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', boxShadow: `0 0 0 1px ${cardColor}50` }}>
            {coach.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={coach.avatar_url} alt={coach.username ?? 'Coach'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          {/* Hero body */}
          <div style={{ padding: '52px 32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h1 style={{ fontSize: 32, fontWeight: 800, color: CREAM, margin: 0, fontFamily: 'var(--font-syne, sans-serif)', letterSpacing: '-0.5px' }}>
                    {coach.username ?? 'Coach'}
                  </h1>
                  {coach.is_pro && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${cardColor}20`, color: cardColor, border: `1px solid ${cardColor}45` }}>PRO</span>
                  )}
                </div>
                {avgRating !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Stars rating={avgRating} size={13} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontSize: 13, color: SILVER }}>· {reviews.length} avis</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: SILVER }}>
                  {coach.years_experience && <span><Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{coach.years_experience} an{coach.years_experience > 1 ? 's' : ''} d'expérience</span>}
                  {coach.hourly_rate && <span style={{ color: CREAM, fontWeight: 700 }}>{coach.hourly_rate}€<span style={{ color: SILVER, fontWeight: 400 }}>/h</span></span>}
                  {weekendPct > 0 && <span style={{ color: '#f59e0b' }}>+{weekendPct}% week-end</span>}
                </div>

                {/* Trust stats */}
                {(avgRating !== null || reviews.length > 0 || coach.years_experience) && (
                  <div style={{ display: 'flex', gap: 28, marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(232,228,220,0.06)' }}>
                    {avgRating !== null && (
                      <div>
                        <p style={{ fontSize: 36, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1, margin: 0 }}>{avgRating.toFixed(1)}</p>
                        <p style={{ fontSize: 10, color: DIM, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '3px 0 0' }}>Note</p>
                      </div>
                    )}
                    {reviews.length > 0 && (
                      <div>
                        <p style={{ fontSize: 36, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1, margin: 0 }}>{reviews.length}</p>
                        <p style={{ fontSize: 10, color: DIM, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '3px 0 0' }}>Avis</p>
                      </div>
                    )}
                    {coach.years_experience && coach.years_experience > 0 && (
                      <div>
                        <p style={{ fontSize: 36, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1, margin: 0 }}>{coach.years_experience}</p>
                        <p style={{ fontSize: 10, color: DIM, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '3px 0 0' }}>Ans exp.</p>
                      </div>
                    )}
                    {formations.length > 0 && (
                      <div>
                        <p style={{ fontSize: 36, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1, margin: 0 }}>{formations.length}</p>
                        <p style={{ fontSize: 10, color: DIM, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '3px 0 0' }}>Contenus</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {heroCta ? (
                <Link href={heroCta.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 26px', borderRadius: 12, background: VIOLET, color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: `0 4px 24px ${VIOLET}50`, flexShrink: 0 }}>
                  <Calendar size={15} /> Réserver une session
                </Link>
              ) : (
                <div style={{ padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(240,244,255,0.1)', color: SILVER, fontSize: 13 }}>
                  Pas d'offre disponible
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main grid ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* LEFT — scrollable content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Bio */}
            {(coach.bio || coach.vision) && (
              <SectionCard title="À propos">
                {coach.bio && <p style={{ fontSize: 14, color: 'rgba(240,244,255,0.78)', lineHeight: 1.75, margin: 0 }}>{coach.bio}</p>}
                {coach.vision && (
                  <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.65, marginTop: 14, marginBottom: 0, borderTop: '1px solid rgba(240,244,255,0.06)', paddingTop: 14, fontStyle: 'italic' }}>
                    &ldquo;{coach.vision}&rdquo;
                  </p>
                )}
              </SectionCard>
            )}

            {/* Spécialités */}
            {variants.length > 0 && (
              <SectionCard title="Spécialités">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {variants.map(v => {
                    const vc = VARIANT_COLORS[v] ?? cardColor
                    return (
                      <span key={v} style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: `${vc}15`, color: vc, border: `1px solid ${vc}35` }}>{v}</span>
                    )
                  })}
                </div>
              </SectionCard>
            )}

            {/* Ce qui est inclus */}
            {advantages.length > 0 && (
              <SectionCard title="Ce qui est inclus">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {advantages.map(a => {
                    const meta = ADVANTAGE_LABELS[a]
                    if (!meta) return null
                    return (
                      <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(240,244,255,0.02)', border: '1px solid rgba(240,244,255,0.06)' }}>
                        <meta.Icon size={13} color={cardColor} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(240,244,255,0.75)' }}>{meta.label}</span>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            )}

            {/* À qui s'adresse ce coaching */}
            {targetPlayers.length > 0 && (
              <SectionCard title="À qui s'adresse ce coaching">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {targetPlayers.map(t => {
                    const meta = TARGET_LABELS[t]
                    if (!meta) return null
                    return (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: `${meta.color}08`, border: `1px solid ${meta.color}25` }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{meta.label}</span>
                          <span style={{ fontSize: 12, color: SILVER, marginLeft: 8 }}>{meta.sub}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            )}

            {/* Formations */}
            {pureFormations.length > 0 && (
              <SectionCard title={`Formations (${pureFormations.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pureFormations.map(f => (
                    <ContentLink key={f.id} f={f} cardColor={cardColor} icon={<BookOpen size={16} color={cardColor} />} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Vidéos */}
            {videoFormations.length > 0 && (
              <SectionCard title={`Vidéos (${videoFormations.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {videoFormations.map(f => (
                    <ContentLink key={f.id} f={f} cardColor={cardColor} icon={<PlayCircle size={16} color={cardColor} />} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Avis */}
            {reviews.length > 0 && (
              <SectionCard title={`Avis (${reviews.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {reviews.map((r, i) => (
                    <div key={i} style={{ paddingBottom: i < reviews.length - 1 ? 16 : 0, borderBottom: i < reviews.length - 1 ? '1px solid rgba(240,244,255,0.06)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.student?.avatar_url ? 'transparent' : `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {r.student?.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={r.student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (r.student?.username ?? 'E')[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>{r.student?.username ?? 'Élève'}</p>
                          <Stars rating={r.rating} size={10} />
                        </div>
                        <span style={{ fontSize: 11, color: DIM, marginLeft: 'auto' }}>
                          {new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {r.comment && <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.68)', lineHeight: 1.65, margin: 0 }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* RIGHT — sticky sidebar */}
          <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Offres de coaching */}
            {coachingFormations.length > 0 && (
              <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: '20px 20px 16px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Offres de coaching</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {coachingFormations.map(f => (
                    <Link key={f.id} href={`/formations/${f.id}`} className="coach-sidebar-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: `1px solid ${cardColor}30`, background: `${cardColor}08`, textDecoration: 'none', transition: 'background 0.15s, border-color 0.15s' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: CREAM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {coach.username} — {f.title}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: cardColor, flexShrink: 0, marginLeft: 10 }}>{f.price > 0 ? `${f.price}€` : 'Gratuit'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tarification + Forfaits unifiés */}
            {pricingOptions.length > 0 && (
              <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: '20px 20px 16px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Tarification</h2>

                {/* Prix affiché (option sélectionnée) */}
                <div style={{ textAlign: 'center', padding: '4px 0 18px' }}>
                  <div style={{ fontSize: 46, fontWeight: 800, color: CREAM, letterSpacing: '-2px', lineHeight: 1 }}>
                    {pricingOptions[selectedPkgIdx]?.price ?? 0}€
                  </div>
                  <div style={{ fontSize: 12, color: SILVER, marginTop: 6 }}>
                    {pricingOptions[selectedPkgIdx]?.label}
                    {weekendPct > 0 && weekendMul === 1 && <span style={{ color: '#f59e0b', marginLeft: 6 }}>+{weekendPct}% week-end</span>}
                  </div>
                </div>

                {/* Dropdown toutes les options */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <select
                    value={selectedPkgIdx}
                    onChange={e => setSelectedPkgIdx(Number(e.target.value))}
                    style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', background: 'rgba(240,244,255,0.04)', border: '1px solid rgba(240,244,255,0.14)', borderRadius: 10, color: CREAM, fontSize: 13, fontWeight: 600, padding: '12px 36px 12px 14px', cursor: 'pointer', outline: 'none' }}
                  >
                    {pricingOptions.map((opt, i) => (
                      <option key={i} value={i} style={{ background: '#1a1c23', color: CREAM }}>
                        {opt.label} — {opt.detail}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} color={SILVER} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* CTA Réserver */}
                {bookingHref && (
                  <Link
                    href={`${bookingHref}${pricingOptions[selectedPkgIdx]?.packIndex !== null ? `?pack=${pricingOptions[selectedPkgIdx]?.packIndex}` : ''}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: `0 4px 20px ${VIOLET}40` }}
                  >
                    <Calendar size={14} /> Réserver
                  </Link>
                )}
              </div>
            )}

            {/* Infos pratiques */}
            <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: '20px 20px' }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Infos pratiques</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {modeLabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <modeLabel.icon size={13} color={modeLabel.color} />
                    <span style={{ fontSize: 13, color: SILVER }}>Accès <span style={{ color: CREAM, fontWeight: 600 }}>{modeLabel.text}</span></span>
                  </div>
                )}
                {coach.rooms && coach.rooms.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Users size={13} color={SILVER} style={{ marginTop: 4, flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      {coach.rooms.filter((r: string) => r !== 'PMU Poker').map((room: string) => {
                        const logoSrc: Record<string, string> = {
                          'PokerStars': '/logos/pokerstars.svg',
                          'Winamax':    '/logos/winamax.png',
                          'Betclic':    '/logos/betclic.svg',
                          'GGPoker':    '/logos/ggpoker.webp',
                          'Unibet':     '/logos/unibet.svg',
                          'bwin':       '/logos/bwin.svg',
                          'PartyPoker': '/logos/partypoker.svg',
                          '888poker':   '/logos/888poker.png',
                          'iPoker':     '/logos/ipoker.svg',
                        }
                        const whiteFilter: Record<string, boolean> = { 'PartyPoker': true, '888poker': true }
                        const src = logoSrc[room]
                        return src ? (
                          <div key={room} title={room} style={{ width: 64, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={room} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: whiteFilter[room] ? 'brightness(0) invert(1)' : 'brightness(0.9) saturate(0.8)', opacity: 0.8 }} />
                          </div>
                        ) : (
                          <span key={room} style={{ fontSize: 12, fontWeight: 600, color: CREAM }}>{room}</span>
                        )
                      })}
                    </div>
                  </div>
                )}
                {coach.years_experience && coach.years_experience > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={13} color={SILVER} />
                    <span style={{ fontSize: 13, color: SILVER }}><span style={{ color: CREAM, fontWeight: 600 }}>{coach.years_experience} an{coach.years_experience > 1 ? 's' : ''}</span> d'expérience</span>
                  </div>
                )}
                {avgRating !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={13} color="#4ade80" />
                    <span style={{ fontSize: 13, color: SILVER }}><span style={{ color: CREAM, fontWeight: 600 }}>{avgRating.toFixed(1)}/5</span> · {reviews.length} avis vérifiés</span>
                  </div>
                )}
                {variants.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Star size={13} color={SILVER} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: SILVER }}>Spécialité <span style={{ color: CREAM, fontWeight: 600 }}>{variants.join(', ')}</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* Scroll hint (si pas de CTA disponible) */}
            {!bookingHref && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <ChevronDown size={16} color={DIM} />
                <p style={{ fontSize: 11, color: DIM, margin: '4px 0 0' }}>Pas d'offre disponible pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .coach-formation-link:hover {
          background: rgba(240,244,255,0.05) !important;
          border-color: rgba(240,244,255,0.16) !important;
        }
        .coach-formation-link:hover img {
          transform: scale(1.04);
          transition: transform 0.2s;
        }
        .coach-sidebar-link {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1) !important;
        }
        .coach-sidebar-link:hover {
          background: rgba(124,58,237,0.14) !important;
          border-color: rgba(124,58,237,0.5) !important;
          transform: translateY(-2px) scale(1.015) !important;
        }
      `}</style>
    </div>
  )
}
