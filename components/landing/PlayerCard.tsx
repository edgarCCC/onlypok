'use client'

import { useRef, useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import s from './PlayerCard.module.css'
import {
  RankFish1, RankFish2, RankFish3, RankFish4, RankFish5, RankFish6,
  RankShark1, RankShark2, RankShark3, RankShark4, RankShark5, RankShark6,
} from './ranks'
import Flag from './Flag'

export type AvatarKey =
  | 'fish1' | 'fish2' | 'fish3' | 'fish4' | 'fish5' | 'fish6'
  | 'shark1' | 'shark2' | 'shark3' | 'shark4' | 'shark5' | 'shark6'
export type FormatKey = 'MTT' | 'CASH GAME' | 'EXPRESSO'
export type RoleKey = 'student' | 'coach'

export interface CardData {
  pseudo: string
  country: string
  rating: number
  role: RoleKey
  avatar: AvatarKey
  format: FormatKey
  abi: number
  volume: string
  roi: number
  gto: number
  streak: number
  trophies: number
  coachRating: number
  coachReach: string
  coachStudents: number
}

export interface FxData {
  tilt: number
  noise: number
  iris: number
}

const TIER: Record<AvatarKey, { label: string; accent: string }> = {
  fish1:  { label: 'FISH · LV 1',    accent: 'oklch(0.60 0.10 145)' },
  fish2:  { label: 'FISH · LV 2',    accent: 'oklch(0.66 0.13 175)' },
  fish3:  { label: 'FISH · LV 3',    accent: 'oklch(0.72 0.16 200)' },
  fish4:  { label: 'FISH · LV 4',    accent: 'oklch(0.74 0.18 210)' },
  fish5:  { label: 'FISH · LV 5',    accent: 'oklch(0.78 0.20 160)' },
  fish6:  { label: 'FISH · LV 6',    accent: 'oklch(0.72 0.22 295)' },
  shark1: { label: 'SHARK · LV 1',   accent: 'oklch(0.68 0.14 235)' },
  shark2: { label: 'SHARK · LV 2',   accent: 'oklch(0.70 0.16 245)' },
  shark3: { label: 'SHARK · LV 3',   accent: 'oklch(0.78 0.18 75)'  },
  shark4: { label: 'SHARK · LV 4',   accent: 'oklch(0.62 0.22 15)'  },
  shark5: { label: 'SHARK · LV 5',   accent: 'oklch(0.82 0.10 220)' },
  shark6: { label: 'SHARK · LV 6',   accent: 'oklch(0.72 0.24 300)' },
}

const AVATAR: Record<AvatarKey, () => React.ReactElement> = {
  fish1:  () => <RankFish1  size={155} />,
  fish2:  () => <RankFish2  size={155} />,
  fish3:  () => <RankFish3  size={155} />,
  fish4:  () => <RankFish4  size={155} />,
  fish5:  () => <RankFish5  size={155} />,
  fish6:  () => <RankFish6  size={155} />,
  shark1: () => <RankShark1 size={155} />,
  shark2: () => <RankShark2 size={155} />,
  shark3: () => <RankShark3 size={155} />,
  shark4: () => <RankShark4 size={155} />,
  shark5: () => <RankShark5 size={155} />,
  shark6: () => <RankShark6 size={155} />,
}

function StatCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className={s.stat}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statRow}>
        <span className={s.statValue}>{value}</span>
        {unit && <span className={s.statUnit}>{unit}</span>}
      </div>
    </div>
  )
}

interface Props {
  data: CardData
  fx: FxData
}

