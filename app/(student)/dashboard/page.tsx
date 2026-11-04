'use client'
// Accueil de l'élève : une seule question, « que fais-je maintenant ? ». Ce qui demande une action d'abord (session, créneau, formation à reprendre),
// puis ce qui est en cours. Pas de compteurs à zéro, pas d'icônes en rond : du texte, des chiffres et un seul bouton plein.
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import FourAcesLoader from '@/components/FourAcesLoader'
import './dashboard.css'

type Booking = {
  id: string; scheduled_at: string | null; status: string; coach_id: string
  formation: { title: string } | null
  coach: { id: string; username: string | null; avatar_url: string | null } | null
}
type CoachItem = {
  id: string; username: string | null; avatar_url: string | null
  nextSession: Booking | null; pendingCount: number
  lastMessage: { content: string; created_at: string; from_me: boolean } | null
}
type FormationItem = { id: string; title: string; content_type: string; totalLessons: number; completedLessons: number }
type LessonItem = { lessonId: string; title: string; formationId: string; formationTitle: string; completedAt: string }
type Todo = { key: string; eyebrow: string; title: string; detail: string; cta: string; href: string }

/* eslint-disable @typescript-eslint/no-explicit-any -- lignes Supabase jointes, retypées juste en dessous */
function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return 'Bonne nuit'
  return hour < 18 ? 'Bonjour' : 'Bonsoir'
}
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `il y a ${hours} h` : fmtShort(iso)
}

