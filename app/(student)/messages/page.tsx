'use client'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Send, Search, MessageSquare, Inbox, Check, CheckCheck, Plus, Paperclip, FileText, X } from 'lucide-react'
import FourAcesLoader from '@/components/FourAcesLoader'

const BG       = '#07090e'
const PANEL    = '#0a0a14'
const PANEL_HI = 'rgba(232,228,220,0.04)'
const CREAM    = '#f0f4ff'
const SILVER   = 'rgba(240,244,255,0.45)'
const MUTED    = 'rgba(240,244,255,0.22)'
const VIOLET   = '#7c3aed'
const CYAN     = '#06b6d4'
const BORDER   = 'rgba(255,255,255,0.06)'
const BORDER_S = 'rgba(255,255,255,0.10)'

type Message = {
  id: string
  coach_id: string
  student_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
  pending?: boolean
  failed?: boolean
}

type CoachLite = {
  id: string
  username: string | null
  avatar_url: string | null
}

type Conversation = {
  coach: CoachLite
  lastMessage: Message | null
  unread: number
}

function formatRelative(iso: string) {
  const d    = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)      return 'à l\'instant'
  if (diff < 3600)    return `${Math.floor(diff / 60)} min`
  if (diff < 86_400)  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff < 7*86400) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function dayKey(iso: string) { return new Date(iso).toDateString() }
function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Aujourd\'hui'
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function initials(name: string | null | undefined) {
  return name?.trim()[0]?.toUpperCase() ?? '?'
}

const ATT_PREFIX = '__att__'
type AttachmentData = { url: string; name: string; mime: string; size: number }
function parseAttachment(content: string): AttachmentData | null {
  if (!content.startsWith(ATT_PREFIX)) return null
  try { return JSON.parse(content.slice(ATT_PREFIX.length)) } catch { return null }
}
function encodeAttachment(a: AttachmentData): string {
  return ATT_PREFIX + JSON.stringify(a)
}

function AttachmentBubble({ att, mine }: { att: AttachmentData; mine: boolean }) {
  const isImage = att.mime.startsWith('image/')
  return isImage ? (
    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={att.url} alt={att.name} style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 12, display: 'block', objectFit: 'cover' }} />
      <span style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.6)' : SILVER, marginTop: 4, display: 'block' }}>{att.name}</span>
    </a>
  ) : (
    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: mine ? '#fff' : CREAM }}>
      <FileText size={18} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>{att.name}</span>
    </a>
  )
}

function Avatar({ name, src, size = 40, ring }: { name?: string | null; src?: string | null; size?: number; ring?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg,${VIOLET},${CYAN})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.42),
      flexShrink: 0, overflow: 'hidden', position: 'relative',
      boxShadow: ring ? `0 0 0 2px ${CYAN}40, 0 0 0 4px ${BG}` : undefined,
    }}>
      {src ? <Image src={src} alt="" fill sizes={`${size}px`} style={{ objectFit: 'cover' }} /> : initials(name)}
    </div>
  )
}

function ConvSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: PANEL_HI }} className="op-shimmer" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 11, width: '55%', borderRadius: 4, background: PANEL_HI, marginBottom: 8 }} className="op-shimmer" />
        <div style={{ height: 9,  width: '80%', borderRadius: 4, background: PANEL_HI }} className="op-shimmer" />
      </div>
    </div>
  )
}

function BubbleSkeleton({ side }: { side: 'l' | 'r' }) {
  return (
    <div style={{ display: 'flex', justifyContent: side === 'r' ? 'flex-end' : 'flex-start', padding: '4px 0' }}>
      <div className="op-shimmer" style={{ width: 180, height: 34, borderRadius: 18, background: PANEL_HI, borderBottomRightRadius: side === 'r' ? 4 : 18, borderBottomLeftRadius: side === 'l' ? 4 : 18 }} />
    </div>
  )
}

