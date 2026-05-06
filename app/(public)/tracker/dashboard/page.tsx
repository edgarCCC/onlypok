'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Upload, TrendingUp, TrendingDown,
  Trophy, Zap, Target, Clock, BarChart2, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  Cell,
} from 'recharts'

// ── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#07090e'
const SURFACE = 'rgba(255,255,255,0.025)'
const BORDER  = 'rgba(255,255,255,0.07)'
const CREAM   = '#f0f4ff'
const SILVER  = 'rgba(240,244,255,0.5)'
const DIM     = 'rgba(240,244,255,0.22)'
const VIOLET  = '#7c3aed'
const CYAN    = '#06b6d4'
const GREEN   = '#4ade80'
const RED     = '#ef4444'
const AMBER   = '#f59e0b'
const GOLD    = '#fbbf24'

const PERIODS = [
  { key: '7',   label: '7j' },
  { key: '30',  label: '30j' },
  { key: '90',  label: '90j' },
  { key: 'all', label: 'Tout' },
]

const FORMAT_META: Record<string, { label: string; color: string }> = {
  mystery_ko: { label: 'Mystery KO', color: '#c084fc' },
  space_ko:   { label: 'Space KO',   color: CYAN },
  ko:         { label: 'KO',         color: '#f87171' },
  classic:    { label: 'Classique',  color: SILVER },
  spin_rush:  { label: 'Spin & Rush', color: '#fb923c' },
}

