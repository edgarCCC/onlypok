'use client'
import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CoachCard from './CoachCard'
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
  const scroll    = (dir: 'left' | 'right') => scrollRef.current?.scrollBy({ left: dir === 'right' ? 800 : -800, behavior: 'smooth' })
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {coaches.length > 1 && (
            <span
              onClick={() => setShowAll(v => !v)}
              style={{ fontSize: 13, fontWeight: 600, color: SILVER, cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = CREAM }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = SILVER }}>
              {showAll ? '← Réduire' : 'Voir tout →'}
            </span>
          )}
          {!showAll && coaches.length > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['left', 'right'] as const).map(dir => (
                <button key={dir} onClick={() => scroll(dir)} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid rgba(232,228,220,0.1)`, background: 'rgba(232,228,220,0.03)', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.25)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.07)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.1)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.03)' }}>
                  {dir === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
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
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 50, background: 'linear-gradient(to left, #07090e, transparent)', zIndex: 2, pointerEvents: 'none' }} />
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
