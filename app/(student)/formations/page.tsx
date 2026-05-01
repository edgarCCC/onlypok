'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, ChevronRight, ChevronLeft, HelpCircle, Menu, X, Check, PlayCircle, Users, BookOpen, Star, MessageSquare, Clock, TrendingUp, Award, Send, FileText } from 'lucide-react'
import FormationCard from '@/components/formations/FormationCard'
import FourAcesLoader from '@/components/FourAcesLoader'
import Link from 'next/link'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'

const VARIANT_OPTIONS = [
  { id: 'MTT',      label: 'MTT',      desc: 'Tournois multi-tables',  color: '#7c3aed' },
  { id: 'Cash',     label: 'Cash',     desc: 'Tables cash 6-max / HU', color: '#06b6d4' },
  { id: 'Expresso', label: 'Expresso', desc: 'Sit & Go hyper-turbo',   color: '#e11d48' },
  { id: 'Autre',    label: 'Autre',    desc: 'Podcast, live, analyse…', color: '#7c3aed' },
]

const FIELDS: Record<string, { key: string, label: string, placeholder: string, options: string[] }[]> = {
  formations: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'price',    label: 'Prix',     placeholder: 'Tous',   options: ['Gratuit', '< 30€', '30–60€', '> 60€'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 2h', '2h – 5h', '> 5h'] },
  ],
  videos: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'level',    label: 'Niveau',   placeholder: 'Tous',   options: ['Débutant', 'Intermédiaire', 'Avancé'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 15min', '15–45min', '> 45min'] },
  ],
  coaching: [
    { key: 'variant',  label: 'Variante',      placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'budget',   label: 'Budget',        placeholder: 'Tous',   options: ['< 50€/h', '50–100€/h', '> 100€/h'] },
    { key: 'dispo',    label: 'Disponibilité', placeholder: 'Quand ?',options: ['Cette semaine', 'Ce mois', 'Flexible'] },
  ],
}

const TAB_COLORS: Record<string, string> = {
  formations: '#7c3aed',
  videos:     '#06b6d4',
  coaching:   '#f59e0b',
}

