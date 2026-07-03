'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#04040a', padding: '48px 24px', textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <p style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(240,244,255,0.3)', margin: '0 0 12px',
        }}>
          Erreur critique
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.6px', margin: '0 0 12px' }}>
          Le site a rencontré un problème
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(240,244,255,0.4)', margin: '0 0 36px', lineHeight: 1.7, maxWidth: 420 }}>
          Une erreur inattendue est survenue. Réessaie ou reviens un peu plus tard.
        </p>
        <button onClick={reset} style={{
          padding: '13px 24px', borderRadius: 13, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}>
          Réessayer
        </button>
      </body>
    </html>
  )
}
