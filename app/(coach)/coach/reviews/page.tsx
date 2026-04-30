'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'

const TYPE: Record<string, { label: string; color: string }> = {
  formation: { label: 'Formation', color: '#7c3aed' },
  video:     { label: 'Vidéo',     color: '#06b6d4' },
  coaching:  { label: 'Coaching',  color: '#f59e0b' },
}

type Filter = 'reviews' | 'formation' | 'coaching' | 'video'

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return "aujourd'hui"
  if (d === 1) return 'hier'
  if (d < 30)  return `il y a ${d}j`
  const m = Math.floor(d / 30)
  if (m < 12)  return `il y a ${m} mois`
  return `il y a ${Math.floor(m / 12)} an${Math.floor(m / 12) > 1 ? 's' : ''}`
}

function ReviewRow({ username, date, rating, comment, color, label }: {
  username: string; date: string; rating?: number; comment: string; color: string; label: string
}) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '32px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 80, color: SILVER, fontWeight: 200, lineHeight: 1, flexShrink: 0, marginTop: -8 }}>[</span>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          {rating != null && (
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,2,3,4,5].map(j => (
                <svg key={j} width="13" height="13" viewBox="0 0 14 14" fill={j <= rating ? color : 'rgba(255,255,255,0.1)'}>
                  <polygon points="7,1 8.8,5.5 13.5,5.5 9.8,8.5 11.2,13 7,10.2 2.8,13 4.2,8.5 0.5,5.5 5.2,5.5"/>
                </svg>
              ))}
            </div>
          )}
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color }}>{label}</span>
          <span style={{ fontSize: 11, color: SILVER }}>{timeAgo(date)}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 10, letterSpacing: '0.04em' }}>{username}</div>
        <p style={{ fontSize: 15, color: 'rgba(240,244,255,0.6)', lineHeight: 1.75, margin: 0 }}>
          {comment || 'Aucun commentaire.'}
        </p>
      </div>

      <span style={{ fontSize: 80, color: SILVER, fontWeight: 200, lineHeight: 1, flexShrink: 0, alignSelf: 'flex-end', marginBottom: -8 }}>]</span>
    </div>
  )
}

export default function ReviewsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [loading, setLoading]           = useState(true)
  const [reviews, setReviews]           = useState<any[]>([])
  const [videoComments, setVideoComments] = useState<any[]>([])
  const [filter, setFilter]             = useState<Filter>('reviews')

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [{ data: rev }, { data: vcoms }] = await Promise.all([
        supabase
          .from('reviews')
          .select('*, student:profiles!student_id(username)')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('video_comments')
          .select('*, student:profiles!student_id(username), formation:formations(title)')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      setReviews(rev ?? [])
      setVideoComments(vcoms ?? [])
      setLoading(false)
    })()
  }, [user, supabase])

  const reviewsFiltered = filter === 'formation'
    ? reviews.filter(r => (r.content_type ?? 'formation') === 'formation')
    : filter === 'coaching'
    ? reviews.filter(r => r.content_type === 'coaching')
    : reviews

  const FILTERS = [
    { id: 'reviews'  as Filter, label: 'Tous les avis',  count: reviews.length },
    { id: 'formation'as Filter, label: 'Formations',     count: reviews.filter(r => (r.content_type ?? 'formation') === 'formation').length },
    { id: 'coaching' as Filter, label: 'Coaching',       count: reviews.filter(r => r.content_type === 'coaching').length },
    { id: 'video'    as Filter, label: 'Commentaires vidéo', count: videoComments.length },
  ]

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  const isEmpty = filter === 'video' ? videoComments.length === 0 : reviewsFiltered.length === 0

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM, padding: '40px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Réputation</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 44, color: SILVER, fontWeight: 200 }}>[</span>
            <h1 style={{ fontSize: 44, fontWeight: 700, color: CREAM, letterSpacing: '-1px', fontFamily: 'var(--font-syne,sans-serif)', margin: 0 }}>Mes avis</h1>
            <span style={{ fontSize: 44, color: SILVER, fontWeight: 200 }}>]</span>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, gap: 2, marginBottom: 32, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const active = filter === f.id
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '7px 18px', borderRadius: 8, border: 'none', fontSize: 12,
                fontWeight: active ? 600 : 400, cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: active ? CREAM : SILVER,
              }}>
                {f.label} <span style={{ opacity: 0.4, fontSize: 10 }}>{f.count}</span>
              </button>
            )
          })}
        </div>

        {/* Empty */}
        {isEmpty && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: SILVER, fontSize: 14 }}>
              {filter === 'video' ? "Aucun commentaire vidéo pour l'instant" : "Aucun avis pour l'instant"}
            </p>
          </div>
        )}

        {/* Avis */}
        {filter !== 'video' && (
          <div>
            {reviewsFiltered.map((r, i) => (
              <ReviewRow
                key={i}
                username={r.student?.username ?? 'Élève'}
                date={r.created_at}
                rating={Math.round(r.rating ?? 0)}
                comment={r.comment}
                color={TYPE[r.content_type ?? 'formation']?.color ?? TYPE.formation.color}
                label={(TYPE[r.content_type ?? 'formation']?.label ?? 'Formation').toUpperCase()}
              />
            ))}
          </div>
        )}

        {/* Commentaires vidéo */}
        {filter === 'video' && (
          <div>
            {videoComments.map((c, i) => (
              <ReviewRow
                key={i}
                username={c.student?.username ?? 'Élève'}
                date={c.created_at}
                comment={c.content}
                color={TYPE.video.color}
                label={c.formation?.title?.toUpperCase() ?? 'VIDÉO'}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
