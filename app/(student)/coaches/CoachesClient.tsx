'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  Search, Star, BookOpen, Clock, Flame, X, ChevronRight,
  Award, Users, TrendingUp, Package,
} from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG       = 'var(--bg)'
const CREAM    = 'var(--text)'
const MUTED    = 'var(--text-2)'
const SILVER   = 'var(--text-3)'
const DIM      = 'color-mix(in srgb, var(--brand) 7%, transparent)'
const CARD     = 'color-mix(in srgb, var(--overlay) 3%, transparent)'
const CARD_HOV = 'color-mix(in srgb, var(--overlay) 5%, transparent)'
const VIO      = 'var(--brand)'
const CYAN     = 'var(--brand)'
const SIDEBAR  = 240

const VARIANTS_LIST = ['NLH', 'PLO', 'MTT', 'Cash', 'Expresso', 'SNG', 'PKO', 'Heads-Up']
const PRICE_OPTS    = [
  { label: '< €50/h',   min: 0,   max: 49 },
  { label: '€50–100',   min: 50,  max: 100 },
  { label: '€100–150',  min: 101, max: 150 },
  { label: '€150+',     min: 151, max: 99999 },
]
const PALETTE = [VIO, CYAN, 'var(--brand)', 'var(--error)', 'var(--brand)', 'var(--brand)', 'var(--brand)', 'var(--gain)']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size}
          fill={s <= Math.round(rating) ? 'var(--brand)' : 'none'}
          color={s <= Math.round(rating) ? 'var(--brand)' : 'var(--text-3)'}
        />
      ))}
    </div>
  )
}

