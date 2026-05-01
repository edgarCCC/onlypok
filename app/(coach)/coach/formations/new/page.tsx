'use client'
import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, Plus, Trash2, ZoomIn, ZoomOut, Video, Check } from 'lucide-react'
import PublishOverlay from '@/components/PublishOverlay'
import { HIGHLIGHTS } from '@/lib/highlights'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'

const TABS = [
  { id: 'formation', label: 'Formation', color: '#7c3aed', desc: 'Chapitres & leçons structurés' },
  { id: 'video',     label: 'Vidéo',     color: '#06b6d4', desc: 'Vidéo standalone accessible' },
  { id: 'coaching',  label: 'Coaching',  color: '#f59e0b', desc: 'Session coaching avec packs' },
]

const VARIANTS = ['MTT', 'Cash', 'Expresso', 'Autre']
const LEVELS_BY_VARIANT: Record<string, { value: string; label: string }[]> = {
  MTT:      [{ value:'Débutant', label:'Débutant — ABI ≤ 5€' }, { value:'Intermédiaire', label:'Intermédiaire — ABI 5–20€' }, { value:'Avancé', label:'Avancé — ABI > 20€' }],
  Cash:     [{ value:'Débutant', label:'Débutant — NL2 à NL10' }, { value:'Intermédiaire', label:'Intermédiaire — NL25–NL100' }, { value:'Avancé', label:'Avancé — NL200+' }],
  Expresso: [{ value:'Débutant', label:'Débutant — ABI ≤ 5€' }, { value:'Intermédiaire', label:'Intermédiaire — ABI 5–20€' }, { value:'Avancé', label:'Avancé — ABI > 20€' }],
  Autre:    [{ value:'Débutant', label:'Débutant' }, { value:'Intermédiaire', label:'Intermédiaire' }, { value:'Avancé', label:'Avancé' }],
}

const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 16px', color: CREAM, fontSize: 14, outline: 'none', fontFamily: 'inherit' }

type Pack    = { label: string, hours: number, price: number, desc: string }
type Lesson  = { title: string, video_url: string, is_free: boolean }
type Chapter = { lessons: Lesson[] }

export default function NewFormationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#04040a' }} />}>
      <NewFormationInner />
    </Suspense>
  )
}

