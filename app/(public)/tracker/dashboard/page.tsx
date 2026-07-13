'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Zap, BarChart2, Upload } from 'lucide-react'
import { SERIES_CFG, type SeriesKey } from './chartTokens'
import { TrackerShell, Card, KpiStrip, Seg, SectionLabel, FormatBadge, RoomDot, Th, Td, Empty, T, NUM, eur, pnlColor } from '@/components/tracker/ui'

// recharts est lourd (~90kb gzip) — chargé client-side uniquement
const TournamentCharts = dynamic(() => import('./TournamentCharts'), {
  ssr: false,
  loading: () => (
    <Card style={{ marginBottom: 14, height: 316, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${T.violet}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </Card>
  ),
})

const PERIODS = [
  { key: '7' as const,   label: '7 j' },
  { key: '30' as const,  label: '30 j' },
  { key: '90' as const,  label: '90 j' },
  { key: 'all' as const, label: 'Tout' },
]

type Row = {
  id: string
  tournament_id: string
  tournament_name: string
  date: string
  room: string
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

function fmtDuration(secs: number) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}
const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`)

function detectFormat(r: Row): string {
  if (r.type === 'Spin & Rush') return 'spin_rush'
  /* Betclic stocke le Tournament Type du header dans r.type (SKO, MKO…) */
  const tt = (r.type ?? '').toUpperCase()
  if (tt.includes('MKO') || tt.includes('MYSTERY')) return 'mystery_ko'
  if (tt.includes('KO') || tt.includes('BOUNTY')) return 'ko'
  const u = r.tournament_name.toUpperCase()
  if (u.includes('MYSTERY') || u.includes('MYSTÈRE')) return 'mystery_ko'
  if (u.includes('SPACE')) return 'space_ko'
  if ((r.buy_in_bounty ?? 0) > 0 || u.includes('PKO') || u.includes(' KO') || u.includes('BOUNTY') || u.includes('PROGRESSIF')) return 'ko'
  return 'classic'
}
function placementColor(p: number, total: number | null) {
  if (p === 1) return T.gold
  if (p <= 3) return T.amber
  if (!total) return T.silver
  const pct = p / total
  if (pct <= 0.1) return T.green
  if (pct <= 0.2) return T.blue
  return T.silver
}
function rowSeriesKey(r: Row): SeriesKey {
  const isSpin = r.type === 'Spin & Rush'
  if ((r.room ?? 'winamax') === 'betclic') return isSpin ? 'betclic_spin' : 'betclic_mtt'
  return isSpin ? 'winamax_spin' : 'winamax_mtt'
}

/* Agrégat d'un groupe de lignes → stats communes */
function agg(rows: Row[]) {
  const profit    = rows.reduce((a, r) => a + (r.net_profit ?? 0), 0)
  const buyIn     = rows.reduce((a, r) => a + (r.buy_in_total ?? 0), 0)
  const roi       = buyIn > 0 ? (profit / buyIn) * 100 : 0
  const itm       = rows.length > 0 ? rows.filter(r => (r.prize_won ?? 0) > 0).length / rows.length * 100 : 0
  const secs      = rows.reduce((a, r) => a + ((r.duration_secs ?? 0) > 0 ? r.duration_secs : 0), 0)
  const perHour   = secs > 0 ? profit / (secs / 3600) : null
  return { count: rows.length, profit, buyIn, roi, itm, perHour }
}

const GRID_BREAKDOWN = '110px 110px 1fr 90px 100px 80px 70px 90px'
const GRID_HISTORY   = '1fr 92px 64px 84px 92px 76px 64px 92px'

export default function TrackerDashboard() {
  const [period, setPeriod]   = useState<'7' | '30' | '90' | 'all'>('all')
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
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - parseInt(period))
    return rows.filter(r => new Date(r.date) >= cutoff)
  }, [rows, period])

  const total = useMemo(() => agg(filtered), [filtered])
  const vpipRows = filtered.filter(r => r.vpip_pct !== null)
  const avgVpip  = vpipRows.length > 0 ? vpipRows.reduce((a, r) => a + r.vpip_pct!, 0) / vpipRows.length : null
  const totalDuration = filtered.reduce((a, r) => a + (r.duration_secs ?? 0), 0)
  const totalHands    = filtered.reduce((a, r) => a + (r.hands_played ?? 0), 0)

  /* Room × format, avec sous-totaux par room */
  const breakdown = useMemo(() => {
    const byRoom = new Map<string, Row[]>()
    for (const r of filtered) {
      const room = r.room || 'winamax'
      if (!byRoom.has(room)) byRoom.set(room, [])
      byRoom.get(room)!.push(r)
    }
    return [...byRoom.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([room, roomRows]) => {
        const byFmt = new Map<string, Row[]>()
        for (const r of roomRows) {
          const f = detectFormat(r)
          if (!byFmt.has(f)) byFmt.set(f, [])
          byFmt.get(f)!.push(r)
        }
        return {
          room,
          total: agg(roomRows),
          formats: [...byFmt.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .map(([fmt, rows]) => ({ fmt, ...agg(rows) })),
        }
      })
  }, [filtered])

  /* Données des courbes (inchangé) */
  const multiLineData = useMemo(() => {
    const byKey: Record<string, Row[]> = Object.fromEntries(SERIES_CFG.map(s => [s.key, []]))
    for (const r of filtered) byKey[rowSeriesKey(r)].push(r)
    for (const rows of Object.values(byKey)) rows.sort((a, b) => a.date.localeCompare(b.date))
    const cumulByDate: Record<string, Record<string, number>> = {}
    for (const s of SERIES_CFG) {
      cumulByDate[s.key] = {}
      let cumul = 0
      for (const r of byKey[s.key]) {
        cumul = Math.round((cumul + r.net_profit) * 100) / 100
        cumulByDate[s.key][r.date] = cumul
      }
    }
    const allDates = [...new Set(filtered.map(r => r.date))].sort()
    const lastVal: Record<string, number | null> = Object.fromEntries(SERIES_CFG.map(s => [s.key, null]))
    return allDates.map(date => {
      const d = new Date(date)
      const entry: Record<string, unknown> = { date: `${d.getDate()}/${d.getMonth() + 1}` }
      for (const s of SERIES_CFG) {
        if (cumulByDate[s.key][date] !== undefined) lastVal[s.key] = cumulByDate[s.key][date]
        entry[s.key] = lastVal[s.key]
      }
      return entry
    })
  }, [filtered])

  const activeSeries = useMemo(
    () => SERIES_CFG.filter(s => multiLineData.some(d => d[s.key] !== null)),
    [multiLineData]
  )
  const lastIdx = useMemo(() => {
    const result: Record<string, number> = {}
    for (const s of SERIES_CFG) {
      let idx = -1
      for (let i = multiLineData.length - 1; i >= 0; i--) {
        if (multiLineData[i][s.key] !== null) { idx = i; break }
      }
      result[s.key] = idx
    }
    return result
  }, [multiLineData])
  const barData = useMemo(() =>
    [...filtered].slice(0, 30).reverse().map(r => ({
      name: r.tournament_name.length > 18 ? r.tournament_name.slice(0, 16) + '…' : r.tournament_name,
      profit: Math.round(r.net_profit * 100) / 100,
    })),
    [filtered]
  )

  const isPositive = total.profit >= 0

  if (!loading && rows.length === 0) {
    return (
      <TrackerShell>
        <Card>
          <Empty
            icon={<BarChart2 size={40} color={T.cream} />}
            title={userId ? 'Aucun tournoi importé' : 'Connecte-toi pour voir ton dashboard'}
            sub={userId
              ? 'Glisse tes fichiers Winamax ou Betclic dans l’import : résultats, ROI, ITM et stats préflop sont calculés automatiquement.'
              : 'Ton historique de tournois, tes courbes et tes stats t’attendent.'}
            cta={
              <Link href={userId ? '/tracker/import' : '/login'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, background: T.violet, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                <Upload size={14} /> {userId ? 'Importer mes résultats' : 'Se connecter'}
              </Link>
            }
          />
        </Card>
      </TrackerShell>
    )
  }

  return (
    <TrackerShell wide actions={<Seg options={PERIODS} value={period} onChange={setPeriod} />}>

      {/* ── KPIs ── */}
      <KpiStrip items={[
        { label: 'Profit net', value: eur(total.profit, { sign: true }), color: pnlColor(total.profit), sub: `Buy-in ${eur(total.buyIn)}` },
        { label: 'ROI',        value: `${total.roi >= 0 ? '+' : ''}${total.roi.toFixed(1)} %`, color: pnlColor(total.roi), sub: `${total.count} tournois` },
        { label: 'ITM',        value: `${total.itm.toFixed(1)} %`, color: total.itm >= 15 ? T.green : total.itm >= 10 ? T.amber : T.red, sub: `${filtered.filter(r => (r.prize_won ?? 0) > 0).length} places payées` },
        { label: 'VPIP moyen', value: avgVpip !== null ? `${avgVpip.toFixed(1)} %` : '—', color: T.cream, sub: 'cible 20–30 %' },
        { label: 'Volume',     value: totalHands.toLocaleString('fr-FR'), color: T.cream, sub: 'mains jouées' },
        { label: 'Temps de jeu', value: fmtDuration(totalDuration), color: T.cream, sub: total.perHour !== null ? `${eur(total.perHour, { sign: true })}/h` : '—' },
      ]} />

      {/* ── Courbes ── */}
      <TournamentCharts
        loading={loading}
        isPositive={isPositive}
        totalProfit={total.profit}
        filteredCount={filtered.length}
        multiLineData={multiLineData}
        activeSeries={activeSeries}
        lastIdx={lastIdx}
        barData={barData}
      />

      {/* ── Room × format ── */}
      <Card pad={false} style={{ marginBottom: 14 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <SectionLabel>Par room &amp; format</SectionLabel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: GRID_BREAKDOWN, gap: 10, padding: '8px 20px', borderBottom: `1px solid ${T.border}` }}>
          <Th>Room</Th><Th>Format</Th><Th /><Th align="right">Tournois</Th><Th align="right">Profit</Th><Th align="right">ROI</Th><Th align="right">ITM</Th><Th align="right">€ / h</Th>
        </div>
        {breakdown.map(group => (
          <div key={group.room}>
            {/* sous-total room */}
            <div style={{ display: 'grid', gridTemplateColumns: GRID_BREAKDOWN, gap: 10, padding: '11px 20px', background: 'rgba(255,255,255,0.018)', borderBottom: `1px solid ${T.border}` }}>
              <Td><RoomDot room={group.room} /></Td>
              <Td color={T.dim}>Total</Td>
              <Td>{''}</Td>
              <Td align="right" color={T.silver}>{group.total.count}</Td>
              <Td align="right" strong color={pnlColor(group.total.profit)}>{eur(group.total.profit, { sign: true })}</Td>
              <Td align="right" color={pnlColor(group.total.roi)}>{group.total.roi >= 0 ? '+' : ''}{group.total.roi.toFixed(1)} %</Td>
              <Td align="right" color={T.silver}>{group.total.itm.toFixed(0)} %</Td>
              <Td align="right" color={group.total.perHour === null ? T.dim : pnlColor(group.total.perHour)}>
                {group.total.perHour === null ? '—' : eur(group.total.perHour, { sign: true })}
              </Td>
            </div>
            {/* détail par format */}
            {group.formats.map(f => (
              <div key={f.fmt} className="trk-row" style={{ display: 'grid', gridTemplateColumns: GRID_BREAKDOWN, gap: 10, padding: '9px 20px', borderBottom: `1px solid ${T.border}` }}>
                <Td>{''}</Td>
                <Td><FormatBadge format={f.fmt} /></Td>
                <Td>{''}</Td>
                <Td align="right" color={T.silver}>{f.count}</Td>
                <Td align="right" color={pnlColor(f.profit)}>{eur(f.profit, { sign: true })}</Td>
                <Td align="right" color={pnlColor(f.roi)}>{f.roi >= 0 ? '+' : ''}{f.roi.toFixed(1)} %</Td>
                <Td align="right" color={T.silver}>{f.itm.toFixed(0)} %</Td>
                <Td align="right" color={f.perHour === null ? T.dim : pnlColor(f.perHour)}>
                  {f.perHour === null ? '—' : eur(f.perHour, { sign: true })}
                </Td>
              </div>
            ))}
          </div>
        ))}
      </Card>

      {/* ── Historique ── */}
      <Card pad={false}>
        <div style={{ padding: '16px 20px 0' }}>
          <SectionLabel right={<span style={{ fontSize: 11, color: T.dim }}>{filtered.length} tournois</span>}>
            Historique des tournois
          </SectionLabel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: GRID_HISTORY, gap: 10, padding: '8px 20px', borderBottom: `1px solid ${T.border}` }}>
          <Th>Tournoi</Th><Th>Room</Th><Th align="right">Date</Th><Th align="right">Buy-in</Th><Th align="right">Position</Th><Th align="right">KO</Th><Th align="right">Durée</Th><Th align="right">Profit</Th>
        </div>
        <div className="trk-scroll" style={{ maxHeight: 560, overflowY: 'auto' }}>
          {filtered.map(r => {
            const profit = r.net_profit ?? 0
            return (
              <div key={r.id} className="trk-row" style={{ display: 'grid', gridTemplateColumns: GRID_HISTORY, gap: 10, padding: '10px 20px', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tournament_name}</span>
                  <FormatBadge format={detectFormat(r)} />
                </span>
                <Td><RoomDot room={r.room || 'winamax'} /></Td>
                <Td align="right" color={T.dim}>{new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</Td>
                <Td align="right">{eur(r.buy_in_total ?? 0)}</Td>
                <Td align="right" color={r.placement ? placementColor(r.placement, r.total_players) : T.dim}
                  style={r.placement ? { fontWeight: 600 } : undefined}>
                  {r.placement ? (
                    <>
                      {r.placement === 1 && <Trophy size={10} color={T.gold} style={{ marginRight: 4 }} />}
                      {ordinal(r.placement)}{r.total_players ? <span style={{ color: T.faint, fontWeight: 400 }}>/{r.total_players}</span> : null}
                    </>
                  ) : '—'}
                </Td>
                <Td align="right" color={(r.bounties_won ?? 0) > 0 ? T.amber : T.dim}>
                  {(r.bounties_won ?? 0) > 0 ? (
                    <><Zap size={9} color={T.amber} style={{ marginRight: 3 }} />{eur(r.bounties_won)}</>
                  ) : '—'}
                </Td>
                <Td align="right" color={T.dim}>{fmtDuration(r.duration_secs ?? 0)}</Td>
                <Td align="right" strong color={pnlColor(profit)}>{eur(profit, { sign: true })}</Td>
              </div>
            )
          })}
        </div>
      </Card>

    </TrackerShell>
  )
}
