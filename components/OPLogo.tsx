interface OPLogoProps {
  size?: number
  variant?: 'light' | 'dark' | 'violet' | 'naked'
}

export default function OPLogo({ size = 32, variant = 'dark' }: OPLogoProps) {
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
      {/* Monogramme OP, remonté pour laisser place à la courbe d'apprentissage */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: `${(120 / 512) * size}px`,
        textAlign: 'center',
        fontFamily: 'var(--font-syne, sans-serif)',
        fontWeight: 800, fontSize: `${(158 / 512) * size}px`,
        color: textColor,
        letterSpacing: '-0.05em', lineHeight: 1,
        userSelect: 'none',
      }}>
        OP
      </div>
      {/* Courbe de Dunning-Kruger : pic de confiance → vallée → progression.
         viewBox 512 indépendant de la taille de rendu (le SVG s'adapte). */}
      <svg
        viewBox="0 0 512 512"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <path d="M 148,372 L 188,332 C 200,346 212,388 244,392 C 292,398 322,364 360,336"
          stroke={curveColor} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 336,332 L 362,334 L 360,360"
          stroke={curveColor} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
