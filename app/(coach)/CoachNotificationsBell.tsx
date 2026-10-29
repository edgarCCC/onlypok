'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NAV } from './coach-nav'

interface Notif {
  id: string
  type: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

const PREVIEW_LIMIT = 8

/* Où mène chaque notification : directement à l'écran qui permet d'agir. */
const TYPE_HREF: Record<string, string> = {
  new_request:      '/coach/agenda?tab=validate',
  slot_proposed:    '/coach/agenda?tab=validate',
  booking_accepted: '/coach/agenda?tab=upcoming',
  booking_declined: '/coach/agenda?tab=validate',
  session_reminder: '/coach/agenda?tab=upcoming',
  new_message:      '/coach/messages',
  new_review:       '/coach/reviews',
  new_purchase:     '/coach/revenue',
  payment_received: '/coach/revenue',
  new_student:      '/coach/students',
  proof_validated:  '/coach/profile',
  proof_rejected:   '/coach/profile',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "À l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function CoachNotificationsBell({ userId, unread, onChange }: {
  userId: string | undefined
  unread: number
  onChange: (unread: number) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const router   = useRouter()
  const rootRef  = useRef<HTMLDivElement>(null)
  const [open, setOpen]     = useState(false)
  const [notifs, setNotifs] = useState<Notif[] | null>(null)

  useEffect(() => {
    if (!open || !userId) return
    supabase.from('notifications')
      .select('id, type, title, body, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PREVIEW_LIMIT)
      .then(({ data, error }: { data: Notif[] | null; error: { message: string } | null }) => {
        if (error) console.error('[coach bell]', error.message)
        setNotifs(data ?? [])
      })
  }, [open, userId, supabase])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openNotif = async (n: Notif) => {
    setOpen(false)
    if (!n.read_at) {
      const now = new Date().toISOString()
      setNotifs(ns => ns?.map(x => x.id === n.id ? { ...x, read_at: now } : x) ?? null)
      onChange(Math.max(0, unread - 1))
      await supabase.from('notifications').update({ read_at: now }).eq('id', n.id)
    }
    router.push(TYPE_HREF[n.type] ?? '/coach/notifications')
  }

  const markAll = async () => {
    if (!userId) return
    const now = new Date().toISOString()
    setNotifs(ns => ns?.map(x => ({ ...x, read_at: x.read_at ?? now })) ?? null)
    onChange(0)
    const { error } = await supabase.from('notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null)
    if (error) console.error('[coach bell] mark all', error.message)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
        aria-expanded={open}
        className="coach-icon-btn"
        data-open={open || undefined}
      >
        <Bell size={16} strokeWidth={1.9} />
        {unread > 0 && <span className="coach-dot-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="coach-popover coach-bell-panel" role="dialog" aria-label="Notifications">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: NAV.cream }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="coach-text-btn">
                <CheckCheck size={13} /> Tout marquer lu
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '0 6px' }}>
            {notifs === null && <p className="coach-empty">Chargement…</p>}
            {notifs?.length === 0 && <p className="coach-empty">Aucune notification pour l’instant.</p>}
            {notifs?.map(n => (
              <button key={n.id} onClick={() => openNotif(n)} className="coach-notif-row">
                <span className="coach-notif-dot" style={{ background: n.read_at ? 'transparent' : NAV.violet }} />
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: n.read_at ? 500 : 700, color: n.read_at ? NAV.dim : NAV.cream }}>{n.title}</span>
                  {n.body && <span className="coach-notif-body">{n.body}</span>}
                  <span style={{ display: 'block', fontSize: 11, color: NAV.faint, marginTop: 3 }}>{timeAgo(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>

          <Link href="/coach/notifications" onClick={() => setOpen(false)} className="coach-popover-footer">
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  )
}
