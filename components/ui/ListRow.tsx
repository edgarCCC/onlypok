import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface ListRowProps {
  /** Titre de la ligne (niveau 3, deux lignes au plus) : nom du coach, titre du contenu. */
  title: ReactNode
  /** Toute la ligne devient un lien ; le titre passe en bleu texte au survol. */
  href?: string
  /** Ligne du dessus : type en capitales et, au plus une fois par liste, le badge « Nouveau ». */
  eyebrow?: ReactNode
  /** Méta en --text-2 : « Lea_Rivers · Débutant · 7 modules ». */
  meta?: ReactNode
  /** Avatar (.ui-avatar) ou vignette, à gauche. */
  leading?: ReactNode
  /** Prix, tarif, flèche : à droite, chiffres en .num. */
  trailing?: ReactNode
  /** Sélection : fond --brand-soft, titre bleu texte et trait de 2 px --brand à gauche (indice de forme en plus de la teinte). */
  selected?: boolean
  /** li dans une List (défaut) ou div hors liste. */
  as?: 'li' | 'div'
  titleAs?: 'h3' | 'h4' | 'span'
  /** Classe posée sur la ligne elle-même (états forcés de la page de kit). */
  className?: string
  /** Contenu additionnel sous le titre : puces, chiffres. */
  children?: ReactNode
}

export default function ListRow({
  title, href, eyebrow, meta, leading, trailing, selected = false,
  as: Tag = 'li', titleAs: TitleTag = 'h3', className, children,
}: ListRowProps) {
  const rowClass = cx('ui-row', href !== undefined && 'ui-row-link', selected && 'ui-row-selected', className)
  const inner = (
    <>
      {leading ? <div className="ui-row-leading">{leading}</div> : null}
      <div className="ui-row-body">
        {eyebrow ? <div className="ui-row-top">{eyebrow}</div> : null}
        <TitleTag className="t-heading clamp2" title={typeof title === 'string' ? title : undefined}>{title}</TitleTag>
        {meta ? <p className="ui-row-meta">{meta}</p> : null}
        {children}
      </div>
      {trailing ? <div className="ui-row-trailing">{trailing}</div> : null}
    </>
  )
  return (
    <Tag className="ui-list-item">
      {href !== undefined
        ? <Link href={href} className={rowClass} aria-current={selected ? 'true' : undefined}>{inner}</Link>
        : <div className={rowClass} aria-current={selected ? 'true' : undefined}>{inner}</div>}
    </Tag>
  )
}
