'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const WORDS = "La plupart des joueurs apprennent les règles. Les nôtres apprennent à les réécrire.".split(' ')

export default function ManifestoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineTopRef = useRef<HTMLDivElement>(null)
  const lineBottomRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const words = gsap.utils.toArray<HTMLElement>('.manifesto-word')

    gsap.set(lineTopRef.current, { scaleX: 0, transformOrigin: 'left' })
    gsap.set(lineBottomRef.current, { scaleX: 0, transformOrigin: 'right' })
    gsap.set(words, { opacity: 0.12 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: 1.5,
      },
    })

    tl.to(lineTopRef.current, { scaleX: 1, duration: 1, ease: 'none' }, 0)
    tl.to(lineBottomRef.current, { scaleX: 1, duration: 1, ease: 'none' }, 0)
    words.forEach((word, i) => {
      tl.to(word, { opacity: 1, duration: 0.4, ease: 'power2.out' }, i * 0.06)
    })
  }, { scope: containerRef })

  return (
    <section
      ref={containerRef}
      style={{
        background: '#04040a',
        padding: 'clamp(80px,12vh,140px) clamp(20px,6vw,80px)',
        position: 'relative',
      }}
    >
      <div ref={lineTopRef} style={{
        height: 1, marginBottom: 48,
        background: 'linear-gradient(90deg, transparent, #7c3aed 30%, #06b6d4 70%, transparent)',
        maxWidth: 900, margin: '0 auto 48px',
      }} />

      <p style={{
        fontFamily: 'var(--font-syne, sans-serif)',
        fontSize: 'clamp(24px, 3.5vw, 52px)',
        fontWeight: 700, lineHeight: 1.35,
        textAlign: 'center',
        maxWidth: 900, margin: '0 auto 48px',
        letterSpacing: '-0.02em',
      }}>
        {WORDS.map((word, i) => (
          <span
            key={i}
            className="manifesto-word"
            style={{
              color: '#f0f4ff',
              display: 'inline-block',
              marginRight: '0.3em',
            }}
          >
            {word}
          </span>
        ))}
      </p>

      <div ref={lineBottomRef} style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, #06b6d4 30%, #7c3aed 70%, transparent)',
        maxWidth: 900, margin: '0 auto',
      }} />
    </section>
  )
}
