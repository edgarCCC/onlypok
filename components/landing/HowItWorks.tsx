'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const STEPS = [
  {
    n: '01',
    title: 'Choisis ta formation',
    desc: 'Parcours le catalogue, filtre par niveau et format. Du micro-stakes au high-roller.',
    accent: '#7c3aed',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    n: '02',
    title: 'Apprends avec les pros',
    desc: 'Vidéos HD, analyses de mains et sessions privées avec des coaches certifiés.',
    accent: '#06b6d4',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  },
  {
    n: '03',
    title: 'Mesure tes progrès',
    desc: 'Dashboard personnalisé, métriques live et feedback IA pour itérer vite.',
    accent: '#a855f7',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
]

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.step-card', {
      y: 50, opacity: 0, duration: 0.7, ease: 'power3.out',
      stagger: 0.15,
      scrollTrigger: { trigger: containerRef.current, start: 'top 70%' },
    })
  }, { scope: containerRef })

  return (
    <section ref={containerRef} style={{ background: '#070714', padding: 'clamp(80px,10vh,120px) clamp(20px,5vw,80px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(240,244,255,0.25)', marginBottom: 16, fontFamily: 'var(--font-space,sans-serif)', fontWeight: 600 }}>COMMENT ÇA MARCHE</div>
          <h2 style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.025em' }}>Simple. Structuré. Efficace.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {STEPS.map((step, i) => (
            <div key={i} className="step-card" style={{ padding: '28px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -12, right: 12, fontFamily: 'var(--font-syne,sans-serif)', fontSize: 80, fontWeight: 800, color: step.accent, opacity: 0.06, lineHeight: 1, userSelect: 'none' }}>{step.n}</div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${step.accent}18`, border: `1px solid ${step.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: step.accent, marginBottom: 20 }}>{step.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', marginBottom: 10, fontFamily: 'var(--font-syne,sans-serif)' }}>{step.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(240,244,255,0.45)', lineHeight: 1.7, fontFamily: 'var(--font-space,sans-serif)' }}>{step.desc}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${step.accent}66, transparent)` }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
