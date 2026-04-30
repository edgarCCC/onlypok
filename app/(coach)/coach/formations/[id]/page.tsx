'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, GripVertical, Upload,
  Eye, EyeOff, Video, ZoomIn, ZoomOut, Save, Users, DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.12)'

const VARIANTS = ['MTT', 'Cash', 'Expresso', 'Autre']
const LEVELS_BY_VARIANT: Record<string, { value: string; label: string }[]> = {
  MTT:      [{ value:'Débutant', label:'Débutant — ABI ≤ 5€' }, { value:'Intermédiaire', label:'Intermédiaire — ABI 5–20€' }, { value:'Avancé', label:'Avancé — ABI > 20€' }],
  Cash:     [{ value:'Débutant', label:'Débutant — NL2 à NL10' }, { value:'Intermédiaire', label:'Intermédiaire — NL25–NL100' }, { value:'Avancé', label:'Avancé — NL200+' }],
  Expresso: [{ value:'Débutant', label:'Débutant — ABI ≤ 5€' }, { value:'Intermédiaire', label:'Intermédiaire — ABI 5–20€' }, { value:'Avancé', label:'Avancé — ABI > 20€' }],
  Autre:    [{ value:'Débutant', label:'Débutant' }, { value:'Intermédiaire', label:'Intermédiaire' }, { value:'Avancé', label:'Avancé' }],
}

const CONTENT_TYPES = [
  { id: 'formation', label: 'Formation', color: '#7c3aed', desc: 'Chapitres & leçons structurés' },
  { id: 'video',     label: 'Vidéo',     color: '#06b6d4', desc: 'Vidéo standalone' },
  { id: 'coaching',  label: 'Coaching',  color: '#f59e0b', desc: 'Session coaching live' },
] as const

type ContentType = 'formation' | 'video' | 'coaching'

const field  = (extra?: React.CSSProperties): React.CSSProperties => ({ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: CREAM, fontSize: 13, outline: 'none', fontFamily: 'inherit', ...extra })
const label  = (): React.CSSProperties => ({ fontSize: 9, fontWeight: 700, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 })
const card   = (extra?: React.CSSProperties): React.CSSProperties => ({ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: 24, ...extra })

