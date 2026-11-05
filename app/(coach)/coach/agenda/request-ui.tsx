'use client'
/* Briques de l'onglet « À valider » de l'Agenda (ex-page /coach/requests). */
import Image from 'next/image'
import {
  Check,
  X,
  Clock,
  BookOpen,
  AlertTriangle,
} from 'lucide-react'

/* ── Design tokens ──────────────────────────────────────────── */
export const BG     = 'var(--bg)'
export const CREAM  = 'var(--text)'
export const SILVER = 'var(--text-2)'
export const VIOLET = 'var(--brand)'
export const CYAN   = 'var(--brand)'
export const AMBER  = 'var(--brand)'
export const GREEN  = 'var(--gain)'
export const RED    = 'var(--error)'

/* ── Types ──────────────────────────────────────────────────── */
export type BookingStatus = 'pending_coach_approval' | 'paid_pending_schedule' | 'scheduled' | 'completed' | 'declined_by_coach'

export type StudentLite = {
  id: string
  username: string | null
  avatar_url: string | null
}

export type FormationLite = {
  id: string
  title: string
  coaching_packs: { label?: string; price: number; duration_min?: number }[] | null
}

export type Booking = {
  id: string
  created_at: string
  scheduled_at: string | null
  status: BookingStatus
  formation_id: string
  student_id: string
  pack_index: number | null
  stripe_payment_intent_id: string | null
  meeting_url?: string | null
  formation?: FormationLite | null
  student?: StudentLite | null
}

/* ── Helpers ────────────────────────────────────────────────── */
export const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}
export const fmtHour = (iso: string | null) => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
export const fmtRel = (iso: string) => {
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
export function Toast({ toast }: { toast: { kind: 'success' | 'error'; text: string } | null }) {
  if (!toast) return null
  const color = toast.kind === 'success' ? GREEN : RED
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', bottom: 28, left: '50%',
      transform: 'translateX(-50%)', zIndex: 9999,
      background: 'var(--bg)', border: `1px solid color-mix(in srgb, ${color} 33%, transparent)`, borderRadius: 12,
      padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: 'none',
      animation: 'op-toast-in 220ms cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: `color-mix(in srgb, ${color} 10%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {toast.kind === 'success' ? <Check size={13} color={color} /> : <X size={13} color={color} />}
      </div>
      <span style={{ fontSize: 13, color: CREAM, fontWeight: 500 }}>{toast.text}</span>
    </div>
  )
}

/* ── Decline confirmation modal ─────────────────────────────── */
export function DeclineModal({
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
        background: 'var(--bg)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'op-fade-in 160ms ease-out',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', border: '1px solid color-mix(in srgb, var(--brand) 10%, transparent)',
          borderRadius: 20, padding: '32px 36px', maxWidth: 420, width: '100%',
          textAlign: 'center', animation: 'op-scale-in 200ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--error) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--error) 25%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
        }}>
          <AlertTriangle size={20} color={RED} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: CREAM, marginBottom: 10, letterSpacing: '-0.3px' }}>
          Refuser cette demande&nbsp;?
        </h3>
        <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.6, marginBottom: 6 }}>
          Tu es sur le point de refuser la demande de
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 10 }}>{name}</p>
        <p style={{ fontSize: 12, color: 'color-mix(in srgb, var(--error) 70%, transparent)', marginBottom: 24 }}>
          L&apos;élève sera remboursé automatiquement. Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '12px', borderRadius: 10, border: `1px solid color-mix(in srgb, ${RED} 25%, transparent)`,
              background: loading ? `color-mix(in srgb, ${RED} 3%, transparent)` : `color-mix(in srgb, ${RED} 7%, transparent)`,
              color: RED, fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid color-mix(in srgb, ${RED} 33%, transparent)`, borderTopColor: RED, animation: 'op-spin 0.7s linear infinite' }} />
              : <X size={15} />
            }
            Oui, refuser et rembourser
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '12px', borderRadius: 10,
              border: '1px solid color-mix(in srgb, var(--brand) 10%, transparent)',
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
export function StatusPill({ status }: { status: BookingStatus }) {
  const cfg: Record<BookingStatus, { label: string; color: string; bg: string }> = {
    pending_coach_approval: { label: 'En attente',     color: AMBER,  bg: `color-mix(in srgb, ${AMBER} 7%, transparent)`  },
    paid_pending_schedule:  { label: 'À planifier',    color: CYAN,   bg: `color-mix(in srgb, ${CYAN} 7%, transparent)`   },
    scheduled:              { label: 'Planifiée',      color: GREEN,  bg: `color-mix(in srgb, ${GREEN} 7%, transparent)`  },
    completed:              { label: 'Terminée',       color: VIOLET, bg: `color-mix(in srgb, ${VIOLET} 8%, transparent)` },
    declined_by_coach:      { label: 'Refusée',        color: RED,    bg: `color-mix(in srgb, ${RED} 7%, transparent)`    },
  }
  const c = cfg[status] ?? { label: status, color: SILVER, bg: 'color-mix(in srgb, var(--brand) 6%, transparent)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid color-mix(in srgb, ${c.color} 19%, transparent)`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, boxShadow: 'none' }} />
      {c.label}
    </span>
  )
}

