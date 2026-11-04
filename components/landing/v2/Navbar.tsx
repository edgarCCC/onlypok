'use client'
// Barre de navigation : aucun appel à Supabase (un connecté est redirigé par le proxy). Matériau translucide dès qu'on défile,
// le contenu passe dessous (apple-design §12). Tant que le bouton du hero est visible, « Créer mon compte » reste en contour :
// jamais deux boutons pleins à l'écran. Menu mobile : Échap rend le focus au bouton.
import Link from 'next/link'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cx } from '@/lib/cx'
import { LANDING_ROUTES } from '@/lib/routes'

const NAV_LINKS = [
  { label: 'Formations', href: LANDING_ROUTES.formations },
  { label: 'Coachs', href: LANDING_ROUTES.coaches },
  { label: 'Trainer', href: LANDING_ROUTES.trainer },
  { label: 'Tracker', href: LANDING_ROUTES.tracker },
]
const SCROLL_MATERIAL = 8
const SCROLL_PAST_HERO = 520

function subscribeScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}
const scrollStage = () => (window.scrollY > SCROLL_PAST_HERO ? 2 : window.scrollY > SCROLL_MATERIAL ? 1 : 0)
const scrollStageOnServer = () => 0

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
    </svg>
  )
}

export default function Navbar() {
  const stage = useSyncExternalStore(subscribeScroll, scrollStage, scrollStageOnServer)
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className={cx('lp-nav', stage > 0 && 'is-scrolled')}>
      <div className="ui-wrap lp-nav-bar">
        <Logo />
        <nav className="lp-nav-links" aria-label="Navigation principale">
          {NAV_LINKS.map(({ label, href }) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="lp-nav-right">
          <Link href={LANDING_ROUTES.becomeCoach} className="lp-nav-login lp-nav-coach">Devenir coach</Link>
          <Link href={LANDING_ROUTES.login} className="lp-nav-login">Se connecter</Link>
          <ThemeToggle />
          <Button href={LANDING_ROUTES.register} size="sm" variant={stage === 2 ? 'primary' : 'secondary'} className="lp-nav-cta">Créer mon compte</Button>
          <button
            ref={buttonRef}
            type="button"
            className="lp-menu-btn"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
        <nav ref={panelRef} id={panelId} className={cx('menu-panel', open && 'is-open')} aria-label="Menu">
          {NAV_LINKS.map(({ label, href }) => <Link key={href} href={href} onClick={close}>{label}</Link>)}
          <Link href={LANDING_ROUTES.login} onClick={close}>Se connecter</Link>
          <Link href={LANDING_ROUTES.register} onClick={close}>Créer mon compte</Link>
          <Link href={LANDING_ROUTES.becomeCoach} onClick={close}>Devenir coach</Link>
        </nav>
      </div>
    </header>
  )
}
