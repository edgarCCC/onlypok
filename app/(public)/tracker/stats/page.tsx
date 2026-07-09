'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Info, Trophy, Target, Zap, Clock, TrendingUp, Medal, Upload } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.22)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const GREEN  = '#4ade80'
const RED    = '#ef4444'
const GOLD   = '#fbbf24'

type TournamentRow = {
  buy_in_total: number
  net_profit: number
  prize_won: number
  bounties_won: number
  placement: number | null
  total_players: number | null
  duration_secs: number
  hands_played: number
  vpip_pct: number | null
  pfr_pct: number | null
  three_bet_pct: number | null
}

type StatDef = { key: string; label: string; desc: string; good: [number, number]; unit: string; color: string }

const STAT_DEFS: StatDef[] = [
  { key: 'vpip',    label: 'VPIP',     desc: 'Voluntarily Put money In Pot — % de mains jouées',   good: [22, 28], unit: '%', color: VIOLET },
  { key: 'pfr',     label: 'PFR',      desc: 'Pre-Flop Raise — % de raises avant le flop',         good: [18, 24], unit: '%', color: '#06b6d4' },
  { key: 'threebet', label: '3-Bet%',  desc: '% de fois tu 3-bettes face à un open',               good: [7, 11],  unit: '%', color: '#f59e0b' },
  { key: 'cbet',    label: 'C-Bet flop', desc: '% de continuation bet au flop',                    good: [55, 70], unit: '%', color: '#4ade80' },
  { key: 'af',      label: 'AF',       desc: 'Aggression Factor — ratio raise+bet / call',         good: [2, 4],   unit: '',  color: '#a78bfa' },
  { key: 'wtsd',    label: 'WTSD%',    desc: 'Went To ShowDown — % de fois tu vas à l\'abattage',  good: [24, 30], unit: '%', color: '#ec4899' },
  { key: 'wsd',     label: 'W$SD%',    desc: 'Won money at ShowDown — win rate à l\'abattage',     good: [50, 56], unit: '%', color: '#4ade80' },
  { key: 'hands',   label: 'Mains',    desc: 'Nombre de mains dans ton échantillon',               good: [50000, Infinity], unit: '', color: SILVER },
]

function StatBar({ value, good, color }: { value: number; good: [number, number]; color: string }) {
  const max = good[1] === Infinity ? Math.max(value, 100000) : good[1] * 2
  const pct = Math.min((value / max) * 100, 100)
  const inRange = value >= good[0] && (good[1] === Infinity ? true : value <= good[1])
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: inRange ? color : '#ef4444', borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600)
  if (h >= 100) return `${h}h`
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

