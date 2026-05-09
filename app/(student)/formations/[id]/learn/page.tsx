'use client'
import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import {
  ArrowLeft, Lock, CheckCircle, PlayCircle, Download,
  ChevronRight, BookOpen, FileText, Clock, StickyNote, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import VideoStudio from '@/components/VideoStudio'

const BG     = '#050709'
const SURF   = 'rgba(255,255,255,0.028)'
const BORDER = 'rgba(255,255,255,0.07)'
const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.22)'
const EMER   = '#10b981'

type ProgressRow = { lesson_id: string; completed_at: string | null }

/* ── Find next unwatched lesson in chapter order ──────────────────────────── */
function nextUnwatched(allLessons: any[], completedIds: string[], currentId?: string): any | null {
  if (!allLessons.length) return null
  const startIdx = currentId ? allLessons.findIndex(l => l.id === currentId) + 1 : 0
  return (
    allLessons.slice(startIdx).find(l => !completedIds.includes(l.id)) ??
    allLessons.find(l => !completedIds.includes(l.id)) ??
    null
  )
}

export default function LearnPage() {
  return (
    <Suspense fallback={<FourAcesLoader />}>
      <LearnInner />
    </Suspense>
  )
}

function LearnInner() {
  const { id } = useParams<{ id: string }>()
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [formation, setFormation]           = useState<any>(null)
  const [chapters, setChapters]             = useState<any[]>([])
  const [hasPurchased, setHasPurchased]     = useState(false)
  const [progress, setProgress]             = useState<ProgressRow[]>([])
  const [currentLesson, setCurrentLesson]   = useState<any>(null)
  const [studioOpen, setStudioOpen]         = useState(false)
  const [openChapters, setOpenChapters]     = useState<string[]>([])
  const [loading, setLoading]               = useState(true)
  const [marking, setMarking]               = useState(false)
  const [tab, setTab]                       = useState<'resume' | 'notes'>('resume')
  const [notes, setNotes]                   = useState('')
  const [notesSaved, setNotesSaved]         = useState(true)
  const [descExpanded, setDescExpanded]     = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showBanner = searchParams.get('payment') === 'success'

  /* ── Load ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id || authLoading) return
    const load = async () => {
      const [{ data: f }, { data: ch }] = await Promise.all([
        supabase.from('formations').select('*, coach:profiles(username, avatar_url)').eq('id', id).single(),
        supabase.from('formation_chapters')
          .select('*, formation_lessons(id, title, video_url, pdf_url, is_free, thumbnail_url, order_index)')
          .eq('formation_id', id).order('order_index'),
      ])
      setFormation(f)

      // Sort lessons within each chapter by order_index
      const sorted = (ch ?? []).map((c: any) => ({
        ...c,
        formation_lessons: [...(c.formation_lessons ?? [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      }))
      setChapters(sorted)
      if (sorted[0]) setOpenChapters([sorted[0].id])

      if (f?.content_type === 'video' && f?.video_url) {
        setCurrentLesson({ id: f.id, title: f.title, video_url: f.video_url, thumbnail_url: f.thumbnail_url, is_free: f.price === 0 })
        setStudioOpen(true)
        setLoading(false)
        return
      }

      const free = f?.price === 0
      if (user) {
        const [{ data: purchase }, { data: prog }] = await Promise.all([
          supabase.from('formation_purchases').select('id').eq('formation_id', id).eq('user_id', user.id).maybeSingle(),
          supabase.from('formation_progress')
            .select('lesson_id, completed_at')
            .eq('formation_id', id).eq('user_id', user.id).eq('completed', true)
            .order('completed_at', { ascending: false }),
        ])
        const purchased = !!purchase || free
        setHasPurchased(purchased)
        if (!purchased) { router.replace(`/formations/${id}`); return }

        const progRows: ProgressRow[] = prog ?? []
        setProgress(progRows)

        // Auto-select first unwatched lesson
        const all = sorted.flatMap((c: any) => c.formation_lessons ?? [])
        const completedIds = progRows.map((p: ProgressRow) => p.lesson_id)
        const next = nextUnwatched(all, completedIds)
        if (next) {
          setCurrentLesson(next)
          // Open the chapter containing this lesson
          const parentChapter = sorted.find((c: any) => c.formation_lessons?.some((l: any) => l.id === next.id))
          if (parentChapter) setOpenChapters([parentChapter.id])
        }
      } else {
        if (!free) { router.replace(`/formations/${id}`); return }
      }
      setLoading(false)
    }
    load()
  }, [id, user, authLoading, supabase, router])

  /* ── Notes localStorage ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return
    const key = `onlypok_notes_${id}_${currentLesson?.id ?? 'general'}`
    setNotes(localStorage.getItem(key) ?? '')
    setNotesSaved(true)
  }, [id, currentLesson?.id])

  const handleNotesChange = (val: string) => {
    setNotes(val)
    setNotesSaved(false)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      localStorage.setItem(`onlypok_notes_${id}_${currentLesson?.id ?? 'general'}`, val)
      setNotesSaved(true)
    }, 800)
  }

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const completedIds = useMemo(() => progress.map(p => p.lesson_id), [progress])
  const allLessons   = useMemo(() => chapters.flatMap(c => c.formation_lessons ?? []), [chapters])
  const totalLessons = allLessons.length
  const doneLessons  = completedIds.length
  const progressPct  = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

  const lessonMap = useMemo(() => {
    const m = new Map<string, { title: string; chapterTitle: string }>()
    chapters.forEach(ch => (ch.formation_lessons ?? []).forEach((l: any) =>
      m.set(l.id, { title: l.title, chapterTitle: ch.title })
    ))
    return m
  }, [chapters])

  const recentlyDone = useMemo(() =>
    progress.slice(0, 4).map(p => ({ ...p, ...lessonMap.get(p.lesson_id) })).filter(r => r.title),
  [progress, lessonMap])

  /* ── Actions ──────────────────────────────────────────────────────────── */
  const toggleChapter = (cid: string) =>
    setOpenChapters(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid])

  const handleComplete = useCallback(async (lessonId: string) => {
    if (!user || marking) return
    setMarking(true)
    const done = completedIds.includes(lessonId)

    if (done) {
      await supabase.from('formation_progress').delete().eq('lesson_id', lessonId).eq('user_id', user.id)
      setProgress(prev => prev.filter(p => p.lesson_id !== lessonId))
    } else {
      const now = new Date().toISOString()
      await supabase.from('formation_progress').upsert({
        user_id: user.id, lesson_id: lessonId, formation_id: id,
        completed: true, completed_at: now,
      })
      const newProgress = [{ lesson_id: lessonId, completed_at: now }, ...progress]
      setProgress(newProgress)

      // Auto-advance to next unwatched lesson
      const newCompletedIds = newProgress.map(p => p.lesson_id)
      const next = nextUnwatched(allLessons, newCompletedIds, lessonId)
      if (next) {
        setCurrentLesson(next)
        const parentChapter = chapters.find(c => c.formation_lessons?.some((l: any) => l.id === next.id))
        if (parentChapter) setOpenChapters(prev => prev.includes(parentChapter.id) ? prev : [...prev, parentChapter.id])
      }
    }
    setMarking(false)
  }, [user, marking, completedIds, progress, allLessons, chapters, supabase, id])

  const selectLesson = useCallback((lesson: any) => {
    if (!lesson.is_free && !hasPurchased) return
    setCurrentLesson(lesson)
    if (lesson.video_url) setStudioOpen(true)
  }, [hasPurchased])

  /* ── Render ───────────────────────────────────────────────────────────── */
  if (loading || !formation) return <FourAcesLoader />

  const typeColor  = formation.content_type === 'video' ? '#06b6d4' : '#7c3aed'
  const lessonDone = currentLesson ? completedIds.includes(currentLesson.id) : false

  const fmtDate = (iso: string | null) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <>
      {studioOpen && currentLesson?.video_url && (
        <VideoStudio
          video={{ url: currentLesson.video_url, title: currentLesson.title }}
          onClose={() => setStudioOpen(false)}
        />
      )}

      <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 35% at 25% -5%, ${typeColor}10 0%, transparent 65%)` }} />

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, height: 52,
          borderBottom: `1px solid ${BORDER}`, background: 'rgba(5,7,9,0.9)',
          backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px' }}>
          <Link href={`/formations/${id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: SILVER,
              textDecoration: 'none', fontSize: 12, fontWeight: 500, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = CREAM)}
            onMouseLeave={e => (e.currentTarget.style.color = SILVER)}>
            <ArrowLeft size={13} /> Retour
          </Link>
          <div style={{ width: 1, height: 16, background: BORDER, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: CREAM,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formation.title}
          </span>
          {totalLessons > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: DIM }}>{doneLessons}/{totalLessons}</span>
              <div style={{ width: 72, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 99,
                  background: progressPct === 100 ? EMER : typeColor,
                  transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: progressPct > 0 ? `0 0 6px ${typeColor}80` : 'none' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28,
                color: progressPct === 100 ? EMER : typeColor }}>{progressPct}%</span>
            </div>
          )}
        </div>

        {/* ── Body grid ─────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid',
          gridTemplateColumns: '1fr 320px', minHeight: 'calc(100vh - 52px)' }}>

          {/* ════ LEFT ════ */}
          <div style={{ padding: '24px 28px 80px', borderRight: `1px solid ${BORDER}` }}>

            {showBanner && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10, padding: '10px 14px' }}>
                <CheckCircle size={14} color={EMER} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: SILVER }}>
                  <span style={{ color: EMER, fontWeight: 700 }}>Paiement confirmé — </span>
                  bienvenue dans la formation !
                </span>
              </div>
            )}

            {/* ── Lesson card or placeholder ── */}
            {currentLesson ? (
              <div style={{ marginBottom: 20, background: SURF, borderRadius: 14,
                border: `1px solid ${typeColor}22`, overflow: 'hidden' }}>
                <div style={{ height: 2, background: `linear-gradient(90deg, ${typeColor}, ${typeColor}50, transparent)` }} />
                {/* Thumbnail banner */}
                {(currentLesson.thumbnail_url || formation.thumbnail_url) && (
                  <div style={{ position: 'relative', height: 160, overflow: 'hidden', background: '#0a0c12' }}>
                    <img
                      src={currentLesson.thumbnail_url ?? formation.thumbnail_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
                    />
                    <div style={{ position: 'absolute', inset: 0,
                      background: `linear-gradient(to right, ${typeColor}20 0%, transparent 40%, rgba(5,7,9,0.7) 100%)` }} />
                    {currentLesson.video_url && (
                      <button onClick={() => setStudioOpen(true)}
                        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.8)',
                          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'transform 0.2s, background 0.2s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'; (e.currentTarget as HTMLDivElement).style.background = `${typeColor}90` }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.5)' }}>
                          <PlayCircle size={22} color="#fff" fill="rgba(255,255,255,0.9)" />
                        </div>
                      </button>
                    )}
                  </div>
                )}
                <div style={{ padding: '14px 18px' }}>
                  <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: typeColor, fontWeight: 700, marginBottom: 3 }}>En cours</p>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px',
                    lineHeight: 1.3, marginBottom: 12 }}>{currentLesson.title}</h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {currentLesson.video_url && (
                      <button onClick={() => setStudioOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                          borderRadius: 8, border: 'none', background: typeColor, color: '#fff',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          boxShadow: `0 4px 16px ${typeColor}40`, transition: 'transform 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                        <PlayCircle size={13} /> Regarder
                      </button>
                    )}
                    {currentLesson.pdf_url && (
                      <a href={currentLesson.pdf_url} download
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                          borderRadius: 8, border: `1px solid ${BORDER}`, color: SILVER,
                          fontSize: 12, textDecoration: 'none' }}>
                        <Download size={12} /> PDF
                      </a>
                    )}
                    <button onClick={() => handleComplete(currentLesson.id)} disabled={marking}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                        borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 'auto',
                        border: `1px solid ${lessonDone ? 'rgba(16,185,129,0.3)' : BORDER}`,
                        background: lessonDone ? 'rgba(16,185,129,0.08)' : 'transparent',
                        color: lessonDone ? EMER : SILVER, transition: 'all 0.2s', opacity: marking ? 0.5 : 1 }}>
                      <CheckCircle size={12} />
                      {lessonDone ? 'Vu ✓' : 'Noté comme vu'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden',
                position: 'relative', marginBottom: 20, background: '#0a0c12' }}>
                {formation.thumbnail_url && (
                  <img src={formation.thumbnail_url} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
                )}
                <div style={{ position: 'absolute', inset: 0,
                  background: `linear-gradient(135deg, ${typeColor}15 0%, transparent 55%, rgba(5,7,9,0.5) 100%)` }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, border: `1px solid ${typeColor}45`,
                    background: `${typeColor}12`, backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 28px ${typeColor}20` }}>
                    <PlayCircle size={24} color={typeColor} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: SILVER }}>Sélectionne une leçon</p>
                </div>
              </div>
            )}

            {/* ── Formation meta ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              {formation.variant && (
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 5, background: `${typeColor}14`, color: typeColor,
                  border: `1px solid ${typeColor}28`, flexShrink: 0, marginTop: 4 }}>
                  {formation.variant}
                </span>
              )}
              <h1 style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 800, color: CREAM,
                letterSpacing: '-0.5px', lineHeight: 1.25 }}>
                {formation.title}
              </h1>
            </div>
            <p style={{ fontSize: 12, color: DIM, marginBottom: 20 }}>
              {formation.coach?.username && <>Par <span style={{ color: SILVER }}>{formation.coach.username}</span> · </>}
              {totalLessons} leçons · {chapters.length} chapitres
            </p>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
              {(['resume', 'notes'] as const).map(t => {
                const active = tab === t
                const label  = t === 'resume' ? 'Résumé' : 'Mes notes'
                const Icon   = t === 'resume' ? FileText : StickyNote
                return (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      background: 'none', border: 'none',
                      borderBottom: `2px solid ${active ? typeColor : 'transparent'}`,
                      color: active ? typeColor : DIM, fontSize: 13,
                      fontWeight: active ? 700 : 500, cursor: 'pointer',
                      marginBottom: -1, transition: 'color 0.15s' }}>
                    <Icon size={13} /> {label}
                  </button>
                )
              })}
            </div>

            {/* ── Tab: Résumé ── */}
            {tab === 'resume' && (
              <div>
                {/* Progress card */}
                <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 12,
                  padding: '16px 20px', marginBottom: 16,
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0 20px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1,
                      color: progressPct === 100 ? EMER : typeColor }}>{progressPct}%</p>
                    <p style={{ fontSize: 10, color: DIM, marginTop: 2 }}>complété</p>
                  </div>
                  <div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 99,
                        background: progressPct === 100 ? EMER : `linear-gradient(90deg, ${typeColor}, ${typeColor}bb)`,
                        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: progressPct > 0 ? `0 0 8px ${typeColor}55` : 'none' }} />
                    </div>
                    <p style={{ fontSize: 11, color: DIM }}>
                      {doneLessons} / {totalLessons} leçons
                      {doneLessons === totalLessons && totalLessons > 0 ? ' — Formation terminée !' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: SILVER, lineHeight: 1 }}>
                      {totalLessons - doneLessons}
                    </p>
                    <p style={{ fontSize: 10, color: DIM, marginTop: 2 }}>restantes</p>
                  </div>
                </div>

                {/* Recently completed */}
                {recentlyDone.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: DIM, fontWeight: 700, marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} /> Dernières leçons vues
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {recentlyDone.map(r => (
                        <button key={r.lesson_id}
                          onClick={() => { const l = allLessons.find((x: any) => x.id === r.lesson_id); if (l) selectLesson(l) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            borderRadius: 9, background: SURF, border: `1px solid ${BORDER}`,
                            cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = `${typeColor}30`)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                          <div style={{ width: 22, height: 22, borderRadius: 6,
                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle size={11} color={EMER} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, color: CREAM, fontWeight: 500,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.title}
                            </p>
                            <p style={{ fontSize: 10, color: DIM }}>{r.chapterTitle}</p>
                          </div>
                          {r.completed_at && (
                            <span style={{ fontSize: 10, color: DIM, flexShrink: 0 }}>{fmtDate(r.completed_at)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description with "Voir plus" */}
                {formation.description && (
                  <div style={{ padding: '14px 16px', borderRadius: 10,
                    background: SURF, border: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: DIM, fontWeight: 700, marginBottom: 8 }}>À propos</p>
                    <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.75,
                      ...(descExpanded ? {} : {
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }) }}>
                      {formation.description}
                    </p>
                    {formation.description.length > 200 && (
                      <button onClick={() => setDescExpanded(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8,
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, color: typeColor, padding: 0 }}>
                        <ChevronDown size={13} style={{ transform: descExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        {descExpanded ? 'Réduire' : 'Voir plus'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Notes ── */}
            {tab === 'notes' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: DIM }}>
                    {currentLesson
                      ? <>Notes · <span style={{ color: SILVER, fontWeight: 600 }}>{currentLesson.title}</span></>
                      : 'Notes générales'}
                  </p>
                  <span style={{ fontSize: 10, color: notesSaved ? EMER : DIM, transition: 'color 0.3s' }}>
                    {notesSaved ? '✓ Sauvegardé' : 'Sauvegarde…'}
                  </span>
                </div>
                <textarea
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder={`Tes notes${currentLesson ? ` sur "${currentLesson.title}"` : ''}…\n\nPoints clés, concepts importants, questions…`}
                  style={{ width: '100%', minHeight: 240, background: SURF, border: `1px solid ${BORDER}`,
                    borderRadius: 12, padding: '14px 16px', color: CREAM, fontSize: 13, lineHeight: 1.7,
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    transition: 'border-color 0.2s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = `${typeColor}45`)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
                <p style={{ fontSize: 11, color: DIM, marginTop: 8 }}>
                  Sauvegardées localement. Change de leçon pour des notes séparées par leçon.
                </p>
              </div>
            )}
          </div>

          {/* ════ RIGHT — chapter sidebar ════ */}
          <div style={{ position: 'sticky', top: 52, height: 'calc(100vh - 52px)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${BORDER}`,
              background: BG, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <BookOpen size={13} color={typeColor} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: CREAM }}>Sommaire</span>
                </div>
                <span style={{ fontSize: 10, color: DIM }}>{chapters.length} ch. · {totalLessons} leçons</span>
              </div>
            </div>

            {/* Chapters */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chapters.map((chapter, ci) => {
                const isOpen  = openChapters.includes(chapter.id)
                const lessons = chapter.formation_lessons ?? []
                const done    = lessons.filter((l: any) => completedIds.includes(l.id)).length
                const allDone = done === lessons.length && lessons.length > 0

                return (
                  <div key={chapter.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <button onClick={() => toggleChapter(chapter.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 18px', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = SURF)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: allDone ? 'rgba(16,185,129,0.1)' : `${typeColor}10`,
                        border: `1px solid ${allDone ? 'rgba(16,185,129,0.25)' : `${typeColor}22`}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, color: allDone ? EMER : typeColor }}>
                        {allDone ? <CheckCircle size={11} /> : ci + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: CREAM,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {chapter.title}
                        </p>
                        <p style={{ fontSize: 10, marginTop: 1,
                          color: allDone ? EMER : done > 0 ? typeColor : DIM }}>
                          {done}/{lessons.length} vues
                        </p>
                      </div>
                      <ChevronRight size={12} color={DIM} style={{
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s', flexShrink: 0 }} />
                    </button>

                    {/* Lessons with thumbnails */}
                    {isOpen && lessons.map((lesson: any) => {
                      const locked = !lesson.is_free && !hasPurchased
                      const done   = completedIds.includes(lesson.id)
                      const active = currentLesson?.id === lesson.id
                      const thumb  = lesson.thumbnail_url ?? formation.thumbnail_url

                      return (
                        <button key={lesson.id} onClick={() => selectLesson(lesson)} disabled={locked}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 18px 8px 14px',
                            background: active ? `${typeColor}0e` : 'transparent',
                            border: 'none', borderLeft: `2px solid ${active ? typeColor : 'transparent'}`,
                            cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left',
                            opacity: locked ? 0.35 : 1, transition: 'background 0.15s' }}
                          onMouseEnter={e => { if (!locked && !active) e.currentTarget.style.background = SURF }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>

                          {/* Thumbnail */}
                          <div style={{ width: 52, height: 30, borderRadius: 5, flexShrink: 0, overflow: 'hidden',
                            background: '#0d0f15', border: `1px solid ${active ? `${typeColor}40` : BORDER}`,
                            position: 'relative', transition: 'border-color 0.15s' }}>
                            {thumb && (
                              <img src={thumb} alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover',
                                  opacity: done ? 0.4 : active ? 0.7 : 0.55 }} />
                            )}
                            {/* Status overlay icon */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex',
                              alignItems: 'center', justifyContent: 'center' }}>
                              {done ? (
                                <div style={{ width: 16, height: 16, borderRadius: '50%',
                                  background: 'rgba(16,185,129,0.9)', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center' }}>
                                  <CheckCircle size={9} color="#fff" />
                                </div>
                              ) : locked ? (
                                <Lock size={10} color={SILVER} />
                              ) : active ? (
                                <div style={{ width: 16, height: 16, borderRadius: '50%',
                                  background: `${typeColor}cc`, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center' }}>
                                  <PlayCircle size={9} color="#fff" fill="white" />
                                </div>
                              ) : (
                                <PlayCircle size={12} color="rgba(255,255,255,0.5)" />
                              )}
                            </div>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, lineHeight: 1.35,
                              color: active ? typeColor : done ? DIM : CREAM,
                              fontWeight: active ? 600 : 400,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {lesson.title}
                            </p>
                            {lesson.is_free && !hasPurchased && (
                              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
                                color: '#06b6d4', border: '1px solid rgba(6,182,212,0.28)',
                                padding: '1px 5px', borderRadius: 3, marginTop: 3, display: 'inline-block' }}>
                                FREE
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Coach footer */}
            {formation.coach?.username && (
              <div style={{ padding: '12px 18px', borderTop: `1px solid ${BORDER}`, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 9 }}>
                {formation.coach.avatar_url ? (
                  <img src={formation.coach.avatar_url} alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                      border: `1px solid ${typeColor}35` }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%',
                    background: `${typeColor}14`, border: `1px solid ${typeColor}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: typeColor, flexShrink: 0 }}>
                    {formation.coach.username[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 9, color: DIM, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Formateur</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: CREAM,
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
