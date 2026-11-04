'use client'

import { useSyncExternalStore } from 'react'

type Theme = 'dark' | 'light'
const listeners = new Set<() => void>()
const read = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

function setTheme(theme: Theme) {
  const root = document.documentElement
  // Pas de saut de luminosité brutal : fondu de 200 ms, le temps de la bascule (apple-design §14)
  root.classList.add('theme-changing')
  if (theme === 'light') root.dataset.theme = 'light'
  else delete root.dataset.theme
  try { localStorage.setItem('op-theme', theme) } catch { /* stockage indisponible : le choix vaut pour la page */ }
  window.setTimeout(() => root.classList.remove('theme-changing'), 220)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Bascule sombre / clair, sans libellé visible ; le nom accessible dit ce que fait le bouton. */
export default function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => 'dark' as Theme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={className ? `ui-theme-btn ${className}` : 'ui-theme-btn'}
      onClick={() => setTheme(next)}
      aria-label={next === 'light' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      suppressHydrationWarning
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5V1.75Z" fill="currentColor" />
      </svg>
    </button>
  )
}
