'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { COACH_TABS, isTabActive, NAV } from './coach-nav'
import { MenuSections } from './CoachAccountMenu'
import type { CoachBadges } from './useCoachBadges'

/* Barre d'onglets fixe en bas d'écran (mobile) + feuille « Plus » qui
   contient les onglets secondaires et les liens du compte. */
export default function CoachMobileNav({ pathname, badges, coachId, onSignOut }: {
  pathname: string
  badges: CoachBadges
  coachId: string | undefined
  onSignOut: () => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [sheetOpen])

  const primary   = COACH_TABS.filter(t => t.mobile)
  const secondary = COACH_TABS.filter(t => !t.mobile)
  const secondaryActive = secondary.some(t => isTabActive(t, pathname))

  return (
    <>
      <nav className="coach-bottom-bar" aria-label="Navigation coach">
        {primary.map(tab => {
          const active = isTabActive(tab, pathname)
          const count  = tab.badge ? badges[tab.badge] : 0
          const Icon   = tab.icon
          return (
            <Link key={tab.href} href={tab.href} className="coach-bottom-item" data-active={active || undefined}
              aria-current={active ? 'page' : undefined}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {count > 0 && <span className="coach-dot-badge">{count > 9 ? '9+' : count}</span>}
              </span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setSheetOpen(true)} className="coach-bottom-item"
          data-active={secondaryActive || undefined} aria-expanded={sheetOpen}>
          <Menu size={20} strokeWidth={1.8} />
          <span>Plus</span>
        </button>
      </nav>

      {sheetOpen && (
        <div className="coach-sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="coach-sheet" role="dialog" aria-label="Plus" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 10px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: NAV.cream }}>Plus</span>
              <button onClick={() => setSheetOpen(false)} className="coach-icon-btn" aria-label="Fermer"><X size={16} /></button>
            </div>
            <div className="coach-menu-section">
              {secondary.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="coach-menu-item" onClick={() => setSheetOpen(false)}>
                  <Icon size={15} strokeWidth={1.8} />
                  <span style={{ flex: 1 }}>{label}</span>
                </Link>
              ))}
            </div>
            <MenuSections coachId={coachId} onNavigate={() => setSheetOpen(false)} onSignOut={onSignOut} />
          </div>
        </div>
      )}
    </>
  )
}
