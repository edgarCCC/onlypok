import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type CardPadding = 'none' | 'sm' | 'md'

export interface CardProps {
  /** Élément rendu quand la carte n'est pas un lien. */
  as?: 'div' | 'article' | 'section' | 'aside' | 'li'
  /** none : la carte compose son contenu (CardMedia + CardBody) ; sm : 16 px (dashboards, défaut) ; md : 24 px (landing). */
  padding?: CardPadding
  /** Toute la carte devient un lien next/link : survol (fond --surface-2, filet --border-strong, titre .t-heading en bleu texte),
   *  appui scale(.97) ; `as` est alors ignoré. Sans href, une carte n'est jamais cliquable (pas de div cliquable). */
  href?: string
  id?: string
  className?: string
  style?: CSSProperties
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-busy'?: boolean
  children: ReactNode
}

const PADDING_CLASS: Record<CardPadding, string> = { none: '', sm: 'ui-card-pad-sm', md: 'ui-card-pad-md' }

export default function Card({ as: Tag = 'div', padding = 'sm', href, className, children, ...rest }: CardProps) {
  const classes = cx('ui-card', PADDING_CLASS[padding], href !== undefined && 'ui-card-interactive', className)
  if (href !== undefined) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}

/** Vignette 16/9 en tête d'une carte sans padding ; sans image, un mot en --text-3 : « Formation ». */
interface CardPartProps {
  className?: string
  style?: CSSProperties
  /** Vignette décorative (mot de remplacement sans image) : exclue du nom de la carte-lien. */
  'aria-hidden'?: boolean
  children: ReactNode
}

export function CardMedia({ className, style, children, ...rest }: CardPartProps) {
  return <div className={cx('ui-card-media', className)} style={style} {...rest}>{children}</div>
}

/** Corps d'une carte à vignette : colonne, 16 px, espacement de 4 px. */
export function CardBody({ className, style, children }: CardPartProps) {
  return <div className={cx('ui-card-body', className)} style={style}>{children}</div>
}
