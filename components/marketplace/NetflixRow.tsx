'use client'
import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import FormationCard from '@/components/formations/FormationCard'

const CREAM = '#f0f4ff', SILVER = 'rgba(240,244,255,0.45)'

/* ─── Rangée scrollable façon Netflix (formations / vidéos) ─────────────────── */
export default function NetflixRow({ title, subtitle, formations, accentColor, isTop10, onPlayVideo, eligibleCoachIds }: {
  title: string, subtitle: string, formations: any[], accentColor: string, isTop10?: boolean
  onPlayVideo?: (v: { url: string; title: string }) => void
  eligibleCoachIds?: Set<string>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scroll    = (dir: 'left'|'right') => scrollRef.current?.scrollBy({ left: dir === 'right' ? 800 : -800, behavior: 'smooth' })
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
          <span
            onClick={() => setShowAll(v => !v)}
            style={{ fontSize: 13, fontWeight: 600, color: SILVER, cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = CREAM }}
            onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = SILVER }}>
            {showAll ? '← Réduire' : 'Voir tout →'}
          </span>
          {!showAll && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['left','right'] as const).map(dir => (
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gridAutoRows: '322px', gap: 20, paddingTop: 12 }}>
          {formations.map((f, i) => (
            /* overflow hidden seulement pour contenir le numéro géant du Top 10 — sinon il clippe le lift hover */
            <div key={f.id} style={{ position: 'relative', overflow: isTop10 ? 'hidden' : 'visible', height: '100%' }}>
              {isTop10 && (
                <div style={{ position: 'absolute', left: -10, bottom: 10, fontSize: 110, fontWeight: 900, color: 'rgba(232,228,220,0.05)', zIndex: 0, pointerEvents: 'none', lineHeight: 1, userSelect: 'none' }}>{i + 1}</div>
              )}
              <div
                style={{ position: 'relative', zIndex: 1, transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1)', height: '100%' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.02)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = '' }}>
                <FormationCard
                  f={f}
                  accentColor={accentColor}
                  unverified={eligibleCoachIds ? !eligibleCoachIds.has(f.coach?.id ?? f.coach_id) : false}
                  onPlay={f.price === 0 && f.content_type === 'video' && f.video_url
                    ? () => onPlayVideo?.({ url: f.video_url, title: f.title })
                    : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 50, background: 'linear-gradient(to left, #07090e, transparent)', zIndex: 2, pointerEvents: 'none' }} />
          {/* paddingTop : laisse la place au lift hover (translateY -4px + scale) sans clipping */}
          <div ref={scrollRef} style={{ display: 'flex', gap: 20, overflowX: 'auto', scrollbarWidth: 'none', paddingTop: 12, paddingBottom: 8 }}>
            {formations.map((f, i) => (
              <div key={f.id} style={{ width: isTop10 && i === 0 ? 340 : 290, height: 322, flexShrink: 0, position: 'relative' }}>
                  <div
                  style={{ position: 'relative', zIndex: 1, transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1)', height: '100%' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = '' }}>
                  <FormationCard
                    f={f}
                    accentColor={accentColor}
                    unverified={eligibleCoachIds ? !eligibleCoachIds.has(f.coach?.id ?? f.coach_id) : false}
                    onPlay={f.price === 0 && f.content_type === 'video' && f.video_url
                      ? () => onPlayVideo?.({ url: f.video_url, title: f.title })
                      : undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
