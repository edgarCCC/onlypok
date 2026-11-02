import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type BadgeVariant = 'neutral' | 'new' | 'status'

export interface BadgeProps {
  /** neutral : capitales sur filet (type, format). new : orange, « Nouveau », un par liste. status : point d'état et libellé (« Planifiée »). */
  variant?: BadgeVariant
  /** Couleur du point d'état : brand (en cours, planifié) ou neutral (--text-3, annulé). */
  tone?: 'brand' | 'neutral'
  title?: string
  className?: string
  children: ReactNode
}

export default function Badge({ variant = 'neutral', tone = 'brand', title, className, children }: BadgeProps) {
  return (
    <span
      className={cx('ui-badge', variant === 'new' && 'ui-badge-new', variant === 'status' && 'ui-badge-status', className)}
      title={title}
    >
      {variant === 'status' ? <span className={cx('ui-dot', tone === 'neutral' && 'ui-dot-neutral')} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}
