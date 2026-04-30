'use client'

import { useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const FEATURES_STUDENT = [
  'Accès à toutes les formations',
  'Coaching 1:1 avec des pros',
  'Outils d\'analyse et review IA',
  'Progression et classements',
  'Communauté privée',
]

const FEATURES_COACH = [
  'Publication de formations illimitée',
  'Gestion des sessions coaching',
  'Dashboard analytics avancé',
  'Badge "CERTIFIÉ PRO"',
  'Support prioritaire',
]

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="7" fill={color} fillOpacity="0.15"/>
      <path d="M4 7L6 9L10 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function PricingTeaser() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.pricing-card-left', {
      x: -60, opacity: 0,
      duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: containerRef.current, start: 'top 70%' },
    })
    gsap.from('.pricing-card-right', {
      x: 60, opacity: 0,
      duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: containerRef.current, start: 'top 70%' },
    })
    gsap.from('.pricing-header', {
      y: 30, opacity: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: containerRef.current, start: 'top 80%' },
    })
  }, { scope: containerRef })

  return (
    <section
      id="tarifs"
      ref={containerRef}
      style={{
        background: '#070714',
        padding: 'clamp(80px,10vh,120px) clamp(20px,5vw,80px)',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="pricing-header" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(240,244,255,0.25)', marginBottom: 16, fontFamily: 'var(--font-space,sans-serif)', fontWeight: 600 }}>ACCÈS</div>
          <h2 style={{
            fontFamily: 'var(--font-syne,sans-serif)',
            fontSize: 'clamp(28px,3.5vw,48px)',
            fontWeight: 800, color: '#f0f4ff',
            letterSpacing: '-0.025em', marginBottom: 12,
          }}>
            Deux rôles. Une plateforme.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(240,244,255,0.38)', fontFamily: 'var(--font-space,sans-serif)' }}>
            Les élèves accèdent gratuitement. Les coachs publient et gagnent.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Student card — featured */}
          <div
            className="pricing-card-left"
            style={{
              padding: 32, borderRadius: 18,
              background: 'linear-gradient(145deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))',
              border: '1px solid rgba(124,58,237,0.4)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
              padding: '5px 20px', borderRadius: '0 0 10px 10px',
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.12em',
              fontFamily: 'var(--font-space,sans-serif)', whiteSpace: 'nowrap',
            }}>
              LE + POPULAIRE
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#a855f7', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'var(--font-space,sans-serif)', marginTop: 20 }}>POUR LES ÉLÈVES</div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 48, fontWeight: 800, color: '#f0f4ff' }}>Gratuit</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              {FEATURES_STUDENT.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckIcon color="#06b6d4" />
                  <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.7)', fontFamily: 'var(--font-space,sans-serif)' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/register"
              style={{
                display: 'block', textAlign: 'center',
                padding: '14px 24px', borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: '#fff', textDecoration: 'none',
                fontSize: 13, fontWeight: 700,
                boxShadow: '0 8px 28px rgba(124,58,237,0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                fontFamily: 'var(--font-space,sans-serif)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 36px rgba(124,58,237,0.55)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 28px rgba(124,58,237,0.4)' }}
            >
              Créer mon compte — c&apos;est gratuit
            </Link>
          </div>

          {/* Coach card */}
          <div
            className="pricing-card-right"
            style={{
              padding: 32, borderRadius: 18,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,244,255,0.45)', letterSpacing: '0.1em', marginBottom: 16, fontFamily: 'var(--font-space,sans-serif)' }}>POUR LES COACHS</div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 48, fontWeight: 800, color: '#f0f4ff' }}>49€</span>
              <span style={{ fontSize: 14, color: 'rgba(240,244,255,0.4)', marginLeft: 4, fontFamily: 'var(--font-space,sans-serif)' }}>/mois</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              {FEATURES_COACH.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckIcon color="#7c3aed" />
                  <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.55)', fontFamily: 'var(--font-space,sans-serif)' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/register"
              style={{
                display: 'block', textAlign: 'center',
                padding: '13px 24px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#f0f4ff', textDecoration: 'none',
                fontSize: 13, fontWeight: 600,
                transition: 'border-color 0.2s, background 0.2s',
                fontFamily: 'var(--font-space,sans-serif)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
            >
              Devenir coach certifié
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