function NewFormationInner() {
  const supabase     = useMemo(() => createClient(), [])
  const { user }     = useUser()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const initTab      = (searchParams.get('type') as 'formation'|'video'|'coaching') ?? 'formation'

  const [tab, setTab]             = useState<'formation'|'video'|'coaching'>(initTab)
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [price, setPrice]         = useState(0)
  const [level, setLevel]         = useState('Débutant')
  const [variant, setVariant]     = useState('MTT')
  const [videoUrl, setVideoUrl]   = useState('')
  const [calUrl, setCalUrl]       = useState('')
  const [miniature, setMiniature] = useState<File|null>(null)
  const [thumbPreview, setThumbPreview] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [publishOnCreate, setPublishOnCreate] = useState(false)
  const [showCalTuto, setShowCalTuto]         = useState(false)
  const [showOverlay, setShowOverlay]         = useState(false)
  const [createdTitle, setCreatedTitle]       = useState('')
  const [isDirty, setIsDirty]                 = useState(false)
  const [showLeaveModal, setShowLeaveModal]   = useState(false)
  const [pendingHref, setPendingHref]         = useState('')

  // Chapitres — Chapitre 1 déjà créé et débloqué
  const [chapters, setChapters] = useState<Chapter[]>([{ lessons: [{ title: '', video_url: '', is_free: true }] }])

  // Crop miniature
  const [cropMode, setCropMode]   = useState(false)
  const [zoom, setZoom]           = useState(1)
  const [position, setPosition]   = useState({ x: 50, y: 50 })
  const [dragging, setDragging]   = useState(false)
  const dragStart                 = useRef({ x: 0, y: 0, px: 50, py: 50 })

  const markDirty = useCallback(() => setIsDirty(true), [])

  const [highlights, setHighlights] = useState<string[]>([])

  const [packs, setPacks] = useState<Pack[]>([
    { label: 'Starter',     hours: 1,  price: 80,  desc: "1 session d'1h pour démarrer" },
    { label: 'Progression', hours: 5,  price: 350, desc: '5 sessions pour progresser vite' },
    { label: 'Elite',       hours: 10, price: 600, desc: '10 sessions — engagement total' },
  ])

  const activeTab = TABS.find(t => t.id === tab)!

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMiniature(file)
    setThumbPreview(URL.createObjectURL(file))
    setCropMode(true)
    setZoom(1)
    setPosition({ x: 50, y: 50 })
    markDirty()
  }

  const uploadMiniature = async (): Promise<string|null> => {
    if (!miniature || !user) return null
    const ext  = miniature.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('formations-thumbnails').upload(path, miniature, { upsert: true })
    if (upErr) { setError('Erreur upload : ' + upErr.message); return null }
    const { data } = supabase.storage.from('formations-thumbnails').getPublicUrl(path)
    return data.publicUrl
  }

  const doInsert = async (published: boolean) => {
    if (!user || !title.trim()) return null
    const thumbnail_url = miniature ? await uploadMiniature() : null
    if (miniature && !thumbnail_url) return null

    const payload: any = {
      coach_id: user.id, title, description: desc, short_desc: shortDesc,
      price: Number(price), level, variant, thumbnail_url,
      published, content_type: tab, duration_minutes: 0,
      modules_count: tab === 'formation' ? chapters.length : 0,
      thumbnail_crop: { zoom, x: position.x, y: position.y },
    }
    if (tab === 'video')    payload.video_url = videoUrl || null
    if (tab === 'coaching') { payload.coaching_packs = packs; payload.cal_url = calUrl || null }
    if (highlights.length > 0) payload.highlights = highlights

    const { data, error: err } = await supabase.from('formations').insert(payload).select().single()
    if (err) { setError('Erreur formation : ' + err.message); return null }

    /* Insérer chapitres + leçons en attendant chaque réponse */
    if (tab === 'formation' && data) {
      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci]
        const { data: chData, error: chErr } = await supabase.from('formation_chapters').insert({
          formation_id: data.id,
          title: `Chapitre ${ci + 1}`,
          order_index: ci,
        }).select().single()
        if (chErr) { setError(`Chapitre ${ci + 1} : ${chErr.message}`); return null }
        if (!chData) { setError(`Chapitre ${ci + 1} : données manquantes`); return null }

        for (let li = 0; li < ch.lessons.length; li++) {
          const l = ch.lessons[li]
          if (!l.title.trim()) continue
          const { error: lErr } = await supabase.from('formation_lessons').insert({
            chapter_id: chData.id,
            formation_id: data.id,
            title: l.title,
            video_url: l.video_url || null,
            video_type: l.video_url?.includes('vimeo') ? 'vimeo' : 'youtube',
            is_free: l.is_free,
            order_index: li,
          })
          if (lErr) { setError(`Leçon ${li + 1} (ch.${ci + 1}) : ${lErr.message}`); return null }
        }
      }
    }
    return data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = await doInsert(false)
    setLoading(false)
    if (!data) return
    router.push(`/coach/formations/${data.id}`)
  }

  const handlePublish = async () => {
    if (!title.trim() || loading) return
    setLoading(true)
    setError('')
    setIsDirty(false)
    /* Tout insérer D'ABORD, overlay seulement après succès */
    const data = await doInsert(true)
    setLoading(false)
    if (!data) return
    setCreatedTitle(title)
    setShowOverlay(true)
  }

  // Chapters helpers
  const addChapter = () => setChapters(p => [...p, { lessons: [{ title: '', video_url: '', is_free: false }] }])
  const addLesson  = (ci: number) => setChapters(p => p.map((c, i) => i === ci ? { ...c, lessons: [...c.lessons, { title: '', video_url: '', is_free: false }] } : c))
  const removeLesson = (ci: number, li: number) => setChapters(p => p.map((c, i) => i === ci ? { ...c, lessons: c.lessons.filter((_, j) => j !== li) } : c))
  const updateLesson = (ci: number, li: number, key: keyof Lesson, val: any) =>
    setChapters(p => p.map((c, i) => i === ci ? { ...c, lessons: c.lessons.map((l, j) => j === li ? { ...l, [key]: val } : l) } : c))
  const removeChapter = (ci: number) => { if (chapters.length > 1) setChapters(p => p.filter((_, i) => i !== ci)) }

  // Drag crop
  const handleMouseDown = (e: React.MouseEvent) => { setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y } }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const dx = (e.clientX - dragStart.current.x) / 4
    const dy = (e.clientY - dragStart.current.y) / 4
    setPosition({ x: Math.min(100, Math.max(0, dragStart.current.px - dx)), y: Math.min(100, Math.max(0, dragStart.current.py - dy)) })
  }

  const updatePack = (i: number, key: keyof Pack, val: any) => setPacks(p => p.map((pk, idx) => idx === i ? { ...pk, [key]: val } : pk))
  const addPack    = () => setPacks(p => [...p, { label: 'Nouveau pack', hours: 1, price: 0, desc: '' }])
  const removePack = (i: number) => setPacks(p => p.filter((_, idx) => idx !== i))

  const goBack = () => { if (isDirty) { setPendingHref('/coach/dashboard'); setShowLeaveModal(true) } else router.push('/coach/dashboard') }

  return (
    <>
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,9,14,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#07070f', border: '1px solid rgba(240,244,255,0.08)', borderRadius: 20, padding: '36px 40px', maxWidth: 420, width: '90%', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(240,244,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v5M10 14h.01" stroke={CREAM} strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="8.5" stroke={CREAM} strokeWidth="1.5"/></svg>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: CREAM, marginBottom: 10 }}>Quitter sans sauvegarder ?</h3>
            <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.6, marginBottom: 28 }}>Vous avez des modifications non sauvegardées.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={async () => { setShowLeaveModal(false); setPublishOnCreate(false); const d = await doInsert(false); if (d) router.push('/coach/dashboard') }} style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(232,228,220,0.06)', color: CREAM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Sauvegarder en brouillon</button>
              <button onClick={() => { setShowLeaveModal(false); setIsDirty(false); router.push(pendingHref) }} style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Ne pas enregistrer</button>
              <button onClick={() => setShowLeaveModal(false)} style={{ padding: '10px', borderRadius: 10, border: 'none', background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer' }}>Continuer l'édition</button>
            </div>
          </div>
        </div>
      )}
      {showOverlay && <PublishOverlay type={tab} title={createdTitle} onDone={() => router.push('/coach/dashboard')} />}

      <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 50% 30% at 50% 0%, ${activeTab.color}20 0%, transparent 70%)`, transition: 'background 0.5s' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
            <button type="button" onClick={goBack} style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px' }}>Nouveau contenu</h1>
              <p style={{ fontSize: 13, color: SILVER, marginTop: 2 }}>{activeTab.desc}</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'inline-flex', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: 4, gap: 2, marginBottom: 36 }}>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)} style={{ padding: '8px 28px', borderRadius: 12, border: 'none', background: active ? t.color + '28' : 'transparent', color: active ? '#fff' : SILVER, fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s', boxShadow: active ? `0 2px 14px ${t.color}50` : 'none' }}>
                  {t.label}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ══ FORMATION ══ */}
            {tab === 'formation' && (
              <>
                {/* Miniature avec recadrage */}
                <Section title="Miniature">
                  <MiniatureEditor
                  preview={thumbPreview}
                  zoom={zoom}
                  position={position}
                  dragging={dragging}
                  onThumb={handleThumb}
                  onZoom={setZoom}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={() => setDragging(false)}
                />
                </Section>

                <Section title="Informations">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="Titre *"><input value={title} onChange={e => { setTitle(e.target.value); markDirty() }} required placeholder="Ex : Maîtriser le MTT en 8 semaines" style={inputStyle} /></Field>
                    <Field label="Accroche"><input value={shortDesc} onChange={e => { setShortDesc(e.target.value); markDirty() }} placeholder="Visible sur la card — 1 ligne max" style={inputStyle} /></Field>
                    <Field label="Description complète"><textarea value={desc} onChange={e => { setDesc(e.target.value); markDirty() }} placeholder="Objectifs, programme, prérequis…" rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} /></Field>
                  </div>
                </Section>

                <Section title="Tarification & options">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <Field label="Prix (€)"><input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} style={inputStyle} /></Field>
                    <Field label="Variante">
                      <select value={variant} onChange={e => { setVariant(e.target.value); setLevel('Débutant') }} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {VARIANTS.map(v => <option key={v} value={v} style={{ background: '#07090e' }}>{v}</option>)}
                      </select>
                    </Field>
                    <Field label="Niveau">
                      <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {(LEVELS_BY_VARIANT[variant] ?? LEVELS_BY_VARIANT.Autre).map(l => <option key={l.value} value={l.value} style={{ background: '#07090e' }}>{l.label}</option>)}
                      </select>
                    </Field>
                  </div>
                </Section>

                {/* Chapitres & leçons */}
                <Section title="Chapitres & leçons">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {chapters.map((chapter, ci) => (
                      <div key={ci} style={{ background: 'rgba(232,228,220,0.02)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                        {/* Header chapitre */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(232,228,220,0.06)', background: 'rgba(232,228,220,0.03)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: `${activeTab.color}20`, border: `1px solid ${activeTab.color}40`, color: activeTab.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ci + 1}</div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>Chapitre {ci + 1}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {ci === 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(6,182,212,0.15)', color: '#06b6d4', fontWeight: 700 }}>Accès gratuit</span>}
                            {chapters.length > 1 && (
                              <button type="button" onClick={() => removeChapter(ci)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Leçons */}
                        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {chapter.lessons.map((lesson, li) => (
                            <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Video size={13} color={SILVER} style={{ flexShrink: 0, opacity: 0.5 }} />
                              <input
                                value={lesson.title}
                                onChange={e => { updateLesson(ci, li, 'title', e.target.value); markDirty() }}
                                placeholder={`Titre de la leçon ${li + 1}`}
                                style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 13 }}
                              />
                              <input
                                value={lesson.video_url}
                                onChange={e => updateLesson(ci, li, 'video_url', e.target.value)}
                                placeholder="URL YouTube / Vimeo"
                                style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 13 }}
                              />
                              <button type="button" onClick={() => updateLesson(ci, li, 'is_free', !lesson.is_free)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, border: `1px solid ${lesson.is_free ? 'rgba(6,182,212,0.4)' : 'rgba(240,244,255,0.1)'}`, background: lesson.is_free ? 'rgba(6,182,212,0.1)' : 'transparent', color: lesson.is_free ? '#06b6d4' : SILVER, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {lesson.is_free ? 'Gratuit' : 'Premium'}
                              </button>
                              {chapter.lessons.length > 1 && (
                                <button type="button" onClick={() => removeLesson(ci, li)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addLesson(ci)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: SILVER, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', transition: 'color 0.15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = CREAM}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = SILVER}>
                            <Plus size={12} /> Ajouter une leçon
                          </button>
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={addChapter} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, border: '1px dashed rgba(240,244,255,0.08)', background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = CREAM}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = SILVER}>
                      <Plus size={14} /> Ajouter un chapitre
                    </button>
                  </div>
                </Section>
              </>
            )}

            {/* ══ VIDEO ══ */}
            {tab === 'video' && (
              <>
                <Section title="Miniature">
                <MiniatureEditor preview={thumbPreview} zoom={zoom} position={position} dragging={dragging} onThumb={handleThumb} onZoom={setZoom} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setDragging(false)} />
                </Section>
                <Section title="Informations">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="Titre *"><input value={title} onChange={e => { setTitle(e.target.value); markDirty() }} required placeholder="Ex : Analyse session MTT — Final Table" style={inputStyle} /></Field>
                    <Field label="Description"><textarea value={desc} onChange={e => { setDesc(e.target.value); markDirty() }} placeholder="De quoi parle cette vidéo ?" rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} /></Field>
                    <Field label="URL de la vidéo"><input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={inputStyle} /></Field>
                  </div>
                </Section>
                <Section title="Options">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <Field label="Prix (€)"><input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} style={inputStyle} /></Field>
                    <Field label="Variante">
                      <select value={variant} onChange={e => { setVariant(e.target.value); setLevel('Débutant') }} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {VARIANTS.map(v => <option key={v} value={v} style={{ background: '#07090e' }}>{v}</option>)}
                      </select>
                    </Field>
                    <Field label="Niveau">
                      <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {(LEVELS_BY_VARIANT[variant] ?? LEVELS_BY_VARIANT.Autre).map(l => <option key={l.value} value={l.value} style={{ background: '#07090e' }}>{l.label}</option>)}
                      </select>
                    </Field>
                  </div>
                </Section>
              </>
            )}

            {/* ══ COACHING ══ */}
            {tab === 'coaching' && (
              <>
                <Section title="Présentation">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <MiniatureEditor preview={thumbPreview} zoom={zoom} position={position} dragging={dragging} onThumb={handleThumb} onZoom={setZoom} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setDragging(false)} />
                    <Field label="Titre de l'offre *"><input value={title} onChange={e => { setTitle(e.target.value); markDirty() }} required placeholder="Ex : Coaching MTT — Du fish au final table" style={inputStyle} /></Field>
                    <Field label="Description"><textarea value={desc} onChange={e => { setDesc(e.target.value); markDirty() }} placeholder="Méthode, approche, ce que l'élève va apprendre…" rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} /></Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Field label="Variante principale">
                        <select value={variant} onChange={e => { setVariant(e.target.value); setLevel('Débutant') }} style={{ ...inputStyle, cursor: 'pointer' }}>
                          {VARIANTS.map(v => <option key={v} value={v} style={{ background: '#07090e' }}>{v}</option>)}
                        </select>
                      </Field>
                      <Field label="Niveau ciblé">
                        <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                          {(LEVELS_BY_VARIANT[variant] ?? LEVELS_BY_VARIANT.Autre).map(l => <option key={l.value} value={l.value} style={{ background: '#07090e' }}>{l.label}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                </Section>

                <Section title="Packs & tarifs">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {packs.map((pack, i) => (
                      <div key={i} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a855f7', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                            <input value={pack.label} onChange={e => updatePack(i, 'label', e.target.value)} style={{ ...inputStyle, width: 200, padding: '6px 12px', fontSize: 13, fontWeight: 700 }} />
                          </div>
                          {packs.length > 1 && (
                            <button type="button" onClick={() => removePack(i)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
                          <Field label="Heures"><input type="number" min={1} value={pack.hours} onChange={e => updatePack(i, 'hours', Number(e.target.value))} style={inputStyle} /></Field>
                          <Field label="Prix (€)"><input type="number" min={0} value={pack.price} onChange={e => updatePack(i, 'price', Number(e.target.value))} style={inputStyle} /></Field>
                          <Field label="Description"><input value={pack.desc} onChange={e => updatePack(i, 'desc', e.target.value)} placeholder="Ce que comprend ce pack" style={inputStyle} /></Field>
                        </div>
                        {pack.hours > 0 && pack.price > 0 && <p style={{ fontSize: 11, color: SILVER, marginTop: 8 }}>{Math.round(pack.price / pack.hours)}€/h</p>}
                      </div>
                    ))}
                    <button type="button" onClick={addPack} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, border: '1px dashed rgba(240,244,255,0.08)', background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = CREAM}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = SILVER}>
                      <Plus size={14} /> Ajouter un pack
                    </button>
                  </div>
                </Section>

                {/* Cal.com */}
                <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: '22px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Calendrier Cal.com</h3>
                    <div style={{ position: 'relative' }}>
                      <button type="button" onClick={() => setShowCalTuto(p => !p)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(232,228,220,0.2)', background: 'rgba(232,228,220,0.06)', color: SILVER, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
                      {showCalTuto && (
                        <div style={{ position: 'absolute', right: 0, top: 30, width: 300, background: '#07070f', border: '1px solid rgba(240,244,255,0.08)', borderRadius: 14, padding: '18px', zIndex: 50, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 10 }}>Comment fonctionne Cal.com ?</p>
                          {['Créez un compte gratuit sur cal.com','Allez dans "Event types" → créez un événement','Configurez vos disponibilités dans "Availability"','Copiez votre lien cal.com/votre-nom ici','Les élèves réservent directement depuis votre profil'].map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', color: '#a855f7', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                              <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.7)', lineHeight: 1.5 }}>{s}</p>
                            </div>
                          ))}
                          <a href="https://cal.com" target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 12, textAlign: 'center', fontSize: 12, color: '#a855f7', textDecoration: 'none', padding: '7px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8 }}>Ouvrir cal.com →</a>
                        </div>
                      )}
                    </div>
                  </div>
                  <Field label="Votre lien Cal.com">
                    <input value={calUrl} onChange={e => setCalUrl(e.target.value)} placeholder="https://cal.com/ton-username" style={inputStyle} />
                  </Field>
                  {calUrl && calUrl.startsWith('http') ? (
                    <div style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(232,228,220,0.1)', height: 560 }}>
                      <iframe src={calUrl} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="Cal.com" />
                    </div>
                  ) : (
                    <div style={{ marginTop: 14, height: 120, borderRadius: 12, border: '2px dashed rgba(232,228,220,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <p style={{ fontSize: 13, color: SILVER }}>Entrez votre lien pour voir l'aperçu</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Atouts — commun à tous les types ── */}
            <Section title="Atouts mis en avant">
              <HighlightsPicker
                selected={highlights}
                onChange={setHighlights}
                color={activeTab.color}
              />
            </Section>

            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

            <div style={{ height: 1, background: 'rgba(232,228,220,0.08)' }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={goBack} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Annuler</button>
              <button type="submit" disabled={loading || !title.trim()} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1px solid rgba(232,228,220,0.15)', background: 'transparent', color: CREAM, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !title.trim() ? 0.4 : 1 }}>
                {loading ? 'Création…' : 'Brouillon'}
              </button>
              <button type="button" disabled={!title.trim() || loading} onClick={handlePublish}
                style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: activeTab.color, color: '#fff', fontSize: 14, fontWeight: 800, cursor: (!title.trim() || loading) ? 'not-allowed' : 'pointer', opacity: (!title.trim() || loading) ? 0.4 : 1, boxShadow: `0 4px 20px ${activeTab.color}50` }}>
                {loading ? 'Publication…' : `Publier la ${activeTab.label.toLowerCase()} →`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}


function MiniatureEditor({ preview, zoom, position, dragging, onThumb, onZoom, onMouseDown, onMouseMove, onMouseUp, height = 220 }: {
  preview: string, zoom: number, position: { x: number, y: number }, dragging: boolean,
  onThumb: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onZoom: (z: number) => void,
  onMouseDown: (e: React.MouseEvent) => void,
  onMouseMove: (e: React.MouseEvent) => void,
  onMouseUp: () => void,
  height?: number
}) {
  const SILVER = 'rgba(240,244,255,0.45)', CREAM = '#f0f4ff'
  if (!preview) {
    return (
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <div style={{ width: '100%', height, borderRadius: 14, border: '2px dashed rgba(232,228,220,0.1)', backgroundColor: 'rgba(232,228,220,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.3)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.1)'}>
          <Upload size={22} color={SILVER} />
          <span style={{ fontSize: 13, color: SILVER }}>Cliquer pour uploader</span>
          <span style={{ fontSize: 11, color: 'rgba(138,138,138,0.4)' }}>PNG, JPG, WEBP</span>
        </div>
        <input type="file" accept="image/*" onChange={onThumb} style={{ display: 'none' }} />
      </label>
    )
  }
  return (
    <div>
      {/* Zone crop */}
      <div
        style={{ position: 'relative', width: '100%', maxWidth: 480, height, borderRadius: 12, overflow: 'hidden', cursor: 'grab', userSelect: 'none', backgroundColor: '#111', margin: '0 auto' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${preview})`, backgroundSize: `${zoom * 100}%`, backgroundPosition: `${position.x}% ${position.y}%`, backgroundRepeat: 'no-repeat' }} />
        {/* Masque + zone visible en pointillés */}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '75%', aspectRatio: '16/9', border: '1.5px dashed rgba(232,228,220,0.5)', borderRadius: 4, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(232,228,220,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 99 }}>Zone visible</span>
        </div>
      </div>
      {/* Contrôles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '9px 14px', background: 'rgba(232,228,220,0.04)', borderRadius: 10, border: '1px solid rgba(232,228,220,0.08)' }}>
        <ZoomOut size={13} color={SILVER} style={{ flexShrink: 0 }} />
        <input type="range" min={0.3} max={2} step={0.02} value={zoom} onChange={e => onZoom(Number(e.target.value))} style={{ flex: 1, accentColor: CREAM, height: 3 }} />
        <ZoomIn size={13} color={SILVER} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: SILVER, minWidth: 34, textAlign: 'right' }}>{Math.round(zoom * 100)}%</span>
        <div style={{ width: 1, height: 14, background: 'rgba(232,228,220,0.1)', flexShrink: 0 }} />
        <label style={{ fontSize: 11, color: SILVER, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <Upload size={11} /> Changer
          <input type="file" accept="image/*" onChange={onThumb} style={{ display: 'none' }} />
        </label>
      </div>
      <p style={{ fontSize: 10, color: 'rgba(138,138,138,0.4)', marginTop: 5 }}>Glissez pour repositionner · zoom avec le slider</p>
    </div>
  )
}

function Thumb({ preview, onChange, height = 180, label = 'Cliquer pour uploader' }: { preview: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, height?: number, label?: string }) {
  return (
    <label style={{ display: 'block', cursor: 'pointer' }}>
      <div style={{ width: '100%', height, borderRadius: 14, border: '2px dashed rgba(232,228,220,0.1)', backgroundImage: preview ? `url(${preview})` : undefined, backgroundColor: preview ? undefined : 'rgba(232,228,220,0.02)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'border-color 0.2s' }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.3)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.1)'}>
        {!preview && <><Upload size={22} color="rgba(240,244,255,0.45)" /><span style={{ fontSize: 13, color: 'rgba(240,244,255,0.45)' }}>{label}</span></>}
      </div>
      <input type="file" accept="image/*" onChange={onChange} style={{ display: 'none' }} />
    </label>
  )
}

function HighlightsPicker({
  selected, onChange, color,
}: { selected: string[]; onChange: (ids: string[]) => void; color: string }) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id))
    else if (selected.length < 5) onChange([...selected, id])
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>
          Choisissez 1 à 5 atouts affichés sur la page de vente.
        </p>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
          background: selected.length > 0 ? `${color}18` : 'rgba(232,228,220,0.05)',
          color: selected.length > 0 ? color : SILVER,
          border: `1px solid ${selected.length > 0 ? color + '40' : 'rgba(232,228,220,0.1)'}`,
        }}>
          {selected.length}/5
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {HIGHLIGHTS.map(h => {
          const active   = selected.includes(h.id)
          const disabled = !active && selected.length >= 5
          return (
            <button key={h.id} type="button" onClick={() => toggle(h.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                border: `1px solid ${active ? color + '55' : 'rgba(232,228,220,0.08)'}`,
                background: active ? `${color}12` : 'rgba(232,228,220,0.02)',
                color: active ? CREAM : disabled ? 'rgba(232,228,220,0.2)' : SILVER,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                transition: 'all 0.15s',
              }}>
              <h.Icon size={14} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, lineHeight: 1.3, flex: 1 }}>
                {h.label}
              </span>
              {active && <Check size={12} color={color} style={{ flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: '22px 24px' }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,244,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,244,255,0.45)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  )
}