type Row = {
  id: string
  tournament_id: string
  tournament_name: string
  date: string
  buy_in_total: number
  buy_in_bounty: number
  placement: number | null
  total_players: number | null
  prize_won: number
  bounties_won: number
  net_profit: number
  duration_secs: number
  hands_played: number
  vpip_pct: number | null
  pfr_pct: number | null
  three_bet_pct: number | null
  type: string
  speed: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtEuro(n: number) {
  const s = Math.abs(n).toFixed(2)
  return (n >= 0 ? '+' : '-') + s + '€'
}
function fmtDuration(secs: number) {
  if (!secs) return '-'
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}
function ordinal(n: number) {
  return n === 1 ? '1er' : `${n}e`
}
function detectFormat(name: string, buyInBounty: number): string {
  const u = name.toUpperCase()
  if (u.includes('MYSTERY') || u.includes('MYSTÈRE')) return 'mystery_ko'
  if (u.includes('SPACE')) return 'space_ko'
  if (buyInBounty > 0) return 'ko'
  return 'classic'
}
function placementColor(p: number, total: number) {
  const pct = p / total
  if (p === 1) return GOLD
  if (p <= 3) return AMBER
  if (pct <= 0.1) return GREEN
  if (pct <= 0.2) return CYAN
  return SILVER
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function BankrollTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div style={{ background: '#0f1520', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(12px)' }}>
      <p style={{ fontSize: 11, color: DIM, margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 800, color: val >= 0 ? GREEN : RED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        {fmtEuro(val)}
      </p>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div style={{ background: '#0f1520', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ fontSize: 10, color: DIM, margin: '0 0 2px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 800, color: val >= 0 ? GREEN : RED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(val)}</p>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType
}) {
  return (
    <div style={{
      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
      padding: '20px 22px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: DIM }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: DIM, margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TrackerDashboard() {
  const [period, setPeriod]   = useState('all')
  const [rows,   setRows]     = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId]   = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('tournament_results')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      setRows((data ?? []) as Row[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (period === 'all') return rows
    const days = parseInt(period)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return rows.filter(r => new Date(r.date) >= cutoff)
  }, [rows, period])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalBuyIn    = useMemo(() => filtered.reduce((a, r) => a + (r.buy_in_total ?? 0), 0), [filtered])
  const totalProfit   = useMemo(() => filtered.reduce((a, r) => a + (r.net_profit ?? 0), 0), [filtered])
  const roi           = totalBuyIn > 0 ? (totalProfit / totalBuyIn) * 100 : 0
  const itm           = filtered.length > 0
    ? filtered.filter(r => (r.prize_won ?? 0) > 0).length / filtered.length * 100
    : 0
  const vpipRows      = filtered.filter(r => r.vpip_pct !== null)
  const avgVpip       = vpipRows.length > 0
    ? vpipRows.reduce((a, r) => a + r.vpip_pct!, 0) / vpipRows.length
    : null
  const totalDuration = filtered.reduce((a, r) => a + (r.duration_secs ?? 0), 0)

  // ── Chart data ────────────────────────────────────────────────────────────
  const bankrollData = useMemo(() => {
    let cumul = 0
    return [...filtered].reverse().map(r => {
      cumul = Math.round((cumul + r.net_profit) * 100) / 100
      const d = new Date(r.date)
      return {
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        fullDate: d.toLocaleDateString('fr-FR'),
        cumul,
      }
    })
  }, [filtered])

  const barData = useMemo(() =>
    [...filtered].slice(0, 30).reverse().map(r => ({
      name: r.tournament_name.length > 18 ? r.tournament_name.slice(0, 16) + '…' : r.tournament_name,
      profit: Math.round(r.net_profit * 100) / 100,
    })),
    [filtered]
  )

  const isPositive = totalProfit >= 0

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!loading && filtered.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>
        <Navbar />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '100px 24px 80px' }}>
          <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 40 }}>
            <ArrowLeft size={14} /> Retour
          </Link>
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: `${VIOLET}15`, border: `1px solid ${VIOLET}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <BarChart2 size={28} color={VIOLET} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>Aucune donnée</h2>
            <p style={{ fontSize: 14, color: SILVER, margin: '0 0 28px', lineHeight: 1.6 }}>
              {!userId ? 'Connecte-toi pour voir ton dashboard.' : 'Importe tes fichiers Winamax pour commencer.'}
            </p>
            <Link href={userId ? '/tracker/import' : '/login'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
              <Upload size={15} /> {userId ? 'Importer Winamax' : 'Se connecter'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>
      <Navbar />

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 24px 80px' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: DIM, textDecoration: 'none', fontSize: 12, marginBottom: 10 }}>
              <ArrowLeft size={12} /> Tracker
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.8px', margin: 0 }}>
              Dashboard{' '}
              <span style={{ background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Tournois
              </span>
            </h1>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Import button */}
            <Link href="/tracker/import" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              border: `1px solid ${VIOLET}50`, background: `${VIOLET}15`,
              color: '#c4b5fd', textDecoration: 'none', fontSize: 13, fontWeight: 700,
              transition: 'all 0.15s',
            }}>
              <Upload size={13} /> Importer
            </Link>

            {/* Period tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 10, border: `1px solid ${BORDER}` }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                  background: period === p.key ? VIOLET : 'transparent',
                  color: period === p.key ? '#fff' : SILVER,
                }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI cards ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
          <KpiCard
            label="Profit net" icon={isPositive ? TrendingUp : TrendingDown}
            value={`${isPositive ? '+' : ''}${totalProfit.toFixed(2)}€`}
            color={isPositive ? GREEN : RED}
            sub={`Buy-in total : ${totalBuyIn.toFixed(2)}€`}
          />
          <KpiCard
            label="ROI" icon={BarChart2}
            value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`}
            color={roi >= 0 ? GREEN : RED}
            sub={`${filtered.length} tournoi${filtered.length > 1 ? 's' : ''}`}
          />
          <KpiCard
            label="ITM" icon={Trophy}
            value={`${itm.toFixed(1)}%`}
            color={itm >= 15 ? GREEN : itm >= 10 ? AMBER : RED}
            sub={`${filtered.filter(r => (r.prize_won ?? 0) > 0).length} places payées`}
          />
          <KpiCard
            label="VPIP moyen" icon={Target}
            value={avgVpip !== null ? `${avgVpip.toFixed(1)}%` : '—'}
            color={avgVpip !== null && avgVpip >= 20 && avgVpip <= 30 ? GREEN : VIOLET}
            sub="Cible 20–30%"
          />
          <KpiCard
            label="Temps de jeu" icon={Clock}
            value={fmtDuration(totalDuration)}
            color={CYAN}
            sub={`${filtered.reduce((a, r) => a + (r.hands_played ?? 0), 0).toLocaleString('fr')} mains`}
          />
        </div>

        {/* ── Bankroll curve ──────────────────────────────────────────────── */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '28px 28px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>Courbe de bankroll</h2>
              <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Profit cumulatif sur la période</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: isPositive ? GREEN : RED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {isPositive ? '+' : ''}{totalProfit.toFixed(2)}€
              </p>
              <p style={{ fontSize: 11, color: DIM, margin: 0 }}>{filtered.length} tournois</p>
            </div>
          </div>

          {loading ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, border: `2px solid ${VIOLET}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={bankrollData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? VIOLET : RED} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={isPositive ? CYAN : RED} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={VIOLET} />
                    <stop offset="100%" stopColor={CYAN} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date" tick={{ fill: DIM, fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(bankrollData.length / 8) - 1)}
                />
                <YAxis
                  tick={{ fill: DIM, fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v >= 0 ? '+' : ''}${v}€`}
                  width={60}
                />
                <Tooltip content={<BankrollTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <Area
                  type="monotone" dataKey="cumul"
                  stroke="url(#lineGradient)" strokeWidth={2.5}
                  fill="url(#bankrollGradient)"
                  dot={false} activeDot={{ r: 5, fill: VIOLET, stroke: BG, strokeWidth: 2 }}
                  animationDuration={600} animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Per-tournament bars ─────────────────────────────────────────── */}
        {barData.length > 0 && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '28px 28px 16px', marginBottom: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>Résultats par tournoi</h2>
              <p style={{ fontSize: 12, color: DIM, margin: 0 }}>30 derniers tournois</p>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={barData.length > 20 ? 6 : 10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis tick={{ fill: DIM, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} width={48} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                <Bar dataKey="profit" radius={[3, 3, 0, 0]} animationDuration={500}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.profit >= 0 ? `${GREEN}cc` : `${RED}cc`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── All tournaments (scrollable) ────────────────────────────────── */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}>
          {/* Section header */}
          <div style={{ padding: '22px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>Historique des tournois</h2>
              <p style={{ fontSize: 11, color: DIM, margin: 0 }}>{filtered.length} tournoi{filtered.length > 1 ? 's' : ''} sur la période</p>
            </div>
          </div>

          {/* Sticky table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px 70px 80px',
            padding: '12px 28px', marginTop: 16,
            background: 'rgba(255,255,255,0.03)',
            borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            {['Tournoi', 'Date', 'Position', 'KO', 'Durée', 'Profit'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: DIM }}>{h}</span>
            ))}
          </div>

          {/* Scrollable rows */}
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map((r, i) => {
              const profit = r.net_profit ?? 0
              const fmt = detectFormat(r.tournament_name, r.buy_in_bounty ?? 0)
              const fmtMeta = FORMAT_META[fmt]
              const hasPlacement = r.placement && r.total_players
              const pColor = hasPlacement ? placementColor(r.placement!, r.total_players!) : DIM
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px 70px 80px',
                    padding: '13px 28px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  {/* Name + format */}
                  <div style={{ minWidth: 0, paddingRight: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.tournament_name}
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, color: fmtMeta.color, background: `${fmtMeta.color}15`, border: `1px solid ${fmtMeta.color}28` }}>
                      {fmtMeta.label}{r.speed ? ` · ${r.speed}` : ''}
                    </span>
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 12, color: SILVER, display: 'flex', alignItems: 'center' }}>
                    {new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </span>

                  {/* Placement */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {hasPlacement ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: pColor, display: 'flex', alignItems: 'center', gap: 3 }}>
                        {r.placement === 1 && <Trophy size={10} color={GOLD} />}
                        {ordinal(r.placement!)}<span style={{ fontWeight: 400, color: DIM }}>/{r.total_players}</span>
                      </span>
                    ) : <span style={{ fontSize: 12, color: DIM }}>-</span>}
                  </div>

                  {/* KO */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {(r.bounties_won ?? 0) > 0 ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: AMBER, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={10} color={AMBER} /> {r.bounties_won!.toFixed(2)}€
                      </span>
                    ) : <span style={{ fontSize: 12, color: DIM }}>-</span>}
                  </div>

                  {/* Duration */}
                  <span style={{ fontSize: 12, color: SILVER, display: 'flex', alignItems: 'center' }}>
                    {fmtDuration(r.duration_secs ?? 0)}
                  </span>

                  {/* Profit */}
                  <span style={{
                    fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center',
                    color: profit > 0 ? GREEN : profit < 0 ? RED : SILVER,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {profit > 0 ? '+' : profit < 0 ? '-' : ''}{Math.abs(profit).toFixed(2)}€
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.35); border-radius: 99px }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.6) }
      `}</style>
    </div>
  )
}
