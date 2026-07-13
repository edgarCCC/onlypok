'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Info, Upload, BarChart2 } from 'lucide-react'
import { TrackerShell, Card, KpiStrip, SectionLabel, Empty, T, NUM, eur, pnlColor } from '@/components/tracker/ui'

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

type StatDef = { key: string; label: string; desc: string; good: [number, number]; unit: string }

const STAT_DEFS: StatDef[] = [
  { key: 'vpip',     label: 'VPIP',       desc: 'Voluntarily Put money In Pot — % de mains jouées',  good: [22, 28], unit: '%' },
  { key: 'pfr',      label: 'PFR',        desc: 'Pre-Flop Raise — % de raises avant le flop',        good: [18, 24], unit: '%' },
  { key: 'threebet', label: '3-Bet%',     desc: '% de fois tu 3-bettes face à un open',              good: [7, 11],  unit: '%' },
  { key: 'cbet',     label: 'C-Bet flop', desc: '% de continuation bet au flop',                     good: [55, 70], unit: '%' },
  { key: 'af',       label: 'AF',         desc: 'Aggression Factor — ratio raise+bet / call',        good: [2, 4],   unit: '' },
  { key: 'wtsd',     label: 'WTSD%',      desc: "Went To ShowDown — % de fois tu vas à l'abattage",  good: [24, 30], unit: '%' },
  { key: 'wsd',      label: 'W$SD%',      desc: "Won money at ShowDown — win rate à l'abattage",     good: [50, 56], unit: '%' },
  { key: 'hands',    label: 'Mains',      desc: 'Nombre de mains dans ton échantillon',              good: [50000, Infinity], unit: '' },
]

function StatBar({ value, good, ok }: { value: number; good: [number, number]; ok: boolean }) {
  const max = good[1] === Infinity ? Math.max(value, 100000) : good[1] * 2
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: ok ? T.green : T.red, borderRadius: 99, transition: 'width 0.5s ease' }} />
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
  const [user,    setUser]    = useState<{ id: string } | null>(null)
  const [rows,    setRows]    = useState<TournamentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats,   setStats]   = useState<Record<string, string>>({})
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)

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

  const fmtPct = (v: number | null, digits = 1) => v === null ? '—' : `${v.toFixed(digits)} %`

  return (
    <TrackerShell>
      {loading ? (
        <Card><div style={{ textAlign: 'center', padding: '60px 0', color: T.silver, fontSize: 13 }}>Chargement…</div></Card>
      ) : !user ? (
        <Card>
          <Empty icon={<BarChart2 size={40} color={T.cream} />} title="Connecte-toi pour voir tes stats"
            sub="ROI, ITM, stats préflop pondérées : tout est calculé depuis tes imports."
            cta={<Link href="/login" style={{ padding: '11px 24px', borderRadius: 10, background: T.violet, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>} />
        </Card>
      ) : !auto ? (
        <Card>
          <Empty icon={<Upload size={40} color={T.cream} />} title="Aucun tournoi importé"
            sub="Tes stats se calculeront automatiquement dès le premier import — plus rien à saisir."
            cta={<Link href="/tracker/import" style={{ padding: '11px 24px', borderRadius: 10, background: T.violet, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Importer mes tournois</Link>} />
        </Card>
      ) : (
        <>
          <SectionLabel>MTT — {auto.n} tournois importés</SectionLabel>
          <KpiStrip items={[
            { label: 'ROI',          value: `${auto.roi >= 0 ? '+' : ''}${auto.roi.toFixed(1)} %`, color: pnlColor(auto.roi) },
            { label: 'Profit net',   value: eur(auto.netProfit, { sign: true, dec: 0 }), color: pnlColor(auto.netProfit) },
            { label: 'ITM',          value: `${auto.itmPct.toFixed(1)} %`, color: T.cream, sub: 'gain ou bounty encaissé' },
            { label: 'Buy-in moyen', value: eur(auto.abi), color: T.cream },
          ]} />
          <KpiStrip items={[
            { label: 'Victoires',    value: String(auto.wins), color: T.gold, sub: `${auto.top3} top 3` },
            { label: 'Volume',       value: auto.totalHands.toLocaleString('fr-FR'), color: T.cream, sub: 'mains jouées' },
            { label: 'Temps de jeu', value: fmtDuration(auto.totalSecs), color: T.cream, sub: `${eur(auto.hourly, { sign: true })}/h` },
            { label: 'Meilleur gain', value: eur(auto.bestWin, { dec: 0 }), color: T.green, sub: 'un seul tournoi' },
          ]} />

          {/* Préflop pondéré */}
          <Card style={{ marginBottom: 28 }}>
            <SectionLabel>Préflop — moyenne pondérée sur {auto.totalHands.toLocaleString('fr-FR')} mains</SectionLabel>
            <div style={{ display: 'flex', gap: 'clamp(24px,7vw,72px)', flexWrap: 'wrap', paddingTop: 4 }}>
              {[
                { label: 'VPIP',  value: auto.vpip,     good: [20, 30] as [number, number] },
                { label: 'PFR',   value: auto.pfr,      good: [16, 25] as [number, number] },
                { label: '3-Bet', value: auto.threeBet, good: [3, 9]  as [number, number] },
              ].map(({ label, value, good }) => {
                const inRange = value !== null && value >= good[0] && value <= good[1]
                return (
                  <div key={label}>
                    <div style={{ fontSize: 28, fontWeight: 800, ...NUM, color: value === null ? T.dim : inRange ? T.green : T.amber }}>{fmtPct(value)}</div>
                    <div style={{ fontSize: 11, color: T.silver, marginTop: 3 }}>{label} <span style={{ color: T.dim }}>· cible {good[0]}–{good[1]} %</span></div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* HUD cash — saisie manuelle */}
          <SectionLabel right={
            <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: 8, border: 'none', background: saved ? 'rgba(34,197,94,0.15)' : T.violet, color: saved ? T.green : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={12} /> {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
            </button>
          }>
            HUD cash — saisie manuelle
          </SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.16)', marginBottom: 14 }}>
            <Info size={13} color={T.blue} />
            <span style={{ fontSize: 12, color: T.silver }}>Pour le cash game : reporte tes stats HM3/PT4. Fourchettes cibles 6-max NL 100BB.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {STAT_DEFS.map(({ key, label, desc, good, unit }) => {
              const val = parseFloat(stats[key] || '0')
              const inRange = val > 0 && val >= good[0] && (good[1] === Infinity ? true : val <= good[1])
              const outRange = val > 0 && !inRange
              return (
                <Card key={key} style={{ borderColor: outRange ? 'rgba(248,113,113,0.3)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.cream, marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 11, color: T.silver, lineHeight: 1.45 }}>{desc}</div>
                    </div>
                    <input
                      type="number" value={stats[key] ?? ''} step="0.1"
                      onChange={e => setStats(s => ({ ...s, [key]: e.target.value }))}
                      placeholder="—"
                      style={{
                        width: 72, flexShrink: 0, background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 8px',
                        color: inRange ? T.green : outRange ? T.red : T.cream,
                        fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'right', ...NUM,
                      }}
                    />
                  </div>
                  {val > 0 && <StatBar value={val} good={good} ok={inRange} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 10.5, color: T.dim }}>
                    <span>Cible : {good[0]}{unit}–{good[1] === Infinity ? '∞' : good[1] + unit}</span>
                    {val > 0 && (
                      <span style={{ color: inRange ? T.green : T.red, fontWeight: 700 }}>
                        {inRange ? 'Dans la fourchette' : val < good[0] ? 'Trop bas' : 'Trop haut'}
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </TrackerShell>
  )
}