function buildTodos(nextSession: Booking | null, pending: Booking[], resume: FormationItem | null): Todo[] {
  const todos: Todo[] = []
  if (nextSession?.scheduled_at) {
    todos.push({
      key: 'session',
      eyebrow: `${fmtDay(nextSession.scheduled_at)} à ${fmtTime(nextSession.scheduled_at)}`,
      title: nextSession.formation?.title ?? 'Session de coaching',
      detail: `Avec ${nextSession.coach?.username ?? 'ton coach'}. Note tes questions avant de commencer.`,
      cta: 'Préparer la session',
      href: `/coaching/${nextSession.id}`,
    })
  }
  if (pending.length > 0) {
    const names = [...new Set(pending.map((booking) => booking.coach?.username).filter(Boolean))].join(', ')
    todos.push({
      key: 'pending',
      eyebrow: 'À planifier',
      title: pending.length > 1 ? `${pending.length} sessions payées attendent un créneau` : 'Une session payée attend un créneau',
      detail: names ? `Avec ${names}.` : 'Choisis un horaire avec ton coach.',
      cta: 'Choisir un créneau',
      href: '/schedule',
    })
  }
  if (resume) {
    const left = resume.totalLessons - resume.completedLessons
    todos.push({
      key: 'resume',
      eyebrow: 'À reprendre',
      title: resume.title,
      detail: `${resume.completedLessons} leçons sur ${resume.totalLessons}, il en reste ${left}.`,
      cta: 'Reprendre',
      href: `/formations/${resume.id}/learn`,
    })
  }
  return todos
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  return (
    <span className="ui-avatar" aria-hidden="true" style={{ position: 'relative' }}>
      {url ? <Image src={url} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} /> : (name ?? '?')[0].toUpperCase()}
    </span>
  )
}

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [coaches, setCoaches] = useState<CoachItem[]>([])
  const [formations, setFormations] = useState<FormationItem[]>([])
  const [lessons, setLessons] = useState<LessonItem[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const uid = user.id
      try {
        const [
          { data: prof },
          { data: bRows },
          { data: pRows },
          { data: progRows },
          { data: msgRows },
          { data: lessonRows },
        ] = await Promise.all([
          supabase.from('profiles').select('username, avatar_url').eq('id', uid).single(),
          supabase.from('bookings')
            .select('id, scheduled_at, status, coach_id, formation_id')
            .eq('student_id', uid)
            .in('status', ['paid_pending_schedule', 'scheduled', 'completed'])
            .order('scheduled_at', { ascending: true })
            .limit(20),
          supabase.from('formation_purchases')
            .select(`id, formation_id,
              formation:formations(
                id, title, thumbnail_url, content_type,
                chapters:formation_chapters(lessons:formation_lessons(id))
              )`)
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(12),
          supabase.from('formation_progress')
            .select('formation_id, lesson_id')
            .eq('user_id', uid)
            .eq('completed', true),
          supabase.from('messages')
            .select('sender_id, receiver_id, content, created_at')
            .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
            .order('created_at', { ascending: false })
            .limit(30),
          supabase.from('formation_progress')
            .select(`lesson_id, formation_id, completed_at,
              lesson:formation_lessons(id, title),
              formation:formations(id, title)`)
            .eq('user_id', uid)
            .eq('completed', true)
            .order('completed_at', { ascending: false })
            .limit(8),
        ])

        setUsername(prof?.username ?? null)

        // Titres de formation et profils coach à part, pour éviter les soucis de jointure sur les clés étrangères
        const bookingRows = bRows ?? []
        const bFormationIds = [...new Set(bookingRows.map((b: any) => b.formation_id).filter(Boolean))]
        const bCoachIds = [...new Set(bookingRows.map((b: any) => b.coach_id).filter(Boolean))]
        const [{ data: bFormations }, { data: bCoaches }] = await Promise.all([
          bFormationIds.length ? supabase.from('formations').select('id, title').in('id', bFormationIds) : Promise.resolve({ data: [] as any[] }),
          bCoachIds.length ? supabase.from('profiles').select('id, username, avatar_url').in('id', bCoachIds) : Promise.resolve({ data: [] as any[] }),
        ])
        const formationById = new Map((bFormations ?? []).map((f: any) => [f.id, f]))
        const coachById = new Map((bCoaches ?? []).map((c: any) => [c.id, c]))
        const allBookings: Booking[] = bookingRows.map((row: any) => ({
          id: row.id, scheduled_at: row.scheduled_at ?? null, status: row.status, coach_id: row.coach_id,
          formation: (formationById.get(row.formation_id) as Booking['formation']) ?? null,
          coach: (coachById.get(row.coach_id) as Booking['coach']) ?? null,
        }))
        setBookings(allBookings)

        const coachMap = new Map<string, CoachItem>()
        for (const booking of allBookings) {
          if (!booking.coach) continue
          const entry = coachMap.get(booking.coach_id) ?? { id: booking.coach_id, username: booking.coach.username, avatar_url: booking.coach.avatar_url, nextSession: null, pendingCount: 0, lastMessage: null }
          if (booking.status === 'scheduled' && !entry.nextSession && booking.scheduled_at && new Date(booking.scheduled_at) > new Date()) entry.nextSession = booking
          if (booking.status === 'paid_pending_schedule') entry.pendingCount++
          coachMap.set(booking.coach_id, entry)
        }
        const messages = msgRows ?? []
        coachMap.forEach((entry, coachId) => {
          const message = messages.find((m: any) => m.sender_id === coachId || m.receiver_id === coachId)
          if (message) entry.lastMessage = { content: message.content, created_at: message.created_at, from_me: message.sender_id === uid }
        })
        setCoaches([...coachMap.values()])

        const completed = new Map<string, number>()
        for (const row of progRows ?? []) completed.set(row.formation_id, (completed.get(row.formation_id) ?? 0) + 1)
        setFormations((pRows ?? []).map((row: any) => {
          const formation = Array.isArray(row.formation) ? row.formation[0] : row.formation
          if (!formation) return null
          return {
            id: formation.id, title: formation.title, content_type: formation.content_type,
            totalLessons: (formation.chapters ?? []).flatMap((chapter: any) => chapter.lessons ?? []).length,
            completedLessons: completed.get(formation.id) ?? 0,
          }
        }).filter(Boolean) as FormationItem[])

        setLessons((lessonRows ?? []).map((row: any) => {
          const lesson = Array.isArray(row.lesson) ? row.lesson[0] : row.lesson
          const formation = Array.isArray(row.formation) ? row.formation[0] : row.formation
          if (!lesson || !formation) return null
          return { lessonId: row.lesson_id, title: lesson.title, formationId: formation.id, formationTitle: formation.title, completedAt: row.completed_at }
        }).filter(Boolean) as LessonItem[])
      } catch (error) {
        console.error('[dashboard] chargement impossible', error)
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase, router])

  if (loading) return <FourAcesLoader />

  const now = new Date()
  const scheduled = bookings.filter((b) => b.status === 'scheduled' && b.scheduled_at && new Date(b.scheduled_at) > now)
  const pending = bookings.filter((b) => b.status === 'paid_pending_schedule')
  const courses = formations.filter((f) => f.content_type !== 'coaching')
  const inProgress = courses.filter((f) => f.totalLessons > 0 && f.completedLessons < f.totalLessons)
  const resume = [...inProgress].sort((a, b) => b.completedLessons - a.completedLessons)[0] ?? null
  const todos = buildTodos(scheduled[0] ?? null, pending, resume)
  const isNew = coaches.length === 0 && courses.length === 0

  return (
    <div className="sd">
      <header className="sd-head">
        <h1 className="t-title">{greeting()}{username ? ` ${username}` : ''}</h1>
        <p className="t-2">
          {scheduled[0]?.scheduled_at
            ? `Prochaine session ${fmtDay(scheduled[0].scheduled_at)} à ${fmtTime(scheduled[0].scheduled_at)}.`
            : isNew ? 'Commence par un exercice, tu verras ensuite ce qui te manque.' : 'Aucune session planifiée pour l’instant.'}
        </p>
      </header>

      {loadError && <p className="ui-field-error sd-error" role="alert">Une partie de ton espace n’a pas pu se charger. Recharge la page.</p>}

      <div className="sd-grid">
        <div className="sd-main">
          <section aria-labelledby="sd-todo">
            <h2 id="sd-todo" className="t-caps sd-label">À faire maintenant</h2>
            {todos.length > 0 ? (
              <ol className="sd-todos">
                {todos.map((todo, index) => (
                  <li key={todo.key} className="sd-todo">
                    <div className="sd-todo-text">
                      <p className="sd-todo-eyebrow">{todo.eyebrow}</p>
                      <p className="t-heading">{todo.title}</p>
                      <p className="t-2 sd-todo-detail">{todo.detail}</p>
                    </div>
                    <Link href={todo.href} className={`ui-btn ${index === 0 ? 'ui-btn-primary' : 'ui-btn-secondary'}`}>{todo.cta}</Link>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="sd-todos">
                <li className="sd-todo">
                  <div className="sd-todo-text">
                    <p className="sd-todo-eyebrow">Dix minutes</p>
                    <p className="t-heading">Un drill de ranges pour commencer</p>
                    <p className="t-2 sd-todo-detail">Tu joues vingt mains, tu vois tout de suite où tu te trompes.</p>
                  </div>
                  <Link href="/train/ranges" className="ui-btn ui-btn-primary">Lancer le drill</Link>
                </li>
                <li className="sd-todo">
                  <div className="sd-todo-text">
                    <p className="sd-todo-eyebrow">Pour aller plus loin</p>
                    <p className="t-heading">Choisis une formation ou un coach</p>
                    <p className="t-2 sd-todo-detail">Le catalogue se filtre par variante, prix et niveau.</p>
                  </div>
                  <Link href="/formations" className="ui-btn ui-btn-secondary">Voir le catalogue</Link>
                </li>
              </ol>
            )}
          </section>

          {courses.length > 0 && (
            <section aria-labelledby="sd-courses" className="sd-section">
              <div className="sd-section-head">
                <h2 id="sd-courses" className="t-caps sd-label">Mes contenus</h2>
                <Link href="/formations" className="sd-more">Le catalogue</Link>
              </div>
              <ul className="sd-rows">
                {courses.map((formation) => {
                  const ratio = formation.totalLessons ? formation.completedLessons / formation.totalLessons : 0
                  return (
                    <li key={formation.id}>
                      <Link href={`/formations/${formation.id}/learn`} className="sd-row">
                        <span className="sd-row-title">{formation.title}</span>
                        <span className="sd-progress" aria-hidden="true"><i style={{ transform: `scaleX(${ratio})` }} /></span>
                        <span className="sd-row-meta">{formation.totalLessons ? `${formation.completedLessons}/${formation.totalLessons}` : 'Vidéo'}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {lessons.length > 0 && (
            <section aria-labelledby="sd-lessons" className="sd-section">
              <h2 id="sd-lessons" className="t-caps sd-label">Dernières leçons vues</h2>
              <ul className="sd-rows">
                {lessons.slice(0, 5).map((lesson) => (
                  <li key={lesson.lessonId}>
                    <Link href={`/formations/${lesson.formationId}/learn`} className="sd-row">
                      <span className="sd-row-title">{lesson.title}<span className="sd-row-sub">{lesson.formationTitle}</span></span>
                      <span className="sd-row-meta">{fmtShort(lesson.completedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="sd-side">
          <section aria-labelledby="sd-coaches">
            <div className="sd-section-head">
              <h2 id="sd-coaches" className="t-caps sd-label">Mes coachs</h2>
              <Link href="/coaches" className="sd-more">Trouver un coach</Link>
            </div>
            {coaches.length > 0 ? (
              <ul className="sd-coaches">
                {coaches.map((coach) => (
                  <li key={coach.id}>
                    <Link href="/messages" className="sd-coach">
                      <Avatar url={coach.avatar_url} name={coach.username} />
                      <span className="sd-coach-body">
                        <span className="sd-coach-name">{coach.username ?? 'Coach'}{coach.lastMessage && <time>{timeAgo(coach.lastMessage.created_at)}</time>}</span>
                        <span className="sd-coach-msg clamp2">{coach.lastMessage ? `${coach.lastMessage.from_me ? 'Toi : ' : ''}${coach.lastMessage.content}` : 'Aucun message pour l’instant.'}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="t-2 sd-empty">Tes coachs apparaissent ici après ta première session.</p>}
          </section>

          <section aria-labelledby="sd-tools" className="sd-section">
            <h2 id="sd-tools" className="t-caps sd-label">Outils</h2>
            <ul className="sd-rows">
              <li><Link href="/train/ranges" className="sd-row"><span className="sd-row-title">Entraîneur de ranges<span className="sd-row-sub">Drill, quiz, explorateur</span></span></Link></li>
              <li><Link href="/train/equity" className="sd-row"><span className="sd-row-title">Équité<span className="sd-row-sub">Calcul et estimation</span></span></Link></li>
              <li><Link href="/tracker/dashboard" className="sd-row"><span className="sd-row-title">Tracker<span className="sd-row-sub">Bankroll, résultats, stats</span></span></Link></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