export default function StatsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user,     setUser]     = useState<{ id: string } | null>(null)
  const [rows,     setRows]     = useState<TournamentRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [stats,    setStats]    = useState<Record<string, string>>({})
  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser({ id: user.id })
      const [tRes, pRes] = await Promise.all([
        supabase.from('tournament_results')
          .select('buy_in_total, net_profit, prize_won, bounties_won, placement, total_players, duration_secs, hands_played, vpip_pct, pfr_pct, three_bet_pct')
          .eq('user_id', user.id),
        supabase.from('profiles').select('privacy_prefs').eq('id', user.id).single(),
      ])
      setRows((tRes.data as TournamentRow[]) ?? [])
      const stored = (pRes.data as { privacy_prefs?: Record<string, Record<string, string>> })?.privacy_prefs?.stats ?? {}
      setStats(stored)
      setLoading(false)
    })()
  }, [supabase])

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { data: profile } = await supabase.from('profiles').select('privacy_prefs').eq('id', user.id).single()
    const current = (profile as { privacy_prefs?: Record<string, unknown> })?.privacy_prefs ?? {}
    await supabase.from('profiles').update({ privacy_prefs: { ...current, stats } }).eq('id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  /* ── Stats auto — calculées depuis les tournois importés ── */
  const auto = useMemo(() => {
    if (rows.length === 0) return null
    const n          = rows.length
    const totalBuyin = rows.reduce((a, r) => a + (Number(r.buy_in_total) || 0), 0)
    const netProfit  = rows.reduce((a, r) => a + (Number(r.net_profit) || 0), 0)
    const itmCount   = rows.filter(r => (Number(r.prize_won) || 0) + (Number(r.bounties_won) || 0) > 0).length
    const wins       = rows.filter(r => r.placement === 1).length
    const top3       = rows.filter(r => r.placement !== null && r.placement <= 3).length
    const totalHands = rows.reduce((a, r) => a + (r.hands_played || 0), 0)
    const totalSecs  = rows.reduce((a, r) => a + (r.duration_secs || 0), 0)
    const bestWin    = Math.max(...rows.map(r => (Number(r.prize_won) || 0) + (Number(r.bounties_won) || 0)))

    /* Moyennes pondérées par le nombre de mains (échantillons inégaux) */
    const weighted = (get: (r: TournamentRow) => number | null) => {
      let sum = 0, w = 0
      for (const r of rows) {
        const v = get(r)
        if (v === null || !r.hands_played) continue
        sum += v * r.hands_played
        w   += r.hands_played
      }
      return w > 0 ? sum / w : null
    }

    return {
      n,
      abi:      totalBuyin / n,
      roi:      totalBuyin > 0 ? (netProfit / totalBuyin) * 100 : 0,
      netProfit,
      itmPct:   (itmCount / n) * 100,
      wins, top3,
      totalHands, totalSecs, bestWin,
      vpip:     weighted(r => r.vpip_pct),
      pfr:      weighted(r => r.pfr_pct),
      threeBet: weighted(r => r.three_bet_pct),
      hourly:   totalSecs > 0 ? netProfit / (totalSecs / 3600) : 0,
    }
  }, [rows])

  const fmtPct = (v: number | null, digits = 1) => v === null ? '—' : `${v.toFixed(digits)}%`

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <style>{`
        @media (max-width: 700px) {
          .tstats-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .tstats-hud  { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 840, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Tracker
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px', fontFamily: 'var(--font-syne,sans-serif)' }}>Stats</h1>
        <p style={{ fontSize: 13, color: SILVER, margin: '0 0 28px' }}>
          Calculées automatiquement depuis tes tournois importés — plus rien à saisir.
        </p>

        {/* ── Stats MTT auto ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: SILVER }}>Chargement…</div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '40px 0', background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, marginBottom: 32 }}>
            <p style={{ color: SILVER, margin: '0 0 12px' }}>Connecte-toi pour voir tes stats</p>
            <Link href="/login" style={{ padding: '10px 24px', borderRadius: 9, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>
          </div>
        ) : !auto ? (
          <div style={{ textAlign: 'center', padding: '48px 0', background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, marginBottom: 32 }}>
            <Upload size={28} style={{ opacity: 0.2, marginBottom: 10 }} />
            <p style={{ color: SILVER, margin: '0 0 12px', fontSize: 13 }}>Aucun tournoi importé — tes stats se calculeront automatiquement dès le premier import.</p>
            <Link href="/tracker/import" style={{ padding: '10px 24px', borderRadius: 9, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Importer mes tournois</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Trophy size={14} color={GOLD} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: SILVER, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                MTT — {auto.n} tournois importés
              </h2>
            </div>

            <div className="tstats-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'ROI', value: `${auto.roi >= 0 ? '+' : ''}${auto.roi.toFixed(1)}%`, color: auto.roi >= 0 ? GREEN : RED, icon: TrendingUp },
                { label: 'Profit net', value: `${auto.netProfit >= 0 ? '+' : ''}${Math.round(auto.netProfit)}€`, color: auto.netProfit >= 0 ? GREEN : RED, icon: Target },
                { label: 'ITM', value: `${auto.itmPct.toFixed(1)}%`, color: CYAN, icon: Medal },
                { label: 'Buy-in moyen', value: `${auto.abi.toFixed(2)}€`, color: CREAM, icon: Zap },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <Icon size={12} color={color === CREAM ? SILVER : color} />
                    <span style={{ fontSize: 10, color: SILVER, fontWeight: 600, letterSpacing: '0.05em' }}>{label.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
            </div>

            <div className="tstats-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Victoires', value: `${auto.wins}`, sub: `${auto.top3} top 3`, color: GOLD },
                { label: 'Volume', value: auto.totalHands.toLocaleString('fr-FR'), sub: 'mains jouées', color: CREAM },
                { label: 'Temps de jeu', value: fmtDuration(auto.totalSecs), sub: `${(auto.hourly >= 0 ? '+' : '')}${auto.hourly.toFixed(1)}€/h`, color: CREAM },
                { label: 'Meilleur gain', value: `${Math.round(auto.bestWin)}€`, sub: 'un seul tournoi', color: GREEN },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: SILVER, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Préflop — pondéré par mains */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px', marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                Préflop — moyenne pondérée sur {auto.totalHands.toLocaleString('fr-FR')} mains
              </div>
              <div style={{ display: 'flex', gap: 'clamp(20px,6vw,64px)', flexWrap: 'wrap' }}>
                {[
                  { label: 'VPIP', value: auto.vpip, good: [20, 30] as [number, number], color: VIOLET },
                  { label: 'PFR', value: auto.pfr, good: [16, 25] as [number, number], color: CYAN },
                  { label: '3-Bet', value: auto.threeBet, good: [3, 9] as [number, number], color: '#f59e0b' },
                ].map(({ label, value, good, color }) => {
                  const inRange = value !== null && value >= good[0] && value <= good[1]
                  return (
                    <div key={label}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: value === null ? DIM : inRange ? color : '#f87171' }}>{fmtPct(value)}</div>
                      <div style={{ fontSize: 11, color: SILVER, marginTop: 2 }}>{label} <span style={{ color: DIM }}>· cible {good[0]}–{good[1]}%</span></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── HUD cash — saisie manuelle (complément) ── */}
        {user && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color={SILVER} />
                <h2 style={{ fontSize: 13, fontWeight: 700, color: SILVER, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>HUD cash — saisie manuelle</h2>
              </div>
              <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: 'none', background: saved ? '#4ade8033' : VIOLET, color: saved ? '#4ade80' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Save size={12} /> {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', marginBottom: 18 }}>
              <Info size={13} color={CYAN} />
              <span style={{ fontSize: 12, color: SILVER }}>Pour le cash game : reporte tes stats HM3/PT4. Fourchettes cibles 6-max NL 100BB.</span>
            </div>

            <div className="tstats-hud" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {STAT_DEFS.map(({ key, label, desc, good, unit, color }) => {
                const val = parseFloat(stats[key] || '0')
                const inRange = val > 0 && val >= good[0] && (good[1] === Infinity ? true : val <= good[1])
                const outRange = val > 0 && !inRange
                return (
                  <div key={key} style={{ background: CARD, border: `1px solid ${outRange ? 'rgba(239,68,68,0.25)' : BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 11, color: SILVER, lineHeight: 1.4 }}>{desc}</div>
                      </div>
                      <input
                        type="number" value={stats[key] ?? ''} step="0.1"
                        onChange={e => setStats(s => ({ ...s, [key]: e.target.value }))}
                        placeholder="—"
                        style={{ width: 70, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '6px 8px', color: inRange ? color : outRange ? '#ef4444' : CREAM, fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'right' }}
                      />
                    </div>
                    {val > 0 && <StatBar value={val} good={good} color={color} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: SILVER }}>
                      <span>Cible : {good[0]}{unit}–{good[1] === Infinity ? '∞' : good[1] + unit}</span>
                      {val > 0 && (
                        <span style={{ color: inRange ? color : '#ef4444', fontWeight: 700 }}>
                          {inRange ? '✓ Dans la fourchette' : outRange ? (val < good[0] ? '↑ Trop bas' : '↓ Trop haut') : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
