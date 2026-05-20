'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import {
  Bell, MessageSquare, Star, DollarSign, ShieldCheck,
  ShieldX, Zap, Users, Clock, CheckCheck, Trash2,
} from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'
const VIOLET = '#7c3aed'

type Notif = {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  data: Record<string, string>
  created_at: string
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  new_message:       { icon: MessageSquare, color: '#06b6d4' },
  new_review:        { icon: Star,          color: '#f59e0b' },
  new_purchase:      { icon: DollarSign,    color: '#4ade80' },
  payment_received:  { icon: DollarSign,    color: '#4ade80' },
  proof_validated:   { icon: ShieldCheck,   color: '#4ade80' },
  proof_rejected:    { icon: ShieldX,       color: '#ef4444' },
  new_request:       { icon: Zap,           color: VIOLET },
  new_student:       { icon: Users,         color: '#a78bfa' },
  session_reminder:  { icon: Clock,         color: '#f59e0b' },
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return "À l'instant"
  if (m < 60) return `Il y a ${m}min`
  if (h < 24) return `Il y a ${h}h`
  if (d < 7)  return `Il y a ${d}j`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)
      .then(({ data }: { data: Notif[] | null }) => { setNotifs(data ?? []); setLoading(false) })
  }, [user, supabase])

  const markAll = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markOne = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteOne = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const displayed = filter === 'unread' ? notifs.filter(n => !n.read) : notifs
  const unreadCount = notifs.filter(n => !n.read).length

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM, padding: '40px 48px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, color: SILVER, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Espace coach</p>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 6px', fontFamily: 'var(--font-syne, sans-serif)', color: CREAM }}>
              Notifications
            </h1>
            <p style={{ fontSize: 14, color: SILVER, margin: 0 }}>
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAll} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, border: `1px solid ${BORDER}`, background: CARD, color: SILVER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <CheckCheck size={13} /> Tout marquer lu
            </button>
          )}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filter === f ? VIOLET : CARD,
              color: filter === f ? '#fff' : SILVER,
              outline: filter === f ? 'none' : `1px solid ${BORDER}`,
            }}>
              {f === 'all' ? 'Toutes' : `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        {/* List */}
        {displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: SILVER }}>
            <Bell size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0 }}>
              {filter === 'unread' ? 'Aucune notification non lue.' : "Aucune notification pour l'instant."}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayed.map(n => {
              const meta = TYPE_META[n.type] ?? { icon: Bell, color: SILVER }
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markOne(n.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 14, padding: '14px 18px', borderRadius: 12, cursor: n.read ? 'default' : 'pointer',
                    background: n.read ? 'transparent' : 'rgba(124,58,237,0.05)',
                    border: `1px solid ${n.read ? BORDER : 'rgba(124,58,237,0.15)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={meta.color} />
                  </div>

                  {/* Content */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: n.read ? SILVER : CREAM }}>{n.title}</span>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: VIOLET, flexShrink: 0 }} />}
                    </div>
                    {n.body && <p style={{ fontSize: 12, color: SILVER, margin: 0, lineHeight: 1.5 }}>{n.body}</p>}
                    <span style={{ fontSize: 11, color: 'rgba(240,244,255,0.25)', marginTop: 4, display: 'block' }}>{timeAgo(n.created_at)}</span>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteOne(n.id) }}
                    style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(240,244,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(240,244,255,0.15)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
