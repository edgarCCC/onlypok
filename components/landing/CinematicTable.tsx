'use client'

import { useRef, useState, useMemo } from 'react'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'

const FEATURES = [
  {
    seat: 'UTG',
    accent: '#d4a853',
    title: 'Bibliothèque Vidéo',
    desc: 'Centaines d\'heures de contenu stratégique filmé en conditions réelles par des professionnels certifiés.',
    stat: '200+',
    statLabel: 'heures de contenu',
  },
  {
    seat: 'HJ',
    accent: '#5dc8ff',
    title: 'Review IA',
    desc: 'Analyse automatique de vos mains avec détection des fuites et recommandations personnalisées en temps réel.',
    stat: '98%',
    statLabel: 'précision analyse',
  },
  {
    seat: 'CO',
    accent: '#94b8ce',
    title: 'Sessions Privées',
    desc: 'Coaching one-to-one avec des professionnels certifiés parfaitement adaptés à votre style de jeu.',
    stat: '1:1',
    statLabel: 'coaching certifié',
  },
  {
    seat: 'BTN',
    accent: '#4ade80',
    title: 'Réseau Pro',
    desc: 'Connectez-vous avec des joueurs sérieux, échangez des stratégies exclusives et progressez ensemble.',
    stat: '2k+',
    statLabel: 'joueurs actifs',
  },
  {
    seat: 'SB',
    accent: '#a78bfa',
    title: 'Tableau de Bord',
    desc: 'Suivez votre progression avec des métriques précises, des objectifs clairs et des graphiques détaillés.',
    stat: '50+',
    statLabel: 'métriques live',
  },
  {
    seat: 'BB',
    accent: '#ffd86b',
    title: 'Intégration GTO',
    desc: 'Synchronisation native avec PioSOLVER, GTO+ et Monker pour les joueurs qui visent le sommet.',
    stat: 'Pro',
    statLabel: 'grade outils',
  },
]

// Elliptical orbit parameters
const CX = 450
const CY = 258
const ORX = 300
const ORY = 175
const BASE_DEG = [90, 150, 210, 270, 330, 30]
const D2R = Math.PI / 180
const SEAT_SZ = 46

function computeSeats(rot: number) {
  return FEATURES.map((_, i) => {
    const ang = (BASE_DEG[i] + rot) * D2R
    const x = CX + ORX * Math.cos(ang)
    const y = CY + ORY * Math.sin(ang)
    const depth = (Math.sin(ang) + 1) / 2
    const scale = 0.62 + depth * 0.48
    const opacity = 0.36 + depth * 0.64
    return { x, y, depth, scale, opacity }
  })
}

