'use client'

import Link from 'next/link'

const LINKS = [
  { label: 'Mentions légales', href: '/legal/mentions-legales' },
  { label: 'CGU', href: '/legal/cgu' },
  { label: 'Confidentialité', href: '/legal/confidentialite' },
  { label: 'Cookies', href: '/legal/cookies' },
]

/** Mini-footer légal pour l'app authentifiée (RGPD/LCEN). */
export default function LegalFooter() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.05)',
      padding: '20px 24px',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
      gap: '8px 22px',
    }}>
      <span style={{ fontSize: 11.5, color: 'rgba(240,244,255,0.18)' }}>© 2026 OnlyPok</span>
      {LINKS.map(({ label, href }) => (
        <Link key={href} href={href}
          style={{ fontSize: 11.5, color: 'rgba(240,244,255,0.25)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.25)')}>
          {label}
        </Link>
      ))}
    </footer>
  )
}
