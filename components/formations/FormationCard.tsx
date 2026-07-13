'use client'
import Link from 'next/link'
import Image from 'next/image'
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

/* Palette restreinte : neutres + accents de marque. Aucune couleur par
   variante ni par coach — l'accent vient de l'onglet, en touche discrète. */
const CREAM  = '#f0f4ff'
const AMBER  = '#f59e0b'
const BLUE   = '#3b82f6'
const BORDER     = 'rgba(255,255,255,0.07)'
const BORDER_HOV = 'rgba(232,228,220,0.18)'

/* CTA en dégradé 3 teintes de la couleur de l'onglet — la classe .op-cta
   l'étire et le fait dériver lentement (background-position animé) */
const CTA_GRADS: Record<string, string> = {
  '#7c3aed': 'linear-gradient(110deg, #6d28d9, #8b5cf6, #a78bfa)',   // Formations
  '#3b82f6': 'linear-gradient(110deg, #2563eb, #3b82f6, #60a5fa)',   // Vidéos
  '#f59e0b': 'linear-gradient(110deg, #ea580c, #f59e0b, #fbbf24)',   // Coaching
}
const ctaGradient = (accent?: string) =>
  CTA_GRADS[accent ?? ''] ?? CTA_GRADS['#7c3aed']

/* CTA visuel — la carte entière est déjà cliquable (Link/onClick), ce bloc
   n'est qu'une affordance, pas un élément interactif imbriqué. */
function CardCta({ label, gradient, hovered }: { label: string; gradient: string; hovered: boolean }) {
  return (
    <div className="op-cta" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      width: '100%', padding: '9px', borderRadius: 10, marginTop: 12,
      background: gradient, color: '#fff',
      fontSize: 12.5, fontWeight: 700,
      opacity: hovered ? 1 : 0.92,
    }}>
      {label}
      <svg className="op-cta-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  )
}

export default function FormationCard({
  f, accentColor, onPlay, unverified = false,
}: {
  f: Formation
  accentColor?: string
  onPlay?: () => void
  unverified?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const isFree     = f.price === 0
  const isPlayable = isFree && f.content_type === 'video' && !!f.video_url && !!onPlay

  const crop        = f.thumbnail_crop
  const bgSize      = crop?.zoom != null ? `${crop.zoom * 100}%` : 'cover'
  const bgPos       = crop != null ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center'
  const coachAvatar = f.coach?.avatar_url ?? null
  const isCoaching  = f.content_type === 'coaching'
  const heroImage   = f.thumbnail_url ?? (isCoaching ? coachAvatar : null)

  const cardStyle: React.CSSProperties = {
    background: hovered ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.028)',
    border: `1px solid ${hovered ? BORDER_HOV : BORDER}`,
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'border-color 0.22s, transform 0.22s, background 0.22s, box-shadow 0.22s',
    boxShadow: hovered
      ? '0 16px 40px rgba(0,0,0,0.6)'
      : '0 2px 8px rgba(0,0,0,0.3)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  }

  const thumbnail = (
    <div style={{
      height: 152,
      background: heroImage ? undefined : 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(5,7,9,0.6) 100%)',
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
          <span style={{ fontSize: 36, opacity: 0.12, color: CREAM }}>♠</span>
          {f.variant && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: CREAM, opacity: 0.25, textTransform: 'uppercase' }}>
              {f.variant}
            </span>
          )}
        </div>
      )}

      {/* Badges */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {f.variant
          ? <span style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(240,244,255,0.85)',
              background: 'rgba(5,7,9,0.78)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.16)',
              padding: '2px 8px', borderRadius: 99,
              letterSpacing: '0.07em',
            }}>{f.variant}</span>
          : <span />}
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isFree ? BLUE : '#e8eaf0',
          background: 'rgba(5,7,9,0.78)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${isFree ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.18)'}`,
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
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
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

      <CardCta
        label={f.content_type === 'video' ? (isPlayable ? 'Regarder' : 'Voir la vidéo') : 'Voir la formation'}
        gradient={ctaGradient(accentColor)}
        hovered={hovered}
      />
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
    return <CoachingCard f={f} unverified={unverified} />
  }

  return (
    <Link href={`/formations/${f.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      {inner}
    </Link>
  )
}

function CoachingCard({ f, unverified = false }: { f: Formation; unverified?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const username  = f.coach?.username ?? 'Coach'
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
          border: `1px solid ${hovered ? BORDER_HOV : 'rgba(232,228,220,0.07)'}`,
          borderRadius: 18,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
          transform: hovered ? 'translateY(-4px)' : 'none',
          boxShadow: hovered ? '0 20px 48px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', height: '100%',
          padding: '18px 18px 16px',
        }}>

        {/* Avatar + prix */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            border: `1px solid ${hovered ? BORDER_HOV : 'rgba(232,228,220,0.12)'}`,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', fontSize: 15, fontWeight: 700, color: CREAM,
            position: 'relative', transition: 'border-color 0.2s ease',
          }}>
            {f.coach?.avatar_url
              ? <Image src={f.coach.avatar_url} alt="" fill sizes="52px" style={{ objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: AMBER, lineHeight: 1, letterSpacing: '-0.5px' }}>{f.price}€</div>
            <div style={{ fontSize: 9, color: 'rgba(232,228,220,0.28)', marginTop: 2 }}>coaching</div>
          </div>
        </div>

        {/* Nom + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#E8E4DC', margin: 0, letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </h3>
          {isPro && !unverified && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: AMBER, letterSpacing: '0.1em',
              padding: '2px 7px', borderRadius: 99, flexShrink: 0,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            }}>PRO</span>
          )}
          {unverified && (
            <span style={{
              fontSize: 9, fontWeight: 600, color: 'rgba(232,228,220,0.4)', letterSpacing: '0.06em',
              padding: '2px 7px', borderRadius: 99, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,228,220,0.1)',
            }}>Non vérifié</span>
          )}
        </div>

        {/* Desc */}
        {f.short_desc && (
          <p style={{
            fontSize: 11.5, color: 'rgba(232,228,220,0.45)', lineHeight: 1.55, margin: '0 0 10px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
          }}>{f.short_desc}</p>
        )}

        {/* Variants — chips neutres */}
        {variants.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {variants.slice(0, 3).map((v: string) => (
              <span key={v} style={{
                fontSize: 9.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                background: 'rgba(255,255,255,0.04)', color: 'rgba(232,228,220,0.45)',
                border: '1px solid rgba(232,228,220,0.08)', letterSpacing: '0.03em',
              }}>{v}</span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex', padding: '9px 0 0', marginTop: 'auto',
          borderTop: '1px solid rgba(232,228,220,0.07)',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10.5, color: 'rgba(232,228,220,0.36)' }}>
            {f.variant ?? 'Coaching'}
            {f.level ? <span style={{ color: 'rgba(232,228,220,0.22)' }}> · {f.level}</span> : null}
          </span>
          {yearsExp > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(232,228,220,0.28)' }}>{yearsExp} ans exp.</span>
          )}
        </div>

        <CardCta label="Réserver" gradient={ctaGradient(AMBER)} hovered={hovered} />
      </div>
    </Link>
  )
}
