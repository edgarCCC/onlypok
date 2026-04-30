'use client'
import { useEffect, useRef, useState } from 'react'

const SUITS  = ['♠', '♥', '♦', '♣']
const COLORS = ['#7c3aed', '#e11d48', '#e11d48', '#06b6d4']
const SIZE   = 52

export default function DVDBounce() {
  const elRef       = useRef<HTMLDivElement>(null)
  const pos         = useRef({ x: 180, y: 260 })
  const vel         = useRef({ x: 1.4, y: 0.95 })
  const suitIdx     = useRef(0)
  const wasInCorner = useRef(false)
  const [suit, setSuit] = useState(0)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    let raf: number

    const tick = () => {
      let { x, y } = pos.current
      let { x: vx, y: vy } = vel.current
      const maxX = window.innerWidth  - SIZE
      const maxY = window.innerHeight - SIZE

      x += vx
      y += vy

      if (x <= 0)    { x = 0;    vx =  Math.abs(vx) }
      if (x >= maxX) { x = maxX; vx = -Math.abs(vx) }
      if (y <= 0)    { y = 0;    vy =  Math.abs(vy) }
      if (y >= maxY) { y = maxY; vy = -Math.abs(vy) }

      pos.current = { x, y }
      vel.current = { x: vx, y: vy }

      el.style.transform = `translate(${x}px, ${y}px)`

      // coin = les deux axes ont rebondi dans le même cycle
      const inCorner = (x <= 1 || x >= maxX - 1) && (y <= 1 || y >= maxY - 1)
      if (inCorner && !wasInCorner.current) {
        const next = (suitIdx.current + 1) % SUITS.length
        suitIdx.current = next
        setSuit(next)
        el.style.transform = `translate(${x}px, ${y}px) scale(1.6)`
        setTimeout(() => { if (el) el.style.transform = `translate(${x}px, ${y}px) scale(1)` }, 220)
      }
      wasInCorner.current = inCorner

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <style>{`
        .dvd-suit {
          transition: color 0.4s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
      `}</style>
      <div
        ref={elRef}
        className="dvd-suit"
        style={{
          position: 'fixed',
          top: 0, left: 0,
          zIndex: 50,
          pointerEvents: 'none',
          userSelect: 'none',
          width: SIZE, height: SIZE,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38,
          color: COLORS[suit],
          opacity: 0.25,
          textShadow: `0 0 20px ${COLORS[suit]}`,
        }}
      >
        {SUITS[suit]}
      </div>
    </>
  )
}
