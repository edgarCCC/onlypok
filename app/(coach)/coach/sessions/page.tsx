'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import { ChevronDown, Tag, FileText, CalendarDays, Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

const BG     = '#07090e'
const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.2)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'
const EMER   = '#10b981'
const RED    = '#ef4444'

const TAG_LIBRARY = [
  '3-bet preflop', '4-bet bluff', 'C-bet flop', 'Turn aggression', 'River value',
  'Bankroll management', 'Mental game', 'Tilt control', 'Hand reading', 'Blockers',
  'ICM', 'Bubble play', 'Final table', 'Heads-up dynamics', 'GTO basics',
  'Exploitative play', 'Range construction', 'Bet sizing', 'Solver work',
]

type Booking = {
  id: string
  created_at: string
  scheduled_at: string | null
  status: 'paid_pending_schedule' | 'scheduled' | 'completed'
  pack_index: number | null
  formation: { id: string; title: string; price: number; variant: string | null } | null
  student: { id: string; username: string | null; avatar_url: string | null } | null
  notes: string
  tags: string[]
  progress_score: number | null
  session_notes_id: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${VIOLET}30`, border: `1.5px solid ${VIOLET}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color: VIOLET }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ width: `${value * 10}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${VIOLET},${CYAN})`, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  if (status === 'scheduled') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${EMER}12`, color: EMER, border: `1px solid ${EMER}28` }}>
      <CheckCircle2 size={9} /> Planifiée
    </span>
  )
  if (status === 'completed') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}28` }}>
      <CheckCircle2 size={9} /> Terminée
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${AMBER}12`, color: AMBER, border: `1px solid ${AMBER}28` }}>
      <AlertCircle size={9} /> En attente
    </span>
  )
}

export default function CoachSessionsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const [loading, setLoading]     = useState(true)
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [saving, setSaving]       = useState<string | null>(null)
  const [drafts, setDrafts]       = useState<Record<string, { notes: string; tags: string[]; progress_score: number }>>({})

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data: rows } = await supabase
        .from('bookings')
        .select(`
          id, created_at, scheduled_at, status, pack_index,
          formation:formations(id, title, price, variant),
          student:profiles!student_id(id, username, avatar_url)
        `)
        .eq('coach_id', user.id)
        .in('status', ['paid_pending_schedule', 'scheduled', 'completed'])
        .order('created_at', { ascending: false })

      const bookingIds = (rows ?? []).map((r: any) => r.id)
      let notesMap = new Map<string, { id: string; notes: string; tags: string[]; progress_score: number | null }>()

      if (bookingIds.length > 0) {
        const { data: notes } = await supabase
          .from('coaching_sessions')
          .select('id, booking_id, notes, tags, progress_score')
          .in('booking_id', bookingIds)
        for (const n of (notes ?? [])) notesMap.set(n.booking_id, n)
      }

      if (!cancelled) {
        const merged: Booking[] = (rows ?? []).map((r: any) => {
          const n = notesMap.get(r.id)
          return {
            id: r.id,
            created_at: r.created_at,
            scheduled_at: r.scheduled_at ?? null,
            status: r.status,
            pack_index: r.pack_index ?? null,
            formation: Array.isArray(r.formation) ? r.formation[0] ?? null : r.formation ?? null,
            student: Array.isArray(r.student) ? r.student[0] ?? null : r.student ?? null,
            notes: n?.notes ?? '',
            tags: n?.tags ?? [],
            progress_score: n?.progress_score ?? null,
            session_notes_id: n?.id ?? null,
          }
        })
        setBookings(merged)

        const d: typeof drafts = {}
        for (const b of merged) {
          d[b.id] = { notes: b.notes, tags: b.tags, progress_score: b.progress_score ?? 5 }
        }
        setDrafts(d)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, supabase])

  const getDraft = (id: string) => drafts[id] ?? { notes: '', tags: [], progress_score: 5 }

  const setDraftField = (id: string, field: string, value: unknown) =>
    setDrafts(prev => ({ ...prev, [id]: { ...getDraft(id), [field]: value } }))

  const toggleTag = (id: string, tag: string) => {
    const cur = getDraft(id).tags
    setDraftField(id, 'tags', cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag])
  }

  const saveNotes = async (b: Booking) => {
    if (!user) return
    setSaving(b.id)
    const draft = getDraft(b.id)

    if (b.session_notes_id) {
      await supabase.from('coaching_sessions').update({
        notes: draft.notes, tags: draft.tags, progress_score: draft.progress_score,
      }).eq('id', b.session_notes_id)
    } else {
      const { data } = await supabase.from('coaching_sessions').insert({
        booking_id: b.id,
        coach_id: user.id,
        student_id: b.student?.id,
        notes: draft.notes,
        tags: draft.tags,
        progress_score: draft.progress_score,
      }).select('id').single()

      if (data) {
        setBookings(prev => prev.map(x => x.id === b.id ? { ...x, session_notes_id: data.id } : x))
      }
    }

    setBookings(prev => prev.map(x => x.id === b.id
      ? { ...x, notes: draft.notes, tags: draft.tags, progress_score: draft.progress_score }
      : x))
    setSaving(null)
  }

  const pending   = bookings.filter(b => b.status === 'paid_pending_schedule')
  const scheduled = bookings.filter(b => b.status === 'scheduled')
  const completed = bookings.filter(b => b.status === 'completed')

  const avgProgress = (() => {
    const withScore = bookings.filter(b => b.progress_score != null)
    if (!withScore.length) return '—'
    return (withScore.reduce((s, b) => s + (b.progress_score ?? 0), 0) / withScore.length).toFixed(1)
  })()

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  const renderSection = (title: string, items: Booking[], color: string) => {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{title}</span>
          <div style={{ flex: 1, height: 1, background: `${color}22` }} />
          <span style={{ fontSize: 11, color: DIM }}>{items.length} session{items.length > 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(b => {
            const isOpen = expanded === b.id
            const draft  = getDraft(b.id)
            const studentName = b.student?.username ?? 'Élève inconnu'

            return (
              <div key={b.id} style={{ background: 'rgba(232,228,220,0.025)', border: `1px solid ${isOpen ? 'rgba(124,58,237,0.25)' : 'rgba(232,228,220,0.06)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                <button
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  className="csess-head-row"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Avatar src={b.student?.avatar_url} name={studentName} size={40} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{studentName}</span>
                      <StatusBadge status={b.status} />
                      {b.formation?.variant && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${VIOLET}18`, color: VIOLET, border: `1px solid ${VIOLET}28` }}>
                          {b.formation.variant}
                        </span>
                      )}
                      {b.pack_index != null && (
                        <span style={{ fontSize: 10, color: DIM }}>Session #{b.pack_index + 1}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: SILVER, flexWrap: 'wrap' }}>
                      <span>{b.formation?.title ?? 'Coaching'}</span>
                      {b.scheduled_at ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: EMER }}>
                          <CalendarDays size={10} /> {fmtDateTime(b.scheduled_at)}
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: AMBER }}>
                          <Clock size={10} /> En attente de planification
                        </span>
                      )}
                      {b.formation?.price != null && b.formation.price > 0 && (
                        <span style={{ color: EMER }}>{b.formation.price}€</span>
                      )}
                    </div>
                  </div>

                  {b.progress_score != null && (
                    <div style={{ textAlign: 'center', minWidth: 44 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: CYAN, letterSpacing: '-0.5px' }}>{b.progress_score}</div>
                      <div style={{ fontSize: 9, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em' }}>/ 10</div>
                    </div>
                  )}

                  <ChevronDown size={15} color={SILVER} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                </button>

                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                    <div style={{ marginTop: 18 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <FileText size={11} /> Notes de session
                      </label>
                      <textarea
                        value={draft.notes}
                        onChange={e => setDraftField(b.id, 'notes', e.target.value)}
                        placeholder="Ce qu'on a travaillé, points d'amélioration, main remarquable…"
                        rows={4}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: CREAM, fontSize: 13, lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TrendingUp size={11} /> Progression de l'élève
                        </label>
                        <span style={{ fontSize: 20, fontWeight: 800, color: CYAN }}>{draft.progress_score}<span style={{ fontSize: 11, color: SILVER }}> / 10</span></span>
                      </div>
                      <input
                        type="range" min={1} max={10} step={1}
                        value={draft.progress_score}
                        onChange={e => setDraftField(b.id, 'progress_score', Number(e.target.value))}
                        style={{ width: '100%', accentColor: CYAN, cursor: 'pointer' }}
                      />
                      <ProgressBar value={draft.progress_score} />
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Tag size={11} /> Concepts travaillés
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {TAG_LIBRARY.map(tag => {
                          const active = draft.tags.includes(tag)
                          return (
                            <button key={tag} onClick={() => toggleTag(b.id, tag)}
                              style={{ padding: '5px 11px', borderRadius: 99, fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${active ? AMBER + '60' : 'rgba(255,255,255,0.1)'}`, background: active ? `${AMBER}18` : 'transparent', color: active ? AMBER : SILVER }}>
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => saveNotes(b)}
                        disabled={saving === b.id}
                        style={{ padding: '9px 22px', borderRadius: 10, background: `linear-gradient(135deg,${VIOLET},${CYAN})`, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving === b.id ? 'not-allowed' : 'pointer', opacity: saving === b.id ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                        {saving === b.id ? 'Enregistrement…' : 'Sauvegarder les notes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="csess-page" style={{ minHeight: '100vh', background: BG, color: CREAM, padding: '40px' }}>
      <style>{`
        @media (max-width: 700px) {
          .csess-page { padding: 24px 16px !important; }
          .csess-kpis { grid-template-columns: 1fr 1fr !important; }
          .csess-head-row { flex-wrap: wrap !important; }
        }
      `}</style>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Espace coach</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--font-syne, sans-serif)' }}>Sessions</h1>
          <p style={{ fontSize: 13, color: SILVER, marginTop: 8 }}>Toutes les sessions achetées par vos élèves — planifiées ou en attente.</p>
        </div>

        {/* KPIs */}
        <div className="csess-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
          {[
            { label: 'Total',          value: bookings.length,  icon: CalendarDays, color: VIOLET },
            { label: 'Planifiées',     value: scheduled.length, icon: CheckCircle2, color: EMER   },
            { label: 'En attente',     value: pending.length,   icon: AlertCircle,  color: AMBER  },
            { label: 'Prog. moyenne',  value: avgProgress,      icon: TrendingUp,   color: CYAN   },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={13} color={color} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-1px' }}>{value}</div>
            </div>
          ))}
        </div>

        {bookings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <CalendarDays size={40} color={SILVER} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ color: SILVER, fontSize: 14, marginBottom: 6 }}>Aucune session réservée pour l'instant</p>
            <p style={{ color: DIM, fontSize: 12 }}>Les élèves qui réservent un coaching apparaîtront ici automatiquement.</p>
          </div>
        )}

        {renderSection('En attente de planification', pending, AMBER)}
        {renderSection('Planifiées', scheduled, EMER)}
        {renderSection('Terminées', completed, CYAN)}
      </div>
    </div>
  )
}
