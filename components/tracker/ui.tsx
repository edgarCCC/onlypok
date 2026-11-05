'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Upload } from 'lucide-react'

/* ─── Design tokens du tracker — data-native, sobre, dense ────────────────────
   L'accent est réservé aux actions et à l'état actif. Feuille et argile ne
   servent qu'au P&L. Tout chiffre est en tabular-nums, aligné à droite. ────── */
export const T = {
  bg:      'var(--bg)',
  surface: 'var(--surface)',
  raised:  'var(--surface-2)',
  border:  'var(--border)',
  borderStrong: 'var(--border-strong)',
  cream:   'var(--text)',
  silver:  'var(--text-2)',
  dim:     'var(--text-3)',
  faint:   'var(--text-3)',
  violet:  'var(--brand)',
  green:   'var(--gain)',
  red:     'var(--error)',
  amber:   'var(--text-2)',
  gold:    'var(--text)',
  blue:    'var(--text-2)',
}

export const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }

export const eur = (v: number, opts?: { sign?: boolean; dec?: number }) => {
  const dec = opts?.dec ?? 2
  const s = Math.abs(v).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  const sign = v < 0 ? '−' : opts?.sign && v > 0 ? '+' : ''
  return `${sign}${s} €`
}

export const pnlColor = (v: number) => (v > 0 ? T.green : v < 0 ? T.red : T.silver)

/* ─── Shell : navigation persistante de l'app tracker ────────────────────────── */
const NAV = [
  { href: '/tracker/dashboard', label: 'Dashboard' },
  { href: '/tracker/sessions',  label: 'Sessions' },
  { href: '/tracker/bankroll',  label: 'Bankroll' },
  { href: '/tracker/stats',     label: 'Stats' },
]

export function TrackerShell({ children, actions, wide }: {
  children: React.ReactNode
  actions?: React.ReactNode
  wide?: boolean
}) {
  const pathname = usePathname()
  return (
    <div className="trk" style={{ minHeight: '100vh', background: T.bg, color: T.cream }}>
      <style>{`
        .trk-row:hover { background: var(--surface-2); }
        .trk-link { transition: color 0.15s ease; }
        .trk-link:hover, .trk-link:focus-visible { color: var(--text) !important; }
        .trk-scroll::-webkit-scrollbar { width: 4px; height: 4px }
        .trk-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px }
        .trk-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); margin-bottom: var(--space-6); }
        .trk-head h1 { font-size: var(--text-heading); font-weight: 600; letter-spacing: -.012em; margin: 0; }
        .trk-seg a { text-decoration: none; display: inline-flex; align-items: center; }
        .trk-actions { margin-left: auto; display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
        @media (max-width: 760px) {
          .trk-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .trk-hide-sm { display: none; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ maxWidth: wide ? 1240 : 1080, margin: '0 auto', padding: 'var(--space-6) clamp(16px, 2.5vw, 32px) var(--space-16)' }}>
        <div className="trk-head">
          <h1>Tracker</h1>
          <nav className="ui-seg trk-seg" aria-label="Sections du tracker">
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className="ui-seg-item" aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
            ))}
          </nav>
          <div className="trk-actions">
            {actions}
            {pathname !== '/tracker/import' && (
              <Link href="/tracker/import" className="ui-btn ui-btn-secondary ui-btn-sm">
                <Upload size={14} aria-hidden="true" /> Importer
              </Link>
            )}
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

/* ─── Primitives ─────────────────────────────────────────────────────────────── */

export function Card({ children, style, pad = true, className }: { children: React.ReactNode; style?: React.CSSProperties; pad?: boolean; className?: string }) {
  return (
    <div className={className} style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 'var(--radius-card)',
      padding: pad ? '18px 20px' : 0, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.11em', color: T.dim }}>{children}</span>
      {right}
    </div>
  )
}

/* KPI compact — valeur, libellé, détail. Pas de décor, la donnée d'abord. */
export function Kpi({ label, value, sub, color = T.cream }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string
}) {
  return (
    <div style={{ padding: '14px 18px', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.dim, marginBottom: 7, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, ...NUM, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.dim, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
    </div>
  )
}

/* Bandeau de KPIs séparés par des filets — la rangée signature des trackers pro */
export function KpiStrip({ items }: { items: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }[] }) {
  return (
    <Card pad={false} style={{ marginBottom: 14 }}>
      <div className="trk-kpis" style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((k, i) => (
          <div key={k.label} style={{ borderLeft: i > 0 ? `1px solid ${T.border}` : 'none' }}>
            <Kpi {...k} />
          </div>
        ))}
      </div>
    </Card>
  )
}

/* Contrôle segmenté (périodes, types…) */
export function Seg<K extends string>({ options, value, onChange }: {
  options: { key: K; label: string }[]; value: K; onChange: (k: K) => void
}) {
  return (
    <div className="ui-seg">
      {options.map(o => (
        <button key={o.key} type="button" className="ui-seg-item" aria-pressed={value === o.key} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  )
}

/* Badge de format de tournoi */
const FORMAT_STYLE: Record<string, { label: string; color: string }> = {
  classic:    { label: 'Classique',   color: 'var(--text-2)' },
  ko:         { label: 'KO',          color: T.cream },
  mystery_ko: { label: 'Mystery KO',  color: 'var(--brand)' },
  space_ko:   { label: 'Space KO',    color: T.blue },
  spin_rush:  { label: 'Spin & Rush', color: T.amber },
}
export function FormatBadge({ format }: { format: string }) {
  const f = FORMAT_STYLE[format] ?? { label: format, color: T.silver }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
      color: f.color, background: 'color-mix(in srgb, var(--overlay) 4%, transparent)', border: `1px solid ${T.border}`,
      whiteSpace: 'nowrap',
    }}>
      {f.label}
    </span>
  )
}

export function RoomDot({ room }: { room: string }) {
  const isW = room !== 'betclic'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: T.silver }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: isW ? T.violet : T.amber, flexShrink: 0 }} />
      {isW ? 'Winamax' : 'Betclic'}
    </span>
  )
}

/* En-tête + ligne de table données — colonnes numériques alignées à droite */
export function Th({ children, align = 'left', style }: { children?: React.ReactNode; align?: 'left' | 'right'; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.dim, textAlign: align, ...style }}>
      {children}
    </span>
  )
}
export function Td({ children, align = 'left', color = T.silver, strong, style }: {
  children: React.ReactNode; align?: 'left' | 'right'; color?: string; strong?: boolean; style?: React.CSSProperties
}) {
  return (
    <span style={{
      fontSize: 12.5, fontWeight: strong ? 700 : 400, color,
      textAlign: align, ...NUM,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      ...style,
    }}>
      {children}
    </span>
  )
}

/* État vide standard */
export function Empty({ title, sub, cta }: {
  icon?: React.ReactNode; title: string; sub: string; cta?: React.ReactNode
}) {
  return (
    <div style={{ padding: 'var(--space-8) var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
      <p style={{ fontSize: 'var(--text-heading)', fontWeight: 600, letterSpacing: '-.012em', color: T.cream, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 'var(--text-body-dense)', color: T.silver, margin: 0, maxWidth: 480, lineHeight: 1.55 }}>{sub}</p>
      {cta && <div style={{ marginTop: 12 }}>{cta}</div>}
    </div>
  )
}
