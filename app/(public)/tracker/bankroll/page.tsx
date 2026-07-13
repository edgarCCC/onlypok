'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, Coins, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, AlertCircle, Check,
} from 'lucide-react'
import { TrackerShell, Card, KpiStrip, SectionLabel, Empty, T, NUM, eur, pnlColor } from '@/components/tracker/ui'

type Tournament  = { date: string; net_profit: number }
type CashSession = { date: string; buy_in: number; cash_out: number }
type Transaction = { id: string; date: string; type: 'deposit' | 'withdrawal'; amount: number; notes: string | null }

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
  borderRadius: 8, padding: '9px 12px', color: T.cream, fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

/* Courbe SVG — points journaliers agrégés */
function BankrollChart({ points, color }: { points: { label: string; value: number }[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null)
  if (points.length < 2) return null
  const min = Math.min(...points.map(p => p.value))
  const max = Math.max(...points.map(p => p.value))
  const range = max - min || 1
  const W = 800; const H = 240; const PAD = 36

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const fill = `${path} L${x(points.length - 1)},${H - PAD} L${x(0)},${H - PAD} Z`
  const zeroInRange = min < 0 && max > 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 240, display: 'block' }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        const px = ((e.clientX - rect.left) / rect.width) * W
        const i = Math.round(((px - PAD) / (W - PAD * 2)) * (points.length - 1))
        setHover(Math.max(0, Math.min(points.length - 1, i)))
      }}
    >
      <defs>
        <linearGradient id="bkg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {zeroInRange && (
        <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
      )}
      <path d={fill} fill="url(#bkg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={PAD / 2} y2={H - PAD} stroke="rgba(255,255,255,0.14)" />
          <circle cx={x(hover)} cy={y(points[hover].value)} r="4" fill={color} />
          <text
            x={Math.min(Math.max(x(hover), PAD + 44), W - PAD - 44)} y={PAD / 2 + 4}
            fill={T.cream} fontSize="12" fontWeight="700" textAnchor="middle"
          >
            {points[hover].label} · {Math.round(points[hover].value)} €
          </text>
        </g>
      )}
      <text x={PAD} y={H - 8} fill={T.dim} fontSize="10">{points[0].label}</text>
      <text x={W - PAD} y={H - 8} fill={T.dim} fontSize="10" textAnchor="end">{points[points.length - 1].label}</text>
    </svg>
  )
}

