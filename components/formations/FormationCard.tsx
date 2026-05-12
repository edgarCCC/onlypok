'use client'
import Link from 'next/link'
import { useState } from 'react'

type Formation = {
  id: string
  title: string
  short_desc: string | null
  price: number
  level: string | null
  variant: string | null
  content_type?: string | null
  video_url?: string | null
  thumbnail_url: string | null
  thumbnail_crop?: { zoom?: number; x?: number; y?: number } | null
  duration_minutes: number
  modules_count: number
  coach?: { username: string | null; avatar_url?: string | null }
}

const VARIANT_COLORS: Record<string, string> = {
  MTT: '#7c3aed', Cash: '#06b6d4', Expresso: '#e11d48', Autre: '#7c3aed',
}

export default function FormationCard({
  f, accentColor, onPlay,
}: {
  f: Formation
  accentColor?: string
  onPlay?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isFree     = f.price === 0
  const isPlayable = isFree && f.content_type === 'video' && !!f.video_url && !!onPlay
  const color      = VARIANT_COLORS[f.variant ?? ''] ?? accentColor ?? '#7c3aed'

  const crop        = f.thumbnail_crop
  const bgSize      = crop?.zoom != null ? `${crop.zoom * 100}%` : 'cover'
  const bgPos       = crop != null ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center'
  const coachAvatar = f.coach?.avatar_url ?? null
  const isCoaching  = f.content_type === 'coaching'
  const heroImage   = f.thumbnail_url ?? (isCoaching ? coachAvatar : null)

  const cardStyle: React.CSSProperties = {
    background: hovered ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.028)',
    border: `1px solid ${hovered ? color + '55' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'border-color 0.22s, transform 0.22s, background 0.22s, box-shadow 0.22s',
    boxShadow: hovered
      ? `0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px ${color}22, 0 8px 20px ${color}18`
      : '0 2px 8px rgba(0,0,0,0.3)',
  }

  const thumbnail = (
    <div style={{
      height: 152,
      background: heroImage ? undefined : `linear-gradient(145deg, ${color}18 0%, rgba(5,7,9,0.6) 100%)`,
      backgroundImage: heroImage ? `url(${heroImage})` : undefined,
      backgroundSize: heroImage === coachAvatar ? 'cover' : (heroImage ? bgSize : undefined),
      backgroundPosition: heroImage === coachAvatar ? 'center top' : (heroImage ? bgPos : undefined),
      backgroundRepeat: 'no-repeat',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {!heroImage && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 36, opacity: 0.14, color }}>♠</span>
          {f.variant && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color, opacity: 0.35, textTransform: 'uppercase' }}>
              {f.variant}
            </span>
          )}
        </div>
      )}

      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(to right, ${color}, ${color}40)`,
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.22s',
      }} />

      {/* Badges */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {f.variant
          ? <span style={{
              fontSize: 9, fontWeight: 800, color: '#fff',
              background: 'rgba(5,7,9,0.78)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${color}55`,
              padding: '2px 8px', borderRadius: 99,
              letterSpacing: '0.07em',
              textShadow: `0 0 10px ${color}`,
            }}>{f.variant}</span>
          : <span />}
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isFree ? '#06b6d4' : '#e8eaf0',
          background: 'rgba(5,7,9,0.78)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${isFree ? 'rgba(6,182,212,0.45)' : 'rgba(255,255,255,0.18)'}`,
          padding: '2px 8px', borderRadius: 99,
        }}>
          {isFree ? 'Gratuit' : `${f.price}€`}
        </span>
      </div>

      {/* Play button — visible on hover for free videos */}
      {isPlayable && (
        <div style={{
          position: 'absolute', inset: 0,
          background: hovered ? 'rgba(0,0,0,0.4)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: hovered ? '#fff' : 'rgba(255,255,255,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: hovered ? 'scale(1)' : 'scale(0.5)',
            opacity: hovered ? 1 : 0,
            transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M5 3l11 6-11 6V3z" fill="#07090e" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )

  const content = (
    <div style={{ padding: '14px 14px 13px' }}>
      <h3 style={{
        fontSize: 13, fontWeight: 700,
        color: '#e8eaf0',
        marginBottom: 5, lineHeight: 1.45,
        letterSpacing: '-0.25px',
      }}>{f.title}</h3>

      {f.short_desc && (
        <p style={{
          fontSize: 11.5, color: 'rgba(232,234,240,0.45)',
          marginBottom: 12, lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{f.short_desc}</p>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: f.short_desc ? 0 : 8,
      }}>
        <span style={{
          fontSize: 10.5, color: 'rgba(232,234,240,0.36)',
          letterSpacing: '-0.05px', fontWeight: 400,
        }}>
          {f.coach?.username ?? '—'}
          {f.level ? <span style={{ color: 'rgba(232,234,240,0.22)' }}> · {f.level}</span> : null}
        </span>
        <span style={{
          fontSize: 10, color: 'rgba(232,234,240,0.28)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {f.content_type === 'video' ? 'Vidéo' : `${f.modules_count} module${f.modules_count !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  )

  const inner = (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thumbnail}
      {content}
    </div>
  )

  if (isPlayable) {
    return (
      <div onClick={onPlay} style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
        {inner}
      </div>
    )
  }

  return (
    <Link href={`/formations/${f.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      {inner}
    </Link>
  )
}
