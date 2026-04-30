'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { ArrowLeft, Lock, CheckCircle, PlayCircle, Download, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'

const CREAM = '#E8E4DC'
const SILVER = '#8A8A8A'

function VideoPlayer({ url, type }: { url: string, type: string }) {
  const getYtId = (u: string) => u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
  const getVimeoId = (u: string) => u.match(/vimeo\.com\/(\d+)/)?.[1]

  if (type === 'youtube' || url.includes('youtu')) {
    const id = getYtId(url)
    if (!id) return null
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
        <iframe src={`https://www.youtube.com/embed/${id}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
      </div>
    )
  }
  if (type === 'vimeo' || url.includes('vimeo')) {
    const id = getVimeoId(url)
    if (!id) return null
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
        <iframe src={`https://player.vimeo.com/video/${id}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
      </div>
    )
  }
  return <video controls src={url} style={{ width: '100%', borderRadius: 12 }} />
}

export default function FormationDetailPage() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()

  const paymentSuccess = searchParams.get('payment') === 'success'

  const [formation, setFormation] = useState<any>(null)
  const [chapters, setChapters]   = useState<any[]>([])
  const [hasPurchased, setHasPurchased] = useState(false)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [openChapters, setOpenChapters]   = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showSuccessBanner, setShowSuccessBanner] = useState(paymentSuccess)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: f } = await supabase.from('formations').select('*, coach:profiles(username, bio)').eq('id', id).single()
      setFormation(f)

      const { data: ch } = await supabase.from('formation_chapters').select('*, formation_lessons(*)').eq('formation_id', id).order('order_index')
      setChapters(ch ?? [])
      if (ch && ch[0]) setOpenChapters([ch[0].id])

      if (user) {
        const { data: purchase } = await supabase.from('formation_purchases').select('id').eq('formation_id', id).eq('user_id', user.id).single()
        const free = f?.price === 0
        const purchased = !!purchase || free
        setHasPurchased(purchased)

        // Redirect to sales page if not purchased
        if (!purchased) {
          router.replace(`/formations/${id}`)
          return
        }

        const { data: progress } = await supabase.from('formation_progress').select('lesson_id').eq('formation_id', id).eq('user_id', user.id).eq('completed', true)
        setCompletedLessons(progress?.map((p: any) => p.lesson_id) ?? [])
      } else {
        // Not logged in and not free → redirect
        if (f?.price !== 0) {
          router.replace(`/formations/${id}`)
          return
        }
      }
      setLoading(false)
    }
    load()
  }, [id, user, supabase, router])

  const allLessons = chapters.flatMap(c => c.formation_lessons ?? [])
  const totalLessons = allLessons.length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0

  const toggleChapter = (cid: string) =>
    setOpenChapters(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid])

  const handleComplete = async (lessonId: string) => {
    if (!user) return
    const done = completedLessons.includes(lessonId)
    if (done) {
      await supabase.from('formation_progress').delete().eq('lesson_id', lessonId).eq('user_id', user.id)
      setCompletedLessons(prev => prev.filter(x => x !== lessonId))
    } else {
      await supabase.from('formation_progress').upsert({ user_id: user.id, lesson_id: lessonId, formation_id: id, completed: true, completed_at: new Date().toISOString() })
      setCompletedLessons(prev => [...prev, lessonId])
    }
  }

  const selectLesson = (lesson: any) => {
    const locked = !lesson.is_free && !hasPurchased
    if (locked) return
    setCurrentLesson(lesson)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <FourAcesLoader />
  if (!formation) return <FourAcesLoader />

  const typeColor = formation.content_type === 'video' ? '#06b6d4' : '#7c3aed'

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      {/* Glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 30% at 50% 0%, ${typeColor}15 0%, transparent 70%)` }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '32px 40px 80px' }}>

        {/* Payment success banner */}
        {showSuccessBanner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '14px 20px',
            marginBottom: 24, position: 'relative' }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#06b6d4' }}>Paiement confirmé !</div>
              <div style={{ fontSize: 12, color: SILVER }}>Bienvenue dans la formation. Bonne progression !</div>
            </div>
            <button onClick={() => setShowSuccessBanner(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: SILVER, cursor: 'pointer', padding: 4 }}>
              ✕
            </button>
          </div>
        )}

        {/* Back */}
        <Link href={`/formations/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: SILVER, fontSize: 13, cursor: 'pointer', marginBottom: 28, padding: 0, textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Retour à la formation
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }}>

          {/* Colonne gauche */}
          <div>
            {/* Lecteur ou placeholder */}
            {currentLesson ? (
              <div style={{ marginBottom: 24 }}>
                {currentLesson.video_url ? (
                  <VideoPlayer url={currentLesson.video_url} type={currentLesson.video_type ?? 'youtube'} />
                ) : (
                  <div style={{ aspectRatio: '16/9', background: 'rgba(232,228,220,0.04)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: SILVER, fontSize: 14 }}>Pas de vidéo pour cette leçon</p>
                  </div>
                )}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px' }}>{currentLesson.title}</h2>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {currentLesson.pdf_url && (
                      <a href={currentLesson.pdf_url} download style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: typeColor, textDecoration: 'none', padding: '6px 12px', border: `1px solid ${typeColor}40`, borderRadius: 8 }}>
                        <Download size={13} /> PDF
                      </a>
                    )}
                    <button onClick={() => handleComplete(currentLesson.id)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: `1px solid ${completedLessons.includes(currentLesson.id) ? 'rgba(16,185,129,0.4)' : 'rgba(232,228,220,0.15)'}`, background: completedLessons.includes(currentLesson.id) ? 'rgba(16,185,129,0.1)' : 'transparent', color: completedLessons.includes(currentLesson.id) ? '#06b6d4' : SILVER, cursor: 'pointer' }}>
                      {completedLessons.includes(currentLesson.id) ? '✓ Terminé' : 'Marquer terminé'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ aspectRatio: '16/9', background: formation.thumbnail_url ? `url(${formation.thumbnail_url}) center/cover` : 'rgba(232,228,220,0.04)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
                <div style={{ position: 'relative', textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,228,220,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <PlayCircle size={28} color={CREAM} />
                  </div>
                  <p style={{ color: CREAM, fontSize: 14, fontWeight: 600 }}>Sélectionne une leçon pour commencer</p>
                </div>
              </div>
            )}

            {/* Infos formation */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {formation.variant && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40` }}>{formation.variant}</span>}
                {formation.level && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(232,228,220,0.06)', color: SILVER, border: '1px solid rgba(232,228,220,0.1)' }}>{formation.level}</span>}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 10 }}>{formation.title}</h1>
              {formation.description && <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.7 }}>{formation.description}</p>}
              <p style={{ fontSize: 13, color: 'rgba(138,138,138,0.6)', marginTop: 10 }}>Par {formation.coach?.username ?? 'Coach'} · {totalLessons} leçons</p>
            </div>

            {/* Barre de progression */}
            {hasPurchased && totalLessons > 0 && (
              <div style={{ marginBottom: 24, background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: SILVER }}>Progression</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: typeColor }}>{progressPct}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(232,228,220,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: typeColor, borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(138,138,138,0.4)', marginTop: 6 }}>{completedLessons.length} / {totalLessons} leçons terminées</p>
              </div>
            )}
          </div>

          {/* Colonne droite — chapitres */}
          <div style={{ position: 'sticky', top: 24 }}>

            {/* CTA si pas acheté */}
            {!hasPurchased && formation.price > 0 && (
              <div style={{ background: 'rgba(232,228,220,0.03)', border: `1px solid ${typeColor}30`, borderRadius: 16, padding: '20px', marginBottom: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: CREAM, marginBottom: 4 }}>{formation.price}€</p>
                <p style={{ fontSize: 12, color: SILVER, marginBottom: 16 }}>Accès illimité à toutes les leçons</p>
                <button style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: typeColor, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px ${typeColor}50` }}>
                  Acheter la formation
                </button>
              </div>
            )}

            {/* Chapitres */}
            <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>Contenu · {chapters.length} chapitre{chapters.length > 1 ? 's' : ''}</h3>
              </div>
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {chapters.map((chapter, ci) => {
                  const isOpen = openChapters.includes(chapter.id)
                  const lessons = chapter.formation_lessons ?? []
                  const doneCount = lessons.filter((l: any) => completedLessons.includes(l.id)).length

                  return (
                    <div key={chapter.id} style={{ borderBottom: '1px solid rgba(232,228,220,0.05)' }}>
                      <button onClick={() => toggleChapter(chapter.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{chapter.title}</span>
                          <span style={{ fontSize: 11, color: SILVER, marginLeft: 8 }}>{doneCount}/{lessons.length}</span>
                        </div>
                        <ChevronDown size={14} color={SILVER} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                      </button>

                      {isOpen && lessons.map((lesson: any) => {
                        const locked = !lesson.is_free && !hasPurchased
                        const done   = completedLessons.includes(lesson.id)
                        const active = currentLesson?.id === lesson.id

                        return (
                          <button key={lesson.id} onClick={() => selectLesson(lesson)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 32px', background: active ? `${typeColor}12` : 'transparent', border: 'none', borderLeft: `2px solid ${active ? typeColor : 'transparent'}`, cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: locked ? 0.5 : 1, transition: 'all 0.15s' }}>
                            {done ? <CheckCircle size={14} color="#06b6d4" style={{ flexShrink: 0 }} /> : locked ? <Lock size={13} color={SILVER} style={{ flexShrink: 0 }} /> : <PlayCircle size={14} color={active ? typeColor : SILVER} style={{ flexShrink: 0 }} />}
                            <span style={{ flex: 1, fontSize: 12, color: active ? typeColor : CREAM, lineHeight: 1.4 }}>{lesson.title}</span>
                            {lesson.is_free && !hasPurchased && (
                              <span style={{ fontSize: 10, color: '#06b6d4', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>Gratuit</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
