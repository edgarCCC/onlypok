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
      background: 'var(--bg)',
      padding: '110px 48px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          transparent,
          transparent
        `,
      }} />
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          transparent,
          transparent
        `,
        backgroundSize: '64px 64px',
      }} />

      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.22em',
            color: 'var(--text-3)', marginBottom: 14,
            fontFamily: 'var(--font-dm-mono, monospace)',
          }}>
            VOTRE IDENTITÉ
          </div>
          <h2 style={{
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em',
            lineHeight: 1.1, marginBottom: 16,
          }}>
            Build Your Card
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            Personnalise ta carte de joueur — rang, stats, effets. Chaque détail compte.
          </p>
        </div>

        {/* Card + Panel layout */}
        <style>{`@media(max-width:860px){.ib-grid{grid-template-columns:1fr!important;gap:32px!important}}`}</style>
        <div className="ib-grid" style={{
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
              color: 'var(--text-3)',
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