export default function EditFormationPage() {
  const { id }   = useParams()
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const [formation, setFormation]   = useState<any>(null)
  const [chapters, setChapters]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [contentType, setContentType] = useState<ContentType>('formation')

  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [addingLesson, setAddingLesson]       = useState<string | null>(null)
  const [newLesson, setNewLesson] = useState({ title: '', video_url: '', video_type: 'youtube', is_free: false })

  const [zoom, setZoom]           = useState(1)
  const [position, setPosition]   = useState({ x: 50, y: 50 })
  const [dragging, setDragging]   = useState(false)
  const dragStart                 = useRef({ x: 0, y: 0, px: 50, py: 50 })
  const [enhancing, setEnhancing] = useState(false)
  const cropSaveTimer             = useRef<any>(null)

  /* students + revenue stats */
  const students = formation?.formation_purchases?.[0]?.count ?? 0
  const revenue  = (formation?.price ?? 0) * students

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: f } = await supabase
        .from('formations')
        .select('*, formation_purchases(count)')
        .eq('id', id).single()
      setFormation(f)
      if (f?.content_type) setContentType(f.content_type as ContentType)
      if (f?.thumbnail_crop) { setZoom(f.thumbnail_crop.zoom ?? 1); setPosition({ x: f.thumbnail_crop.x ?? 50, y: f.thumbnail_crop.y ?? 50 }) }
      const { data: ch } = await supabase
        .from('formation_chapters')
        .select('*, formation_lessons(*)')
        .eq('formation_id', id)
        .order('order_index')
      setChapters(ch ?? [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  /* Autosave debounced */
  const saveTimer = useRef<any>(null)
  const autoSave = useCallback((updated: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('formations').update({
        title:       updated.title,
        description: updated.description,
        short_desc:  updated.short_desc,
        price:       updated.price,
        level:       updated.level,
        variant:     updated.variant,
        video_url:   updated.video_url ?? null,
        cal_url:     updated.cal_url ?? null,
      }).eq('id', id)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 800)
  }, [id, supabase])

  const updateField = (key: string, value: any) => {
    const updated = { ...formation, [key]: value }
    setFormation(updated)
    autoSave(updated)
  }

  const changeType = async (t: ContentType) => {
    setContentType(t)
    await supabase.from('formations').update({ content_type: t }).eq('id', id)
  }

  const togglePublish = async () => {
    const next = !formation.published
    await supabase.from('formations').update({ published: next }).eq('id', id)
    setFormation((p: any) => ({ ...p, published: next }))
  }

  /* Thumbnail */
  const uploadMiniature = async (file: File) => {
    if (!user) return
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('formations-thumbnails').upload(path, file, { upsert: true })
    if (error) { alert('Erreur upload : ' + error.message); return }
    const { data: urlData } = supabase.storage.from('formations-thumbnails').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('formations').update({ thumbnail_url: url }).eq('id', id)
    setFormation((p: any) => ({ ...p, thumbnail_url: url }))
    setZoom(1); setPosition({ x: 50, y: 50 })
    setEnhancing(true)
    fetch('/api/enhance-thumbnail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: url, formation_id: id, user_id: user.id }) })
      .then(r => r.json()).then(d => { if (d.enhanced_url) setFormation((p: any) => ({ ...p, thumbnail_url: d.enhanced_url })) })
      .catch(console.error).finally(() => setEnhancing(false))
  }
  const saveCrop = useCallback((z: number, pos: { x: number; y: number }) => {
    if (cropSaveTimer.current) clearTimeout(cropSaveTimer.current)
    cropSaveTimer.current = setTimeout(() => {
      supabase.from('formations').update({ thumbnail_crop: { zoom: z, x: pos.x, y: pos.y } }).eq('id', id)
    }, 600)
  }, [id, supabase])

  const handleMouseDown = (e: React.MouseEvent) => { setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y } }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const next = { x: Math.min(100, Math.max(0, dragStart.current.px - (e.clientX - dragStart.current.x) / 4)), y: Math.min(100, Math.max(0, dragStart.current.py - (e.clientY - dragStart.current.y) / 4)) }
    setPosition(next)
  }
  const handleMouseUp = () => { setDragging(false); saveCrop(zoom, position) }
  const handleZoomChange = (z: number) => { setZoom(z); saveCrop(z, position) }

  /* Chapters */
  const addChapter = async () => {
    if (!newChapterTitle.trim()) return
    const { data } = await supabase.from('formation_chapters').insert({ formation_id: id, title: newChapterTitle, order_index: chapters.length }).select().single()
    setChapters(p => [...p, { ...data, formation_lessons: [] }])
    setNewChapterTitle('')
  }
  const deleteChapter = async (chId: string) => {
    if (!confirm('Supprimer ce chapitre et toutes ses leçons ?')) return
    await supabase.from('formation_chapters').delete().eq('id', chId)
    setChapters(p => p.filter(c => c.id !== chId))
  }
  const addLesson = async (chId: string) => {
    if (!newLesson.title.trim()) return
    const order = chapters.find(c => c.id === chId)?.formation_lessons?.length ?? 0
    const { data } = await supabase.from('formation_lessons').insert({ chapter_id: chId, formation_id: id, title: newLesson.title, video_url: newLesson.video_url || null, video_type: newLesson.video_type, is_free: newLesson.is_free, order_index: order }).select().single()
    setChapters(p => p.map(c => c.id === chId ? { ...c, formation_lessons: [...(c.formation_lessons ?? []), data] } : c))
    setNewLesson({ title: '', video_url: '', video_type: 'youtube', is_free: false })
    setAddingLesson(null)
    const total = chapters.reduce((a, c) => a + (c.formation_lessons?.length ?? 0), 0) + 1
    await supabase.from('formations').update({ modules_count: total }).eq('id', id)
  }
  const deleteLesson = async (chId: string, lId: string) => {
    await supabase.from('formation_lessons').delete().eq('id', lId)
    setChapters(p => p.map(c => c.id === chId ? { ...c, formation_lessons: c.formation_lessons.filter((l: any) => l.id !== lId) } : c))
  }
  const toggleLessonFree = async (chId: string, lesson: any) => {
    await supabase.from('formation_lessons').update({ is_free: !lesson.is_free }).eq('id', lesson.id)
    setChapters(p => p.map(c => c.id === chId ? { ...c, formation_lessons: c.formation_lessons.map((l: any) => l.id === lesson.id ? { ...l, is_free: !l.is_free } : l) } : c))
  }

  if (loading || !formation) return <FourAcesLoader />

  const crop = formation.thumbnail_crop ?? { zoom: 1, x: 50, y: 50 }
  const activeType = CONTENT_TYPES.find(t => t.id === contentType)!

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 50% 30% at 50% 0%, ${activeType.color}12 0%, transparent 70%)`, transition: 'background 0.4s' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '36px 40px' }}>

        {/* ── Topbar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/coach/dashboard"
              style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid rgba(232,228,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: SILVER, transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,228,220,0.25)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,228,220,0.1)'}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', margin: 0 }}>{formation.title || 'Sans titre'}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${activeType.color}18`, color: activeType.color, fontWeight: 700 }}>{activeType.label}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: formation.published ? 'rgba(6,182,212,0.15)' : 'rgba(240,244,255,0.06)', color: formation.published ? '#06b6d4' : SILVER }}>
                  {formation.published ? 'Publié' : 'Brouillon'}
                </span>
                {saving && <span style={{ fontSize: 11, color: SILVER }}>Sauvegarde…</span>}
                {saved && !saving && <span style={{ fontSize: 11, color: '#06b6d4' }}>✓ Sauvegardé</span>}
              </div>
            </div>
          </div>

          <button onClick={togglePublish}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: `1px solid ${formation.published ? 'rgba(239,68,68,0.35)' : 'rgba(6,182,212,0.35)'}`, background: formation.published ? 'rgba(239,68,68,0.08)' : 'rgba(6,182,212,0.08)', color: formation.published ? '#ef4444' : '#06b6d4', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
            {formation.published ? <><EyeOff size={14} /> Dépublier</> : <><Eye size={14} /> Publier</>}
          </button>
        </div>

        {/* ── 2-column layout ────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT — main form ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Type selector */}
            <div style={card()}>
              <p style={label()}>Type de contenu</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {CONTENT_TYPES.map(t => {
                  const active = contentType === t.id
                  return (
                    <button key={t.id} onClick={() => changeType(t.id)}
                      style={{ flex: 1, padding: '14px 10px', borderRadius: 12, border: `1px solid ${active ? t.color + '55' : 'rgba(232,228,220,0.06)'}`, background: active ? t.color + '18' : 'rgba(232,228,220,0.02)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? t.color : DIM, margin: '0 auto 8px', transition: 'background 0.2s' }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? CREAM : SILVER }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: SILVER, opacity: 0.6, marginTop: 2 }}>{t.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Infos générales */}
            <div style={card()}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 20 }}>Informations</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Miniature */}
                <div>
                  <p style={label()}>Miniature</p>
                  <MiniatureEditor
                    preview={formation.thumbnail_url ?? ''}
                    zoom={zoom}
                    position={position}
                    dragging={dragging}
                    enhancing={enhancing}
                    onFile={f => uploadMiniature(f)}
                    onZoom={handleZoomChange}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  />
                </div>

                <div>
                  <p style={label()}>Titre</p>
                  <input value={formation.title ?? ''} onChange={e => updateField('title', e.target.value)} style={field()} />
                </div>
                <div>
                  <p style={label()}>Description courte</p>
                  <input value={formation.short_desc ?? ''} onChange={e => updateField('short_desc', e.target.value)} style={field()} placeholder="Résumé affiché sur la carte marketplace…" />
                </div>
                <div>
                  <p style={label()}>Description complète</p>
                  <textarea value={formation.description ?? ''} onChange={e => updateField('description', e.target.value)} rows={5} style={field({ resize: 'vertical' })} />
                </div>

                {contentType === 'video' && (
                  <div>
                    <p style={label()}>URL vidéo (YouTube / Vimeo)</p>
                    <input value={formation.video_url ?? ''} onChange={e => updateField('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=…" style={field()} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <p style={label()}>Prix (€)</p>
                    <input type="number" min={0} value={formation.price ?? 0} onChange={e => updateField('price', Number(e.target.value))} style={field()} />
                  </div>
                  <div>
                    <p style={label()}>Variante</p>
                    <select value={formation.variant ?? 'MTT'} onChange={e => {
                      const next = { ...formation, variant: e.target.value, level: 'Débutant' }
                      setFormation(next)
                      autoSave(next)
                    }} style={field({ cursor: 'pointer' })}>
                      {VARIANTS.map(v => <option key={v} value={v} style={{ background: '#07090e' }}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={label()}>Niveau</p>
                    <select value={formation.level ?? 'Débutant'} onChange={e => updateField('level', e.target.value)} style={field({ cursor: 'pointer' })}>
                      {(LEVELS_BY_VARIANT[formation.variant ?? 'MTT'] ?? LEVELS_BY_VARIANT.Autre).map(l => <option key={l.value} value={l.value} style={{ background: '#07090e' }}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Chapitres (formation uniquement) ─────────────── */}
            {contentType === 'formation' && (
              <div style={card()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>Chapitres & leçons</h2>
                  <span style={{ fontSize: 11, color: SILVER }}>{chapters.length} chapitre{chapters.length !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chapters.map((ch, ci) => (
                    <div key={ch.id} style={{ border: '1px solid rgba(232,228,220,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(232,228,220,0.025)', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
                        <GripVertical size={13} color={SILVER} style={{ opacity: 0.35 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: CREAM }}>{ci + 1}. {ch.title}</span>
                        <span style={{ fontSize: 11, color: SILVER }}>{ch.formation_lessons?.length ?? 0} leçons</span>
                        <button onClick={() => deleteChapter(ch.id)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.45)'}>
                          <Trash2 size={11} />
                        </button>
                      </div>

                      <div>
                        {(ch.formation_lessons ?? []).map((lesson: any) => (
                          <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderBottom: '1px solid rgba(232,228,220,0.04)' }}>
                            <Video size={12} color={SILVER} style={{ opacity: 0.4, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 12, color: CREAM }}>{lesson.title}</span>
                            {lesson.video_url && <span style={{ fontSize: 10, color: SILVER, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.video_url}</span>}
                            <button onClick={() => toggleLessonFree(ch.id, lesson)}
                              style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: `1px solid ${lesson.is_free ? 'rgba(6,182,212,0.4)' : 'rgba(232,228,220,0.1)'}`, background: lesson.is_free ? 'rgba(6,182,212,0.1)' : 'transparent', color: lesson.is_free ? '#06b6d4' : SILVER, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.06em' }}>
                              {lesson.is_free ? 'GRATUIT' : 'PREMIUM'}
                            </button>
                            <button onClick={() => deleteLesson(ch.id, lesson.id)}
                              style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', color: 'rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}

                        {addingLesson === ch.id ? (
                          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la leçon" style={field()} autoFocus />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input value={newLesson.video_url} onChange={e => setNewLesson(p => ({ ...p, video_url: e.target.value }))} placeholder="URL YouTube ou Vimeo" style={field({ flex: 1 })} />
                              <select value={newLesson.video_type} onChange={e => setNewLesson(p => ({ ...p, video_type: e.target.value }))} style={field({ width: 110, cursor: 'pointer' })}>
                                <option value="youtube" style={{ background: '#07090e' }}>YouTube</option>
                                <option value="vimeo" style={{ background: '#07090e' }}>Vimeo</option>
                                <option value="upload" style={{ background: '#07090e' }}>Upload</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: SILVER }}>
                                <input type="checkbox" checked={newLesson.is_free} onChange={e => setNewLesson(p => ({ ...p, is_free: e.target.checked }))} />
                                Leçon gratuite
                              </label>
                              <div style={{ flex: 1 }} />
                              <button onClick={() => setAddingLesson(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                              <button onClick={() => addLesson(ch.id)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: CREAM, color: '#07090e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ajouter</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingLesson(ch.id); setNewLesson({ title: '', video_url: '', video_type: 'youtube', is_free: false }) }}
                            style={{ width: '100%', padding: '11px 18px', border: 'none', background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = CREAM}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = SILVER}>
                            <Plus size={13} /> Ajouter une leçon
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Nouveau chapitre */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChapter()} placeholder="Nom du nouveau chapitre…" style={field({ flex: 1 })} />
                    <button onClick={addChapter} disabled={!newChapterTitle.trim()}
                      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: CREAM, color: '#07090e', fontSize: 13, fontWeight: 800, cursor: newChapterTitle.trim() ? 'pointer' : 'not-allowed', opacity: newChapterTitle.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                      <Plus size={14} /> Chapitre
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Cal.com (coaching uniquement) ────────────────── */}
            {contentType === 'coaching' && (
              <div style={card()}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 18 }}>Calendrier Cal.com</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <p style={label()}>Lien Cal.com</p>
                    <input
                      value={formation.cal_url ?? ''}
                      onChange={e => setFormation((p: any) => ({ ...p, cal_url: e.target.value }))}
                      onBlur={async e => { await supabase.from('formations').update({ cal_url: e.target.value || null }).eq('id', id); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
                      placeholder="https://cal.com/ton-username"
                      style={field()} />
                  </div>
                  {formation.cal_url?.startsWith('http') ? (
                    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(232,228,220,0.08)', height: 560 }}>
                      <iframe src={formation.cal_url} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="Cal.com" />
                    </div>
                  ) : (
                    <div style={{ height: 100, borderRadius: 12, border: '2px dashed rgba(232,228,220,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontSize: 12, color: SILVER }}>Entrez votre lien Cal.com pour voir l'aperçu</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT — sidebar ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>

            {/* Publish */}
            <div style={card({ padding: 20 })}>
              <p style={label()}>Publication</p>
              <button onClick={togglePublish}
                style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 10, border: `1px solid ${formation.published ? 'rgba(239,68,68,0.35)' : `${activeType.color}40`}`, background: formation.published ? 'rgba(239,68,68,0.08)' : `${activeType.color}15`, color: formation.published ? '#ef4444' : activeType.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                {formation.published ? <><EyeOff size={14} /> Dépublier</> : <><Eye size={14} /> Publier</>}
              </button>
              <p style={{ fontSize: 11, color: SILVER, marginTop: 10, textAlign: 'center' }}>
                {formation.published ? 'Visible sur la marketplace' : 'Non visible — brouillon'}
              </p>
            </div>

            {/* Stats */}
            <div style={card({ padding: 20 })}>
              <p style={label()}>Statistiques</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={13} color={SILVER} />
                    <span style={{ fontSize: 12, color: SILVER }}>Élèves inscrits</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 800, color: CREAM }}>{students}</span>
                </div>
                <div style={{ height: 1, background: 'rgba(232,228,220,0.06)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={13} color={SILVER} />
                    <span style={{ fontSize: 12, color: SILVER }}>Revenus générés</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 800, color: CREAM }}>{revenue}€</span>
                </div>
              </div>
            </div>

            {/* Aperçu miniature */}
            {formation.thumbnail_url && (
              <div style={card({ padding: 16 })}>
                <p style={label()}>Aperçu carte</p>
                <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(232,228,220,0.06)' }}>
                  <div style={{
                    height: 120,
                    backgroundImage: `url(${formation.thumbnail_url})`,
                    backgroundSize: `${zoom * 100}%`,
                    backgroundPosition: `${position.x}% ${position.y}%`,
                    backgroundRepeat: 'no-repeat',
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${activeType.color}, ${activeType.color}80)` }} />
                    <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 800, background: 'rgba(7,9,14,0.72)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 99, color: '#fff' }}>
                      {formation.price === 0 ? 'Gratuit' : `${formation.price}€`}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'rgba(232,228,220,0.02)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: CREAM, marginBottom: 4 }}>{formation.title || 'Sans titre'}</div>
                    <div style={{ fontSize: 10, color: SILVER }}>{formation.level ?? 'Tous niveaux'} · {formation.variant ?? ''}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sauvegarde */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: 'rgba(232,228,220,0.02)', border: '1px solid rgba(232,228,220,0.06)' }}>
              <Save size={13} color={saved ? '#06b6d4' : SILVER} />
              <span style={{ fontSize: 11, color: saved ? '#06b6d4' : SILVER }}>
                {saving ? 'Sauvegarde en cours…' : saved ? 'Sauvegardé ✓' : 'Sauvegarde automatique'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  )
}

/* ── MiniatureEditor — même composant que la page création ── */
function MiniatureEditor({ preview, zoom, position, dragging, enhancing, onFile, onZoom, onMouseDown, onMouseMove, onMouseUp }: {
  preview: string
  zoom: number
  position: { x: number; y: number }
  dragging: boolean
  enhancing: boolean
  onFile: (f: File) => void
  onZoom: (z: number) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseUp: () => void
}) {
  if (!preview) {
    return (
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <div style={{ width: '100%', height: 200, borderRadius: 14, border: '2px dashed rgba(232,228,220,0.1)', background: 'rgba(232,228,220,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.3)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.1)'}>
          <Upload size={22} color="rgba(240,244,255,0.45)" />
          <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.45)' }}>Cliquer pour uploader</span>
          <span style={{ fontSize: 11, color: 'rgba(138,138,138,0.4)' }}>PNG, JPG, WEBP</span>
        </div>
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </label>
    )
  }
  return (
    <div>
      {/* Zone drag-to-crop */}
      <div
        style={{ position: 'relative', width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', cursor: 'grab', userSelect: 'none', background: '#111' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${preview})`, backgroundSize: `${zoom * 100}%`, backgroundPosition: `${position.x}% ${position.y}%`, backgroundRepeat: 'no-repeat' }} />
        {/* Masque assombri + cadre zone visible */}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '75%', aspectRatio: '16/9', border: '1.5px dashed rgba(232,228,220,0.5)', borderRadius: 4, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(232,228,220,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 99 }}>Zone visible</span>
        </div>
        {/* Badge IA */}
        {enhancing && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(7,9,14,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(124,58,237,0.5)', borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#f0f4ff', fontWeight: 600 }}>Amélioration IA…</span>
          </div>
        )}
      </div>
      {/* Contrôles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '9px 14px', background: 'rgba(232,228,220,0.04)', borderRadius: 10, border: '1px solid rgba(232,228,220,0.08)' }}>
        <ZoomOut size={13} color="rgba(240,244,255,0.45)" style={{ flexShrink: 0 }} />
        <input type="range" min={0.3} max={2} step={0.02} value={zoom} onChange={e => onZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#f0f4ff', height: 3 }} />
        <ZoomIn size={13} color="rgba(240,244,255,0.45)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: 'rgba(240,244,255,0.45)', minWidth: 36, textAlign: 'right' }}>{Math.round(zoom * 100)}%</span>
        <div style={{ width: 1, height: 14, background: 'rgba(232,228,220,0.1)', flexShrink: 0 }} />
        <label style={{ fontSize: 11, color: 'rgba(240,244,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <Upload size={11} /> Changer
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        </label>
      </div>
      <p style={{ fontSize: 10, color: 'rgba(138,138,138,0.4)', marginTop: 5 }}>Glissez pour repositionner · zoom avec le slider</p>
    </div>
  )
}
