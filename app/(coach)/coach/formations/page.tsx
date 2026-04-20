'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'
import { Plus, Eye, EyeOff, Trash2, Edit2, Users, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'

const CREAM  = '#E8E4DC'
const SILVER = '#8A8A8A'

const TABS = [
  { id: 'all',       label: 'Tout',       color: '#E8E4DC', glow: 'rgba(232,228,220,0.15)' },
  { id: 'formation', label: 'Formations',  color: '#6366f1', glow: 'rgba(99,102,241,0.18)'  },
  { id: 'video',     label: 'Vidéos',      color: '#10b981', glow: 'rgba(16,185,129,0.18)'  },
  { id: 'coaching',  label: 'Coaching',    color: '#f59e0b', glow: 'rgba(245,158,11,0.18)'  },
]

const TYPE_COLORS: Record<string, string> = { formation: '#6366f1', video: '#10b981', coaching: '#f59e0b' }

export default function CoachFormationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useUser()
  const [formations, setFormations] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('all')
  const scrollRef                   = useRef<HTMLDivElement>(null)
  const [deleteModal, setDeleteModal] = useState<{ id: string, title: string } | null>(null)
  const [statTab, setStatTab] = useState('all')

  const activeTab = TABS.find(t => t.id === tab) ?? TABS[0]

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('formations')
        .select('*, formation_purchases(count)')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      setFormations(data ?? [])
      setLoading(false)
    }
    load()
  }, [user, supabase])

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('formations').update({ published: !current }).eq('id', id)
    setFormations(prev => prev.map(f => f.id === id ? { ...f, published: !current } : f))
  }

  const deleteFormation = async (id: string) => {
    await supabase.from('formations').delete().eq('id', id)
    setFormations(prev => prev.filter(f => f.id !== id))
    setDeleteModal(null)
  }

  const filtered = formations.filter(f => {
    const matchType = tab === 'all' || (f.content_type ?? 'formation') === tab
    const matchStat = statTab === 'all' ||
      (statTab === 'published' && f.published) ||
      (statTab === 'draft' && !f.published) ||
      statTab === 'revenue'
    return matchType && matchStat
  })

  // Stats par type
  const statsFor = (type: string) => {
    const list = type === 'all' ? formations : formations.filter(f => (f.content_type ?? 'formation') === type)
    const students = list.reduce((acc, f) => acc + (f.formation_purchases?.[0]?.count ?? 0), 0)
    const revenue  = list.reduce((acc, f) => acc + (f.price * (f.formation_purchases?.[0]?.count ?? 0)), 0)
    const published = list.filter(f => f.published).length
    return { students, revenue, published, total: list.length }
  }

  const stats = statsFor(tab)
  const scroll = (dir: 'left'|'right') => scrollRef.current?.scrollBy({ left: dir === 'right' ? 400 : -400, behavior: 'smooth' })

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM, position: 'relative', overflow: 'hidden' }}>

      {/* Glow dynamique */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${activeTab.glow} 0%, transparent 70%)`, transition: 'background 0.5s ease' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bonjour</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 52, color: SILVER, fontWeight: 200, lineHeight: 1, alignSelf: 'center', marginTop: 4 }}>[</span>
              <h1 style={{ fontSize: 52, fontWeight: 400, color: CREAM, letterSpacing: '-1px', lineHeight: 1, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', margin: 0 }}>
                {profile?.username ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1) : 'Coach'}
              </h1>
              <span style={{ fontSize: 52, color: SILVER, fontWeight: 200, lineHeight: 1, alignSelf: 'center', marginTop: 4 }}>]</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div>
          <Link href={`/coach/formations/new?type=${tab === "all" ? "formation" : tab}`} style={{ display: 'flex', alignItems: 'center', gap: 8, background: CREAM, color: '#07090e', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}>
            <Plus size={16} /> Nouveau contenu
          </Link>
          </div>
        </div>

        {/* Tabs carrousel style élève */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: 4, gap: 2 }}>
            {TABS.map(t => {
              const active = tab === t.id
              const s = statsFor(t.id)
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 12, border: 'none', background: active ? t.color + (t.id === 'all' ? '18' : '28') : 'transparent', color: active ? (t.id === 'all' ? CREAM : '#fff') : SILVER, fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: active && t.id !== 'all' ? `0 2px 14px ${t.color}50` : 'none' }}>
                  
                  {t.label}
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: active ? 'rgba(0,0,0,0.2)' : 'rgba(232,228,220,0.06)', color: active ? '#fff' : SILVER }}>{s.total}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Onglets stats cliquables */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 32 }}>
          {[
            { key: 'all',       label: 'Tous',       value: stats.total,                  sub: 'contenus' },
            { key: 'published', label: 'Publiés',    value: stats.published,              sub: `sur ${stats.total}` },
            { key: 'revenue',   label: 'Revenus',    value: stats.revenue + '€',          sub: 'estimés' },
            { key: 'draft',     label: 'Brouillons', value: stats.total - stats.published, sub: 'en attente' },
          ].map((s) => {
            const active = statTab === s.key
            return (
              <button key={s.key} onClick={() => setStatTab(s.key)} style={{ background: active ? 'rgba(232,228,220,0.06)' : 'rgba(232,228,220,0.02)', border: `1px solid ${active ? activeTab.color + '40' : 'rgba(232,228,220,0.07)'}`, borderRadius: 14, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: active ? activeTab.color : SILVER, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: active ? activeTab.color : CREAM, transition: 'color 0.3s' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(138,138,138,0.5)', marginTop: 2 }}>{s.sub}</div>
              </button>
            )
          })}
        </div>

        {/* Graphe revenus */}
        {statTab === 'revenue' && (
          <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 16, padding: '24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 20 }}>Revenus dans le temps</h3>
            {stats.revenue === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 20, opacity: 0.15 }}>
                  {[20,35,15,45,10,30,25].map((h, i) => <div key={i} style={{ width: 24, height: h, background: CREAM, borderRadius: 4 }} />)}
                </div>
                <p style={{ color: SILVER, fontSize: 13 }}>Pas encore de vente sur {tab === 'all' ? 'vos contenus' : `vos ${TABS.find(t => t.id === tab)?.label.toLowerCase()}`}</p>
                <p style={{ color: 'rgba(138,138,138,0.4)', fontSize: 12, marginTop: 4 }}>Le graphe s'affichera dès votre première vente</p>
              </div>
            ) : (
              <div>
                {/* Graphe simple barres par mois */}
                {(() => {
                  const months: Record<string, number> = {}
                  formations.filter(f => tab === 'all' || (f.content_type ?? 'formation') === tab).forEach(f => {
                    const count = f.formation_purchases?.[0]?.count ?? 0
                    const revenue = f.price * count
                    if (revenue === 0) return
                    const month = new Date(f.created_at).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
                    months[month] = (months[month] ?? 0) + revenue
                  })
                  const entries = Object.entries(months)
                  const max = Math.max(...entries.map(([, v]) => v), 1)
                  return entries.length === 0 ? (
                    <p style={{ color: SILVER, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Données insuffisantes</p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, paddingBottom: 24, position: 'relative' }}>
                      {entries.map(([month, rev]) => (
                        <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, color: activeTab.color, fontWeight: 700 }}>{rev}€</span>
                          <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: `linear-gradient(to top, ${activeTab.color}, ${activeTab.color}80)`, height: `${(rev / max) * 100}px`, minHeight: 4, transition: 'height 0.3s' }} />
                          <span style={{ fontSize: 10, color: SILVER }}>{month}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(3)].map((_, i) => <div key={i} style={{ height: 80, background: 'rgba(232,228,220,0.03)', borderRadius: 14 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: activeTab.color, opacity: 0.15, marginBottom: 16, margin: '0 auto 16px' }} />
            <p style={{ color: SILVER, fontSize: 14, marginBottom: 24 }}>
              {tab === 'all' ? 'Aucun contenu pour l\'instant' : `Aucune ${TABS.find(t => t.id === tab)?.label.toLowerCase()} pour l'instant`}
            </p>
            <Link href={`/coach/formations/new?type=${tab === "all" ? "formation" : tab}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: CREAM, color: '#07090e', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
              <Plus size={16} /> Créer mon premier contenu
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(f => {
              const students   = f.formation_purchases?.[0]?.count ?? 0
              const revenue    = f.price * students
              const type       = f.content_type ?? 'formation'
              const typeColor  = TABS.find(t => t.id === type)?.color ?? CREAM

              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '18px 24px', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.15)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.07)' }}>

                  {/* Barre couleur gauche selon type */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: typeColor, borderRadius: '14px 0 0 14px', opacity: 0.7 }} />

                  {/* Thumbnail / icône type */}
                  <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, position: 'relative', overflow: 'hidden', background: f.thumbnail_url ? 'transparent' : `${typeColor}15` }}>
                    {f.thumbnail_url
                      ? <div style={{ width: '100%', height: '100%', backgroundImage: `url(${f.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 20, height: 20, borderRadius: '50%', background: typeColor, opacity: 0.6 }} /></div>
                    }
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: f.published ? 'rgba(16,185,129,0.15)' : 'rgba(232,228,220,0.06)', color: f.published ? '#10b981' : SILVER, flexShrink: 0 }}>
                        {f.published ? 'Publié' : 'Brouillon'}
                      </span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${typeColor}18`, color: typeColor, flexShrink: 0, fontWeight: 600 }}>
                        {TABS.find(t => t.id === type)?.label}
                      </span>
                      {f.variant && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(232,228,220,0.06)', color: SILVER, flexShrink: 0 }}>{f.variant}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: SILVER }}>
                      <span>{students} élève{students > 1 ? 's' : ''}</span>
                      <span>{revenue}€</span>
                      <span>{f.price === 0 ? 'Gratuit' : `${f.price}€`}</span>
                      {f.level && <span>{f.level}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => togglePublish(f.id, f.published)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: f.published ? '#10b981' : SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {f.published ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <Link href={`/coach/formations/${f.id}`} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = CREAM}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = SILVER}>
                      <Edit2 size={15} />
                    </Link>
                    <button onClick={() => setDeleteModal({ id: f.id, title: f.title })} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.5)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modale suppression */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,9,14,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111418', border: '1px solid rgba(232,228,220,0.12)', borderRadius: 20, padding: '36px 40px', maxWidth: 400, width: '90%', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Trash2 size={20} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: CREAM, marginBottom: 10, letterSpacing: '-0.3px' }}>
              Supprimer ce contenu ?
            </h3>
            <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.6, marginBottom: 6 }}>
              Vous êtes sur le point de supprimer
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 24 }}>
              "{deleteModal.title}"
            </p>
            <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.7)', marginBottom: 28 }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => deleteFormation(deleteModal.id)} style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'}>
                Oui, supprimer définitivement
              </button>
              <button onClick={() => setDeleteModal(null)} style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
