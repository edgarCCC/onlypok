import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type SectionSpacing = 'sm' | 'md' | 'lg'

export interface SectionProps {
  /** Titre : h2 en niveau 2 (Unbounded), ou h3 en niveau 3 (Space Grotesk) avec level={3}. */
  title?: ReactNode
  subtitle?: ReactNode
  /** Capitales de niveau 5 au-dessus du titre. */
  eyebrow?: ReactNode
  /** Action de l'en-tête (lien d'action, bouton secondaire), alignée à droite, repliée sous le titre quand la place manque. */
  action?: ReactNode
  level?: 2 | 3
  /** sm 24 px ; md 32 px (défaut, dashboards) ; lg 64 → 96 px (sections de la landing). */
  spacing?: SectionSpacing
  /** Filet --border au-dessus. */
  divider?: boolean
  /** Enveloppe l'en-tête et le contenu dans .ui-wrap (1200 px, gouttières 16 / 24 / 32). */
  contained?: boolean
  as?: 'section' | 'div' | 'article'
  id?: string
  className?: string
  children?: ReactNode
}

const SPACING_CLASS: Record<SectionSpacing, string> = { sm: 'ui-section-gap-sm', md: '', lg: 'ui-section-gap-lg' }

export default function Section({
  title, subtitle, eyebrow, action, level = 2, spacing = 'md', divider = false, contained = false,
  as: Tag = 'section', id, className, children,
}: SectionProps) {
  const headingId = useId()
  const Heading = level === 2 ? 'h2' : 'h3'
  const head = title ? (
    <header className="ui-section-head">
      <div className="ui-section-head-text">
        {eyebrow ? <p className="t-caps">{eyebrow}</p> : null}
        <Heading id={headingId} className={level === 2 ? 't-title' : 't-heading'}>{title}</Heading>
        {subtitle ? <p className="ui-section-sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="ui-section-action">{action}</div> : null}
    </header>
  ) : null
  const body = (
    <>
      {head}
      {children}
    </>
  )
  return (
    <Tag
      id={id}
      className={cx('ui-section', SPACING_CLASS[spacing], divider && 'ui-section-divider', className)}
      aria-labelledby={title && Tag !== 'div' ? headingId : undefined}
    >
      {contained ? <div className="ui-wrap">{body}</div> : body}
    </Tag>
  )
}
