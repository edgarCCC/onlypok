'use client'
import { useEffect, useState, useMemo, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { ArrowLeft, Lock, CheckCircle, PlayCircle, Download, ChevronRight, BookOpen } from 'lucide-react'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import VideoStudio from '@/components/VideoStudio'

const BG      = '#050709'
const SURFACE = 'rgba(255,255,255,0.028)'
const BORDER  = 'rgba(255,255,255,0.07)'
const CREAM   = '#f0f4ff'
const SILVER  = 'rgba(240,244,255,0.45)'
const DIM     = 'rgba(240,244,255,0.22)'
const EMER    = '#10b981'

export default function LearnPage() {
  return (
    <Suspense fallback={<FourAcesLoader />}>
      <LearnInner />
    </Suspense>
  )
}

function LearnInner() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentSuccess = searchParams.get('payment') === 'success'

  const [formation, setFormation]           = useState<any>(null)
  const [chapters,  setChapters]            = useState<any[]>([])
  const [hasPurchased, setHasPurchased]     = useState(false)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [currentLesson, setCurrentLesson]   = useState<any>(null)
  const [studioOpen, setStudioOpen]         = useState(false)
  const [openChapters, setOpenChapters]     = useState<string[]>([])
  const [loading, setLoading]               = useState(true)
  const [marking, setMarking]               = useState(false)
  const [showBanner, setShowBanner]         = useState(paymentSuccess)

  useEffect(() => {
    if (!id || authLoading) return
    const load = async () => {
      const { data: f } = await supabase.from('formations').select('*, coach:profiles(username, avatar_url, bio)').eq('id', id).single()
      setFormation(f)

      const { data: ch } = await supabase.from('formation_chapters').select('*, formation_lessons(*)').eq('formation_id', id).order('order_index')
      setChapters(ch ?? [])
      if (ch?.[0]) setOpenChapters([ch[0].id])

      if (f?.content_type === 'video' && f?.video_url) {
        setCurrentLesson({ id: f.id, title: f.title, video_url: f.video_url, is_free: f.price === 0 })
        setStudioOpen(true)
      }

      const free = f?.price === 0
      if (user) {
        const { data: purchase } = await supabase.from('formation_purchases').select('id').eq('formation_id', id).eq('user_id', user.id).maybeSingle()
        const purchased = !!purchase || free
        setHasPurchased(purchased)
        if (!purchased) { router.replace(`/formations/${id}`); return }
        const { data: progress } = await supabase.from('formation_progress').select('lesson_id').eq('formation_id', id).eq('user_id', user.id).eq('completed', true)
        setCompletedLessons(progress?.map((p: any) => p.lesson_id) ?? [])
      } else {
        if (!free) { router.replace(`/formations/${id}`); return }
      }
      setLoading(false)
    }
    load()
  }, [id, user, authLoading, supabase, router])

  const allLessons   = chapters.flatMap(c => c.formation_lessons ?? [])
  const totalLessons = allLessons.length
  const doneLessons  = completedLessons.length
  const progressPct  = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

  const toggleChapter = (cid: string) =>
    setOpenChapters(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid])

  const handleComplete = async (lessonId: string) => {
    if (!user || marking) return
    setMarking(true)
    const done = completedLessons.includes(lessonId)
    if (done) {
      await supabase.from('formation_progress').delete().eq('lesson_id', lessonId).eq('user_id', user.id)
      setCompletedLessons(prev => prev.filter(x => x !== lessonId))
    } else {
      await supabase.from('formation_progress').upsert({ user_id: user.id, lesson_id: lessonId, formation_id: id, completed: true, completed_at: new Date().toISOString() })
      setCompletedLessons(prev => [...prev, lessonId])
    }
    setMarking(false)
  }

  const selectLesson = (lesson: any) => {
    if (!lesson.is_free && !hasPurchased) return
    setCurrentLesson(lesson)
    if (lesson.video_url) setStudioOpen(true)
  }

  if (loading || !formation) return <FourAcesLoader />

  const typeColor = formation.content_type === 'video' ? '#06b6d4' : '#7c3aed'
  const lessonDone = currentLesson ? completedLessons.includes(currentLesson.id) : false

  return (
    <>
      {studioOpen && currentLesson?.video_url && (
        <VideoStudio
          video={{ url: currentLesson.video_url, title: currentLesson.title }}
          onClose={() => setStudioOpen(false)}
        />
      )}

      <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>

        {/* ── Ambient glow ── */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 40% at 30% -10%, ${typeColor}12 0%, transparent 60%)` }} />

        {/* ── Top bar ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${BORDER}`,
          background: 'rgba(5,7,9,0.85)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 32px', height: 56 }}>

          <Link href={`/formations/${id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: SILVER, textDecoration: 'none',
              fontSize: 13, fontWeight: 500, flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = CREAM)}
            onMouseLeave={e => (e.currentTarget.style.color = SILVER)}>
            <ArrowLeft size={14} />
            <span>Retour</span>
          </Link>

          <div style={{ width: 1, height: 18, background: BORDER, flexShrink: 0 }} />

          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: CREAM,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formation.title}
          </span>

          {/* Progress pill */}
          {totalLessons > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 80, height: 3, background: SURFACE, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? EMER : typeColor,
                  borderRadius: 99, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: progressPct === 100 ? EMER : typeColor, minWidth: 30 }}>
                {progressPct}%
              </span>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid',
          gridTemplateColumns: '1fr 340px', gap: 0, minHeight: 'calc(100vh - 56px)' }}>

          {/* ════ Left — content ════ */}
          <div style={{ padding: '32px 32px 80px', borderRight: `1px solid ${BORDER}` }}>

            {/* Payment banner */}
            {showBanner && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)',
                borderRadius: 12, padding: '12px 18px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={16} color={EMER} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: EMER, marginBottom: 1 }}>Paiement confirmé</p>
                  <p style={{ fontSize: 12, color: DIM }}>Bienvenue dans la formation. Bonne progression !</p>
                </div>
                <button onClick={() => setShowBanner(false)}
                  style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', padding: '4px', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}

            {/* ── Lesson area ── */}
            {currentLesson ? (
              <div style={{ marginBottom: 28 }}>
                {/* Current lesson card */}
                <div style={{ background: SURFACE, border: `1px solid ${typeColor}25`,
                  borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                  {/* Accent stripe */}
                  <div style={{ height: 2, background: `linear-gradient(to right, ${typeColor}, ${typeColor}60, transparent)` }} />
                  <div style={{ padding: '20px 24px' }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.18em', color: typeColor, fontWeight: 700,
                      textTransform: 'uppercase', marginBottom: 6 }}>Leçon en cours</p>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.4px',
                      lineHeight: 1.3, marginBottom: 18 }}>{currentLesson.title}</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {currentLesson.video_url && (
                        <button onClick={() => setStudioOpen(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px',
                            borderRadius: 10, border: 'none', background: typeColor, color: '#fff',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            boxShadow: `0 4px 20px ${typeColor}45`, transition: 'transform 0.15s, box-shadow 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${typeColor}55` }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 20px ${typeColor}45` }}>
                          <PlayCircle size={15} />
                          Regarder la leçon
                        </button>
                      )}
                      {currentLesson.pdf_url && (
                        <a href={currentLesson.pdf_url} download
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                            borderRadius: 10, border: `1px solid ${BORDER}`, color: SILVER,
                            fontSize: 13, textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = typeColor + '60'; (e.currentTarget as HTMLAnchorElement).style.color = CREAM }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BORDER; (e.currentTarget as HTMLAnchorElement).style.color = SILVER }}>
                          <Download size={13} />
                          Télécharger PDF
                        </a>
                      )}
                      <button onClick={() => handleComplete(currentLesson.id)} disabled={marking}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                          borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 'auto',
                          border: `1px solid ${lessonDone ? 'rgba(16,185,129,0.35)' : BORDER}`,
                          background: lessonDone ? 'rgba(16,185,129,0.08)' : 'transparent',
                          color: lessonDone ? EMER : SILVER, transition: 'all 0.2s', opacity: marking ? 0.6 : 1 }}
                        onMouseEnter={e => { if (!lessonDone) { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)'; e.currentTarget.style.color = EMER } }}
                        onMouseLeave={e => { if (!lessonDone) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = SILVER } }}>
                        <CheckCircle size={13} />
                        {lessonDone ? 'Terminé' : 'Marquer terminé'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* No lesson selected — thumbnail placeholder */
              <div style={{ aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', position: 'relative',
                marginBottom: 28, background: '#0a0c12' }}>
                {formation.thumbnail_url && (
                  <img src={formation.thumbnail_url} alt={formation.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
                )}
                <div style={{ position: 'absolute', inset: 0,
                  background: `linear-gradient(135deg, ${typeColor}18 0%, transparent 50%, rgba(5,7,9,0.6) 100%)` }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, border: `1px solid ${typeColor}50`,
                    background: `${typeColor}15`, backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 32px ${typeColor}25` }}>
                    <PlayCircle size={28} color={typeColor} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: CREAM }}>Sélectionne une leçon pour commencer</p>
                  <p style={{ fontSize: 12, color: DIM }}>← choisis dans le sommaire à droite</p>
                </div>
              </div>
            )}

            {/* ── Formation meta ── */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {formation.variant && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 6, background: `${typeColor}14`, color: typeColor,
                  border: `1px solid ${typeColor}30` }}>{formation.variant}</span>
              )}
              {formation.level && (
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 6, background: SURFACE, color: DIM, border: `1px solid ${BORDER}` }}>
                  {formation.level}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 800, color: CREAM,
              letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 10 }}>
              {formation.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              {formation.coach?.username && (
                <span style={{ fontSize: 13, color: DIM }}>
                  Par <span style={{ color: SILVER, fontWeight: 600 }}>{formation.coach.username}</span>
                </span>
              )}
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: BORDER }} />
              <span style={{ fontSize: 13, color: DIM }}>{totalLessons} leçon{totalLessons !== 1 ? 's' : ''}</span>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: BORDER }} />
              <span style={{ fontSize: 13, color: DIM }}>{chapters.length} chapitre{chapters.length !== 1 ? 's' : ''}</span>
            </div>

            {/* ── Progress bar ── */}
            {totalLessons > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: DIM, fontWeight: 500 }}>
                    {doneLessons} / {totalLessons} leçons complétées
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700,
                    color: progressPct === 100 ? EMER : progressPct > 0 ? typeColor : DIM }}>
                    {progressPct === 100 ? 'Terminé !' : `${progressPct}%`}
                  </span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 99,
                    background: progressPct === 100
                      ? EMER
                      : `linear-gradient(to right, ${typeColor}, ${typeColor}cc)`,
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: progressPct > 0 ? `0 0 8px ${typeColor}60` : 'none' }} />
                </div>
              </div>
            )}

            {/* ── Description ── */}
            {formation.description && (
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 24 }}>
                <p style={{ fontSize: 13, color: DIM, fontWeight: 600, marginBottom: 10, letterSpacing: '0.05em',
                  textTransform: 'uppercase' }}>À propos</p>
                <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.8, maxWidth: 620 }}>
                  {formation.description}
                </p>
              </div>
            )}
          </div>

          {/* ════ Right — chapter sidebar ════ */}
          <div style={{ position: 'sticky', top: 56, height: 'calc(100vh - 56px)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Sidebar header */}
            <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${BORDER}`,
              background: BG, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={14} color={typeColor} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>Sommaire</span>
                </div>
                <span style={{ fontSize: 11, color: DIM }}>{chapters.length} ch. · {totalLessons} leçons</span>
              </div>
            </div>

            {/* Chapters */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chapters.map((chapter, ci) => {
                const isOpen  = openChapters.includes(chapter.id)
                const lessons = chapter.formation_lessons ?? []
                const done    = lessons.filter((l: any) => completedLessons.includes(l.id)).length
                const allDone = done === lessons.length && lessons.length > 0

                return (
                  <div key={chapter.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {/* Chapter header */}
                    <button onClick={() => toggleChapter(chapter.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                        textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = SURFACE}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {/* Chapter number */}
                      <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                        background: allDone ? 'rgba(16,185,129,0.12)' : `${typeColor}12`,
                        border: `1px solid ${allDone ? 'rgba(16,185,129,0.25)' : `${typeColor}25`}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: allDone ? EMER : typeColor }}>
                        {allDone ? <CheckCircle size={12} /> : ci + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: CREAM,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginBottom: 2 }}>{chapter.title}</p>
                        <p style={{ fontSize: 10, color: done > 0 ? (allDone ? EMER : typeColor) : DIM }}>
                          {done}/{lessons.length} terminées
                        </p>
                      </div>
                      <ChevronRight size={13} color={DIM} style={{
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0 }} />
                    </button>

                    {/* Lessons */}
                    {isOpen && (
                      <div>
                        {lessons.map((lesson: any, li: number) => {
                          const locked = !lesson.is_free && !hasPurchased
                          const done   = completedLessons.includes(lesson.id)
                          const active = currentLesson?.id === lesson.id

                          return (
                            <button key={lesson.id} onClick={() => selectLesson(lesson)}
                              disabled={locked}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 20px 10px 36px', background: active ? `${typeColor}10` : 'transparent',
                                border: 'none', borderLeft: `2px solid ${active ? typeColor : 'transparent'}`,
                                cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left',
                                transition: 'background 0.15s', opacity: locked ? 0.4 : 1 }}
                              onMouseEnter={e => { if (!locked && !active) e.currentTarget.style.background = SURFACE }}
                              onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? `${typeColor}10` : 'transparent' }}>

                              {/* Status icon */}
                              <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? 'rgba(16,185,129,0.12)' : active ? `${typeColor}18` : 'transparent',
                                border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : active ? `${typeColor}40` : BORDER}` }}>
                                {done
                                  ? <CheckCircle size={10} color={EMER} />
                                  : locked
                                    ? <Lock size={9} color={DIM} />
                                    : <PlayCircle size={10} color={active ? typeColor : DIM} />
                                }
                              </div>

                              <span style={{ flex: 1, fontSize: 12, lineHeight: 1.4,
                                color: active ? typeColor : done ? SILVER : CREAM,
                                fontWeight: active ? 600 : 400,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lesson.title}
                              </span>

                              {lesson.is_free && !hasPurchased && (
                                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                                  color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)',
                                  padding: '2px 6px', borderRadius: 4, flexShrink: 0, textTransform: 'uppercase' }}>
                                  Gratuit
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sidebar footer — coach info */}
            {formation.coach?.username && (
              <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 10 }}>
                {formation.coach.avatar_url ? (
                  <img src={formation.coach.avatar_url} alt={formation.coach.username}
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover',
                      border: `1px solid ${typeColor}40` }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${typeColor}18`,
                    border: `1px solid ${typeColor}30`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, fontWeight: 700, color: typeColor }}>
                    {formation.coach.username[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: DIM, marginBottom: 1 }}>Formateur</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: CREAM,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formation.coach.username}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
