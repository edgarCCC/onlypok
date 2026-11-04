'use client'
// Composant client : il pose des gestionnaires d'événements (preventDefault pendant le chargement et sur un lien désactivé),
// ce qu'un Server Component ne peut pas faire sur un élément natif (React Flight).
import Link from 'next/link'
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'strong' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  /** primary : le seul bouton plein de l'écran (clair, texte noir). secondary : contour (défaut). strong : action secondaire forte, fond forêt, une par écran. link : lien d'action bleu texte. */
  variant?: ButtonVariant
  /** sm 32 px (zone tactile étendue à 48 px), md 44 px (défaut), lg 48 px. */
  size?: ButtonSize
  /** Indicateur de chargement pendant l'action du bouton : clic et soumission bloqués (type="button" et preventDefault le temps du chargement), le focus et la taille restent. */
  loading?: boolean
  /** Flèche décorative du lien d'action : « Voir les formations → », « Essayer le trainer ↓ ». */
  arrow?: 'right' | 'down'
  disabled?: boolean
  className?: string
  children: ReactNode
}

type NativeButtonProps = Omit<ComponentPropsWithoutRef<'button'>, keyof ButtonBaseProps | 'type'> & {
  href?: undefined
  type?: 'button' | 'submit' | 'reset'
}

type LinkButtonProps = Omit<ComponentPropsWithoutRef<typeof Link>, keyof ButtonBaseProps | 'href'> & {
  /** Rend un lien next/link avec le même rendu. */
  href: string
}

export type ButtonProps = ButtonBaseProps & (NativeButtonProps | LinkButtonProps)

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  strong: 'ui-btn-strong',
  link: 'ui-btn-link',
}

const SIZE_CLASS: Record<ButtonSize, string> = { sm: 'ui-btn-sm', md: '', lg: 'ui-btn-lg' }

function preventDefault(event: MouseEvent<HTMLElement>) {
  event.preventDefault()
}

export default function Button(props: ButtonProps) {
  const { variant = 'secondary', size = 'md', loading = false, arrow, disabled = false, className, children, ...rest } = props
  const isInert = disabled || loading
  const classes = cx('ui-btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className)
  const dataArrow = variant === 'link' ? arrow : undefined
  const content = (
    <>
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {children}
      {loading ? <span className="sr"> (chargement en cours)</span> : null}
    </>
  )

  if (rest.href !== undefined) {
    // Lien désactivé ou en chargement : même rendu et même taille, hors tabulation ; le clic (souris, Entrée, el.click()) est annulé,
    // next/link respecte defaultPrevented et ne navigue pas
    return (
      <Link
        {...rest}
        className={classes}
        data-arrow={dataArrow}
        aria-disabled={isInert ? 'true' : undefined}
        aria-busy={loading ? 'true' : undefined}
        tabIndex={isInert ? -1 : rest.tabIndex}
        onClick={isInert ? preventDefault : rest.onClick}
      >
        {content}
      </Link>
    )
  }

  const { type = 'button', onClick, ...native } = rest
  return (
    <button
      {...native}
      type={loading ? 'button' : type}
      className={classes}
      data-arrow={dataArrow}
      disabled={disabled}
      aria-disabled={loading ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      onClick={loading ? preventDefault : onClick}
    >
      {content}
    </button>
  )
}
