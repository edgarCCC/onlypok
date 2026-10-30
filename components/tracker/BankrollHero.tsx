'use client'
import Link from 'next/link'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { Card, T, NUM, eur, pnlColor } from '@/components/tracker/ui'
import BankrollChart from '@/components/tracker/BankrollChart'
import type { BankrollSummary } from '@/lib/tracker-bankroll'

/* Bloc d'accueil du dashboard : bankroll courante en grand + décomposition
   + courbe globale (toutes sources). Mêmes chiffres que /tracker/bankroll. */
export default function BankrollHero({ summary, initialBankroll, needsMigration }: {
  summary: BankrollSummary
  initialBankroll: number
  needsMigration: boolean
}) {
  const { points, current, mttProfit, cashProfit, netDeposits } = summary
  const gameProfit = mttProfit + cashProfit
  const chartColor = current - initialBankroll - netDeposits >= 0 ? T.green : T.red

  const lines: { label: string; value: string; color: string }[] = [
    { label: 'Bankroll de départ', value: eur(initialBankroll, { dec: 0 }), color: T.silver },
    { label: 'Tournois',           value: eur(mttProfit,   { sign: true, dec: 0 }), color: pnlColor(mttProfit) },
    { label: 'Sessions cash',      value: eur(cashProfit,  { sign: true, dec: 0 }), color: pnlColor(cashProfit) },
    { label: 'Dépôts − retraits',  value: eur(netDeposits, { sign: true, dec: 0 }), color: T.blue },
  ]

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'stretch' }}>
        {/* Chiffre principal */}
        <div style={{ flex: '0 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.dim, marginBottom: 10 }}>
            Bankroll actuelle
          </div>
          <div style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800, color: T.cream, lineHeight: 1, ...NUM, letterSpacing: '-0.03em' }}>
            {eur(current, { dec: 0 })}
          </div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 8, ...NUM }}>
            Résultat de jeu{' '}
            <span style={{ color: pnlColor(gameProfit), fontWeight: 700 }}>{eur(gameProfit, { sign: true, dec: 0 })}</span>
          </div>

          <dl style={{ margin: '20px 0 0', display: 'grid', gap: 7 }}>
            {lines.map(l => (
              <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                <dt style={{ color: T.silver }}>{l.label}</dt>
                <dd style={{ margin: 0, color: l.color, fontWeight: 700, ...NUM }}>{l.value}</dd>
              </div>
            ))}
          </dl>

          {needsMigration && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 0', fontSize: 11.5, color: T.amber }}>
              <AlertCircle size={12} /> Dépôts et bankroll de départ indisponibles (migration « Tracker v2 »).
            </p>
          )}

          <Link href="/tracker/bankroll" className="trk-link" style={{ marginTop: 'auto', paddingTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: T.silver, textDecoration: 'none' }}>
            Gérer la bankroll <ArrowRight size={12} />
          </Link>
        </div>

        {/* Courbe globale */}
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.11em', color: T.dim }}>Courbe globale</span>
            <span style={{ fontSize: 11, color: T.dim }}>tournois + cash + dépôts</span>
          </div>
          {points.length < 2 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim, fontSize: 12.5 }}>
              Pas encore assez de données pour tracer la courbe.
            </div>
          ) : (
            <BankrollChart points={points} color={chartColor} height={220} />
          )}
        </div>
      </div>
    </Card>
  )
}
