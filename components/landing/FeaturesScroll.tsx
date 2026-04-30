'use client'

import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  RankFish1, RankFish2, RankFish3, RankFish4, RankFish5, RankFish6,
  RankShark1, RankShark2, RankShark3, RankShark4, RankShark5, RankShark6,
} from './ranks'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const PANELS = [
  {
    accent: '#7c3aed',
    label: '01 — BIBLIOTHÈQUE',
    title: 'Une marketplace de formations vérifiées',
    desc: 'Des formations créées par des pros certifiés, classées par niveau, format et spécialité. Cash game, MTT, PLO, Expresso — tout y est.',
    mockup: 'library',
  },
  {
    accent: '#06b6d4',
    label: '02 — COACHING',
    title: 'Sessions privées avec des pros',
    desc: 'Coaching one-to-one, review de mains, sessions live. Vos leaks identifiés, votre EV augmentée.',
    mockup: 'coaching',
  },
  {
    accent: '#a855f7',
    label: '03 — PREFLOP GTO',
    title: 'Maîtrisez le preflop GTO',
    desc: 'La table de ranges complète : chaque main, chaque position, chaque action. Visualisez vos leaks preflop en temps réel.',
    mockup: 'gto',
  },
  {
    accent: '#e11d48',
    label: '04 — PROGRESSION',
    title: 'Grimpez les rangs',
    desc: 'De Fish à Master Shark — chaque formation, chaque session, chaque victoire vous rapproche du sommet. Votre progression, visible et réelle.',
    mockup: 'progression',
  },
]

const THUMBS = [
  { title: 'Squeeze en BB vs MP+CO', dur: '54min', level: 'AVANCÉ', format: 'MTT' },
  { title: 'Preflop GTO simplifié', dur: '31min', level: 'DÉBUTANT', format: 'CASH' },
  { title: 'Turn overbet strategy', dur: '47min', level: 'PRO', format: 'CASH' },
  { title: 'ICM deep run MTT', dur: '62min', level: 'PRO', format: 'MTT' },
]

const RANKS_GRID = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']

function getAction(row: number, col: number): { action: string; freq: number } {
  const isPair = row === col
  const isSuited = col > row
  if (isPair) {
    if (row <= 7) return { action: 'RAISE', freq: 100 }
    return { action: 'RAISE', freq: row <= 10 ? 80 : 60 }
  }
  if (isSuited) {
    if (row === 0) return { action: 'RAISE', freq: 100 }
    if (row <= 3 && col - row <= 4) return { action: 'RAISE', freq: 100 }
    if (row <= 6 && col - row <= 3) return { action: 'RAISE', freq: col - row <= 2 ? 90 : 70 }
    return { action: col - row <= 2 ? 'RAISE' : 'FOLD', freq: col - row <= 2 ? 55 : 0 }
  }
  if (row === 0 && col <= 3) return { action: 'RAISE', freq: 100 }
  if (row <= 2 && col - row <= 2) return { action: 'RAISE', freq: 85 }
  if (row <= 4 && col - row <= 1) return { action: 'RAISE', freq: 65 }
  return { action: 'FOLD', freq: 0 }
}

