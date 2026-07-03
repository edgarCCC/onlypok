import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#07090e', minHeight: '100vh', color: '#f0f4ff' }}>
      <Navbar />
      <main className="legal-doc" style={{ maxWidth: 760, margin: '0 auto', padding: '140px 24px 100px' }}>
        {children}
      </main>
      <Footer />
      <style>{`
        .legal-doc h1 {
          font-family: var(--font-syne, sans-serif);
          font-size: clamp(28px, 4vw, 38px);
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0 0 8px;
          color: #f0f4ff;
        }
        .legal-doc .legal-updated {
          font-size: 13px;
          color: rgba(240,244,255,0.3);
          margin: 0 0 48px;
        }
        .legal-doc h2 {
          font-family: var(--font-syne, sans-serif);
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.2px;
          margin: 44px 0 14px;
          color: #f0f4ff;
        }
        .legal-doc h3 {
          font-size: 15px;
          font-weight: 700;
          margin: 28px 0 10px;
          color: rgba(240,244,255,0.85);
        }
        .legal-doc p, .legal-doc li {
          font-size: 14.5px;
          line-height: 1.85;
          color: rgba(240,244,255,0.55);
          margin: 0 0 14px;
        }
        .legal-doc ul { padding-left: 22px; margin: 0 0 16px; }
        .legal-doc li { margin-bottom: 8px; }
        .legal-doc strong { color: rgba(240,244,255,0.85); font-weight: 600; }
        .legal-doc a { color: #a78bfa; text-decoration: none; }
        .legal-doc a:hover { text-decoration: underline; }
        .legal-doc .legal-placeholder {
          color: #f59e0b;
          background: rgba(245,158,11,0.08);
          border-radius: 4px;
          padding: 1px 6px;
        }
      `}</style>
    </div>
  )
}