export default function StudentMessagesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: userLoading } = useUser()

  const [pageLoading,   setPageLoading]   = useState(true)
  const [coaches,       setCoaches]       = useState<CoachLite[]>([])       // tous les coaches achetés
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeCoachId, setActiveCoach]   = useState<string | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [thread,        setThread]        = useState<Message[]>([])
  const [draft,         setDraft]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [search,        setSearch]        = useState('')

  const [uploading, setUploading] = useState(false)
  const scrollRef    = useRef<HTMLDivElement | null>(null)
  const inputRef     = useRef<HTMLTextAreaElement | null>(null)
  const attachFileRef = useRef<HTMLInputElement | null>(null)

  /* ── Charge coaches achetés + messages existants ── */
  const loadData = useCallback(async () => {
    if (!user) return

    // 1) Coaches dont l'élève a acheté au moins une formation/coaching
    const { data: purchases } = await supabase
      .from('formation_purchases')
      .select('formations(coach_id)')
      .eq('user_id', user.id)

    const coachIds = [...new Set(
      (purchases ?? [])
        .map((p: any) => Array.isArray(p.formations) ? p.formations[0]?.coach_id : p.formations?.coach_id)
        .filter(Boolean) as string[]
    )]

    let coachProfiles: CoachLite[] = []
    if (coachIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', coachIds)
      coachProfiles = (profs ?? []) as CoachLite[]
    }
    setCoaches(coachProfiles)

    // 2) Tous les messages de cet élève
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    // Regroupe par coach
    const map = new Map<string, { last: Message; unread: number }>()
    for (const m of (msgs ?? []) as Message[]) {
      const cur = map.get(m.coach_id)
      if (!cur) {
        map.set(m.coach_id, { last: m, unread: !m.read && m.sender_id !== user.id ? 1 : 0 })
      } else if (!m.read && m.sender_id !== user.id) {
        cur.unread += 1
      }
    }

    // Construit la liste : coaches avec messages d'abord, puis coaches sans messages
    const profileById = new Map(coachProfiles.map(p => [p.id, p]))
    const withMsg: Conversation[] = Array.from(map.entries()).map(([cid, { last, unread }]) => ({
      coach: profileById.get(cid) ?? { id: cid, username: null, avatar_url: null },
      lastMessage: last,
      unread,
    })).sort((a, b) => new Date(b.lastMessage!.created_at).getTime() - new Date(a.lastMessage!.created_at).getTime())

    const withoutMsg: Conversation[] = coachProfiles
      .filter(p => !map.has(p.id))
      .map(p => ({ coach: p, lastMessage: null, unread: 0 }))

    setConversations([...withMsg, ...withoutMsg])
    setPageLoading(false)
  }, [user, supabase])

  useEffect(() => { if (user) loadData() }, [user, loadData])

  /* ── Auto-select première conversation ── */
  useEffect(() => {
    if (!activeCoachId && conversations.length > 0) {
      setActiveCoach(conversations[0].coach.id)
    }
  }, [conversations, activeCoachId])

  /* ── Charge thread ── */
  const loadThread = useCallback(async (coachId: string) => {
    if (!user) return
    setThreadLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('coach_id', coachId)
      .eq('student_id', user.id)
      .order('created_at', { ascending: true })

    setThread((data ?? []) as Message[])
    setThreadLoading(false)

    const unreadIds = (data ?? [])
      .filter((m: Message) => !m.read && m.sender_id !== user.id)
      .map((m: Message) => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ read: true }).in('id', unreadIds)
      setConversations(cs => cs.map(c => c.coach.id === coachId ? { ...c, unread: 0 } : c))
    }
  }, [user, supabase])

  useEffect(() => { if (activeCoachId) loadThread(activeCoachId) }, [activeCoachId, loadThread])

  /* ── Realtime ── */
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`student-messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `student_id=eq.${user.id}` },
        (payload: { new: Message }) => {
          const m = payload.new as Message
          if (m.coach_id === activeCoachId) {
            setThread(prev => {
              if (prev.some(x => x.id === m.id)) return prev
              const idx = prev.findIndex(x => x.pending && x.sender_id === m.sender_id && x.content === m.content)
              if (idx >= 0) { const next = [...prev]; next[idx] = m; return next }
              return [...prev, m]
            })
            if (m.sender_id !== user.id) supabase.from('messages').update({ read: true }).eq('id', m.id)
          }
          setConversations(prev => {
            const existing = prev.find(c => c.coach.id === m.coach_id)
            if (existing) {
              const updated: Conversation = { ...existing, lastMessage: m, unread: m.sender_id !== user.id && m.coach_id !== activeCoachId ? existing.unread + 1 : existing.unread }
              return [updated, ...prev.filter(c => c.coach.id !== m.coach_id)]
            }
            return prev
          })
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, user, activeCoachId])

  /* ── Scroll bas ── */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [thread, activeCoachId])

  /* ── Envoi ── */
  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if (!content || !user || !activeCoachId || sending) return

    const tempId = `tmp-${Date.now()}`
    const optimistic: Message = {
      id: tempId, coach_id: activeCoachId, student_id: user.id, sender_id: user.id,
      content, read: false, created_at: new Date().toISOString(), pending: true,
    }
    setThread(prev => [...prev, optimistic])
    setDraft('')
    setSending(true)
    requestAnimationFrame(() => inputRef.current?.focus())

    const { data, error } = await supabase
      .from('messages')
      .insert({ coach_id: activeCoachId, student_id: user.id, sender_id: user.id, content })
      .select().single()

    setSending(false)
    if (error || !data) {
      setThread(prev => prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m))
      return
    }
    setThread(prev => prev.map(m => m.id === tempId ? (data as Message) : m))
    setConversations(prev => {
      const existing = prev.find(c => c.coach.id === activeCoachId)
      if (existing) {
        const updated: Conversation = { ...existing, lastMessage: data as Message }
        return [updated, ...prev.filter(c => c.coach.id !== activeCoachId)]
      }
      return prev
    })
  }, [draft, user, activeCoachId, sending, supabase])

  const handleAttach = useCallback(async (file: File) => {
    if (!user || !activeCoachId || uploading) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload-message-attachment', { method: 'POST', body: form })
      const json = await res.json()
      if (!json.url) return
      const content = encodeAttachment({ url: json.url, name: json.name, mime: json.mime, size: json.size })
      const tempId = `tmp-${Date.now()}`
      const optimistic: Message = { id: tempId, coach_id: activeCoachId, student_id: user.id, sender_id: user.id, content, read: false, created_at: new Date().toISOString(), pending: true }
      setThread(prev => [...prev, optimistic])
      const { data, error } = await supabase.from('messages').insert({ coach_id: activeCoachId, student_id: user.id, sender_id: user.id, content }).select().single()
      if (error || !data) { setThread(prev => prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m)); return }
      setThread(prev => prev.map(m => m.id === tempId ? (data as Message) : m))
      setConversations(prev => {
        const sent = data as Message
        const existing = prev.find(c => c.coach.id === activeCoachId)
        if (existing) {
          const updated: Conversation = { ...existing, lastMessage: sent }
          return [updated, ...prev.filter(c => c.coach.id !== activeCoachId)]
        }
        return prev
      })
    } finally {
      setUploading(false)
      if (attachFileRef.current) attachFileRef.current.value = ''
    }
  }, [user, activeCoachId, uploading, supabase])

  const filteredConvs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => (c.coach.username ?? '').toLowerCase().includes(q))
  }, [conversations, search])

  const activeConv = conversations.find(c => c.coach.id === activeCoachId) ?? null

  const grouped = useMemo(() => {
    const out: Array<{ key: string; label: string; items: Message[] }> = []
    for (const m of thread) {
      const k = dayKey(m.created_at)
      const last = out[out.length - 1]
      if (!last || last.key !== k) out.push({ key: k, label: dayLabel(m.created_at), items: [m] })
      else last.items.push(m)
    }
    return out
  }, [thread])

  if (userLoading || pageLoading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  return (
    <div className="smsg-layout" style={{ height: 'calc(100vh - 64px)', display: 'flex', background: BG, color: CREAM, overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 760px) {
          .smsg-layout { flex-direction: column !important; }
          .smsg-sidebar { width: 100% !important; flex: 0 0 36% !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.08); min-height: 0; overflow: hidden; }
        }
        @keyframes op-shimmer { 0%{background-position:-240px 0} 100%{background-position:240px 0} }
        .op-shimmer { background-image:linear-gradient(90deg,rgba(232,228,220,0.03) 0%,rgba(232,228,220,0.08) 50%,rgba(232,228,220,0.03) 100%); background-size:480px 100%; animation:op-shimmer 1.4s linear infinite; }
        @keyframes op-pop { from{transform:translateY(4px) scale(0.98);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        .op-pop { animation:op-pop 180ms cubic-bezier(0.2,0.7,0.2,1); }
        @keyframes op-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .op-pulse { animation:op-pulse 1.4s ease-in-out infinite; }
        @keyframes op-spin { to{transform:rotate(360deg)} }
        .op-thread::-webkit-scrollbar{width:8px} .op-thread::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:4px}
        .op-list::-webkit-scrollbar{width:6px} .op-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05);border-radius:4px}
        .op-conv-row{transition:background 0.12s ease} .op-conv-row:hover{background:rgba(255,255,255,0.025)}
      `}</style>

      {/* ═══ SIDEBAR ═══ */}
      <aside className="smsg-sidebar" style={{ width: 300, flexShrink: 0, background: PANEL, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--font-syne,sans-serif)' }}>Messages</h1>
            {coaches.length > 0 && <span style={{ fontSize: 11, color: SILVER }}>{coaches.length} coach{coaches.length > 1 ? 's' : ''}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 11px' }}>
            <Search size={13} color={SILVER} strokeWidth={1.8} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un coach…"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: CREAM, fontSize: 13, padding: 0 }} />
          </div>
        </div>

        <div className="op-list" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {pageLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ConvSkeleton key={i} />)
          ) : coaches.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Inbox size={20} color={MUTED} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 12, color: SILVER, margin: 0, lineHeight: 1.6 }}>
                Achète une formation ou un coaching pour pouvoir contacter un coach.
              </p>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: SILVER, margin: 0 }}>Aucun résultat</p>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const active = conv.coach.id === activeCoachId
              const isMine = conv.lastMessage?.sender_id === user?.id
              return (
                <button key={conv.coach.id} onClick={() => setActiveCoach(conv.coach.id)}
                  className="op-conv-row"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: active ? 'rgba(6,182,212,0.08)' : 'transparent', border: 'none', borderLeft: `2px solid ${active ? CYAN : 'transparent'}`, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
                >
                  <Avatar name={conv.coach.username} src={conv.coach.avatar_url} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: conv.unread > 0 ? 700 : 600, color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.coach.username ?? 'Coach'}
                      </span>
                      {conv.lastMessage && (
                        <span style={{ fontSize: 10, color: conv.unread > 0 ? CYAN : SILVER, flexShrink: 0, fontWeight: conv.unread > 0 ? 700 : 400 }}>
                          {formatRelative(conv.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      {conv.lastMessage ? (
                        <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 12, color: conv.unread > 0 ? 'rgba(240,244,255,0.78)' : SILVER, fontWeight: conv.unread > 0 ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isMine && <span style={{ color: MUTED, marginRight: 4 }}>Toi :</span>}
                          {conv.lastMessage.content}
                        </p>
                      ) : (
                        <p style={{ flex: 1, margin: 0, fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Plus size={9} /> Démarrer une conversation
                        </p>
                      )}
                      {conv.unread > 0 && (
                        <span style={{ minWidth: 18, height: 18, padding: '0 6px', borderRadius: 10, background: CYAN, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {conv.unread > 99 ? '99+' : conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ═══ THREAD ═══ */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 40% at 50% 0%,rgba(6,182,212,0.05) 0%,transparent 70%)' }} />

        {!activeConv ? (
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg,${VIOLET}22,${CYAN}22)`, border: `1px solid ${BORDER_S}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <MessageSquare size={26} color={CREAM} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.5px', margin: '0 0 8px', fontFamily: 'var(--font-syne,sans-serif)' }}>
              {coaches.length === 0 ? 'Aucun coach disponible' : 'Tes échanges avec tes coaches'}
            </h2>
            <p style={{ fontSize: 13, color: SILVER, maxWidth: 340, lineHeight: 1.6, margin: 0 }}>
              {coaches.length === 0
                ? "Achète une formation ou réserve un coaching pour contacter un coach directement."
                : "Sélectionne un coach à gauche pour voir ou démarrer une conversation."}
            </p>
          </div>
        ) : (
          <>
            {/* Header thread */}
            <header style={{ position: 'relative', zIndex: 1, height: 68, padding: '0 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', flexShrink: 0 }}>
              <Avatar name={activeConv.coach.username} src={activeConv.coach.avatar_url} size={40} ring />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: CREAM, letterSpacing: '-0.2px' }}>{activeConv.coach.username ?? 'Coach'}</div>
                <div style={{ fontSize: 11, color: SILVER, marginTop: 2 }}>Coach · conversation privée</div>
              </div>
            </header>

            {/* Thread */}
            <div ref={scrollRef} className="op-thread" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {threadLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <BubbleSkeleton side="l" />
                  <BubbleSkeleton side="r" />
                  <BubbleSkeleton side="l" />
                </div>
              ) : thread.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: SILVER, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
                    Envoie un premier message à{' '}
                    <strong style={{ color: CREAM }}>{activeConv.coach.username ?? 'ce coach'}</strong>.
                  </p>
                </div>
              ) : (
                grouped.map(group => (
                  <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 10px' }}>
                      <div style={{ flex: 1, height: 1, background: BORDER }} />
                      <span style={{ fontSize: 10, color: SILVER, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{group.label}</span>
                      <div style={{ flex: 1, height: 1, background: BORDER }} />
                    </div>
                    {group.items.map((m, i) => {
                      const mine       = m.sender_id === user?.id
                      const prev       = group.items[i - 1]
                      const next       = group.items[i + 1]
                      const sameAsPrev = prev && prev.sender_id === m.sender_id
                      const sameAsNext = next && next.sender_id === m.sender_id
                      const isLastRun  = !sameAsNext
                      return (
                        <div key={m.id} className="op-pop" style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: sameAsPrev ? 2 : 8 }}>
                          <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2 }}>
                            {(() => {
                              const att = parseAttachment(m.content)
                              return (
                                <div style={{
                                  padding: att ? '8px' : '9px 14px', borderRadius: 18,
                                  borderBottomRightRadius: mine && isLastRun ? 5 : 18,
                                  borderBottomLeftRadius:  !mine && isLastRun ? 5 : 18,
                                  background: mine ? `linear-gradient(135deg,${CYAN},${VIOLET})` : 'rgba(255,255,255,0.06)',
                                  color: mine ? '#fff' : CREAM,
                                  fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                                  opacity: m.pending ? 0.65 : 1,
                                  boxShadow: mine ? `0 1px 0 rgba(0,0,0,0.2),0 8px 24px -12px ${CYAN}50` : 'none',
                                  border: mine ? 'none' : `1px solid ${BORDER_S}`,
                                }}>
                                  {att ? <AttachmentBubble att={att} mine={mine} /> : m.content}
                                </div>
                              )
                            })()}
                            {isLastRun && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: m.failed ? '#ef4444' : SILVER, padding: '0 6px' }}>
                                <span>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                {mine && (
                                  m.failed ? <span style={{ fontWeight: 600 }}>· Échec</span>
                                  : m.pending ? <span className="op-pulse">· envoi…</span>
                                  : m.read ? <CheckCheck size={11} strokeWidth={2.4} color={CYAN} />
                                  : <Check size={11} strokeWidth={2.4} />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <div style={{ position: 'relative', zIndex: 1, padding: '14px 20px 18px', borderTop: `1px solid ${BORDER}`, background: 'rgba(10,10,20,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER_S}`, borderRadius: 16, padding: '8px 8px 8px 14px', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = `${CYAN}55`)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER_S)}
              >
                <button type="button" onClick={() => attachFileRef.current?.click()} disabled={uploading}
                  title="Joindre un fichier"
                  style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, border: 'none', background: 'transparent', color: uploading ? VIOLET : SILVER, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
                  onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
                  onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
                  {uploading ? <span style={{ width: 15, height: 15, border: `2px solid ${VIOLET}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'op-spin 0.8s linear infinite' }} /> : <Paperclip size={15} strokeWidth={2} />}
                </button>
                <input ref={attachFileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAttach(f) }} />
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  rows={1}
                  placeholder={`Message à ${activeConv.coach.username ?? 'votre coach'}…`}
                  style={{ flex: 1, minWidth: 0, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: CREAM, fontSize: 14, lineHeight: 1.45, padding: '8px 0', maxHeight: 140, minHeight: 22, fontFamily: 'inherit' }}
                  onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px' }}
                />
                <button onClick={handleSend} disabled={!draft.trim() || sending} aria-label="Envoyer"
                  style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 12, border: 'none', background: !draft.trim() || sending ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${CYAN},${VIOLET})`, color: !draft.trim() || sending ? MUTED : '#fff', cursor: !draft.trim() || sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.12s,background 0.15s', boxShadow: !draft.trim() || sending ? 'none' : `0 4px 16px -4px ${CYAN}50` }}
                  onMouseDown={e => { if (!sending && draft.trim()) e.currentTarget.style.transform = 'scale(0.94)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Send size={15} strokeWidth={2.2} />
                </button>
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 8, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <kbd style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, fontFamily: 'inherit', color: SILVER }}>Entrée</kbd>
                pour envoyer
                <span style={{ opacity: 0.5 }}>·</span>
                <kbd style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, fontFamily: 'inherit', color: SILVER }}>Maj+Entrée</kbd>
                saut de ligne
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