function LibraryMockup({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 480 }}>
      {THUMBS.map((t, i) => (
        <div
          key={i}
          style={{
            borderRadius: 10,
            background: 'linear-gradient(145deg, rgba(124,58,237,0.12), rgba(6,182,212,0.06))',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '14px 14px 12px',
            transition: 'transform 0.2s, border-color 0.2s',
            cursor: 'default',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.borderColor = `${accent}55`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
          }}
        >
          <div style={{ width: '100%', height: 80, borderRadius: 6, background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))', marginBottom: 10, position: 'relative' }}>
            <span style={{
              position: 'absolute', top: 6, left: 6,
              fontSize: 8, fontWeight: 700, color: accent,
              background: `${accent}22`, border: `1px solid ${accent}44`,
              borderRadius: 4, padding: '2px 6px',
              fontFamily: 'var(--font-dm-mono,monospace)', letterSpacing: '0.08em',
            }}>{t.format}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f0f4ff', marginBottom: 6, lineHeight: 1.3, fontFamily: 'var(--font-space,sans-serif)' }}>{t.title}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(240,244,255,0.35)', fontFamily: 'var(--font-space,sans-serif)' }}>{t.dur}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.08em', fontFamily: 'var(--font-space,sans-serif)' }}>{t.level}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CoachingMockup() {
  const barsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!barsRef.current) return
    const bars = barsRef.current.querySelectorAll<HTMLElement>('.wave-bar')
    const ctx = gsap.context(() => {
      bars.forEach((bar, i) => {
        gsap.to(bar, {
          scaleY: () => 0.2 + Math.random() * 0.8,
          duration: 0.3 + Math.random() * 0.3,
          ease: 'power1.inOut',
          repeat: -1,
          yoyo: true,
          delay: i * 0.04,
        })
      })
    }, barsRef)
    return () => ctx.revert()
  }, [])

  return (
    <div style={{ width: '100%', maxWidth: 480, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        {['Marcus R.', 'Coach Pro'].map((name, i) => (
          <div key={i} style={{
            padding: 16, background: i === 1 ? 'rgba(6,182,212,0.06)' : 'rgba(124,58,237,0.06)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: i === 1 ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff',
            }}>
              {name[0]}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(240,244,255,0.6)', fontFamily: 'var(--font-space,sans-serif)' }}>{name}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }} />
          </div>
        ))}
      </div>
      <div ref={barsRef} style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        gap: 2, height: 48, background: 'rgba(0,0,0,0.2)',
      }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="wave-bar" style={{
            flex: 1, height: '60%', borderRadius: 2,
            background: 'linear-gradient(to top, #06b6d4, #7c3aed)',
            transformOrigin: 'center',
          }} />
        ))}
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'rgba(240,244,255,0.3)', fontFamily: 'var(--font-dm-mono,monospace)' }}>SESSION EN COURS</span>
        <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600, fontFamily: 'var(--font-dm-mono,monospace)' }}>47:23</span>
      </div>
    </div>
  )
}