/* ── Booking card ───────────────────────────────────────────── */
export function BookingCard({
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
        background: 'color-mix(in srgb, var(--brand) 2%, transparent)',
        border: '1px solid color-mix(in srgb, var(--brand) 7%, transparent)',
        borderRadius: 16, padding: '22px 24px 20px 28px',
        overflow: 'hidden', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `color-mix(in srgb, ${accent} 21%, transparent)` }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'color-mix(in srgb, var(--brand) 7%, transparent)' }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: accent, opacity: 0.85, borderRadius: '16px 0 0 16px',
      }} />

      {/* Ambient glow */}

      {/* Header row */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: booking.student?.avatar_url ? 'transparent' : `${VIOLET}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: 'var(--on-brand)', flexShrink: 0,
          overflow: 'hidden', border: `1px solid color-mix(in srgb, ${accent} 19%, transparent)`, position: 'relative',
        }}>
          {booking.student?.avatar_url
            ? <Image src={booking.student.avatar_url} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />
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
            background: `color-mix(in srgb, ${VIOLET} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${VIOLET} 15%, transparent)`, color: VIOLET,
          }}>
            <BookOpen size={11} />
            {booking.formation.title}
          </span>
        )}
        {pack?.label && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
            background: `color-mix(in srgb, ${CYAN} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${CYAN} 15%, transparent)`, color: CYAN,
          }}>
            {pack.label}
          </span>
        )}
        {booking.scheduled_at && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
            background: `color-mix(in srgb, ${GREEN} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${GREEN} 15%, transparent)`, color: GREEN,
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
              padding: '9px 16px', borderRadius: 10, border: `1px solid color-mix(in srgb, ${RED} 19%, transparent)`,
              background: 'transparent', color: RED, fontSize: 13, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy && busy !== 'decline' ? 0.45 : 1, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!busy) (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${RED} 3%, transparent)` }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            {busy === 'decline'
              ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid color-mix(in srgb, ${RED} 33%, transparent)`, borderTopColor: RED, animation: 'op-spin 0.7s linear infinite' }} />
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
              background: `${GREEN}`,
              color: 'var(--on-brand)', fontSize: 13, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy && busy !== 'accept' ? 0.55 : 1,
              boxShadow: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!busy) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            {busy === 'accept'
              ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid color-mix(in srgb, var(--overlay) 40%, transparent)', borderTopColor: '#fff', animation: 'op-spin 0.7s linear infinite' }} />
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
export function EmptyState({ icon: Ico, color, title, sub }: {
  icon: React.ElementType
  color: string
  title: string
  sub: string
}) {
  const c = { color, title, sub }
  return (
    <div style={{
      textAlign: 'center', padding: '80px 24px',
      background: 'color-mix(in srgb, var(--brand) 2%, transparent)',
      border: '1px dashed color-mix(in srgb, var(--brand) 8%, transparent)', borderRadius: 18,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: `color-mix(in srgb, ${c.color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${c.color} 15%, transparent)`,
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

