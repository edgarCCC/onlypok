export default function Loading() {
  const shimmer = { background: 'var(--surface-2)', borderRadius: 8 } as const

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      {/* Header skeleton */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 80, background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 80, padding: '0 40px', gap: 24 }}>
          <div style={{ ...shimmer, width: 120, height: 20, borderRadius: 6 }} />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ ...shimmer, width: 320, height: 44, borderRadius: 14 }} />
          </div>
          <div style={{ ...shimmer, width: 120, height: 36, borderRadius: 10 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 20 }}>
          <div style={{ ...shimmer, width: 860, height: 68, borderRadius: 50 }} />
        </div>
      </div>
      {/* Content skeleton */}
      <div style={{ paddingTop: 220, paddingLeft: 40, paddingRight: 40 }}>
        {[0, 1, 2].map(rowIdx => (
          <div key={rowIdx} style={{ marginBottom: 52 }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ ...shimmer, width: 200, height: 26, marginBottom: 8 }} />
              <div style={{ ...shimmer, width: 240, height: 14 }} />
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ width: 290, flexShrink: 0 }}>
                  <div style={{ ...shimmer, height: 148, borderRadius: '16px 16px 0 0', marginBottom: 0 }} />
                  <div style={{ background: 'color-mix(in srgb, var(--brand) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 7%, transparent)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: 16 }}>
                    <div style={{ ...shimmer, width: '80%', height: 16, marginBottom: 8 }} />
                    <div style={{ ...shimmer, width: '60%', height: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