// ─── Coach Card ───────────────────────────────────────────────────────────────
function CoachCard({ coach, onOpen }: { coach: any; onOpen: () => void }) {
  const color       = getColor(coach.username ?? 'coach')
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
        border: `1px solid ${hovered ? `color-mix(in srgb, ${color} 27%, transparent)` : DIM}`,
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        transform: hovered ? 'translateY(-5px)' : 'none',
        boxShadow: hovered ? `0 20px 56px color-mix(in srgb, ${color} 10%, transparent), 0 4px 16px rgba(0,0,0,0.4)` : 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* ── Colour band ── */}
      <div style={{
        height: 60,
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 19%, transparent) 0%, color-mix(in srgb, ${color} 5%, transparent) 65%, transparent 100%)`,
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* Subtle dot pattern */}
        <svg style={{ position: 'absolute', right: 14, top: 8, opacity: 0.07 }} width="48" height="44" viewBox="0 0 48 44">
          {[0, 1, 2].map(row => [0, 1, 2, 3].map(col => (
            <circle key={`${row}-${col}`} cx={col * 14 + 7} cy={row * 14 + 7} r="3" fill={color} />
          )))}
        </svg>
        {isPro && !coach.unverified && (
          <div style={{
            position: 'absolute', top: 10, left: 14,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 99,
            background: 'color-mix(in srgb, var(--brand) 14%, transparent)',
            border: '1px solid color-mix(in srgb, var(--brand) 38%, transparent)',
          }}>
            <Flame size={9} color="var(--brand)" fill="var(--brand)" />
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.1em' }}>PRO</span>
          </div>
        )}
        {coach.unverified && (
          <div style={{
            position: 'absolute', top: 10, left: 14,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 99,
            background: 'color-mix(in srgb, var(--text) 20%, transparent)',
            border: '1px solid color-mix(in srgb, var(--text) 38%, transparent)',
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.08em' }}>Non vérifié</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '0 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Avatar row */}
        <div style={{ marginTop: -32, marginBottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', padding: 2.5, flexShrink: 0,
            background: `conic-gradient(from 135deg, ${color}, color-mix(in srgb, ${color} 33%, transparent), ${color})`,
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%', background: BG,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', fontSize: 18, fontWeight: 800, color: 'var(--text)',
              position: 'relative',
            }}>
              {coach.avatar_url
                ? <Image src={coach.avatar_url} alt="" fill sizes="64px" style={{ objectFit: 'cover' }} />
                : initials}
            </div>
          </div>
          {hourlyRate && (
            <div style={{
              padding: '6px 11px', borderRadius: 10,
              background: `color-mix(in srgb, ${color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 19%, transparent)`,
              textAlign: 'right',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.5px' }}>€{hourlyRate}</div>
              <div style={{ fontSize: 9, color: SILVER, marginTop: 1 }}>/&nbsp;heure</div>
            </div>
          )}
        </div>

        {/* Name */}
        <h3 style={{
          fontSize: 16, fontWeight: 800, color: CREAM, margin: '0 0 4px',
          letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {coach.username ?? 'Coach'}
        </h3>

        {/* Rating */}
        {avgRating !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
            <Stars rating={avgRating} size={10} />
            <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
            <span style={{ fontSize: 10, color: SILVER }}>({reviewCount})</span>
          </div>
        ) : (
          <div style={{ height: 8, marginBottom: 9 }} />
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

        {/* Variant chips */}
        {variants.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
            {variants.slice(0, 3).map(v => (
              <span key={v} style={{
                fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                background: `color-mix(in srgb, ${color} 7%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 16%, transparent)`,
                letterSpacing: '0.04em',
              }}>{v}</span>
            ))}
            {variants.length > 3 && (
              <span style={{ fontSize: 9, color: SILVER, padding: '3px 0' }}>+{variants.length - 3}</span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          marginTop: 'auto',
          display: 'flex', gap: 0, padding: '10px 0',
          borderTop: `1px solid ${DIM}`, borderBottom: `1px solid ${DIM}`, marginBottom: 14,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: CREAM, lineHeight: 1 }}>{fCount}</div>
            <div style={{ fontSize: 8, color: SILVER, marginTop: 3, letterSpacing: '0.04em' }}>formation{fCount > 1 ? 's' : ''}</div>
          </div>
          {yearsExp > 0 && (
            <>
              <div style={{ width: 1, background: DIM }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: CREAM, lineHeight: 1 }}>{yearsExp}</div>
                <div style={{ fontSize: 8, color: SILVER, marginTop: 3, letterSpacing: '0.04em' }}>an{yearsExp > 1 ? 's' : ''} exp.</div>
              </div>
            </>
          )}
          {coach.coaching_mode && (
            <>
              <div style={{ width: 1, background: DIM }} />
              <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Clock size={11} color={color} />
                <div style={{ fontSize: 8, color: SILVER, letterSpacing: '0.04em' }}>
                  {coach.coaching_mode === 'auto' ? 'Instant' : 'Sur dossier'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color,
            padding: '7px 14px', background: `color-mix(in srgb, ${color} 8%, transparent)`,
            borderRadius: 9, border: `1px solid color-mix(in srgb, ${color} 19%, transparent)`,
          }}>
            Voir l&apos;offre <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Slide Panel ──────────────────────────────────────────────────────────────
function SlidePanel({ coach, onClose }: { coach: any; onClose: () => void }) {
  const color       = getColor(coach.username ?? 'coach')
  const initials    = (coach.username ?? 'C').slice(0, 2).toUpperCase()
  const fCount      = coach.formations?.[0]?.count ?? 0
  const variants    = (coach.variants ?? []) as string[]
  const yearsExp    = coach.years_experience ?? 0
  const hourlyRate  = coach.hourly_rate ?? null
  const isPro       = coach.is_pro ?? false
  const avgRating   = coach.avgRating ?? null
  const reviewCount = coach.reviewCount ?? 0
  const packages    = Array.isArray(coach.coaching_packages) ? coach.coaching_packages : []

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 100,
        width: 480, background: 'var(--bg)',
        borderLeft: `1px solid ${DIM}`,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}>
        {/* Glow top */}

        {/* ── Header ── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '28px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', padding: 2.5, flexShrink: 0,
                background: `conic-gradient(from 135deg, ${color}, color-mix(in srgb, ${color} 33%, transparent), ${color})`,
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%', background: BG,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', fontSize: 22, fontWeight: 800, color: 'var(--text)',
                  position: 'relative',
                }}>
                  {coach.avatar_url
                    ? <Image src={coach.avatar_url} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
                    : initials}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0 }}>
                    {coach.username ?? 'Coach'}
                  </h2>
                  {isPro && !coach.unverified && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 99,
                      background: 'color-mix(in srgb, var(--brand) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 38%, transparent)',
                    }}>
                      <Flame size={9} color="var(--brand)" fill="var(--brand)" />
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.1em' }}>PRO</span>
                    </div>
                  )}
                  {coach.unverified && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 99,
                      background: 'color-mix(in srgb, var(--text) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--text) 38%, transparent)',
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.08em' }}>Non vérifié</span>
                    </div>
                  )}
                </div>
                {avgRating !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stars rating={avgRating} size={11} />
                    <span style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontSize: 11, color: SILVER }}>({reviewCount} avis)</span>
                  </div>
                )}
              </div>
            </div>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: `1px solid ${DIM}`,
                background: 'color-mix(in srgb, var(--overlay) 4%, transparent)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: MUTED, flexShrink: 0, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--overlay) 9%, transparent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--overlay) 4%, transparent)' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Divider */}
        </div>

        {/* ── Content ── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 28px 100px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Bio */}
          {coach.bio && (
            <section>
              <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.75, margin: 0 }}>{coach.bio}</p>
            </section>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <section>
              <div style={{ fontSize: 10, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Spécialités
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {variants.map(v => (
                  <span key={v} style={{
                    fontSize: 11, fontWeight: 700, padding: '5px 13px', borderRadius: 99,
                    background: `color-mix(in srgb, ${color} 7%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 19%, transparent)`,
                  }}>{v}</span>
                ))}
              </div>
            </section>
          )}

          {/* Stats grid */}
          <section>
            <div style={{ fontSize: 10, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              En chiffres
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: <BookOpen size={14} color={color} />, val: fCount, label: 'Formation' + (fCount > 1 ? 's' : '') },
                { icon: <TrendingUp size={14} color={color} />, val: yearsExp ? `${yearsExp} an${yearsExp > 1 ? 's' : ''}` : '—', label: 'Expérience' },
                { icon: <Users size={14} color={color} />, val: reviewCount, label: 'Avis vérifiés' },
                { icon: <Award size={14} color={color} />, val: coach.coaching_mode === 'auto' ? 'Instant' : 'Sur dossier', label: 'Format' },
              ].map(({ icon, val, label }) => (
                <div key={label} style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: 'color-mix(in srgb, var(--overlay) 2%, transparent)', border: `1px solid ${DIM}`,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {icon}
                  <div style={{ fontSize: 16, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px' }}>{val}</div>
                  <div style={{ fontSize: 10, color: SILVER, letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: 1, background: DIM }} />

          {/* Packages or hourly rate */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Package size={14} color={color} />
              <span style={{ fontSize: 10, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Offres de coaching
              </span>
            </div>

            {packages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {packages.map((pkg: any, i: number) => (
                  <div key={i} style={{
                    padding: '16px 18px', borderRadius: 14,
                    background: `color-mix(in srgb, ${color} 3%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 16%, transparent)`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{pkg.name ?? pkg.label ?? `Pack ${i + 1}`}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.5px' }}>
                          {pkg.price ?? '—'}€
                        </span>
                        {pkg.duration && (
                          <div style={{ fontSize: 9, color: SILVER }}>/ {pkg.duration}</div>
                        )}
                      </div>
                    </div>
                    {pkg.description ?? pkg.desc ? (
                      <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.6 }}>
                        {pkg.description ?? pkg.desc}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : hourlyRate ? (
              <div style={{
                padding: '18px', borderRadius: 14,
                background: `color-mix(in srgb, ${color} 3%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 16%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: CREAM, marginBottom: 4 }}>Tarif horaire</div>
                  <div style={{ fontSize: 12, color: MUTED }}>Contacte le coach pour réserver</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color, letterSpacing: '-0.8px' }}>€{hourlyRate}</div>
                  <div style={{ fontSize: 10, color: SILVER }}>/&nbsp;heure</div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: MUTED }}>Tarifs sur demande : contacte le coach.</p>
            )}
          </section>
        </div>

        {/* ── Sticky bottom CTA ── */}
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          padding: '16px 28px 24px',
          background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
          zIndex: 2,
        }}>
          <a
            href={`/coaches/${coach.id}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: `${VIO}`, color: 'var(--on-brand)', fontSize: 14, fontWeight: 800,
              textDecoration: 'none', letterSpacing: '-0.2px',
              boxShadow: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
          >
            <ChevronRight size={15} /> Voir le profil & réserver
          </a>
        </div>
      </div>
    </>
  )
}

// ─── Sidebar filter ────────────────────────────────────────────────────────────
function FilterSidebar({
  selectedVariants,
  toggleVariant,
  selectedPrices,
  togglePrice,
  selectedMode,
  setSelectedMode,
  onReset,
}: {
  selectedVariants: string[]
  toggleVariant: (v: string) => void
  selectedPrices: number[]
  togglePrice: (i: number) => void
  selectedMode: string | null
  setSelectedMode: (m: string | null) => void
  onReset: () => void
}) {
  const hasFilters = selectedVariants.length > 0 || selectedPrices.length > 0 || selectedMode !== null

  const section = (title: string) => (
    <div style={{
      fontSize: 9, fontWeight: 700, color: SILVER, letterSpacing: '0.14em',
      textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
    }}>
      {title}
    </div>
  )

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: '6px 13px', borderRadius: 99, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.14s',
        background: active ? 'color-mix(in srgb, var(--brand) 22%, transparent)' : 'color-mix(in srgb, var(--overlay) 3%, transparent)',
        border: active ? '1px solid color-mix(in srgb, var(--brand) 50%, transparent)' : `1px solid ${DIM}`,
        color: active ? 'var(--brand)' : MUTED,
      }}
    >
      {label}
    </button>
  )

  return (
    <aside className="coaches-sidebar" style={{
      width: SIDEBAR, flexShrink: 0,
      position: 'sticky', top: 24,
      alignSelf: 'flex-start',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      <div style={{
        background: CARD, border: `1px solid ${DIM}`,
        borderRadius: 18, padding: '22px 18px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: CREAM, letterSpacing: '-0.2px' }}>Filtres</span>
          {hasFilters && (
            <button
              onClick={onReset}
              style={{
                fontSize: 10, color: VIO, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none', padding: 0,
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Variant */}
        <div>
          {section('Variante')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {VARIANTS_LIST.map(v => chip(v, selectedVariants.includes(v), () => toggleVariant(v)))}
          </div>
        </div>

        {/* Mode */}
        <div>
          {section('Format')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chip('Sur dossier', selectedMode === 'manual', () => setSelectedMode(selectedMode === 'manual' ? null : 'manual'))}
            {chip('Instant', selectedMode === 'auto', () => setSelectedMode(selectedMode === 'auto' ? null : 'auto'))}
          </div>
        </div>

        {/* Price */}
        <div>
          {section('Prix / heure')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRICE_OPTS.map((o, i) => chip(o.label, selectedPrices.includes(i), () => togglePrice(i)))}
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CoachesClient({ initialCoaches }: { initialCoaches: any[] }) {
  const [search,           setSearch]           = useState('')
  const [selectedVariants, setSelectedVariants] = useState<string[]>([])
  const [selectedPrices,   setSelectedPrices]   = useState<number[]>([])
  const [selectedMode,     setSelectedMode]     = useState<string | null>(null)
  const [activeCoach,      setActiveCoach]      = useState<any | null>(null)

  const toggleVariant = (v: string) =>
    setSelectedVariants(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const togglePrice = (i: number) =>
    setSelectedPrices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  const resetFilters = () => {
    setSelectedVariants([])
    setSelectedPrices([])
    setSelectedMode(null)
  }

  const filtered = useMemo(() => initialCoaches.filter(c => {
    const matchSearch   = !search || (c.username ?? '').toLowerCase().includes(search.toLowerCase())
    const matchVariant  = selectedVariants.length === 0 || selectedVariants.some(v => (c.variants ?? []).includes(v))
    const matchMode     = !selectedMode || c.coaching_mode === selectedMode
    const matchPrice    = selectedPrices.length === 0 || selectedPrices.some(i => {
      const rate = c.hourly_rate ?? 0
      return rate >= PRICE_OPTS[i].min && rate <= PRICE_OPTS[i].max
    })
    return matchSearch && matchVariant && matchMode && matchPrice
  }), [initialCoaches, search, selectedVariants, selectedMode, selectedPrices])

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>

      {/* ── Ambient glows ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '44px 32px 100px' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 40 }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
            padding: '5px 14px', borderRadius: 99,
            background: `color-mix(in srgb, ${VIO} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${VIO} 19%, transparent)`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: VIO }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Coachs
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{
                fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: CREAM,
                letterSpacing: '-1.5px', margin: '0 0 8px', lineHeight: 1.05,
              }}>
                Nos{' '}
                <span style={{ color: VIO }}>coachs</span>
              </h1>
              <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
                {initialCoaches.length} coach{initialCoaches.length > 1 ? 's' : ''} disponible{initialCoaches.length > 1 ? 's' : ''} sur la plateforme
              </p>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', flex: '0 0 300px', minWidth: 200 }}>
              <Search size={13} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: SILVER, pointerEvents: 'none',
              }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un coach…"
                style={{
                  width: '100%', background: CARD,
                  border: `1px solid ${DIM}`, borderRadius: 12,
                  padding: '11px 14px 11px 38px', color: CREAM, fontSize: 13,
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = `color-mix(in srgb, ${VIO} 31%, transparent)` }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = DIM }}
              />
            </div>
          </div>
        </div>

        {/* ── Layout : sidebar + grid ── */}
        <style>{`
          @media (max-width: 760px) {
            .coaches-layout { flex-direction: column !important; }
            .coaches-sidebar { width: 100% !important; position: static !important; align-self: stretch !important; }
          }
        `}</style>
        <div className="coaches-layout" style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* Sidebar */}
          <FilterSidebar
            selectedVariants={selectedVariants}
            toggleVariant={toggleVariant}
            selectedPrices={selectedPrices}
            togglePrice={togglePrice}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            onReset={resetFilters}
          />

          {/* Grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '100px 0',
                background: CARD, border: `1px solid ${DIM}`,
                borderRadius: 20,
              }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>
                  <Search size={40} color={CREAM} />
                </div>
                <p style={{ color: CREAM, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucun coach trouvé</p>
                <p style={{ color: MUTED, fontSize: 13 }}>Essaie de modifier tes filtres</p>
                <button
                  onClick={resetFilters}
                  style={{
                    marginTop: 20, padding: '9px 20px', borderRadius: 10, cursor: 'pointer',
                    background: `color-mix(in srgb, ${VIO} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${VIO} 19%, transparent)`,
                    color: 'var(--brand)', fontSize: 12, fontWeight: 600,
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: SILVER, marginBottom: 14 }}>
                  {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {filtered.map(coach => (
                    <CoachCard key={coach.id} coach={coach} onOpen={() => setActiveCoach(coach)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Slide panel */}
      {activeCoach && (
        <SlidePanel coach={activeCoach} onClose={() => setActiveCoach(null)} />
      )}
    </div>
  )
}
