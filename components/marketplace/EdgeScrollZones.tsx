'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SCROLL_SPEED = 3.5 // px par frame (~210 px/s)

/* ─── Zones de défilement aux bords d'une rangée scrollable ───────────────────
   Poser le curseur sur un bord fait défiler la rangée en continu (façon
   Netflix) ; un clic saute d'une page. Flèches semi-transparentes, visibles
   uniquement quand il reste du contenu dans cette direction. ───────────────── */
export default function EdgeScrollZones({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const rafRef = useRef<number | null>(null)
  const [canLeft, setCanLeft]   = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [scrollRef])

  const stop = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }
  const start = (dir: 1 | -1) => {
    stop()
    const step = () => {
      const el = scrollRef.current
      if (el) el.scrollLeft += dir * SCROLL_SPEED
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }
  useEffect(() => stop, [])

  const zone = (dir: 1 | -1) => (
    <div
      key={dir}
      onMouseEnter={() => start(dir)}
      onMouseLeave={stop}
      onClick={() => scrollRef.current?.scrollBy({ left: dir * 800, behavior: 'smooth' })}
      style={{
        position: 'absolute', top: 0, bottom: 0, zIndex: 3,
        [dir === 1 ? 'right' : 'left']: 0,
        width: 72, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: dir === 1 ? 'flex-end' : 'flex-start',
        padding: dir === 1 ? '0 8px 0 0' : '0 0 0 8px',
        background: `linear-gradient(to ${dir === 1 ? 'left' : 'right'}, var(--bg) 0%, color-mix(in srgb, var(--bg) 50%, transparent) 45%, transparent 100%)`,
      }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--brand) 7%, transparent)',
          border: '1px solid color-mix(in srgb, var(--brand) 14%, transparent)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-2)',
          opacity: 0.75,
          transition: 'opacity 0.2s ease, color 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={e => { const s = (e.currentTarget as HTMLDivElement).style; s.opacity = '1'; s.color = 'var(--brand)'; s.borderColor = 'color-mix(in srgb, var(--brand) 30%, transparent)' }}
        onMouseLeave={e => { const s = (e.currentTarget as HTMLDivElement).style; s.opacity = '0.75'; s.color = 'var(--text-2)'; s.borderColor = 'color-mix(in srgb, var(--brand) 14%, transparent)' }}
      >
        {dir === 1 ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      </div>
    </div>
  )

  return (
    <>
      {canLeft && zone(-1)}
      {canRight && zone(1)}
    </>
  )
}
