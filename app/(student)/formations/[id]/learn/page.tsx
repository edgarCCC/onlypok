'use client'
import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import {
  ArrowLeft, Lock, CheckCircle, PlayCircle, Download,
  ChevronRight, BookOpen, FileText, Clock, StickyNote,
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

  const [formation, setFormation]         = useState<any>(null)
  const [chapters,  setChapters]          = useState<any[]>([])
  const [hasPurchased, setHasPurchased]   = useState(false)
  const [progress, setProgress]           = useState<ProgressRow[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [studioOpen, setStudioOpen]       = useState(false)
  const [openChapters, setOpenChapters]   = useState<string[]>([])
  const [loading, setLoading]             = useState(true)
  const [marking, setMarking]             = useState(false)
  const [tab, setTab]                     = useState<'resume' | 'notes'>('resume')
  const [notes, setNotes]                 = useState('')
  const [notesSaved, setNotesSaved]       = useState(true)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showBanner = searchParams.get('payment') === 'success'

  /* ── Load ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id || authLoading) return
    const load = async () => {
      const [{ data: f }, { data: ch }] = await Promise.all([
        supabase.from('formations').select('*, coach:profiles(username, avatar_url)').eq('id', id).single(),
        supabase.from('formation_chapters').select('*, formation_lessons(*)').eq('formation_id', id).order('order_index'),
      ])
      setFormation(f)
      setChapters(ch ?? [])
      if (ch?.[0]) setOpenChapters([ch[0].id])

      if (f?.content_type === 'video' && f?.video_url) {
        setCurrentLesson({ id: f.id, title: f.title, video_url: f.video_url, is_free: f.price === 0 })
        setStudioOpen(true)
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
        setProgress(prog ?? [])
      } else {
        if (!free) { router.replace(`/formations/${id}`); return }
      }
      setLoading(false)
    }
    load()
  }, [id, user, authLoading, supabase, router])

  /* ── Load notes from localStorage ────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return
    const key = `onlypok_notes_${id}_${currentLesson?.id ?? 'general'}`
    setNotes(localStorage.getItem(key) ?? '')
    setNotesSaved(true)
  }, [id, currentLesson?.id])

  /* ── Auto-save notes ──────────────────────────────────────────────────────── */
  const handleNotesChange = (val: string) => {
    setNotes(val)
    setNotesSaved(false)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      const key = `onlypok_notes_${id}_${currentLesson?.id ?? 'general'}`
      localStorage.setItem(key, val)
      setNotesSaved(true)
    }, 800)
  }

  /* ── Derived ──────────────────────────────────────────────────────────────── */
  const completedIds  = useMemo(() => progress.map(p => p.lesson_id), [progress])
  const allLessons    = useMemo(() => chapters.flatMap(c => c.formation_lessons ?? []), [chapters])
  const totalLessons  = allLessons.length
  const doneLessons   = completedIds.length
  const progressPct   = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

  /* Last 4 completed lessons with lesson title looked up from chapters */
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

  /* ── Actions ──────────────────────────────────────────────────────────────── */
  const toggleChapter = (cid: string) =>
    setOpenChapters(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid])

  const handleComplete = async (lessonId: string) => {
    if (!user || marking) return
    setMarking(true)
    const done = completedIds.includes(lessonId)
    if (done) {
      await supabase.from('formation_progress').delete().eq('lesson_id', lessonId).eq('user_id', user.id)
      setProgress(prev => prev.filter(p => p.lesson_id !== lessonId))
    } else {
      const now = new Date().toISOString()
      await supabase.from('formation_progress').upsert({ user_id: user.id, lesson_id: lessonId, formation_id: id, completed: true, completed_at: now })
      setProgress(prev => [{ lesson_id: lessonId, completed_at: now }, ...prev])
    }
    setMarking(false)
  }

  const selectLesson = (lesson: any) => {
    if (!lesson.is_free && !hasPurchased) return
    setCurrentLesson(lesson)
    if (lesson.video_url) setStudioOpen(true)
  }

  if (loading || !formation) return <FourAcesLoader />

  const typeColor  = formation.content_type === 'video' ? '#06b6d4' : '#7c3aed'
  const lessonDone = currentLesson ? completedIds.includes(currentLesson.id) : false

  const fmtDate = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <>
      {studioOpen && currentLesson?.video_url && (
        <VideoStudio video={{ url: currentLesson.video_url, title: currentLesson.title }} onClose={() => setStudioOpen(false)} />
      )}

      <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 35% at 25% -5%, ${typeColor}10 0%, transparent 65%)` }} />

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, height: 52,
          borderBottom: `1px solid ${BORDER}`, background: 'rgba(5,7,9,0.88)',
          backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px' }}>
          <Link href={`/formations/${id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: SILVER, textDecoration: 'none',
              fontSize: 12, fontWeight: 500, flexShrink: 0, transition: 'color 0.15s' }}
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
              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'right',
                color: progressPct === 100 ? EMER : typeColor }}>{progressPct}%</span>
            </div>
          )}
        </div>

        {/* ── Body grid ───────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid',
          gridTemplateColumns: '1fr 320px', minHeight: 'calc(100vh - 52px)' }}>

          {/* ════ LEFT ════ */}
          <div style={{ padding: '24px 28px 80px', borderRight: `1px solid ${BORDER}` }}>

            {/* Payment banner */}
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

            {/* ── Lesson player / placeholder ── */}
            {currentLesson ? (
              <div style={{ marginBottom: 20, background: SURF, borderRadius: 14,
                border: `1px solid ${typeColor}22`, overflow: 'hidden' }}>
                <div style={{ height: 2, background: `linear-gradient(90deg, ${typeColor}, ${typeColor}50, transparent)` }} />
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: typeColor, fontWeight: 700, marginBottom: 4 }}>En cours</p>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px',
                    lineHeight: 1.3, marginBottom: 14 }}>{currentLesson.title}</h2>
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
                          borderRadius: 8, border: `1px solid ${BORDER}`, color: SILVER, fontSize: 12,
                          textDecoration: 'none', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = `${typeColor}50`)}
                        onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = BORDER)}>
                        <Download size={12} /> PDF
                      </a>
                    )}
                    <button onClick={() => handleComplete(currentLesson.id)} disabled={marking}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                        borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 'auto',
                        border: `1px solid ${lessonDone ? 'rgba(16,185,129,0.3)' : BORDER}`,
                        background: lessonDone ? 'rgba(16,185,129,0.07)' : 'transparent',
                        color: lessonDone ? EMER : SILVER, transition: 'all 0.2s', opacity: marking ? 0.5 : 1 }}>
                      <CheckCircle size={12} />
                      {lessonDone ? 'Terminé' : 'Marquer terminé'}
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

            {/* ── Formation title row ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              {formation.variant && (
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 5, background: `${typeColor}14`, color: typeColor,
                  border: `1px solid ${typeColor}28`, flexShrink: 0, marginTop: 3 }}>
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
            <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
              {(['resume', 'notes'] as const).map(t => {
                const active = tab === t
                const label  = t === 'resume' ? 'Résumé' : 'Mes notes'
                const Icon   = t === 'resume' ? FileText : StickyNote
                return (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      background: 'none', border: 'none', borderBottom: `2px solid ${active ? typeColor : 'transparent'}`,
                      color: active ? typeColor : DIM, fontSize: 13, fontWeight: active ? 700 : 500,
                      cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s' }}>
                    <Icon size={13} />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* ── Tab: Résumé ── */}
            {tab === 'resume' && (
              <div>
                {/* Progress card */}
                <div style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 12,
                  padding: '16px 20px', marginBottom: 16, display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto', gap: '0 20px', alignItems: 'center' }}>
                  {/* Big % */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 900, color: progressPct === 100 ? EMER : typeColor,
                      letterSpacing: '-1px', lineHeight: 1 }}>{progressPct}%</p>
                    <p style={{ fontSize: 10, color: DIM, marginTop: 2 }}>complété</p>
                  </div>
                  {/* Bar + stats */}
                  <div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 99,
                        background: progressPct === 100 ? EMER : `linear-gradient(90deg, ${typeColor}, ${typeColor}bb)`,
                        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: progressPct > 0 ? `0 0 8px ${typeColor}55` : 'none' }} />
                    </div>
                    <p style={{ fontSize: 11, color: DIM }}>
                      {doneLessons} / {totalLessons} leçons{doneLessons === totalLessons && totalLessons > 0 ? ' — 🎉 Formation terminée !' : ''}
                    </p>
                  </div>
                  {/* Remaining */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: SILVER, lineHeight: 1 }}>{totalLessons - doneLessons}</p>
                    <p style={{ fontSize: 10, color: DIM, marginTop: 2 }}>restantes</p>
                  </div>
                </div>

                {/* Recently completed */}
                {recentlyDone.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: DIM, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} /> Dernières leçons complétées
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {recentlyDone.map((r, i) => (
                        <button key={r.lesson_id}
                          onClick={() => { const l = allLessons.find((x: any) => x.id === r.lesson_id); if (l) selectLesson(l) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            borderRadius: 9, background: SURF, border: `1px solid ${BORDER}`,
                            cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = `${typeColor}30`; e.currentTarget.style.background = `${typeColor}06` }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = SURF }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.22)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0 }}>
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

                {/* Description */}
                {formation.description && (
                  <div style={{ padding: '14px 16px', borderRadius: 10,
                    background: SURF, border: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: DIM, fontWeight: 700, marginBottom: 8 }}>À propos</p>
                    <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.75,
                      display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden' }}>
                      {formation.description}
                    </p>
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
                      ? <>Notes pour <span style={{ color: SILVER, fontWeight: 600 }}>{currentLesson.title}</span></>
                      : 'Notes générales de la formation'}
                  </p>
                  <span style={{ fontSize: 10, color: notesSaved ? EMER : DIM, transition: 'color 0.3s' }}>
                    {notesSaved ? '✓ Sauvegardé' : 'Sauvegarde…'}
                  </span>
                </div>
                <textarea
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder={`Tes notes${currentLesson ? ` sur "${currentLesson.title}"` : ''}…\n\nPoints clés, concepts importants, questions à poser…`}
                  style={{ width: '100%', minHeight: 260, background: SURF, border: `1px solid ${BORDER}`,
                    borderRadius: 12, padding: '14px 16px', color: CREAM, fontSize: 13, lineHeight: 1.7,
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    transition: 'border-color 0.2s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = `${typeColor}45`)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
                <p style={{ fontSize: 11, color: DIM, marginTop: 8 }}>
                  Les notes sont sauvegardées localement sur cet appareil.
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
                <span style={{ fontSize: 10, color: DIM }}>{chapters.length} ch.</span>
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
                        <p style={{ fontSize: 10, color: allDone ? EMER : done > 0 ? typeColor : DIM, marginTop: 1 }}>
                          {done}/{lessons.length}
                        </p>
                      </div>
                      <ChevronRight size={12} color={DIM} style={{
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s', flexShrink: 0 }} />
                    </button>

                    {isOpen && lessons.map((lesson: any) => {
                      const locked = !lesson.is_free && !hasPurchased
                      const done   = completedIds.includes(lesson.id)
                      const active = currentLesson?.id === lesson.id

                      return (
                        <button key={lesson.id} onClick={() => selectLesson(lesson)} disabled={locked}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                            padding: '9px 18px 9px 32px',
                            background: active ? `${typeColor}10` : 'transparent',
                            border: 'none', borderLeft: `2px solid ${active ? typeColor : 'transparent'}`,
                            cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left',
                            opacity: locked ? 0.38 : 1, transition: 'background 0.15s' }}
                          onMouseEnter={e => { if (!locked && !active) e.currentTarget.style.background = SURF }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: done ? 'rgba(16,185,129,0.1)' : active ? `${typeColor}15` : 'transparent',
                            border: `1px solid ${done ? 'rgba(16,185,129,0.28)' : active ? `${typeColor}38` : BORDER}` }}>
                            {done
                              ? <CheckCircle size={9} color={EMER} />
                              : locked
                                ? <Lock size={8} color={DIM} />
                                : <PlayCircle size={9} color={active ? typeColor : DIM} />
                            }
                          </div>
                          <span style={{ flex: 1, fontSize: 11, lineHeight: 1.4,
                            color: active ? typeColor : done ? SILVER : CREAM,
                            fontWeight: active ? 600 : 400,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lesson.title}
                          </span>
                          {lesson.is_free && !hasPurchased && (
                            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
                              color: '#06b6d4', border: '1px solid rgba(6,182,212,0.28)',
                              padding: '2px 5px', borderRadius: 3, flexShrink: 0 }}>FREE</span>
                          )}
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
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${typeColor}14`,
                    border: `1px solid ${typeColor}28`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11, fontWeight: 700, color: typeColor, flexShrink: 0 }}>
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
