import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#080c10' }}>
      {/* Hero */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '140px 32px 100px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 99, marginBottom: 32, letterSpacing: '0.06em' }}>
          <span>♠</span> Plateforme poker professionnelle
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 700, lineHeight: 1.08, marginBottom: 24, letterSpacing: '-2px', color: '#fff' }}>
          Progresse au poker<br />
          <span style={{ color: 'var(--accent)' }}>avec les meilleurs.</span>
        </h1>

        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.4)', maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.7, letterSpacing: '-0.2px' }}>
          Formations vidéo, coaching sur-mesure et outils d'analyse conçus par des pros pour des pros.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/register" style={{ background: 'var(--accent)', color: '#fff', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14, letterSpacing: '-0.2px' }}>
            Commencer gratuitement
          </Link>
          <Link href="/formations" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
            Voir les formations
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: 600, margin: '0 auto', height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />

      {/* Stats */}
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '80px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
        {[
          { num: '50+', label: 'Formations' },
          { num: '20+', label: 'Coachs certifiés' },
          { num: '2 000+', label: 'Joueurs formés' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-1px', marginBottom: 6 }}>{s.num}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.1px' }}>{s.label}</div>
          </div>
        ))}
      </section>
    </main>
  )
}
