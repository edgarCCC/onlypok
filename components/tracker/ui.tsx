'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Upload } from 'lucide-react'

/* ─── Design tokens du tracker — data-native, sobre, dense ────────────────────
   L'accent violet est réservé aux actions et à l'état actif. Le vert/rouge ne
   servent qu'au P&L. Tout chiffre est en tabular-nums, aligné à droite. ────── */
export const T = {
  bg:      '#07090e',
  surface: 'rgba(255,255,255,0.024)',
  raised:  'rgba(255,255,255,0.04)',
  border:  'rgba(240,244,255,0.07)',
  borderStrong: 'rgba(240,244,255,0.14)',
  cream:   '#f0f4ff',
  silver:  'rgba(240,244,255,0.52)',
  dim:     'rgba(240,244,255,0.26)',
  faint:   'rgba(240,244,255,0.14)',
  violet:  '#7c3aed',
  green:   '#22c55e',
  red:     '#f87171',
  amber:   '#f59e0b',
  gold:    '#fbbf24',
  blue:    '#3b82f6',
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
    <div style={{ minHeight: '100vh', background: T.bg, color: T.cream }}>
      <style>{`
        .trk-nav a { transition: color 0.15s ease, background 0.15s ease; }
        .trk-row:hover { background: rgba(255,255,255,0.022); }
        .trk-scroll::-webkit-scrollbar { width: 4px; height: 4px }
        .trk-scroll::-webkit-scrollbar-thumb { background: rgba(240,244,255,0.12); border-radius: 99px }
        @media (max-width: 760px) {
          .trk-head { flex-wrap: wrap; }
          .trk-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ maxWidth: wide ? 1240 : 1080, margin: '0 auto', padding: '92px 24px 96px' }}>
        {/* Barre d'app : identité + navigation + actions */}
        <div className="trk-head" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
          <Link href="/tracker/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: T.cream, letterSpacing: '-0.3px' }}>Tracker</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.violet, letterSpacing: '0.14em', textTransform: 'uppercase' }}>OnlyPok</span>
          </Link>

          <nav className="trk-nav" style={{ display: 'flex', gap: 2, padding: 3, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
            {NAV.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  padding: '7px 15px', borderRadius: 8, textDecoration: 'none',
                  fontSize: 12.5, fontWeight: active ? 700 : 500,
                  color: active ? T.cream : T.silver,
                  background: active ? 'rgba(124,58,237,0.22)' : 'transparent',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(124,58,237,0.35)' : 'none',
                }}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {actions}
            <Link href="/tracker/import" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 9,
              background: T.violet, color: '#fff',
              textDecoration: 'none', fontSize: 12.5, fontWeight: 700,
            }}>
              <Upload size={13} /> Importer
            </Link>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

/* ─── Primitives ─────────────────────────────────────────────────────────────── */

export function Card({ children, style, pad = true }: { children: React.ReactNode; style?: React.CSSProperties; pad?: boolean }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
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
    <div style={{ display: 'flex', gap: 2, padding: 3, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9 }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: value === o.key ? 700 : 500,
          background: value === o.key ? 'rgba(124,58,237,0.22)' : 'transparent',
          boxShadow: value === o.key ? 'inset 0 0 0 1px rgba(124,58,237,0.35)' : 'none',
          color: value === o.key ? T.cream : T.silver,
          transition: 'color 0.15s ease',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* Badge de format de tournoi */
const FORMAT_STYLE: Record<string, { label: string; color: string }> = {
  classic:    { label: 'Classique',   color: 'rgba(240,244,255,0.55)' },
  ko:         { label: 'KO',          color: T.red },
  mystery_ko: { label: 'Mystery KO',  color: '#c084fc' },
  space_ko:   { label: 'Space KO',    color: T.blue },
  spin_rush:  { label: 'Spin & Rush', color: T.amber },
}
export function FormatBadge({ format }: { format: string }) {
  const f = FORMAT_STYLE[format] ?? { label: format, color: T.silver }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
      color: f.color, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
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
export function Empty({ icon, title, sub, cta }: {
  icon: React.ReactNode; title: string; sub: string; cta?: React.ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ opacity: 0.2, marginBottom: 4 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: T.cream, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 12.5, color: T.silver, margin: 0, maxWidth: 380, lineHeight: 1.6 }}>{sub}</p>
      {cta && <div style={{ marginTop: 12 }}>{cta}</div>}
    </div>
  )
}
