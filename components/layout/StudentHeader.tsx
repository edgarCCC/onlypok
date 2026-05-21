'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { LogOut, ChevronDown, LayoutDashboard, ShoppingBag, Brain, BarChart2, Calendar, MessageSquare, Camera, Loader2 } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

const CREAM  = '#f0f4ff'
const DIM    = 'rgba(240,244,255,0.42)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

const TABS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/formations', label: 'Marketplace', icon: ShoppingBag },
  { href: '/train',      label: 'Trainer',    icon: Brain },
  { href: '/track',      label: 'Tracker',    icon: BarChart2 },
  { href: '/schedule',   label: 'Planning',   icon: Calendar },
  { href: '/messages',   label: 'Messages',   icon: MessageSquare },
]

export default function StudentHeader() {
  const pathname    = usePathname()
  const { profile, signOut } = useUser()

  const roleBadge = profile?.role === 'coach'
    ? { label: 'Coach', color: CYAN, border: 'rgba(6,182,212,0.35)' }
    : profile?.role === 'admin'
      ? { label: 'Admin', color: '#f59e0b', border: 'rgba(245,158,11,0.35)' }
      : { label: 'Élève', color: VIOLET, border: 'rgba(124,58,237,0.35)' }
  const [profileOpen, setProfileOpen] = useState(false)
  const [hoveredTab, setHoveredTab]   = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const profileRef  = useRef<HTMLDivElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null)
  }, [profile?.avatar_url])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setProfileOpen(false) }, [pathname])

  const isActive = (href: string) => {
    const path = href.split('?')[0]
    if (path === '/train') return pathname === '/train' || pathname.startsWith('/train/') || pathname === '/trainer' || pathname.startsWith('/trainer/')
    return pathname === path || pathname.startsWith(path + '/')
  }

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: form })
      const json = await res.json()
      if (json.url) setAvatarUrl(`${json.url}&bust=${Date.now()}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const avatarContent = uploading
    ? <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
    : avatarUrl
      ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : <span style={{ fontSize: 11, fontWeight: 700 }}>{(profile?.username ?? 'E')[0].toUpperCase()}</span>

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: 64, flexShrink: 0,
      background: 'rgba(4,4,10,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(16px,3vw,40px)',
    }}>

      {/* Logo — left */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 2 }}>
        <div style={{ width: 7, height: 7, borderRadius: 2, background: `linear-gradient(135deg,${VIOLET},${CYAN})`, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: roleBadge.color, padding: '2px 7px', border: `1px solid ${roleBadge.border}`, borderRadius: 4 }}>{roleBadge.label}</span>
      </Link>

      {/* Nav — absolutely centered */}
      <nav style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 1,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px,2vw,28px)', pointerEvents: 'auto' }}>
        {TABS.map(tab => {
          const active  = isActive(tab.href)
          const hovered = hoveredTab === tab.href
          const showLine = active || hovered
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onMouseEnter={() => setHoveredTab(tab.href)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 5,
                color: active ? CREAM : hovered ? 'rgba(240,244,255,0.72)' : DIM,
                textDecoration: 'none',
                fontSize: 13, fontWeight: active ? 600 : 500,
                paddingBottom: 4,
                transition: 'color 0.18s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={13} />
              {tab.label}
              <span style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                background: `linear-gradient(90deg,${VIOLET},${CYAN})`,
                display: 'block',
                transform: showLine ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </Link>
          )
        })}
      </div>
      </nav>

      {/* Avatar + menu — right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, zIndex: 2 }}>
        <div ref={profileRef} style={{ position: 'relative' }}>

          {/* Trigger button */}
          <button
            type="button"
            aria-label="Menu utilisateur"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: profileOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: '1px solid transparent',
              borderColor: profileOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              borderRadius: 8, padding: '4px 8px 4px 4px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!profileOpen) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { if (!profileOpen) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `linear-gradient(135deg,${CYAN},${VIOLET})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', overflow: 'hidden',
              border: `1.5px solid rgba(6,182,212,0.4)`,
              flexShrink: 0,
            }}>
              {avatarContent}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(240,244,255,0.55)' }}>
              {profile?.username ?? 'Élève'}
            </span>
            <ChevronDown size={12} style={{
              color: DIM, transition: 'transform 0.2s',
              transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#0d1117',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14, padding: 6, minWidth: 210,
              boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
              animation: 'dropIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
              zIndex: 200,
            }}>

              {/* Avatar section */}
              <div style={{ padding: '10px 14px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Big avatar with camera overlay */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: `linear-gradient(135deg,${CYAN},${VIOLET})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: '#fff',
                      overflow: 'hidden', border: `2px solid rgba(6,182,212,0.3)`,
                    }}>
                      {uploading
                        ? <Loader2 size={18} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                        : avatarUrl
                          ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (profile?.username ?? 'E')[0].toUpperCase()
                      }
                    </div>
                    {/* Camera overlay */}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0'}
                    >
                      <Camera size={14} color="#fff" />
                    </button>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: CREAM, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile?.username ?? 'Élève'}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{
                        fontSize: 11, color: CYAN, background: 'none', border: 'none',
                        cursor: uploading ? 'not-allowed' : 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 4,
                        opacity: uploading ? 0.5 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <Camera size={10} />
                      {uploading ? 'Upload…' : 'Changer la photo'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button onClick={signOut} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 9, border: 'none',
                background: 'transparent', cursor: 'pointer', transition: 'background 0.12s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <LogOut size={13} color="#ef4444" />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#f87171' }}>Déconnexion</span>
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      <style>{`
        @keyframes dropIn {
          from { opacity:0; transform:translateY(-6px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </header>
  )
}
