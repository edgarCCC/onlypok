import type { ReactNode } from 'react'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cx } from '@/lib/cx'
import './auth.css'

/** La charpente de toutes les pages d'accès : le logo, la bascule de thème, une colonne centrée. */
export default function AuthShell({ title, subtitle, wide, children }: { title?: ReactNode; subtitle?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className="au">
      <header className="au-top">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="au-main">
        <div className={cx('au-col', wide && 'au-col-wide')}>
          {title && (
            <div className="au-head">
              <h1 className="t-title">{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
