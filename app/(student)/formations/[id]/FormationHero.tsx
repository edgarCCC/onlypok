'use client'
import { Star, BookOpen } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { Proof } from '@/components/ProofGalleryModal'
import { CREAM, SILVER, TYPE_LABELS } from './shared'

/* ─── Hero : badges + image grid Airbnb + titre + meta + snippet d'avis ─────── */
export default function FormationHero({ formation, contentType, typeColor, variantColor, coach, proofs, reviews, avgRating, allLessonsCount, chaptersCount, onOpenProofModal }: {
  formation: any
  contentType: string
  typeColor: string
  variantColor: string
  coach: any
  proofs: Proof[]
  reviews: any[]
  avgRating: number | null
  allLessonsCount: number
  chaptersCount: number
  onOpenProofModal: () => void
}) {
  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '28px 40px 0' }}>

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#fff',
          background: `${typeColor}22`, backdropFilter: 'blur(8px)',
          border: `1px solid ${typeColor}70`, padding: '3px 9px', borderRadius: 99,
          letterSpacing: '0.05em', textShadow: `0 0 8px ${typeColor}` }}>
          {TYPE_LABELS[contentType]}
        </span>
        {formation.variant && (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff',
            background: `${variantColor}22`, backdropFilter: 'blur(8px)',
            border: `1px solid ${variantColor}70`, padding: '3px 9px', borderRadius: 99,
            letterSpacing: '0.05em', textShadow: `0 0 8px ${variantColor}` }}>
            {formation.variant}
          </span>
        )}
        {formation.level && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)',
            background: 'rgba(232,228,220,0.06)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)', padding: '3px 9px', borderRadius: 99,
            letterSpacing: '0.05em' }}>
            {formation.level}
          </span>
        )}
      </div>

      {/* ── Image grid Airbnb style ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.25fr 1fr',
        gap: 8, borderRadius: 20, overflow: 'hidden',
      }}>
        {/* Miniature principale / Avatar coach pour coaching */}
        {contentType === 'coaching' ? (
          <div style={{
            position: 'relative', overflow: 'hidden', aspectRatio: '16/9',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            background: `linear-gradient(160deg, ${typeColor}30 0%, ${typeColor}10 50%, rgba(7,9,14,0.9) 100%)`,
          }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 120% at 50% 60%, ${typeColor}18, transparent 70%)` }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(to right, ${typeColor}, ${typeColor}60)` }} />
            {/* Avatar coach */}
            <div style={{
              width: 96, height: 96, borderRadius: '50%', flexShrink: 0,
              padding: 3,
              background: `conic-gradient(from 135deg, ${typeColor}, ${typeColor}44, ${typeColor}cc, ${typeColor})`,
              boxShadow: `0 8px 40px ${typeColor}40, 0 0 0 4px #07090e`,
              position: 'relative', zIndex: 1,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {coach?.avatar_url
                  ? <Image src={coach.avatar_url} alt={coach.username ?? 'Coach'} fill sizes="96px" style={{ objectFit: 'cover' }} />
                  : <span style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{(coach?.username ?? 'C').slice(0, 2).toUpperCase()}</span>
                }
              </div>
            </div>
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px', fontFamily: 'var(--font-syne,sans-serif)' }}>{coach?.username ?? 'Coach'}</p>
              <p style={{ fontSize: 11, color: `${typeColor}cc`, margin: '4px 0 0', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Coaching personnalisé</p>
            </div>
          </div>
        ) : (() => {
          const crop = formation.thumbnail_crop
          const bgPos  = crop ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center'
          return (
            <div style={{
              position: 'relative', overflow: 'hidden',
              aspectRatio: '16/9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...(formation.thumbnail_url ? {
                backgroundImage: `url(${formation.thumbnail_url})`,
                backgroundSize: 'cover',
                backgroundPosition: bgPos,
                backgroundRepeat: 'no-repeat',
              } : {
                background: `linear-gradient(135deg, ${typeColor}22 0%, ${typeColor}06 100%)`,
              }),
            }}>
              {!formation.thumbnail_url && (
                <span style={{ fontSize: 72, opacity: 0.1, userSelect: 'none' }}>♠</span>
              )}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, zIndex: 1,
                background: `linear-gradient(to right, ${typeColor}, ${typeColor}60)` }} />
            </div>
          )
        })()}

        {/* 2 × 2 photos complémentaires (gallery_urls si coaching, sinon proofs) */}
        {(() => {
          const galleryUrls: string[] = formation.gallery_urls ?? []
          const useGallery = contentType === 'coaching' && galleryUrls.length > 0
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, position: 'relative' }}>
              {([0,1,2,3] as const).map(i => {
                if (useGallery) {
                  const url = galleryUrls[i]
                  return url ? (
                    <div key={i} style={{ position: 'relative', overflow: 'hidden', background: '#0f1218' }}>
                      <Image src={url} alt="" fill sizes="(max-width: 768px) 25vw, 200px" style={{ objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                      {i === 3 && galleryUrls.length > 4 && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>+{galleryUrls.length - 4} photos</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={i} style={{ background: 'rgba(232,228,220,0.02)', border: '1px dashed rgba(232,228,220,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 22, opacity: 0.06 }}>♠</span>
                    </div>
                  )
                }
                const proof = proofs[i]
                return proof ? (
                  <div key={proof.id}
                    onClick={onOpenProofModal}
                    style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#0f1218' }}>
                    <Image src={proof.url} alt={proof.caption ?? ''} fill sizes="(max-width: 768px) 25vw, 200px"
                      style={{ objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'}
                      onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                    <div style={{ position: 'absolute', bottom: 7, left: 7 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                        color: 'rgba(232,228,220,0.75)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                        {proof.category === 'stats'      ? 'Stats officielles'
                          : proof.category === 'longterme'  ? 'Long terme'
                          : proof.category === 'perf'       ? 'Top perfs'
                          : proof.category === 'eleves'     ? 'Transformations'
                          : proof.category === 'sharkscope' ? 'SharkScope'
                          : proof.category === 'pokerstats' ? 'PokerStats'
                          : proof.category === 'palmares'   ? 'Palmarès'
                          : 'Preuve'}
                      </span>
                    </div>
                    {i === 3 && proofs.length > 4 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>+{proofs.length - 4} photos</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={i} style={{
                    background: 'rgba(232,228,220,0.02)',
                    border: '1px dashed rgba(232,228,220,0.08)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 22, opacity: 0.06 }}>♠</span>
                    <span style={{ fontSize: 9, color: 'rgba(232,228,220,0.15)',
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontWeight: 600 }}>
                      {(['SharkScope','Classement','Tournoi','Résultats'] as const)[i]}
                    </span>
                  </div>
                )
              })}
              {/* Bouton "Afficher toutes les photos" — toujours visible, style Airbnb */}
              {proofs.length > 0 && (
                <button onClick={onOpenProofModal}
                  style={{
                    position: 'absolute', bottom: 14, right: 14, zIndex: 5,
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(232,228,220,0.92)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(232,228,220,0.3)', borderRadius: 8,
                    padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#07090e',
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fff'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.92)'}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor"/>
                    <rect x="10" y="1" width="5" height="5" rx="1" fill="currentColor"/>
                    <rect x="1" y="10" width="5" height="5" rx="1" fill="currentColor"/>
                    <rect x="10" y="10" width="5" height="5" rx="1" fill="currentColor"/>
                  </svg>
                  Afficher toutes les photos
                </button>
              )}
            </div>
          )
        })()}
      </div>

      {/* Titre + meta sous l'image */}
      <div style={{ marginTop: 32, marginBottom: 48 }}>
        {/* Séparateur accent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 2, width: 32, background: typeColor, borderRadius: 99, boxShadow: `0 0 8px ${typeColor}` }} />
          <span style={{ fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, color: typeColor, textTransform: 'uppercase' as const }}>
            {TYPE_LABELS[contentType]}
            {formation.variant ? ` · ${formation.variant}` : ''}
          </span>
        </div>
        <h1 style={{
          fontSize: 'clamp(20px, 2.2vw, 30px)', fontWeight: 700, color: CREAM,
          letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 16,
        }}>
          {formation.title}
        </h1>
        {formation.short_desc && (
          <p style={{ fontSize: 16, color: 'rgba(232,228,220,0.55)', lineHeight: 1.7, marginBottom: 24, maxWidth: 640, fontWeight: 400 }}>
            {formation.short_desc}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
          {avgRating !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 20 }}>
              <Star size={14} color="#a855f7" fill="#a855f7" />
              <span style={{ fontSize: 14, fontWeight: 800, color: CREAM }}>{avgRating.toFixed(2)}</span>
              <span style={{ fontSize: 13, color: SILVER }}>({reviews.length} avis)</span>
            </div>
          )}
          {avgRating !== null && coach?.username && (
            <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.12)', marginRight: 20 }} />
          )}
          {coach?.username && (
            <Link href={`/coaches/${coach.id}`}
              style={{ fontSize: 13, color: SILVER, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = CREAM}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = SILVER}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
                boxShadow: `0 0 0 2px ${typeColor}30`,
                position: 'relative',
              }}>
                {coach.avatar_url
                  ? <Image src={coach.avatar_url} alt={coach.username ?? 'Coach'} fill sizes="24px" style={{ objectFit: 'cover' }} />
                  : (coach.username ?? 'C')[0].toUpperCase()}
              </div>
              <span style={{ fontWeight: 500 }}>{coach.username}</span>
            </Link>
          )}
          {contentType === 'formation' && allLessonsCount > 0 && (
            <>
              <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.12)', marginRight: 20 }} />
              <span style={{ fontSize: 13, color: SILVER, display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={13} />
                <span>{allLessonsCount} leçons</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{chaptersCount} chapitres</span>
              </span>
            </>
          )}
        </div>

        {/* First review snippet above fold */}
        {reviews.length > 0 && reviews[0]?.comment && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 22,
            padding: '12px 16px', borderRadius: 12,
            background: `${typeColor}06`, border: `1px solid ${typeColor}18`, maxWidth: 580 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: reviews[0].student?.avatar_url ? 'transparent' : `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', position: 'relative' }}>
              {reviews[0].student?.avatar_url
                ? <Image src={reviews[0].student.avatar_url} alt="" fill sizes="28px" style={{ objectFit: 'cover' }} />
                : (reviews[0].student?.username ?? 'E')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.65)', fontStyle: 'italic', lineHeight: 1.55, margin: '0 0 5px' }}>
                &ldquo;{reviews[0].comment.length > 130 ? reviews[0].comment.slice(0, 130) + '…' : reviews[0].comment}&rdquo;
              </p>
              <p style={{ fontSize: 11, color: SILVER, margin: 0, fontWeight: 600 }}>
                {reviews[0].student?.username ?? 'Élève'} · <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(reviews[0].rating))}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
