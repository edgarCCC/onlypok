'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CoachBadges {
  agenda: number         // demandes de créneau à accepter / refuser
  messages: number       // messages élèves non lus
  notifications: number  // notifications non lues
}

const EMPTY: CoachBadges = { agenda: 0, messages: 0, notifications: 0 }

/* Compteurs de la navigation coach. Rechargés à chaque changement de page
   (le coach vient souvent de traiter une demande ou de lire un message). */
export function useCoachBadges(userId: string | undefined, pathname: string): {
  badges: CoachBadges
  /* mise à jour locale après lecture dans la cloche (évite un aller-retour) */
  setNotificationCount: (count: number) => void
} {
  const supabase = useMemo(() => createClient(), [])
  const [badges, setBadges] = useState<CoachBadges>(EMPTY)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const load = async () => {
      const [agenda, messages, notifications] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('coach_id', userId).eq('status', 'pending_coach_approval'),
        supabase.from('messages').select('id', { count: 'exact', head: true })
          .eq('coach_id', userId).eq('read', false).neq('sender_id', userId),
        supabase.from('notifications').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).is('read_at', null),
      ])
      if (cancelled) return
      setBadges({
        agenda:        agenda.count ?? 0,
        messages:      messages.count ?? 0,
        notifications: notifications.count ?? 0,
      })
    }
    load().catch(err => console.error('[coach badges]', err instanceof Error ? err.message : err))
    return () => { cancelled = true }
  }, [userId, pathname, supabase])

  const setNotificationCount = useCallback((count: number) => {
    setBadges(b => ({ ...b, notifications: count }))
  }, [])

  return { badges, setNotificationCount }
}