export default function BankrollPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user,           setUser]           = useState<{ id: string } | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)

  const [tournaments,  setTournaments]  = useState<Tournament[]>([])
  const [cashSessions, setCashSessions] = useState<CashSession[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [initialBr, setInitialBr] = useState(0)
  const [brDraft,   setBrDraft]   = useState('0')
  const [editingBr, setEditingBr] = useState(false)
  const [brSaved,   setBrSaved]   = useState(false)

  const [showTxForm, setShowTxForm] = useState(false)
  const [savingTx,   setSavingTx]   = useState(false)
  const [txForm, setTxForm] = useState({ type: 'deposit' as 'deposit' | 'withdrawal', date: new Date().toISOString().slice(0, 10), amount: '', notes: '' })

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser({ id: user.id })

      const [tRes, sRes, txRes, setRes] = await Promise.all([
        supabase.from('tournament_results').select('date, net_profit').eq('user_id', user.id).order('date'),
        supabase.from('tracker_sessions').select('date, buy_in, cash_out').eq('user_id', user.id).order('date'),
        supabase.from('tracker_transactions').select('id, date, type, amount, notes').eq('user_id', user.id).order('date'),
        supabase.from('tracker_settings').select('initial_bankroll').eq('user_id', user.id).maybeSingle(),
      ])

      setTournaments((tRes.data as Tournament[]) ?? [])
      setCashSessions((sRes.data as CashSession[]) ?? [])
      // Table absente → migration tracker-v2 pas encore lancée.
      // PostgREST renvoie PGRST205, le code SQL brut serait 42P01 — on couvre les deux.
      const missingTable = (e: { code?: string; message?: string } | null) =>
        !!e && (e.code === '42P01' || e.code === 'PGRST205' || (e.message ?? '').includes('Could not find the table'))
      if (missingTable(txRes.error) || missingTable(setRes.error)) {
        setNeedsMigration(true)
      } else {
        setTransactions((txRes.data as Transaction[]) ?? [])
        const br = Number(setRes.data?.initial_bankroll ?? 0)
        setInitialBr(br)
        setBrDraft(String(br))
      }
      setLoading(false)
    })()
  }, [supabase])

  const saveInitialBr = useCallback(async () => {
    if (!user) return
    const val = parseFloat(brDraft) || 0
    setInitialBr(val)
    setEditingBr(false)
    const { error } = await supabase.from('tracker_settings').upsert({
      user_id: user.id, initial_bankroll: val, updated_at: new Date().toISOString(),
    })
    if (error) {
      console.error('[bankroll] settings upsert failed:', error.message)
      return
    }
    setBrSaved(true)
    setTimeout(() => setBrSaved(false), 2000)
  }, [user, brDraft, supabase])

  const saveTx = useCallback(async () => {
    if (!user || !txForm.amount) return
    setSavingTx(true)
    const { data, error } = await supabase.from('tracker_transactions').insert({
      user_id: user.id, date: txForm.date, type: txForm.type,
      amount: parseFloat(txForm.amount), notes: txForm.notes || null,
    }).select().single()
    if (error) {
      console.error('[bankroll] transaction insert failed:', error.message)
    } else if (data) {
      setTransactions(prev => [...prev, data as Transaction].sort((a, b) => a.date.localeCompare(b.date)))
      setShowTxForm(false)
      setTxForm({ type: 'deposit', date: new Date().toISOString().slice(0, 10), amount: '', notes: '' })
    }
    setSavingTx(false)
  }, [user, txForm, supabase])

  const delTx = useCallback(async (id: string) => {
    const { error } = await supabase.from('tracker_transactions').delete().eq('id', id)
    if (!error) setTransactions(prev => prev.filter(t => t.id !== id))
  }, [supabase])

  /* ── Bankroll unifiée : MTT importés + cash + dépôts/retraits ── */
  const { points, current, mttProfit, cashProfit, netDeposits } = useMemo(() => {
    const deltasByDay = new Map<string, number>()
    const add = (date: string, delta: number) => {
      const d = date.slice(0, 10)
      deltasByDay.set(d, (deltasByDay.get(d) ?? 0) + delta)
    }
    let mtt = 0, cash = 0, dep = 0
    tournaments.forEach(t  => { const v = Number(t.net_profit) || 0; mtt += v;  add(t.date, v) })
    cashSessions.forEach(s => { const v = (s.cash_out - s.buy_in) || 0; cash += v; add(s.date, v) })
    transactions.forEach(t => {
      const v = t.type === 'deposit' ? Number(t.amount) : -Number(t.amount)
      dep += v
      add(t.date, v)
    })

    const days = [...deltasByDay.keys()].sort()
    let running = initialBr
    const pts: { label: string; value: number }[] = [{ label: 'Départ', value: initialBr }]
    for (const d of days) {
      running += deltasByDay.get(d)!
      pts.push({ label: new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }), value: running })
    }
    return { points: pts, current: running, mttProfit: mtt, cashProfit: cash, netDeposits: dep }
  }, [tournaments, cashSessions, transactions, initialBr])

  const chartColor = current - initialBr - netDeposits >= 0 ? T.green : T.red

  const ABI_LEVELS: [string, number][] = [['ABI 1 €', 100], ['ABI 2 €', 200], ['ABI 5 €', 500], ['ABI 10 €', 1000], ['ABI 20 €', 2000], ['ABI 50 €', 5000]]

  return (
    <TrackerShell actions={
      editingBr ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={brDraft} onChange={e => setBrDraft(e.target.value)} style={{ ...inp, width: 110 }} autoFocus />
          <button onClick={saveInitialBr} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: T.violet, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK</button>
        </div>
      ) : (
        <button onClick={() => setEditingBr(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.silver, fontSize: 12, cursor: 'pointer' }}>
          {brSaved ? <Check size={12} color={T.green} /> : <Coins size={12} />}
          Bankroll de départ : <span style={{ color: T.cream, fontWeight: 700, ...NUM }}>{Math.round(initialBr)} €</span>
        </button>
      )
    }>

      {needsMigration && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '11px 16px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 10, color: T.amber, fontSize: 12.5 }}>
          <AlertCircle size={14} />
          <span>Les tables dépôts/retraits n&apos;existent pas encore — lance la migration « Tracker v2 ». La courbe fonctionne déjà avec tes tournois.</span>
        </div>
      )}

      <KpiStrip items={[
        { label: 'Bankroll actuelle', value: eur(current, { dec: 0 }), color: T.cream },
        { label: 'Profit MTT',  value: eur(mttProfit,  { sign: true, dec: 0 }), color: pnlColor(mttProfit) },
        { label: 'Profit cash', value: eur(cashProfit, { sign: true, dec: 0 }), color: pnlColor(cashProfit) },
        { label: 'Dépôts nets', value: eur(netDeposits, { sign: true, dec: 0 }), color: T.blue },
      ]} />

      {/* Courbe */}
      <Card style={{ marginBottom: 14 }}>
        {loading ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.silver, fontSize: 13 }}>Chargement…</div>
        ) : !user ? (
          <Empty icon={<TrendingUp size={40} color={T.cream} />} title="Connecte-toi pour voir ta courbe"
            sub="Bankroll unifiée : tournois importés, sessions cash et dépôts/retraits."
            cta={<Link href="/login" style={{ padding: '10px 22px', borderRadius: 9, background: T.violet, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>} />
        ) : points.length < 2 ? (
          <Empty icon={<TrendingUp size={40} color={T.cream} />} title="Pas encore de courbe"
            sub="Importe tes tournois ou enregistre une session pour voir ta bankroll évoluer."
            cta={<Link href="/tracker/import" style={{ padding: '10px 22px', borderRadius: 9, background: T.violet, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Importer mes tournois</Link>} />
        ) : (
          <BankrollChart points={points} color={chartColor} />
        )}
      </Card>

      {/* Dépôts / retraits */}
      {user && !needsMigration && (
        <Card pad={false} style={{ marginBottom: 14 }}>
          <div style={{ padding: '16px 20px 0' }}>
            <SectionLabel right={
              <button onClick={() => setShowTxForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: T.violet, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={12} /> Ajouter
              </button>
            }>
              Dépôts &amp; retraits
            </SectionLabel>
          </div>

          {showTxForm && (
            <div style={{ margin: '0 20px 16px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Type</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['deposit', 'withdrawal'] as const).map(t => (
                      <button key={t} onClick={() => setTxForm(f => ({ ...f, type: t }))} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${txForm.type === t ? (t === 'deposit' ? T.blue : T.amber) : T.border}`,
                        background: txForm.type === t ? (t === 'deposit' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)') : 'transparent',
                        color: txForm.type === t ? (t === 'deposit' ? T.blue : T.amber) : T.silver,
                      }}>
                        {t === 'deposit' ? 'Dépôt' : 'Retrait'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Date</label>
                  <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Montant (€)</label>
                  <input type="number" min="0" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} placeholder="100" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Note</label>
                  <input value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} placeholder="Winamax, cashout…" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowTxForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.silver, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                <button onClick={saveTx} disabled={savingTx || !txForm.amount} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.violet, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: savingTx || !txForm.amount ? 0.6 : 1 }}>
                  {savingTx ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            <p style={{ fontSize: 12, color: T.dim, margin: 0, padding: '0 20px 18px' }}>Aucun dépôt ou retrait enregistré.</p>
          ) : (
            <div>
              {[...transactions].reverse().map((tx, i, arr) => (
                <div key={tx.id} className="trk-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderTop: `1px solid ${T.border}`, borderBottom: i === arr.length - 1 ? 'none' : undefined }}>
                  {tx.type === 'deposit'
                    ? <ArrowDownToLine size={13} color={T.blue} />
                    : <ArrowUpFromLine size={13} color={T.amber} />}
                  <span style={{ fontSize: 12, color: T.silver, minWidth: 84, ...NUM }}>{new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                  <span style={{ flex: 1, fontSize: 12, color: T.silver, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes ?? (tx.type === 'deposit' ? 'Dépôt' : 'Retrait')}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tx.type === 'deposit' ? T.blue : T.amber, ...NUM }}>
                    {tx.type === 'deposit' ? '+' : '−'}{Math.round(Number(tx.amount))} €
                  </span>
                  <button onClick={() => delTx(tx.id)} aria-label="Supprimer" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: T.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T.red }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.faint }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Gestion de bankroll MTT */}
      {user && tournaments.length > 0 && (
        <Card>
          <SectionLabel>Gestion MTT — 100 buy-ins recommandés</SectionLabel>
          <p style={{ fontSize: 12.5, color: T.silver, margin: '0 0 14px', lineHeight: 1.55 }}>
            Avec {Math.round(current)} € de bankroll, ton buy-in moyen ne devrait pas dépasser{' '}
            <strong style={{ color: T.cream, ...NUM }}>{Math.max(0, current / 100).toFixed(2)} €</strong> (variance MTT oblige).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {ABI_LEVELS.map(([label, min]) => {
              const ok = current >= min
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9, background: ok ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${ok ? 'rgba(34,197,94,0.18)' : T.border}` }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? T.green : 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: ok ? T.cream : T.silver, fontWeight: ok ? 700 : 400, ...NUM }}>{label}</span>
                  <span style={{ fontSize: 10.5, color: T.dim, marginLeft: 'auto', ...NUM }}>{min} €</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </TrackerShell>
  )
}
