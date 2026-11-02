import type { CSSProperties } from 'react'
import { cx } from '@/lib/cx'

export type SkeletonVariant = 'line' | 'avatar' | 'thumb' | 'block'

export interface SkeletonProps {
  /** line : 12 px de haut (défaut) ; avatar : 40 px, rond ; thumb : 16/9 ; block : zone au rayon de contrôle. */
  variant?: SkeletonVariant
  width?: number | string
  height?: number | string
  className?: string
  style?: CSSProperties
}

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  line: 'ui-skeleton-line',
  avatar: 'ui-skeleton-avatar',
  thumb: 'ui-skeleton-thumb',
  block: 'ui-skeleton-block',
}

/** Squelette de la structure finale : --surface-2, sans reflet, visible après 300 ms d'attente. Le parent pose aria-busy="true". */
export default function Skeleton({ variant = 'line', width, height, className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx('ui-skeleton', VARIANT_CLASS[variant], className)}
      style={{ width, height, ...style }}
    />
  )
}
