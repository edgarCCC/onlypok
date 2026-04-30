'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import {
  TrendingUp, Users, BookOpen, Star, Plus,
  Eye, EyeOff, Trash2, Edit2, ChevronRight, Calendar, ExternalLink,
} from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

const TABS = [
  { id: 'all',       label: 'Tout',       color: CREAM,     glow: 'rgba(240,244,255,0.06)' },
  { id: 'coaching',  label: 'Coaching',   color: '#f59e0b', glow: 'rgba(245,158,11,0.18)' },
  { id: 'formation', label: 'Formations', color: VIOLET,    glow: 'rgba(124,58,237,0.18)' },
  { id: 'video',     label: 'Vidéos',     color: CYAN,      glow: 'rgba(6,182,212,0.18)' },
]

const TYPE_COLORS: Record<string, string> = {
  formation: VIOLET,
  video: CYAN,
  coaching: '#f59e0b',
}

/* ── KPI card ─────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub: string; color: string; icon: React.ElementType
}) {
  return (
    <div
      style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${color}35`}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.07)'}
    >
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 100% 0%, ${color}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 11, color: SILVER }}>{sub}</div>
    </div>
  )
}

/* ── Revenue bar chart ────────────────────────────────── */
function RevenueChart({ data, color }: { data: { month: string; rev: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.rev), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, paddingBottom: 22 }}>
      {data.map(d => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 9, color, fontWeight: 700 }}>{d.rev > 0 ? `${d.rev}€` : ''}</span>
          <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: `linear-gradient(to top, ${color}, ${color}55)`, height: `${Math.max((d.rev / max) * 70, d.rev > 0 ? 4 : 2)}px`, opacity: d.rev > 0 ? 1 : 0.12, transition: 'height 0.4s ease' }} />
          <span style={{ fontSize: 9, color: SILVER, whiteSpace: 'nowrap' }}>{d.month}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Divider ──────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '40px 0 28px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(232,228,220,0.07)' }} />
      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(240,244,255,0.2)', letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(232,228,220,0.07)' }} />
    </div>
  )
}

