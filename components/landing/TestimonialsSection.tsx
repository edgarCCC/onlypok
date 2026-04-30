'use client'

import { useRef } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { RankFish1, RankFish2, RankFish3 } from './ranks'
import Flag from './Flag'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const TESTIMONIALS = [
  {
    quote: "En 3 mois avec OnlyPok, j'ai doublé mon ROI sur les MTT. Le coaching 1:1 avec Marcus a transformé ma vision du jeu en position.",
    pseudo: 'DRAGONRIVER_X',
    country: 'FR',
    format: 'MTT',
    rating: 5,
    accent: 'oklch(0.72 0.22 295)',
    Avatar: RankFish1,
    memberSince: '3 mois',
    offset: 0,
  },
  {
    quote: "La Review IA est bluffante. Elle m'a détecté une fuite sur mes donk-bets en OOP que je n'avais pas vue depuis 2 ans. Outil indispensable.",
    pseudo: 'ACEFACTORY_K',
    country: 'BE',
    format: 'CASH GAME',
    rating: 5,
    accent: 'oklch(0.72 0.16 200)',
    Avatar: RankFish2,
    memberSince: '5 mois',
    offset: 40,
  },
  {
    quote: "Meilleure plateforme de poker training que j'ai testée. Contenu dense, coachs disponibles, communauté sérieuse. Pas de fla fla.",
    pseudo: 'ICM_WIZARD',
    country: 'CH',
    format: 'EXPRESSO',
    rating: 5,
    accent: 'oklch(0.62 0.22 15)',
    Avatar: RankFish3,
    memberSince: '7 mois',
    offset: -20,
  },
]

function Stars({ count, accent }: { count: number; accent: string }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 14 14"
          fill={i < count ? accent : 'rgba(255,255,255,0.1)'}>
          <polygon points="7,1 8.8,5.5 13.5,5.5 9.8,8.5 11.2,13 7,10.2 2.8,13 4.2,8.5 0.5,5.5 5.2,5.5"/>
        </svg>
      ))}
    </div>
  )
}

function TestiCard({ t, delay }: { t: typeof TESTIMONIALS[0]; delay: number }) {
  const { Avatar, accent } = t

  return (
    <div
      className="testi-card"
      style={{
        marginTop: t.offset,
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)`,
        '--accent': accent,
      } as CSSProperties}
    >
      {/* Layered bg — same recipe as PlayerCard */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'radial-gradient(ellipse at 50% 0%, oklch(0.22 0.03 265) 0%, oklch(0.13 0.02 265) 60%, oklch(0.08 0.01 265) 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
        background: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 6px), radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06), transparent 40%)',
        mixBlendMode: 'overlay',
      }} />
      {/* Iridescent border */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
        padding: 1.5,
        background: `conic-gradient(from 0deg, ${accent}, oklch(0.8 0.2 200), oklch(0.8 0.2 320), ${accent})`,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        opacity: 0.5,
        zIndex: 10,
      } as CSSProperties} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: '22px 20px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Top: stars + avatar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Stars count={t.rating} accent={accent} />
            <div style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.22em',
              padding: '4px 8px',
              border: `1px solid color-mix(in oklab, ${accent} 45%, transparent)`,
              borderRadius: 4, width: 'fit-content',
              background: 'rgba(0,0,0,0.3)',
              color: accent,
              fontFamily: 'var(--font-dm-mono,monospace)',
            }}>
              {t.format}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flag code={t.country} />
              <span style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                {t.country}
              </span>
            </div>
          </div>

          {/* Fish avatar */}
          <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: -10,
              background: `radial-gradient(circle at 50% 60%, color-mix(in oklab, ${accent} 35%, transparent), transparent 70%)`,
              filter: 'blur(12px)',
            }} />
            <div style={{
              position: 'relative', width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              filter: `drop-shadow(0 6px 16px rgba(0,0,0,0.6))`,
            }}>
              <Avatar size={90} />
            </div>
          </div>
        </div>

        {/* Divider + pseudo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.5 }} />
          <span style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#f4f5f8',
          }}>{t.pseudo}</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.5 }} />
        </div>

        {/* Quote */}
        <p style={{
          fontSize: 13, color: 'rgba(240,244,255,0.6)',
          lineHeight: 1.7, marginBottom: 16,
          fontFamily: 'var(--font-space,sans-serif)',
          fontStyle: 'italic',
        }}>
          &ldquo;{t.quote}&rdquo;
        </p>

        {/* Membre depuis */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 7, padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 8, letterSpacing: '0.18em', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-dm-mono,monospace)' }}>
            MEMBRE DEPUIS
          </span>
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14, fontWeight: 700, color: t.accent, letterSpacing: '-0.01em' }}>
            {t.memberSince}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TestimonialsSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>('.testi-card')
    cards.forEach((card, i) => {
      const t = TESTIMONIALS[i]
      const fromX = t.offset < 0 ? 50 : t.offset > 0 ? -50 : 0
      gsap.from(card, {
        x: fromX, y: 40, opacity: 0,
        duration: 0.9, ease: 'power3.out',
        delay: i * 0.12,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
          once: true,
        },
      })
    })
  }, { scope: containerRef })

  return (
    <section
      ref={containerRef}
      style={{
        background: '#04040a',
        padding: 'clamp(80px,10vh,120px) clamp(20px,5vw,80px)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.22em', color: 'rgba(240,244,255,0.25)',
            marginBottom: 16, fontFamily: 'var(--font-space,sans-serif)', fontWeight: 600,
          }}>TÉMOIGNAGES</div>
          <h2 style={{
            fontFamily: 'var(--font-syne,sans-serif)',
            fontSize: 'clamp(28px,3.5vw,48px)',
            fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.025em',
          }}>
            Ils ont transformé leur jeu
          </h2>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 24, alignItems: 'start',
        }}>
          {TESTIMONIALS.map((t, i) => (
            <TestiCard key={i} t={t} delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  )
}
