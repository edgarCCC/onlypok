'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Menu, HelpCircle, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { CREAM, SILVER, VARIANT_OPTIONS, HEADER_FIELDS, HEADER_TAB_COLORS } from './shared'

/* ─── Fixed page header : back + logo + tabs / compact pill + search bar ────── */
export default function DetailHeader({ initialContentType, isScrolled, isSearchOverlayOpen, setIsSearchOverlayOpen }: {
  initialContentType: string | undefined
  isScrolled: boolean
  isSearchOverlayOpen: boolean
  setIsSearchOverlayOpen: (v: boolean) => void
}) {
  const router = useRouter()
  const { user, profile, signOut } = useUser()

  const [showMenu, setShowMenu]           = useState(false)
  const ct0 = initialContentType
  const [headerTab, setHeaderTab]         = useState<'formations'|'videos'|'coaching'>(
    ct0 === 'video' ? 'videos' : ct0 === 'coaching' ? 'coaching' : 'formations'
  )
  const [activeField, setActiveField]     = useState<string|null>(null)
  const [headerFilters, setHeaderFilters] = useState<Record<string,string>>({})
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveField(null)
        setIsSearchOverlayOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [setIsSearchOverlayOpen])

  const headerAccentColor = HEADER_TAB_COLORS[headerTab]
  const headerFields      = HEADER_FIELDS[headerTab]
  const showBigSearch     = !isScrolled || isSearchOverlayOpen
  const setHeaderFilter   = (key: string, val: string) => {
    setHeaderFilters(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }))
    setActiveField(null)
  }
  const handleHeaderTab = (t: 'formations'|'videos'|'coaching') => {
    setHeaderTab(t)
    setHeaderFilters({})
    setIsSearchOverlayOpen(false)
    router.push(t === 'formations' ? '/formations' : `/formations?tab=${t}`)
  }

  return (
    <>
      {isScrolled && isSearchOverlayOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease' }} />
      )}

      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: isScrolled ? 'rgba(7,9,14,0.97)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(232,228,220,0.07)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', height: 80, padding: '0 40px', gap: 24 }}>

          {/* Back + Logo + badge Élève */}
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, color: SILVER, flexShrink: 0, transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER; (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
            <ArrowLeft size={15} />
          </button>
          <Link href="/formations" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
          </Link>
          {user && (
            <span style={{ fontSize: 9, fontWeight: 700, color: profile?.role === 'coach' ? '#06b6d4' : '#7c3aed', padding: '2px 7px',
              border: `1px solid ${profile?.role === 'coach' ? 'rgba(6,182,212,0.35)' : 'rgba(124,58,237,0.35)'}`, borderRadius: 4, letterSpacing: '0.05em', flexShrink: 0 }}>
              {profile?.role === 'coach' ? 'Coach' : 'Élève'}
            </span>
          )}

          {/* Centre : tabs ↔ pilule compacte */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: 48, alignItems: 'center' }}>

            {/* Tabs (visibles quand non scrollé) */}
            <div style={{
              position: 'absolute',
              display: 'inline-flex', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.08)',
              borderRadius: 14, padding: 4, gap: 4,
              transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              opacity: showBigSearch ? 1 : 0, pointerEvents: showBigSearch ? 'auto' : 'none',
              transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.92)', zIndex: 10,
            }}>
              {(['formations', 'videos', 'coaching'] as const).map(t => {
                const active = headerTab === t
                const labels: Record<string,string> = { formations: 'Formations', videos: 'Vidéos', coaching: 'Coachs' }
                return (
                  <button key={t} onClick={() => handleHeaderTab(t)}
                    style={{ padding: '8px 24px', borderRadius: 10, border: 'none',
                      background: active ? `${HEADER_TAB_COLORS[t]}28` : 'transparent',
                      color: active ? CREAM : SILVER,
                      fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.25s' }}>
                    {labels[t]}
                  </button>
                )
              })}
            </div>

            {/* Pilule compacte (visible quand scrollé) */}
            <div style={{
              position: 'absolute',
              transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              opacity: !showBigSearch ? 1 : 0, pointerEvents: !showBigSearch ? 'auto' : 'none',
              transform: !showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.92)',
            }}>
              <button onClick={() => setIsSearchOverlayOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 14,
                  background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(232,228,220,0.12)',
                  borderRadius: 40, padding: '6px 8px 6px 20px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>
                  {headerFilters.variant || 'Variante'}
                </span>
                <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.15)' }} />
                <span style={{ fontSize: 13, color: SILVER }}>Rechercher…</span>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: headerAccentColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 12px ${headerAccentColor}60` }}>
                  <Search size={15} color="#fff" />
                </div>
              </button>
            </div>
          </div>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {user ? (
              <Link href="/dashboard"
                style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none',
                  padding: '8px 16px', border: '1px solid rgba(240,244,255,0.08)',
                  borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,228,220,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(240,244,255,0.08)' }}>
                Mon espace
              </Link>
            ) : (
              <Link href="/register?role=coach"
                style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none',
                  padding: '8px 16px', border: '1px solid rgba(240,244,255,0.08)',
                  borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,228,220,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(240,244,255,0.08)' }}>
                Devenir coach
              </Link>
            )}
            <button
              style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
              <HelpCircle size={16} />
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(v => !v)}
                style={{ width: 38, height: 38, borderRadius: 10,
                  background: showMenu ? 'rgba(232,228,220,0.08)' : 'rgba(232,228,220,0.03)',
                  border: '1px solid rgba(232,228,220,0.08)', color: CREAM,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Menu size={16} />
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', top: 46, right: 0, background: '#07070f', border: '1px solid rgba(240,244,255,0.08)', borderRadius: 14, padding: 6, minWidth: 200, zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div style={{ padding: '8px 14px 12px', borderBottom: '1px solid rgba(232,228,220,0.06)', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Menu</span>
                  </div>
                  {[['Mes formations', '/formations'], ['Coaches', '/formations?tab=coaching'], ['Tracker', '/track']].map(([label, href]) => (
                    <Link key={label} href={href}
                      style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: SILVER, textDecoration: 'none', borderRadius: 8, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = CREAM }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = SILVER }}>
                      {label}
                    </Link>
                  ))}
                  <button onClick={() => signOut()}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: SILVER, background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div ref={searchRef}
          style={{ height: showBigSearch ? 110 : 0, opacity: showBigSearch ? 1 : 0,
            pointerEvents: showBigSearch ? 'auto' : 'none',
            transition: 'all 0.4s cubic-bezier(0.2,0.8,0.2,1)',
            display: 'flex', justifyContent: 'center', paddingBottom: 20,
            transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-24px) scale(0.97)' }}>
          <div style={{ width: '100%', maxWidth: 860, position: 'relative', padding: '0 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center',
              background: 'rgba(20,23,30,0.9)', backdropFilter: 'blur(25px)',
              border: '1px solid rgba(240,244,255,0.08)', borderRadius: 50,
              padding: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>

              {headerFields.map((field, idx) => {
                const isActive = activeField === field.key
                const isLast   = idx === headerFields.length - 1
                return (
                  <div key={field.key} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setActiveField(isActive ? null : field.key)}
                      style={{ flex: 1, textAlign: 'left', border: 'none', padding: '12px 26px', cursor: 'pointer',
                        background: isActive ? 'rgba(232,228,220,0.08)' : 'transparent',
                        borderRadius: 40, transition: 'all 0.2s', width: '100%' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isActive ? CREAM : SILVER,
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{field.label}</div>
                      <div style={{ fontSize: 13, color: headerFilters[field.key] ? CREAM : 'rgba(138,138,138,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {headerFilters[field.key] || field.placeholder}
                        {headerFilters[field.key] && (
                          <span onClick={e => { e.stopPropagation(); setHeaderFilter(field.key, headerFilters[field.key]) }} style={{ color: SILVER, cursor: 'pointer' }}>
                            <X size={12} />
                          </span>
                        )}
                      </div>
                    </button>
                    {!isLast && !isActive && activeField !== headerFields[idx+1]?.key && (
                      <div style={{ width: 1, height: 22, background: 'rgba(240,244,255,0.08)', position: 'absolute', right: 0 }} />
                    )}
                    {isActive && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 14px)', left: 0, right: 0,
                        background: '#07070f', border: '1px solid rgba(240,244,255,0.08)',
                        borderRadius: 20, padding: 14, zIndex: 110, boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                        animation: 'airbnbPop 0.25s ease' }}>
                        <div style={{ padding: '4px 8px 12px', borderBottom: '1px solid rgba(232,228,220,0.06)', marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{field.label}</span>
                        </div>
                        {activeField === 'variant' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {VARIANT_OPTIONS.map(v => {
                              const selected = headerFilters.variant === v.id
                              return (
                                <button key={v.id} onClick={() => setHeaderFilter('variant', v.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                    borderRadius: 12, border: `1px solid ${selected ? v.color + '50' : 'rgba(232,228,220,0.05)'}`,
                                    background: selected ? `${v.color}18` : 'rgba(232,228,220,0.02)',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.02)' }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${v.color}30`,
                                    border: `1px solid ${v.color}50`, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 20, flexShrink: 0, color: v.color }}>
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
                            {headerFields.find(f => f.key === activeField)?.options.map(o => {
                              const selected = headerFilters[activeField] === o
                              return (
                                <button key={o} onClick={() => setHeaderFilter(activeField, o)}
                                  style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: selected ? 600 : 400,
                                    border: 'none', background: selected ? `${headerAccentColor}20` : 'transparent',
                                    color: selected ? CREAM : SILVER, cursor: 'pointer', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                                  {o}
                                  {selected && <Check size={14} color={headerAccentColor} />}
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
                <button onClick={() => router.push('/formations')}
                  style={{ width: 52, height: 52, borderRadius: '50%', background: headerAccentColor,
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: `0 6px 20px ${headerAccentColor}55`, flexShrink: 0, transition: 'box-shadow 0.3s' }}>
                  <Search size={20} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
