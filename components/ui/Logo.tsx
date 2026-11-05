import Link from 'next/link'
import { cx } from '@/lib/cx'

export interface LogoProps {
  /** Destination du logo : l'accueil public, ou l'accueil de l'espace connecté. */
  href?: string
  /** md 15 px (headers) ; sm 13 px (header coach, pied de page). */
  size?: 'sm' | 'md'
  /** Nom accessible du lien. */
  label?: string
  className?: string
}

/** « ● ONLYPOK » : point de 7 × 7 px, rayon 2, --violet plat, puis le logotype en Unbounded 700, +0,18 em. */
export default function Logo({ href = '/', size = 'md', label = 'OnlyPok, accueil', className }: LogoProps) {
  return (
    <Link href={href} className={cx('ui-logo', size === 'sm' && 'ui-logo-sm', className)} aria-label={label}>
      <span className="ui-logo-dot" aria-hidden="true" />
      ONLYPOK
    </Link>
  )
}