export default function PlayerCard({ data, fx }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pt, setPt] = useState({ x: 0.5, y: 0.5, active: false })
  const [t, setT] = useState(0)

  useEffect(() => {
    let raf: number
    const tick = () => { setT(performance.now() / 1000); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect()
    setPt({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, active: true })
  }
  const onLeave = () => setPt(p => ({ ...p, active: false }))

  const tier = TIER[data.avatar]

  const rotX = pt.active ? -(pt.y - 0.5) * 2 * fx.tilt : 0
  const rotY = pt.active ?  (pt.x - 0.5) * 2 * fx.tilt : 0

  // Idle drift when cursor is off card
  const ax = pt.active ? pt.x : 0.5 + Math.sin(t * 0.6) * 0.35
  const ay = pt.active ? pt.y : 0.5 + Math.cos(t * 0.45) * 0.35

  const irisAngle = (ax * 360 + ay * 180 + t * 20) % 360
  const glareOpacity = pt.active ? 0.55 : 0.28

  // Portrait 3D — amplifies card tilt + adds idle float
  const portraitRY = (ax - 0.5) * 44 - 16
  const portraitRX = -(ay - 0.5) * 28 + 5
  const portraitTY = pt.active ? 0 : Math.sin(t * 0.62) * 5

  const roleStats = data.role === 'coach'
    ? [
        { label: 'RATING',   value: String(data.coachRating), unit: '/ 5' },
        { label: 'REACH',    value: data.coachReach,          unit: 'PLAYERS' },
        { label: 'STUDENTS', value: `${data.coachStudents}+`, unit: 'TRAINED' },
      ]
    : [
        { label: 'GTO SCORE', value: `${data.gto}%` },
        { label: 'STREAK',    value: String(data.streak), unit: 'DAYS' },
        { label: 'TROPHIES',  value: `${data.trophies}/50` },
      ]

  return (
    <div className={s.cardWrap} style={{ perspective: 1400 }}>
      <div
        ref={ref}
        className={s.card}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          '--accent': tier.accent,
          '--noise': fx.noise,
          '--iris': fx.iris,
          '--iris-angle': `${irisAngle}deg`,
          '--gx': `${ax * 100}%`,
          '--gy': `${ay * 100}%`,
          '--glare-op': glareOpacity,
        } as CSSProperties}
      >
        <div className={s.cardBg} />
        <div className={s.cardFelt} />
        <div className={s.cardNoise} />
        <div className={s.cardIris} />
        <div className={s.cardGlare} />
        <div className={s.cardFrame} />

        <div className={s.suitTl}>♠</div>
        <div className={s.suitBr}>♠</div>

        {/* Top: rating block + portrait */}
        <div className={s.cardTop}>
          <div className={s.ratingBlock}>
            <div className={s.ratingNum} style={{ color: tier.accent }}>{data.rating}</div>
            <div className={s.tierLabel}>{tier.label}</div>
            <div
              className={s.formatBadge}
              style={{
                borderColor: `color-mix(in oklab, ${tier.accent} 50%, transparent)`,
                color: tier.accent,
              }}
            >
              {data.format}
            </div>
            <div className={s.flagRow}>
              <Flag code={data.country} />
              <span className={s.countryCode}>{data.country.toUpperCase()}</span>
            </div>
          </div>
          <div className={s.portrait}>
            <div
              className={s.portraitGlow}
              style={{ background: `radial-gradient(circle at 50% 60%, ${tier.accent}55, transparent 70%)` }}
            />
            <div
              className={s.portraitSvg}
              style={{
                '--pry': `${portraitRY}deg`,
                '--prx': `${portraitRX}deg`,
                '--pty': `${portraitTY}px`,
              } as CSSProperties}
            >
              {AVATAR[data.avatar]()}
            </div>
          </div>
        </div>

        {/* Divider with pseudo */}
        <div className={s.divider}>
          <div className={s.dividerLine} />
          <div className={s.pseudo}>{data.pseudo || 'PLAYER'}</div>
          <div className={s.dividerLine} />
        </div>

        {/* Bottom: role pill + 2×3 stats */}
        <div className={s.cardBottom}>
          <div
            className={s.rolePill}
            data-role={data.role}
            style={data.role === 'coach' ? {
              color: tier.accent,
              borderColor: `color-mix(in oklab, ${tier.accent} 40%, transparent)`,
            } : {}}
          >
            <span
              className={s.rolePillDot}
              style={{ background: tier.accent, boxShadow: `0 0 10px ${tier.accent}` }}
            />
            <span className={s.rolePillLabel}>{data.role === 'coach' ? 'COACH' : 'STUDENT'}</span>
          </div>
          <div className={s.statGrid}>
            <StatCell label="ABI"    value={`$${data.abi}`} />
            <StatCell label="VOLUME" value={data.volume} unit="HANDS" />
            <StatCell label="ROI"    value={`${data.roi}%`} />
            <StatCell label={roleStats[0].label} value={roleStats[0].value} unit={roleStats[0].unit} />
            <StatCell label={roleStats[1].label} value={roleStats[1].value} unit={roleStats[1].unit} />
            <StatCell label={roleStats[2].label} value={roleStats[2].value} unit={roleStats[2].unit} />
          </div>
        </div>
      </div>
    </div>
  )
}
