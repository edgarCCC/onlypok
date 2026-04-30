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

  const textColor = variant === 'light' ? '#04040a' : '#f0f4ff'
  const arcColor  = variant === 'light' ? '#04040a' : '#f0f4ff'
  const border    = variant === 'dark'  ? '1px solid rgba(255,255,255,0.08)' : 'none'

  // Arc reference at 90px: M 7,79 Q 13.5,81 20,79  stroke-width 2.8
  const ax1 = 7 * s, ay = 79 * s, acx = 13.5 * s, acy = 81 * s, ax2 = 20 * s, sw = 2.8 * s

  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: bg[variant], border, borderRadius: '22%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'visible',
    }}>
      <div style={{
        fontFamily: 'var(--font-syne, sans-serif)',
        fontWeight: 800, fontSize: fs,
        color: textColor,
        display: 'flex', alignItems: 'baseline',
        letterSpacing: '-0.08em', lineHeight: 1,
        userSelect: 'none',
      }}>
        <span>O</span>
        <span style={{ display: 'inline-block', transform: 'scaleY(1.17)', transformOrigin: 'top center' }}>P</span>
      </div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
      >
        <path
          d={`M ${ax1},${ay} Q ${acx},${acy} ${ax2},${ay}`}
          stroke={arcColor} strokeWidth={sw} fill="none" strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