function GTOTrainerMockup() {
  const [hovered, setHovered] = useState<string | null>(null)
  const cellSize = 28

  function getCellLabel(row: number, col: number): string {
    const r = RANKS_GRID[row]
    const c = RANKS_GRID[col]
    if (row === col) return `${r}${r}`
    if (col > row) return `${r}${c}s`
    return `${c}${r}o`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {['UTG','HJ','CO','BTN','SB'].map((pos, i) => (
          <div key={pos} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 10,
            fontFamily: 'var(--font-dm-mono,monospace)', fontWeight: 700,
            letterSpacing: '0.08em',
            background: i === 3 ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)',
            border: i === 3 ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.07)',
            color: i === 3 ? '#a855f7' : 'rgba(240,244,255,0.35)',
            cursor: 'default',
          }}>{pos}</div>
        ))}
      </div>

      <div>
        <div style={{ display: 'grid', gridTemplateColumns: `20px repeat(13, ${cellSize}px)`, marginBottom: 2 }}>
          <div />
          {RANKS_GRID.map(r => (
            <div key={r} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(240,244,255,0.3)', fontFamily: 'var(--font-dm-mono,monospace)', lineHeight: `${cellSize}px` }}>{r}</div>
          ))}
        </div>
        {RANKS_GRID.map((rowR, row) => (
          <div key={rowR} style={{ display: 'grid', gridTemplateColumns: `20px repeat(13, ${cellSize}px)`, marginBottom: 2 }}>
            <div style={{ fontSize: 9, color: 'rgba(240,244,255,0.3)', fontFamily: 'var(--font-dm-mono,monospace)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>{rowR}</div>
            {RANKS_GRID.map((colR, col) => {
              const { action, freq } = getAction(row, col)
              const label = getCellLabel(row, col)
              const isHov = hovered === label
              const bg = action === 'RAISE'
                ? freq >= 90 ? `rgba(124,58,237,${0.7 + freq / 1000})`
                  : freq >= 60 ? `rgba(168,85,247,${0.5 + freq / 1000})`
                  : 'rgba(124,58,237,0.35)'
                : 'rgba(255,255,255,0.04)'
              return (
                <div
                  key={colR}
                  onMouseEnter={() => setHovered(label)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: cellSize, height: cellSize, borderRadius: 3,
                    background: isHov ? 'rgba(6,182,212,0.6)' : bg,
                    border: isHov ? '1px solid #06b6d4' : '1px solid rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, color: action === 'RAISE' ? 'rgba(240,244,255,0.9)' : 'rgba(240,244,255,0.15)',
                    fontFamily: 'var(--font-dm-mono,monospace)', fontWeight: 600,
                    cursor: 'default', transition: 'background 0.15s',
                  }}
                >
                  {label}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        {[
          { color: 'rgba(124,58,237,0.8)', label: 'OPEN' },
          { color: 'rgba(168,85,247,0.5)', label: 'MIXTE' },
          { color: 'rgba(255,255,255,0.08)', label: 'FOLD' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: 'rgba(240,244,255,0.35)', fontFamily: 'var(--font-dm-mono,monospace)', letterSpacing: '0.1em' }}>{label}</span>
          </div>
        ))}
      </div>

      {hovered && (
        <div style={{ fontSize: 11, color: '#a855f7', fontFamily: 'var(--font-dm-mono,monospace)', letterSpacing: '0.1em', height: 18 }}>
          {hovered} — {getAction(RANKS_GRID.indexOf(hovered[0]), RANKS_GRID.indexOf(hovered[1] === 's' || hovered[1] === 'o' ? hovered[0] : hovered[1])).action}
        </div>
      )}
    </div>
  )
}

const FISH_RANKS = [
  { key: 'fish1',  label: 'Fish I',   colors: ['#4ade80','#22c55e'], current: false, locked: false, Svg: RankFish1 },
  { key: 'fish2',  label: 'Fish II',  colors: ['#06b6d4','#0891b2'], current: false, locked: false, Svg: RankFish2 },
  { key: 'fish3',  label: 'Fish III', colors: ['#7af0ff','#1a9fd6'], current: false, locked: false, Svg: RankFish3 },
  { key: 'fish4',  label: 'Fish IV',  colors: ['#7af0ff','#a86bff'], current: true,  locked: false, Svg: RankFish4 },
  { key: 'fish5',  label: 'Fish V',   colors: ['#3affb6','#0c8c7a'], current: false, locked: true,  Svg: RankFish5 },
  { key: 'fish6',  label: 'Fish VI',  colors: ['#c4b5ff','#5e4ad6'], current: false, locked: true,  Svg: RankFish6 },
]

const SHARK_RANKS = [
  { key: 'shark1', label: 'Shark I',   colors: ['#94a3b8','#475569'], current: false, locked: false, Svg: RankShark1 },
  { key: 'shark2', label: 'Shark II',  colors: ['#8c98a8','#4a5260'], current: false, locked: false, Svg: RankShark2 },
  { key: 'shark3', label: 'Shark III', colors: ['#ffd86b','#a87a1f'], current: true,  locked: false, Svg: RankShark3 },
  { key: 'shark4', label: 'Shark IV',  colors: ['#ff3a4a','#8a0010'], current: false, locked: true,  Svg: RankShark4 },
  { key: 'shark5', label: 'Shark V',   colors: ['#a8e6ff','#cfb5ff'], current: false, locked: true,  Svg: RankShark5 },
  { key: 'shark6', label: 'Shark VI',  colors: ['#ff7ad9','#7af0ff'], current: false, locked: true,  Svg: RankShark6 },
]

function LockIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 10 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="5" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function RankAvatar3D({ Svg, colors, isCurrent, isLocked, idx = 0 }: {
  Svg: (p: { size?: number }) => React.ReactElement
  colors: string[]
  isCurrent: boolean
  isLocked: boolean
  idx?: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hov, setHov] = useState(false)
  const [ry, setRy] = useState(-20)
  const [rx, setRx] = useState(5)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = wrapRef.current!.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setRy((px - 0.5) * 44 - 16)
    setRx(-(py - 0.5) * 28)
  }

  const dur = 2.6 + idx * 0.35
  const delay = idx * 0.45

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHov(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => { setHov(false); setRy(-20); setRx(5) }}
      style={{ position: 'relative', width: 80, height: 56, flexShrink: 0, cursor: isLocked ? 'default' : 'pointer' }}
    >
      {isCurrent && (
        <div style={{
          position: 'absolute', inset: -6, borderRadius: 14,
          background: `radial-gradient(ellipse at 50% 60%, ${colors[0]}55, transparent 70%)`,
          filter: 'blur(10px)', pointerEvents: 'none',
        }} />
      )}
      <div style={{
        width: '100%', height: '100%', perspective: '200px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: isLocked ? 0.32 : 1,
      }}>
        <div style={{
          transform: hov ? `rotateY(${ry}deg) rotateX(${rx}deg) scale(1.08)` : undefined,
          animation: !hov ? `rankFloat3d ${dur}s ease-in-out ${delay}s infinite` : 'none',
          transformStyle: 'preserve-3d',
          transition: hov ? 'transform 0.1s ease-out' : 'transform 0.55s cubic-bezier(0.2,0.7,0.3,1)',
          filter: isCurrent
            ? `drop-shadow(0 0 14px ${colors[0]}cc) drop-shadow(0 4px 18px rgba(0,0,0,0.6))`
            : 'drop-shadow(0 2px 10px rgba(0,0,0,0.55))',
          willChange: 'transform',
        }}>
          <Svg size={80} />
        </div>
      </div>
      {isLocked && (
        <div style={{
          position: 'absolute', bottom: 1, right: 2, pointerEvents: 'none',
          background: 'rgba(4,4,10,0.9)', borderRadius: '50%', padding: 3,
          color: 'rgba(240,244,255,0.42)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <LockIcon />
        </div>
      )}
    </div>
  )
}

function ProgressionMockup() {
  const [mode, setMode] = useState<'student' | 'coach'>('student')
  const barRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const ranks = mode === 'student' ? FISH_RANKS : SHARK_RANKS

  useEffect(() => {
    if (!barRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(barRef.current, { width: '0%' }, {
        width: '57.5%', duration: 1.8, ease: 'power2.out', delay: 0.3,
      })
    })
    return () => ctx.revert()
  }, [mode])

  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll<HTMLElement>('.rank-row')
    gsap.fromTo(items,
      { x: -12, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out', stagger: 0.05 }
    )
  }, [mode])

  return (
    <>
    <style>{`
      @keyframes rankFloat3d {
        0%   { transform: rotateY(-20deg) rotateX(5deg) translateY(0px); }
        30%  { transform: rotateY(-14deg) rotateX(9deg) translateY(-6px); }
        65%  { transform: rotateY(-24deg) rotateX(3deg) translateY(-2px); }
        100% { transform: rotateY(-20deg) rotateX(5deg) translateY(0px); }
      }
    `}</style>
    <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Switch student / coach */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'rgba(255,255,255,0.04)', borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.07)',
        padding: 3, width: 'fit-content', marginBottom: 4,
      }}>
        {(['student','coach'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '5px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
              fontFamily: 'var(--font-dm-mono,monospace)',
              transition: 'all 0.2s',
              background: mode === m
                ? m === 'student' ? '#06b6d4' : '#7c3aed'
                : 'transparent',
              color: mode === m ? '#fff' : 'rgba(240,244,255,0.4)',
              boxShadow: mode === m ? `0 2px 12px ${m === 'student' ? '#06b6d4' : '#7c3aed'}55` : 'none',
            }}
          >
            {m === 'student' ? 'ÉTUDIANT' : 'COACH'}
          </button>
        ))}
      </div>

      {/* Rank list */}
      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ranks.map((rank, i) => {
          const isCurrent = rank.current
          const isLocked = rank.locked
          const { Svg } = rank

          return (
            <div
              key={rank.key}
              className="rank-row"
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              {/* Connector + avatar column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                {i > 0 && (
                  <div style={{
                    width: 2, height: 8,
                    background: isLocked ? 'rgba(255,255,255,0.06)' : `linear-gradient(to bottom, ${ranks[i-1].colors[1]}, ${rank.colors[0]})`,
                  }} />
                )}
                <RankAvatar3D Svg={Svg} colors={rank.colors} isCurrent={isCurrent} isLocked={isLocked} idx={i} />
                {i < ranks.length - 1 && (
                  <div style={{
                    width: 2, height: 8,
                    background: isLocked ? 'rgba(255,255,255,0.06)' : `linear-gradient(to bottom, ${rank.colors[1]}, ${ranks[i+1].colors[0]})`,
                  }} />
                )}
              </div>

              {/* Label + XP bar */}
              <div style={{ flex: 1, opacity: isLocked ? 0.4 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isCurrent ? 6 : 0 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isCurrent ? rank.colors[0] : '#f0f4ff',
                    fontFamily: 'var(--font-space,sans-serif)',
                  }}>
                    {rank.label}
                  </span>
                  {isCurrent && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: `${rank.colors[0]}22`, border: `1px solid ${rank.colors[0]}55`,
                      color: rank.colors[0], fontFamily: 'var(--font-dm-mono,monospace)', letterSpacing: '0.1em',
                    }}>EN COURS</span>
                  )}
                </div>
                {isCurrent && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: 'rgba(240,244,255,0.35)', fontFamily: 'var(--font-dm-mono,monospace)' }}>3 450 XP</span>
                      <span style={{ fontSize: 9, color: 'rgba(240,244,255,0.35)', fontFamily: 'var(--font-dm-mono,monospace)' }}>6 000 XP</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div ref={barRef} style={{
                        height: '100%', borderRadius: 2, width: '0%',
                        background: `linear-gradient(90deg, ${rank.colors[0]}, ${rank.colors[1]})`,
                      }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}

