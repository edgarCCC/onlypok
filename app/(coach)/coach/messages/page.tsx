'use client'

/* ─────────────────────────────────────────────────────────────────────────────
 *  Messagerie coach — OnlyPok
 *
 *  Schema SQL à exécuter une seule fois côté Supabase (cf. const SQL_SCHEMA).
 *  Pour activer le realtime sur la table : enable « Realtime » sur `messages`
 *  dans le dashboard Supabase, ou :
 *      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
 * ────────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Send, Search, MessageSquare, Inbox, Check, CheckCheck, NotebookPen, ChevronDown, ChevronUp } from 'lucide-react'

/* ── Theme tokens ───────────────────────────────────────── */
const BG       = '#04040a'
const PANEL    = '#0a0a14'
const PANEL_HI = 'rgba(232,228,220,0.04)'
const CREAM    = '#f0f4ff'
const SILVER   = 'rgba(240,244,255,0.45)'
const MUTED    = 'rgba(240,244,255,0.22)'
const VIOLET   = '#7c3aed'
const CYAN     = '#06b6d4'
const BORDER   = 'rgba(255,255,255,0.06)'
const BORDER_S = 'rgba(255,255,255,0.10)'

/* ── SQL référence (à exécuter une fois sur Supabase) ───── */
export const SQL_SCHEMA = /* sql */ `
-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index pour accélérer la liste des conversations
CREATE INDEX IF NOT EXISTS messages_coach_student_idx
  ON messages (coach_id, student_id, created_at DESC);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own" ON messages FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = student_id);

CREATE POLICY "messages_insert_own" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id
              AND (auth.uid() = coach_id OR auth.uid() = student_id));

CREATE POLICY "messages_update_read" ON messages FOR UPDATE
  USING (auth.uid() = coach_id OR auth.uid() = student_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
`

/* ── Types ──────────────────────────────────────────────── */
type Message = {
  id: string
  coach_id: string
  student_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
  /* purement client-side */
  pending?: boolean
  failed?: boolean
}

type StudentLite = {
  id: string
  username: string | null
  avatar_url: string | null
}

type Conversation = {
  student: StudentLite
  lastMessage: Message | null
  unread: number
}

/* ── Utils ──────────────────────────────────────────────── */
function formatRelative(iso: string) {
  const d  = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60)            return 'à l\'instant'
  if (diff < 3600)          return `${Math.floor(diff / 60)} min`
  if (diff < 86_400) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 7 * 86_400)    return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function dayKey(iso: string) {
  return new Date(iso).toDateString()
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Aujourd\'hui'
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.trim()[0]?.toUpperCase() ?? '?'
}

/* ── Avatar ─────────────────────────────────────────────── */
function Avatar({
  name, src, size = 40, ring,
}: { name: string | null | undefined; src: string | null | undefined; size?: number; ring?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.42),
      flexShrink: 0, overflow: 'hidden',
      boxShadow: ring ? `0 0 0 2px ${VIOLET}40, 0 0 0 4px ${BG}` : undefined,
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)}
    </div>
  )
}

/* ── Skeletons ──────────────────────────────────────────── */
function ConvSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: PANEL_HI }} className="op-shimmer" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 11, width: '60%', borderRadius: 4, background: PANEL_HI, marginBottom: 8 }} className="op-shimmer" />
        <div style={{ height: 9,  width: '85%', borderRadius: 4, background: PANEL_HI }} className="op-shimmer" />
      </div>
    </div>
  )
}

