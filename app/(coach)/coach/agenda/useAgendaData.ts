'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Booking, FormationLite, StudentLite } from './request-ui'
import type { SessionNotes } from './SessionNotesEditor'

type Row = Omit<Booking, 'formation' | 'student'>

/* Toutes les réservations du coach + élèves, formations et notes de séance.
   Requêtes séparées : bookings n'a pas de FK vers profiles (jointure PGRST200). */
export function useAgendaData(coachId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [notes, setNotes]       = useState<Record<string, SessionNotes>>({})
  /* Échec de lecture des notes de séance : signalé dans l'onglet Historique */
  const [notesError, setNotesError] = useState<string | null>(null)

  useEffect(() => {
    if (!coachId) return
    let alive = true

    const load = async () => {
      // Complétion paresseuse : les séances passées basculent en 'completed'
      await fetch('/api/bookings/complete-past', { method: 'POST' }).catch(() => {})

      const { data: rows, error: bErr } = await supabase
        .from('bookings')
        .select('id, created_at, scheduled_at, status, formation_id, student_id, pack_index, stripe_payment_intent_id, meeting_url')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
      if (!alive) return
      if (bErr) {
        console.error('[agenda] bookings query error:', bErr.message)
        setError('Impossible de charger vos réservations. Rechargez la page.')
        setLoading(false)
        return
      }

      const list = (rows ?? []) as Row[]
      const formationIds = [...new Set(list.map(r => r.formation_id).filter(Boolean))]
      const studentIds   = [...new Set(list.map(r => r.student_id).filter(Boolean))]
      const bookingIds   = list.map(r => r.id)

      const [fRes, sRes, nRes] = await Promise.all([
        formationIds.length
          ? supabase.from('formations').select('id, title, coaching_packs').in('id', formationIds)
          : Promise.resolve({ data: [] as FormationLite[] }),
        studentIds.length
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', studentIds)
          : Promise.resolve({ data: [] as StudentLite[] }),
        bookingIds.length
          ? supabase.from('coaching_sessions').select('id, booking_id, notes, tags, progress_score').in('booking_id', bookingIds)
          : Promise.resolve({ data: [] as { id: string; booking_id: string; notes: string | null; tags: string[] | null; progress_score: number | null }[] }),
      ])
      if (!alive) return

      const fMap = new Map(((fRes.data ?? []) as FormationLite[]).map(f => [f.id, f]))
      const sMap = new Map(((sRes.data ?? []) as StudentLite[]).map(s => [s.id, s]))
      setBookings(list.map(r => ({
        ...r,
        formation: fMap.get(r.formation_id) ?? null,
        student:   sMap.get(r.student_id) ?? null,
      })))

      const nErr = (nRes as { error?: { code?: string; message: string } | null }).error
      if (nErr) {
        console.error('[agenda] session notes query error:', nErr.code, nErr.message)
        setNotesError('Impossible de charger vos notes de séance. Rechargez la page avant de les modifier.')
      } else {
        setNotesError(null)
      }
      const n: Record<string, SessionNotes> = {}
      for (const row of (nRes.data ?? []) as { id: string; booking_id: string; notes: string | null; tags: string[] | null; progress_score: number | null }[]) {
        n[row.booking_id] = { id: row.id, notes: row.notes ?? '', tags: row.tags ?? [], progress_score: row.progress_score }
      }
      setNotes(n)
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [coachId, supabase])

  return { loading, error, bookings, setBookings, notes, setNotes, notesError }
}
