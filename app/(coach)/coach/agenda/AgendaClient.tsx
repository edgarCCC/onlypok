'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Inbox, CalendarCheck, History, Clock } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import {
  BG, CREAM, SILVER, AMBER, GREEN, VIOLET, CYAN, RED,
  BookingCard, DeclineModal, Toast, EmptyState, type Booking,
} from './request-ui'
import UpcomingPanel from './UpcomingPanel'
import HistoryPanel from './HistoryPanel'
import AvailabilityPanel from './AvailabilityPanel'
import { useAgendaData } from './useAgendaData'
import './agenda.css'

export type AgendaTab = 'validate' | 'upcoming' | 'history' | 'availability'

const TABS: { key: AgendaTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'validate',     label: 'À valider',      icon: Inbox,         color: AMBER  },
  { key: 'upcoming',     label: 'À venir',        icon: CalendarCheck, color: GREEN  },
  { key: 'history',      label: 'Historique',     icon: History,       color: VIOLET },
  { key: 'availability', label: 'Disponibilités', icon: Clock,         color: CYAN   },
]

export function parseAgendaTab(v: string | null): AgendaTab | null {
  return TABS.some(t => t.key === v) ? (v as AgendaTab) : null
}

type Toasty = { kind: 'success' | 'error'; text: string } | null

/* Agenda coach : fusion de Demandes, Sessions et Calendrier.
   L'onglet actif vit dans l'URL (?tab=) pour les liens d'emails et de notifs. */
export default function AgendaClient() {
  const { user } = useUser()
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const { loading, error, bookings, setBookings, notes, setNotes, notesEnabled } = useAgendaData(user?.id)

  const pending = bookings
    .filter(b => b.status === 'pending_coach_approval')
    .sort((a, b) => new Date(a.scheduled_at ?? a.created_at).getTime() - new Date(b.scheduled_at ?? b.created_at).getTime())
  const upcomingCount = bookings.filter(b => b.status === 'scheduled' && (!b.scheduled_at || new Date(b.scheduled_at) >= new Date())).length

  // Sans onglet explicite : « À valider » s'il y a des demandes, sinon « À venir »
  const tab: AgendaTab = parseAgendaTab(params.get('tab')) ?? (loading || pending.length > 0 ? 'validate' : 'upcoming')

  const [busy, setBusy]                   = useState<{ id: string; action: 'accept' | 'decline' } | null>(null)
  const [declineTarget, setDeclineTarget] = useState<Booking | null>(null)
  const [toast, setToast]                 = useState<Toasty>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const selectTab = (key: AgendaTab) => {
    const next = new URLSearchParams(params.toString())
    next.set('tab', key)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  const callBookingApi = async (action: 'accept' | 'decline', id: string) => {
    const res  = await fetch(`/api/bookings/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: id }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? 'Échec, réessayez.')
    return json as { meeting_url?: string }
  }

  const handleAccept = async (id: string) => {
    setBusy({ id, action: 'accept' })
    try {
      const { meeting_url } = await callBookingApi('accept', id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'scheduled', meeting_url: meeting_url ?? b.meeting_url } : b))
      setToast({ kind: 'success', text: 'Séance confirmée, elle est dans « À venir ».' })
    } catch (e) {
      setToast({ kind: 'error', text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const handleDecline = async () => {
    if (!declineTarget) return
    const id = declineTarget.id
    setBusy({ id, action: 'decline' })
    try {
      await callBookingApi('decline', id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'declined_by_coach' } : b))
      setToast({ kind: 'success', text: 'Demande refusée. L’élève est remboursé.' })
      setDeclineTarget(null)
    } catch (e) {
      setToast({ kind: 'error', text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const counts: Record<AgendaTab, number | null> = {
    validate: pending.length, upcoming: upcomingCount, history: null, availability: null,
  }

  return (
    <div className="agenda-page" style={{ background: BG, color: CREAM }}>
      <div className="agenda-container">
        <header style={{ marginBottom: 24 }}>
          <h1 className="agenda-title">Agenda</h1>
          <p style={{ fontSize: 13, color: SILVER, margin: '6px 0 0' }}>
            {pending.length > 0
              ? `${pending.length} demande${pending.length > 1 ? 's' : ''} attend${pending.length > 1 ? 'ent' : ''} votre réponse.`
              : 'Vos séances, demandes et disponibilités au même endroit.'}
          </p>
        </header>

        <div role="tablist" aria-label="Sections de l'agenda" className="agenda-tabs">
          {TABS.map(t => {
            const active = tab === t.key
            const Ico = t.icon
            const n = counts[t.key]
            return (
              <button key={t.key} role="tab" aria-selected={active} onClick={() => selectTab(t.key)}
                className="agenda-tab" data-active={active || undefined} style={{ ['--tab-color' as string]: t.color }}>
                <Ico size={14} strokeWidth={active ? 2.3 : 1.8} />
                <span>{t.label}</span>
                {n != null && n > 0 && <span className="agenda-tab-count" data-urgent={t.key === 'validate' || undefined}>{n}</span>}
              </button>
            )
          })}
        </div>

        <div role="tabpanel" style={{ marginTop: 22 }}>
          {error && <p style={{ color: RED, fontSize: 13 }}>{error}</p>}
          {!error && loading && tab !== 'availability' && (
            <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FourAcesLoader fullPage={false} />
            </div>
          )}

          {!loading && !error && tab === 'validate' && (
            pending.length === 0
              ? <EmptyState icon={Inbox} color={AMBER} title="Aucune demande en attente" sub="Quand un élève propose un créneau, vous l'acceptez ou le refusez ici." />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {pending.map(b => (
                    <BookingCard key={b.id} booking={b} onAccept={handleAccept} onDecline={setDeclineTarget}
                      busy={busy?.id === b.id ? busy.action : null} />
                  ))}
                </div>
          )}

          {!loading && !error && tab === 'upcoming' && <UpcomingPanel bookings={bookings} />}

          {!loading && !error && tab === 'history' && user && (
            <HistoryPanel bookings={bookings} notes={notes} notesEnabled={notesEnabled} coachId={user.id}
              onNotesSaved={(id, n) => setNotes(prev => ({ ...prev, [id]: n }))} />
          )}

          {tab === 'availability' && <AvailabilityPanel />}
        </div>
      </div>

      {declineTarget && (
        <DeclineModal
          booking={declineTarget}
          loading={busy?.id === declineTarget.id && busy.action === 'decline'}
          onCancel={() => { if (!busy) setDeclineTarget(null) }}
          onConfirm={handleDecline}
        />
      )}
      <Toast toast={toast} />
    </div>
  )
}
