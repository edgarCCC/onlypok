import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
        <Link href="/formations" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Formations</Link>
        <Link href="/coaches" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Coachs</Link>
        <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Connexion</Link>
      </div>
      <p>© {new Date().getFullYear()} OnlyPok — Tous droits réservés</p>
    </footer>
  )
}
