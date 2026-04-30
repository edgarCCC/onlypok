'use client'
import { useEffect, useState, useMemo } from 'react'
import { X, FileText, MessageSquare, Send, Sparkles, Maximize2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const MindMap = dynamic(() => import('@/components/MindMap'), { ssr: false })

const C = '#f0f4ff', S = 'rgba(240,244,255,0.45)', D = 'rgba(240,244,255,0.2)', V = '#7c3aed'
const MAX_SYNTH = 3

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
  return url
}

export default function VideoStudio({ video, onClose }: { video: { url: string; title: string }; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const embedUrl = getEmbedUrl(video.url)
  const isNative = !video.url.match(/youtube|youtu\.be|vimeo/)
  const noteKey  = `onlypok_note_${video.url.slice(-60)}`
  const synthKey = `onlypok_synth_${video.url.slice(-60)}`

  const [tab,               setTab]               = useState<'notes' | 'comments'>('notes')
  const [notes,             setNotes]             = useState('')
  const [comments,          setComments]          = useState<any[]>([])
  const [newComment,        setNewComment]        = useState('')
  const [authUser,          setAuthUser]          = useState<any>(null)
  const [posting,           setPosting]           = useState(false)
  const [mindmap,           setMindmap]           = useState<string | null>(null)
  const [synthesizing,      setSynthesizing]      = useState(false)
  const [showMindmap,       setShowMindmap]       = useState(false)
  const [fullscreenMindmap, setFullscreenMindmap] = useState(false)
  const [synthCount,        setSynthCount]        = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotes(localStorage.getItem(noteKey) ?? '')
      setSynthCount(parseInt(localStorage.getItem(synthKey) ?? '0', 10))
    }
    supabase.auth.getUser().then(({ data: d }) => setAuthUser(d.user))
    supabase.from('video_comments')
      .select('*, profile:profiles!student_id(username)')
      .eq('video_url', video.url)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(data) })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const saveNote = (val: string) => {
    setNotes(val)
    if (typeof window !== 'undefined') localStorage.setItem(noteKey, val)
  }

  const synthesize = async () => {
    if (!notes.trim() || synthesizing || synthCount >= MAX_SYNTH) return
    setSynthesizing(true)
    try {
      const res = await fetch('/api/ai/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, title: video.title }),
      })
      const { markdown } = await res.json()
      if (markdown) {
        setMindmap(markdown)
        setShowMindmap(true)
        const next = synthCount + 1
        setSynthCount(next)
        localStorage.setItem(synthKey, String(next))
      }
    } finally {
      setSynthesizing(false)
    }
  }

  const postComment = async () => {
    if (!authUser || !newComment.trim() || posting) return
    setPosting(true)
    const { data } = await supabase.from('video_comments')
      .insert({ student_id: authUser.id, video_url: video.url, content: newComment.trim() })
      .select('*, profile:profiles(username)').single()
    if (data) setComments(c => [...c, data])
    setNewComment('')
    setPosting(false)
  }

  return (
    <>
      <style>{`
        @keyframes studioIn { from { opacity:0; transform:scale(0.98); } to { opacity:1; transform:scale(1); } }
        @keyframes mindmapIn { from { opacity:0; transform:scale(0.98); } to { opacity:1; transform:scale(1); } }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#04040a', display: 'flex', flexDirection: 'column', animation: 'studioIn 0.18s ease' }}>

        {/* ── Header ── */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: C }}>ONLYPOK</span>
          </div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,244,255,0.65)', margin: 0, maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.title}
          </h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: S, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Mind map plein écran ── */}
        {fullscreenMindmap && mindmap && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'linear-gradient(160deg,#07070f 0%,#04040a 60%,#080812 100%)', display: 'flex', flexDirection: 'column', animation: 'mindmapIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
              <div style={{ position: 'absolute', top: '15%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
              <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            </div>
            <div style={{ position: 'relative', zIndex: 1, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,15,0.7)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: 2, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 8px rgba(124,58,237,0.6)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(240,244,255,0.5)', textTransform: 'uppercase' }}>Mind Map</span>
                <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#EDEDEF', maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</span>
              </div>
              <button onClick={() => setFullscreenMindmap(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(240,244,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#EDEDEF' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(240,244,255,0.5)' }}>
                <X size={12} /> Fermer
              </button>
            </div>
            <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, padding: '8px 0' }}>
              <MindMap markdown={mindmap} />
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* Player */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', background: '#020207', minWidth: 0 }}>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
              {isNative
                ? <video src={video.url} controls autoPlay style={{ width: '100%', height: '100%', display: 'block' }} />
                : <iframe src={embedUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
              }
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div style={{ width: 360, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#080810', flexShrink: 0 }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              {([
                { id: 'notes' as const,    label: 'Notes',        Icon: FileText },
                { id: 'comments' as const, label: 'Commentaires', Icon: MessageSquare },
              ]).map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setTab(id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px 8px', fontSize: 13, fontWeight: tab === id ? 700 : 400, color: tab === id ? C : S, background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === id ? V : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

              {tab === 'notes' ? (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 16, gap: 10 }}>

                  {/* Toggle Notes / Mind map */}
                  {mindmap && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flex: 1, gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
                        {(['notes', 'mindmap'] as const).map(v => (
                          <button key={v} onClick={() => setShowMindmap(v === 'mindmap')}
                            style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: (v === 'mindmap') === showMindmap ? 'rgba(124,58,237,0.3)' : 'transparent', color: (v === 'mindmap') === showMindmap ? C : S, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {v === 'notes' ? 'Notes' : 'Mind map'}
                          </button>
                        ))}
                      </div>
                      {showMindmap && (
                        <button onClick={() => setFullscreenMindmap(true)} title="Plein écran"
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: S, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = C; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = S; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>
                          <Maximize2 size={13} />
                        </button>
                      )}
                    </div>
                  )}

                  {showMindmap && mindmap ? (
                    <div style={{ flex: 1, minHeight: 0, borderRadius: 10, overflow: 'hidden', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <MindMap markdown={mindmap} />
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: 11, color: D, margin: 0, lineHeight: 1.5, flexShrink: 0 }}>
                        Sauvegardées automatiquement sur cet appareil.
                      </p>
                      <textarea
                        value={notes}
                        onChange={e => saveNote(e.target.value)}
                        placeholder="Prenez des notes sur cette vidéo…&#10;&#10;Concepts clés, mains marquantes, points à retravailler…"
                        style={{ flex: 1, minHeight: 280, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: C, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        {notes.length > 0 && <p style={{ fontSize: 11, color: D, margin: 0 }}>{notes.length} car.</p>}
                        <button onClick={synthesize} disabled={synthesizing || notes.trim().length === 0 || synthCount >= MAX_SYNTH}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: synthCount >= MAX_SYNTH || notes.trim().length === 0 || synthesizing ? 'rgba(124,58,237,0.1)' : 'linear-gradient(135deg,rgba(124,58,237,0.6),rgba(6,182,212,0.4))', color: synthCount >= MAX_SYNTH || notes.trim().length === 0 ? S : C, fontSize: 12, fontWeight: 700, cursor: synthCount >= MAX_SYNTH || notes.trim().length === 0 || synthesizing ? 'default' : 'pointer', transition: 'all 0.2s', opacity: synthesizing ? 0.7 : 1, marginLeft: 'auto' }}>
                          <Sparkles size={12} />
                          {synthesizing ? 'Synthèse…' : synthCount >= MAX_SYNTH ? `Limite (${MAX_SYNTH}/${MAX_SYNTH})` : `Synthétiser avec IA${synthCount > 0 ? ` (${synthCount}/${MAX_SYNTH})` : ''}`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 16, gap: 10 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                    {comments.length === 0 ? (
                      <p style={{ color: D, fontSize: 13, textAlign: 'center', margin: '32px 0' }}>Aucun commentaire encore.</p>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>{c.profile?.username ?? 'Anonyme'}</span>
                            <span style={{ fontSize: 10, color: D }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p style={{ fontSize: 13, color: S, margin: 0, lineHeight: 1.55 }}>{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, flexShrink: 0 }}>
                    {authUser ? (
                      <>
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                          placeholder="Ajoutez un commentaire…" rows={3}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: C, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.55 }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')} />
                        <button onClick={postComment} disabled={!newComment.trim() || posting}
                          style={{ marginTop: 8, width: '100%', padding: '9px', background: newComment.trim() ? V : 'rgba(124,58,237,0.15)', border: 'none', borderRadius: 8, color: newComment.trim() ? '#fff' : S, fontSize: 13, fontWeight: 600, cursor: newComment.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>
                          <Send size={13} /> {posting ? 'Envoi…' : 'Publier'}
                        </button>
                        <p style={{ fontSize: 11, color: D, margin: '6px 0 0', textAlign: 'center' }}>⌘ + Entrée pour publier</p>
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: D, textAlign: 'center', margin: 0 }}>
                        <Link href="/register" style={{ color: '#a78bfa', textDecoration: 'none' }}>Créez un compte</Link> pour commenter.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
