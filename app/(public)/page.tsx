import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <section style={{ padding: '120px 24px 80px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block',
          background: 'var(--accent-glow)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: 'var(--accent)',
          fontSize: 12,
          fontWeight: 500,
          padding: '4px 14px',
          borderRadius: 99,
          marginBottom: 24,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>La plateforme poker #1</div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-1px' }}>
          Progresse au poker<br />
          <span style={{ color: 'var(--accent)' }}>avec les meilleurs coachs</span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Formations vidéo, coaching personnalisé et outils d'analyse pour passer au niveau supérieur.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/formations" style={{ background: 'var(--accent)', color: '#fff', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>Voir les formations</Link>
          <Link href="/coaches" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>Trouver un coach</Link>
        </div>
      </section>

      <section style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '40px 24px 80px', flexWrap: 'wrap' }}>
        {[{ num: '50+', label: 'Formations' }, { num: '20+', label: 'Coachs certifiés' }, { num: '2000+', label: 'Élèves actifs' }].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>{s.num}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>
    </main>
  )
}
