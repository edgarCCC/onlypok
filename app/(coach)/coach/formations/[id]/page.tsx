'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, GripVertical, Upload, Eye, EyeOff, Video, ZoomIn, ZoomOut } from 'lucide-react'
import Link from 'next/link'

const CREAM  = '#E8E4DC'
const SILVER = '#8A8A8A'
const inputStyle = { width: '100%', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 10, padding: '10px 14px', color: CREAM, fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const labelStyle = { fontSize: 10, fontWeight: 700, color: SILVER, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }

type ContentType = 'formation' | 'video' | 'coaching'

export default function EditFormationPage() {
  const { id }   = useParams()
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const [formation, setFormation]   = useState<any>(null)
  const [chapters, setChapters]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [addingLesson, setAddingLesson]       = useState<string|null>(null)
  const [newLesson, setNewLesson]   = useState({ title: '', video_url: '', video_type: 'youtube', is_free: false })
  const [contentType, setContentType] = useState<ContentType>('formation')

  // Miniature crop
  const [cropMode, setCropMode]     = useState(false)
  const [zoom, setZoom]             = useState(1)
  const [position, setPosition]     = useState({ x: 50, y: 50 })
  const [dragging, setDragging]     = useState(false)
  const dragStart                   = useRef({ x: 0, y: 0, px: 50, py: 50 })

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: f } = await supabase.from('formations').select('*').eq('id', id).single()
      setFormation(f)
      if (f?.content_type) setContentType(f.content_type)
      const { data: ch } = await supabase.from('formation_chapters').select('*, formation_lessons(*)').eq('formation_id', id).order('order_index')
      setChapters(ch ?? [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  // Autosave avec debounce
  const saveTimer = useRef<any>(null)
  const autoSave = useCallback((updated: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('formations').update({
        title: updated.title,
        description: updated.description,
        short_desc: updated.short_desc,
        price: updated.price,
        level: updated.level,
        variant: updated.variant,
        video_url: updated.video_url ?? null,
        cal_url: updated.cal_url ?? null,
      }).eq('id', id)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }, [id, supabase])

  const updateField = (key: string, value: any) => {
    const updated = { ...formation, [key]: value }
    setFormation(updated)
    autoSave(updated)
  }

  const togglePublish = async () => {
    const next = !formation.published
    await supabase.from('formations').update({ published: next }).eq('id', id)
    setFormation((p: any) => ({ ...p, published: next }))
  }

  const uploadMiniature = async (file: File) => {
    if (!user) return
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('formations-thumbnails').upload(path, file, { upsert: true })
    if (error) { alert('Erreur upload miniature : ' + error.message); return }
    const { data: urlData } = supabase.storage.from('formations-thumbnails').getPublicUrl(path)
    await supabase.from('formations').update({ thumbnail_url: urlData.publicUrl }).eq('id', id)
    setFormation((p: any) => ({ ...p, thumbnail_url: urlData.publicUrl }))
    setCropMode(true)
    setZoom(1)
    setPosition({ x: 50, y: 50 })
  }

  const saveCrop = async () => {
    await supabase.from('formations').update({
      thumbnail_crop: { zoom, x: position.x, y: position.y }
    }).eq('id', id)
    setCropMode(false)
  }

  // Drag pour repositionner l'image
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const dx = ((e.clientX - dragStart.current.x) / 4)
    const dy = ((e.clientY - dragStart.current.y) / 4)
    setPosition({
      x: Math.min(100, Math.max(0, dragStart.current.px - dx)),
      y: Math.min(100, Math.max(0, dragStart.current.py - dy)),
    })
  }

  const addChapter = async () => {
    if (!newChapterTitle.trim()) return
    const { data } = await supabase.from('formation_chapters').insert({ formation_id: id, title: newChapterTitle, order_index: chapters.length }).select().single()
    setChapters(prev => [...prev, { ...data, formation_lessons: [] }])
    setNewChapterTitle('')
  }

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('Supprimer ce chapitre et toutes ses leçons ?')) return
    await supabase.from('formation_chapters').delete().eq('id', chapterId)
    setChapters(prev => prev.filter(c => c.id !== chapterId))
  }

  const addLesson = async (chapterId: string) => {
    if (!newLesson.title.trim()) return
    const chapter = chapters.find(c => c.id === chapterId)
    const order   = chapter?.formation_lessons?.length ?? 0
    const { data } = await supabase.from('formation_lessons').insert({
      chapter_id: chapterId, formation_id: id,
      title: newLesson.title,
      video_url: newLesson.video_url || null,
      video_type: newLesson.video_type,
      is_free: newLesson.is_free,
      order_index: order,
    }).select().single()
    setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, formation_lessons: [...(c.formation_lessons ?? []), data] } : c))
    setNewLesson({ title: '', video_url: '', video_type: 'youtube', is_free: false })
    setAddingLesson(null)
    const total = chapters.reduce((acc, c) => acc + (c.formation_lessons?.length ?? 0), 0) + 1
    await supabase.from('formations').update({ modules_count: total }).eq('id', id)
  }

  const deleteLesson = async (chapterId: string, lessonId: string) => {
    await supabase.from('formation_lessons').delete().eq('id', lessonId)
    setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, formation_lessons: c.formation_lessons.filter((l: any) => l.id !== lessonId) } : c))
  }

  const toggleLessonFree = async (chapterId: string, lesson: any) => {
    await supabase.from('formation_lessons').update({ is_free: !lesson.is_free }).eq('id', lesson.id)
    setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, formation_lessons: c.formation_lessons.map((l: any) => l.id === lesson.id ? { ...l, is_free: !l.is_free } : l) } : c))
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER }}>Chargement…</div>
  if (!formation) return <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER }}>Formation introuvable</div>

  const crop = formation.thumbnail_crop ?? { zoom: 1, x: 50, y: 50 }
  const thumbStyle = formation.thumbnail_url ? {
    backgroundImage: `url(${formation.thumbnail_url})`,
    backgroundSize: `${(cropMode ? zoom : crop.zoom) * 100}%`,
    backgroundPosition: `${cropMode ? position.x : crop.x}% ${cropMode ? position.y : crop.y}%`,
    backgroundRepeat: 'no-repeat',
  } : {}

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', padding: '40px', color: CREAM }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/coach/formations" style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px' }}>{formation.title}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: formation.published ? 'rgba(16,185,129,0.15)' : 'rgba(232,228,220,0.06)', color: formation.published ? '#10b981' : SILVER }}>
                  {formation.published ? 'Publié' : 'Brouillon'}
                </span>
                {saving && <span style={{ fontSize: 11, color: SILVER }}>Sauvegarde…</span>}
                {saved && !saving && <span style={{ fontSize: 11, color: '#10b981' }}>✓ Sauvegardé</span>}
              </div>
            </div>
          </div>
          <button onClick={togglePublish} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, border: `1px solid ${formation.published ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, background: 'transparent', color: formation.published ? '#ef4444' : '#10b981', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
            {formation.published ? <><EyeOff size={14} /> Dépublier</> : <><Eye size={14} /> Publier</>}
          </button>
        </div>

        {/* Type de contenu */}
        <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <label style={labelStyle}>Type de contenu</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {([
              { id: 'formation', label: 'Formation', color: '#6366f1', desc: 'Chapitres & leçons structurés' },
              { id: 'video',     label: 'Vidéo',     color: '#10b981', desc: 'Vidéo standalone' },
              { id: 'coaching',  label: 'Coaching',  color: '#f59e0b', desc: 'Session coaching live' },
            ] as { id: ContentType, label: string, color: string, desc: string }[]).map(t => (
              <div key={t.id} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${contentType === t.id ? t.color + '50' : 'rgba(232,228,220,0.06)'}`, background: contentType === t.id ? t.color + '15' : 'rgba(232,228,220,0.02)', textAlign: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: contentType === t.id ? t.color : 'rgba(232,228,220,0.2)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: contentType === t.id ? CREAM : SILVER }}>{t.label}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: SILVER, opacity: 0.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Infos formation */}
        <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 20 }}>Informations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Miniature */}
            <div>
              <label style={labelStyle}>Miniature</label>
              <div style={{ position: 'relative', width: '100%', height: 180, borderRadius: 12, border: '2px dashed rgba(232,228,220,0.1)', overflow: 'hidden', ...thumbStyle, cursor: cropMode ? 'grab' : 'default' }}
                onMouseDown={cropMode ? handleMouseDown : undefined}
                onMouseMove={cropMode ? handleMouseMove : undefined}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}>

                {!formation.thumbnail_url && (
                  <label style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    <Upload size={22} color={SILVER} />
                    <span style={{ fontSize: 12, color: SILVER }}>Cliquer pour uploader</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadMiniature(f) }} />
                  </label>
                )}

                {formation.thumbnail_url && !cropMode && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 12, gap: 8, transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.4)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'}>
                    <label style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(7,9,14,0.85)', border: '1px solid rgba(232,228,220,0.15)', color: CREAM, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Upload size={12} /> Changer
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadMiniature(f) }} />
                    </label>
                    <button onClick={() => setCropMode(true)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(7,9,14,0.85)', border: '1px solid rgba(232,228,220,0.15)', color: CREAM, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ZoomIn size={12} /> Recadrer
                    </button>
                  </div>
                )}

                {/* Mode crop */}
                {cropMode && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ background: 'rgba(7,9,14,0.9)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ZoomOut size={14} color={SILVER} />
                      <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: CREAM }} />
                      <ZoomIn size={14} color={SILVER} />
                      <span style={{ fontSize: 11, color: SILVER, minWidth: 32 }}>{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setCropMode(false)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(232,228,220,0.15)', background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                      <button onClick={saveCrop} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: CREAM, color: '#07090e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Valider</button>
                    </div>
                  </div>
                )}
              </div>
              {cropMode && <p style={{ fontSize: 11, color: SILVER, marginTop: 6 }}>Glissez l'image pour repositionner · utilisez le slider pour zoomer</p>}
            </div>

            <div>
              <label style={labelStyle}>Titre</label>
              <input value={formation.title ?? ''} onChange={e => updateField('title', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description courte</label>
              <input value={formation.short_desc ?? ''} onChange={e => updateField('short_desc', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description complète</label>
              <textarea value={formation.description ?? ''} onChange={e => updateField('description', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* URL vidéo si type video */}
            {contentType === 'video' && (
              <div>
                <label style={labelStyle}>URL de la vidéo (YouTube / Vimeo)</label>
                <input value={formation.video_url ?? ''} onChange={e => updateField('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..." style={inputStyle} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Prix (€)</label>
                <input type="number" min={0} value={formation.price ?? 0} onChange={e => updateField('price', Number(e.target.value))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Niveau</label>
                <select value={formation.level ?? 'Débutant'} onChange={e => updateField('level', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['Débutant', 'Intermédiaire', 'Avancé'].map(l => <option key={l} value={l} style={{ background: '#07090e' }}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Variante</label>
                <select value={formation.variant ?? 'NLH'} onChange={e => updateField('variant', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['NLH', 'PLO', 'MTT', 'Cash', 'Expresso', 'Live'].map(v => <option key={v} value={v} style={{ background: '#07090e' }}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Chapitres — seulement pour les formations */}
        {contentType === 'formation' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px' }}>Chapitres & leçons</h2>
              <span style={{ fontSize: 12, color: SILVER }}>{chapters.length} chapitre{chapters.length > 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chapters.map((chapter, ci) => (
                <div key={chapter.id} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
                    <GripVertical size={14} color={SILVER} style={{ opacity: 0.4 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: CREAM }}>{ci + 1}. {chapter.title}</span>
                    <span style={{ fontSize: 12, color: SILVER }}>{chapter.formation_lessons?.length ?? 0} leçons</span>
                    <button onClick={() => deleteChapter(chapter.id)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.5)'}>
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div>
                    {(chapter.formation_lessons ?? []).map((lesson: any) => (
                      <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(232,228,220,0.04)' }}>
                        <Video size={13} color={SILVER} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: CREAM }}>{lesson.title}</span>
                        {lesson.video_url && <span style={{ fontSize: 11, color: SILVER, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.video_url}</span>}
                        <button onClick={() => toggleLessonFree(chapter.id, lesson)} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: `1px solid ${lesson.is_free ? 'rgba(16,185,129,0.4)' : 'rgba(232,228,220,0.1)'}`, background: lesson.is_free ? 'rgba(16,185,129,0.1)' : 'transparent', color: lesson.is_free ? '#10b981' : SILVER, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {lesson.is_free ? 'Gratuit' : 'Premium'}
                        </button>
                        <button onClick={() => deleteLesson(chapter.id, lesson.id)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}

                    {addingLesson === chapter.id ? (
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la leçon" style={inputStyle} />
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input value={newLesson.video_url} onChange={e => setNewLesson(p => ({ ...p, video_url: e.target.value }))} placeholder="URL YouTube ou Vimeo" style={{ ...inputStyle, flex: 1 }} />
                          <select value={newLesson.video_type} onChange={e => setNewLesson(p => ({ ...p, video_type: e.target.value }))} style={{ ...inputStyle, width: 110, cursor: 'pointer' }}>
                            <option value="youtube" style={{ background: '#07090e' }}>YouTube</option>
                            <option value="vimeo" style={{ background: '#07090e' }}>Vimeo</option>
                            <option value="upload" style={{ background: '#07090e' }}>Upload</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: SILVER }}>
                            <input type="checkbox" checked={newLesson.is_free} onChange={e => setNewLesson(p => ({ ...p, is_free: e.target.checked }))} />
                            Leçon gratuite
                          </label>
                          <div style={{ flex: 1 }} />
                          <button onClick={() => setAddingLesson(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                          <button onClick={() => addLesson(chapter.id)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: CREAM, color: '#07090e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ajouter</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingLesson(chapter.id); setNewLesson({ title: '', video_url: '', video_type: 'youtube', is_free: false }) }} style={{ width: '100%', padding: '12px 20px', border: 'none', background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = CREAM}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = SILVER}>
                        <Plus size={13} /> Ajouter une leçon
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10 }}>
                <input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChapter()} placeholder="Nom du nouveau chapitre…" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addChapter} disabled={!newChapterTitle.trim()} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: CREAM, color: '#07090e', fontSize: 13, fontWeight: 800, cursor: newChapterTitle.trim() ? 'pointer' : 'not-allowed', opacity: newChapterTitle.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                  <Plus size={15} /> Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {contentType === 'video' && (
          <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
            <p style={{ color: SILVER, fontSize: 14 }}>Renseignez l'URL de la vidéo dans la section Informations ci-dessus.</p>
          </div>
        )}

        {contentType === 'coaching' && (
          <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 20 }}>Calendrier Cal.com</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: SILVER, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 7 }}>Lien Cal.com</label>
                <input
                  value={formation.cal_url ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    setFormation((p: any) => ({ ...p, cal_url: val }))
                  }}
                  onBlur={async e => {
                    await supabase.from('formations').update({ cal_url: e.target.value || null }).eq('id', id)
                    setSaved(true)
                    setTimeout(() => setSaved(false), 2000)
                  }}
                  placeholder="https://cal.com/ton-username"
                  style={{ width: '100%', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 10, padding: '10px 14px', color: CREAM, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              {formation.cal_url && formation.cal_url.startsWith('http') ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(232,228,220,0.1)', height: 600 }}>
                  <iframe src={formation.cal_url} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="Calendrier Cal.com" />
                </div>
              ) : (
                <div style={{ height: 120, borderRadius: 12, border: '2px dashed rgba(232,228,220,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 13, color: SILVER }}>Entrez votre lien Cal.com pour voir l'aperçu</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
