'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  UserRound, ExternalLink, Star, BarChart2, Target, Settings, LogOut, ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { NAV } from './coach-nav'

export interface MenuLink {
  href: string
  label: string
  icon: LucideIcon
  external?: boolean
}

/* Liens secondaires (hors onglets) — partagés avec le menu « Plus » mobile. */
export function accountLinks(coachId: string | undefined): { title: string; links: MenuLink[] }[] {
  return [
    {
      title: 'Mon compte',
      links: [
        { href: '/coach/profile', label: 'Mon profil', icon: UserRound },
        ...(coachId ? [{ href: `/coaches/${coachId}`, label: 'Voir ma page publique', icon: ExternalLink, external: true }] : []),
        { href: '/coach/reviews', label: 'Avis reçus', icon: Star },
      ],
    },
    {
      title: 'Outils joueur',
      links: [
        { href: '/tracker',       label: 'Tracker', icon: BarChart2 },
        { href: '/coach/trainer', label: 'Trainer', icon: Target },
      ],
    },
    {
      title: '',
      links: [{ href: '/coach/settings', label: 'Paramètres', icon: Settings }],
    },
  ]
}

export function CoachAvatar({ url, name, size = 28 }: { url?: string | null; name: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 0 2px rgba(124,58,237,0.25)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: '#fff',
    }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export function MenuSections({ coachId, onNavigate, onSignOut }: {
  coachId: string | undefined
  onNavigate: () => void
  onSignOut: () => void
}) {
  return (
    <>
      {accountLinks(coachId).map((section, i) => (
        <div key={i} className="coach-menu-section">
          {section.title && <p className="coach-menu-title">{section.title}</p>}
          {section.links.map(({ href, label, icon: Icon, external }) => (
            <Link key={href} href={href} onClick={onNavigate} className="coach-menu-item"
              {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
              <Icon size={15} strokeWidth={1.8} />
              <span style={{ flex: 1 }}>{label}</span>
            </Link>
          ))}
        </div>
      ))}
      <div className="coach-menu-section">
        <button onClick={onSignOut} className="coach-menu-item coach-menu-danger">
          <LogOut size={15} strokeWidth={1.8} />
          <span style={{ flex: 1, textAlign: 'left' }}>Déconnexion</span>
        </button>
      </div>
    </>
  )
}

export default function CoachAccountMenu({ coachId, name, avatarUrl, onSignOut }: {
  coachId: string | undefined
  name: string
  avatarUrl?: string | null
  onSignOut: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Menu du compte"
        className="coach-account-btn" data-open={open || undefined}>
        <CoachAvatar url={avatarUrl} name={name} />
        <span className="coach-account-name">{name}</span>
        <ChevronDown size={12} className="coach-account-chevron" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="coach-popover coach-account-panel" role="menu">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 10px', borderBottom: `1px solid ${NAV.border}` }}>
            <CoachAvatar url={avatarUrl} name={name} size={34} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: NAV.cream, margin: 0 }}>{name}</p>
              <p style={{ fontSize: 11, color: NAV.faint, margin: 0 }}>Espace coach</p>
            </div>
          </div>
          <MenuSections coachId={coachId} onNavigate={() => setOpen(false)} onSignOut={onSignOut} />
        </div>
      )}
    </div>
  )
}
