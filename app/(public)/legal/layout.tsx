import RoleHeader from '@/components/layout/RoleHeader'
import LegalFooter from '@/components/layout/LegalFooter'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
      <RoleHeader />
      <main className="legal-doc" style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px' }}>
        {children}
      </main>
      <LegalFooter />
      <style>{`
        .legal-doc h1 {
          font-size: var(--text-title);
          font-weight: 600;
          letter-spacing: -.022em;
          line-height: 1.14;
          margin: 0 0 8px;
          color: var(--text);
        }
        .legal-doc .legal-updated {
          font-size: 13px;
          color: var(--text-3);
          margin: 0 0 48px;
        }
        .legal-doc h2 {
          font-size: var(--text-heading);
          font-weight: 600;
          letter-spacing: -.012em;
          margin: 40px 0 12px;
          color: var(--text);
        }
        .legal-doc h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 24px 0 8px;
          color: var(--text);
        }
        .legal-doc p, .legal-doc li {
          font-size: 15px;
          line-height: 1.65;
          color: var(--text-2);
          margin: 0 0 14px;
        }
        .legal-doc ul { padding-left: 22px; margin: 0 0 16px; }
        .legal-doc li { margin-bottom: 8px; }
        .legal-doc strong { color: var(--text); font-weight: 600; }
        .legal-doc a { color: var(--brand-text); text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: .2em; }
        .legal-doc .legal-placeholder {
          color: var(--brand);
          background: color-mix(in srgb, var(--brand) 8%, transparent);
          border-radius: 4px;
          padding: 1px 6px;
        }
      `}</style>
    </div>
  )
}
