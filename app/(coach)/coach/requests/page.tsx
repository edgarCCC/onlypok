'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import {
  Inbox,
  CalendarCheck,
  History,
  XCircle,
  Check,
  X,
  Clock,
  BookOpen,
  AlertTriangle,
} from 'lucide-react'

/* ── Design tokens ──────────────────────────────────────────── */
const BG     = '#07090e'
const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'
const GREEN  = '#10b981'
const RED    = '#ef4444'

/* ── Types ──────────────────────────────────────────────────── */
type BookingStatus = 'pending_coach_approval' | 'paid_pending_schedule' | 'scheduled' | 'completed' | 'declined_by_coach'
type TabKey = 'pending' | 'accepted' | 'completed' | 'rejected'

type StudentLite = {
  id: string
  username: string | null
  avatar_url: string | null
}

type FormationLite = {
  id: string
  title: string
  coaching_packs: { label?: string; price: number; duration_min?: number }[] | null
}

type Booking = {
  id: string
  created_at: string
  scheduled_at: string | null
  status: BookingStatus
  formation_id: string
  student_id: string
  pack_index: number | null
  stripe_payment_intent_id: string | null
  formation?: FormationLite | null
  student?: StudentLite | null
}

const STATUS_TO_TAB: Record<BookingStatus, TabKey> = {
  pending_coach_approval: 'pending',
  paid_pending_schedule:  'pending',
  scheduled:              'accepted',
  completed:              'completed',
  declined_by_coach:      'rejected',
}

function getTab(b: Booking): TabKey {
  if (b.status === 'scheduled' && b.scheduled_at && new Date(b.scheduled_at) < new Date()) {
    return 'completed'
  }
  return STATUS_TO_TAB[b.status] ?? 'pending'
}

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string; glow: string }[] = [
  { key: 'pending',   label: 'Nouvelles demandes', icon: Inbox,         color: AMBER,  glow: 'rgba(245,158,11,0.18)' },
  { key: 'accepted',  label: 'Confirmées',         icon: CalendarCheck, color: GREEN,  glow: 'rgba(16,185,129,0.18)' },
  { key: 'completed', label: 'Passées',            icon: History,       color: VIOLET, glow: 'rgba(124,58,237,0.18)' },
  { key: 'rejected',  label: 'Refusées',           icon: XCircle,       color: RED,    glow: 'rgba(239,68,68,0.16)' },
]

/* ── Helpers ────────────────────────────────────────────────── */
const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}
const fmtHour = (iso: string | null) => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
const fmtRel = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  if (j < 7)  return `il y a ${j} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/* ── Toast ──────────────────────────────────────────────────── */
function Toast({ toast }: { toast: { kind: 'success' | 'error'; text: string } | null }) {
  if (!toast) return null
  const color = toast.kind === 'success' ? GREEN : RED
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', bottom: 28, left: '50%',
      transform: 'translateX(-50%)', zIndex: 9999,
      background: '#0c0f17', border: `1px solid ${color}55`, borderRadius: 12,
      padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: `0 10px 40px ${color}25, 0 2px 12px rgba(0,0,0,0.6)`,
      animation: 'op-toast-in 220ms cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: `${color}1a`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {toast.kind === 'success' ? <Check size={13} color={color} /> : <X size={13} color={color} />}
      </div>
      <span style={{ fontSize: 13, color: CREAM, fontWeight: 500 }}>{toast.text}</span>
    </div>
  )
}

/* ── Decline confirmation modal ─────────────────────────────── */
function DeclineModal({
  booking, onCancel, onConfirm, loading,
}: {
  booking: Booking
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
}) {
  const name = booking.student?.username ?? 'cet élève'
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(7,9,14,0.88)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'op-fade-in 160ms ease-out',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#07070f', border: '1px solid rgba(232,228,220,0.1)',
          borderRadius: 20, padding: '32px 36px', maxWidth: 420, width: '100%',
          textAlign: 'center', animation: 'op-scale-in 200ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
        }}>
          <AlertTriangle size={20} color={RED} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: CREAM, marginBottom: 10, letterSpacing: '-0.3px' }}>
          Refuser cette demande&nbsp;?
        </h3>
        <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.6, marginBottom: 6 }}>
          Vous êtes sur le point de refuser la demande de
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 10 }}>{name}</p>
        <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.7)', marginBottom: 24 }}>
          L&apos;élève sera remboursé automatiquement. Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '12px', borderRadius: 10, border: `1px solid ${RED}40`,
              background: loading ? `${RED}08` : `${RED}12`,
              color: RED, fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${RED}55`, borderTopColor: RED, animation: 'op-spin 0.7s linear infinite' }} />
              : <X size={15} />
            }
            Oui, refuser et rembourser
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '12px', borderRadius: 10,
              border: '1px solid rgba(232,228,220,0.1)',
              background: 'transparent', color: SILVER, fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Status pill ────────────────────────────────────────────── */
