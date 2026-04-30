'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

const SPADE = (
  <svg viewBox="0 0 40 44" fill="currentColor" width="100%" height="100%">
    <path d="M20 2 C20 2, 2 14, 2 24 C2 31 8 35 14 33 C11 37 9 40 6 42 L34 42 C31 40 29 37 26 33 C32 35 38 31 38 24 C38 14 20 2 20 2Z"/>
  </svg>
)
const HEART = (
  <svg viewBox="0 0 40 40" fill="currentColor" width="100%" height="100%">
    <path d="M20 36 C20 36 2 24 2 13 C2 7 7 2 13 2 C16.5 2 19.5 3.8 20 6 C20.5 3.8 23.5 2 27 2 C33 2 38 7 38 13 C38 24 20 36 20 36Z"/>
  </svg>
)

// Background strays — top-right corner + bottom-left cluster
const FACE_DOWN_BG = [
  { rotate:  14, top:  '8%', left: '78%', z: 0 },
  { rotate: -22, top: '78%', left:  '4%', z: 2 },
  { rotate:  34, top: '88%', left: '16%', z: 1 },
  { rotate:  -8, top: '86%', left:  '2%', z: 0 },
]

// 7♠ upper-left (z:8, more visible), 2♥ lower-right (z:6, pokes through circle)
const FACE_UP = [
  { value: '7', suitEl: SPADE, accent: '#d4d8f0', bg: '#0e0c26', rotate: -11, top: '22%', left: '14%', z: 8 },
  { value: '2', suitEl: HEART, accent: '#e11d48', bg: '#1a0812', rotate:  13, top: '62%', left: '68%', z: 20 },
]

// Circle: center (50%, 50%), rx≈30%, ry≈27% (corrected for ~425×480 column aspect ratio)
// Cards at angles 0°→327°; rotation ≈ tangent angle for croupier-fan look
// z rule: cards overlapping 2♥ (z:6) → z:4  |  cards near 7♠ bottom → z:9  |  rest: 10–11
const FACE_DOWN_PILE = [
  { rotate:   2, top: '50%', left: '80%', z:  4 },  //   0° — right      (behind 2♥)
  { rotate:  32, top: '65%', left: '75%', z:  4 },  //  33° — lower-right (behind 2♥)
  { rotate:   8, top: '28%', left: '24%', z:  7 },  // moved — peeks from behind 7♠ right edge
  { rotate: 100, top: '77%', left: '46%', z: 11 },  //  98° — bottom
  { rotate: 130, top: '70%', left: '30%', z: 11 },  // 131° — bottom-left
  { rotate: 163, top: '58%', left: '21%', z: 10 },  // 164° — left
  { rotate:-162, top: '46%', left: '21%', z:  9 },  // 196° — clips 7♠ bottom (z>8)
  { rotate:-130, top: '30%', left: '30%', z:  7 },  // 229° — behind 7♠ (z<8)
  { rotate: -98, top: '23%', left: '46%', z: 10 },  // 262° — top
  { rotate: -65, top: '26%', left: '63%', z: 10 },  // 295° — top-right
  { rotate: -32, top: '35%', left: '75%', z:  4 },  // 327° — right-upper (behind 2♥)
  { rotate:  18, top: '80%', left: '72%', z: 21 },  // covers bottom of 2♥
]

// Shared branded card back
function CardBack({ inset = 9, mono = 24 }: { inset?: number; mono?: number }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #090b1e, #03050e)' }} />
      <div style={{
        position: 'absolute', inset, borderRadius: inset - 2,
        border: '1px solid rgba(6,182,212,0.32)',
        backgroundImage: [
          'repeating-linear-gradient(45deg, rgba(6,182,212,0.06) 0px, rgba(6,182,212,0.06) 1px, transparent 1px, transparent 10px)',
          'repeating-linear-gradient(-45deg, rgba(6,182,212,0.06) 0px, rgba(6,182,212,0.06) 1px, transparent 1px, transparent 10px)',
        ].join(', '),
      }} />
      <div style={{ position: 'absolute', top: inset + 1, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'var(--font-space,sans-serif)', fontSize: 6, fontWeight: 700, letterSpacing: '0.32em', color: 'rgba(6,182,212,0.82)', userSelect: 'none' }}>ONLYPOK</div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontFamily: 'var(--font-syne,sans-serif)', fontSize: mono, fontWeight: 800, letterSpacing: '-0.02em', color: 'rgba(124,58,237,0.48)', userSelect: 'none' }}>OP</div>
      <div style={{ position: 'absolute', bottom: inset + 1, left: '50%', transform: 'translateX(-50%) rotate(180deg)', whiteSpace: 'nowrap', fontFamily: 'var(--font-space,sans-serif)', fontSize: 6, fontWeight: 700, letterSpacing: '0.32em', color: 'rgba(6,182,212,0.82)', userSelect: 'none' }}>ONLYPOK</div>
    </>
  )
}

