'use client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Check, Save, Loader2, CheckCircle, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ─── Tokens ─────────────────────────────────────── */
const BG      = '#07090e'
const SURFACE = 'rgba(255,255,255,0.028)'
const SURFACE_HI = 'rgba(255,255,255,0.048)'
const BORDER  = 'rgba(255,255,255,0.07)'
const BORDER_H = 'rgba(255,255,255,0.13)'
const CREAM   = '#f0f4ff'
const MID     = 'rgba(240,244,255,0.5)'
const DIM     = 'rgba(240,244,255,0.22)'
const CYAN    = '#06b6d4'
const VIOLET  = '#7c3aed'
const AMBER   = '#f59e0b'
const EMER    = '#10b981'

type Question = { id: string; text: string; checked: boolean }
type HandHistory = { id: string; ref: string; comment: string }
type SaveState = 'idle' | 'saving' | 'saved'

function uid() { return Math.random().toString(36).slice(2) }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function PrepPage() {
  const { bookingId } = useParams() as { bookingId: string }
  const router        = useRouter()
  const supabase      = useMemo(() => createClient(), [])

  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'prep' | 'notes'>('prep')
  const [saveState,   setSaveState]   = useState<SaveState>('idle')

  /* booking + coach info */
  const [formationTitle, setFormationTitle] = useState('')
  const [coachName,      setCoachName]      = useState('')
  const [coachAvatar,    setCoachAvatar]    = useState<string | null>(null)
  const [scheduledAt,    setScheduledAt]    = useState<string | null>(null)
  const [isPast,         setIsPast]         = useState(false)

  /* prep data */
  const [questions,   setQuestions]   = useState<Question[]>([])
  const [handHistories, setHH]        = useState<HandHistory[]>([])
  const [prepNotes,   setPrepNotes]   = useState('')
  const [sessionNotes, setSessionNotes] = useState('')

  /* new question input */
  const [newQ, setNewQ] = useState('')
  const newQRef = useRef<HTMLInputElement>(null)

  const studentIdRef = useRef<string | null>(null)
  const prepIdRef    = useRef<string | null>(null)
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Load ──────────────────────────────────────── */
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      studentIdRef.current = user.id

      const { data: booking } = await supabase
        .from('bookings')
        .select('id, scheduled_at, status, coach_id, formation_id, student_id')
        .eq('id', bookingId)
        .single()

      if (!booking || booking.student_id !== user.id) {
        router.push('/schedule')
        return
      }

      setScheduledAt(booking.scheduled_at ?? null)
      setIsPast(!!booking.scheduled_at && new Date(booking.scheduled_at) < new Date())

      const [{ data: formation }, { data: coach }] = await Promise.all([
        booking.formation_id
          ? supabase.from('formations').select('title').eq('id', booking.formation_id).single()
          : Promise.resolve({ data: null }),
        booking.coach_id
          ? supabase.from('profiles').select('username, avatar_url').eq('id', booking.coach_id).single()
          : Promise.resolve({ data: null }),
      ])

      setFormationTitle(formation?.title ?? 'Session de coaching')
      setCoachName(coach?.username ?? 'Coach')
      setCoachAvatar((coach as any)?.avatar_url ?? null)

      const { data: prep } = await supabase
        .from('coaching_prep')
        .select('id, questions, hand_histories, prep_notes, session_notes')
        .eq('booking_id', bookingId)
        .eq('student_id', user.id)
        .maybeSingle()

      if (prep) {
        prepIdRef.current = prep.id
        setQuestions(Array.isArray(prep.questions) ? prep.questions : [])
        setHH(Array.isArray(prep.hand_histories) ? prep.hand_histories : [])
        setPrepNotes(prep.prep_notes ?? '')
        setSessionNotes(prep.session_notes ?? '')
      } else {
        const { data: created } = await supabase
          .from('coaching_prep')
          .insert({ booking_id: bookingId, student_id: user.id })
          .select('id')
          .single()
        if (created) prepIdRef.current = created.id
      }

      setLoading(false)
    })()
  }, [supabase, router, bookingId])

  /* ── Autosave (debounced) ────────────────────────── */
  const save = useCallback(async (
    qs: Question[], hhs: HandHistory[], pn: string, sn: string
  ) => {
    if (!prepIdRef.current || !studentIdRef.current) return
    setSaveState('saving')
    await supabase
      .from('coaching_prep')
      .update({
        questions: qs, hand_histories: hhs,
        prep_notes: pn, session_notes: sn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prepIdRef.current)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }, [supabase])

  const scheduleSave = useCallback((
    qs: Question[], hhs: HandHistory[], pn: string, sn: string
  ) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(qs, hhs, pn, sn), 1500)
  }, [save])

  /* ── Questions helpers ─────────────────────────── */
  const addQuestion = () => {
    if (!newQ.trim()) return
    const updated = [...questions, { id: uid(), text: newQ.trim(), checked: false }]
    setQuestions(updated)
    setNewQ('')
    scheduleSave(updated, handHistories, prepNotes, sessionNotes)
  }

  const toggleQuestion = (id: string) => {
    const updated = questions.map(q => q.id === id ? { ...q, checked: !q.checked } : q)
    setQuestions(updated)
    scheduleSave(updated, handHistories, prepNotes, sessionNotes)
  }

  const deleteQuestion = (id: string) => {
    const updated = questions.filter(q => q.id !== id)
    setQuestions(updated)
    scheduleSave(updated, handHistories, prepNotes, sessionNotes)
  }

  const moveQuestion = (id: string, dir: -1 | 1) => {
    const idx = questions.findIndex(q => q.id === id)
    const next = idx + dir
    if (next < 0 || next >= questions.length) return
    const updated = [...questions]
    ;[updated[idx], updated[next]] = [updated[next], updated[idx]]
    setQuestions(updated)
    scheduleSave(updated, handHistories, prepNotes, sessionNotes)
  }

  /* ── Hand History helpers ───────────────────────── */
  const addHH = () => {
    const updated = [...handHistories, { id: uid(), ref: '', comment: '' }]
    setHH(updated)
    scheduleSave(questions, updated, prepNotes, sessionNotes)
  }

  const updateHH = (id: string, field: 'ref' | 'comment', val: string) => {
    const updated = handHistories.map(h => h.id === id ? { ...h, [field]: val } : h)
    setHH(updated)
    scheduleSave(questions, updated, prepNotes, sessionNotes)
  }

  const deleteHH = (id: string) => {
    const updated = handHistories.filter(h => h.id !== id)
    setHH(updated)
    scheduleSave(questions, updated, prepNotes, sessionNotes)
  }

  /* ── Manual save ────────────────────────────────── */
  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    save(questions, handHistories, prepNotes, sessionNotes)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={22} color={CYAN} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: 10, padding: '10px 14px', color: CREAM, fontSize: 13,
    outline: 'none', resize: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px clamp(16px,3vw,40px) 120px' }}>

        {/* ── Back + header ─────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <Link href="/schedule" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MID, textDecoration: 'none', fontSize: 13, marginBottom: 24, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = CREAM}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = MID}>
            <ArrowLeft size={14} /> Retour au planning
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: CREAM, letterSpacing: '-0.8px', margin: '0 0 12px' }}>
                Prépare ta session
              </h1>

              {/* Coach info row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${CYAN},${VIOLET})`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', border: `1.5px solid rgba(6,182,212,0.3)`, flexShrink: 0, position: 'relative' }}>
                  {coachAvatar
                    ? <Image src={coachAvatar} alt="" fill sizes="32px" style={{ objectFit: 'cover' }} />
                    : coachName[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: CREAM, margin: 0 }}>{formationTitle}</p>
                  <p style={{ fontSize: 12, color: MID, margin: 0 }}>
                    avec <span style={{ color: CREAM }}>{coachName}</span>
                    {scheduledAt && <> · <span style={{ textTransform: 'capitalize' }}>{fmtDate(scheduledAt)} à {fmtTime(scheduledAt)}</span></>}
                  </p>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 99,
              background: isPast ? 'rgba(240,244,255,0.06)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${isPast ? BORDER : 'rgba(16,185,129,0.25)'}`,
            }}>
              {isPast
                ? <><Clock size={12} color={MID} /><span style={{ fontSize: 11, fontWeight: 700, color: MID }}>Session passée</span></>
                : <><div style={{ width: 6, height: 6, borderRadius: '50%', background: EMER, boxShadow: `0 0 6px ${EMER}` }} /><span style={{ fontSize: 11, fontWeight: 700, color: EMER }}>Planifiée</span></>
              }
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 32, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {(['prep', 'notes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: tab === t ? SURFACE_HI : 'transparent',
              color: tab === t ? CREAM : DIM,
              fontSize: 13, fontWeight: tab === t ? 600 : 500,
              transition: 'all 0.15s',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}>
              {t === 'prep' ? 'Préparer' : 'Notes de session'}
            </button>
          ))}
        </div>

        {/* ── TAB 1: Préparer ───────────────────── */}
        {tab === 'prep' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Questions */}
            <section>
              <SectionLabel label="Questions à poser" accent={CYAN} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: SURFACE, border: `1px solid ${BORDER}`, transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = BORDER_H}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = BORDER}>
                    {/* Checkbox */}
                    <button onClick={() => toggleQuestion(q.id)} style={{
                      width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${q.checked ? EMER : BORDER_H}`,
                      background: q.checked ? EMER : 'transparent', cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}>
                      {q.checked && <Check size={10} color="#fff" strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: q.checked ? DIM : CREAM, textDecoration: q.checked ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                      {q.text}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <IconBtn onClick={() => moveQuestion(q.id, -1)} disabled={i === 0}><ChevronUp size={12} /></IconBtn>
                      <IconBtn onClick={() => moveQuestion(q.id, 1)} disabled={i === questions.length - 1}><ChevronDown size={12} /></IconBtn>
                      <IconBtn onClick={() => deleteQuestion(q.id)} danger><Trash2 size={12} /></IconBtn>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add question input */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={newQRef}
                  value={newQ}
                  onChange={e => setNewQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuestion()}
                  placeholder="Nouvelle question..."
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = BORDER_H}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = BORDER}
                />
                <button onClick={addQuestion} disabled={!newQ.trim()} style={{
                  padding: '10px 16px', borderRadius: 10, border: 'none', cursor: newQ.trim() ? 'pointer' : 'not-allowed',
                  background: newQ.trim() ? CYAN : SURFACE, color: newQ.trim() ? '#000' : DIM,
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s', flexShrink: 0,
                }}>
                  <Plus size={13} /> Ajouter
                </button>
              </div>
            </section>

            {/* Hand Histories */}
            <section>
              <SectionLabel label="Hand Histories à revoir" accent={VIOLET} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                {handHistories.map(hh => (
                  <div key={hh.id} style={{ padding: '14px', borderRadius: 12, background: SURFACE, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={hh.ref}
                        onChange={e => updateHH(hh.id, 'ref', e.target.value)}
                        placeholder="Lien ou référence de la main..."
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={e => (e.target as HTMLInputElement).style.borderColor = BORDER_H}
                        onBlur={e => (e.target as HTMLInputElement).style.borderColor = BORDER}
                      />
                      <IconBtn onClick={() => deleteHH(hh.id)} danger><Trash2 size={12} /></IconBtn>
                    </div>
                    <textarea
                      value={hh.comment}
                      onChange={e => updateHH(hh.id, 'comment', e.target.value)}
                      placeholder="Ce que tu veux analyser, le contexte..."
                      rows={2}
                      style={{ ...inputStyle }}
                      onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = BORDER_H}
                      onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = BORDER}
                    />
                  </div>
                ))}
              </div>
              <button onClick={addHH} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10, border: `1px solid ${BORDER}`,
                background: SURFACE, color: MID, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = BORDER_H; el.style.color = CREAM }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = BORDER; el.style.color = MID }}>
                <Plus size={13} /> Ajouter une HH
              </button>
            </section>

            {/* Prep notes */}
            <section>
              <SectionLabel label="Notes de préparation" accent={AMBER} />
              <textarea
                value={prepNotes}
                onChange={e => {
                  setPrepNotes(e.target.value)
                  scheduleSave(questions, handHistories, e.target.value, sessionNotes)
                }}
                placeholder="Contexte, objectifs de la session, points de travail prioritaires..."
                rows={5}
                style={{ ...inputStyle }}
                onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = BORDER_H}
                onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = BORDER}
              />
            </section>
          </div>
        )}

        {/* ── TAB 2: Notes de session ────────────── */}
        {tab === 'notes' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <SectionLabel label="Notes prises pendant le coaching" accent={EMER} />
              <p style={{ fontSize: 12, color: DIM, margin: '4px 0 0' }}>
                {isPast ? 'Session terminée — notes en lecture seule' : 'Sauvegarde automatique activée'}
              </p>
            </div>
            <textarea
              value={sessionNotes}
              readOnly={isPast}
              onChange={e => {
                if (isPast) return
                setSessionNotes(e.target.value)
                scheduleSave(questions, handHistories, prepNotes, e.target.value)
              }}
              placeholder={isPast ? '' : "Tes notes ici — positions, concepts, leçons clés..."}
              rows={16}
              style={{
                ...inputStyle,
                minHeight: 320,
                lineHeight: 1.65,
                opacity: isPast ? 0.7 : 1,
                cursor: isPast ? 'default' : 'text',
              }}
              onFocus={e => { if (!isPast) (e.target as HTMLTextAreaElement).style.borderColor = BORDER_H }}
              onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = BORDER}
            />
          </div>
        )}
      </div>

      {/* ── Sticky footer bar ─────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(7,9,14,0.95)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${BORDER}`,
        padding: '14px clamp(16px,3vw,40px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* Save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saveState === 'saving' && (
            <><Loader2 size={13} color={DIM} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 12, color: DIM }}>Sauvegarde…</span></>
          )}
          {saveState === 'saved' && (
            <><CheckCircle size={13} color={EMER} />
            <span style={{ fontSize: 12, color: EMER }}>Sauvegardé</span></>
          )}
          {saveState === 'idle' && (
            <span style={{ fontSize: 12, color: DIM }}>Autosave actif</span>
          )}
        </div>

        {!isPast && (
          <button onClick={handleManualSave} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: VIOLET, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}>
            <Save size={14} /> Enregistrer
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────── */
function SectionLabel({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />
      <h3 style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 14, fontWeight: 700, color: CREAM, margin: 0, letterSpacing: '-0.2px' }}>{label}</h3>
    </div>
  )
}

function IconBtn({
  onClick, disabled, danger, children,
}: {
  onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 26, height: 26, borderRadius: 7, border: `1px solid ${BORDER}`,
        background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: disabled ? DIM : danger ? '#ef4444' : MID,
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { if (!disabled) { const el = e.currentTarget; el.style.background = danger ? 'rgba(239,68,68,0.1)' : SURFACE_HI; el.style.borderColor = BORDER_H } }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.borderColor = BORDER }}
    >
      {children}
    </button>
  )
}
