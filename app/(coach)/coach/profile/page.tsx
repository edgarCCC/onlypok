'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import ProofGalleryModal from '@/components/ProofGalleryModal'
import type { Proof } from '@/components/ProofGalleryModal'
import Link from 'next/link'
import { Upload, Trash2, Check, Eye, ExternalLink, Calendar, Star, BookOpen, Save, ImageIcon } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.4)'
const VIOLET = '#7c3aed'

const CATEGORIES = [
  { value: 'longterme', label: 'Graphiques Long Terme' },
  { value: 'palmares',  label: 'Palmarès & Tournois' },
  { value: 'eleves',    label: 'Résultats Élèves' },
  { value: 'setup',     label: 'Environnement' },
  { value: 'technique', label: 'Maîtrise Technique' },
  { value: 'limites',   label: 'Historique Limites' },
]

function getColor(username: string) {
  const colors = ['#7c3aed', '#06b6d4', '#a855f7', '#ef4444', '#8b5cf6', '#ec4899']
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function CoachProfilePage() {
  const supabase     = useMemo(() => createClient(), [])
  const { user, profile } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bio,    setBio]    = useState('')
  const [calUrl, setCalUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const [proofs,    setProofs]    = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating,   setAvgRating]   = useState<number | null>(null)
  const [formCount,   setFormCount]   = useState(0)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [{ data: p }, { data: pr }, { data: r }, { data: f }] = await Promise.all([
        supabase.from('profiles').select('bio, cal_url').eq('id', user.id).single(),
        supabase.from('coach_proofs').select('*').eq('coach_id', user.id).order('order_index'),
        supabase.from('reviews').select('rating').eq('coach_id', user.id),
        supabase.from('formations').select('id').eq('coach_id', user.id).eq('published', true),
      ])
      if (p) { setBio(p.bio ?? ''); setCalUrl(p.cal_url ?? '') }
      setProofs(pr ?? [])
      setReviewCount(r?.length ?? 0)
      if (r && r.length > 0) setAvgRating(r.reduce((acc, x) => acc + x.rating, 0) / r.length)
      setFormCount(f?.length ?? 0)
      setLoading(false)
    })()
  }, [user, supabase])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ bio, cal_url: calUrl || null }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const uploadProof = async (file: File) => {
    if (!user) return
    setUploading(true)
    const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('coach-proofs').upload(path, file, { contentType: file.type })
    if (error) { setUploading(false); return }
    const { data: urlData } = supabase.storage.from('coach-proofs').getPublicUrl(path)
    const { data: inserted } = await supabase.from('coach_proofs').insert({
      coach_id: user.id, url: urlData.publicUrl,
      caption: '', category: 'longterme', order_index: proofs.length,
    }).select().single()
    if (inserted) setProofs(prev => [...prev, inserted])
    setUploading(false)
  }

  const updateProof = async (id: string, changes: Partial<Proof>) => {
    setProofs(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    await supabase.from('coach_proofs').update(changes).eq('id', id)
  }

  const deleteProof = async (id: string, url: string) => {
    const parts = url.split('/coach-proofs/')
    if (parts[1]) await supabase.storage.from('coach-proofs').remove([parts[1]])
    await supabase.from('coach_proofs').delete().eq('id', id)
    setProofs(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  const username = profile?.username ?? 'Coach'
  const color    = getColor(username)
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px 80px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Espace coach</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 44, color: SILVER, fontWeight: 200, lineHeight: 1 }}>[</span>
              <h1 style={{ fontSize: 44, fontWeight: 700, color: CREAM, letterSpacing: '-1px', fontFamily: 'var(--font-syne,sans-serif)', margin: 0, lineHeight: 1 }}>Mon profil</h1>
              <span style={{ fontSize: 44, color: SILVER, fontWeight: 200, lineHeight: 1 }}>]</span>
            </div>
            <p style={{ fontSize: 14, color: SILVER, marginTop: 10, lineHeight: 1.6 }}>Votre carte de visite publique — soignez-la.</p>
          </div>
          <Link
            href={`/coaches/${user?.id}`}
            target="_blank"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', color: SILVER, textDecoration: 'none', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            <ExternalLink size={13} /> Voir ma page publique
          </Link>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Note moyenne',        value: avgRating ? avgRating.toFixed(1) : '—', sub: `${reviewCount} avis`,         icon: Star },
            { label: 'Formations publiées', value: formCount,                              sub: 'en ligne',                    icon: BookOpen },
            { label: 'Preuves',             value: proofs.length,                          sub: 'photos uploadées',            icon: ImageIcon },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: SILVER, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                <Icon size={12} /> {label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: CREAM, letterSpacing: '-1px', lineHeight: 1, marginBottom: 3 }}>{value}</div>
              <div style={{ fontSize: 11, color: SILVER }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Section : Identité ── */}
        <Card title="Identité">
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 76, height: 76, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-1px', flexShrink: 0 }}>
                {initials}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(240,244,255,0.18)', textAlign: 'center', lineHeight: 1.4 }}>Photo<br />bientôt</span>
            </div>

            <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Pseudo">
                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 14, color: 'rgba(240,244,255,0.4)', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {username}
                </div>
              </Field>

              <Field label={`Bio · ${bio.length}/500`}>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 500))}
                  placeholder="Décrivez votre parcours, vos spécialités, ce qui vous distingue des autres coachs…"
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 14, color: CREAM, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                  onBlur={e =>  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* ── Section : Disponibilité ── */}
        <Card title="Disponibilité" subtitle="Lien Calendly ou Cal.com pour que vos élèves réservent directement.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={16} color={SILVER} style={{ flexShrink: 0 }} />
            <input
              type="url"
              value={calUrl}
              onChange={e => setCalUrl(e.target.value)}
              placeholder="https://cal.com/votre-profil"
              style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 14, color: CREAM, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
              onBlur={e =>  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
        </Card>

        {/* ── Bouton Enregistrer ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <button
            onClick={saveProfile}
            disabled={saving || saved}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '13px 30px', borderRadius: 10, border: 'none',
              background: saved ? 'rgba(34,197,94,0.12)' : VIOLET,
              color: saved ? '#4ade80' : '#fff',
              fontSize: 14, fontWeight: 700, cursor: saving || saved ? 'default' : 'pointer',
              transition: 'all 0.25s', letterSpacing: '0.01em',
              boxShadow: saved ? 'none' : '0 0 24px rgba(124,58,237,0.3)',
            }}
          >
            {saved
              ? <><Check size={15} /> Enregistré</>
              : saving
              ? 'Enregistrement…'
              : <><Save size={15} /> Enregistrer le profil</>}
          </button>
        </div>

        {/* ── Section : Preuves ── */}
        <Card
          title="Preuves & résultats"
          subtitle="SharkScope, classements, résultats — visibles sur votre profil public et vos formations."
          action={proofs.length > 0 ? (
            <button
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: SILVER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <Eye size={12} /> Prévisualiser
            </button>
          ) : null}
        >
          {/* Upload zone */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{ border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '28px 20px', marginBottom: proofs.length ? 20 : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: uploading ? 'wait' : 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(124,58,237,0.4)` }}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploading
                ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: CREAM, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <Upload size={17} color={SILVER} />}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: CREAM, margin: 0 }}>
              {uploading ? 'Upload en cours…' : 'Ajouter des preuves'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(240,244,255,0.22)', margin: 0 }}>PNG, JPG, WEBP · plusieurs fichiers acceptés</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={async e => { const files = Array.from(e.target.files ?? []); for (const f of files) await uploadProof(f); e.target.value = '' }} />

          {/* Grille */}
          {proofs.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {proofs.map(proof => (
                <div key={proof.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0c0f17' }}>
                    <img src={proof.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => deleteProof(proof.id, proof.url)}
                      style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} color="#ef4444" />
                    </button>
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <select value={proof.category} onChange={e => updateProof(proof.id, { category: e.target.value })}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px 10px', color: CREAM, fontSize: 11, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value} style={{ background: '#1a1d24' }}>{c.label}</option>)}
                    </select>
                    <input type="text" value={proof.caption ?? ''} onChange={e => updateProof(proof.id, { caption: e.target.value })}
                      placeholder="Légende (optionnel)"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '6px 10px', color: CREAM, fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      {showModal && <ProofGalleryModal proofs={proofs} coachName={username} onClose={() => setShowModal(false)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ── Composants locaux ── */

function Card({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: subtitle || action ? 20 : 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,244,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0, marginBottom: subtitle ? 6 : 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.28)', margin: 0, lineHeight: 1.55 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: 'rgba(240,244,255,0.35)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
