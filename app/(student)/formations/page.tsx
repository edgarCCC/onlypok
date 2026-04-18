'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, ChevronRight, ChevronLeft, HelpCircle, Menu, X, Check, PlayCircle, Users, BookOpen } from 'lucide-react'
import FormationCard from '@/components/formations/FormationCard'
import Link from 'next/link'

const CREAM  = '#E8E4DC'
const SILVER = '#8A8A8A'

const VARIANT_OPTIONS = [
  { id: 'MTT',      label: 'MTT',        desc: 'Tournois multi-tables',    color: '#f59e0b' },
  { id: 'Cash',     label: 'Cash Game',  desc: 'Tables cash 6-max / HU',  color: '#10b981' },
  { id: 'Expresso', label: 'Expresso',   desc: 'Sit & Go hyper-turbo',    color: '#ef4444' },
  { id: 'Live',     label: 'Live',       desc: 'Poker en casino / cercle', color: '#3b82f6' },
  { id: 'PLO',      label: 'PLO',        desc: 'Pot-Limit Omaha',         color: '#8b5cf6' },
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
  formations: '#6366f1',
  videos:     '#10b981',
  coaching:   '#f59e0b',
}

export default function FormationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [formations, setFormations] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'formations'|'videos'|'coaching'>('formations')
  const [showMenu, setShowMenu]     = useState(false)
  const [activeField, setActiveField] = useState<string|null>(null)
  const [filters, setFilters]       = useState<Record<string,string>>({})
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const selectedVariantColor = VARIANT_OPTIONS.find(v => v.id === filters.variant)?.color
  const accentColor = selectedVariantColor || TAB_COLORS[tab]
  const fields = FIELDS[tab]

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('formations')
        .select('*, coach:profiles(username)')
        .eq('published', true)
        .order('created_at', { ascending: false })
      setFormations(data ?? [])
      setLoading(false)
    }
    load()
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
    return matchV && matchP && matchD
  })

  const top10      = filtered.slice(0, 10)
  const nouveautes = [...filtered].reverse().slice(0, 8)
  const pourVous   = filtered.slice(2, 10)

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
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 300, color: SILVER, letterSpacing: '-1px', lineHeight: 1 }}>[</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', padding: '0 5px' }}>OnlyPok</span>
            <span style={{ fontSize: 30, fontWeight: 300, color: SILVER, letterSpacing: '-1px', lineHeight: 1 }}>]</span>
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
              <button onClick={() => setIsSearchOverlayOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(232,228,220,0.06)', border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 40, padding: '6px 8px 6px 20px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{filters.variant || 'Variante'}</span>
                <div style={{ width: 1, height: 16, background: `rgba(232,228,220,0.15)` }} />
                <span style={{ fontSize: 13, color: SILVER }}>Rechercher…</span>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${accentColor}60` }}>
                  <Search size={15} color="#fff" />
                </div>
              </button>
            </div>
          </div>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Link href="/register?role=coach" style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none', padding: '8px 16px', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.25)` }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = `rgba(232,228,220,0.1)` }}>
              Devenir coach
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
                <div style={{ position: 'absolute', top: 46, right: 0, background: '#111418', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 14, padding: 6, minWidth: 200, zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div style={{ padding: '8px 14px 12px', borderBottom: `1px solid rgba(232,228,220,0.06)`, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Menu</span>
                  </div>
                  {[['Mon profil', '/student/profile'], ['Mes formations', '/formations'], ['Messages', '/student/messages'], ['Tracker', '/student/track'], ['Déconnexion', '/login']].map(([label, href]) => (
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
                        background: '#111418',
                        border: `1px solid rgba(232,228,220,0.1)`,
                        borderRadius: 20,
                        padding: 14,
                        zIndex: 110,
                        boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                        animation: 'airbnbPop 0.25s ease',
                      }}>
                        <div style={{ padding: '4px 8px 12px', borderBottom: `1px solid rgba(232,228,220,0.06)`, marginBottom: 10 }}>
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

        {tab === 'formations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
            {!loading && top10.length > 0 && (
              <NetflixRow title="Top 10" subtitle="Les formations incontournables du moment" formations={top10} accentColor={accentColor} isTop10 />
            )}
            {loading ? (
              <div style={{ display: 'flex', gap: 20 }}>
                {[...Array(4)].map((_, i) => <div key={i} style={{ minWidth: 280, height: 180, background: 'rgba(232,228,220,0.03)', borderRadius: 20 }} />)}
              </div>
            ) : (
              <>
                {nouveautes.length > 0 && <NetflixRow title="Nouveautés" subtitle="Découvrez les dernières pépites" formations={nouveautes} accentColor={accentColor} />}
                {pourVous.length > 0 && <NetflixRow title="Pour vous" subtitle="Adapté à votre progression" formations={pourVous} accentColor={accentColor} />}
                <PlaceholderRow title="Masterclasses" subtitle="L'élite vous livre ses secrets" icon={<BookOpen size={18} color={SILVER} />} />
              </>
            )}
          </div>
        )}

        {tab === 'videos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
            <PlaceholderRow title="Les bases" subtitle="Apprendre les fondamentaux" icon={<PlayCircle size={18} color={SILVER} />} />
            <PlaceholderRow title="Analyses Pro" subtitle="Reviews de sessions complètes" icon={<PlayCircle size={18} color={SILVER} />} />
            <PlaceholderRow title="Replays Live" subtitle="Revivez les meilleures sessions" icon={<PlayCircle size={18} color={SILVER} />} />
          </div>
        )}

        {tab === 'coaching' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
            <PlaceholderRow title="Coachs Elite" subtitle="Un accompagnement sur-mesure" icon={<Users size={18} color={SILVER} />} height={240} />
            <PlaceholderRow title="Sessions de groupe" subtitle="Apprenez en communauté" icon={<Users size={18} color={SILVER} />} height={200} />
          </div>
        )}
      </main>

      <style>{`
        @keyframes airbnbPop { from { opacity:0; transform:translateY(-8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  )
}

function NetflixRow({ title, subtitle, formations, accentColor, isTop10 }: { title: string, subtitle: string, formations: any[], accentColor: string, isTop10?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scroll    = (dir: 'left'|'right') => scrollRef.current?.scrollBy({ left: dir === 'right' ? 800 : -800, behavior: 'smooth' })
  const CREAM = '#E8E4DC', SILVER = '#8A8A8A'

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
            <div key={f.id} style={{ minWidth: 290, position: 'relative', flexShrink: 0 }}>
              {isTop10 && (
                <div style={{ position: 'absolute', left: -10, bottom: 10, fontSize: 110, fontWeight: 900, color: 'rgba(232,228,220,0.05)', zIndex: 0, pointerEvents: 'none', lineHeight: 1, userSelect: 'none' }}>{i + 1}</div>
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <FormationCard f={f} accentColor={accentColor} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlaceholderRow({ title, subtitle, icon, height = 180 }: { title: string, subtitle: string, icon: React.ReactNode, height?: number }) {
  const CREAM = '#E8E4DC', SILVER = '#8A8A8A'
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
          <div key={i} style={{ minWidth: 290, height, borderRadius: 20, border: `1px dashed rgba(232,228,220,0.08)`, background: 'rgba(232,228,220,0.015)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, color: 'rgba(138,138,138,0.2)' }}>+</span>
            <span style={{ color: 'rgba(138,138,138,0.4)', fontSize: 13 }}>Contenu à venir</span>
          </div>
        ))}
      </div>
    </div>
  )
}
