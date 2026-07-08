'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Star, BookOpen, MessageSquare, TrendingUp, Clock, Award, X, CheckCircle } from 'lucide-react'
import { CREAM, SILVER, REVIEW_CATEGORIES, timeAgo, memberSince, ratingLabel } from './shared'
import VideoComments from './VideoComments'

/* ─── Star picker ──────────────────────────────────────────────────────────── */
export function StarPicker({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <Star size={22} color="#a855f7"
            fill={(hovered || value) >= i ? '#a855f7' : 'none'}
            style={{ opacity: (hovered || value) >= i ? 1 : 0.3, transition: 'all 0.1s' }} />
        </button>
      ))}
    </div>
  )
}

/* ─── Review Card style Airbnb ──────────────────────────────────────────────── */
export function ReviewCard({ r, typeColor }: { r: any; typeColor: string }) {
  const [expanded, setExpanded] = useState(false)
  const username  = r.student?.username ?? 'Élève'
  const initial   = username[0].toUpperCase()
  const joinedAt  = r.student?.created_at
  const long      = (r.comment?.length ?? 0) > 200

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Auteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${typeColor}, ${typeColor}80)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, color: '#fff', overflow: 'hidden',
          position: 'relative',
        }}>
          {r.student?.avatar_url
            ? <Image src={r.student.avatar_url} alt={username} fill sizes="48px" style={{ objectFit: 'cover' }} />
            : initial}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{username}</div>
          <div style={{ fontSize: 12, color: SILVER, marginTop: 2 }}>
            {joinedAt ? memberSince(joinedAt) : 'Membre OnlyPok'}
          </div>
        </div>
      </div>

      {/* Étoiles + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={13} color="#a855f7"
              fill={i <= r.rating ? '#a855f7' : 'none'}
              style={{ opacity: i <= r.rating ? 1 : 0.2 }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: SILVER }}>·</span>
        <span style={{ fontSize: 12, color: SILVER }}>{timeAgo(r.created_at)}</span>
      </div>

      {/* Commentaire */}
      {r.comment && (
        <div>
          <p style={{
            fontSize: 14, color: 'rgba(232,228,220,0.75)', lineHeight: 1.7, margin: 0,
            display: !expanded && long ? '-webkit-box' : 'block',
            WebkitLineClamp: !expanded && long ? 4 : undefined,
            WebkitBoxOrient: !expanded && long ? 'vertical' : undefined,
            overflow: !expanded && long ? 'hidden' : 'visible',
          } as React.CSSProperties}>
            {r.comment}
          </p>
          {long && (
            <button onClick={() => setExpanded(v => !v)}
              style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: CREAM,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {expanded ? 'Réduire' : 'Lire la suite'}
            </button>
          )}
        </div>
      )}

      {/* Séparateur */}
      <div style={{ borderBottom: '1px solid rgba(232,228,220,0.06)', marginTop: 4 }} />
    </div>
  )
}

/* ─── Rating Detail complet style Airbnb ────────────────────────────────────── */
const FULL_CATS: { key: string; label: string; Icon: React.ElementType }[] = [
  { key: 'pedagogy',      label: 'Pédagogie',    Icon: BookOpen },
  { key: 'clarity',       label: 'Clarté',        Icon: Star },
  { key: 'communication', label: 'Communication', Icon: MessageSquare },
  { key: 'progress',      label: 'Progression',   Icon: TrendingUp },
  { key: 'punctuality',   label: 'Ponctualité',   Icon: Clock },
  { key: 'value',         label: 'Qualité-prix',  Icon: Award },
]

