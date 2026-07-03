import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#04040a', padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 8, userSelect: 'none' }} aria-hidden>🃏</div>
      <p style={{
        fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'rgba(240,244,255,0.3)', margin: '0 0 12px',
      }}>
        Erreur 404
      </p>
      <h1 style={{
        fontSize: 32, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.6px',
        margin: '0 0 12px', fontFamily: 'var(--font-syne,sans-serif)',
      }}>
        Cette page a foldé
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(240,244,255,0.4)', margin: '0 0 36px', lineHeight: 1.7, maxWidth: 420 }}>
        La page que tu cherches n'existe pas ou a été déplacée. Retourne à la table.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 13, textDecoration: 'none',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          color: '#fff', fontSize: 14, fontWeight: 700,
          boxShadow: '0 0 28px rgba(124,58,237,0.33), 0 4px 12px rgba(0,0,0,0.4)',
        }}>
          Retour à l'accueil
        </Link>
        <Link href="/formations" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 13, textDecoration: 'none',
          border: '1.5px solid rgba(255,255,255,0.12)',
          color: 'rgba(240,244,255,0.7)', fontSize: 14, fontWeight: 600,
        }}>
          Voir les formations
        </Link>
      </div>
    </div>
  )
}
