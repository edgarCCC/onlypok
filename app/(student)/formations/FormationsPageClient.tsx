'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Search, HelpCircle, Menu, X, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import NetflixRow from '@/components/marketplace/NetflixRow'
import VideoStudio from '@/components/marketplace/VideoStudio'
import CoachDirectory from '@/components/marketplace/CoachDirectory'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'

const VARIANT_OPTIONS = [
  { id: 'MTT',      label: 'MTT',        desc: 'Tournois multi-tables' },
  { id: 'Cash',     label: 'Cash Game',  desc: 'Tables cash 6-max / HU' },
  { id: 'Expresso', label: 'Expresso',   desc: 'Sit & Go hyper-turbo' },
  { id: 'Live',     label: 'Live',       desc: 'Poker en casino / cercle' },
  { id: 'PLO',      label: 'PLO',        desc: 'Pot-Limit Omaha' },
]

const FIELDS: Record<string, { key: string, label: string, placeholder: string, options: string[] }[]> = {
  formations: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'price',    label: 'Prix',     placeholder: 'Tous',   options: ['Gratuit', '< 30€', '30–60€', '> 60€'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 2h', '2h – 5h', '> 5h'] },
  ],
  videos: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'level',    label: 'Niveau',   placeholder: 'Tous',   options: ['Débutant', 'Intermédiaire', 'Avancé'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 15min', '15–45min', '> 45min'] },
  ],
  coaching: [
    { key: 'q',        label: 'Coach',    placeholder: 'Pseudo ou bio…', options: [] },
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'budget',   label: 'Budget',   placeholder: 'Tous',   options: ['< 50€/h', '50–100€/h', '> 100€/h'] },
  ],
}

const TAB_COLORS: Record<string, string> = {
  formations: '#7c3aed',
  videos:     '#3b82f6',
  coaching:   '#f59e0b',
}

