'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Zap, ChevronRight } from 'lucide-react'
import { CREAM, MUTED, SILVER, DIM, CARD, CARD_HOV, BORDER_HOV, AMBER, AMBER_GRAD, Stars } from './coachTheme'

/* ─── Carte coach — neutre et sobre, l'accent est réservé au prix/note (ambre)
   et au CTA (dégradé de marque). Clic n'importe où = ouverture du panneau. ─── */
export default function CoachCard({ coach, onOpen }: { coach: any; onOpen: () => void }) {
  const initials    = (coach.username ?? 'C').slice(0, 2).toUpperCase()
  const fCount      = coach.formations?.[0]?.count ?? 0
  const variants    = (coach.variants ?? []) as string[]
  const yearsExp    = coach.years_experience ?? 0
  const hourlyRate  = coach.hourly_rate ?? null
  const isPro       = coach.is_pro ?? false
  const avgRating   = coach.avgRating ?? null
  const reviewCount = coach.reviewCount ?? 0
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? CARD_HOV : CARD,
        border: `1px solid ${hovered ? BORDER_HOV : DIM}`,
        borderRadius: 18,
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 20px 48px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '20px 20px 18px',
      }}
    >
      {/* Avatar + prix */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${hovered ? BORDER_HOV : 'rgba(232,228,220,0.12)'}`,
          background: 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', fontSize: 17, fontWeight: 700, color: CREAM,
          position: 'relative', transition: 'border-color 0.2s ease',
        }}>
          {coach.avatar_url
            ? <Image src={coach.avatar_url} alt="" fill sizes="56px" style={{ objectFit: 'cover' }} />
            : initials}
        </div>
        {hourlyRate && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: AMBER, lineHeight: 1, letterSpacing: '-0.5px' }}>{hourlyRate}€</div>
            <div style={{ fontSize: 10, color: SILVER, marginTop: 3 }}>/ heure</div>
          </div>
        )}
      </div>

      {/* Nom + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, minWidth: 0 }}>
        <h3 style={{
          fontSize: 16, fontWeight: 700, color: CREAM, margin: 0,
          letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {coach.username ?? 'Coach'}
        </h3>
        {isPro && !coach.unverified && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: AMBER, letterSpacing: '0.1em',
            padding: '2px 7px', borderRadius: 99, flexShrink: 0,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          }}>PRO</span>
        )}
        {coach.unverified && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: SILVER, letterSpacing: '0.06em',
            padding: '2px 7px', borderRadius: 99, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${DIM}`,
          }}>Non vérifié</span>
        )}
      </div>

      {/* Note */}
      {avgRating !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <Stars rating={avgRating} size={10} />
          <span style={{ fontSize: 11, color: AMBER, fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
          <span style={{ fontSize: 10, color: SILVER }}>({reviewCount})</span>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: SILVER, marginBottom: 10 }}>Nouveau sur OnlyPok</div>
      )}

      {/* Bio */}
      {coach.bio ? (
        <p style={{
          fontSize: 12, color: MUTED, lineHeight: 1.6, margin: '0 0 12px',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
        }}>
          {coach.bio}
        </p>
      ) : <div style={{ flex: 1 }} />}

      {/* Chips variantes — neutres */}
      {variants.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
          {variants.slice(0, 3).map(v => (
            <span key={v} style={{
              fontSize: 9.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
              background: 'rgba(255,255,255,0.04)', color: MUTED, border: `1px solid ${DIM}`,
              letterSpacing: '0.03em',
            }}>{v}</span>
          ))}
          {variants.length > 3 && (
            <span style={{ fontSize: 9.5, color: SILVER, padding: '3px 0' }}>+{variants.length - 3}</span>
          )}
        </div>
      )}

      {/* Rangée méta — une ligne discrète */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingTop: 12, borderTop: `1px solid ${DIM}`, marginBottom: 14,
        fontSize: 11, color: SILVER,
      }}>
        <span>{fCount} formation{fCount > 1 ? 's' : ''}</span>
        {yearsExp > 0 && (
          <>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{yearsExp} an{yearsExp > 1 ? 's' : ''} exp.</span>
          </>
        )}
        {coach.coaching_mode === 'auto' && (
          <>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Zap size={10} /> Résa instantanée
            </span>
          </>
        )}
      </div>

      {/* CTA — seul élément qui porte le dégradé de marque */}
      <button
        className="op-cta"
        onClick={e => { e.stopPropagation(); onOpen() }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '10px', borderRadius: 11, border: 'none',
          background: AMBER_GRAD,
          color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          opacity: hovered ? 1 : 0.92,
        }}
      >
        Réserver <ChevronRight size={13} className="op-cta-arrow" />
      </button>
    </div>
  )
}
