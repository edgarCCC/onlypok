'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, GripVertical, Upload,
  Eye, EyeOff, Video, ZoomIn, ZoomOut, Save, Users, DollarSign, Check, Pencil,
} from 'lucide-react'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import { HIGHLIGHTS_COACHING, HIGHLIGHTS_FORMATION, HIGHLIGHTS_VIDEO } from '@/lib/highlights'
import SelectInput from '@/components/ui/SelectInput'
import NumberStepper from '@/components/ui/NumberStepper'

type Pack = { label: string; hours: number; price: number; desc: string }

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

  const [highlights, setHighlights] = useState<string[]>([])
  const [packs, setPacks]           = useState<Pack[]>([])

  const [galleryUrls,     setGalleryUrls]     = useState<string[]>([])
  const [galleryNew,      setGalleryNew]      = useState<{ file: File; preview: string }[]>([])
  const [galleryUploading, setGalleryUploading] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [newChapterTitle, setNewChapterTitle]         = useState('')
  const [editingChapterId, setEditingChapterId]       = useState<string | null>(null)
  const [editingChapterTitle, setEditingChapterTitle] = useState('')
  const [addingLesson, setAddingLesson]               = useState<string | null>(null)
  const [newLesson, setNewLesson] = useState({ title: '', video_url: '', video_type: 'youtube', is_free: false })
  const [editingLessonId, setEditingLessonId]         = useState<string | null>(null)
  const [editingLesson, setEditingLesson]             = useState({ title: '', video_url: '', video_type: 'youtube', is_free: false })

  const [publishError, setPublishError] = useState<string | null>(null)

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
      if (Array.isArray(f?.highlights)) setHighlights(f.highlights)
      if (Array.isArray(f?.gallery_urls)) setGalleryUrls(f.gallery_urls)
      if (Array.isArray(f?.coaching_packs) && f.coaching_packs.length > 0) setPacks(f.coaching_packs)
      else if (f?.content_type === 'coaching') setPacks([
        { label: 'Starter',     hours: 1,  price: 80,  desc: "1 session d'1h pour démarrer" },
        { label: 'Progression', hours: 5,  price: 350, desc: '5 sessions pour progresser vite' },
        { label: 'Elite',       hours: 10, price: 600, desc: '10 sessions — engagement total' },
      ])
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
  const autoSave = useCallback((updated: any, updatedPacks?: Pack[], updatedHighlights?: string[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('formations').update({
        title:          updated.title,
        description:    updated.description,
        short_desc:     updated.short_desc,
        price:          updated.price,
        level:          updated.level,
        variant:        updated.variant,
        video_url:      updated.video_url ?? null,
        cal_url:        updated.cal_url ?? null,
        coaching_packs: updatedPacks ?? null,
        highlights:     updatedHighlights ?? null,
      }).eq('id', id)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 800)
  }, [id, supabase])

  const savePacks = useCallback((updated: Pack[]) => {
    setPacks(updated)
    if (formation) autoSave(formation, updated, highlights)
  }, [formation, highlights, autoSave])

  const saveHighlights = useCallback((updated: string[]) => {
    setHighlights(updated)
    if (formation) autoSave(formation, packs, updated)
  }, [formation, packs, autoSave])

  const updateField = (key: string, value: any) => {
    const updated = { ...formation, [key]: value }
    setFormation(updated)
    autoSave(updated, packs, highlights)
  }

  const changeType = async (t: ContentType) => {
    setContentType(t)
    await supabase.from('formations').update({ content_type: t }).eq('id', id)
  }

  const togglePublish = async () => {
    const next = !formation.published
    if (next) {
      const { count } = await supabase
        .from('coach_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', user?.id ?? '')
        .eq('category', 'stats')
      if (!count || count === 0) {
        setPublishError('Ajoute au moins 1 screenshot de stats officielles dans ton profil avant de publier.')
        return
      }
      setPublishError(null)
    }
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

  /* Gallery photos (coaching) */
  const uploadAndSaveGallery = async (newFiles: { file: File; preview: string }[]) => {
    if (!user || newFiles.length === 0) return
    setGalleryUploading(true)
    const uploaded: string[] = []
    for (const { file } of newFiles) {
      const ext  = file.name.split('.').pop()
      const path = `${user.id}/gallery/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('formations-thumbnails').upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('formations-thumbnails').getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }
    }
    const next = [...galleryUrls, ...uploaded].slice(0, 4)
    await supabase.from('formations').update({ gallery_urls: next }).eq('id', id)
    setGalleryUrls(next)
    setGalleryNew([])
    setGalleryUploading(false)
  }

  const removeGalleryUrl = async (url: string) => {
    const next = galleryUrls.filter(u => u !== url)
    await supabase.from('formations').update({ gallery_urls: next }).eq('id', id)
    setGalleryUrls(next)
  }

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
  const renameChapter = async (chId: string) => {
    const title = editingChapterTitle.trim()
    if (!title) return
    await supabase.from('formation_chapters').update({ title }).eq('id', chId)
    setChapters(p => p.map(c => c.id === chId ? { ...c, title } : c))
    setEditingChapterId(null)
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
  const updateLesson = async (chId: string, lId: string) => {
    const title = editingLesson.title.trim()
    if (!title) return
    await supabase.from('formation_lessons').update({
      title,
      video_url:  editingLesson.video_url || null,
      video_type: editingLesson.video_type,
      is_free:    editingLesson.is_free,
    }).eq('id', lId)
    setChapters(p => p.map(c => c.id === chId
      ? { ...c, formation_lessons: c.formation_lessons.map((l: any) => l.id === lId
          ? { ...l, title, video_url: editingLesson.video_url || null, video_type: editingLesson.video_type, is_free: editingLesson.is_free }
          : l) }
      : c))
    setEditingLessonId(null)
  }
  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id)
    setEditingLesson({ title: lesson.title, video_url: lesson.video_url ?? '', video_type: lesson.video_type ?? 'youtube', is_free: lesson.is_free ?? false })
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
              <h1 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', margin: 0, fontFamily: 'var(--font-syne,sans-serif)' }}>{formation.title || 'Sans titre'}</h1>
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
                    <NumberStepper value={formation.price ?? 0} onChange={v => updateField('price', v)} min={0} max={9999} step={5} suffix="€" />
                  </div>
                  <div>
                    <p style={label()}>Variante</p>
                    <SelectInput value={formation.variant ?? 'MTT'} onChange={v => {
                      const next = { ...formation, variant: v, level: 'Débutant' }
                      setFormation(next)
                      autoSave(next, packs, highlights)
                    }} options={VARIANTS.map(v => ({ value: v, label: v }))} />
                  </div>
                  <div>
                    <p style={label()}>Niveau</p>
                    <SelectInput value={formation.level ?? 'Débutant'} onChange={v => updateField('level', v)}
                      options={(LEVELS_BY_VARIANT[formation.variant ?? 'MTT'] ?? LEVELS_BY_VARIANT.Autre).map(l => ({ value: l.value, label: l.label }))} />
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
                        {editingChapterId === ch.id ? (
                          <input
                            autoFocus
                            value={editingChapterTitle}
                            onChange={e => setEditingChapterTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') renameChapter(ch.id); if (e.key === 'Escape') setEditingChapterId(null) }}
                            onBlur={() => renameChapter(ch.id)}
                            style={{ flex: 1, background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(124,58,237,0.45)', borderRadius: 6, padding: '4px 8px', color: CREAM, fontSize: 13, fontWeight: 700, outline: 'none' }}
                          />
                        ) : (
                          <span
                            style={{ flex: 1, fontSize: 13, fontWeight: 700, color: CREAM, cursor: 'pointer' }}
                            title="Cliquer pour renommer"
                            onDoubleClick={() => { setEditingChapterId(ch.id); setEditingChapterTitle(ch.title) }}>
                            {ci + 1}. {ch.title}
                          </span>
                        )}
                        <button
                          onClick={() => { setEditingChapterId(ch.id); setEditingChapterTitle(ch.title) }}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(232,228,220,0.08)', background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = CREAM}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = SILVER}
                          title="Renommer">
                          <Pencil size={11} />
                        </button>
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
                          <div key={lesson.id} style={{ borderBottom: '1px solid rgba(232,228,220,0.04)' }}>
                            {editingLessonId === lesson.id ? (
                              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input
                                  autoFocus
                                  value={editingLesson.title}
                                  onChange={e => setEditingLesson(p => ({ ...p, title: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') updateLesson(ch.id, lesson.id); if (e.key === 'Escape') setEditingLessonId(null) }}
                                  placeholder="Titre de la leçon"
                                  style={field({ fontSize: 12 })} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <input
                                    value={editingLesson.video_url}
                                    onChange={e => setEditingLesson(p => ({ ...p, video_url: e.target.value }))}
                                    placeholder="URL YouTube ou Vimeo"
                                    style={field({ flex: 1, fontSize: 12 })} />
                                  <SelectInput value={editingLesson.video_type} onChange={v => setEditingLesson(p => ({ ...p, video_type: v }))}
                                    options={[{ value: 'youtube', label: 'YouTube' }, { value: 'vimeo', label: 'Vimeo' }, { value: 'upload', label: 'Upload' }]}
                                    style={{ width: 110 }} selectStyle={{ fontSize: 12, padding: '8px 32px 8px 10px' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: SILVER }}>
                                    <input type="checkbox" checked={editingLesson.is_free} onChange={e => setEditingLesson(p => ({ ...p, is_free: e.target.checked }))} />
                                    Leçon gratuite
                                  </label>
                                  <div style={{ flex: 1 }} />
                                  <button onClick={() => setEditingLessonId(null)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, fontSize: 11, cursor: 'pointer' }}>Annuler</button>
                                  <button onClick={() => updateLesson(ch.id, lesson.id)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: CREAM, color: '#07090e', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Check size={11} /> Sauvegarder
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px' }}
                                onMouseEnter={e => (e.currentTarget.querySelector('.lesson-edit-btn') as HTMLElement | null)?.style.setProperty('opacity', '1')}
                                onMouseLeave={e => (e.currentTarget.querySelector('.lesson-edit-btn') as HTMLElement | null)?.style.setProperty('opacity', '0')}>
                                <Video size={12} color={SILVER} style={{ opacity: 0.4, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: CREAM }}>{lesson.title}</span>
                                {lesson.video_url && <span style={{ fontSize: 10, color: SILVER, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.video_url}</span>}
                                <button className="lesson-edit-btn" onClick={() => startEditLesson(lesson)}
                                  style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s' }}>
                                  <Pencil size={10} />
                                </button>
                                <button onClick={() => toggleLessonFree(ch.id, lesson)}
                                  style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: `1px solid ${lesson.is_free ? 'rgba(6,182,212,0.4)' : 'rgba(232,228,220,0.1)'}`, background: lesson.is_free ? 'rgba(6,182,212,0.1)' : 'transparent', color: lesson.is_free ? '#06b6d4' : SILVER, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.06em' }}>
                                  {lesson.is_free ? 'GRATUIT' : 'PREMIUM'}
                                </button>
                                <button onClick={() => deleteLesson(ch.id, lesson.id)}
                                  style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', color: 'rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {addingLesson === ch.id ? (
                          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la leçon" style={field()} autoFocus />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input value={newLesson.video_url} onChange={e => setNewLesson(p => ({ ...p, video_url: e.target.value }))} placeholder="URL YouTube ou Vimeo" style={field({ flex: 1 })} />
                              <SelectInput value={newLesson.video_type} onChange={v => setNewLesson(p => ({ ...p, video_type: v }))}
                                options={[{ value: 'youtube', label: 'YouTube' }, { value: 'vimeo', label: 'Vimeo' }, { value: 'upload', label: 'Upload' }]}
                                style={{ width: 110 }} selectStyle={{ fontSize: 12, padding: '8px 32px 8px 10px' }} />
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

            {/* ── Packs & Cal.com (coaching uniquement) ─────────── */}
            {contentType === 'coaching' && (
              <>
                {/* Photos complémentaires */}
                <div style={card()}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 6 }}>Photos complémentaires</h2>
                  <p style={{ fontSize: 12, color: SILVER, marginBottom: 16 }}>Jusqu'à 4 photos visibles sur ta page de vente (sessions, résultats, méthode…)</p>
                  <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []).slice(0, 4 - galleryUrls.length - galleryNew.length)
                      const items = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
                      const next = [...galleryNew, ...items].slice(0, 4 - galleryUrls.length)
                      setGalleryNew(next)
                      e.target.value = ''
                    }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: galleryNew.length > 0 ? 12 : 0 }}>
                    {/* Photos existantes en DB */}
                    {galleryUrls.map((url, i) => (
                      <div key={url} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#0d1117' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => removeGalleryUrl(url)}
                          style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, lineHeight: 1 }}>
                          ×
                        </button>
                      </div>
                    ))}
                    {/* Nouvelles photos en attente */}
                    {galleryNew.map((g, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#0d1117', opacity: 0.7 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => setGalleryNew(prev => prev.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, lineHeight: 1 }}>
                          ×
                        </button>
                      </div>
                    ))}
                    {/* Bouton ajouter */}
                    {(galleryUrls.length + galleryNew.length) < 4 && (
                      <button type="button" onClick={() => galleryInputRef.current?.click()}
                        style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed rgba(240,244,255,0.1)', background: 'rgba(240,244,255,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: SILVER, transition: 'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(240,244,255,0.3)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(240,244,255,0.1)'}>
                        <Upload size={18} />
                        <span style={{ fontSize: 11 }}>Ajouter</span>
                      </button>
                    )}
                  </div>
                  {galleryNew.length > 0 && (
                    <button type="button" onClick={() => uploadAndSaveGallery(galleryNew)} disabled={galleryUploading}
                      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#000', fontSize: 13, fontWeight: 700, cursor: galleryUploading ? 'wait' : 'pointer', opacity: galleryUploading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Save size={14} /> {galleryUploading ? 'Upload…' : `Sauvegarder (${galleryNew.length} photo${galleryNew.length > 1 ? 's' : ''})`}
                    </button>
                  )}
                </div>

                {/* Packs */}
                <div style={card()}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 18 }}>Packs & tarifs</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {packs.map((pack, i) => (
                      <div key={i} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                            <input value={pack.label} onChange={e => savePacks(packs.map((p, idx) => idx === i ? { ...p, label: e.target.value } : p))} style={field({ width: 200, padding: '6px 12px', fontSize: 13, fontWeight: 700 })} />
                          </div>
                          {packs.length > 1 && (
                            <button onClick={() => savePacks(packs.filter((_, idx) => idx !== i))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
                          <div><p style={label()}>Heures</p><NumberStepper value={pack.hours} onChange={v => savePacks(packs.map((p, idx) => idx === i ? { ...p, hours: v } : p))} min={1} max={100} step={1} suffix="h" /></div>
                          <div><p style={label()}>Prix (€)</p><NumberStepper value={pack.price} onChange={v => savePacks(packs.map((p, idx) => idx === i ? { ...p, price: v } : p))} min={0} max={9999} step={5} suffix="€" /></div>
                          <div><p style={label()}>Description</p><input value={pack.desc} onChange={e => savePacks(packs.map((p, idx) => idx === i ? { ...p, desc: e.target.value } : p))} placeholder="Ce que comprend ce pack" style={field()} /></div>
                        </div>
                        {pack.hours > 0 && pack.price > 0 && <p style={{ fontSize: 11, color: SILVER, marginTop: 8 }}>{Math.round(pack.price / pack.hours)}€/h</p>}
                      </div>
                    ))}
                    <button onClick={() => savePacks([...packs, { label: 'Nouveau pack', hours: 1, price: 0, desc: '' }])}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, border: '1px dashed rgba(240,244,255,0.08)', background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = CREAM}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = SILVER}>
                      <Plus size={14} /> Ajouter un pack
                    </button>
                  </div>
                </div>

                {/* Calendrier natif */}
                <div style={{ ...card(), background: 'rgba(124,58,237,0.04)', borderColor: 'rgba(124,58,237,0.2)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 }}>Calendrier intégré OnlyPok</p>
                  <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.65, margin: 0 }}>
                    Les élèves choisissent leur créneau directement sur ta page coaching.
                    Configure tes disponibilités dans ton{' '}
                    <a href="/coach/calendar" style={{ color: '#a855f7', textDecoration: 'underline' }}>calendrier coach</a>.
                  </p>
                </div>
              </>
            )}

            {/* ── Atouts mis en avant ───────────────────────────── */}
            <div style={card()}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 6 }}>Atouts mis en avant</h2>
              <p style={{ fontSize: 12, color: SILVER, marginBottom: 18 }}>Choisissez 1 à 5 atouts affichés sur la page de vente.</p>
              <HighlightsPicker
                selected={highlights}
                onChange={saveHighlights}
                color={contentType === 'coaching' ? '#f59e0b' : contentType === 'video' ? '#06b6d4' : '#7c3aed'}
                options={contentType === 'coaching' ? HIGHLIGHTS_COACHING : contentType === 'video' ? HIGHLIGHTS_VIDEO : HIGHLIGHTS_FORMATION}
              />
            </div>
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
              {publishError && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '10px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span style={{ fontSize: 11, color: '#fca5a5', lineHeight: 1.5 }}>
                    ⚠ {publishError}
                  </span>
                  <Link href="/coach/profile" style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textDecoration: 'none', flexShrink: 0, alignSelf: 'flex-start' }}>→ Profil</Link>
                </div>
              )}
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

function HighlightsPicker({
  selected, onChange, color, options,
}: { selected: string[]; onChange: (ids: string[]) => void; color: string; options: { id: string; label: string; Icon: React.ElementType }[] }) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id))
    else if (selected.length < 5) onChange([...selected, id])
  }
  const SILVER = 'rgba(240,244,255,0.45)'
  const CREAM  = '#f0f4ff'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: selected.length > 0 ? `${color}18` : 'rgba(232,228,220,0.05)', color: selected.length > 0 ? color : SILVER, border: `1px solid ${selected.length > 0 ? color + '40' : 'rgba(232,228,220,0.1)'}` }}>
          {selected.length}/5
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {options.map(h => {
          const active   = selected.includes(h.id)
          const disabled = !active && selected.length >= 5
          return (
            <button key={h.id} type="button" onClick={() => toggle(h.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, textAlign: 'left', border: `1px solid ${active ? color + '55' : 'rgba(232,228,220,0.08)'}`, background: active ? `${color}12` : 'rgba(232,228,220,0.02)', color: active ? CREAM : disabled ? 'rgba(232,228,220,0.2)' : SILVER, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, transition: 'all 0.15s' }}>
              <h.Icon size={14} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, lineHeight: 1.3, flex: 1 }}>{h.label}</span>
              {active && <Check size={12} color={color} style={{ flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
