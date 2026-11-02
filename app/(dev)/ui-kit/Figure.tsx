import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import styles from './ui-kit.module.css'

interface FigureProps {
  /** État montré : « Repos », « Survol »… */
  label: ReactNode
  /** Tokens utilisés, en petit sous l'état. */
  tokens?: string
  onSurface?: boolean
  column?: boolean
  className?: string
  children: ReactNode
}

export default function Figure({ label, tokens, onSurface = false, column = false, className, children }: FigureProps) {
  return (
    <figure className={styles.figure}>
      <div className={cx(styles.demo, onSurface && styles.onSurface, column && styles.col, className)}>{children}</div>
      <figcaption className={styles.caption}>
        <b>{label}</b>
        {tokens ? <code>{tokens}</code> : null}
      </figcaption>
    </figure>
  )
}