function BubbleSkeleton({ side }: { side: 'l' | 'r' }) {
  return (
    <div style={{ display: 'flex', justifyContent: side === 'r' ? 'flex-end' : 'flex-start', padding: '4px 0' }}>
      <div className="op-shimmer" style={{
        width: 180, height: 34, borderRadius: 18,
        background: PANEL_HI,
        borderBottomRightRadius: side === 'r' ? 4 : 18,
        borderBottomLeftRadius:  side === 'l' ? 4 : 18,
      }} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════
 *  PAGE
 * ════════════════════════════════════════════════════════ */
function CoachMessagesInner() {
  const supabase    = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const { user, profile, loading: userLoading } = useUser()

  const [convLoading, setConvLoading]       = useState(true)
  const [conversations, setConversations]   = useState<Conversation[]>([])
  const [allStudents, setAllStudents]       = useState<StudentLite[]>([])
  const [activeStudentId, setActiveStudent] = useState<string | null>(
    searchParams.get('student_id')
  )
  const [threadLoading, setThreadLoading]   = useState(false)
  const [thread, setThread]                 = useState<Message[]>([])
  const [draft, setDraft]                   = useState('')
  const [sending, setSending]               = useState(false)
  const [search, setSearch]                 = useState('')
  const [note, setNote]                     = useState('')
  const [noteSaved, setNoteSaved]           = useState<'idle' | 'saving' | 'saved'>('idle')
  const [noteOpen, setNoteOpen]             = useState(false)

  const scrollRef    = useRef<HTMLDivElement | null>(null)
  const inputRef     = useRef<HTMLTextAreaElement | null>(null)
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Charge la liste des conversations ──────────────── */
  const loadConversations = useCallback(async () => {
    if (!user) return

    const [msgRes, studentsJson] = await Promise.all([
      supabase.from('messages').select('*').eq('coach_id', user.id).order('created_at', { ascending: false }),
      fetch('/api/coach/students').then(r => r.ok ? r.json() : { purchases: [], bookings: [] }).catch(() => ({ purchases: [], bookings: [] })),
    ])

    /* ── Tous les élèves du coach (achats + bookings) ── */
    const rawStudents: StudentLite[] = [
      ...((studentsJson.purchases ?? []) as any[]).map((p: any) => (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles)).filter(Boolean),
      ...((studentsJson.bookings ?? []) as any[]).map((b: any) => b.student).filter(Boolean),
    ]
    const uniqueStudentsMap = new Map<string, StudentLite>()
    for (const s of rawStudents) if (s?.id) uniqueStudentsMap.set(s.id, s)
    setAllStudents(Array.from(uniqueStudentsMap.values()))

    if (msgRes.error) { setConvLoading(false); return }

    /* Regroupe par student_id : 1ère ligne = dernier message */
    const map = new Map<string, { last: Message; unread: number }>()
    for (const m of (msgRes.data ?? []) as Message[]) {
      const cur = map.get(m.student_id)
      if (!cur) {
        map.set(m.student_id, {
          last: m,
          unread: !m.read && m.sender_id !== user.id ? 1 : 0,
        })
      } else if (!m.read && m.sender_id !== user.id) {
        cur.unread += 1
      }
    }

    const studentIds = Array.from(map.keys())
    const profilesById = new Map<string, StudentLite>()
    for (const s of uniqueStudentsMap.values()) profilesById.set(s.id, s)
    if (studentIds.length > 0) {
      const missing = studentIds.filter(id => !profilesById.has(id))
      if (missing.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url').in('id', missing)
        for (const p of (profs ?? []) as StudentLite[]) profilesById.set(p.id, p)
      }
    }

    const list: Conversation[] = studentIds.map(sid => ({
      student: profilesById.get(sid) ?? { id: sid, username: null, avatar_url: null },
      lastMessage: map.get(sid)!.last,
      unread: map.get(sid)!.unread,
    })).sort((a, b) =>
      new Date(b.lastMessage!.created_at).getTime() - new Date(a.lastMessage!.created_at).getTime(),
    )

    setConversations(list)
    setConvLoading(false)
  }, [supabase, user])

  /* ── Charge un thread ───────────────────────────────── */
  const loadThread = useCallback(async (studentId: string) => {
    if (!user) return
    setThreadLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('coach_id', user.id)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })

    setThread((data ?? []) as Message[])
    setThreadLoading(false)

    /* Marque comme lus les messages reçus */
    const unreadIds = (data ?? [])
      .filter((m: Message) => !m.read && m.sender_id !== user.id)
      .map((m: Message) => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ read: true }).in('id', unreadIds)
      /* Reset le compteur côté liste */
      setConversations(cs => cs.map(c =>
        c.student.id === studentId ? { ...c, unread: 0 } : c,
      ))
    }
  }, [supabase, user])

  /* ── Initial load ───────────────────────────────────── */
  useEffect(() => {
    if (user) loadConversations()
  }, [user, loadConversations])

  /* ── Auto-select première conversation (si aucun student_id en param) ── */
  useEffect(() => {
    if (!activeStudentId && conversations.length > 0) {
      setActiveStudent(conversations[0].student.id)
    }
  }, [conversations]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Charge le thread quand activeStudent change ────── */
  useEffect(() => {
    if (activeStudentId) loadThread(activeStudentId)
  }, [activeStudentId, loadThread])

  /* ── Charge la note quand activeStudent change ──────── */
  useEffect(() => {
    if (!activeStudentId) { setNote(''); return }
    fetch(`/api/coach/student-notes?student_id=${activeStudentId}`)
      .then(r => r.ok ? r.json() : { content: '' })
      .then(d => { setNote(d.content ?? ''); setNoteSaved('idle') })
      .catch(() => setNote(''))
  }, [activeStudentId])

  /* ── Auto-save note (debounce 1.5s) ────────────────── */
  const handleNoteChange = useCallback((val: string) => {
    setNote(val)
    setNoteSaved('saving')
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current)
    noteTimerRef.current = setTimeout(async () => {
      if (!activeStudentId) return
      try {
        await fetch('/api/coach/student-notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: activeStudentId, content: val }),
        })
        setNoteSaved('saved')
        setTimeout(() => setNoteSaved('idle'), 2000)
      } catch {
        setNoteSaved('idle')
      }
    }, 1500)
  }, [activeStudentId])

  /* ── Realtime subscription ──────────────────────────── */
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`coach-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `coach_id=eq.${user.id}` },
        (payload: { new: Message }) => {
          const m = payload.new as Message

          /* Si c'est dans le thread ouvert : push dans le thread */
          if (m.student_id === activeStudentId) {
            setThread(prev => {
              /* Évite les doublons (optimistic déjà inséré) */
              if (prev.some(x => x.id === m.id)) return prev
              /* Remplace le pending matching si existe (même contenu + pending) */
              const idx = prev.findIndex(x =>
                x.pending && x.sender_id === m.sender_id && x.content === m.content,
              )
              if (idx >= 0) {
                const next = [...prev]; next[idx] = m
                return next
              }
              return [...prev, m]
            })
            /* Auto-mark as read si reçu */
            if (m.sender_id !== user.id) {
              supabase.from('messages').update({ read: true }).eq('id', m.id)
            }
          }

          /* Met à jour la liste des conversations */
          setConversations(prev => {
            const existing = prev.find(c => c.student.id === m.student_id)
            if (existing) {
              const updated: Conversation = {
                ...existing,
                lastMessage: m,
                unread: m.sender_id !== user.id && m.student_id !== activeStudentId
                  ? existing.unread + 1
                  : existing.unread,
              }
              return [updated, ...prev.filter(c => c.student.id !== m.student_id)]
            }
            /* Nouvelle conversation : on déclenchera un reload pour récupérer le profil */
            loadConversations()
            return prev
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, user, activeStudentId, loadConversations])

  /* ── Scroll auto en bas du thread ───────────────────── */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    /* requestAnimationFrame pour attendre le layout */
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
  }, [thread, activeStudentId])

  /* ── Envoi message (optimistic) ─────────────────────── */
  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if (!content || !user || !activeStudentId || sending) return

    const tempId   = `tmp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      coach_id: user.id,
      student_id: activeStudentId,
      sender_id: user.id,
      content,
      read: false,
      created_at: new Date().toISOString(),
      pending: true,
    }

    setThread(prev => [...prev, optimistic])
    setDraft('')
    setSending(true)

    /* Refocus immédiat — UX iMessage */
    requestAnimationFrame(() => inputRef.current?.focus())

    const { data, error } = await supabase
      .from('messages')
      .insert({
        coach_id:   user.id,
        student_id: activeStudentId,
        sender_id:  user.id,
        content,
      })
      .select()
      .single()

    setSending(false)

    if (error || !data) {
      setThread(prev => prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m))
      return
    }

    /* Remplace l'optimistic par la version serveur */
    setThread(prev => prev.map(m => m.id === tempId ? (data as Message) : m))

    /* Met à jour la liste des conversations */
    setConversations(prev => {
      const sent = data as Message
      const existing = prev.find(c => c.student.id === activeStudentId)
      if (existing) {
        const updated: Conversation = { ...existing, lastMessage: sent }
        return [updated, ...prev.filter(c => c.student.id !== activeStudentId)]
      }
      return prev
    })
  }, [draft, user, activeStudentId, sending, supabase])

  /* ── Liste complète : élèves avec messages + sans messages ─ */
  const fullList = useMemo(() => {
    const withMsgs = new Set(conversations.map(c => c.student.id))
    const noMsg: Conversation[] = allStudents
      .filter(s => !withMsgs.has(s.id))
      .map(s => ({ student: s, lastMessage: null, unread: 0 }))
    return [...conversations, ...noMsg]
  }, [conversations, allStudents])

  /* ── Filtre liste ───────────────────────────────────── */
  const filteredConvs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return fullList
    return fullList.filter(c =>
      (c.student.username ?? '').toLowerCase().includes(q)
      || (c.lastMessage?.content ?? '').toLowerCase().includes(q),
    )
  }, [fullList, search])

  const activeConv = fullList.find(c => c.student.id === activeStudentId) ?? null

  /* ── Group thread par jour ──────────────────────────── */
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

  /* ── Loading state global ───────────────────────────── */
  if (userLoading) {
    return (
      <div style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: SILVER, fontSize: 13 }}>
        Chargement…
      </div>
    )
  }

  /* ════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════ */
  return (
    <div style={{
      height: 'calc(100vh - 64px)',
      display: 'flex',
      background: BG,
      color: CREAM,
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
      overflow: 'hidden',
    }}>
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes op-shimmer {
          0%   { background-position: -240px 0; }
          100% { background-position:  240px 0; }
        }
        .op-shimmer {
          background-image: linear-gradient(
            90deg,
            rgba(232,228,220,0.03) 0%,
            rgba(232,228,220,0.08) 50%,
            rgba(232,228,220,0.03) 100%
          );
          background-size: 480px 100%;
          animation: op-shimmer 1.4s linear infinite;
        }
        @keyframes op-pop {
          from { transform: translateY(4px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        .op-pop { animation: op-pop 180ms cubic-bezier(0.2, 0.7, 0.2, 1); }

        @keyframes op-pulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        .op-pulse { animation: op-pulse 1.4s ease-in-out infinite; }

        .op-thread::-webkit-scrollbar { width: 8px; }
        .op-thread::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
        .op-list::-webkit-scrollbar { width: 6px; }
        .op-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 4px; }

        .op-conv-row { transition: background 0.12s ease, border-color 0.12s ease; }
        .op-conv-row:hover { background: rgba(255,255,255,0.025); }
      `}</style>

      {/* ═══════════ COLONNE GAUCHE ═══════════ */}
      <aside style={{
        width: 320,
        flexShrink: 0,
        background: PANEL,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header liste */}
        <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: CREAM, letterSpacing: '-0.5px',
              margin: 0, fontFamily: 'var(--font-syne, sans-serif)',
            }}>
              Messages
            </h1>
            {fullList.length > 0 && (
              <span style={{ fontSize: 11, color: SILVER, fontVariantNumeric: 'tabular-nums' }}>
                {fullList.length}
              </span>
            )}
          </div>

          {/* Recherche */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '8px 11px',
          }}>
            <Search size={13} color={SILVER} strokeWidth={1.8} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un élève…"
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', border: 'none', outline: 'none',
                color: CREAM, fontSize: 13, padding: 0,
              }}
            />
          </div>
        </div>

        {/* Liste scrollable */}
        <div className="op-list" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {convLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => <ConvSkeleton key={i} />)}
            </>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Inbox size={20} color={MUTED} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 12, color: SILVER, margin: 0 }}>
                {search ? 'Aucun résultat' : 'Aucune conversation'}
              </p>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const active = conv.student.id === activeStudentId
              const isMine = conv.lastMessage?.sender_id === user?.id
              const hasMsg = conv.lastMessage !== null
              return (
                <button
                  key={conv.student.id}
                  onClick={() => setActiveStudent(conv.student.id)}
                  className="op-conv-row"
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: active ? 'rgba(124,58,237,0.10)' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${active ? VIOLET : 'transparent'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar name={conv.student.username} src={conv.student.avatar_url} size={42} />
                    {conv.unread > 0 && (
                      <span style={{
                        position: 'absolute', top: 0, right: 0,
                        width: 10, height: 10, borderRadius: '50%',
                        background: VIOLET,
                        border: `2px solid ${PANEL}`,
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: conv.unread > 0 ? 700 : 600,
                        color: CREAM,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {conv.student.username ?? 'Élève'}
                      </span>
                      {hasMsg && (
                        <span style={{
                          fontSize: 10, color: conv.unread > 0 ? VIOLET : SILVER,
                          flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                          fontWeight: conv.unread > 0 ? 700 : 400,
                        }}>
                          {formatRelative(conv.lastMessage!.created_at)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      {hasMsg ? (
                        <p style={{
                          flex: 1, minWidth: 0, margin: 0,
                          fontSize: 12,
                          color: conv.unread > 0 ? 'rgba(240,244,255,0.78)' : SILVER,
                          fontWeight: conv.unread > 0 ? 500 : 400,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {isMine && <span style={{ color: MUTED, marginRight: 4 }}>Vous :</span>}
                          {conv.lastMessage!.content}
                        </p>
                      ) : (
                        <p style={{
                          flex: 1, minWidth: 0, margin: 0,
                          fontSize: 11, color: MUTED, fontStyle: 'italic',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          Démarrer la conversation
                        </p>
                      )}
                      {conv.unread > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, padding: '0 6px',
                          borderRadius: 10,
                          background: VIOLET, color: '#fff',
                          fontSize: 10, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
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

      {/* ═══════════ COLONNE DROITE ═══════════ */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {/* Décor ambient */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 70%)',
        }} />

        {!activeConv ? (
          /* ─── Empty state global ─── */
          <div style={{
            position: 'relative', zIndex: 1,
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 32, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: `linear-gradient(135deg, ${VIOLET}22, ${CYAN}22)`,
              border: `1px solid ${BORDER_S}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 22,
            }}>
              <MessageSquare size={26} color={CREAM} strokeWidth={1.5} />
            </div>
            <h2 style={{
              fontSize: 22, fontWeight: 700, color: CREAM, letterSpacing: '-0.5px',
              margin: '0 0 8px', fontFamily: 'var(--font-syne, sans-serif)',
            }}>
              Vos échanges, au calme.
            </h2>
            <p style={{ fontSize: 13, color: SILVER, maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
              {fullList.length === 0
                ? 'Pas encore d\'élève. Dès qu\'un élève achètera une formation ou une session, il apparaîtra dans la liste.'
                : 'Sélectionnez un élève à gauche pour démarrer ou reprendre l\'échange.'}
            </p>
          </div>
        ) : (
          <>
            {/* ─── Header thread ─── */}
            <header style={{
              position: 'relative', zIndex: 1,
              height: 68, padding: '0 24px',
              borderBottom: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(10,10,20,0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              flexShrink: 0,
            }}>
              <Avatar
                name={activeConv.student.username}
                src={activeConv.student.avatar_url}
                size={40}
                ring
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: CREAM, letterSpacing: '-0.2px' }}>
                  {activeConv.student.username ?? 'Élève'}
                </div>
                <div style={{ fontSize: 11, color: SILVER, marginTop: 2 }}>
                  Élève · conversation privée
                </div>
              </div>
            </header>

            {/* ─── Notes élève ─── */}
            <div style={{
              position: 'relative', zIndex: 1, flexShrink: 0,
              borderBottom: `1px solid rgba(124,58,237,0.22)`,
              background: 'linear-gradient(90deg, rgba(124,58,237,0.10) 0%, rgba(6,182,212,0.04) 100%)',
            }}>
              <button
                onClick={() => setNoteOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: CREAM, fontSize: 12, fontWeight: 600,
                  textAlign: 'left', letterSpacing: '0.03em',
                }}
              >
                <NotebookPen size={14} color={VIOLET} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Notes privées</span>
                {noteSaved === 'saving' && (
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>enregistrement…</span>
                )}
                {noteSaved === 'saved' && (
                  <span style={{ fontSize: 10, color: VIOLET, fontWeight: 500 }}>✓ sauvegardé</span>
                )}
                {!noteOpen && note && (
                  <span style={{
                    fontSize: 11, color: SILVER, fontStyle: 'italic',
                    maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {note}
                  </span>
                )}
                {noteOpen
                  ? <ChevronUp size={13} color={SILVER} strokeWidth={2} style={{ flexShrink: 0 }} />
                  : <ChevronDown size={13} color={SILVER} strokeWidth={2} style={{ flexShrink: 0 }} />}
              </button>
              {noteOpen && (
                <div style={{ padding: '0 16px 14px' }}>
                  <textarea
                    value={note}
                    onChange={e => handleNoteChange(e.target.value)}
                    placeholder={`Niveau actuel, axes de travail, objectifs pour ${activeConv.student.username ?? 'cet élève'}…`}
                    rows={4}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid rgba(124,58,237,0.28)`,
                      borderRadius: 10,
                      color: CREAM, fontSize: 13, lineHeight: 1.6,
                      padding: '11px 14px',
                      resize: 'vertical', minHeight: 88, maxHeight: 240,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
              )}
            </div>

            {/* ─── Thread ─── */}
            <div
              ref={scrollRef}
              className="op-thread"
              style={{
                position: 'relative', zIndex: 1,
                flex: 1, overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              {threadLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <BubbleSkeleton side="l" />
                  <BubbleSkeleton side="r" />
                  <BubbleSkeleton side="l" />
                  <BubbleSkeleton side="r" />
                </div>
              ) : thread.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: SILVER, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
                    Démarrez la conversation avec{' '}
                    <strong style={{ color: CREAM, fontWeight: 600 }}>
                      {activeConv.student.username ?? 'cet élève'}
                    </strong>{' '}
                    — un message bienveillant fait toujours la différence.
                  </p>
                </div>
              ) : (
                grouped.map(group => (
                  <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Séparateur de jour */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 10px' }}>
                      <div style={{ flex: 1, height: 1, background: BORDER }} />
                      <span style={{
                        fontSize: 10, color: SILVER, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                        {group.label}
                      </span>
                      <div style={{ flex: 1, height: 1, background: BORDER }} />
                    </div>

                    {group.items.map((m, i) => {
                      const mine = m.sender_id === user?.id
                      const prev = group.items[i - 1]
                      const next = group.items[i + 1]
                      const sameAsPrev = prev && prev.sender_id === m.sender_id
                      const sameAsNext = next && next.sender_id === m.sender_id
                      const isLastInRun = !sameAsNext

                      return (
                        <div
                          key={m.id}
                          className="op-pop"
                          style={{
                            display: 'flex',
                            justifyContent: mine ? 'flex-end' : 'flex-start',
                            marginTop: sameAsPrev ? 2 : 8,
                          }}
                        >
                          <div style={{
                            maxWidth: '70%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: mine ? 'flex-end' : 'flex-start',
                            gap: 2,
                          }}>
                            <div style={{
                              padding: '9px 14px',
                              borderRadius: 18,
                              borderBottomRightRadius: mine && isLastInRun ? 5 : 18,
                              borderBottomLeftRadius:  !mine && isLastInRun ? 5 : 18,
                              background: mine
                                ? `linear-gradient(135deg, ${VIOLET}, #6d28d9)`
                                : 'rgba(255,255,255,0.06)',
                              color: mine ? '#fff' : CREAM,
                              fontSize: 14,
                              lineHeight: 1.45,
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap',
                              opacity: m.pending ? 0.65 : 1,
                              boxShadow: mine
                                ? '0 1px 0 rgba(0,0,0,0.2), 0 8px 24px -12px rgba(124,58,237,0.5)'
                                : 'none',
                              border: mine ? 'none' : `1px solid ${BORDER_S}`,
                            }}>
                              {m.content}
                            </div>
                            {/* Meta sous la dernière bulle d'une série */}
                            {isLastInRun && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 10, color: m.failed ? '#ef4444' : SILVER,
                                padding: '0 6px',
                              }}>
                                <span>
                                  {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </span>
                                {mine && (
                                  m.failed
                                    ? <span style={{ fontWeight: 600 }}>· Échec</span>
                                    : m.pending
                                      ? <span className="op-pulse">· envoi…</span>
                                      : m.read
                                        ? <CheckCheck size={11} strokeWidth={2.4} color={CYAN} />
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

            {/* ─── Composer ─── */}
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '14px 20px 18px',
              borderTop: `1px solid ${BORDER}`,
              background: 'rgba(10,10,20,0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 10,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORDER_S}`,
                borderRadius: 16,
                padding: '8px 8px 8px 14px',
                transition: 'border-color 0.15s',
              }}
                onFocus={e => (e.currentTarget.style.borderColor = `${VIOLET}55`)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER_S)}
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  rows={1}
                  placeholder={`Message à ${activeConv.student.username ?? 'l\'élève'}…`}
                  style={{
                    flex: 1, minWidth: 0,
                    resize: 'none',
                    background: 'transparent', border: 'none', outline: 'none',
                    color: CREAM, fontSize: 14, lineHeight: 1.45,
                    padding: '8px 0',
                    maxHeight: 140, minHeight: 22,
                    fontFamily: 'inherit',
                  }}
                  /* Auto-grow */
                  onInput={e => {
                    const t = e.currentTarget
                    t.style.height = 'auto'
                    t.style.height = Math.min(t.scrollHeight, 140) + 'px'
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  aria-label="Envoyer"
                  style={{
                    width: 38, height: 38, flexShrink: 0,
                    borderRadius: 12, border: 'none',
                    background: !draft.trim() || sending
                      ? 'rgba(255,255,255,0.05)'
                      : `linear-gradient(135deg, ${VIOLET}, #6d28d9)`,
                    color: !draft.trim() || sending ? MUTED : '#fff',
                    cursor: !draft.trim() || sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.12s, background 0.15s',
                    boxShadow: !draft.trim() || sending
                      ? 'none'
                      : '0 4px 16px -4px rgba(124,58,237,0.5)',
                  }}
                  onMouseDown={e => { if (!sending && draft.trim()) e.currentTarget.style.transform = 'scale(0.94)' }}
                  onMouseUp={e   => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Send size={15} strokeWidth={2.2} />
                </button>
              </div>
              <div style={{
                fontSize: 10, color: MUTED, marginTop: 8, paddingLeft: 4,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <kbd style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 3,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                  fontFamily: 'inherit', color: SILVER,
                }}>Entrée</kbd>
                pour envoyer
                <span style={{ opacity: 0.5 }}>·</span>
                <kbd style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 3,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                  fontFamily: 'inherit', color: SILVER,
                }}>Maj+Entrée</kbd>
                pour un saut de ligne
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default function CoachMessagesPage() {
  return <Suspense><CoachMessagesInner /></Suspense>
}
