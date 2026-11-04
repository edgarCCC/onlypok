import Link from 'next/link'

export default function NotFound() {
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
        Erreur 404
      </p>
      <h1 style={{
        fontSize: 32, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.6px',
        margin: '0 0 12px', fontFamily: 'var(--font-syne,sans-serif)',
      }}>
        Cette page a foldé
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 36px', lineHeight: 1.7, maxWidth: 420 }}>
        La page que tu cherches n'existe pas ou a été déplacée. Retourne à la table.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 13, textDecoration: 'none',
          background: 'var(--brand)',
          color: 'var(--on-brand)', fontSize: 14, fontWeight: 700,
          boxShadow: '0 0 28px color-mix(in srgb, var(--brand) 33%, transparent), 0 4px 12px rgba(0,0,0,0.4)',
        }}>
          Retour à l'accueil
        </Link>
        <Link href="/formations" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 13, textDecoration: 'none',
          border: '1.5px solid color-mix(in srgb, var(--overlay) 12%, transparent)',
          color: 'var(--text)', fontSize: 14, fontWeight: 600,
        }}>
          Voir les formations
        </Link>
      </div>
    </div>
  )
}
