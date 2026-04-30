'use client'

const BRANDS = [
  'Tracker', 'Plateforme Vidéo', 'Coaching', 'Trainer GTO',
  'Progression', 'Classement', 'Analyseur de Mains',
]

export default function SocialProofBar() {
  const doubled = [...BRANDS, ...BRANDS]

  return (
    <div style={{
      background: '#04040a',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '20px 0',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 120,
        background: 'linear-gradient(to right, #04040a, transparent)',
        zIndex: 2, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 120,
        background: 'linear-gradient(to left, #04040a, transparent)',
        zIndex: 2, pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex', gap: 64, alignItems: 'center',
        animation: 'marquee 28s linear infinite',
        width: 'max-content',
      }}>
        {doubled.map((brand, i) => (
          <span key={i} style={{
            fontFamily: 'var(--font-space, sans-serif)',
            fontSize: 12, fontWeight: 500,
            letterSpacing: '0.1em',
            color: 'rgba(240,244,255,0.2)',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}>
            {brand}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