export default function CinematicTable() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [rot, setRot] = useState(0)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setRot(v * -360)
    setActiveIdx(Math.min(5, Math.floor(v * 6)))
  })

  const seats = useMemo(() => computeSeats(rot), [rot])
  const feat = FEATURES[activeIdx]
  const activeSeat = seats[activeIdx]

  const sortedSeats = useMemo(
    () => seats.map((s, i) => ({ ...s, i })).sort((a, b) => a.depth - b.depth),
    [seats],
  )

  return (
    <section ref={containerRef} style={{ height: '700vh', position: 'relative' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        background: '#050810',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* Ambient glow reacting to active feature */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 900px 600px at 50% 58%, ${feat.accent}07 0%, transparent 65%),
            radial-gradient(ellipse 500px 400px at 20% 30%, rgba(26,80,200,0.05) 0%, transparent 70%)
          `,
          transition: 'background 0.7s ease',
        }} />

        {/* Header */}
        <div style={{
          position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.22)', marginBottom: 10,
            fontFamily: 'var(--font-dm-mono, monospace)',
          }}>
            LA PLATEFORME COMPLÈTE
          </div>
          <div style={{
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 700, color: '#fff', letterSpacing: '-0.025em',
          }}>
            Tout ce dont vous avez besoin
          </div>
        </div>

        {/* Main scene: SVG table + motion seats */}
        <div style={{ position: 'relative', width: 900, height: 516, flexShrink: 0 }}>

          {/* ── Premium SVG poker table ── */}
          <svg
            viewBox="0 0 900 516"
            width="900"
            height="516"
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          >
            <defs>
              {/* Walnut wood gradient */}
              <radialGradient id="ct-walnut" cx="50%" cy="30%" r="70%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor="#503210" />
                <stop offset="40%"  stopColor="#2d1807" />
                <stop offset="100%" stopColor="#110903" />
              </radialGradient>

              {/* Felt surface gradient — midnight blue */}
              <radialGradient id="ct-felt" cx="50%" cy="50%" r="65%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor="#0f1f3d" />
                <stop offset="60%"  stopColor="#090f20" />
                <stop offset="100%" stopColor="#050810" />
              </radialGradient>

              {/* Gold trim */}
              <linearGradient id="ct-gold" x1="0%" y1="0%" x2="100%" y2="60%">
                <stop offset="0%"   stopColor="#c8903a" stopOpacity="0.95" />
                <stop offset="40%"  stopColor="#eed97a" stopOpacity="0.8"  />
                <stop offset="100%" stopColor="#a87028" stopOpacity="0.95" />
              </linearGradient>

              {/* Dynamic spotlight — follows active seat */}
              <radialGradient id="ct-spot" gradientUnits="userSpaceOnUse" cx={activeSeat.x} cy={activeSeat.y} r="230">
                <stop offset="0%"   stopColor={feat.accent} stopOpacity="0.16" />
                <stop offset="50%"  stopColor={feat.accent} stopOpacity="0.05" />
                <stop offset="100%" stopColor={feat.accent} stopOpacity="0"    />
              </radialGradient>

              {/* Accent center glow */}
              <radialGradient id="ct-cglow" cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor={feat.accent} stopOpacity="0.1" />
                <stop offset="100%" stopColor={feat.accent} stopOpacity="0"   />
              </radialGradient>

              {/* Inset shadow gradient for felt depth */}
              <radialGradient id="ct-inset" cx="50%" cy="50%" r="55%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor="transparent" />
                <stop offset="80%"  stopColor="rgba(0,0,0,0)"    />
                <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
              </radialGradient>

              {/* LED glow filter */}
              <filter id="ct-led" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Soft outer glow filter */}
              <filter id="ct-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Floor shadow filter */}
              <filter id="ct-floor" x="-30%" y="-80%" width="160%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
              </filter>

              {/* Felt clip path */}
              <clipPath id="ct-felt-clip">
                <ellipse cx={CX} cy={CY} rx={253} ry={148} />
              </clipPath>

              {/* Micro grid on felt */}
              <pattern id="ct-grid" width="36" height="36" patternUnits="userSpaceOnUse" x={CX - 253} y={CY - 148}>
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.028)" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Floor shadow */}
            <ellipse cx={CX} cy={CY + 28} rx={272} ry={40} fill="rgba(0,0,0,0.65)" filter="url(#ct-floor)" />

            {/* Orbit path — very faint */}
            <ellipse
              cx={CX} cy={CY}
              rx={ORX} ry={ORY}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
              strokeDasharray="4 9"
            />

            {/* Walnut rail — outer */}
            <ellipse cx={CX} cy={CY} rx={280} ry={168} fill="url(#ct-walnut)" />

            {/* Outer gold trim ring */}
            <ellipse
              cx={CX} cy={CY} rx={270} ry={158}
              fill="none" stroke="url(#ct-gold)" strokeWidth="1.8"
            />

            {/* Felt surface */}
            <ellipse cx={CX} cy={CY} rx={255} ry={149} fill="url(#ct-felt)" />

            {/* Felt micro-grid */}
            <ellipse cx={CX} cy={CY} rx={255} ry={149} fill="url(#ct-grid)" />

            {/* Dynamic spotlight on felt */}
            <ellipse cx={CX} cy={CY} rx={255} ry={149} fill="url(#ct-spot)" />

            {/* Inset edge shadow on felt */}
            <ellipse cx={CX} cy={CY} rx={255} ry={149} fill="url(#ct-inset)" />

            {/* Inner gold trim ring */}
            <ellipse
              cx={CX} cy={CY} rx={255} ry={149}
              fill="none" stroke="url(#ct-gold)" strokeWidth="1" strokeOpacity="0.35"
            />

            {/* LED accent glow — colored with active feature */}
            <ellipse
              cx={CX} cy={CY} rx={255} ry={149}
              fill="none"
              stroke={feat.accent}
              strokeWidth="2"
              strokeOpacity="0.13"
              filter="url(#ct-led)"
            />

            {/* Connector: active seat → table center */}
            <line
              x1={activeSeat.x} y1={activeSeat.y}
              x2={CX} y2={CY}
              stroke={feat.accent}
              strokeWidth="0.8"
              strokeOpacity="0.22"
              strokeDasharray="5 5"
            />

            {/* Center accent glow */}
            <ellipse cx={CX} cy={CY} rx={72} ry={45} fill="url(#ct-cglow)" />

            {/* Center logo ring */}
            <ellipse
              cx={CX} cy={CY} rx={46} ry={28}
              fill="rgba(0,0,0,0.3)"
              stroke="rgba(201,151,61,0.2)"
              strokeWidth="1"
            />

            {/* Center logo text */}
            <text
              x={CX} y={CY + 3}
              textAnchor="middle"
              fill="rgba(201,151,61,0.28)"
              fontSize="7"
              fontFamily="'DM Mono', monospace"
              letterSpacing="3.5"
              fontWeight="700"
            >
              ONLYPOK
            </text>

            {/* Deck area — top of table */}
            <rect
              x={CX - 26} y={CY - 149 + 14}
              width={52} height={30} rx={4}
              fill="rgba(201,151,61,0.045)"
              stroke="rgba(201,151,61,0.14)"
              strokeWidth="0.8"
            />
            <text
              x={CX} y={CY - 149 + 32}
              textAnchor="middle"
              fill="rgba(201,151,61,0.18)"
              fontSize="5"
              fontFamily="'DM Mono', monospace"
              letterSpacing="2"
            >
              DECK
            </text>

            {/* Chip stacks — left */}
            {[0, 1, 2].map(n => (
              <ellipse
                key={`chl-${n}`}
                cx={CX - 198} cy={CY - n * 3.5}
                rx={9} ry={4}
                fill="#14213a" stroke="#2a4470" strokeWidth="0.6" opacity="0.55"
              />
            ))}

            {/* Chip stacks — right */}
            {[0, 1, 2].map(n => (
              <ellipse
                key={`chr-${n}`}
                cx={CX + 198} cy={CY - n * 3.5}
                rx={9} ry={4}
                fill="#221408" stroke="#7a5820" strokeWidth="0.6" opacity="0.55"
              />
            ))}

            {/* Pot indicator in center */}
            <circle cx={CX} cy={CY + 46} r={5} fill="rgba(201,151,61,0.12)" stroke="rgba(201,151,61,0.22)" strokeWidth="0.8" />
          </svg>

          {/* ── Seats (Framer Motion, spring physics) ── */}
          {sortedSeats.map(({ x, y, scale, opacity, depth, i }) => {
            const f = FEATURES[i]
            const isActive = i === activeIdx
            return (
              <motion.div
                key={i}
                animate={{
                  x: x - SEAT_SZ / 2,
                  y: y - SEAT_SZ / 2,
                  scale,
                  opacity,
                }}
                transition={{ type: 'spring', stiffness: 100, damping: 16 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: SEAT_SZ,
                  height: SEAT_SZ,
                  borderRadius: '50%',
                  background: isActive
                    ? `radial-gradient(circle at 38% 38%, ${f.accent}2a 0%, rgba(5,8,20,0.9) 100%)`
                    : 'radial-gradient(circle at 38% 38%, rgba(22,32,58,0.92) 0%, rgba(5,8,16,0.88) 100%)',
                  border: `1.5px solid ${isActive ? f.accent : 'rgba(255,255,255,0.07)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  boxShadow: isActive
                    ? `0 0 0 3px ${f.accent}1a, 0 0 32px ${f.accent}3a, inset 0 0 12px ${f.accent}10`
                    : '0 4px 16px rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(12px)',
                  zIndex: Math.round(depth * 10),
                }}
              >
                {/* Pulse ring on active seat */}
                {isActive && (
                  <motion.div
                    animate={{ scale: [1, 1.75, 1], opacity: [0.42, 0, 0.42] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      inset: -10,
                      borderRadius: '50%',
                      border: `1px solid ${f.accent}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}

                <span style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: isActive ? f.accent : 'rgba(255,255,255,0.26)',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  lineHeight: 1,
                }}>
                  {f.seat}
                </span>

                {isActive && (
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: f.accent,
                    boxShadow: `0 0 6px ${f.accent}`,
                  }} />
                )}
              </motion.div>
            )
          })}
        </div>

        {/* ── Glassmorphism HUD Panel ── */}
        <div style={{
          position: 'absolute',
          right: 56,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 270,
          pointerEvents: 'none',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 20, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.018) 100%)',
                backdropFilter: 'blur(26px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20,
                padding: '22px 20px 20px',
                boxShadow: [
                  `0 0 0 1px ${feat.accent}1a`,
                  '0 32px 72px rgba(0,0,0,0.6)',
                  'inset 0 1px 0 rgba(255,255,255,0.05)',
                ].join(', '),
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Accent top highlight */}
              <div style={{
                position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
                background: `linear-gradient(90deg, transparent, ${feat.accent}cc, transparent)`,
                borderRadius: '0 0 2px 2px',
              }} />

              {/* Corner accent glow */}
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: `radial-gradient(circle, ${feat.accent}18 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              <div style={{
                fontSize: 9, letterSpacing: '0.22em',
                color: feat.accent, fontWeight: 700,
                marginBottom: 12,
                fontFamily: 'var(--font-dm-mono, monospace)',
              }}>
                {feat.seat} · FEATURE
              </div>

              <div style={{
                fontSize: 20, fontWeight: 700,
                color: '#e8eef5', letterSpacing: '-0.02em',
                marginBottom: 10, lineHeight: 1.25,
              }}>
                {feat.title}
              </div>

              <div style={{
                fontSize: 13, color: 'rgba(232,238,245,0.44)',
                lineHeight: 1.72, marginBottom: 20,
              }}>
                {feat.desc}
              </div>

              <div style={{
                paddingTop: 14,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'baseline', gap: 10,
              }}>
                <span style={{
                  fontSize: 32, fontWeight: 700,
                  color: feat.accent,
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}>
                  {feat.stat}
                </span>
                <span style={{
                  fontSize: 11, color: 'rgba(232,238,245,0.28)',
                  letterSpacing: '0.06em',
                }}>
                  {feat.statLabel}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                height: 4,
                width: i === activeIdx ? 20 : 4,
                borderRadius: 999,
                background: i === activeIdx ? feat.accent : 'rgba(255,255,255,0.1)',
                transition: 'all 0.35s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Scroll hint — visible only at beginning */}
        {activeIdx === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute', left: 56, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              fontSize: 9, letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.18)',
              fontFamily: 'var(--font-dm-mono, monospace)',
            }}>
              SCROLL
            </div>
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 1, height: 42,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), transparent)',
              }}
            />
          </motion.div>
        )}
      </div>
    </section>
  )
}