export default function FeaturesScroll() {
  const outerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  useGSAP(() => {
    const panels = gsap.utils.toArray<HTMLElement>('.feature-panel')
    const totalWidth = (panels.length - 1) * 100

    const tl = gsap.to(trackRef.current, {
      x: `-${totalWidth}vw`,
      ease: 'none',
      scrollTrigger: {
        trigger: outerRef.current,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        start: 'top top',
        end: `+=${panels.length * 100}%`,
        onUpdate: self => {
          setActiveIdx(Math.round(self.progress * (panels.length - 1)))
        },
      },
    })

    return () => tl.scrollTrigger?.kill()
  }, { scope: outerRef })

  return (
    <div ref={outerRef} style={{ background: '#07070f' }}>
      <div style={{
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden', display: 'flex', alignItems: 'center',
      }}>
        <div ref={trackRef} style={{
          display: 'flex', flexDirection: 'row',
          width: `${PANELS.length * 100}vw`,
          willChange: 'transform',
        }}>
          {PANELS.map((p, i) => (
            <div
              key={i}
              className="feature-panel"
              style={{
                width: '100vw', height: '100vh',
                display: 'flex', alignItems: 'center',
                padding: '0 clamp(20px,6vw,100px)',
                flexShrink: 0,
              }}
            >
              <div style={{
                maxWidth: 1280, width: '100%', margin: '0 auto',
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 80, alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontSize: 10, letterSpacing: '0.2em', color: p.accent,
                    fontWeight: 700, marginBottom: 20,
                    fontFamily: 'var(--font-space,sans-serif)',
                  }}>{p.label}</div>
                  <h2 style={{
                    fontFamily: 'var(--font-syne,sans-serif)',
                    fontSize: 'clamp(32px,3.5vw,52px)',
                    fontWeight: 800, color: '#f0f4ff',
                    letterSpacing: '-0.025em', marginBottom: 20, lineHeight: 1.1,
                  }}>{p.title}</h2>
                  <p style={{
                    fontSize: 16, color: 'rgba(240,244,255,0.45)',
                    lineHeight: 1.75, maxWidth: 420,
                    fontFamily: 'var(--font-space,sans-serif)',
                  }}>{p.desc}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {p.mockup === 'library' && <LibraryMockup accent={p.accent} />}
                  {p.mockup === 'coaching' && <CoachingMockup />}
                  {p.mockup === 'gto' && <GTOTrainerMockup />}
                  {p.mockup === 'progression' && <ProgressionMockup />}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8,
        }}>
          {PANELS.map((p, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 2,
              width: i === activeIdx ? 32 : 8,
              background: i === activeIdx ? p.accent : 'rgba(255,255,255,0.15)',
              transition: 'all 0.35s ease',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
