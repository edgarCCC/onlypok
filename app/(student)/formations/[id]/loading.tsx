export default function Loading() {
  const DIM = 'rgba(232,228,220,0.06)'
  const shimmer = {
    background: `linear-gradient(90deg, ${DIM} 25%, rgba(232,228,220,0.09) 50%, ${DIM} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 8,
  } as const

  return (
    <div style={{ minHeight: '100vh', background: '#07090e' }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      {/* Header skeleton */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 80, background: 'rgba(7,9,14,0.97)', borderBottom: '1px solid rgba(232,228,220,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 80, padding: '0 40px', gap: 24 }}>
          <div style={{ ...shimmer, width: 120, height: 20, borderRadius: 6 }} />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ ...shimmer, width: 320, height: 44, borderRadius: 14 }} />
          </div>
          <div style={{ ...shimmer, width: 120, height: 36, borderRadius: 10 }} />
        </div>
      </div>
      {/* Content skeleton */}
      <div style={{ paddingTop: 100, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, maxWidth: 1200, margin: '0 auto', padding: '100px 40px 80px' }}>
        {/* Left */}
        <div style={{ paddingRight: 48 }}>
          {/* Video area */}
          <div style={{ ...shimmer, height: 420, borderRadius: 16, marginBottom: 32 }} />
          {/* Title */}
          <div style={{ ...shimmer, width: '75%', height: 36, marginBottom: 14 }} />
          <div style={{ ...shimmer, width: '50%', height: 18, marginBottom: 32 }} />
          {/* Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 40 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ ...shimmer, height: 72, borderRadius: 12 }} />
            ))}
          </div>
          {/* Coach card */}
          <div style={{ ...shimmer, height: 120, borderRadius: 16 }} />
        </div>
        {/* Right sticky panel */}
        <div>
          <div style={{ ...shimmer, height: 420, borderRadius: 20 }} />
        </div>
      </div>
    </div>
  )
}
