'use client'
import { useEffect, useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import Link from 'next/link'
import {
  TrendingUp, Download, ExternalLink, AlertCircle,
  BookOpen, Video, Users, ArrowLeft, ArrowUpRight,
} from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const MUTED  = 'rgba(240,244,255,0.22)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'
const BG     = '#04040a'

const TYPE_COLOR: Record<string, string> = { formation: VIOLET, video: CYAN, coaching: AMBER }
const TYPE_LABEL: Record<string, string> = { formation: 'Formation', video: 'Vidéo', coaching: 'Coaching' }

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'rgba(232,228,220,0.03)',
  border: '1px solid rgba(232,228,220,0.07)',
  borderRadius: 16, padding: 24, ...extra,
})

function RevenueChart({ data }: { data: { month: string; rev: number }[] }) {
  const max = Math.max(...data.map(d => d.rev), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingBottom: 24 }}>
      {data.map(d => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 9, color: VIOLET, fontWeight: 700 }}>{d.rev > 0 ? `${d.rev}€` : ''}</span>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            background: `linear-gradient(to top, ${VIOLET}, ${VIOLET}55)`,
            height: `${Math.max((d.rev / max) * 90, d.rev > 0 ? 4 : 2)}px`,
            opacity: d.rev > 0 ? 1 : 0.1, transition: 'height 0.5s ease',
          }} />
          <span style={{ fontSize: 9, color: SILVER }}>{d.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function RevenuePage() {
  const { user } = useUser()
  const [loading, setLoading]   = useState(true)
  const [purchases, setPurchases] = useState<any[]>([])
  const [filter, setFilter]     = useState<'all' | 'formation' | 'video' | 'coaching'>('all')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    if (!user) return
    fetch('/api/coach/purchases?limit=100')
      .then(r => r.ok ? r.json() : { purchases: [] })
      .then(d => { setPurchases(d.purchases ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  const normalize = (p: any) => {
    const formation    = Array.isArray(p.formations) ? p.formations[0] : (p.formations ?? null)
    const student      = Array.isArray(p.profiles)   ? p.profiles[0]   : (p.profiles   ?? null)
    const feePct       = p.platform_fee_pct ?? (formation?.content_type === 'coaching' ? 8 : 0)
    // net_amount = ce que touche le coach (stocké depuis verify-session)
    // fallback : amount_paid / (1 + fee%) ou prix actuel de la formation
    const gross = p.amount_paid != null ? p.amount_paid : (formation?.price ?? 0)
    const net   = p.net_amount  != null
      ? p.net_amount
      : feePct > 0 ? Math.round(gross / (1 + feePct / 100)) : gross
    const fee   = gross - net
    return { ...p, formation, student, gross, net, fee, feePct, revenue: net }
  }

  const normalized = useMemo(() => purchases.map(normalize), [purchases])

  const now          = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const totalGross    = normalized.reduce((a, p) => a + p.gross, 0)
  const totalFees     = normalized.reduce((a, p) => a + p.fee, 0)
  const totalRevenue  = normalized.reduce((a, p) => a + p.net, 0)   // net coach
  const totalSales    = normalized.length
  const revenueMonth  = normalized.filter(p => p.created_at?.slice(0, 7) === thisMonthKey).reduce((a, p) => a + p.net, 0)
  const avgPerSale    = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0

  const monthly12 = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now); d.setMonth(d.getMonth() - (11 - i))
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    const rev   = normalized.filter(p => p.created_at?.slice(0, 7) === key).reduce((a, p) => a + p.revenue, 0)
    return { month: label, rev }
  })

  const byType = ['formation', 'video', 'coaching'].map(type => {
    const list = normalized.filter(p => (p.formation?.content_type ?? 'formation') === type)
    return { type, rev: list.reduce((a, p) => a + p.revenue, 0), sales: list.length }
  })

  const filtered = useMemo(() => {
    let list = normalized
    if (filter !== 'all') list = list.filter(p => (p.formation?.content_type ?? 'formation') === filter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(p =>
      (p.student?.username ?? '').toLowerCase().includes(q) ||
      (p.formation?.title ?? '').toLowerCase().includes(q),
    )
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [normalized, filter, search])

  const MICRO_THRESHOLD = 77700
  const pct = Math.min((totalRevenue / MICRO_THRESHOLD) * 100, 100)

  const exportCSV = () => {
    const rows = [
      ['Date', 'Élève', 'Formation', 'Type', 'Montant'],
      ...normalized.map(p => [
        new Date(p.created_at).toLocaleDateString('fr-FR'),
        p.student?.username ?? '—',
        p.formation?.title ?? '—',
        TYPE_LABEL[p.formation?.content_type ?? 'formation'] ?? '—',
        `${p.revenue}€`,
      ]),
    ]
    const csv  = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'revenus-onlypok.csv'; a.click()
  }

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 35% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)` }} />
      <style>{`
        @media (max-width: 860px) {
          .rev-container { padding: 24px 16px !important; }
          .rev-title { font-size: 32px !important; }
          .rev-kpis { grid-template-columns: 1fr 1fr !important; }
          .rev-table-scroll { overflow-x: auto; }
          .rev-table-row { min-width: 680px; }
          .rev-filters { flex-wrap: wrap !important; }
        }
        @media (max-width: 700px) {
          .rev-recap { grid-template-columns: 1fr !important; }
          .rev-types { grid-template-columns: 1fr !important; }
          .rev-admin { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="rev-container" style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <Link href="/coach/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: SILVER, textDecoration: 'none', marginBottom: 16 }}>
            <ArrowLeft size={13} /> Tableau de bord
          </Link>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Revenus</p>
          <h1 className="rev-title" style={{ fontSize: 44, fontWeight: 700, color: CREAM, letterSpacing: '-1px', lineHeight: 1, fontFamily: 'var(--font-syne,sans-serif)', margin: 0 }}>
            Mes revenus
          </h1>
        </div>

        {/* KPIs */}
        <div className="rev-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Net coach',      value: `${totalRevenue}€`,                              sub: 'après commission',       color: VIOLET },
            { label: 'Ce mois-ci',     value: `${revenueMonth}€`,                              sub: now.toLocaleDateString('fr-FR', { month: 'long' }), color: CYAN },
            { label: 'Ventes totales', value: totalSales,                                       sub: 'transactions',           color: AMBER },
            { label: 'Panier moyen',   value: totalSales > 0 ? `${avgPerSale}€` : '—',         sub: 'net par vente',          color: '#a855f7' },
          ].map(k => (
            <div key={k.label} style={card({ position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 100% 0%, ${k.color}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{k.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: SILVER }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Récap brut / commission / net */}
        {totalGross > 0 && (
          <div className="rev-recap" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, marginBottom: 24, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Encaissé (brut Stripe)', value: `${totalGross}€`, color: SILVER, sub: 'payé par les élèves' },
              { label: 'Commission OnlyPok',      value: `-${totalFees}€`, color: '#ef4444', sub: 'frais de plateforme' },
              { label: 'Net coach',               value: `${totalRevenue}€`, color: VIOLET, sub: 'votre revenu réel' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.025)', padding: '14px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: '-0.5px', marginBottom: 3 }}>{k.value}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{k.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Graphe 12 mois */}
        <div style={{ ...card(), marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>Revenus sur 12 mois</h2>
            <span style={{ fontSize: 11, color: SILVER }}>{monthly12.reduce((a, d) => a + d.rev, 0)}€ sur la période</span>
          </div>
          {totalRevenue === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TrendingUp size={28} color={SILVER} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ color: SILVER, fontSize: 13 }}>Pas encore de vente</p>
            </div>
          ) : <RevenueChart data={monthly12} />}
        </div>

        {/* Par type */}
        <div className="rev-types" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {byType.map(({ type, rev, sales }) => {
            const icons: Record<string, React.ElementType> = { formation: BookOpen, video: Video, coaching: Users }
            const c = TYPE_COLOR[type]; const Icon = icons[type]
            return (
              <div key={type} style={card({ position: 'relative', overflow: 'hidden' })}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 100% 0%, ${c}08 0%, transparent 60%)`, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={c} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: CREAM }}>{TYPE_LABEL[type]}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c, letterSpacing: '-0.5px', marginBottom: 6 }}>{rev}€</div>
                <div style={{ fontSize: 11, color: SILVER }}>{sales} vente{sales !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>

        {/* ── Historique des transactions ── */}
        <div style={{ ...card(), marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>
              Historique des transactions
              {filtered.length !== normalized.length && (
                <span style={{ fontSize: 11, color: SILVER, fontWeight: 400, marginLeft: 8 }}>{filtered.length} / {normalized.length}</span>
              )}
            </h2>
            <div className="rev-filters" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Filtre type */}
              {(['all', 'formation', 'video', 'coaching'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                    border: `1px solid ${filter === t ? (t === 'all' ? VIOLET : TYPE_COLOR[t]) : 'rgba(255,255,255,0.08)'}`,
                    background: filter === t ? (t === 'all' ? `${VIOLET}18` : `${TYPE_COLOR[t]}18`) : 'transparent',
                    color: filter === t ? (t === 'all' ? VIOLET : TYPE_COLOR[t]) : SILVER,
                    transition: 'all 0.12s',
                  }}
                >
                  {t === 'all' ? 'Tout' : TYPE_LABEL[t]}
                </button>
              ))}
              {/* Recherche */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Élève ou formation…"
                style={{
                  fontSize: 11, padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: CREAM, outline: 'none', width: 160,
                }}
              />
              <button
                onClick={exportCSV}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: SILVER, cursor: 'pointer' }}
              >
                <Download size={12} /> CSV
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: SILVER, fontSize: 13 }}>
              {normalized.length === 0 ? 'Aucune vente pour le moment.' : 'Aucun résultat.'}
            </div>
          ) : (
            <div className="rev-table-scroll">
              {/* Header tableau */}
              <div className="rev-table-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 100px 90px 80px', gap: 10, padding: '6px 12px', marginBottom: 4 }}>
                {['Date', 'Élève', 'Formation', 'Type', 'Brut', 'Net coach', ''].map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map((p, i) => {
                  const type    = p.formation?.content_type ?? 'formation'
                  const c       = TYPE_COLOR[type] ?? VIOLET
                  const date    = new Date(p.created_at)
                  const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  const price   = p.net
                  return (
                    <div
                      key={p.id ?? i}
                      className="rev-table-row"
                      style={{
                        display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 100px 90px 80px',
                        gap: 10, padding: '11px 12px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.018)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        alignItems: 'center',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.032)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.018)'}
                    >
                      {/* Date */}
                      <div>
                        <div style={{ fontSize: 12, color: CREAM, fontWeight: 500 }}>{dateStr}</div>
                        <div style={{ fontSize: 10, color: MUTED }}>{timeStr}</div>
                      </div>

                      {/* Élève */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: c, flexShrink: 0 }}>
                          {(p.student?.username ?? '?')[0].toUpperCase()}
                        </div>
                        <Link
                          href={`/coach/messages?student_id=${p.student?.id ?? ''}`}
                          style={{ fontSize: 12, fontWeight: 600, color: CREAM, textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {p.student?.username ?? 'Élève'}
                        </Link>
                      </div>

                      {/* Formation */}
                      <span style={{ fontSize: 12, color: SILVER, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.formation?.title ?? '—'}
                      </span>

                      {/* Type badge */}
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 99,
                        background: `${c}18`, color: c,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        width: 'fit-content',
                      }}>
                        {TYPE_LABEL[type] ?? type}
                      </span>

                      {/* Brut */}
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: SILVER }}>
                          {p.gross > 0 ? `${p.gross}€` : 'Gratuit'}
                        </span>
                        {p.fee > 0 && (
                          <div style={{ fontSize: 10, color: '#ef444488' }}>-{p.fee}€ frais</div>
                        )}
                      </div>

                      {/* Net coach */}
                      <span style={{ fontSize: 14, fontWeight: 800, color: price > 0 ? VIOLET : SILVER }}>
                        {price > 0 ? `${price}€` : '—'}
                      </span>

                      {/* Action */}
                      {type === 'coaching' ? (
                        <Link
                          href="/coach/requests"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: AMBER, textDecoration: 'none', padding: '4px 8px', borderRadius: 6, border: `1px solid ${AMBER}30`, background: `${AMBER}0a`, whiteSpace: 'nowrap' }}
                        >
                          Planifier <ArrowUpRight size={10} />
                        </Link>
                      ) : (
                        <Link
                          href={`/coach/messages?student_id=${p.student?.id ?? ''}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: VIOLET, textDecoration: 'none', padding: '4px 8px', borderRadius: 6, border: `1px solid ${VIOLET}30`, background: `${VIOLET}0a`, whiteSpace: 'nowrap' }}
                        >
                          Message <ArrowUpRight size={10} />
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Seuil micro-entrepreneur */}
        <div style={{ height: 1, background: 'rgba(232,228,220,0.07)', marginBottom: 24 }} />
        <p style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>Paperasse officielle</p>

        <div style={{ ...card({ marginBottom: 16 }), borderColor: pct > 80 ? 'rgba(245,158,11,0.25)' : 'rgba(232,228,220,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 4px' }}>Seuil micro-entrepreneur</h3>
              <p style={{ fontSize: 12, color: SILVER, margin: 0 }}>Plafond BNC 2024 pour les prestations de services</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: pct > 80 ? 'rgba(245,158,11,0.15)' : 'rgba(232,228,220,0.06)', color: pct > 80 ? AMBER : SILVER }}>
              {pct > 80 ? 'Attention' : 'OK'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(232,228,220,0.07)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? `linear-gradient(90deg, ${VIOLET}, ${AMBER})` : `linear-gradient(90deg, ${VIOLET}, ${CYAN})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: pct > 80 ? AMBER : CREAM, flexShrink: 0 }}>{totalRevenue}€ / {MICRO_THRESHOLD.toLocaleString('fr-FR')}€</span>
          </div>
          <p style={{ fontSize: 11, color: SILVER }}>Au-delà de 77 700€, vous passez au régime réel. Consultez un comptable.</p>
        </div>

        <div className="rev-admin" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertCircle size={16} color={CYAN} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>Déclaration URSSAF</h3>
            </div>
            <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.7, marginBottom: 14 }}>
              En tant qu'auto-entrepreneur, vous devez déclarer votre chiffre d'affaires mensuellement ou trimestriellement sur autoentrepreneur.urssaf.fr.
            </p>
            <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: CYAN, textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }}>
              Accéder <ExternalLink size={11} />
            </a>
          </div>
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertCircle size={16} color={VIOLET} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>TVA</h3>
            </div>
            <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.7, marginBottom: 14 }}>
              Sous le seuil de franchise en base (36 800€), vous n'êtes pas assujetti à la TVA. Vos prix sont TTC.
            </p>
            <a href="https://www.impots.gouv.fr" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: VIOLET, textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8 }}>
              impots.gouv.fr <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <p style={{ fontSize: 10, color: MUTED, textAlign: 'center', marginTop: 40, lineHeight: 1.8 }}>
          Ces informations sont indicatives et ne constituent pas un conseil fiscal.
          Consultez un expert-comptable pour votre situation personnelle.
        </p>
      </div>
    </div>
  )
}
