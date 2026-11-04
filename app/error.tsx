'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '48px 24px', textAlign: 'center',
    }}>
      <p style={{
        fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--text-3)', margin: '0 0 12px',
      }}>
        Erreur inattendue
      </p>
      <h1 style={{
        fontSize: 32, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.6px',
        margin: '0 0 12px', fontFamily: 'var(--font-syne,sans-serif)',
      }}>
        Bad beat
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 36px', lineHeight: 1.7, maxWidth: 420 }}>
        Quelque chose s'est mal passé de notre côté. Réessaie — si le problème persiste, contacte-nous.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={reset} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 13, border: 'none', cursor: 'pointer',
          background: 'var(--brand)',
          color: 'var(--on-brand)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          boxShadow: '0 0 28px color-mix(in srgb, var(--brand) 33%, transparent), 0 4px 12px rgba(0,0,0,0.4)',
        }}>
          Réessayer
        </button>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 13, textDecoration: 'none',
          border: '1.5px solid color-mix(in srgb, var(--overlay) 12%, transparent)',
          color: 'var(--text)', fontSize: 14, fontWeight: 600,
        }}>
          Retour à l'accueil
        </a>
      </div>
    </div>
  )
}
