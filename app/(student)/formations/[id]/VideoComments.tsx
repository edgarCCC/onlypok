'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { CREAM, SILVER } from './shared'

/* ─── Video Comments ────────────────────────────────────────────────────────── */
export default function VideoComments({ formationId, coachId, videoUrl }: { formationId: string; coachId: string; videoUrl?: string }) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [comments, setComments]   = useState<any[]>([])
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = async () => {
    setLoadError(false)
    let query = supabase
      .from('video_comments')
      .select('id, content, created_at, student_id')
      .order('created_at', { ascending: false })
    query = videoUrl ? query.eq('video_url', videoUrl) : query.eq('formation_id', formationId)
    const { data, error } = await query
    if (error) { setLoadError(true); setComments([]); return }
    if (!data?.length) { setComments([]); return }
    const studentIds = [...new Set(data.map((c: any) => c.student_id).filter(Boolean))]
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', studentIds)
    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) profileMap[p.id] = p.username
    setComments(data.map((c: any) => ({ ...c, student: { username: profileMap[c.student_id] ?? null } })))
  }

  useEffect(() => { load() }, [formationId, videoUrl])

  const submit = async () => {
    if (!text.trim() || !user) return
    setSending(true)
    const payload: any = {
      coach_id:   coachId,
      student_id: user.id,
      content:    text.trim(),
    }
    if (videoUrl) { payload.video_url = videoUrl } else { payload.formation_id = formationId }
    await supabase.from('video_comments').insert(payload)
    setText('')
    await load()
    setSending(false)
  }

  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px', marginBottom: 24 }}>Commentaires</h2>

      {/* Formulaire */}
      {user && (
        <div style={{ marginBottom: 32 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Laisse un commentaire…"
            rows={3}
            style={{
              width: '100%', background: 'color-mix(in srgb, var(--overlay) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--overlay) 8%, transparent)',
              borderRadius: 12, padding: '14px 16px', color: CREAM, fontSize: 14, lineHeight: 1.6,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            style={{
              marginTop: 8, padding: '9px 20px', borderRadius: 10, border: 'none',
              background: text.trim() ? 'var(--brand)' : 'color-mix(in srgb, var(--overlay) 6%, transparent)',
              color: text.trim() ? 'var(--on-brand)' : SILVER,
              fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', transition: 'all 0.15s',
            }}
          >
            {sending ? 'Envoi…' : 'Commenter'}
          </button>
        </div>
      )}

      {/* Liste */}
      {loadError ? (
        <p style={{ color: 'var(--brand)', fontSize: 12 }}>Les commentaires sont temporairement indisponibles. Un admin doit activer la politique RLS sur video_comments via /coach/admin.</p>
      ) : comments.length === 0 ? (
        <p style={{ color: SILVER, fontSize: 13 }}>Pas encore de commentaires — sois le premier !</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {comments.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '20px 0', borderBottom: '1px solid color-mix(in srgb, var(--overlay) 4%, transparent)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'color-mix(in srgb, var(--brand) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: CREAM, flexShrink: 0 }}>
                {(c.student?.username ?? '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{c.student?.username ?? 'Élève'}</span>
                  <span style={{ fontSize: 11, color: SILVER }}>
                    {Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000) === 0
                      ? "aujourd'hui"
                      : `il y a ${Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)}j`}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
