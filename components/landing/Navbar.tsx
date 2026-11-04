'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useUser } from '@/hooks/useUser'
import { Menu, X } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// « Tarifs » retiré : l'ancre /#tarifs n'existe pas tant que PricingTeaser n'est pas monté (AUDIT-APPLE n° 16).
const NAV_LINKS = [
  { label: 'Formations', href: '/formations' },
  { label: 'Coachs',     href: '/coaches' },
]

const NAV_CTA_TRANSITION = 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.1s cubic-bezier(0.23,1,0.32,1)'

const MENU_BTN: React.CSSProperties = {
  padding: '13px', borderRadius: 10, textAlign: 'center',
  color: 'var(--brand)', textDecoration: 'none', fontSize: 14, fontWeight: 700,
}

export default function Navbar() {
  const navRef  = useRef<HTMLElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  // Contexte profil global (app/providers.tsx) : `loading` évite d'afficher les liens visiteur à un connecté.
  const { user, profile, loading } = useUser()
  const role = profile?.role ?? null
  const [menuOpen, setMenuOpen] = useState(false)

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
        backgroundColor: 'var(--bg)',
        borderBottomColor: 'color-mix(in srgb, var(--overlay) 6%, transparent)',
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
      className="landing-nav"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        // Grille 1fr/auto/1fr : les liens centraux ne bougent pas quand la zone de droite change (chargement, visiteur, connecté).
        zIndex: 100, display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
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
            background: 'var(--brand)', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-syne, sans-serif)',
            fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: 'var(--brand)',
          }}>ONLYPOK</span>
        </Link>
        {role === 'coach' && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            color: 'var(--brand)', border: '1px solid color-mix(in srgb, var(--brand) 45%, transparent)',
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
            style={{ position: 'relative', color: 'var(--text-2)', textDecoration: 'none', fontSize: 14, fontWeight: 500, paddingBottom: 4 }}
          >
            {label}
            <span className="ul" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
              background: 'var(--brand)',
              display: 'block', transform: 'scaleX(0)', transformOrigin: 'left',
            }} />
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {loading ? null : user ? (
          <Link
            href={spaceHref}
            className="nav-cta"
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--overlay) 12%, transparent)', color: 'var(--text)', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: NAV_CTA_TRANSITION }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--overlay) 28%, transparent)'; e.currentTarget.style.color = 'var(--brand)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--overlay) 12%, transparent)'; e.currentTarget.style.color = 'var(--text)' }}
          >
            Mon espace
          </Link>
        ) : (
          <>
            {/* Connexion : lien secondaire à côté du CTA d'inscription (N1 / P1). Sous 800 px il passe dans le menu. */}
            <Link
              href="/login"
              className="nav-login"
              style={{ padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
            >
              Se connecter
            </Link>
            <Link
              href="/become-coach"
              className="nav-cta"
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--brand) 50%, transparent)', background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: NAV_CTA_TRANSITION }}
              onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 22%, transparent)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--brand) 80%, transparent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 12%, transparent)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--brand) 50%, transparent)' }}
            >
              Devenir coach
            </Link>
          </>
        )}

        <button
          className="nav-burger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          style={{
            display: 'none', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 10,
            background: 'color-mix(in srgb, var(--overlay) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--overlay) 10%, transparent)',
            color: 'var(--brand)', cursor: 'pointer',
          }}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: 68, left: 0, right: 0,
          background: 'var(--bg)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid color-mix(in srgb, var(--overlay) 8%, transparent)',
          display: 'flex', flexDirection: 'column', padding: '8px 20px 20px',
        }}>
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)}
              style={{ padding: '15px 4px', color: 'var(--text)', textDecoration: 'none', fontSize: 15, fontWeight: 600, borderBottom: '1px solid color-mix(in srgb, var(--overlay) 5%, transparent)' }}>
              {label}
            </a>
          ))}
          {loading ? null : user ? (
            <Link href={spaceHref} className="nav-menu-cta" onClick={() => setMenuOpen(false)}
              style={{ ...MENU_BTN, marginTop: 16, border: '1px solid color-mix(in srgb, var(--brand) 50%, transparent)', background: 'color-mix(in srgb, var(--brand) 12%, transparent)' }}>
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-menu-cta" onClick={() => setMenuOpen(false)}
                style={{ ...MENU_BTN, marginTop: 16, border: '1px solid color-mix(in srgb, var(--overlay) 12%, transparent)', background: 'color-mix(in srgb, var(--overlay) 5%, transparent)' }}>
                Se connecter
              </Link>
              <Link href="/become-coach" className="nav-menu-cta" onClick={() => setMenuOpen(false)}
                style={{ ...MENU_BTN, marginTop: 10, border: '1px solid color-mix(in srgb, var(--brand) 50%, transparent)', background: 'color-mix(in srgb, var(--brand) 12%, transparent)' }}>
                Devenir coach
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        .nav-login { color: var(--text); transition: color 0.15s ease, background-color 0.15s ease, transform 0.1s cubic-bezier(0.23,1,0.32,1); }
        .nav-menu-cta { display: block; transition: transform 0.1s cubic-bezier(0.23,1,0.32,1); }
        @media (hover: hover) and (pointer: fine) {
          .nav-login:hover { color: var(--brand); background-color: color-mix(in srgb, var(--overlay) 5%, transparent); }
        }
        .nav-cta:active, .nav-login:active, .nav-menu-cta:active { transform: scale(0.97); }
        .landing-nav :is(a, button):focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 8px; }
        @media (prefers-reduced-motion: reduce) {
          .nav-cta:active, .nav-login:active, .nav-menu-cta:active { transform: none; }
        }
        @media (max-width: 800px) {
          .nav-links { display: none !important; }
          .nav-burger { display: flex !important; }
          .nav-login { display: none !important; }
        }
        @media (max-width: 420px) {
          .nav-cta { display: none !important; }
        }
      `}</style>
    </nav>
  )
}
