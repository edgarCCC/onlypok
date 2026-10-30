'use client'
import { useMemo, useState } from 'react'
import { FileText, Tag, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CREAM, SILVER, VIOLET, CYAN, AMBER, GREEN, RED } from './request-ui'

const TAG_LIBRARY = [
  '3-bet preflop', '4-bet bluff', 'C-bet flop', 'Turn aggression', 'River value',
  'Bankroll management', 'Mental game', 'Tilt control', 'Hand reading', 'Blockers',
  'ICM', 'Bubble play', 'Final table', 'Heads-up dynamics', 'GTO basics',
  'Exploitative play', 'Range construction', 'Bet sizing', 'Solver work',
]

export interface SessionNotes {
  id: string | null
  notes: string
  tags: string[]
  progress_score: number | null
}

/* Notes de séance (table coaching_sessions) : ce qui a été travaillé,
   progression /10 et concepts. Ex-panneau dépliable de /coach/sessions. */
export default function SessionNotesEditor({ bookingId, coachId, studentId, initial, onSaved }: {
  bookingId: string
  coachId: string
  studentId: string
  initial: SessionNotes
  onSaved: (notes: SessionNotes) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [notes, setNotes]       = useState(initial.notes)
  const [tags, setTags]         = useState<string[]>(initial.tags)
  const [score, setScore]       = useState(initial.progress_score ?? 5)
  const [saving, setSaving]     = useState(false)
  const [status, setStatus]     = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const toggleTag = (tag: string) =>
    setTags(cur => cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag])

  const save = async () => {
    setSaving(true)
    setStatus('idle')
    const payload = { notes, tags, progress_score: score }
    const res = initial.id
      ? await supabase.from('coaching_sessions').update(payload).eq('id', initial.id).select('id').single()
      : await supabase.from('coaching_sessions')
          .insert({ ...payload, booking_id: bookingId, coach_id: coachId, student_id: studentId })
          .select('id').single()
    setSaving(false)
    if (res.error || !res.data) {
      console.error('[agenda] notes save failed:', res.error?.code, res.error?.message)
      // 23505 : une fiche existe déjà pour cette réservation (index unique booking_id)
      setErrorMsg(res.error?.code === '23505'
        ? 'Des notes existent déjà pour cette séance : rechargez la page.'
        : 'Échec de l\u2019enregistrement, réessayez.')
      setStatus('error')
      return
    }
    setStatus('saved')
    onSaved({ id: res.data.id, notes, tags, progress_score: score })
  }

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
  }

  return (
    <div style={{ padding: '4px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ marginTop: 16 }}>
        <label style={label} htmlFor={`notes-${bookingId}`}><FileText size={11} /> Notes de séance</label>
        <textarea
          id={`notes-${bookingId}`}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ce qu'on a travaillé, points d'amélioration, main remarquable…"
          rows={4}
          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: CREAM, fontSize: 13, lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={label}><TrendingUp size={11} /> Progression de l&apos;élève</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: CYAN }}>{score}<span style={{ fontSize: 11, color: SILVER }}> / 10</span></span>
        </div>
        <input type="range" min={1} max={10} step={1} value={score} aria-label="Progression sur 10"
          onChange={e => setScore(Number(e.target.value))}
          style={{ width: '100%', accentColor: CYAN, cursor: 'pointer' }} />
      </div>

      <div style={{ marginTop: 18 }}>
        <span style={label}><Tag size={11} /> Concepts travaillés</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TAG_LIBRARY.map(tag => {
            const active = tags.includes(tag)
            return (
              <button key={tag} onClick={() => toggleTag(tag)} aria-pressed={active}
                style={{ padding: '5px 11px', borderRadius: 99, fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${active ? AMBER + '60' : 'rgba(255,255,255,0.1)'}`, background: active ? `${AMBER}18` : 'transparent', color: active ? AMBER : SILVER }}>
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        {status === 'saved' && <span role="status" style={{ fontSize: 12, color: GREEN }}>Notes enregistrées</span>}
        {status === 'error' && <span role="alert" style={{ fontSize: 12, color: RED }}>{errorMsg}</span>}
        <button onClick={save} disabled={saving}
          style={{ padding: '9px 22px', borderRadius: 10, background: `linear-gradient(135deg,${VIOLET},${CYAN})`, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
        </button>
      </div>
    </div>
  )
}