/* ── Main page ────────────────────────────────────────── */
export default function CoachDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useUser()

  const [loading, setLoading]         = useState(true)
  const [formations, setFormations]   = useState<any[]>([])
  const [recentPurchases, setRecent]  = useState<any[]>([])
  const [reviews, setReviews]         = useState<any[]>([])
  const [tab, setTab]                 = useState('coaching')
  const [statTab, setStatTab]         = useState('all')
  const [sort, setSort]               = useState<'recent'|'students'|'revenue'|'alpha'>('recent')
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null)

  const activeTab = TABS.find(t => t.id === tab) ?? TABS[0]

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: f }, { data: p }, { data: r }] = await Promise.all([
        supabase.from('formations').select('*, formation_purchases(count)').eq('coach_id', user.id).order('created_at', { ascending: false }),
        supabase.from('formation_purchases').select('*, formations(title, content_type, coach_id, cal_url), profiles(username)').eq('formations.coach_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('reviews').select('rating, created_at').eq('coach_id', user.id),
      ])
      setFormations(f ?? [])
      setRecent((p ?? []).filter(x => x.formations))
      setReviews(r ?? [])
      setLoading(false)
    }
    load()
  }, [user, supabase])

  /* ── Global computed ───────────────────────────────── */
  const totalRevenue   = formations.reduce((a, f) => a + (f.price ?? 0) * (f.formation_purchases?.[0]?.count ?? 0), 0)
  const totalStudents  = formations.reduce((a, f) => a + (f.formation_purchases?.[0]?.count ?? 0), 0)
  const publishedCount = formations.filter(f => f.published).length
  const avgRating      = reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length : 0

  const now           = new Date()
  const thisMonthKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const studentsMonth = recentPurchases.filter(p => p.created_at?.slice(0, 7) === thisMonthKey).length

  /* 6-month revenue (global, not filtered by tab) */
  const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now); d.setMonth(d.getMonth() - (5 - i))
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    const rev   = formations.reduce((a, f) => f.created_at?.slice(0, 7) === key ? a + (f.price ?? 0) * (f.formation_purchases?.[0]?.count ?? 0) : a, 0)
    return { month: label, rev }
  })

  /* ── Per-tab stats ─────────────────────────────────── */
  const statsFor = (type: string) => {
    const list = type === 'all' ? formations : formations.filter(f => (f.content_type ?? 'formation') === type)
    return {
      total:     list.length,
      published: list.filter(f => f.published).length,
      students:  list.reduce((a, f) => a + (f.formation_purchases?.[0]?.count ?? 0), 0),
      revenue:   list.reduce((a, f) => a + (f.price ?? 0) * (f.formation_purchases?.[0]?.count ?? 0), 0),
    }
  }
  const stats = statsFor(tab)

  /* Filtered + sorted list */
  const filtered = formations
    .filter(f => {
      const matchType = tab === 'all' || (f.content_type ?? 'formation') === tab
      const matchStat =
        statTab === 'all' ||
        (statTab === 'published' && f.published) ||
        (statTab === 'draft' && !f.published) ||
        (statTab === 'students' && (f.formation_purchases?.[0]?.count ?? 0) > 0)
      return matchType && matchStat
    })
    .sort((a, b) => {
      if (sort === 'students') return (b.formation_purchases?.[0]?.count ?? 0) - (a.formation_purchases?.[0]?.count ?? 0)
      if (sort === 'revenue')  return ((b.price ?? 0) * (b.formation_purchases?.[0]?.count ?? 0)) - ((a.price ?? 0) * (a.formation_purchases?.[0]?.count ?? 0))
      if (sort === 'alpha')    return (a.title ?? '').localeCompare(b.title ?? '', 'fr')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // 'recent'
    })

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('formations').update({ published: !current }).eq('id', id)
    setFormations(prev => prev.map(f => f.id === id ? { ...f, published: !current } : f))
  }

  const deleteFormation = async (id: string) => {
    await supabase.from('formations').delete().eq('id', id)
    setFormations(prev => prev.filter(f => f.id !== id))
    setDeleteModal(null)
  }

  const greeting = profile?.username
    ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1)
    : 'Coach'

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM, position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow — tied to active tab */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 35% at 50% 0%, ${activeTab.glow} 0%, transparent 70%)`, transition: 'background 0.5s ease' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '40px' }}>

        {/* ══ SECTION 1 — Vue d'ensemble ══════════════════════ */}

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Tableau de bord</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 52, color: SILVER, fontWeight: 200, lineHeight: 1 }}>[</span>
            <h1 style={{ fontSize: 52, fontWeight: 700, color: CREAM, letterSpacing: '-1px', lineHeight: 1, fontFamily: 'var(--font-syne,sans-serif)', margin: 0 }}>{greeting}</h1>
            <span style={{ fontSize: 52, color: SILVER, fontWeight: 200, lineHeight: 1 }}>]</span>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <Link href="/coach/revenue"          style={{ textDecoration: 'none' }}><KpiCard label="Revenus totaux"   value={`${totalRevenue}€`}                          sub="depuis le début"                 color={VIOLET}    icon={TrendingUp} /></Link>
          <Link href="/coach/students"         style={{ textDecoration: 'none' }}><KpiCard label="Élèves ce mois"   value={studentsMonth}                               sub={`${totalStudents} au total`}     color={CYAN}      icon={Users} /></Link>
          <Link href="#content"                style={{ textDecoration: 'none' }}><KpiCard label="Contenus publiés" value={publishedCount}                              sub={`${formations.length} au total`} color="#a855f7"   icon={BookOpen} /></Link>
          <Link href="/coach/reviews"          style={{ textDecoration: 'none' }}><KpiCard label="Note moyenne"     value={avgRating > 0 ? avgRating.toFixed(1) : '—'}  sub={`${reviews.length} avis`}        color="#f59e0b"   icon={Star} /></Link>
        </div>

        {/* Revenue chart + recent enrollments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>Revenus sur 6 mois</h2>
              <span style={{ fontSize: 10, color: SILVER }}>{now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            </div>
            {totalRevenue === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, marginBottom: 12, opacity: 0.1 }}>
                  {[20, 35, 15, 45, 10, 30].map((h, i) => <div key={i} style={{ width: 18, height: h, background: CREAM, borderRadius: '3px 3px 0 0' }} />)}
                </div>
                <p style={{ color: SILVER, fontSize: 12 }}>Pas encore de vente</p>
                <p style={{ color: 'rgba(138,138,138,0.4)', fontSize: 11, marginTop: 4 }}>Le graphe s'affiche dès la première vente</p>
              </div>
            ) : (
              <RevenueChart data={monthlyRevenue} color={VIOLET} />
            )}
          </div>

          {(() => {
            const coachingSessions = recentPurchases.filter(p => p.formations?.content_type === 'coaching')
            const hasCalUrl = coachingSessions.some(p => p.formations?.cal_url)
            const globalCalUrl = formations.find(f => f.content_type === 'coaching' && f.cal_url)?.cal_url ?? null

            return (
              <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: 16, padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} color="#f59e0b" />
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>Sessions coaching à planifier</h2>
                  </div>
                  {globalCalUrl && (
                    <a href={globalCalUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: '#f59e0b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7 }}>
                      Cal.com <ExternalLink size={9} />
                    </a>
                  )}
                </div>

                {coachingSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Calendar size={24} color={SILVER} style={{ opacity: 0.2, marginBottom: 10 }} />
                    <p style={{ color: SILVER, fontSize: 12 }}>Aucune session achetée</p>
                    <p style={{ color: 'rgba(138,138,138,0.35)', fontSize: 11, marginTop: 4 }}>Les élèves qui achètent vos coachings apparaîtront ici</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {coachingSessions.slice(0, 6).map((p, i) => {
                      const username = p.profiles?.username ?? 'Élève'
                      const calUrl   = p.formations?.cal_url
                      const date     = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
                      const isRecent = (Date.now() - new Date(p.created_at).getTime()) < 3 * 24 * 3600 * 1000
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
                            {username[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: CREAM }}>{username}</span>
                              {isRecent && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', letterSpacing: '0.08em' }}>NOUVEAU</span>}
                            </div>
                            <span style={{ fontSize: 10, color: SILVER, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.formations?.title ?? 'Coaching'}</span>
                          </div>
                          <span style={{ fontSize: 10, color: SILVER, flexShrink: 0 }}>{date}</span>
                          {calUrl ? (
                            <a href={calUrl} target="_blank" rel="noreferrer"
                              style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textDecoration: 'none', padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              Planifier
                            </a>
                          ) : (
                            <span style={{ fontSize: 10, color: 'rgba(245,158,11,0.3)', flexShrink: 0 }}>Pas de Cal.com</span>
                          )}
                        </div>
                      )
                    })}
                    {coachingSessions.length > 6 && (
                      <Link href="/coach/students" style={{ fontSize: 11, color: SILVER, textDecoration: 'none', textAlign: 'center', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        +{coachingSessions.length - 6} autres <ChevronRight size={11} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* ══ SECTION 2 — Gestion des contenus ════════════════ */}

        <div id="content" style={{ scrollMarginTop: 80 }} />
        <SectionDivider label="Mes contenus" />

        {/* Type tabs + Nouveau contenu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: 4, gap: 2 }}>
            {TABS.map(t => {
              const active = tab === t.id
              const s = statsFor(t.id)
              return (
                <button key={t.id} onClick={() => { setTab(t.id); setStatTab('all') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 12, border: 'none', background: active ? t.color + (t.id === 'all' ? '18' : '28') : 'transparent', color: active ? (t.id === 'all' ? CREAM : '#fff') : SILVER, fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: active && t.id !== 'all' ? `0 2px 14px ${t.color}50` : 'none' }}>
                  {t.label}
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: active ? 'rgba(0,0,0,0.2)' : 'rgba(232,228,220,0.06)', color: active ? '#fff' : SILVER }}>{s.total}</span>
                </button>
              )
            })}
          </div>
          <Link href={`/coach/formations/new?type=${tab === 'all' ? 'formation' : tab}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', padding: '9px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13, flexShrink: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}
          >
            <Plus size={15} /> Nouveau contenu
          </Link>
        </div>

        {/* Stat sub-tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { key: 'all',      label: 'Tous',     value: stats.total,                   sub: 'contenus' },
            { key: 'published',label: 'Publiés',  value: stats.published,               sub: `sur ${stats.total}` },
            { key: 'students', label: 'Élèves',   value: stats.students,                sub: 'inscrits' },
            { key: 'draft',    label: 'Brouillons',value: stats.total - stats.published, sub: 'en attente' },
          ].map(s => {
            const active = statTab === s.key
            return (
              <button key={s.key} onClick={() => setStatTab(s.key)}
                style={{ background: active ? 'rgba(232,228,220,0.06)' : 'rgba(232,228,220,0.02)', border: `1px solid ${active ? activeTab.color + '40' : 'rgba(232,228,220,0.07)'}`, borderRadius: 14, padding: '16px 18px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: active ? activeTab.color : SILVER, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: active ? activeTab.color : CREAM }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(138,138,138,0.5)', marginTop: 2 }}>{s.sub}</div>
              </button>
            )
          })}
        </div>

        {/* Sort controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(240,244,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Trier par</span>
          {([
            { key: 'recent',   label: 'Plus récent' },
            { key: 'students', label: 'Élèves' },
            { key: 'revenue',  label: 'Revenus' },
            { key: 'alpha',    label: 'A → Z' },
          ] as const).map(o => (
            <button key={o.key} onClick={() => setSort(o.key)}
              style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${sort === o.key ? activeTab.color + '50' : 'rgba(232,228,220,0.08)'}`, background: sort === o.key ? `${activeTab.color}18` : 'transparent', color: sort === o.key ? activeTab.color : SILVER, fontSize: 11, fontWeight: sort === o.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Formations list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: activeTab.color, opacity: 0.12, margin: '0 auto 16px' }} />
            <p style={{ color: SILVER, fontSize: 14, marginBottom: 22 }}>
              {tab === 'all' ? "Aucun contenu pour l'instant" : `Aucune ${TABS.find(t => t.id === tab)?.label.toLowerCase()} pour l'instant`}
            </p>
            <Link href={`/coach/formations/new?type=${tab === 'all' ? 'formation' : tab}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
              <Plus size={16} /> Créer mon premier contenu
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(f => {
              const students  = f.formation_purchases?.[0]?.count ?? 0
              const revenue   = (f.price ?? 0) * students
              const type      = f.content_type ?? 'formation'
              const typeColor = TYPE_COLORS[type] ?? VIOLET
              const typeLabel = type === 'formation' ? 'Formation' : type === 'video' ? 'Vidéo' : 'Coaching'

              return (
                <div key={f.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(232,228,220,0.025)', border: '1px solid rgba(232,228,220,0.06)', borderRadius: 14, padding: '16px 22px', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.12)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.06)'}>

                  {/* Left color bar */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: typeColor, borderRadius: '14px 0 0 14px', opacity: 0.7 }} />

                  {/* Thumbnail */}
                  <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: f.thumbnail_url ? 'transparent' : `${typeColor}15` }}>
                    {f.thumbnail_url
                      ? <div style={{ width: '100%', height: '100%', backgroundImage: `url(${f.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: typeColor, opacity: 0.5 }} /></div>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: f.published ? 'rgba(6,182,212,0.15)' : 'rgba(240,244,255,0.06)', color: f.published ? CYAN : SILVER, flexShrink: 0 }}>
                        {f.published ? 'Publié' : 'Brouillon'}
                      </span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${typeColor}18`, color: typeColor, flexShrink: 0, fontWeight: 600 }}>{typeLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: SILVER }}>
                      <span>{students} élève{students !== 1 ? 's' : ''}</span>
                      <span>{revenue}€ générés</span>
                      <span>{f.price === 0 ? 'Gratuit' : `${f.price}€/accès`}</span>
                      {f.level && <span>{f.level}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => togglePublish(f.id, f.published)} title={f.published ? 'Dépublier' : 'Publier'}
                      style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(240,244,255,0.1)', background: 'transparent', color: f.published ? CYAN : SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {f.published ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <Link href={`/coach/formations/${f.id}`} title="Modifier"
                      style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = CREAM}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = SILVER}>
                      <Edit2 size={15} />
                    </Link>
                    <button onClick={() => setDeleteModal({ id: f.id, title: f.title })} title="Supprimer"
                      style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.5)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── Delete modal ──────────────────────────────────── */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,9,14,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#07070f', border: '1px solid rgba(240,244,255,0.1)', borderRadius: 20, padding: '36px 40px', maxWidth: 400, width: '90%', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Trash2 size={20} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: CREAM, marginBottom: 10, letterSpacing: '-0.3px' }}>Supprimer ce contenu ?</h3>
            <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.6, marginBottom: 6 }}>Vous êtes sur le point de supprimer</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 24 }}>"{deleteModal.title}"</p>
            <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.7)', marginBottom: 28 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => deleteFormation(deleteModal.id)}
                style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'}>
                Oui, supprimer définitivement
              </button>
              <button onClick={() => setDeleteModal(null)}
                style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