export default function FormationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [formations, setFormations] = useState<any[]>([])
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'formations'|'videos'|'coaching'>('videos')
  const [showMenu, setShowMenu]     = useState(false)
  const [activeField, setActiveField] = useState<string|null>(null)
  const [filters, setFilters]       = useState<Record<string,string>>({})
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null)
  const [userRole, setUserRole] = useState<'coach' | 'student' | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const selectedVariantColor = VARIANT_OPTIONS.find(v => v.id === filters.variant)?.color
  const accentColor = selectedVariantColor || TAB_COLORS[tab]
  const fields = FIELDS[tab]

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('formations')
        .select('*, coach:profiles(id, username)')
        .eq('published', true)
        .order('created_at', { ascending: false })
      setFormations(data ?? [])

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating, category_ratings, coach_id, content_type')
      setAllReviews(reviews ?? [])

      setLoading(false)
    }
    load()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(data?.role ?? null)
    })
  }, [supabase])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
      if (window.scrollY <= 10) setIsSearchOverlayOpen(false)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlayingVideo(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveField(null)
        setIsSearchOverlayOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = formations.filter(f => {
    const v = filters.variant, p = filters.price, d = filters.duration
    const matchV = !v || f.variant === v
    const matchP = !p || (p === 'Gratuit' && f.price === 0) || (p === '< 30€' && f.price > 0 && f.price < 30) || (p === '30–60€' && f.price >= 30 && f.price <= 60) || (p === '> 60€' && f.price > 60)
    const matchD = !d || (d === '< 2h' && f.duration_minutes < 120) || (d === '2h – 5h' && f.duration_minutes >= 120 && f.duration_minutes <= 300) || (d === '> 5h' && f.duration_minutes > 300)
    const contentType = f.content_type ?? 'formation'
    const matchTab = tab === 'formations' ? contentType === 'formation' : tab === 'videos' ? contentType === 'video' : tab === 'coaching' ? contentType === 'coaching' : true
    return matchTab && matchV && matchP && matchD
  })

  const tabReviews = useMemo(() => {
    const coachIds = new Set(filtered.map((f: any) => f.coach?.id).filter(Boolean))
    const expectedType = tab === 'videos' ? 'video' : tab === 'coaching' ? 'coaching' : 'formation'
    return allReviews.filter(r =>
      coachIds.has(r.coach_id) &&
      (r.content_type ?? 'formation') === expectedType
    )
  }, [filtered, allReviews, tab])

  const setFilter = (key: string, val: string) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }))
    setActiveField(null)
  }

  const showBigSearch = !isScrolled || isSearchOverlayOpen

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: '#fff', overflowX: 'hidden' }}>

      {/* Lumière centrale forte */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${accentColor}35 0%, ${accentColor}10 50%, transparent 80%)`,
        transition: 'background 0.6s ease',
      }} />

      {/* Overlay sombre quand overlay ouvert */}
      {isScrolled && isSearchOverlayOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease' }} />
      )}

      {/* ══════════════════════
          HEADER
      ══════════════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: isScrolled ? 'rgba(7,9,14,0.97)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px)' : 'none',
        borderBottom: isScrolled ? `1px solid rgba(232,228,220,0.07)` : 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 80, padding: '0 40px', gap: 24 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: CREAM, letterSpacing: '0.12em', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(124,58,237,0.55)' }}>COACH</span>
          </Link>

          {/* Centre */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: 48, alignItems: 'center' }}>
            {/* Tabs */}
            <div style={{ position: 'absolute', display: 'inline-flex', background: 'rgba(232,228,220,0.04)', border: `1px solid rgba(232,228,220,0.08)`, borderRadius: 14, padding: 4, gap: 4, transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)', opacity: showBigSearch ? 1 : 0, pointerEvents: showBigSearch ? 'auto' : 'none', transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.92)', zIndex: 10 }}>
              {(['formations','videos','coaching'] as const).map(t => {
                const active = tab === t
                const labels: Record<string,string> = { formations: 'Formations', videos: 'Vidéos', coaching: 'Coaching' }
                return (
                  <button key={t} onClick={() => { setTab(t); setFilters({}); setIsSearchOverlayOpen(false) }} style={{ padding: '8px 24px', borderRadius: 10, border: 'none', background: active ? `${TAB_COLORS[t]}28` : 'transparent', color: active ? CREAM : SILVER, fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.25s' }}>
                    {labels[t]}
                  </button>
                )
              })}
            </div>

            {/* Pilule compacte */}
            <div style={{ position: 'absolute', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)', opacity: !showBigSearch ? 1 : 0, pointerEvents: !showBigSearch ? 'auto' : 'none', transform: !showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.92)' }}>
              <button onClick={() => setIsSearchOverlayOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(240,244,255,0.05)', border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 40, padding: '6px 8px 6px 20px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{filters.variant || 'Variante'}</span>
                <div style={{ width: 1, height: 16, background: `rgba(240,244,255,0.12)` }} />
                <span style={{ fontSize: 13, color: SILVER }}>Rechercher…</span>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${accentColor}60` }}>
                  <Search size={15} color="#fff" />
                </div>
              </button>
            </div>
          </div>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Link
              href={userRole === 'coach' ? '/coach/dashboard' : userRole === 'student' ? '/formations' : '/become-coach'}
              style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none', padding: '8px 16px', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.25)` }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.1)` }}>
              {userRole ? 'Mon espace' : 'Devenir coach'}
            </Link>
            <button style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(232,228,220,0.03)', border: `1px solid rgba(232,228,220,0.08)`, color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
              <HelpCircle size={16} />
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(!showMenu)} style={{ width: 38, height: 38, borderRadius: 10, background: showMenu ? 'rgba(232,228,220,0.08)' : 'rgba(232,228,220,0.03)', border: `1px solid rgba(232,228,220,0.08)`, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                <Menu size={16} />
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', top: 46, right: 0, background: '#07070f', border: `1px solid rgba(240,244,255,0.08)`, borderRadius: 14, padding: 6, minWidth: 200, zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div style={{ padding: '8px 14px 12px', borderBottom: `1px solid rgba(240,244,255,0.05)`, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Menu</span>
                  </div>
                  {[['Mes formations', '/formations'], ['Coaches', '/coaches'], ['Tracker', '/track'], ['Déconnexion', '/login']].map(([label, href]) => (
                    <Link key={label} href={href} style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: SILVER, textDecoration: 'none', borderRadius: 8, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = CREAM }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = SILVER }}>
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div ref={searchRef} style={{ height: showBigSearch ? 110 : 0, opacity: showBigSearch ? 1 : 0, pointerEvents: showBigSearch ? 'auto' : 'none', transition: 'all 0.4s cubic-bezier(0.2,0.8,0.2,1)', display: 'flex', justifyContent: 'center', paddingBottom: 20, transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-24px) scale(0.97)' }}>
          <div style={{ width: '100%', maxWidth: 860, position: 'relative', padding: '0 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(20,23,30,0.9)', backdropFilter: 'blur(25px)', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 50, padding: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              {fields.map((field, idx) => {
                const isActive = activeField === field.key
                const isLast   = idx === fields.length - 1
                return (
                  <div key={field.key} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setActiveField(isActive ? null : field.key)} style={{ flex: 1, textAlign: 'left', border: 'none', padding: '12px 26px', cursor: 'pointer', background: isActive ? 'rgba(232,228,220,0.08)' : 'transparent', borderRadius: 40, transition: 'all 0.2s', width: '100%' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isActive ? CREAM : SILVER, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{field.label}</div>
                      <div style={{ fontSize: 13, color: filters[field.key] ? CREAM : 'rgba(138,138,138,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {filters[field.key] || field.placeholder}
                        {filters[field.key] && (
                          <span onClick={e => { e.stopPropagation(); setFilter(field.key, filters[field.key]) }} style={{ color: SILVER, cursor: 'pointer' }}><X size={12} /></span>
                        )}
                      </div>
                    </button>

                    {!isLast && !isActive && activeField !== fields[idx+1]?.key && (
                      <div style={{ width: 1, height: 22, background: `rgba(232,228,220,0.1)`, position: 'absolute', right: 0 }} />
                    )}

                    {/* Dropdown — prend exactement la largeur du champ parent */}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 14px)',
                        left: 0,
                        right: 0,
                        background: '#07070f',
                        border: `1px solid rgba(240,244,255,0.08)`,
                        borderRadius: 20,
                        padding: 14,
                        zIndex: 110,
                        boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                        animation: 'airbnbPop 0.25s ease',
                      }}>
                        <div style={{ padding: '4px 8px 12px', borderBottom: `1px solid rgba(240,244,255,0.05)`, marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{field.label}</span>
                        </div>

                        {activeField === 'variant' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {VARIANT_OPTIONS.map(v => {
                              const selected = filters.variant === v.id
                              return (
                                <button key={v.id} onClick={() => setFilter('variant', v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: `1px solid ${selected ? v.color + '50' : 'rgba(232,228,220,0.05)'}`, background: selected ? `${v.color}18` : 'rgba(232,228,220,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.02)' }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${v.color}30`, border: `1px solid ${v.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: v.color }}>
                                    {v.id === 'MTT' ? '♠' : v.id === 'Cash' ? '♣' : v.id === 'Expresso' ? '♥' : v.id === 'Live' ? '♦' : '♣'}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{v.label}</div>
                                    <div style={{ fontSize: 11, color: SILVER, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.desc}</div>
                                  </div>
                                  {selected && <Check size={15} color={v.color} style={{ flexShrink: 0 }} />}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {fields.find(f => f.key === activeField)?.options.map(o => {
                              const selected = filters[activeField] === o
                              return (
                                <button key={o} onClick={() => setFilter(activeField, o)} style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: selected ? 600 : 400, border: 'none', background: selected ? `${accentColor}20` : 'transparent', color: selected ? CREAM : SILVER, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                                  {o}
                                  {selected && <Check size={14} color={accentColor} />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ paddingLeft: 8 }}>
                <button style={{ width: 52, height: 52, borderRadius: '50%', background: accentColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 6px 20px ${accentColor}55`, flexShrink: 0, transition: 'box-shadow 0.3s' }}>
                  <Search size={20} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════
          CONTENU
      ══════════════════════ */}
      <main style={{ paddingTop: 220, paddingLeft: 40, paddingRight: 40, paddingBottom: 100, position: 'relative', zIndex: 1 }}>
        {loading ? (
          <FourAcesLoader fullPage={false} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: 48, opacity: 0.1, marginBottom: 16 }}>♠</div>
            <p style={{ color: 'rgba(232,228,220,0.2)', fontSize: 14 }}>
              {tab === 'videos' ? 'Aucune vidéo disponible' : tab === 'coaching' ? 'Aucun coaching disponible' : 'Aucune formation disponible'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
            {filtered.slice(0, 10).length > 0 && (
              <NetflixRow
                title={tab === 'videos' ? 'Top vidéos' : tab === 'coaching' ? 'Nos coachs' : 'Top formations'}
                subtitle="Les plus populaires du moment"
                formations={filtered.slice(0, 10)}
                accentColor={accentColor}
                isTop10={filtered.length >= 3}
                onPlayVideo={setPlayingVideo}
              />
            )}
            {filtered.filter(f => f.price === 0).length > 0 && (
              <NetflixRow
                title="Accès gratuit"
                subtitle="Commence sans rien débourser"
                formations={filtered.filter(f => f.price === 0)}
                accentColor={accentColor}
                onPlayVideo={setPlayingVideo}
              />
            )}
            {filtered.filter(f => f.price > 0).length > 0 && (
              <NetflixRow
                title="Premium"
                subtitle="Le meilleur du contenu pro"
                formations={filtered.filter(f => f.price > 0)}
                accentColor={accentColor}
                onPlayVideo={setPlayingVideo}
              />
            )}
            {[...filtered].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,8).length > 0 && (
              <NetflixRow
                title="Nouveautés"
                subtitle="Ajoutés récemment"
                formations={[...filtered].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,8)}
                accentColor={accentColor}
                onPlayVideo={setPlayingVideo}
              />
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════
          VIDEO MODAL
      ══════════════════════ */}
      {playingVideo && (
        <VideoStudio video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}

      <style>{`
        @keyframes airbnbPop { from { opacity:0; transform:translateY(-8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  )
}

function NetflixRow({ title, subtitle, formations, accentColor, isTop10, onPlayVideo }: {
  title: string, subtitle: string, formations: any[], accentColor: string, isTop10?: boolean
  onPlayVideo?: (v: { url: string; title: string }) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scroll    = (dir: 'left'|'right') => scrollRef.current?.scrollBy({ left: dir === 'right' ? 800 : -800, behavior: 'smooth' })
  const CREAM = '#f0f4ff', SILVER = 'rgba(240,244,255,0.45)'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 4 }}>
            {title}
          </h2>
          <p style={{ fontSize: 13, color: SILVER }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['left','right'] as const).map(dir => (
            <button key={dir} onClick={() => scroll(dir)} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid rgba(232,228,220,0.1)`, background: 'rgba(232,228,220,0.03)', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.1)' }}>
              {dir === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 50, background: 'linear-gradient(to right, #07090e, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 50, background: 'linear-gradient(to left, #07090e, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div ref={scrollRef} style={{ display: 'flex', gap: 20, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
          {formations.map((f, i) => (
            <div key={f.id} style={{ width: 290, flexShrink: 0, position: 'relative' }}>
              {isTop10 && (
                <div style={{ position: 'absolute', left: -10, bottom: 10, fontSize: 110, fontWeight: 900, color: 'rgba(232,228,220,0.05)', zIndex: 0, pointerEvents: 'none', lineHeight: 1, userSelect: 'none' }}>{i + 1}</div>
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <FormationCard
                  f={f}
                  accentColor={accentColor}
                  onPlay={f.price === 0 && f.content_type === 'video' && f.video_url
                    ? () => onPlayVideo?.({ url: f.video_url, title: f.title })
                    : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  RATING HERO BLOCK                                          */
/* ─────────────────────────────────────────────────────────── */

const RATING_CATS = [
  { key: 'pedagogy',      label: 'Pédagogie',    Icon: BookOpen },
  { key: 'clarity',       label: 'Clarté',        Icon: Star },
  { key: 'communication', label: 'Communication', Icon: MessageSquare },
  { key: 'progress',      label: 'Progression',   Icon: TrendingUp },
  { key: 'punctuality',   label: 'Ponctualité',   Icon: Clock },
  { key: 'value',         label: 'Qualité-prix',  Icon: Award },
]

function getRatingBadge(avg: number, tab: string) {
  const noun = tab === 'coaching' ? 'coachs' : tab === 'videos' ? 'vidéos' : 'formations'
  if (avg >= 4.8) return { title: 'Excellence certifiée', desc: `Les ${noun} sur OnlyPok font partie des meilleures ressources poker de la communauté.` }
  if (avg >= 4.5) return { title: 'Très recommandé',      desc: `La communauté évalue très positivement les ${noun} disponibles sur OnlyPok.` }
  if (avg >= 4.0) return { title: 'Bien évalué',           desc: `Les ${noun} reçoivent une note favorable de la part de la communauté.` }
  return            { title: 'Évalué par la communauté',   desc: `La communauté a partagé ses retours sur les ${noun} disponibles.` }
}

function RatingHeroBlock({ reviews, accentColor, tab }: { reviews: any[], accentColor: string, tab: string }) {
  const CREAM = '#f0f4ff', SILVER = 'rgba(240,244,255,0.45)'
  if (reviews.length === 0) return null

  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length

  const catAvgs = RATING_CATS.map(cat => {
    const withCat = reviews.filter(r => r.category_ratings?.[cat.key])
    const catAvg  = withCat.length > 0
      ? withCat.reduce((a, r) => a + r.category_ratings[cat.key], 0) / withCat.length
      : avg
    return { ...cat, avg: catAvg }
  })

  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating) === star).length,
    pct:   (reviews.filter(r => Math.round(r.rating) === star).length / reviews.length) * 100,
  }))

  const maxCount = Math.max(...dist.map(d => d.count), 1)

  const { title, desc } = getRatingBadge(avg, tab)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(232,228,220,0.08)',
      borderRadius: 24,
      padding: '48px 44px 40px',
    }}>
      {/* ── Score centré ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14 }}>
          <span style={{ fontSize: 52, lineHeight: 1, color: accentColor, opacity: 0.55, userSelect: 'none' }}>♠</span>
          <span style={{ fontSize: 88, fontWeight: 900, color: CREAM, letterSpacing: '-4px', lineHeight: 1 }}>
            {avg.toFixed(2).replace('.', ',')}
          </span>
          <span style={{ fontSize: 52, lineHeight: 1, color: accentColor, opacity: 0.55, userSelect: 'none' }}>♠</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: CREAM, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: SILVER, lineHeight: 1.65, maxWidth: 420, textAlign: 'center' }}>{desc}</div>
        <div style={{ fontSize: 11, color: SILVER, opacity: 0.5, marginTop: 8 }}>
          Basé sur {reviews.length} avis
        </div>
      </div>

      {/* ── Séparateur ── */}
      <div style={{ borderTop: '1px solid rgba(232,228,220,0.07)', marginBottom: 32 }} />

      {/* ── Grille : distribution + catégories ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 40, alignItems: 'start' }}>

        {/* Distribution étoiles */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: SILVER, textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 14 }}>Évaluation globale</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {dist.map(d => (
              <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: SILVER, width: 8, flexShrink: 0, textAlign: 'right' }}>{d.star}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(232,228,220,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(d.count / maxCount) * 100}%`,
                    background: `linear-gradient(to right, ${accentColor}, ${accentColor}99)`,
                    borderRadius: 99,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{ fontSize: 10, color: 'rgba(232,228,220,0.28)', width: 18, textAlign: 'right', flexShrink: 0 }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Catégories */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0 }}>
          {catAvgs.map((cat) => (
            <div key={cat.key} style={{
              display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 20,
              borderLeft: `1px solid rgba(232,228,220,0.07)`,
            }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px' }}>
                {cat.avg.toFixed(1)}
              </span>
              <span style={{ fontSize: 11, color: SILVER, lineHeight: 1.4 }}>{cat.label}</span>
              <cat.Icon size={17} color={accentColor} style={{ opacity: 0.75 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
  return url
}

function VideoStudio({ video, onClose }: { video: { url: string; title: string }; onClose: () => void }) {
  const supabase  = useMemo(() => createClient(), [])
  const embedUrl  = getEmbedUrl(video.url)
  const isNative  = !video.url.match(/youtube|youtu\.be|vimeo/)
  const noteKey   = `onlypok_note_${video.url.slice(-60)}`

  const C = '#f0f4ff', S = 'rgba(240,244,255,0.45)', D = 'rgba(240,244,255,0.2)', V = '#7c3aed'

  const [tab,        setTab]        = useState<'notes' | 'comments'>('notes')
  const [notes,      setNotes]      = useState('')
  const [comments,   setComments]   = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [authUser,   setAuthUser]   = useState<any>(null)
  const [posting,    setPosting]    = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') setNotes(localStorage.getItem(noteKey) ?? '')
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user))
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#04040a', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease' }}>

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
              { id: 'notes' as const,    label: 'Notes',          Icon: FileText },
              { id: 'comments' as const, label: 'Commentaires',   Icon: MessageSquare },
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
                <p style={{ fontSize: 11, color: D, margin: 0, lineHeight: 1.5 }}>
                  Sauvegardées automatiquement sur cet appareil.
                </p>
                <textarea
                  value={notes}
                  onChange={e => saveNote(e.target.value)}
                  placeholder="Prenez des notes sur cette vidéo…&#10;&#10;Concepts clés, mains marquantes, points à retravailler…"
                  style={{ flex: 1, minHeight: 360, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: C, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                {notes.length > 0 && (
                  <p style={{ fontSize: 11, color: D, margin: 0, textAlign: 'right' }}>{notes.length} caractères</p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 16, gap: 10 }}>

                {/* Comment list */}
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

                {/* Comment input */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, flexShrink: 0 }}>
                  {authUser ? (
                    <>
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                        placeholder="Ajoutez un commentaire…"
                        rows={3}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: C, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.55 }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                      />
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
  )
}

function PlaceholderRow({ title, subtitle, icon, height = 180 }: { title: string, subtitle: string, icon: React.ReactNode, height?: number }) {
  const CREAM = '#f0f4ff', SILVER = 'rgba(240,244,255,0.45)'
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon} {title}
        </h2>
        <p style={{ fontSize: 13, color: SILVER }}>{subtitle}</p>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ width: 290, flexShrink: 0, height, borderRadius: 20, border: `1px dashed rgba(232,228,220,0.08)`, background: 'rgba(232,228,220,0.015)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, color: 'rgba(138,138,138,0.2)' }}>+</span>
            <span style={{ color: 'rgba(138,138,138,0.4)', fontSize: 13 }}>Contenu à venir</span>
          </div>
        ))}
      </div>
    </div>
  )
}
