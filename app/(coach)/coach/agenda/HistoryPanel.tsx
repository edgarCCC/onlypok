'use client'
import { useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import { CREAM, SILVER, VIOLET, CYAN, RED, EmptyState, StatusPill, type Booking } from './request-ui'
import SessionNotesEditor, { type SessionNotes } from './SessionNotesEditor'
import { StudentAvatar } from './UpcomingPanel'

type Filter = 'all' | 'done' | 'declined'

const isPast = (b: Booking) =>
  b.status === 'completed' || (b.status === 'scheduled' && !!b.scheduled_at && new Date(b.scheduled_at) < new Date())

const fmt = (iso: string | null) => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'Sans date'

/* Séances passées (avec notes de séance) et demandes refusées. */
export default function HistoryPanel({ bookings, notes, notesEnabled, coachId, onNotesSaved }: {
  bookings: Booking[]
  notes: Record<string, SessionNotes>
  notesEnabled: boolean
  coachId: string
  onNotesSaved: (bookingId: string, n: SessionNotes) => void
}) {
  const [filter, setFilter]     = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const done     = bookings.filter(isPast)
  const declined = bookings.filter(b => b.status === 'declined_by_coach')
  const list = (filter === 'done' ? done : filter === 'declined' ? declined : [...done, ...declined])
    .sort((a, b) => new Date(b.scheduled_at ?? b.created_at).getTime() - new Date(a.scheduled_at ?? a.created_at).getTime())

  const chips: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'Tout', n: done.length + declined.length },
    { key: 'done', label: 'Séances faites', n: done.length },
    { key: 'declined', label: 'Refusées', n: declined.length },
  ]

  return (
    <div>
      <div role="group" aria-label="Filtrer l'historique" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {chips.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)} aria-pressed={filter === c.key} className="agenda-chip">
            {c.label} <span style={{ opacity: 0.6 }}>{c.n}</span>
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <EmptyState icon={History} color={VIOLET} title="Rien dans l'historique" sub="Vos séances terminées et leurs notes apparaîtront ici." />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(b => {
          const canNote = notesEnabled && b.status !== 'declined_by_coach'
          const open    = expanded === b.id
          const n       = notes[b.id]
          return (
            <div key={b.id} style={{ background: 'rgba(232,228,220,0.025)', border: `1px solid ${open ? 'rgba(124,58,237,0.3)' : 'rgba(232,228,220,0.07)'}`, borderRadius: 14, overflow: 'hidden' }}>
              <button
                onClick={() => canNote && setExpanded(open ? null : b.id)}
                aria-expanded={canNote ? open : undefined}
                disabled={!canNote}
                className="agenda-history-head"
              >
                <StudentAvatar student={b.student} size={36} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{b.student?.username ?? 'Élève'}</span>
                    <StatusPill status={b.status === 'scheduled' ? 'completed' : b.status} />
                  </div>
                  <p style={{ fontSize: 12, color: SILVER, margin: '3px 0 0' }}>
                    {fmt(b.scheduled_at)} · {b.formation?.title ?? 'Coaching'}
                  </p>
                </div>
                {canNote && (
                  n?.notes || n?.progress_score != null
                    ? <span style={{ fontSize: 11, fontWeight: 700, color: CYAN, whiteSpace: 'nowrap' }}>{n.progress_score != null ? `${n.progress_score}/10` : 'Notes'}</span>
                    : <span className="agenda-btn-label" style={{ fontSize: 11, color: SILVER, whiteSpace: 'nowrap' }}>Ajouter des notes</span>
                )}
                {canNote
                  ? <ChevronDown size={15} color={SILVER} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                  : b.status === 'declined_by_coach' && <span style={{ fontSize: 11, color: RED, opacity: 0.7 }}>Remboursée</span>}
              </button>
              {open && (
                <SessionNotesEditor
                  bookingId={b.id}
                  coachId={coachId}
                  studentId={b.student_id}
                  initial={n ?? { id: null, notes: '', tags: [], progress_score: null }}
                  onSaved={saved => onNotesSaved(b.id, saved)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
