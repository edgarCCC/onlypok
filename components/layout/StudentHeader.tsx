'use client'
// Barre de l'espace élève : matériau translucide, onglets texte, retour à l'appui. Le menu compte part de son bouton (apple-design §7).
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Sparkles } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useUser } from '@/hooks/useUser'

const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/formations', label: 'Marketplace' },
  { href: '/train', label: 'Trainer' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/schedule', label: 'Planning' },
  { href: '/messages', label: 'Messages' },
]
const ROLE_LABEL: Record<string, string> = { coach: 'Coach', admin: 'Admin' }

function isTabActive(pathname: string, href: string) {
  if (href === '/train') return pathname === '/train' || pathname.startsWith('/train/') || pathname === '/trainer' || pathname.startsWith('/trainer/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function StudentHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useUser()
  const [open, setOpen] = useState(false)
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const avatarUrl = uploadedAvatar ?? profile?.avatar_url ?? null
  const username = profile?.username ?? 'Élève'
  const initial = username[0]?.toUpperCase() ?? 'E'
  const roleLabel = profile?.role ? ROLE_LABEL[profile.role] : undefined

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleAvatarChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: form })
      const json = await res.json()
      if (json.url) setUploadedAvatar(`${json.url}&bust=${Date.now()}`)
      else setUploadError('La photo n’a pas pu être envoyée.')
    } catch {
      setUploadError('La photo n’a pas pu être envoyée.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const avatar = (size: number) => (
    <span className="ui-avatar" aria-hidden="true">
      {avatarUrl ? <Image src={avatarUrl} alt="" fill sizes={`${size}px`} style={{ objectFit: 'cover' }} /> : initial}
    </span>
  )

  return (
    <header className="ui-nav is-app">
      <div className="ui-wrap ui-nav-bar is-wide">
        <Logo href="/dashboard" label="OnlyPok, mon espace" />
        {roleLabel && <span className="ui-nav-role">{roleLabel}</span>}
        <nav className="ui-nav-tabs" aria-label="Navigation de l’espace élève">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} className="ui-nav-tab" aria-current={isTabActive(pathname, tab.href) ? 'page' : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="ui-nav-right">
          <div ref={accountRef} className="ui-nav-account">
            <button ref={triggerRef} type="button" className="ui-nav-me" aria-label="Menu du compte" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
              {avatar(28)}
              <span className="ui-nav-me-name">{username}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
            {open && (
              <div className="ui-menu" role="menu">
                <div className="ui-menu-head">
                  {avatar(40)}
                  <div>
                    <p className="ui-menu-name">{username}</p>
                    <button type="button" className="ui-menu-link" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Envoi…' : 'Changer la photo'}
                    </button>
                    {uploadError && <p className="ui-field-error" role="alert">{uploadError}</p>}
                  </div>
                </div>
                {profile?.role === 'student' && (
                  <button type="button" role="menuitem" className="ui-menu-item" onClick={() => { setOpen(false); router.push('/become-coach') }}>
                    <Sparkles size={14} aria-hidden="true" /> Devenir coach
                  </button>
                )}
                <button type="button" role="menuitem" className="ui-menu-item ui-menu-danger" onClick={signOut}>
                  <LogOut size={14} aria-hidden="true" /> Déconnexion
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </div>
        </div>
      </div>
    </header>
  )
}