interface HeroProps {
  playerCount: number
  recentUsers: { username: string; color: string }[]
}

export default function HeroSection({ playerCount, recentUsers }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blob1Ref = useRef<HTMLDivElement>(null)
  const blob2Ref = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.3 })

    tl.from('.hero-eyebrow', { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' })
      .from('.hero-line', {
        y: 90, opacity: 0,
        clipPath: 'inset(100% 0 0 0)',
        duration: 0.8, ease: 'power3.out',
        stagger: 0.12,
      }, '-=0.2')
      .from('.hero-sub', { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      .from('.hero-cta', { y: 20, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1 }, '-=0.3')
      .from('.hero-trust', { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2')

    // DOM order: BG strays → 7-2 revealed → pile lands on top
    const cardEls = gsap.utils.toArray<HTMLElement>('.hero-card')
    gsap.from(cardEls, {
      y: 100, opacity: 0, rotationY: -30,
      duration: 0.9, ease: 'power3.out',
      stagger: 0.08, delay: 0.9,
    })

    gsap.to(blob1Ref.current, {
      x: 80, y: -60, duration: 10, ease: 'sine.inOut', repeat: -1, yoyo: true,
    })
    gsap.to(blob2Ref.current, {
      x: -60, y: 80, duration: 13, ease: 'sine.inOut', repeat: -1, yoyo: true,
    })
  }, { scope: containerRef })

  useEffect(() => {
    const cards = cardsRef.current
    if (!cards) return
    const onMove = (e: MouseEvent) => {
      const rect = cards.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / rect.width
      const dy = (e.clientY - cy) / rect.height
      gsap.to('.hero-card', {
        rotationY: dx * 8, rotationX: -dy * 6,
        duration: 0.6, ease: 'power2.out',
        overwrite: 'auto',
      })
    }
    const onLeave = () => gsap.to('.hero-card', { rotationY: 0, rotationX: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' })
    cards.addEventListener('mousemove', onMove)
    cards.addEventListener('mouseleave', onLeave)
    return () => {
      cards.removeEventListener('mousemove', onMove)
      cards.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={containerRef} style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, #0a0018 0%, #04040a 50%, #001020 100%)',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(124,58,237,0.12) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div ref={blob1Ref} style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)',
        top: '10%', left: '30%', pointerEvents: 'none', transform: 'translate(-50%,-50%)',
      }} />
      <div ref={blob2Ref} style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 70%)',
        bottom: '5%', right: '20%', pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '120px clamp(20px,5vw,64px) 80px',
        display: 'grid', gridTemplateColumns: '55fr 45fr', gap: 80,
        alignItems: 'center', width: '100%', position: 'relative', zIndex: 1,
      }}>
        <div>
          <div className="hero-eyebrow" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginBottom: 36,
          }}>
            <span style={{
              fontFamily: 'var(--font-space, sans-serif)',
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.22em', color: '#06b6d4',
            }}>POKER · FORMATION · DOMINATION</span>
          </div>

          <div style={{ overflow: 'hidden', marginBottom: 28 }}>
            {['Jouez', 'différemment.', 'Gagnez vraiment.'].map((line, i) => (
              <div key={i} style={{ overflow: 'hidden' }}>
                <h1
                  className="hero-line"
                  style={{
                    fontFamily: 'var(--font-space, sans-serif)',
                    fontSize: 'clamp(48px, 6.5vw, 96px)',
                    fontWeight: 600, lineHeight: 1.1,
                    margin: 0, letterSpacing: '-0.02em',
                    color: i === 1 ? 'transparent' : '#f0f4ff',
                    background: i === 1 ? 'linear-gradient(135deg, #a855f7, #06b6d4)' : undefined,
                    WebkitBackgroundClip: i === 1 ? 'text' : undefined,
                    backgroundClip: i === 1 ? 'text' : undefined,
                    WebkitTextFillColor: i === 1 ? 'transparent' : undefined,
                    display: 'block',
                  }}
                >
                  {line}
                </h1>
              </div>
            ))}
          </div>

          <p className="hero-sub" style={{
            fontSize: 17, lineHeight: 1.75,
            color: 'rgba(240,244,255,0.5)',
            maxWidth: 480, marginBottom: 44,
            fontFamily: 'var(--font-space, sans-serif)',
          }}>
            La plateforme de référence pour les joueurs de poker qui veulent progresser — formés par des professionnels certifiés.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48, flexWrap: 'wrap' }}>
            <Link
              href="/register"
              className="hero-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 32px', borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: '#fff', textDecoration: 'none',
                fontSize: 14, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1,
                boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)' }}
            >
              Commencer maintenant
            </Link>
            <Link
              href="/formations"
              className="hero-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 28px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(240,244,255,0.7)', textDecoration: 'none',
                fontSize: 14, fontWeight: 500, lineHeight: 1,
                transition: 'border-color 0.2s, color 0.2s',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#f0f4ff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(240,244,255,0.7)' }}
            >
              Explorer les formations →
            </Link>
          </div>

          {playerCount > 0 && (
            <div className="hero-trust" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {recentUsers.length > 0 && (
                <div style={{ display: 'flex' }}>
                  {recentUsers.map((u, i) => (
                    <div key={i} style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: u.color,
                      border: '2px solid rgba(4,4,10,0.8)',
                      marginLeft: i === 0 ? 0 : -10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase',
                      zIndex: recentUsers.length - i,
                      position: 'relative',
                    }}>
                      {u.username.charAt(0)}
                    </div>
                  ))}
                </div>
              )}
              <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.45)', fontFamily: 'var(--font-space,sans-serif)' }}>
                <strong style={{ color: '#f0f4ff', fontWeight: 600 }}>
                  {playerCount.toLocaleString('fr-FR')}
                </strong>{' '}joueur{playerCount > 1 ? 's' : ''} inscrit{playerCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div ref={cardsRef} style={{ position: 'relative', height: 480, perspective: 1000 }}>
          <div style={{
            position: 'absolute', top: '40%', left: '45%',
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
          }} />

          {/* Step 1 — few strays at edges (animate in first) */}
          {FACE_DOWN_BG.map((pos, i) => (
            <div
              key={`bg-${i}`}
              className="hero-card"
              style={{
                position: 'absolute',
                width: 152, height: 214,
                borderRadius: 12,
                top: pos.top, left: pos.left,
                transform: `translate(-50%,-50%) rotate(${pos.rotate}deg)`,
                zIndex: pos.z,
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03)',
                opacity: 0.75,
              }}
            >
              <CardBack inset={8} mono={22} />
            </div>
          ))}

          {/* Step 2 — 7-2 hand revealed (stagger lands here) */}
          {FACE_UP.map((card, i) => (
            <div
              key={`fu-${i}`}
              className="hero-card"
              style={{
                position: 'absolute',
                width: 170, height: 238,
                borderRadius: 16,
                background: `linear-gradient(145deg, ${card.bg}, #060610)`,
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.07)',
                top: card.top, left: card.left,
                transform: `translate(-50%,-50%) rotate(${card.rotate}deg)`,
                transformStyle: 'preserve-3d',
                zIndex: card.z,
                padding: 14,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 22, fontWeight: 800, color: card.accent, lineHeight: 1 }}>{card.value}</span>
                <div style={{ width: 14, height: 14, color: card.accent, marginTop: 2 }}>{card.suitEl}</div>
              </div>
              <div style={{ width: 56, height: 56, color: card.accent, margin: '0 auto' }}>{card.suitEl}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', transform: 'rotate(180deg)' }}>
                <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 22, fontWeight: 800, color: card.accent, lineHeight: 1 }}>{card.value}</span>
                <div style={{ width: 14, height: 14, color: card.accent, marginTop: 2 }}>{card.suitEl}</div>
              </div>
            </div>
          ))}

          {/* Step 3 — pile cascades on top, burying the hand (non-linear edge) */}
          {FACE_DOWN_PILE.map((pos, i) => (
            <div
              key={`pile-${i}`}
              className="hero-card"
              style={{
                position: 'absolute',
                width: 158, height: 222,
                borderRadius: 13,
                top: pos.top, left: pos.left,
                transform: `translate(-50%,-50%) rotate(${pos.rotate}deg)`,
                zIndex: pos.z,
                overflow: 'hidden',
                boxShadow: '0 16px 40px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              <CardBack inset={9} mono={24} />
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        opacity: 0.35,
      }}>
        <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#f0f4ff', fontFamily: 'var(--font-space,sans-serif)' }}>SCROLL</span>
        <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, #f0f4ff, transparent)' }} />
      </div>
    </div>
  )
}
