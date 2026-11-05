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
const CREAM  = 'var(--text)'
const AMBER  = 'var(--accent-text)'
const CONTOUR     = 'var(--forest)'
const CONTOUR_HOV = 'var(--ink)'

/* Une formation est un paquet de leçons : deux plaques dépassent sous la carte et s'écartent au survol. */
const stackShadow = (hovered: boolean) => hovered
  ? '0 11px 0 -3px var(--accent), 0 21px 0 -6px var(--accent-soft)'
  : '0 8px 0 -3px var(--accent), 0 16px 0 -6px var(--accent-soft)'

function formatVideoDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const rest = minutes % 60
  return rest ? `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, '0')}` : `${minutes / 60} h`
}

/* CTA visuel : la carte entière est déjà cliquable (Link/onClick), ce bloc n'est qu'une affordance,
   pas un élément interactif imbriqué. Bouton standard : Edgar a retiré le violet des cartes (05/11). */
function CardCta({ label, hovered }: { label: string; hovered: boolean }) {
  return (
    <div className="op-cta" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      width: '100%', padding: '9px', borderRadius: 10, marginTop: 8,
      background: hovered ? 'var(--brand-hover)' : 'var(--brand)',
      color: 'var(--on-brand)',
      fontSize: 12.5, fontWeight: 700,
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
  const isVideo    = f.content_type === 'video'
  const isPlayable = isFree && isVideo && !!f.video_url && !!onPlay

  const crop        = f.thumbnail_crop
  const bgSize      = crop?.zoom != null ? `${crop.zoom * 100}%` : 'cover'
  const bgPos       = crop != null ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center'
  const coachAvatar = f.coach?.avatar_url ?? null
  const isCoaching  = f.content_type === 'coaching'
  const heroImage   = f.thumbnail_url ?? (isCoaching ? coachAvatar : null)

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: `1.5px solid ${hovered ? CONTOUR_HOV : CONTOUR}`,
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'border-color 0.22s, transform 0.22s, background 0.22s, box-shadow 0.22s',
    boxShadow: isVideo
      ? (hovered ? 'var(--shadow-float)' : 'none')
      : stackShadow(hovered),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  }

  const thumbnail = (
    <div style={{
      height: 150, flexShrink: 0,
      margin: '7px 7px 0',
      borderRadius: 10,
      overflow: 'hidden',
      border: '1px solid var(--forest)',
      background: heroImage ? undefined : 'linear-gradient(145deg, color-mix(in srgb, var(--overlay) 4%, transparent) 0%, color-mix(in srgb, var(--bg) 60%, transparent) 100%)',
      backgroundImage: heroImage ? `url(${heroImage})` : undefined,
      backgroundSize: heroImage === coachAvatar ? 'cover' : (heroImage ? bgSize : undefined),
      backgroundPosition: heroImage === coachAvatar ? 'center top' : (heroImage ? bgPos : undefined),
      backgroundRepeat: 'no-repeat',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {!heroImage && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {f.variant && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: CREAM, opacity: 0.25, textTransform: 'uppercase' }}>
              {f.variant}
            </span>
          )}
        </div>
      )}

      {/* Badges */}
      <div style={{ position: 'absolute', zIndex: 1, top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {f.variant
          ? <span style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text)',
              background: 'var(--surface)',
              padding: '2px 8px', borderRadius: 99,
              letterSpacing: '0.07em',
            }}>{f.variant}</span>
          : <span />}
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isFree ? 'var(--cream)' : 'var(--on-accent)',
          background: isFree ? 'var(--forest)' : 'var(--accent)',
          padding: '2px 8px', borderRadius: 99,
        }}>
          {isFree ? 'Gratuit' : `${f.price}€`}
        </span>
      </div>

      {/* Vidéo : le bouton de lecture se voit au repos et se remplit au survol, la durée reste sur l'image */}
      {isVideo && (
        <div style={{
          position: 'absolute', inset: 0,
          background: hovered ? 'rgba(21,38,28,0.32)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: hovered ? 'var(--brand)' : 'var(--cream)',
            color: hovered ? 'var(--on-brand)' : 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), background 0.2s, color 0.2s',
          }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M5 3l11 6-11 6V3z" fill="currentColor" />
            </svg>
          </div>
        </div>
      )}
      {isVideo && f.duration_minutes > 0 && (
        <span style={{
          position: 'absolute', zIndex: 1, right: 8, bottom: 8,
          fontSize: 10, fontWeight: 700, color: 'var(--text)',
          background: 'var(--surface)',
          padding: '2px 8px', borderRadius: 99,
          fontVariantNumeric: 'tabular-nums',
        }}>{formatVideoDuration(f.duration_minutes)}</span>
      )}
    </div>
  )

  const content = (
    <>
    <div style={{ padding: '12px 12px 10px', flex: 1, minHeight: 0 }}>
      <h3 style={{
        fontSize: 14, fontWeight: 700,
        color: 'var(--text)',
        marginBottom: 5, lineHeight: 1.35,
        letterSpacing: '-0.25px',
        textWrap: 'balance',
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{f.title}</h3>

      {f.short_desc && (
        <p style={{
          fontSize: 11.5, color: 'var(--text-2)',
          lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{f.short_desc}</p>
      )}
    </div>

    {/* Pied : le bouton a la largeur de la vignette, le violet est réservé aux boutons importants */}
    <div style={{ flexShrink: 0, padding: '0 7px 7px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '0 5px', paddingTop: 9, minHeight: 16,
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: 10.5, color: 'var(--text-3)',
          letterSpacing: '-0.05px', fontWeight: 400,
        }}>
          {f.coach?.username ?? '—'}
          {f.level ? <span style={{ color: 'var(--text-3)' }}> · {f.level}</span> : null}
        </span>
        <span style={{
          fontSize: 10, color: 'var(--text-3)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {isVideo ? null : `${f.modules_count} module${f.modules_count !== 1 ? 's' : ''}`}
        </span>
      </div>

      <CardCta
        label={isVideo ? (isPlayable ? 'Regarder' : 'Voir la vidéo') : 'Voir la formation'}
        hovered={hovered}
      />
    </div>
    </>
  )

  const inner = (
    <div
      className="market-card"
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
        className="market-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--surface)',
          border: `1.5px solid ${hovered ? CONTOUR_HOV : CONTOUR}`,
          borderRadius: 16,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
          transform: hovered ? 'translateY(-4px)' : 'none',
          boxShadow: hovered ? 'var(--shadow-float)' : 'none',
          display: 'flex', flexDirection: 'column', height: '100%',
          padding: '18px 18px 16px',
        }}>

        {/* Avatar + prix */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            border: `1px solid ${hovered ? CONTOUR_HOV : 'color-mix(in srgb, var(--brand) 12%, transparent)'}`,
            background: 'color-mix(in srgb, var(--overlay) 4%, transparent)',
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
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>coaching</div>
          </div>
        </div>

        {/* Nom + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand)', margin: 0, letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </h3>
          {isPro && !unverified && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: AMBER, letterSpacing: '0.1em',
              padding: '2px 7px', borderRadius: 99, flexShrink: 0,
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
            }}>PRO</span>
          )}
          {unverified && (
            <span style={{
              fontSize: 9, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.06em',
              padding: '2px 7px', borderRadius: 99, flexShrink: 0,
              background: 'color-mix(in srgb, var(--overlay) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 10%, transparent)',
            }}>Non vérifié</span>
          )}
        </div>

        {/* Desc */}
        {f.short_desc && (
          <p style={{
            fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 10px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
          }}>{f.short_desc}</p>
        )}

        {/* Variants — chips neutres */}
        {variants.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {variants.slice(0, 3).map((v: string) => (
              <span key={v} style={{
                fontSize: 9.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                background: 'color-mix(in srgb, var(--overlay) 4%, transparent)', color: 'var(--text-2)',
                border: '1px solid color-mix(in srgb, var(--brand) 8%, transparent)', letterSpacing: '0.03em',
              }}>{v}</span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ marginTop: 'auto' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 9, borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
            {f.variant ?? 'Coaching'}
            {f.level ? <span style={{ color: 'var(--text-3)' }}> · {f.level}</span> : null}
          </span>
          {yearsExp > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{yearsExp} ans exp.</span>
          )}
        </div>

        <CardCta label="Réserver" hovered={hovered} />
        </div>
      </div>
    </Link>
  )
}