function StatusPill({ status }: { status: BookingStatus }) {
  const cfg: Record<BookingStatus, { label: string; color: string; bg: string }> = {
    pending_coach_approval: { label: 'En attente',     color: AMBER,  bg: `${AMBER}12`  },
    paid_pending_schedule:  { label: 'À planifier',    color: CYAN,   bg: `${CYAN}12`   },
    scheduled:              { label: 'Planifiée',      color: GREEN,  bg: `${GREEN}12`  },
    completed:              { label: 'Terminée',       color: VIOLET, bg: `${VIOLET}14` },
    declined_by_coach:      { label: 'Refusée',        color: RED,    bg: `${RED}12`    },
  }
  const c = cfg[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid ${c.color}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
      {c.label}
    </span>
  )
}

/* ── Booking card ───────────────────────────────────────────── */
function BookingCard({
  booking, onAccept, onDecline, busy,
}: {
  booking: Booking
  onAccept: (id: string) => void
  onDecline: (b: Booking) => void
  busy: 'accept' | 'decline' | null
}) {
  const isPending = booking.status === 'pending_coach_approval'
  const accent = isPending ? AMBER : booking.status === 'declined_by_coach' ? RED : booking.status === 'completed' ? VIOLET : GREEN

  const username = booking.student?.username ?? 'Élève'
  const initial  = username[0]?.toUpperCase() ?? 'E'

  const pack = booking.formation?.coaching_packs && booking.pack_index != null
    ? booking.formation.coaching_packs[booking.pack_index]
    : null

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(232,228,220,0.025)',
        border: '1px solid rgba(232,228,220,0.07)',
        borderRadius: 16, padding: '22px 24px 20px 28px',
        overflow: 'hidden', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}35` }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.07)' }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: accent, opacity: 0.85, borderRadius: '16px 0 0 16px',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 100% 0%, ${accent}0d 0%, transparent 55%)`,
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: booking.student?.avatar_url ? 'transparent' : `linear-gradient(135deg,${VIOLET},${CYAN})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          overflow: 'hidden', border: `1px solid ${accent}30`,
        }}>
          {booking.student?.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={booking.student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: CREAM, letterSpacing: '-0.2px' }}>
              {username}
            </span>
            <StatusPill status={booking.status} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: SILVER, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Clock size={11} />
              Reçue {fmtRel(booking.created_at)}
            </span>
            {pack && (
              <span style={{ color: CREAM, fontWeight: 600 }}>
                {pack.price}€
                {pack.duration_min ? <span style={{ color: SILVER, fontWeight: 400 }}> · {pack.duration_min} min</span> : null}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Formation + pack info */}
      <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: booking.scheduled_at || isPending ? 14 : 0 }}>
        {booking.formation && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
            background: `${VIOLET}12`, border: `1px solid ${VIOLET}25`, color: VIOLET,
          }}>
            <BookOpen size={11} />
            {booking.formation.title}
          </span>
        )}
        {pack?.label && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
            background: `${CYAN}12`, border: `1px solid ${CYAN}25`, color: CYAN,
          }}>
            {pack.label}
          </span>
        )}
        {booking.scheduled_at && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
            background: `${GREEN}12`, border: `1px solid ${GREEN}25`, color: GREEN,
          }}>
            <Clock size={11} />
            {fmtDate(booking.scheduled_at)} · {fmtHour(booking.scheduled_at)}
          </span>
        )}
      </div>

      {/* Action buttons — pending coach approval only */}
      {isPending && booking.status === 'pending_coach_approval' && (
        <div style={{ position: 'relative', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => onDecline(booking)}
            disabled={busy !== null}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 10, border: `1px solid ${RED}30`,
              background: 'transparent', color: RED, fontSize: 13, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy && busy !== 'decline' ? 0.45 : 1, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!busy) (e.currentTarget as HTMLButtonElement).style.background = `${RED}08` }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            {busy === 'decline'
              ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${RED}55`, borderTopColor: RED, animation: 'op-spin 0.7s linear infinite' }} />
              : <X size={14} />
            }
            Refuser
          </button>

          <button
            onClick={() => onAccept(booking.id)}
            disabled={busy !== null}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg,${GREEN},#059669)`,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy && busy !== 'accept' ? 0.55 : 1,
              boxShadow: `0 4px 16px ${GREEN}30`, transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!busy) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 22px ${GREEN}50`
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${GREEN}30`
            }}
          >
            {busy === 'accept'
              ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'op-spin 0.7s linear infinite' }} />
              : <Check size={14} />
            }
            Accepter
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Empty state ────────────────────────────────────────────── */
function EmptyState({ tab }: { tab: TabKey }) {
  const cfg: Record<TabKey, { icon: React.ElementType; color: string; title: string; sub: string }> = {
    pending:   { icon: Inbox,         color: AMBER,  title: 'Aucune nouvelle demande',  sub: 'Les demandes de coaching en attente apparaîtront ici.' },
    accepted:  { icon: CalendarCheck, color: GREEN,  title: 'Aucune session confirmée', sub: "Les sessions acceptées s'afficheront ici." },
    completed: { icon: History,       color: VIOLET, title: 'Aucune session passée',    sub: 'Votre historique de coaching apparaîtra ici.' },
    rejected:  { icon: XCircle,       color: RED,    title: 'Aucune demande refusée',   sub: 'Les demandes refusées seront archivées ici.' },
  }
  const c   = cfg[tab]
  const Ico = c.icon
  return (
    <div style={{
      textAlign: 'center', padding: '80px 24px',
      background: 'rgba(232,228,220,0.02)',
      border: '1px dashed rgba(232,228,220,0.08)', borderRadius: 18,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: `${c.color}10`, border: `1px solid ${c.color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
      }}>
        <Ico size={22} color={c.color} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: CREAM, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
        {c.title}
      </h3>
      <p style={{ fontSize: 13, color: SILVER, margin: 0, maxWidth: 360, marginInline: 'auto', lineHeight: 1.5 }}>
        {c.sub}
      </p>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────── */
export default function CoachRequestsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const [loading,       setLoading]       = useState(true)
  const [bookings,      setBookings]      = useState<Booking[]>([])
  const [tab,           setTab]           = useState<TabKey>('pending')
  const [busyId,        setBusyId]        = useState<string | null>(null)
  const [busyAction,    setBusyAction]    = useState<'accept' | 'decline' | null>(null)
  const [declineTarget, setDeclineTarget] = useState<Booking | null>(null)
  const [toast,         setToast]         = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const activeTab = TABS.find(t => t.key === tab) ?? TABS[0]

  useEffect(() => {
    if (!user) return
    let alive = true

    const load = async () => {
      const { data: bRows, error } = await supabase
        .from('bookings')
        .select('id, created_at, scheduled_at, status, formation_id, student_id, pack_index, stripe_payment_intent_id')
        .eq('coach_id', user.id)
        .in('status', ['pending_coach_approval', 'scheduled', 'completed', 'declined_by_coach'])
        .order('created_at', { ascending: false })

      if (!alive) return

      if (error) {
        console.error('[coach/requests] bookings query error:', error.message, error.code)
        setBookings([])
        setLoading(false)
        return
      }

      const rows = bRows ?? []

      // Separate queries for formations and students
      const formationIds = [...new Set(rows.map((r: any) => r.formation_id).filter(Boolean))]
      const studentIds   = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))]

      const [{ data: formations }, { data: students }] = await Promise.all([
        formationIds.length
          ? supabase.from('formations').select('id, title, coaching_packs').in('id', formationIds)
          : Promise.resolve({ data: [] as any[] }),
        studentIds.length
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', studentIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const fMap = new Map((formations ?? []).map((f: any) => [f.id, f]))
      const sMap = new Map((students   ?? []).map((s: any) => [s.id, s]))

      if (!alive) return
      setBookings(rows.map(r => ({
        ...r,
        formation: fMap.get(r.formation_id) ?? null,
        student:   sMap.get(r.student_id)   ?? null,
      })) as unknown as Booking[])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [user, supabase])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { pending: 0, accepted: 0, completed: 0, rejected: 0 }
    for (const b of bookings) {
      c[getTab(b)]++
    }
    return c
  }, [bookings])

  const visible = bookings.filter(b => getTab(b) === tab)

  const handleAccept = async (id: string) => {
    setBusyId(id)
    setBusyAction('accept')
    try {
      const res = await fetch('/api/bookings/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Échec')
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'scheduled' } : b))
      setToast({ kind: 'success', text: 'Coaching confirmé. Le paiement a été capturé.' })
    } catch (e) {
      setToast({ kind: 'error', text: (e as Error).message })
    } finally {
      setBusyId(null)
      setBusyAction(null)
    }
  }

  const handleDecline = async () => {
    if (!declineTarget) return
    const id = declineTarget.id
    setBusyId(id)
    setBusyAction('decline')
    try {
      const res = await fetch('/api/bookings/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Échec')
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'declined_by_coach' } : b))
      setToast({ kind: 'success', text: 'Demande refusée. L\'élève sera remboursé.' })
      setDeclineTarget(null)
    } catch (e) {
      setToast({ kind: 'error', text: (e as Error).message })
    } finally {
      setBusyId(null)
      setBusyAction(null)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <FourAcesLoader fullPage={false} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes op-spin    { to { transform: rotate(360deg); } }
        @keyframes op-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        @keyframes op-fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes op-scale-in {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes op-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 35% at 50% 0%, ${activeTab.glow} 0%, transparent 70%)`,
        transition: 'background 0.45s ease',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '40px 28px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Espace coach
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: 44, fontWeight: 700, color: CREAM, letterSpacing: '-1px',
              lineHeight: 1.05, fontFamily: 'var(--font-syne,sans-serif)', margin: 0,
            }}>
              Demandes de coaching
            </h1>
            <span style={{ fontSize: 12, color: SILVER }}>
              {bookings.length} réservation{bookings.length !== 1 ? 's' : ''} au total
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Filtrer les demandes"
          style={{
            display: 'flex', gap: 6,
            background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.08)',
            borderRadius: 14, padding: 5, marginBottom: 22, overflowX: 'auto',
          }}
        >
          {TABS.map(t => {
            const active = tab === t.key
            const Ico    = t.icon
            const n      = counts[t.key]
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '10px 14px', minHeight: 44, border: 'none', borderRadius: 10,
                  background: active ? `${t.color}22` : 'transparent',
                  color:      active ? t.color        : SILVER,
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap',
                  boxShadow: active ? `0 2px 14px ${t.color}30` : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = SILVER }}
              >
                <Ico size={13} strokeWidth={active ? 2.4 : 1.8} />
                <span>{t.label}</span>
                {n > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, padding: '0 6px',
                    borderRadius: 99, background: active ? t.color : 'rgba(232,228,220,0.08)',
                    color: active ? '#fff' : CREAM,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: active && t.key === 'pending' ? `0 0 0 2px ${BG}, 0 0 14px ${t.color}` : 'none',
                  }}>
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {visible.length === 0
          ? <EmptyState tab={tab} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visible.map((b, i) => (
                <div key={b.id} style={{ animation: `op-card-in 240ms cubic-bezier(0.2,0.8,0.2,1) both`, animationDelay: `${Math.min(i * 35, 240)}ms` }}>
                  <BookingCard
                    booking={b}
                    onAccept={handleAccept}
                    onDecline={target => setDeclineTarget(target)}
                    busy={busyId === b.id ? busyAction : null}
                  />
                </div>
              ))}
            </div>
          )
        }
      </div>

      {declineTarget && (
        <DeclineModal
          booking={declineTarget}
          loading={busyId === declineTarget.id && busyAction === 'decline'}
          onCancel={() => { if (!busyId) setDeclineTarget(null) }}
          onConfirm={handleDecline}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
