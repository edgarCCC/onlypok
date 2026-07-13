'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  Cell,
} from 'recharts'
import type { SERIES_CFG } from './chartTokens'

// ── Design tokens (kept local — this chunk is lazy-loaded on its own) ──────
const BG      = '#07090e'
const SURFACE = 'rgba(255,255,255,0.025)'
const BORDER  = 'rgba(255,255,255,0.07)'
const DIM     = 'rgba(240,244,255,0.22)'
const VIOLET  = '#7c3aed'
const GREEN   = '#4ade80'
const RED     = '#ef4444'

type SeriesCfgItem = typeof SERIES_CFG[number]

// ── Multi-series tooltip ───────────────────────────────────────────────────────
function MultiTooltip({ active, payload, label, seriesCfg }: {
  active?: boolean; payload?: any[]; label?: string; seriesCfg: readonly SeriesCfgItem[]
}) {
  if (!active || !payload?.length) return null
  const valid = payload.filter(p => p.value !== null && p.value !== undefined)
  if (!valid.length) return null
  return (
    <div style={{ background: '#0f1520', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(12px)' }}>
      <p style={{ fontSize: 11, color: DIM, margin: '0 0 8px' }}>{label}</p>
      {valid.map(p => {
        const s = seriesCfg.find(s => s.key === p.dataKey)
        if (!s) return null
        return (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 2, background: s.color, borderRadius: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: DIM, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: p.value >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums' }}>
              {p.value >= 0 ? '+' : ''}{(p.value as number).toFixed(2)}€
            </span>
          </div>
        )
      })}
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

function fmtEuro(n: number) {
  const s = Math.abs(n).toFixed(2)
  return (n >= 0 ? '+' : '-') + s + '€'
}

interface TournamentChartsProps {
  loading: boolean
  isPositive: boolean
  totalProfit: number
  filteredCount: number
  multiLineData: Record<string, unknown>[]
  activeSeries: readonly SeriesCfgItem[]
  lastIdx: Record<string, number>
  barData: { name: string; profit: number }[]
}

export default function TournamentCharts({
  loading, isPositive, totalProfit, filteredCount,
  multiLineData, activeSeries, lastIdx, barData,
}: TournamentChartsProps) {
  return (
    <>
      {/* ── Bankroll curve ──────────────────────────────────────────────── */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 20px 12px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>Courbe de bankroll</h2>
            <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Profit cumulatif sur la période</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: isPositive ? GREEN : RED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {isPositive ? '+' : ''}{totalProfit.toFixed(2)}€
            </p>
            <p style={{ fontSize: 11, color: DIM, margin: 0 }}>{filteredCount} tournois</p>
          </div>
        </div>

        {/* Legend */}
        {activeSeries.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {activeSeries.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width={20} height={8}>
                  <line x1={0} y1={4} x2={20} y2={4}
                    stroke={s.color} strokeWidth={2}
                    strokeDasharray={s.dash ?? undefined} />
                </svg>
                <span style={{ fontSize: 11, color: DIM }}>
                  {s.room === 'betclic' ? 'Betclic' : 'Winamax'} · {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: `2px solid ${VIOLET}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={multiLineData} margin={{ top: 8, right: 72, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date" tick={{ fill: DIM, fontSize: 11 }}
                axisLine={false} tickLine={false}
                interval={Math.max(0, Math.floor(multiLineData.length / 8) - 1)}
              />
              <YAxis
                tick={{ fill: DIM, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v >= 0 ? '+' : ''}${v}€`} width={60}
              />
              <Tooltip content={<MultiTooltip seriesCfg={activeSeries} />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
              {activeSeries.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dash ?? undefined}
                  connectNulls
                  animationDuration={600}
                  activeDot={{ r: 4, fill: s.color, stroke: BG, strokeWidth: 2 }}
                  dot={(props: any) => {
                    const isEnd = props.index === lastIdx[s.key] && props.value !== null
                    if (!isEnd) return <circle key={`${s.key}-${props.index}`} r={0} />
                    return (
                      <g key={`${s.key}-end`}>
                        <circle cx={props.cx} cy={props.cy} r={4} fill={s.color} stroke={BG} strokeWidth={2} />
                        <text x={props.cx + 8} y={props.cy + 4}
                          fill={s.color} fontSize={9} fontWeight="700"
                          style={{ fontFamily: 'inherit' }}>
                          {s.label}
                        </text>
                      </g>
                    )
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Per-tournament bars ─────────────────────────────────────────── */}
      {barData.length > 0 && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 20px 12px', marginBottom: 14 }}>
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
    </>
  )
}
