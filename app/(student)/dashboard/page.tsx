'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, CheckCircle, AlertCircle,
  Play, Zap, Users, Loader2, Sparkles, Camera,
  BookOpen, Video, Calendar, MessageSquare, ShoppingBag,
  Brain, BarChart2, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ─── Tokens ─────────────────────────────────────── */
const BG      = '#050709'
const SURFACE = 'rgba(255,255,255,0.028)'
const BORDER  = 'rgba(255,255,255,0.07)'
const BORDER_H = 'rgba(255,255,255,0.13)'
const CREAM   = '#f0f4ff'
const MID     = 'rgba(240,244,255,0.5)'
const DIM     = 'rgba(240,244,255,0.22)'
const GHOST   = 'rgba(240,244,255,0.06)'
const CYAN    = '#06b6d4'
const VIOLET  = '#7c3aed'
const AMBER   = '#f59e0b'
const EMER    = '#10b981'

/* ─── Types ──────────────────────────────────────── */
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
type FormationItem = {
  id: string; purchaseId: string; title: string
  thumbnail_url: string | null; content_type: string
  totalLessons: number; completedLessons: number
}
type LessonItem = {
  lessonId: string; title: string
  formationId: string; formationTitle: string; completedAt: string
}

/* ─── Helpers ────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Bonne nuit'
  if (h < 18) return 'Bonjour'
  return 'Bonsoir'
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function today() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return fmtShort(iso)
}

/* ═══════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading,    setLoading]    = useState(true)
  const [username,   setUsername]   = useState<string | null>(null)
  const [avatar,     setAvatar]     = useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [coaches,    setCoaches]    = useState<CoachItem[]>([])
  const [formations, setFormations] = useState<FormationItem[]>([])
  const [lessons,    setLessons]    = useState<LessonItem[]>([])
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: form })
      const json = await res.json()
      if (json.url) setAvatar(`${json.url}&bust=${Date.now()}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const uid = user.id

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
          .select(`id, scheduled_at, status, coach_id,
            formation:formations(title),
            coach:profiles!coach_id(id, username, avatar_url)`)
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
          .select('from_id, to_id, content, created_at')
          .or(`from_id.eq.${uid},to_id.eq.${uid}`)
          .order('created_at', { ascending: false })
          .limit(30),

        supabase.from('formation_progress')
          .select(`lesson_id, formation_id, created_at,
            lesson:formation_lessons(id, title),
            formation:formations(id, title)`)
          .eq('user_id', uid)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      setUsername(prof?.username ?? null)
      setAvatar(prof?.avatar_url ?? null)

      const nb = (r: any): Booking => ({
        id: r.id, scheduled_at: r.scheduled_at ?? null, status: r.status, coach_id: r.coach_id,
        formation: Array.isArray(r.formation) ? r.formation[0] ?? null : r.formation ?? null,
        coach:     Array.isArray(r.coach)     ? r.coach[0]     ?? null : r.coach     ?? null,
      })
      const allBookings = (bRows ?? []).map(nb)
      setBookings(allBookings)

      // Build coaches map (grouped by coach_id)
      const coachMap = new Map<string, CoachItem>()
      for (const b of allBookings) {
        if (!b.coach) continue
        if (!coachMap.has(b.coach_id)) {
          coachMap.set(b.coach_id, {
            id: b.coach_id,
            username: b.coach.username,
            avatar_url: b.coach.avatar_url,
            nextSession: null, pendingCount: 0, lastMessage: null,
          })
        }
        const entry = coachMap.get(b.coach_id)!
        if (b.status === 'scheduled' && !entry.nextSession) entry.nextSession = b
        if (b.status === 'paid_pending_schedule') entry.pendingCount++
      }
      // Attach last message per coach
      const msgs = msgRows ?? []
      for (const [coachId, entry] of coachMap) {
        const m = msgs.find(m => m.from_id === coachId || m.to_id === coachId)
        if (m) entry.lastMessage = { content: m.content, created_at: m.created_at, from_me: m.from_id === uid }
      }
      setCoaches([...coachMap.values()])

      // Build formations with lesson progress
      const completedByFormation = new Map<string, number>()
      for (const p of (progRows ?? [])) {
        completedByFormation.set(p.formation_id, (completedByFormation.get(p.formation_id) ?? 0) + 1)
      }
      setFormations(
        (pRows ?? []).map((r: any) => {
          const f = Array.isArray(r.formation) ? r.formation[0] : r.formation
          if (!f) return null
          const total = (f.chapters ?? []).flatMap((ch: any) => ch.lessons ?? []).length
          return {
            id: f.id, purchaseId: r.id, title: f.title,
            thumbnail_url: f.thumbnail_url ?? null, content_type: f.content_type,
            totalLessons: total, completedLessons: completedByFormation.get(f.id) ?? 0,
          }
        }).filter(Boolean) as FormationItem[]
      )

      // Build recent lessons
      setLessons(
        (lessonRows ?? []).map((r: any) => {
          const lesson    = Array.isArray(r.lesson)    ? r.lesson[0]    : r.lesson
          const formation = Array.isArray(r.formation) ? r.formation[0] : r.formation
          if (!lesson || !formation) return null
          return { lessonId: r.lesson_id, title: lesson.title, formationId: formation.id, formationTitle: formation.title, completedAt: r.created_at }
        }).filter(Boolean) as LessonItem[]
      )

      setLoading(false)
    })()
  }, [supabase, router])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color={CYAN} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const scheduled       = bookings.filter(b => b.status === 'scheduled')
  const pending         = bookings.filter(b => b.status === 'paid_pending_schedule')
  const nextSession     = scheduled[0] ?? null
  const courseFormations = formations.filter(f => f.content_type !== 'video')
  const videoFormations  = formations.filter(f => f.content_type === 'video')
  const totalLessons    = formations.reduce((s, f) => s + f.completedLessons, 0)

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>

      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '10%', width: 700, height: 700,
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.04) 0%, transparent 60%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 500, height: 500,
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.04) 0%, transparent 60%)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto', padding: '52px clamp(16px,3vw,48px) 96px' }}>

        {/* ── HERO ─────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52, gap: 24 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: DIM, letterSpacing: '0.04em', margin: '0 0 14px', textTransform: 'capitalize' }}>
              {today()}
            </p>
            <h1 style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 'clamp(30px,4vw,44px)', fontWeight: 800, color: CREAM, letterSpacing: '-1.2px', lineHeight: 1.08, margin: 0 }}>
              {greeting()} {username ?? ''}&nbsp;👋
            </h1>
            <p style={{ fontSize: 14, color: MID, margin: '12px 0 0', lineHeight: 1.6 }}>
              {nextSession
                ? <>Prochaine session · <span style={{ color: CREAM }}>{fmtDate(nextSession.scheduled_at!)} à {fmtTime(nextSession.scheduled_at!)}</span></>
                : coaches.length === 0 && formations.length === 0 ? 'Lance-toi — explore formations et coachs.' : 'Continue ta progression.'}
            </p>
          </div>

          {/* Avatar clickable */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${CYAN},${VIOLET})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', overflow: 'hidden', border: `2px solid ${BORDER_H}` }}>
              {uploading
                ? <Loader2 size={26} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (username ?? '?')[0].toUpperCase()}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} title="Changer la photo"
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', opacity: 0, transition: 'opacity 0.15s' }}
              onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0'}>
              <Camera size={20} color="#fff" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
        </div>

        {/* ── KPI STRIP ────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 40 }}>
          {[
            { label: 'Coachs',     value: coaches.length,     accent: VIOLET, Icon: Users        },
            { label: 'Formations', value: formations.length,  accent: CYAN,   Icon: BookOpen     },
            { label: 'Sessions',   value: bookings.length,    accent: AMBER,  Icon: Zap          },
            { label: 'Leçons vues',value: totalLessons,       accent: EMER,   Icon: CheckCircle  },
          ].map(({ label, value, accent, Icon }) => (
            <div key={label}
              style={{ padding: '16px 18px', borderRadius: 14, background: SURFACE, border: `1px solid ${BORDER}`, transition: 'border-color 0.15s', cursor: 'default' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = BORDER_H}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = BORDER}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `${accent}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={12} color={accent} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              </div>
              <span style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── SESSION SPOTLIGHT ─────────────────────────── */}
        {(nextSession || pending.length > 0) && (
          <div style={{ marginBottom: 48 }}>
            {nextSession ? (
              <div style={{ padding: '28px', borderRadius: 18, background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.05))', border: '1px solid rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: EMER, boxShadow: `0 0 8px ${EMER}` }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: EMER, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prochaine session</span>
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: CREAM, margin: '0 0 4px', fontFamily: 'var(--font-syne,sans-serif)' }}>
                    {nextSession.formation?.title ?? 'Session de coaching'}
                  </p>
                  <p style={{ fontSize: 13, color: MID, margin: 0 }}>
                    avec <span style={{ color: CREAM }}>{nextSession.coach?.username ?? '—'}</span> · <span style={{ textTransform: 'capitalize' }}>{fmtDate(nextSession.scheduled_at!)} à {fmtTime(nextSession.scheduled_at!)}</span>
                  </p>
                </div>
                <Link href="/schedule" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: EMER, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Voir le planning <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <div style={{ padding: '24px 28px', borderRadius: 18, background: 'linear-gradient(135deg,rgba(245,158,11,0.07),rgba(124,58,237,0.05))', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertCircle size={18} color={AMBER} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: '0 0 2px' }}>
                      {pending.length} créneau{pending.length > 1 ? 'x' : ''} à planifier
                    </p>
                    <p style={{ fontSize: 12, color: MID, margin: 0 }}>Choisis ta disponibilité avec ton coach</p>
                  </div>
                </div>
                <Link href="/schedule" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: AMBER, color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Choisir un créneau <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* ── MES COACHS ───────────────────────────────── */}
        {/* ══════════════════════════════════════════════ */}
        <Section title="Mes Coachs" href="/formations?tab=coaching" count={coaches.length} empty={coaches.length === 0}
          emptyIcon={<Users size={22} color={DIM} />}
          emptyText="Aucun coach yet"
          emptyAction={{ label: 'Trouver un coach', href: '/formations?tab=coaching' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {coaches.slice(0, 3).map(coach => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════════ */}
        {/* ── MES FORMATIONS ───────────────────────────── */}
        {/* ══════════════════════════════════════════════ */}
        <Section title="Mes Formations" href="/formations" count={courseFormations.length} empty={courseFormations.length === 0}
          emptyIcon={<BookOpen size={22} color={DIM} />}
          emptyText="Aucune formation achetée"
          emptyAction={{ label: 'Explorer le catalogue', href: '/formations' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {courseFormations.slice(0, 6).map(f => (
              <FormationCard key={f.id} formation={f} />
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════════ */}
        {/* ── MES VIDÉOS ───────────────────────────────── */}
        {/* ══════════════════════════════════════════════ */}
        <Section title="Mes Vidéos" href="/formations?tab=video" count={videoFormations.length} empty={videoFormations.length === 0}
          emptyIcon={<Video size={22} color={DIM} />}
          emptyText="Aucune vidéo achetée"
          emptyAction={{ label: 'Découvrir les vidéos', href: '/formations?tab=video' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {videoFormations.slice(0, 6).map(f => (
              <FormationCard key={f.id} formation={f} />
            ))}
          </div>
        </Section>

        {/* ── NAV RAPIDE ──────────────────────────────── */}
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { href: '/train',    label: 'Trainer',  Icon: Brain,        color: AMBER  },
            { href: '/track',    label: 'Tracker',  Icon: BarChart2,    color: EMER   },
            { href: '/messages', label: 'Messages', Icon: MessageSquare, color: CYAN  },
          ].map(({ href, label, Icon, color }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '14px 16px', borderRadius: 14, background: SURFACE, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${color}0d`; el.style.borderColor = `${color}30` }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = SURFACE; el.style.borderColor = BORDER }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{label}</span>
                <ArrowUpRight size={12} color={DIM} style={{ marginLeft: 'auto' }} />
              </div>
            </Link>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}

/* ── Section wrapper ─────────────────────────────── */
function Section({
  title, href, count, empty, emptyIcon, emptyText, emptyAction, children,
}: {
  title: string; href: string; count: number; empty: boolean
  emptyIcon: React.ReactNode; emptyText: string
  emptyAction: { label: string; href: string }
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 18, fontWeight: 700, color: CREAM, margin: 0, letterSpacing: '-0.3px' }}>{title}</h2>
          {count > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: DIM }}>{count}</span>}
        </div>
        <Link href={href} style={{ fontSize: 11, color: MID, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = CREAM}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = MID}>
          Voir tout <ArrowRight size={11} />
        </Link>
      </div>

      {empty ? (
        <div style={{ padding: '32px', borderRadius: 18, background: SURFACE, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {emptyIcon}
          <p style={{ fontSize: 13, color: DIM, margin: 0 }}>{emptyText}</p>
          <Link href={emptyAction.href} style={{ fontSize: 12, color: CYAN, textDecoration: 'none', fontWeight: 600 }}>{emptyAction.label} →</Link>
        </div>
      ) : children}
    </div>
  )
}

/* ── Coach card ──────────────────────────────────── */
function CoachCard({ coach }: { coach: CoachItem }) {
  const hasNext    = !!coach.nextSession
  const hasPending = coach.pendingCount > 0
  const accent     = hasNext ? EMER : hasPending ? AMBER : VIOLET

  return (
    <div style={{ padding: '20px', borderRadius: 16, background: SURFACE, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 16, transition: 'border-color 0.15s', animation: 'fadeUp 0.25s ease' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = BORDER_H}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = BORDER}>

      {/* Coach identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${CYAN},${VIOLET})`, flexShrink: 0, overflow: 'hidden', border: `2px solid rgba(6,182,212,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
          {coach.avatar_url
            ? <img src={coach.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (coach.username ?? '?')[0].toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {coach.username ?? 'Coach'}
          </p>
          {hasNext && coach.nextSession?.scheduled_at ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: EMER, boxShadow: `0 0 6px ${EMER}` }} />
              <span style={{ fontSize: 11, color: EMER, fontWeight: 600 }}>
                {fmtShort(coach.nextSession.scheduled_at)} · {fmtTime(coach.nextSession.scheduled_at)}
              </span>
            </div>
          ) : hasPending ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: AMBER }} />
              <span style={{ fontSize: 11, color: AMBER, fontWeight: 600 }}>{coach.pendingCount} créneau{coach.pendingCount > 1 ? 'x' : ''} à planifier</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: DIM }}>Pas de session prévue</span>
          )}
        </div>
      </div>

      {/* Last message */}
      {coach.lastMessage && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: GHOST, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 11, color: DIM, margin: '0 0 3px', fontWeight: 600 }}>
            {coach.lastMessage.from_me ? 'Toi' : coach.username ?? 'Coach'} · {timeAgo(coach.lastMessage.created_at)}
          </p>
          <p style={{ fontSize: 12, color: MID, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {coach.lastMessage.content}
          </p>
        </div>
      )}

      {/* CTA */}
      <Link href={hasPending ? `/schedule?coach_id=${coach.id}` : `/coaches/${coach.id}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}30`, color: accent, fontSize: 12, fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = `${accent}28` }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = `${accent}18` }}>
        {hasPending ? 'Planifier ma session' : hasNext ? 'Voir le planning' : 'Réserver une session'}
        <ArrowRight size={12} />
      </Link>
    </div>
  )
}

/* ── Formation card ──────────────────────────────── */
function FormationCard({ formation: f }: { formation: FormationItem }) {
  const pct    = f.totalLessons > 0 ? Math.round(f.completedLessons / f.totalLessons * 100) : 0
  const isVideo = f.content_type === 'video'
  const accent  = isVideo ? CYAN : VIOLET
  const done    = pct === 100

  return (
    <Link href={`/formations/${f.id}/learn`} style={{ textDecoration: 'none' }}>
      <div style={{ padding: '18px 20px', borderRadius: 16, background: SURFACE, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 14, transition: 'all 0.15s', animation: 'fadeUp 0.25s ease', cursor: 'pointer' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${accent}30`; el.style.background = `${accent}06` }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = BORDER; el.style.background = SURFACE }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {f.thumbnail_url ? (
            <img src={f.thumbnail_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isVideo ? <Play size={16} color={accent} /> : <BookOpen size={16} color={accent} />}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {done ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: EMER, background: `${EMER}18`, padding: '2px 8px', borderRadius: 99 }}>Terminée</span>
              ) : f.completedLessons > 0 ? (
                <span style={{ fontSize: 10, color: DIM }}>{f.completedLessons}/{f.totalLessons} leçons</span>
              ) : (
                <span style={{ fontSize: 10, color: DIM }}>{f.totalLessons > 0 ? `${f.totalLessons} leçons` : 'Pas de leçons'}</span>
              )}
            </div>
          </div>
          <ArrowRight size={13} color={DIM} style={{ flexShrink: 0, marginTop: 2 }} />
        </div>

        {/* Progress bar */}
        {f.totalLessons > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: DIM }}>{done ? 'Complété' : pct > 0 ? 'En cours' : 'Non commencée'}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: done ? EMER : accent, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 3, background: BORDER, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: done ? EMER : accent, width: `${pct}%`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

/* ── Lesson row ──────────────────────────────────── */
function LessonRow({ lesson: l }: { lesson: LessonItem }) {
  return (
    <Link href={`/formations/${l.formationId}/learn`} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, transition: 'background 0.12s' }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = GHOST}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${CYAN}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle size={13} color={EMER} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: CREAM, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
          <p style={{ fontSize: 10, color: DIM, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.formationTitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <Clock size={9} color={DIM} />
          <span style={{ fontSize: 10, color: DIM }}>{timeAgo(l.completedAt)}</span>
        </div>
        <ArrowRight size={11} color={DIM} style={{ flexShrink: 0 }} />
      </div>
    </Link>
  )
}
