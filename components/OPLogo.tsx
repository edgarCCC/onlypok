interface OPLogoProps {
  size?: number
  variant?: 'light' | 'dark' | 'violet' | 'naked'
}

export default function OPLogo({ size = 32, variant = 'dark' }: OPLogoProps) {
  const s  = size / 90
  const fs = Math.round(39 * s)

  const bg: Record<string, string> = {
    light:  '#f0f4ff',
    dark:   '#0d0d18',
    violet: '#7c3aed',
    naked:  'transparent',
  }

  const textColor  = variant === 'light' ? '#04040a' : '#f0f4ff'
  const curveColor = variant === 'light' ? '#04040a' : '#f0f4ff'
  const border     = variant === 'dark'  ? '1px solid rgba(255,255,255,0.08)' : 'none'

  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: bg[variant], border, borderRadius: '23%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Monogramme OP, légèrement remonté pour laisser place à la courbe */}
      <div style={{
        fontFamily: 'var(--font-syne, sans-serif)',
        fontWeight: 800, fontSize: fs,
        color: textColor,
        letterSpacing: '-0.05em', lineHeight: 1,
        userSelect: 'none',
        transform: `translateY(${-11 * s}px)`,
      }}>
        OP
      </div>
      {/* Courbe de winning : le graphe de bankroll qui monte, en flèche */}
      <svg
        viewBox="0 0 90 90"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <path d="M 26,68.5 L 37.5,64.5 L 47,68 L 62.5,56.5"
          stroke={curveColor} strokeWidth={3.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 58,56 L 63,56 L 63,61"
          stroke={curveColor} strokeWidth={3.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
