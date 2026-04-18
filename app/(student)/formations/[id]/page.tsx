'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import VideoPlayer from '@/components/formations/VideoPlayer'
import ChapterList from '@/components/formations/ChapterList'
import { Download } from 'lucide-react'

export default function FormationDetailPage() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [formation, setFormation] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [hasPurchased, setHasPurchased] = useState(false)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: f } = await supabase
        .from('formations')
        .select('*, coach:profiles(username, bio)')
        .eq('id', id)
        .single()
      setFormation(f)

      const { data: ch } = await supabase
        .from('formation_chapters')
        .select('*, formation_lessons(*)')
        .eq('formation_id', id)
        .order('order_index')
      setChapters(ch ?? [])

      if (user) {
        const { data: purchase } = await supabase
          .from('formation_purchases')
          .select('id')
          .eq('formation_id', id)
          .eq('user_id', user.id)
          .single()
        setHasPurchased(!!purchase || f?.price === 0)

        const { data: progress } = await supabase
          .from('formation_progress')
          .select('lesson_id')
          .eq('formation_id', id)
          .eq('user_id', user.id)
          .eq('completed', true)
        setCompletedLessons(progress?.map((p: any) => p.lesson_id) ?? [])
      }

      setLoading(false)
    }
    if (id) load()
  }, [id, user, supabase])

  const allLessons = chapters.flatMap(c => c.formation_lessons ?? [])
  const totalLessons = allLessons.length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0

  const handleComplete = async (lessonId: string) => {
    if (!user) return
    const isCompleted = completedLessons.includes(lessonId)
    if (isCompleted) {
      await supabase.from('formation_progress').delete().eq('lesson_id', lessonId).eq('user_id', user.id)
      setCompletedLessons(prev => prev.filter(id => id !== lessonId))
    } else {
      await supabase.from('formation_progress').upsert({ user_id: user.id, lesson_id: lessonId, formation_id: id, completed: true, completed_at: new Date().toISOString() })
      setCompletedLessons(prev => [...prev, lessonId])
    }
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chargement…</div>
  if (!formation) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Formation introuvable</div>

  const isFree = formation.price === 0
  const ctaLabel = hasPurchased ? (completedLessons.length > 0 ? 'Continuer' : 'Commencer') : (isFree ? 'Commencer gratuitement' : `Acheter — ${formation.price}€`)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{
        background: formation.thumbnail_url ? `linear-gradient(to right, rgba(8,12,16,0.97) 50%, rgba(8,12,16,0.7)), url(${formation.thumbnail_url}) center/cover` : 'linear-gradient(135deg, var(--bg-surface), var(--bg-card))',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '40px 36px',
        marginBottom: 32,
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {formation.variant && <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 10px', borderRadius: 99 }}>{formation.variant}</span>}
          {formation.level && <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 99 }}>{formation.level}</span>}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, maxWidth: 600 }}>{formation.title}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 500, lineHeight: 1.6 }}>{formation.description}</p>

        {/* Progress bar */}
        {hasPurchased && totalLessons > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Progression</span>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-card)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (!hasPurchased && !isFree) {
                alert('Redirection Stripe à venir — étape 6')
              } else {
                const firstFreeLesson = allLessons.find(l => l.is_free || hasPurchased)
                if (firstFreeLesson) setCurrentLesson(firstFreeLesson)
              }
            }}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {ctaLabel}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            par {formation.coach?.username} · {totalLessons} leçons · {formation.duration_minutes}min
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Lecteur */}
        <div>
          {currentLesson ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{currentLesson.title}</h2>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {currentLesson.pdf_url && (
                    <a href={currentLesson.pdf_url} download style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                      <Download size={14} /> Télécharger le PDF
                    </a>
                  )}
                  <button
                    onClick={() => handleComplete(currentLesson.id)}
                    style={{
                      background: completedLessons.includes(currentLesson.id) ? 'var(--accent-glow)' : 'var(--bg-card)',
                      border: `1px solid ${completedLessons.includes(currentLesson.id) ? 'var(--accent)' : 'var(--border)'}`,
                      color: completedLessons.includes(currentLesson.id) ? 'var(--accent)' : 'var(--text-secondary)',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {completedLessons.includes(currentLesson.id) ? '✓ Terminé' : 'Marquer comme terminé'}
                  </button>
                </div>
              </div>
              {currentLesson.video_url && (
                <VideoPlayer url={currentLesson.video_url} type={currentLesson.video_type ?? 'youtube'} />
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sélectionne une leçon pour commencer</p>
            </div>
          )}
        </div>

        {/* Chapitres */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Contenu de la formation</h2>
          {chapters.length > 0 ? (
            <ChapterList
              chapters={chapters}
              hasPurchased={hasPurchased}
              completedLessons={completedLessons}
              currentLessonId={currentLesson?.id ?? null}
              onSelectLesson={setCurrentLesson}
              onComplete={handleComplete}
            />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>Aucun chapitre disponible</div>
          )}
        </div>
      </div>
    </div>
  )
}