export function RatingDetailFull({ avgRating, distribution, categoryAvgs, accentColor }: {
  avgRating: number
  distribution: { star: number; count: number; pct: number }[]
  categoryAvgs: { key: string; label: string; avg: number }[]
  accentColor: string
}) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1)
  const { title, desc } = ratingLabel(avgRating)
  const catWithIcons = FULL_CATS.map(fc => ({
    ...fc,
    avg: categoryAvgs.find(c => c.key === fc.key)?.avg ?? avgRating,
  }))

  return (
    <div style={{ paddingBottom: 36, marginBottom: 28, borderBottom: '1px solid rgba(232,228,220,0.07)' }}>

      {/* ── Score centré avec lauriers ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {/* Laurier gauche */}
          <svg width="48" height="56" viewBox="0 0 48 56" fill="none" style={{ opacity: 0.55, color: accentColor }}>
            <path d="M24 4 C18 10 8 14 6 22 C4 30 10 36 16 38 C12 32 14 24 20 20 C16 28 18 36 24 40 C20 34 20 26 26 22 C22 30 24 38 30 40 C26 36 24 28 28 24 C32 28 32 36 28 40 C34 38 40 32 38 22 C36 14 26 10 24 4Z" fill="currentColor"/>
          </svg>
          <span style={{ fontSize: 80, fontWeight: 900, color: CREAM, letterSpacing: '-4px', lineHeight: 1 }}>
            {avgRating.toFixed(2).replace('.', ',')}
          </span>
          {/* Laurier droit (miroir) */}
          <svg width="48" height="56" viewBox="0 0 48 56" fill="none" style={{ opacity: 0.55, color: accentColor, transform: 'scaleX(-1)' }}>
            <path d="M24 4 C18 10 8 14 6 22 C4 30 10 36 16 38 C12 32 14 24 20 20 C16 28 18 36 24 40 C20 34 20 26 26 22 C22 30 24 38 30 40 C26 36 24 28 28 24 C32 28 32 36 28 40 C34 38 40 32 38 22 C36 14 26 10 24 4Z" fill="currentColor"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: CREAM, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: SILVER, lineHeight: 1.65, maxWidth: 380, textAlign: 'center' }}>{desc}</div>
      </div>

      {/* ── Séparateur ── */}
      <div style={{ borderTop: '1px solid rgba(232,228,220,0.07)', marginBottom: 28 }} />

      {/* ── Grille : distribution + 6 catégories ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(6, 1fr)', gap: 0 }}>

        {/* Colonne distribution */}
        <div style={{ paddingRight: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: CREAM, marginBottom: 14 }}>Évaluation globale</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {distribution.map(d => (
              <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: SILVER, width: 8, flexShrink: 0 }}>{d.star}</span>
                <div style={{ flex: 1, height: 3, background: 'rgba(232,228,220,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(d.count / maxCount) * 100}%`,
                    background: CREAM,
                    borderRadius: 99, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6 colonnes catégories */}
        {catWithIcons.map(cat => (
          <div key={cat.key} style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            paddingLeft: 20, borderLeft: '1px solid rgba(232,228,220,0.07)',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px' }}>
              {cat.avg.toFixed(1)}
            </span>
            <span style={{ fontSize: 12, color: SILVER, lineHeight: 1.3 }}>{cat.label}</span>
            <cat.Icon size={20} color={CREAM} style={{ opacity: 0.5 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Rating Badge horizontal (Image Airbnb) ────────────────────────────────── */
export function RatingHeroDetail({ avgRating, reviewCount, accentColor }: {
  avgRating: number
  reviewCount: number
  accentColor: string
}) {
  const { title, desc } = ratingLabel(avgRating)
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(232,228,220,0.08)',
      borderRadius: 16, padding: '20px 28px', gap: 0,
    }}>
      {/* ♠ Label ♠ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 28, flexShrink: 0 }}>
        <span style={{ fontSize: 24, color: accentColor, opacity: 0.6, lineHeight: 1 }}>♠</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: CREAM, lineHeight: 1.3 }}>{title}</span>
        <span style={{ fontSize: 24, color: accentColor, opacity: 0.6, lineHeight: 1 }}>♠</span>
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(232,228,220,0.08)', margin: '0 28px', flexShrink: 0 }} />

      {/* Description */}
      <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.55, flex: 1, margin: 0 }}>{desc}</p>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(232,228,220,0.08)', margin: '0 28px', flexShrink: 0 }} />

      {/* Score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-1px', lineHeight: 1 }}>
          {avgRating.toFixed(2).replace('.', ',')}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={11} color="#a855f7"
              fill={i <= Math.round(avgRating) ? '#a855f7' : 'none'}
              style={{ opacity: i <= Math.round(avgRating) ? 1 : 0.2 }} />
          ))}
        </div>
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(232,228,220,0.08)', margin: '0 28px', flexShrink: 0 }} />

      {/* Count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-1px', lineHeight: 1 }}>{reviewCount}</span>
        <span style={{ fontSize: 12, color: SILVER, marginTop: 4 }}>Avis</span>
      </div>
    </div>
  )
}

/* ─── Review Modal ──────────────────────────────────────────────────────────── */
export function ReviewModal({ typeColor, reviewRatings, setReviewRatings, reviewComment, setReviewComment, reviewError, submitting, onClose, onSubmit }: {
  typeColor: string
  reviewRatings: Record<string, number>
  setReviewRatings: React.Dispatch<React.SetStateAction<Record<string, number>>>
  reviewComment: string
  setReviewComment: (v: string) => void
  reviewError: string | null
  submitting: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,9,14,0.88)',
      backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ background: '#0f1218', border: '1px solid rgba(232,228,220,0.12)', borderRadius: 20,
        padding: '36px', maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px' }}>Laisser un avis</h2>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(240,244,255,0.08)',
              background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>

        {/* Category ratings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
          {REVIEW_CATEGORIES.map(cat => (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{cat.label}</div>
                <div style={{ fontSize: 11, color: SILVER }}>{cat.desc}</div>
              </div>
              <StarPicker
                value={reviewRatings[cat.key] ?? 0}
                onChange={v => setReviewRatings(prev => ({ ...prev, [cat.key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Comment */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: 'uppercase',
            letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Commentaire (optionnel)</label>
          <textarea
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="Décrivez votre expérience…"
            rows={4}
            style={{ width: '100%', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(240,244,255,0.08)',
              borderRadius: 10, padding: '12px 14px', color: CREAM, fontSize: 13, outline: 'none',
              fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* Error */}
        {reviewError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 14,
            fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
            {reviewError}
          </div>
        )}

        {/* Submit */}
        <button
          disabled={submitting || Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length}
          onClick={onSubmit}
          style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length ? 'rgba(232,228,220,0.08)' : typeColor,
            color: Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length ? SILVER : '#fff',
            fontSize: 14, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
          {submitting ? 'Envoi…' : 'Publier mon avis'}
        </button>
        {Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length && (
          <p style={{ fontSize: 11, color: SILVER, textAlign: 'center', marginTop: 10 }}>
            Notez toutes les catégories pour continuer
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Reviews section — pleine largeur centrée (Image #28) ─────────────────── */
export default function ReviewSection({ reviews, avgRating, distribution, categoryAvgs, typeColor, hasPurchased, userHasReview, onOpenReviewModal, contentType, formation }: {
  reviews: any[]
  avgRating: number | null
  distribution: { star: number; count: number; pct: number }[]
  categoryAvgs: { key: string; label: string; avg: number }[]
  typeColor: string
  hasPurchased: boolean
  userHasReview: boolean
  onOpenReviewModal: () => void
  contentType: string
  formation: any
}) {
  return (
    <div id="comments-section" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 40px 100px' }}>
      <div style={{ borderTop: '1px solid rgba(232,228,220,0.06)', paddingTop: 64 }}>

        {/* En-tête avis */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-0.7px', margin: '0 0 4px' }}>
              {reviews.length === 0 ? 'Avis' : `${reviews.length} avis`}
            </h2>
            {reviews.length > 0 && avgRating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={12} color="#a855f7" fill={i <= Math.round(avgRating) ? '#a855f7' : 'none'} style={{ opacity: i <= Math.round(avgRating) ? 1 : 0.2 }} />)}
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginLeft: 4 }}>{avgRating.toFixed(2)}</span>
                <span style={{ fontSize: 13, color: SILVER }}>· {reviews.length} avis vérifiés</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {hasPurchased && !userHasReview && (
              <button onClick={onOpenReviewModal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: `1px solid ${typeColor}40`, background: `${typeColor}12`, color: typeColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Star size={13} /> Laisser un avis
              </button>
            )}
            {userHasReview && (
              <span style={{ fontSize: 12, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={13} /> Avis publié
              </span>
            )}
          </div>
        </div>

        {reviews.length === 0 ? (
          <div style={{ background: 'rgba(232,228,220,0.02)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '64px', textAlign: 'center' }}>
            <p style={{ color: SILVER, fontSize: 14, margin: 0 }}>Pas encore d'avis — soyez le premier !</p>
          </div>
        ) : (
          <>
            {/* Score centré + distribution + catégories (Image #28) */}
            <RatingDetailFull
              avgRating={avgRating ?? 0}
              distribution={distribution}
              categoryAvgs={categoryAvgs}
              accentColor={typeColor}
            />
            {/* Grille de cartes avis — 2 colonnes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 8 }}>
              {reviews.map((r: any) => <ReviewCard key={r.id} r={r} typeColor={typeColor} />)}
            </div>
          </>
        )}

        {(contentType === 'video' || contentType === 'formation') && (
          <VideoComments
            formationId={formation.id}
            coachId={formation.coach?.id}
            videoUrl={contentType === 'video' ? formation.video_url : undefined}
          />
        )}
      </div>
    </div>
  )
}
