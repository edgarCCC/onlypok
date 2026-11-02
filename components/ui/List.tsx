import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface ListProps {
  as?: 'ul' | 'ol' | 'div'
  /** Deux colonnes dès 768 px (vitrine de la landing) : des lignes à filets, jamais une grille de cartes identiques. */
  columns?: 1 | 2
  'aria-label'?: string
  'aria-busy'?: boolean
  className?: string
  children: ReactNode
}

/** Liste à filets : un filet au-dessus, chaque ListRow porte le sien en dessous. role="list" : VoiceOver ignore une liste sans puces. */
export default function List({ as: Tag = 'ul', columns = 1, className, children, ...rest }: ListProps) {
  return (
    <Tag className={cx('ui-list', columns === 2 && 'ui-list-2', className)} role={Tag === 'div' ? undefined : 'list'} {...rest}>
      {children}
    </Tag>
  )
}
