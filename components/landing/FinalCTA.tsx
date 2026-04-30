'use client'

import { useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function FinalCTA() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mainTitleRef = useRef<HTMLDivElement>(null)
  const glitch1Ref = useRef<HTMLDivElement>(null)
  const glitch2Ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.cta-content', {
      y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: containerRef.current, start: 'top 70%' },
    })

    const glitchTl = gsap.timeline({ repeat: -1, repeatDelay: 3 })
    glitchTl
      .to([glitch1Ref.current, glitch2Ref.current], { opacity: 1, duration: 0.04 })
      .to(glitch1Ref.current, { x: -3, y: 1, duration: 0.06, ease: 'none' })
      .to(glitch2Ref.current, { x: 3, y: -1, duration: 0.06, ease: 'none' }, '<')
      .to(glitch1Ref.current, { x: 2, y: -2, duration: 0.04 })
      .to(glitch2Ref.current, { x: -2, y: 2, duration: 0.04 }, '<')
      .to([glitch1Ref.current, glitch2Ref.current], { x: 0, y: 0, opacity: 0, duration: 0.06 })
  }, { scope: containerRef })

  const TITLE = "Votre prochaine session commence ici."

  return (
    <section
      ref={containerRef}
      style={{
        background: '#04040a',
        padding: 'clamp(100px,14vh,160px) clamp(20px,5vw,80px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%)',
        animation: 'hueShift 8s linear infinite',
      }} />

      <div className="cta-content" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 32 }}>
          <h2
            ref={mainTitleRef}
            style={{
              fontFamily: 'var(--font-syne, sans-serif)',
              fontSize: 'clamp(32px, 5vw, 72px)',
              fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#f0f4ff', margin: 0,
              position: 'relative', zIndex: 2,
            }}
          >
            {TITLE}
          </h2>
          <div
            ref={glitch1Ref}
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, zIndex: 1,
              fontFamily: 'var(--font-syne, sans-serif)',
              fontSize: 'clamp(32px, 5vw, 72px)',
              fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#e11d48', margin: 0,
              opacity: 0, userSelect: 'none',
              mixBlendMode: 'screen',
            }}
          >
            {TITLE}
          </div>
          <div
            ref={glitch2Ref}
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, zIndex: 1,
              fontFamily: 'var(--font-syne, sans-serif)',
              fontSize: 'clamp(32px, 5vw, 72px)',
              fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#06b6d4', margin: 0,
              opacity: 0, userSelect: 'none',
              mixBlendMode: 'screen',
            }}
          >
            {TITLE}
          </div>
        </div>

        <p style={{
          fontSize: 16, color: 'rgba(240,244,255,0.45)',
          maxWidth: 440, margin: '0 auto 48px',
          lineHeight: 1.7, fontFamily: 'var(--font-space,sans-serif)',
        }}>
          Rejoins des milliers de joueurs qui ont fait d'OnlyPok leur edge compétitif.
        </p>

        <div style={{ marginBottom: 32 }}>
          <Link
            href="/register"
            style={{
              display: 'inline-block',
              padding: '16px 48px', borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              color: '#fff', textDecoration: 'none',
              fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
              boxShadow: '0 12px 40px rgba(124,58,237,0.45)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              fontFamily: 'var(--font-space,sans-serif)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 18px 52px rgba(124,58,237,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.45)' }}
          >
            Créer un compte — c'est gratuit
          </Link>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 20,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
          <span style={{ fontSize: 12, color: 'rgba(240,244,255,0.45)', fontFamily: 'var(--font-space,sans-serif)' }}>
            Inscriptions ouvertes
          </span>
        </div>
      </div>

      <style>{`
        @keyframes hueShift {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>
    </section>
  )
}
