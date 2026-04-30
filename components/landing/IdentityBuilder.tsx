'use client'

import { useState } from 'react'
import PlayerCard, { type CardData, type FxData } from './PlayerCard'
import Panel from './Panel'

const DEFAULT_DATA: CardData = {
  pseudo: 'ACE_RIVER',
  country: 'FR',
  rating: 87,
  role: 'student',
  avatar: 'shark1',
  format: 'MTT',
  abi: 55,
  volume: '10K',
  roi: 18,
  gto: 85,
  streak: 14,
  trophies: 12,
  coachRating: 4.9,
  coachReach: '1.2K',
  coachStudents: 150,
}

const DEFAULT_FX: FxData = { tilt: 12, noise: 0.4, iris: 0.7 }

export default function IdentityBuilder() {
  const [data, setData] = useState<CardData>(DEFAULT_DATA)
  const [fx, setFx]     = useState<FxData>(DEFAULT_FX)

  return (
    <section style={{
      background: '#07080b',
      padding: '110px 48px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 18% 30%, oklch(0.4 0.18 280 / 0.2), transparent 50%),
          radial-gradient(circle at 82% 70%, oklch(0.55 0.16 75 / 0.15), transparent 55%)
        `,
      }} />
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
      }} />

      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.25)', marginBottom: 14,
            fontFamily: 'var(--font-dm-mono, monospace)',
          }}>
            VOTRE IDENTITÉ
          </div>
          <h2 style={{
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 700, color: '#fff', letterSpacing: '-0.03em',
            lineHeight: 1.1, marginBottom: 16,
          }}>
            Build Your Card
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            Personnalise ta carte de joueur — rang, stats, effets. Chaque détail compte.
          </p>
        </div>

        {/* Card + Panel layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 56,
          alignItems: 'center',
          justifyItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <PlayerCard data={data} fx={fx} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'rgba(232,233,238,0.4)',
              fontSize: 11, letterSpacing: '0.14em',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'oklch(0.78 0.15 75)', boxShadow: '0 0 12px oklch(0.78 0.15 75)', display: 'inline-block' }} />
              Move your cursor across the card
            </div>
          </div>
          <Panel data={data} setData={setData} fx={fx} setFx={setFx} />
        </div>
      </div>
    </section>
  )
}
