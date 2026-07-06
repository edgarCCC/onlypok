'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.38)'
const DIM    = 'rgba(240,244,255,0.22)'
const VIOLET = '#7c3aed'
const GOLD   = '#f59e0b'

const INITIAL_COUNT = 6
const TRUNCATE_CHARS = 220

function timeAgo(iso: string) {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1)  return "aujourd'hui"
  if (days < 7)  return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function memberLabel(createdAt?: string | null) {
  if (!createdAt) return null
  const months = Math.max(0,
    (new Date().getFullYear() - new Date(createdAt).getFullYear()) * 12
    + (new Date().getMonth() - new Date(createdAt).getMonth())
  )
  if (months < 1)  return 'nouveau membre'
  if (months < 12) return `${months} mois sur OnlyPok`
  const y = Math.floor(months / 12)
  return `${y} an${y > 1 ? 's' : ''} sur OnlyPok`
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 14 14"
          fill={i < Math.round(rating) ? GOLD : 'rgba(240,244,255,0.12)'}>
          <polygon points="7,1 8.8,5.5 13.5,5.5 9.8,8.5 11.2,13 7,10.2 2.8,13 4.2,8.5 0.5,5.5 5.2,5.5" />
        </svg>
      ))}
    </span>
  )
}

function ReviewCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false)

  const rawName    = r.student?.username ?? 'Élève'
  const username   = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initial    = username[0]?.toUpperCase() ?? 'E'
  const avatarUrl  = r.student?.avatar_url ?? null
  const since      = memberLabel(r.student?.created_at)
  const rating     = r.rating != null ? Number(r.rating) : null
  const text       = r.comment || r.content || ''
  const date       = r.created_at ? timeAgo(r.created_at) : ''
  const coachHours = r.coaching_hours ?? null

  const needsTruncate = text.length > TRUNCATE_CHARS

  return (
    <div style={{ padding: '0 0 28px', borderBottom: '1px solid rgba(240,244,255,0.07)' }}>

      {/* Avatar + identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: avatarUrl ? 'transparent' : `linear-gradient(135deg,${VIOLET},#06b6d4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff', overflow: 'hidden',
          border: '1.5px solid rgba(240,244,255,0.1)',
        }}>
          {avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial
          }
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: 0, lineHeight: 1.3 }}>
            {username}
          </p>
          {(since || coachHours != null) && (
            <p style={{ fontSize: 12, color: SILVER, margin: '2px 0 0', lineHeight: 1 }}>
              {coachHours != null ? `${coachHours}h de coaching` : since}
            </p>
          )}
        </div>
      </div>

      {/* Rating + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {rating != null && <Stars rating={rating} />}
        <span style={{ fontSize: 12, color: DIM }}>·</span>
        <span style={{ fontSize: 12, color: SILVER }}>{date}</span>
      </div>

      {/* Review text */}
      {text ? (
        <div>
          <p style={{
            fontSize: 14, color: 'rgba(240,244,255,0.75)', lineHeight: 1.6, margin: 0,
            display: '-webkit-box', WebkitBoxOrient: 'vertical',
            WebkitLineClamp: expanded ? 'unset' : 3,
            overflow: expanded ? 'visible' : 'hidden',
          } as React.CSSProperties}>
            {text}
          </p>
          {needsTruncate && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                marginTop: 6, background: 'none', border: 'none', padding: 0,
                fontSize: 13, fontWeight: 600, color: CREAM,
                cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {expanded ? 'Réduire' : 'Lire la suite'}
            </button>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: DIM, fontStyle: 'italic', margin: 0 }}>Aucun commentaire.</p>
      )}
    </div>
  )
}

export default function ReviewsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const [loading, setLoading]   = useState(true)
  const [reviews, setReviews]   = useState<any[]>([])
  const [vcoms,   setVcoms]     = useState<any[]>([])
  const [showAll, setShowAll]   = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [{ data: rev }, { data: vc }] = await Promise.all([
        supabase.from('reviews')
          .select('*, student:profiles!student_id(username, avatar_url, created_at)')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('video_comments')
          .select('*, student:profiles!student_id(username, avatar_url, created_at)')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      setReviews(rev ?? [])
      setVcoms(vc ?? [])
      setLoading(false)
    })()
  }, [user, supabase])

  const all = useMemo(() =>
    [...reviews, ...vcoms].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  , [reviews, vcoms])

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
    : null

  const visible = showAll ? all : all.slice(0, INITIAL_COUNT)

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <style>{`
        @media (max-width: 760px) {
          .crev-container { padding: 24px 16px 60px !important; }
          .crev-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="crev-container" style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 48px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,244,255,0.28)', margin: '0 0 10px' }}>Espace coach</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: '0 0 8px', fontFamily: 'var(--font-syne,sans-serif)' }}>
            Avis
          </h1>
          {avgRating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Stars rating={avgRating} size={14} />
              <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{avgRating.toFixed(2)}</span>
              <span style={{ fontSize: 14, color: SILVER }}>·</span>
              <span style={{ fontSize: 14, color: SILVER, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                {all.length} avis
              </span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {all.length === 0 && (
          <div style={{
            background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)',
            borderRadius: 16, padding: '60px', textAlign: 'center',
          }}>
            <p style={{ color: CREAM, fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>Aucun avis pour le moment</p>
            <p style={{ color: SILVER, fontSize: 13, margin: 0 }}>Les avis de vos élèves apparaîtront ici</p>
          </div>
        )}

        {/* 2-col grid */}
        {all.length > 0 && (
          <>
            <div className="crev-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0 64px',
            }}>
              {visible.map((r, i) => (
                <ReviewCard key={r.id ?? i} r={r} />
              ))}
            </div>

            {/* Show more */}
            {all.length > INITIAL_COUNT && (
              <div style={{ marginTop: 32 }}>
                <button
                  onClick={() => setShowAll(s => !s)}
                  style={{
                    padding: '14px 24px', borderRadius: 10,
                    border: '1px solid rgba(240,244,255,0.2)',
                    background: 'transparent', color: CREAM,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,244,255,0.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  {showAll
                    ? 'Réduire les avis'
                    : `Afficher les ${all.length} avis`
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
