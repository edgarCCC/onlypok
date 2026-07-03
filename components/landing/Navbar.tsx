'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { createClient } from '@/lib/supabase/client'
import { Menu, X } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const NAV_LINKS = [
  { label: 'Formations', href: '/formations' },
  { label: 'Coachs',     href: '/coaches' },
  { label: 'Tarifs',     href: '/#tarifs' },
]

export default function Navbar() {
  const navRef  = useRef<HTMLElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const [role, setRole] = useState<'coach' | 'student' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(data?.role ?? null)
    })
  }, [])

  useGSAP(() => {
    const nav = navRef.current
    if (!nav) return

    gsap.from(nav, { y: -60, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.5 })

    gsap.to(chipRef.current, {
      scale: 1.6, opacity: 0.45,
      duration: 1.4, ease: 'power1.inOut',
      repeat: -1, yoyo: true,
    })

    ScrollTrigger.create({
      start: 80,
      onEnter: () => gsap.to(nav, {
        backgroundColor: 'rgba(4,4,10,0.88)',
        borderBottomColor: 'rgba(255,255,255,0.06)',
        duration: 0.4, ease: 'power2.out',
      }),
      onLeaveBack: () => gsap.to(nav, {
        backgroundColor: 'transparent',
        borderBottomColor: 'transparent',
        duration: 0.4, ease: 'power2.out',
      }),
    })
  }, { scope: navRef })

  const onLinkEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const line = e.currentTarget.querySelector<HTMLSpanElement>('.ul')
    if (line) gsap.to(line, { scaleX: 1, duration: 0.25, ease: 'power2.out', transformOrigin: 'left' })
  }
  const onLinkLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const line = e.currentTarget.querySelector<HTMLSpanElement>('.ul')
    if (line) gsap.to(line, { scaleX: 0, duration: 0.2, ease: 'power2.in', transformOrigin: 'right' })
  }

  const spaceHref = role === 'coach' ? '/coach/dashboard' : '/dashboard'

  return (
    <nav
      ref={navRef}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 100, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,48px)', height: 68,
        backgroundColor: 'transparent',
        borderBottom: '1px solid transparent',
        backdropFilter: 'blur(0px)',
        WebkitBackdropFilter: 'blur(0px)',
        transition: 'backdrop-filter 0.4s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div ref={chipRef} style={{
            width: 7, height: 7, borderRadius: 2,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-syne, sans-serif)',
            fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: '#f0f4ff',
          }}>ONLYPOK</span>
        </Link>
        {role === 'coach' && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            color: '#a78bfa', border: '1px solid rgba(124,58,237,0.45)',
            borderRadius: 6, padding: '3px 8px',
            fontFamily: 'var(--font-syne, sans-serif)',
          }}>COACH</span>
        )}
      </div>

      <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        {NAV_LINKS.map(({ label, href }) => (
          <a
            key={label} href={href}
            onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}
            style={{ position: 'relative', color: 'rgba(240,244,255,0.5)', textDecoration: 'none', fontSize: 14, fontWeight: 500, paddingBottom: 4 }}
          >
            {label}
            <span className="ul" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
              display: 'block', transform: 'scaleX(0)', transformOrigin: 'left',
            }} />
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {role ? (
          <Link
            href={spaceHref}
            className="nav-cta"
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,244,255,0.85)', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = '#f0f4ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(240,244,255,0.85)' }}
          >
            Mon espace
          </Link>
        ) : (
          <Link
            href="/become-coach"
            className="nav-cta"
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.12)', color: '#f0f4ff', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.22)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.8)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
          >
            Devenir coach
          </Link>
        )}

        <button
          className="nav-burger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          style={{
            display: 'none', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#f0f4ff', cursor: 'pointer',
          }}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: 68, left: 0, right: 0,
          background: 'rgba(4,4,10,0.97)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', padding: '8px 20px 20px',
        }}>
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)}
              style={{ padding: '15px 4px', color: 'rgba(240,244,255,0.75)', textDecoration: 'none', fontSize: 15, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {label}
            </a>
          ))}
          <Link href={role ? spaceHref : '/login'} onClick={() => setMenuOpen(false)}
            style={{
              marginTop: 16, padding: '13px', borderRadius: 10, textAlign: 'center',
              border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.12)',
              color: '#f0f4ff', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            }}>
            {role ? 'Mon espace' : 'Se connecter'}
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 800px) {
          .nav-links { display: none !important; }
          .nav-burger { display: flex !important; }
        }
        @media (max-width: 420px) {
          .nav-cta { display: none !important; }
        }
      `}</style>
    </nav>
  )
}
