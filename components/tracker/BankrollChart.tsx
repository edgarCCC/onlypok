'use client'
import { useId, useState } from 'react'
import { T } from '@/components/tracker/ui'
import type { BankrollPoint } from '@/lib/tracker-bankroll'

/* Courbe SVG de bankroll — points journaliers agrégés (cf. computeBankroll).
   Partagée par /tracker/bankroll et /tracker/dashboard. */
export default function BankrollChart({ points, color, height = 240 }: {
  points: BankrollPoint[]
  color: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = `bkg-${useId().replace(/:/g, '')}`
  if (points.length < 2) return null
  const min = Math.min(...points.map(p => p.value))
  const max = Math.max(...points.map(p => p.value))
  const range = max - min || 1
  const W = 800; const H = height; const PAD = 36

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const fill = `${path} L${x(points.length - 1)},${H - PAD} L${x(0)},${H - PAD} Z`
  const zeroInRange = min < 0 && max > 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block' }}
      role="img" aria-label={`Courbe de bankroll, de ${Math.round(points[0].value)} € à ${Math.round(points[points.length - 1].value)} €`}
      onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        const px = ((e.clientX - rect.left) / rect.width) * W
        const i = Math.round(((px - PAD) / (W - PAD * 2)) * (points.length - 1))
        setHover(Math.max(0, Math.min(points.length - 1, i)))
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {zeroInRange && (
        <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
      )}
      <path d={fill} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={PAD / 2} y2={H - PAD} stroke="rgba(255,255,255,0.14)" />
          <circle cx={x(hover)} cy={y(points[hover].value)} r="4" fill={color} />
          <text
            x={Math.min(Math.max(x(hover), PAD + 44), W - PAD - 44)} y={PAD / 2 + 4}
            fill={T.cream} fontSize="12" fontWeight="700" textAnchor="middle"
          >
            {points[hover].label} · {Math.round(points[hover].value)} €
          </text>
        </g>
      )}
      <text x={PAD} y={H - 8} fill={T.dim} fontSize="10">{points[0].label}</text>
      <text x={W - PAD} y={H - 8} fill={T.dim} fontSize="10" textAnchor="end">{points[points.length - 1].label}</text>
    </svg>
  )
}
