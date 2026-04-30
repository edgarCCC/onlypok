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
  coach?: { username: string | null }
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
  const isFree      = f.price === 0
  const isPlayable  = isFree && f.content_type === 'video' && !!f.video_url && !!onPlay
  const color       = VARIANT_COLORS[f.variant ?? ''] ?? accentColor ?? '#7c3aed'

  const crop   = f.thumbnail_crop
  const bgSize = crop?.zoom != null ? `${crop.zoom * 100}%` : 'cover'
  const bgPos  = crop != null ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center'

  const cardStyle: React.CSSProperties = {
    background: hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${hovered ? color + '60' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
    transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
    transition: 'border-color 0.2s, transform 0.2s, background 0.2s',
  }

  const thumbnail = (
    <div style={{
      height: 148,
      background: f.thumbnail_url ? undefined : `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
      backgroundImage: f.thumbnail_url ? `url(${f.thumbnail_url})` : undefined,
      backgroundSize: f.thumbnail_url ? bgSize : undefined,
      backgroundPosition: f.thumbnail_url ? bgPos : undefined,
      backgroundRepeat: 'no-repeat',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {!f.thumbnail_url && <span style={{ fontSize: 40, opacity: 0.2 }}>♠</span>}

      {/* Barre couleur */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${color}, ${color}80)`, borderRadius: '16px 16px 0 0' }} />

      {/* Badges */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {f.variant
          ? <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(7,9,14,0.72)', backdropFilter: 'blur(8px)', border: `1px solid ${color}70`, padding: '3px 9px', borderRadius: 99, letterSpacing: '0.05em', textShadow: `0 0 8px ${color}` }}>{f.variant}</span>
          : <span />}
        <span style={{ fontSize: 11, fontWeight: 800, color: isFree ? '#06b6d4' : '#fff', background: isFree ? 'rgba(7,9,14,0.72)' : 'rgba(7,9,14,0.72)', backdropFilter: 'blur(8px)', border: `1px solid ${isFree ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.22)'}`, padding: '3px 9px', borderRadius: 99 }}>
          {isFree ? 'Gratuit' : `${f.price}€`}
        </span>
      </div>

      {/* Bouton play centré — visible au hover pour vidéos gratuites */}
      {isPlayable && (
        <div style={{
          position: 'absolute', inset: 0,
          background: hovered ? 'rgba(0,0,0,0.45)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: hovered ? '#fff' : 'rgba(255,255,255,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: hovered ? 'scale(1)' : 'scale(0.6)',
            opacity: hovered ? 1 : 0,
            transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            {/* Triangle play */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M5 3l11 6-11 6V3z" fill="#07090e" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )

  const content = (
    <div style={{ padding: '16px' }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6, lineHeight: 1.4, letterSpacing: '-0.2px' }}>{f.title}</h3>
      {f.short_desc && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', marginBottom: 14, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.short_desc}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.1px' }}>
          {f.coach?.username ?? '—'} · {f.level ?? 'Tous niveaux'}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
          {f.content_type === 'video' ? 'Vidéo' : `${f.modules_count} modules`}
        </span>
      </div>
    </div>
  )

  const inner = (
    <div style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
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
