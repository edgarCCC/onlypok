'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface Props {
  studentCount: number
  coachCount: number
  formationCount: number
  avgRating: number
}

export default function StatsSection({ studentCount, coachCount, formationCount, avgRating }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const STATS = [
    { value: studentCount,   suffix: '+',  label: 'Joueurs inscrits',       accent: '#7c3aed', decimals: 0 },
    { value: coachCount,     suffix: '+',  label: 'Coachs certifiés',        accent: '#06b6d4', decimals: 0 },
    { value: formationCount, suffix: '+',  label: 'Formations disponibles',  accent: '#a855f7', decimals: 0 },
    { value: avgRating,      suffix: '/5', label: 'Note moyenne des coachs', accent: '#e11d48', decimals: 1 },
  ]

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>('.stat-item')

    gsap.from(items, {
      y: 50, opacity: 0,
      duration: 0.7, ease: 'power3.out',
      stagger: 0.1,
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 75%',
      },
    })

    items.forEach((item, i) => {
      const numEl = item.querySelector<HTMLElement>('.stat-num')
      if (!numEl) return
      const stat = STATS[i]
      const obj = { val: 0 }
      gsap.to(obj, {
        val: stat.value,
        duration: 2,
        ease: 'power2.out',
        snap: stat.decimals === 0 ? { val: 1 } : undefined,
        onUpdate: () => { numEl.textContent = obj.val.toFixed(stat.decimals) + stat.suffix },
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          once: true,
        },
      })
    })
  }, { scope: containerRef })

  return (
    <section
      ref={containerRef}
      style={{
        background: '#070714',
        padding: 'clamp(80px,10vh,120px) clamp(20px,5vw,80px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${STATS.length}, 1fr)`,
        gap: 0,
      }}>
        {STATS.map((s, i) => (
          <div
            key={i}
            className="stat-item"
            style={{
              textAlign: 'center',
              padding: '0 clamp(16px, 3vw, 40px)',
              borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <div
              className="stat-num"
              style={{
                fontFamily: 'var(--font-syne, sans-serif)',
                fontSize: 'clamp(44px, 5.5vw, 76px)',
                fontWeight: 800, lineHeight: 1,
                letterSpacing: '-0.04em',
                background: `linear-gradient(135deg, ${s.accent}, #f0f4ff)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 12,
              }}
            >
              {(0).toFixed(s.decimals)}{s.suffix}
            </div>
            <div style={{
              fontSize: 13, color: 'rgba(240,244,255,0.38)',
              letterSpacing: '0.04em', fontFamily: 'var(--font-space,sans-serif)',
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
