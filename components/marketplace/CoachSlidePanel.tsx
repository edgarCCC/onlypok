'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, ChevronRight, Award, Users, TrendingUp, BookOpen,
} from 'lucide-react'
import { CREAM, MUTED, SILVER, DIM, AMBER, AMBER_GRAD, Stars } from './coachTheme'

/* ─── Panneau latéral coach — détail + offres cliquables + CTA réservation ────
   Parcours express type Airbnb : chaque offre mène directement à la page de
   réservation (créneau + paiement), sans passer par la page profil. ────────── */
export default function CoachSlidePanel({ coach, onClose }: { coach: any; onClose: () => void }) {
  /* Monté côté client uniquement — le portail échappe au contexte d'empilement
     de <main> (z-index:1) pour passer au-dessus du header fixe (z-index:100). */
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const initials    = (coach.username ?? 'C').slice(0, 2).toUpperCase()
  const fCount      = coach.formations?.[0]?.count ?? 0
  const variants    = (coach.variants ?? []) as string[]
  const yearsExp    = coach.years_experience ?? 0
  const hourlyRate  = coach.hourly_rate ?? null
  const isPro       = coach.is_pro ?? false
  const avgRating   = coach.avgRating ?? null
  const reviewCount = coach.reviewCount ?? 0
  const packages    = Array.isArray(coach.coaching_packages) ? coach.coaching_packages : []

  /* Cible de réservation express : la page coaching du coach (créneau + paiement).
     Sans offre coaching publiée, repli sur la page profil. */
  const bookingBase: string | null = coach.coachingFormationId
    ? `/formations/${coach.coachingFormationId}`
    : null
  const bookingHref = (packIndex?: number) =>
    bookingBase
      ? `${bookingBase}${packIndex !== undefined ? `?pack=${packIndex}` : ''}`
      : `/coaches/${coach.id}`

  if (!mounted) return null

  return createPortal(
    <>
      <style>{`
        @media (max-width: 540px) {
          .coach-slide-panel { width: 100% !important; }
        }
        .coach-offer-row:hover {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(232,228,220,0.2) !important;
        }
        .coach-offer-row:hover .coach-offer-chevron {
          transform: translateX(3px);
          color: #f0f4ff;
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 190,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div className="coach-slide-panel" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 200,
        width: 480, background: '#0c0e14',
        borderLeft: `1px solid ${DIM}`,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}>
        {/* ── Header ── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '28px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
                border: '1px solid rgba(232,228,220,0.14)',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', fontSize: 21, fontWeight: 700, color: CREAM,
                position: 'relative',
              }}>
                {coach.avatar_url
                  ? <Image src={coach.avatar_url} alt="" fill sizes="68px" style={{ objectFit: 'cover' }} />
                  : initials}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0 }}>
                    {coach.username ?? 'Coach'}
                  </h2>
                  {isPro && !coach.unverified && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: AMBER, letterSpacing: '0.1em',
                      padding: '3px 9px', borderRadius: 99,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    }}>PRO</span>
                  )}
                  {coach.unverified && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: SILVER, letterSpacing: '0.06em',
                      padding: '3px 8px', borderRadius: 99,
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${DIM}`,
                    }}>Non vérifié</span>
                  )}
                </div>
                {avgRating !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stars rating={avgRating} size={11} />
                    <span style={{ fontSize: 12, color: AMBER, fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontSize: 11, color: SILVER }}>({reviewCount} avis)</span>
                  </div>
                )}
              </div>
            </div>
            {/* Fermer */}
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: `1px solid ${DIM}`,
                background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: MUTED, flexShrink: 0, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Séparateur */}
          <div style={{ height: 1, background: DIM, marginBottom: 24 }} />
        </div>

        {/* ── Contenu ── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 28px 130px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Bio */}
          {coach.bio && (
            <section>
              <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.75, margin: 0 }}>{coach.bio}</p>
            </section>
          )}

          {/* Variantes */}
          {variants.length > 0 && (
            <section>
              <div style={{ fontSize: 10, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Spécialités
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {variants.map(v => (
                  <span key={v} style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.04)', color: MUTED, border: `1px solid ${DIM}`,
                  }}>{v}</span>
                ))}
              </div>
            </section>
          )}

          {/* Grille stats */}
          <section>
            <div style={{ fontSize: 10, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              En chiffres
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: <BookOpen size={14} color={SILVER} />, val: fCount, label: 'Formation' + (fCount > 1 ? 's' : '') },
                { icon: <TrendingUp size={14} color={SILVER} />, val: yearsExp ? `${yearsExp} an${yearsExp > 1 ? 's' : ''}` : '—', label: 'Expérience' },
                { icon: <Users size={14} color={SILVER} />, val: reviewCount, label: 'Avis vérifiés' },
                { icon: <Award size={14} color={SILVER} />, val: coach.coaching_mode === 'auto' ? 'Instantané' : 'Sur dossier', label: 'Réservation' },
              ].map(({ icon, val, label }) => (
                <div key={label} style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.025)', border: `1px solid ${DIM}`,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {icon}
                  <div style={{ fontSize: 16, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px' }}>{val}</div>
                  <div style={{ fontSize: 10, color: SILVER, letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Séparateur */}
          <div style={{ height: 1, background: DIM }} />

          {/* Offres — chaque ligne mène directement à la réservation */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Choisis ton offre
              </span>
              {bookingBase && (
                <span style={{ fontSize: 10, color: SILVER }}>Créneau + paiement à l&apos;étape suivante</span>
              )}
            </div>

            {packages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {packages.map((pkg: any, i: number) => (
                  <Link
                    key={i}
                    href={bookingHref(i)}
                    className="coach-offer-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 18px', borderRadius: 14, textDecoration: 'none',
                      background: 'rgba(255,255,255,0.028)', border: `1px solid rgba(232,228,220,0.1)`,
                      transition: 'background 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 3 }}>
                        {pkg.name || pkg.label || `Pack ${i + 1}`}
                        {pkg.sessions > 1 && (
                          <span style={{ fontSize: 11, fontWeight: 500, color: SILVER, marginLeft: 7 }}>
                            {pkg.sessions} sessions
                          </span>
                        )}
                      </div>
                      {(pkg.description ?? pkg.desc) && (
                        <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.55 }}>
                          {pkg.description ?? pkg.desc}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: AMBER, letterSpacing: '-0.5px' }}>
                        {pkg.price ?? '—'}€
                      </div>
                      {pkg.duration && (
                        <div style={{ fontSize: 9, color: SILVER }}>/ {pkg.duration}</div>
                      )}
                    </div>
                    <ChevronRight size={15} color={SILVER} className="coach-offer-chevron" style={{ flexShrink: 0, transition: 'transform 0.15s ease, color 0.15s ease' }} />
                  </Link>
                ))}
              </div>
            ) : hourlyRate ? (
              <Link
                href={bookingHref()}
                className="coach-offer-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '18px', borderRadius: 14, textDecoration: 'none',
                  background: 'rgba(255,255,255,0.028)', border: `1px solid rgba(232,228,220,0.1)`,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: CREAM, marginBottom: 4 }}>Session à l&apos;heure</div>
                  <div style={{ fontSize: 12, color: MUTED }}>
                    {bookingBase ? 'Choisis ton créneau à l’étape suivante' : 'Voir les disponibilités du coach'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: AMBER, letterSpacing: '-0.8px' }}>{hourlyRate}€</div>
                  <div style={{ fontSize: 10, color: SILVER }}>/ heure</div>
                </div>
                <ChevronRight size={15} color={SILVER} className="coach-offer-chevron" style={{ flexShrink: 0, transition: 'transform 0.15s ease, color 0.15s ease' }} />
              </Link>
            ) : (
              <p style={{ fontSize: 13, color: MUTED }}>Tarifs sur demande — contactez le coach.</p>
            )}
          </section>
        </div>

        {/* ── CTA sticky bas ── */}
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          padding: '16px 28px 18px', marginTop: 'auto',
          background: 'linear-gradient(to top, #0c0e14 75%, transparent)',
          zIndex: 2,
        }}>
          <Link
            href={bookingHref(packages.length > 0 ? 0 : undefined)}
            className="op-cta"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '15px', borderRadius: 14,
              background: AMBER_GRAD, color: '#fff', fontSize: 14, fontWeight: 800,
              textDecoration: 'none', letterSpacing: '-0.2px',
              boxShadow: `0 4px 24px ${AMBER}40`,
            }}
          >
            Réserver une session <ChevronRight size={15} className="op-cta-arrow" />
          </Link>
          <Link
            href={`/coaches/${coach.id}`}
            style={{
              display: 'block', textAlign: 'center', marginTop: 10,
              fontSize: 12, fontWeight: 600, color: SILVER, textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER }}
          >
            Voir le profil complet
          </Link>
        </div>
      </div>
    </>,
    document.body,
  )
}
