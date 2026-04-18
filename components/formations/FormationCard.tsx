'use client'
import Link from 'next/link'

type Formation = {
  id: string
  title: string
  short_desc: string | null
  price: number
  level: string | null
  variant: string | null
  thumbnail_url: string | null
  duration_minutes: number
  modules_count: number
  coach?: { username: string | null }
}

const VARIANT_COLORS: Record<string, string> = {
  NLH: '#3b82f6',
  PLO: '#8b5cf6',
  MTT: '#f59e0b',
  Cash: '#10b981',
  Expresso: '#ef4444',
}

export default function FormationCard({ f, accentColor }: { f: Formation, accentColor?: string }) {
  const isFree  = f.price === 0
  const color   = VARIANT_COLORS[f.variant ?? ''] ?? accentColor ?? '#6366f1'

  return (
    <Link href={`/formations/${f.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s, background 0.2s' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = `${color}60`
          el.style.transform   = 'translateY(-3px)'
          el.style.background  = 'rgba(255,255,255,0.05)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(255,255,255,0.07)'
          el.style.transform   = 'translateY(0)'
          el.style.background  = 'rgba(255,255,255,0.03)'
        }}
      >
        {/* Thumbnail */}
        <div style={{
          height: 148,
          background: f.thumbnail_url
            ? `url(${f.thumbnail_url}) center/cover`
            : `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {!f.thumbnail_url && (
            <span style={{ fontSize: 40, opacity: 0.2 }}>♠</span>
          )}

          {/* Barre couleur en haut */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${color}, ${color}80)`, borderRadius: '16px 16px 0 0' }} />

          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {f.variant ? (
              <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}20`, border: `1px solid ${color}40`, padding: '3px 9px', borderRadius: 99, letterSpacing: '0.04em' }}>
                {f.variant}
              </span>
            ) : <span />}
            <span style={{ fontSize: 11, fontWeight: 700, color: isFree ? '#10b981' : '#fff', background: isFree ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.55)', border: `1px solid ${isFree ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, padding: '3px 9px', borderRadius: 99 }}>
              {isFree ? 'Gratuit' : `${f.price}€`}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6, lineHeight: 1.4, letterSpacing: '-0.2px' }}>{f.title}</h3>
          {f.short_desc && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 14, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.short_desc}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.1px' }}>
              {f.coach?.username ?? '—'} · {f.level ?? 'Tous niveaux'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>{f.modules_count} modules</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
