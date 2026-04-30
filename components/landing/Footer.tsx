'use client'

import Link from 'next/link'

const COLS = [
  {
    title: 'Produit',
    links: [{ label: 'Formations', href: '/formations' }, { label: 'Coachs', href: '/coaches' }, { label: 'Tarifs', href: '#tarifs' }, { label: 'Coaching 1:1', href: '/register' }],
  },
  {
    title: 'Ressources',
    links: [{ label: 'Blog stratégie', href: '#' }, { label: 'Forum', href: '#' }, { label: 'Glossaire poker', href: '#' }, { label: 'Calculateur EV', href: '#' }],
  },
  {
    title: 'Légal',
    links: [{ label: 'Mentions légales', href: '#' }, { label: 'CGU', href: '#' }, { label: 'Confidentialité', href: '#' }, { label: 'Cookies', href: '#' }],
  },
]

function SocialIcon({ path }: { path: string }) {
  return (
    <a
      href="#"
      style={{
        width: 36, height: 36, borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = 'rgba(124,58,237,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,244,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </a>
  )
}

export default function Footer() {
  return (
    <footer style={{
      background: '#040608',
      borderTop: '1px solid transparent',
      backgroundImage: 'linear-gradient(#040608, #040608), linear-gradient(90deg, transparent, rgba(124,58,237,0.4), rgba(6,182,212,0.4), transparent)',
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: 'clamp(48px,6vh,80px) clamp(20px,5vw,64px) 40px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }} />
              <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: '#f0f4ff' }}>ONLYPOK</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.3)', lineHeight: 1.7, maxWidth: 240, fontFamily: 'var(--font-space,sans-serif)', marginBottom: 24 }}>
              La plateforme de référence pour les joueurs de poker qui jouent pour gagner.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <SocialIcon path="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              <SocialIcon path="M21 2H3v20l4-4h14V2z" />
              <SocialIcon path="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z M9.75 15.02l5.75-3.02-5.75-3.02v6.04z" />
            </div>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,0.25)', letterSpacing: '0.16em', marginBottom: 20, fontFamily: 'var(--font-space,sans-serif)' }}>
                {col.title.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map(({ label, href }) => (
                  <Link
                    key={label} href={href}
                    style={{ fontSize: 13, color: 'rgba(240,244,255,0.35)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: 'var(--font-space,sans-serif)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(240,244,255,0.75)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,244,255,0.35)'}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 24, textAlign: 'center',
          fontSize: 12, color: 'rgba(240,244,255,0.2)',
          fontFamily: 'var(--font-space,sans-serif)',
        }}>
          © 2026 OnlyPok. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
