import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface EmptyStateProps {
  /** Titre concret : « Aucune formation pour l'instant ». Ignoré en inline. */
  title?: ReactNode
  /** Une phrase concrète qui dit quoi faire, jamais un compteur à zéro. */
  children: ReactNode
  /** Un bouton secondaire ou un lien d'action. */
  action?: ReactNode
  /** Icône nue, facultative, jamais dans un rond coloré. */
  icon?: ReactNode
  /** Variante en ligne : phrase et action entre deux filets, pour une liste vide. */
  inline?: boolean
  /** Niveau du titre selon la hiérarchie de la page (h3 par défaut). */
  titleAs?: 'h2' | 'h3' | 'h4' | 'p'
  className?: string
}

export default function EmptyState({ title, children, action, icon, inline = false, titleAs: TitleTag = 'h3', className }: EmptyStateProps) {
  if (inline) {
    return (
      <p className={cx('ui-empty-inline', className)}>
        <span>{children}</span>
        {action}
      </p>
    )
  }
  return (
    <div className={cx('ui-empty', className)}>
      {icon ? <span className="ui-empty-icon" aria-hidden="true">{icon}</span> : null}
      {title ? <TitleTag className="t-heading">{title}</TitleTag> : null}
      <p>{children}</p>
      {action}
    </div>
  )
}