/* ─── Hero contextuel par onglet — hiérarchie de page ───────────────────────── */
function TabHero({ tab, accentColor, count }: {
  tab: 'formations' | 'videos' | 'coaching'
  accentColor: string
  count: number
}) {
  const copy = {
    formations: {
      eyebrow: 'Catalogue',
      title: <>Apprends. Applique. <span style={{ color: accentColor }}>Encaisse.</span></>,
      sub: `${count} formation${count > 1 ? 's' : ''} structurée${count > 1 ? 's' : ''} par des pros aux résultats vérifiés`,
    },
    videos: {
      eyebrow: 'Vidéothèque',
      title: <>Des replays qui <span style={{ color: accentColor }}>rapportent</span></>,
      sub: `${count} vidéo${count > 1 ? 's' : ''} — replays, analyses de mains et concepts clés en format court`,
    },
    coaching: {
      eyebrow: 'Coaching privé',
      title: <>Le raccourci vers le <span style={{ color: accentColor }}>niveau pro</span></>,
      sub: `${count} coach${count > 1 ? 's' : ''} vérifié${count > 1 ? 's' : ''} — réserve ta session en trois clics`,
    },
  }[tab]

  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
        padding: '5px 14px', borderRadius: 99,
        background: `${accentColor}12`, border: `1px solid ${accentColor}30`,
        transition: 'all 0.4s ease',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}80` }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {copy.eyebrow}
        </span>
      </div>
      <h1 style={{
        fontFamily: 'var(--font-syne, sans-serif)',
        fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: CREAM,
        letterSpacing: '-1px', margin: '0 0 8px', lineHeight: 1.05,
      }}>
        {copy.title}
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(232,228,220,0.45)', margin: 0 }}>{copy.sub}</p>
    </div>
  )
}

export default function FormationsPageClient({
  initialFormations,
  initialReviews,
  initialUserRole,
  initialEligibleCoachIds = [],
  initialCoaches = [],
}: {
  initialFormations: any[]
  initialReviews: any[]
  initialUserRole: 'coach' | 'student' | null
  initialEligibleCoachIds?: string[]
  initialCoaches?: any[]
}) {
  const formations = initialFormations
  const allReviews = initialReviews
  const eligibleCoachIds = useMemo(() => new Set(initialEligibleCoachIds), [initialEligibleCoachIds])
  const { signOut } = useUser()
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const initialTab = (['formations','videos','coaching'] as const).find(t => t === searchParams.get('tab')) ?? 'formations'
  const [tab, setTab]               = useState<'formations'|'videos'|'coaching'>(initialTab)
  const [showMenu, setShowMenu]     = useState(false)
  const [activeField, setActiveField] = useState<string|null>(null)
  const [filters, setFilters]       = useState<Record<string,string>>({})
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null)
  const [authRole, setAuthRole]     = useState<'coach' | 'student' | null>(initialUserRole)
  const [authAvatar, setAuthAvatar] = useState<string | null>(null)
  const [authUsername, setAuthUsername] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(!!initialUserRole)
  const [authLoading, setAuthLoading] = useState(!initialUserRole)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: import('@supabase/supabase-js').User | null } }) => {
      if (!user) { setIsLoggedIn(false); setAuthLoading(false); return }
      setIsLoggedIn(true)
      const { data } = await supabase.from('profiles').select('role, avatar_url, username').eq('id', user.id).single()
      if (data) {
        setAuthRole(data.role ?? null)
        setAuthAvatar(data.avatar_url ?? null)
        setAuthUsername(data.username ?? null)
      }
      setAuthLoading(false)
    })
  }, [supabase])

  const userRole = authRole
  const searchRef  = useRef<HTMLDivElement>(null)
  const centerRef  = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  /* Loupe = valider la recherche : referme les panneaux et amène aux résultats
     (la barre se replie en pilule avec le résumé des filtres). */
  const runSearch = () => {
    setActiveField(null)
    setIsSearchOverlayOpen(false)
    const top = resultsRef.current
      ? resultsRef.current.getBoundingClientRect().top + window.scrollY - 110
      : 0
    window.scrollTo({ top: Math.max(top, 60), behavior: 'smooth' })
  }

  const accentColor = TAB_COLORS[tab]
  const fields = FIELDS[tab]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
      if (window.scrollY <= 10) setIsSearchOverlayOpen(false)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlayingVideo(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    /* Fermeture au 'click' (pas au 'mousedown') : refermer l'overlay pendant
       le mousedown fait disparaître les onglets avant la fin du clic, et le
       changement d'onglet n'aboutit jamais. La zone centrale du header
       (onglets + pilule) est exclue : React attache ses événements sur
       document dans l'App Router, un stopPropagation ne suffirait pas. */
    const handler = (e: MouseEvent) => {
      if (centerRef.current?.contains(e.target as Node)) return
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveField(null)
        setIsSearchOverlayOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const filtered = formations.filter(f => {
    const v = filters.variant, p = filters.price, d = filters.duration, l = filters.level
    const matchV = !v || f.variant === v
    const matchP = !p || (p === 'Gratuit' && f.price === 0) || (p === '< 30€' && f.price > 0 && f.price < 30) || (p === '30–60€' && f.price >= 30 && f.price <= 60) || (p === '> 60€' && f.price > 60)
    const matchD = !d || (tab === 'videos'
      ? (d === '< 15min' && f.duration_minutes < 15) || (d === '15–45min' && f.duration_minutes >= 15 && f.duration_minutes <= 45) || (d === '> 45min' && f.duration_minutes > 45)
      : (d === '< 2h' && f.duration_minutes < 120) || (d === '2h – 5h' && f.duration_minutes >= 120 && f.duration_minutes <= 300) || (d === '> 5h' && f.duration_minutes > 300))
    const matchL = !l || f.level === l
    const contentType = f.content_type ?? 'formation'
    const matchTab = tab === 'formations' ? contentType === 'formation' : tab === 'videos' ? contentType === 'video' : tab === 'coaching' ? contentType === 'coaching' : true
    return matchTab && matchV && matchP && matchD && matchL
  })

  const tabReviews = useMemo(() => {
    const coachIds = new Set(filtered.map((f: any) => f.coach?.id).filter(Boolean))
    const expectedType = tab === 'videos' ? 'video' : tab === 'coaching' ? 'coaching' : 'formation'
    return allReviews.filter(r =>
      coachIds.has(r.coach_id) &&
      (r.content_type ?? 'formation') === expectedType
    )
  }, [filtered, allReviews, tab])

  const setFilter = (key: string, val: string) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }))
    setActiveField(null)
  }

  const showBigSearch = !isScrolled || isSearchOverlayOpen
  const hasContentFilters = Boolean(filters.variant || filters.price || filters.duration || filters.level)

  /* Libellé de la pilule compacte : résumé des filtres actifs, sinon l'onglet */
  const pillLabel = (() => {
    const parts = (tab === 'coaching'
      ? [filters.q, filters.variant, filters.budget]
      : [filters.variant, filters.price, filters.level, filters.duration]
    ).filter(Boolean)
    if (parts.length) return parts.join(' · ')
    return tab === 'coaching' ? 'Coachs' : tab === 'videos' ? 'Vidéos' : 'Formations'
  })()

  return (
    <div className="sform-root" style={{ minHeight: '100vh', background: '#07090e', color: '#fff', overflowX: 'hidden' }}>
      <style>{`
        @media (max-width: 700px) {
          .sform-header-row { flex-wrap: wrap !important; height: auto !important; padding: 10px 16px !important; row-gap: 10px !important; }
          .sform-header-center { min-width: 100% !important; order: 3; }
          .sform-search-inner { padding: 0 16px !important; }
          .sform-main { padding-left: 16px !important; padding-right: 16px !important; padding-top: 290px !important; }
          .sform-row-head { flex-wrap: wrap !important; gap: 10px !important; }
          .sform-q-cell { padding: 12px 14px !important; }
        }
        .sform-root :is(button, a, input):focus-visible {
          outline: 2px solid rgba(124,58,237,0.65);
          outline-offset: 2px;
          border-radius: 8px;
        }
        .sform-q-input::placeholder { color: rgba(138,138,138,0.5); }
        /* Micro-interaction CTA — lift léger, flèche qui glisse, clic enfoncé */
        .op-cta {
          transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), filter 0.2s ease, opacity 0.2s ease, box-shadow 0.22s ease;
        }
        .op-cta:hover { transform: translateY(-1px); filter: brightness(1.07); }
        .op-cta:active { transform: translateY(0) scale(0.98); filter: brightness(0.98); }
        .op-cta-arrow { transition: transform 0.22s cubic-bezier(0.16,1,0.3,1); }
        .op-cta:hover .op-cta-arrow { transform: translateX(3px); }
        /* Lampe à lave — deux nappes organiques (une claire, une sombre) qui
           flottent lentement dans la barre, sur des cycles désynchronisés */
        .op-cta { position: relative; overflow: hidden; isolation: isolate; }
        .op-cta::before, .op-cta::after {
          content: '';
          position: absolute;
          width: 75%;
          aspect-ratio: 1;
          border-radius: 50%;
          pointer-events: none;
          z-index: -1;
        }
        .op-cta::before {
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.33) 45%, transparent 70%);
          mix-blend-mode: overlay;
          top: -85%; left: -18%;
          animation: opLavaA 4.7s ease-in-out infinite alternate;
        }
        .op-cta::after {
          background: radial-gradient(circle, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.27) 45%, transparent 72%);
          mix-blend-mode: soft-light;
          bottom: -90%; right: -12%;
          animation: opLavaB 6.3s ease-in-out infinite alternate;
        }
        @keyframes opLavaA {
          0%   { transform: translate(0%, 0%) scale(1); }
          50%  { transform: translate(70%, 30%) scale(1.3); }
          100% { transform: translate(140%, -8%) scale(0.85); }
        }
        @keyframes opLavaB {
          0%   { transform: translate(0%, 0%) scale(1.15); }
          50%  { transform: translate(-75%, -25%) scale(0.8); }
          100% { transform: translate(-150%, 12%) scale(1.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          .op-cta, .op-cta-arrow, .op-cta::before, .op-cta::after { transition: none; animation: none; }
          .op-cta:hover, .op-cta:active { transform: none; }
          .op-cta:hover .op-cta-arrow { transform: none; }
        }
      `}</style>

      {/* Lumière centrale forte */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${accentColor}35 0%, ${accentColor}10 50%, transparent 80%)`,
        transition: 'background 0.6s ease',
      }} />

      {/* Overlay sombre quand overlay ouvert */}
      {isScrolled && isSearchOverlayOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease' }} />
      )}

      {/* ══════════════════════
          HEADER
      ══════════════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: isScrolled ? 'rgba(7,9,14,0.97)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px)' : 'none',
        borderBottom: isScrolled ? `1px solid rgba(232,228,220,0.07)` : 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div className="sform-header-row" style={{ display: 'flex', alignItems: 'center', height: 80, padding: '0 40px', gap: 24 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
          </Link>

          {/* Centre */}
          <div ref={centerRef} className="sform-header-center" style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: 48, alignItems: 'center' }}>
            {/* Tabs */}
            <div style={{ position: 'absolute', display: 'inline-flex', background: 'rgba(232,228,220,0.04)', border: `1px solid rgba(232,228,220,0.08)`, borderRadius: 14, padding: 4, gap: 4, transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)', opacity: showBigSearch ? 1 : 0, pointerEvents: showBigSearch ? 'auto' : 'none', transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.92)', zIndex: 10 }}>
              {(['formations','videos','coaching'] as const).map(t => {
                const active = tab === t
                const labels: Record<string,string> = { formations: 'Formations', videos: 'Vidéos', coaching: 'Coachs' }
                return (
                  <button key={t} onClick={() => { setTab(t); setFilters({}); setIsSearchOverlayOpen(false); window.history.replaceState(null, '', t === 'formations' ? '/formations' : `/formations?tab=${t}`) }} style={{ padding: '8px 24px', borderRadius: 10, border: 'none', background: active ? `${TAB_COLORS[t]}28` : 'transparent', color: active ? CREAM : SILVER, fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.25s' }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
                    {labels[t]}
                  </button>
                )
              })}
            </div>

            {/* Pilule compacte */}
            <div style={{ position: 'absolute', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)', opacity: !showBigSearch ? 1 : 0, pointerEvents: !showBigSearch ? 'auto' : 'none', transform: !showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.92)' }}>
              <button onClick={e => { e.stopPropagation(); setIsSearchOverlayOpen(true) }} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(240,244,255,0.05)', border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 40, padding: '6px 8px 6px 20px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pillLabel}</span>
                <div style={{ width: 1, height: 16, background: `rgba(240,244,255,0.12)` }} />
                <span style={{ fontSize: 13, color: SILVER }}>Rechercher…</span>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${accentColor}60` }}>
                  <Search size={15} color="#fff" />
                </div>
              </button>
            </div>
          </div>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isLoggedIn ? (
              <Link
                href={userRole === 'coach' ? '/coach/dashboard' : '/dashboard'}
                style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '6px 12px 6px 6px', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 40, transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.25)` }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.1)` }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  {authAvatar
                    ? <Image src={authAvatar} alt="" fill sizes="28px" style={{ objectFit: 'cover' }} />
                    : <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{(authUsername ?? 'U')[0].toUpperCase()}</span>
                  }
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: CREAM, whiteSpace: 'nowrap' }}>
                  {userRole === 'coach' ? 'Dashboard' : 'Mon espace'}
                </span>
              </Link>
            ) : !authLoading ? (
              <Link
                href="/become-coach"
                style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none', padding: '8px 16px', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.25)` }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.1)` }}>
                Devenir coach
              </Link>
            ) : null}
            <button style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(232,228,220,0.03)', border: `1px solid rgba(232,228,220,0.08)`, color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
              <HelpCircle size={16} />
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(!showMenu)} style={{ width: 38, height: 38, borderRadius: 10, background: showMenu ? 'rgba(232,228,220,0.08)' : 'rgba(232,228,220,0.03)', border: `1px solid rgba(232,228,220,0.08)`, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                <Menu size={16} />
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', top: 46, right: 0, background: '#07070f', border: `1px solid rgba(240,244,255,0.08)`, borderRadius: 14, padding: 6, minWidth: 200, zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div style={{ padding: '8px 14px 12px', borderBottom: `1px solid rgba(240,244,255,0.05)`, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Menu</span>
                  </div>
                  {[['Mes formations', '/formations'], ['Coaches', '/formations?tab=coaching'], ['Tracker', '/track']].map(([label, href]) => (
                    <Link key={label} href={href} style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: SILVER, textDecoration: 'none', borderRadius: 8, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = CREAM }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = SILVER }}>
                      {label}
                    </Link>
                  ))}
                  <button onClick={() => signOut()} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: SILVER, background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div ref={searchRef} style={{ height: showBigSearch ? 110 : 0, opacity: showBigSearch ? 1 : 0, pointerEvents: showBigSearch ? 'auto' : 'none', transition: 'all 0.4s cubic-bezier(0.2,0.8,0.2,1)', display: 'flex', justifyContent: 'center', paddingBottom: 20, transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-24px) scale(0.97)' }}>
          <div className="sform-search-inner" style={{ width: '100%', maxWidth: 860, position: 'relative', padding: '0 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(20,23,30,0.9)', backdropFilter: 'blur(25px)', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 50, padding: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              {fields.map((field, idx) => {
                const isActive = activeField === field.key
                const isLast   = idx === fields.length - 1

                /* Champ texte libre — recherche coach (pseudo / bio) */
                if (field.key === 'q') {
                  return (
                    <div key="q" style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div className="sform-q-cell" style={{ flex: 1, minWidth: 0, padding: '12px 26px' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: filters.q ? CREAM : SILVER, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{field.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            className="sform-q-input"
                            size={1}
                            value={filters.q ?? ''}
                            onChange={e => { const v = e.target.value; setFilters(prev => ({ ...prev, q: v })) }}
                            placeholder={field.placeholder}
                            style={{ flex: 1, minWidth: 0, width: '100%', background: 'transparent', border: 'none', outline: 'none', color: CREAM, fontSize: 13, fontFamily: 'inherit', padding: 0 }}
                          />
                          {filters.q && (
                            <span onClick={() => setFilters(prev => ({ ...prev, q: '' }))} style={{ color: SILVER, cursor: 'pointer', display: 'flex' }}><X size={12} /></span>
                          )}
                        </div>
                      </div>
                      {!isLast && activeField !== fields[idx+1]?.key && (
                        <div style={{ width: 1, height: 22, background: `rgba(232,228,220,0.1)`, position: 'absolute', right: 0 }} />
                      )}
                    </div>
                  )
                }

                return (
                  <div key={field.key} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setActiveField(isActive ? null : field.key)} style={{ flex: 1, textAlign: 'left', border: 'none', padding: '12px 26px', cursor: 'pointer', background: isActive ? 'rgba(232,228,220,0.08)' : 'transparent', borderRadius: 40, transition: 'all 0.2s', width: '100%' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isActive ? CREAM : SILVER, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{field.label}</div>
                      <div style={{ fontSize: 13, color: filters[field.key] ? CREAM : 'rgba(138,138,138,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {filters[field.key] || field.placeholder}
                        {filters[field.key] && (
                          <span onClick={e => { e.stopPropagation(); setFilter(field.key, filters[field.key]) }} style={{ color: SILVER, cursor: 'pointer' }}><X size={12} /></span>
                        )}
                      </div>
                    </button>

                    {!isLast && !isActive && activeField !== fields[idx+1]?.key && (
                      <div style={{ width: 1, height: 22, background: `rgba(232,228,220,0.1)`, position: 'absolute', right: 0 }} />
                    )}

                    {/* Dropdown — prend exactement la largeur du champ parent */}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 14px)',
                        left: 0,
                        right: 0,
                        background: '#07070f',
                        border: `1px solid rgba(240,244,255,0.08)`,
                        borderRadius: 20,
                        padding: 14,
                        zIndex: 110,
                        boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                        animation: 'airbnbPop 0.25s ease',
                      }}>
                        <div style={{ padding: '4px 8px 12px', borderBottom: `1px solid rgba(240,244,255,0.05)`, marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{field.label}</span>
                        </div>

                        {activeField === 'variant' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {VARIANT_OPTIONS.map(v => {
                              const selected = filters.variant === v.id
                              return (
                                <button key={v.id} onClick={() => setFilter('variant', v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: `1px solid ${selected ? accentColor + '50' : 'rgba(232,228,220,0.05)'}`, background: selected ? `${accentColor}14` : 'rgba(232,228,220,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.02)' }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(232,228,220,0.05)', border: `1px solid ${selected ? accentColor + '50' : 'rgba(232,228,220,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: selected ? accentColor : SILVER, transition: 'all 0.2s' }}>
                                    {v.id === 'MTT' ? '♠' : v.id === 'Cash' ? '♣' : v.id === 'Expresso' ? '♥' : v.id === 'Live' ? '♦' : v.id === 'PLO' ? '♠' : '♣'}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{v.label}</div>
                                    <div style={{ fontSize: 11, color: SILVER, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.desc}</div>
                                  </div>
                                  {selected && <Check size={15} color={accentColor} style={{ flexShrink: 0 }} />}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {fields.find(f => f.key === activeField)?.options.map(o => {
                              const selected = filters[activeField] === o
                              return (
                                <button key={o} onClick={() => setFilter(activeField, o)} style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: selected ? 600 : 400, border: 'none', background: selected ? `${accentColor}20` : 'transparent', color: selected ? CREAM : SILVER, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                                  {o}
                                  {selected && <Check size={14} color={accentColor} />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ paddingLeft: 8 }}>
                <button aria-label="Lancer la recherche" className="op-cta" onClick={runSearch} style={{ width: 52, height: 52, borderRadius: '50%', background: accentColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 6px 20px ${accentColor}55`, flexShrink: 0 }}>
                  <Search size={20} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════
          CONTENU
      ══════════════════════ */}
      <main className="sform-main" style={{ paddingTop: 220, paddingLeft: 40, paddingRight: 40, paddingBottom: 100, position: 'relative', zIndex: 1 }}>
        <div ref={resultsRef}>
          <TabHero
            tab={tab}
            accentColor={accentColor}
            count={tab === 'coaching' ? initialCoaches.length : filtered.length}
          />
        </div>

        {tab === 'coaching' ? (
          /* ── Annuaire coachs — DA portée de l'ancienne page /coaches ── */
          <CoachDirectory
            coaches={initialCoaches}
            searchQuery={filters.q ?? ''}
            headerVariant={filters.variant ?? ''}
            headerBudget={filters.budget ?? ''}
          />
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '90px 24px', maxWidth: 560, margin: '0 auto',
            background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 20,
          }}>
            <div style={{ fontSize: 44, opacity: 0.14, marginBottom: 14, color: accentColor }}>♠</div>
            <p style={{ color: CREAM, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              {tab === 'videos' ? 'Aucune vidéo disponible' : 'Aucune formation disponible'}
            </p>
            <p style={{ color: 'rgba(232,228,220,0.4)', fontSize: 13, margin: 0 }}>
              {hasContentFilters ? 'Essayez de modifier vos filtres' : 'Revenez bientôt, le catalogue s’agrandit chaque semaine'}
            </p>
            {hasContentFilters && (
              <button
                onClick={() => setFilters({})}
                style={{
                  marginTop: 20, padding: '9px 20px', borderRadius: 10, cursor: 'pointer',
                  background: `${accentColor}14`, border: `1px solid ${accentColor}30`,
                  color: CREAM, fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}24` }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}14` }}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
            {filtered.slice(0, 10).length > 0 && (
              <NetflixRow
                title={tab === 'videos' ? 'Top vidéos' : 'Top formations'}
                subtitle="Les plus populaires du moment"
                formations={filtered.slice(0, 10)}
                accentColor={accentColor}
                onPlayVideo={setPlayingVideo}
                eligibleCoachIds={eligibleCoachIds}
              />
            )}
            {filtered.filter(f => f.price === 0).length > 0 && (
              <NetflixRow
                title="Accès gratuit"
                subtitle="Commence sans rien débourser"
                formations={filtered.filter(f => f.price === 0)}
                accentColor={accentColor}
                onPlayVideo={setPlayingVideo}
                eligibleCoachIds={eligibleCoachIds}
              />
            )}
            {filtered.filter(f => f.price > 0).length > 0 && (
              <NetflixRow
                title="Premium"
                subtitle="Le meilleur du contenu pro"
                formations={filtered.filter(f => f.price > 0)}
                accentColor={accentColor}
                onPlayVideo={setPlayingVideo}
                eligibleCoachIds={eligibleCoachIds}
              />
            )}
            {filtered.length > 0 && (
              <NetflixRow
                title="Nouveautés"
                subtitle="Ajoutés récemment"
                formations={[...filtered].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
                accentColor={accentColor}
                onPlayVideo={setPlayingVideo}
                eligibleCoachIds={eligibleCoachIds}
              />
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════
          VIDEO MODAL
      ══════════════════════ */}
      {playingVideo && (
        <VideoStudio video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}

      <style>{`
        @keyframes airbnbPop { from { opacity:0; transform:translateY(-8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        @keyframes mindmapIn { from { opacity:0; transform:scale(0.98); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  )
}
