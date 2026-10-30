'use client'
import Link from 'next/link'
import { Card, SectionLabel, FormatBadge, RoomDot, Th, Td, T, eur, pnlColor } from '@/components/tracker/ui'

/* Résultat unifié : tournoi importé ou session cash saisie à la main. */
export type RecentResult = {
  key: string
  date: string
  kind: 'tournament' | 'cash'
  label: string
  room?: string
  format?: string
  profit: number
}

const GRID = '64px 96px 1fr 96px'

export default function RecentResults({ results, hasTournaments }: { results: RecentResult[]; hasTournaments: boolean }) {
  return (
    <Card pad={false} style={{ marginBottom: 14 }}>
      <div style={{ padding: '16px 20px 0' }}>
        <SectionLabel right={<span style={{ fontSize: 11, color: T.dim }}>toutes sources</span>}>
          {results.length} derniers résultats
        </SectionLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '8px 20px', borderBottom: `1px solid ${T.border}` }}>
        <Th>Date</Th><Th>Source</Th><Th>Détail</Th><Th align="right">Profit</Th>
      </div>
      {results.map(r => (
        <div key={r.key} className="trk-row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '10px 20px', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
          <Td color={T.dim}>{new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</Td>
          <Td>
            {r.kind === 'cash' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: T.silver }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: T.blue, flexShrink: 0 }} />
                Cash
              </span>
            ) : <RoomDot room={r.room || 'winamax'} />}
          </Td>
          <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            {r.format && <span className="trk-hide-sm"><FormatBadge format={r.format} /></span>}
          </span>
          <Td align="right" strong color={pnlColor(r.profit)}>{eur(r.profit, { sign: true })}</Td>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 18, padding: '12px 20px' }}>
        <Link href="/tracker/sessions" className="trk-link" style={{ fontSize: 12, fontWeight: 600, color: T.silver, textDecoration: 'none' }}>Journal cash →</Link>
        {hasTournaments && <a href="#historique" className="trk-link" style={{ fontSize: 12, fontWeight: 600, color: T.silver, textDecoration: 'none' }}>Historique des tournois ↓</a>}
      </div>
    </Card>
  )
}
