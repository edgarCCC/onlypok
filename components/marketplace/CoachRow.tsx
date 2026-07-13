'use client'
import { useState, useRef } from 'react'
import CoachCard from './CoachCard'
import EdgeScrollZones from './EdgeScrollZones'
import { CREAM, SILVER } from './coachTheme'

const CARD_W = 300
const CARD_H = 340

/* ─── Rangée scrollable façon Netflix, adaptée aux CoachCard ─────────────────── */
export default function CoachRow({ title, subtitle, coaches, accentColor, onOpen }: {
  title: string
  subtitle: string
  coaches: any[]
  accentColor: string
  onOpen: (coach: any) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showAll, setShowAll] = useState(false)

  return (
    <div>
      <div className="sform-row-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Tick accent — relie la rangée à la couleur de l'onglet */}
          <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}20)`, flexShrink: 0, marginTop: 4 }} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 4 }}>
              {title}
            </h2>
            <p style={{ fontSize: 13, color: SILVER }}>{subtitle}</p>
          </div>
        </div>
        {coaches.length > 1 && (
          <span
            onClick={() => setShowAll(v => !v)}
            style={{ fontSize: 13, fontWeight: 600, color: SILVER, cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = CREAM }}
            onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = SILVER }}>
            {showAll ? '← Réduire' : 'Voir tout →'}
          </span>
        )}
      </div>
      {showAll ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gridAutoRows: `${CARD_H}px`, gap: 20 }}>
          {coaches.map(coach => (
            <div key={coach.id} style={{ height: '100%' }}>
              <CoachCard coach={coach} onOpen={() => onOpen(coach)} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <EdgeScrollZones scrollRef={scrollRef} />
          {/* paddingTop : laisse la place au lift hover sans clipping */}
          <div ref={scrollRef} style={{ display: 'flex', gap: 20, overflowX: 'auto', scrollbarWidth: 'none', paddingTop: 12, paddingBottom: 8 }}>
            {coaches.map(coach => (
              <div key={coach.id} style={{ width: CARD_W, height: CARD_H, flexShrink: 0 }}>
                <CoachCard coach={coach} onOpen={() => onOpen(coach)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
