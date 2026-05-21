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
  coach?: {
    username: string | null
    avatar_url?: string | null
    is_pro?: boolean | null
    years_experience?: number | null
    variants?: string[] | null
  }
}

const VARIANT_COLORS: Record<string, string> = {
  MTT: '#7c3aed', Cash: '#06b6d4', Expresso: '#e11d48', Autre: '#7c3aed',
}

const PALETTE = ['#7c3aed','#06b6d4','#a855f7','#ef4444','#f59e0b','#8b5cf6','#ec4899','#10b981']
function hashColor(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
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
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
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
    <div style={{ padding: '14px 14px 13px', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
        marginTop: 'auto',
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
      <div onClick={onPlay} style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', height: '100%' }}>
        {inner}
      </div>
    )
  }

  if (f.content_type === 'coaching') {
    return <CoachingCard f={f} />
  }

  return (
    <Link href={`/formations/${f.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      {inner}
    </Link>
  )
}

function CoachingCard({ f }: { f: Formation }) {
  const [hovered, setHovered] = useState(false)
  const username  = f.coach?.username ?? 'Coach'
  const color     = VARIANT_COLORS[f.variant ?? ''] ?? hashColor(username)
  const initials  = username.slice(0, 2).toUpperCase()
  const isPro     = f.coach?.is_pro ?? false
  const yearsExp  = f.coach?.years_experience ?? 0
  const variants  = (f.coach?.variants ?? []) as string[]

  return (
    <Link href={`/formations/${f.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? 'rgba(255,255,255,0.048)' : 'rgba(255,255,255,0.028)',
          border: `1px solid ${hovered ? color + '45' : 'rgba(232,228,220,0.07)'}`,
          borderRadius: 20,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          transform: hovered ? 'translateY(-5px)' : 'none',
          boxShadow: hovered ? `0 20px 56px ${color}1a, 0 4px 16px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', height: '100%',
        }}>

        {/* Colour band — gradient only, avatar goes in the circle below */}
        <div style={{
          height: 68,
          background: `linear-gradient(135deg, ${color}30 0%, ${color}0c 65%, transparent 100%)`,
          position: 'relative', flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 140% at 8% 50%, ${color}1c, transparent)` }} />
          {isPro && (
            <div style={{
              position: 'absolute', top: 10, left: 14,
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 99,
              background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)',
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em' }}>PRO</span>
            </div>
          )}
          {f.variant && (
            <span style={{
              position: 'absolute', top: 10, right: 14,
              fontSize: 9, fontWeight: 800, color: '#fff',
              background: 'rgba(5,7,9,0.78)', backdropFilter: 'blur(8px)',
              border: `1px solid ${color}55`, padding: '2px 8px', borderRadius: 99,
              letterSpacing: '0.07em', textShadow: `0 0 10px ${color}`,
            }}>{f.variant}</span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '0 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Avatar + price row */}
          <div style={{ marginTop: -28, marginBottom: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', padding: 2.5, flexShrink: 0,
              background: `conic-gradient(from 135deg, ${color}, ${color}55, ${color})`,
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%', background: '#07090e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', fontSize: 16, fontWeight: 800, color: '#fff',
              }}>
                {f.coach?.avatar_url
                  ? <img src={f.coach.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
            </div>
            <div style={{ padding: '5px 10px', borderRadius: 10, background: `${color}12`, border: `1px solid ${color}30`, textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.5px' }}>{f.price}€</div>
              <div style={{ fontSize: 9, color: 'rgba(232,228,220,0.28)', marginTop: 1 }}>coaching</div>
            </div>
          </div>

          {/* Name */}
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#E8E4DC', margin: '0 0 3px', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </h3>

          {/* Desc */}
          {f.short_desc && (
            <p style={{
              fontSize: 11.5, color: 'rgba(232,228,220,0.45)', lineHeight: 1.55, margin: '0 0 10px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
            }}>{f.short_desc}</p>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {variants.slice(0, 3).map((v: string) => (
                <span key={v} style={{
                  fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                  background: `${color}12`, color, border: `1px solid ${color}28`, letterSpacing: '0.04em',
                }}>{v}</span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{
            display: 'flex', padding: '9px 0', marginTop: 'auto',
            borderTop: '1px solid rgba(232,228,220,0.07)',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 10.5, color: 'rgba(232,228,220,0.36)' }}>
              {f.coach?.username ?? '—'}
              {f.level ? <span style={{ color: 'rgba(232,228,220,0.22)' }}> · {f.level}</span> : null}
            </span>
            {yearsExp > 0 && (
              <span style={{ fontSize: 10, color: 'rgba(232,228,220,0.28)' }}>{yearsExp} ans exp.</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
