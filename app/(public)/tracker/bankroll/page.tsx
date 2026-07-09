'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, TrendingUp, Coins, Plus, Trash2, Trophy,
  Landmark, ArrowDownToLine, ArrowUpFromLine, AlertCircle, Check,
} from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.22)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const GREEN  = '#4ade80'
const RED    = '#ef4444'
const AMBER  = '#f59e0b'

type Tournament  = { date: string; net_profit: number }
type CashSession = { date: string; buy_in: number; cash_out: number }
type Transaction = { id: string; date: string; type: 'deposit' | 'withdrawal'; amount: number; notes: string | null }

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: '9px 12px', color: CREAM, fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

/* Courbe SVG — points journaliers agrégés */
function BankrollChart({ points, color }: { points: { label: string; value: number }[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null)
  if (points.length < 2) return null
  const min = Math.min(...points.map(p => p.value))
  const max = Math.max(...points.map(p => p.value))
  const range = max - min || 1
  const W = 800; const H = 220; const PAD = 36

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const fill = `${path} L${x(points.length - 1)},${H - PAD} L${x(0)},${H - PAD} Z`
  const zeroInRange = min < 0 && max > 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220, display: 'block' }}
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
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {zeroInRange && (
        <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
      )}
      <path d={fill} fill="url(#bkg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={PAD / 2} y2={H - PAD} stroke="rgba(255,255,255,0.15)" />
          <circle cx={x(hover)} cy={y(points[hover].value)} r="4" fill={color} />
          <text
            x={Math.min(Math.max(x(hover), PAD + 40), W - PAD - 40)} y={PAD / 2 + 4}
            fill={CREAM} fontSize="12" fontWeight="700" textAnchor="middle"
          >
            {points[hover].label} · {Math.round(points[hover].value)}€
          </text>
        </g>
      )}
      <text x={PAD} y={H - 8} fill={SILVER} fontSize="10">{points[0].label}</text>
      <text x={W - PAD} y={H - 8} fill={SILVER} fontSize="10" textAnchor="end">{points[points.length - 1].label}</text>
    </svg>
  )
}

export default function BankrollPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user,         setUser]         = useState<{ id: string } | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)

  const [tournaments,  setTournaments]  = useState<Tournament[]>([])
  const [cashSessions, setCashSessions] = useState<CashSession[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [initialBr,    setInitialBr]    = useState(0)
  const [brDraft,      setBrDraft]      = useState('0')
  const [editingBr,    setEditingBr]    = useState(false)
  const [brSaved,      setBrSaved]      = useState(false)

  const [showTxForm,   setShowTxForm]   = useState(false)
  const [savingTx,     setSavingTx]     = useState(false)
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
      // 42P01 = table absente → la migration tracker-v2 n'a pas été lancée
      if (txRes.error?.code === '42P01' || setRes.error?.code === '42P01') {
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

  const chartColor = current - initialBr - netDeposits >= 0 ? GREEN : RED
  const fmtEur = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)}€`

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <style>{`
        @media (max-width: 700px) {
          .bkr-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .bkr-txform { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 840, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Tracker
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px', fontFamily: 'var(--font-syne,sans-serif)' }}>Bankroll</h1>
            <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>
              Tournois importés + sessions cash + dépôts/retraits, unifiés.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingBr ? (
              <>
                <input type="number" value={brDraft} onChange={e => setBrDraft(e.target.value)}
                  style={{ ...inp, width: 100 }} autoFocus />
                <button onClick={saveInitialBr} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: VIOLET, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK</button>
              </>
            ) : (
              <button onClick={() => setEditingBr(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: `1px solid ${BORDER}`, background: CARD, color: SILVER, fontSize: 12, cursor: 'pointer' }}>
                {brSaved ? <Check size={12} color={GREEN} /> : <Coins size={12} />}
                Bankroll de départ : {Math.round(initialBr)}€
              </button>
            )}
          </div>
        </div>

        {needsMigration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, color: AMBER, fontSize: 13 }}>
            <AlertCircle size={15} />
            <span>Les tables dépôts/retraits n&apos;existent pas encore — lance la migration « Tracker v2 » depuis le panneau admin. La courbe fonctionne déjà avec tes tournois.</span>
          </div>
        )}

        {/* KPIs */}
        <div className="bkr-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Bankroll actuelle', value: `${Math.round(current)}€`, color: CREAM, icon: Landmark },
            { label: 'Profit MTT', value: fmtEur(mttProfit), color: mttProfit >= 0 ? GREEN : RED, icon: Trophy },
            { label: 'Profit cash', value: fmtEur(cashProfit), color: cashProfit >= 0 ? GREEN : RED, icon: TrendingUp },
            { label: 'Dépôts nets', value: fmtEur(netDeposits), color: CYAN, icon: ArrowDownToLine },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Icon size={12} color={color === CREAM ? SILVER : color} />
                <span style={{ fontSize: 10, color: SILVER, fontWeight: 600, letterSpacing: '0.05em' }}>{label.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '24px', marginBottom: 24 }}>
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER }}>Chargement…</div>
          ) : !user ? (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <p style={{ color: SILVER, margin: 0 }}>Connecte-toi pour voir ta courbe</p>
              <Link href="/login" style={{ padding: '9px 20px', borderRadius: 8, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>
            </div>
          ) : points.length < 2 ? (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <TrendingUp size={32} style={{ opacity: 0.15 }} />
              <p style={{ color: SILVER, fontSize: 13, margin: 0 }}>Importe tes tournois ou enregistre une session pour voir ta courbe</p>
              <Link href="/tracker/import" style={{ color: VIOLET, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>→ Importer mes tournois</Link>
            </div>
          ) : (
            <BankrollChart points={points} color={chartColor} />
          )}
        </div>

        {/* Dépôts / retraits */}
        {user && !needsMigration && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Dépôts & retraits</h2>
              <button onClick={() => setShowTxForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: VIOLET, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={13} /> Ajouter
              </button>
            </div>

            {showTxForm && (
              <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div className="bkr-txform" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Type</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['deposit', 'withdrawal'] as const).map(t => (
                        <button key={t} onClick={() => setTxForm(f => ({ ...f, type: t }))} style={{
                          flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${txForm.type === t ? (t === 'deposit' ? CYAN : AMBER) : BORDER}`,
                          background: txForm.type === t ? (t === 'deposit' ? 'rgba(6,182,212,0.12)' : 'rgba(245,158,11,0.12)') : 'transparent',
                          color: txForm.type === t ? (t === 'deposit' ? CYAN : AMBER) : SILVER,
                        }}>
                          {t === 'deposit' ? 'Dépôt' : 'Retrait'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Date</label>
                    <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Montant (€)</label>
                    <input type="number" min="0" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} placeholder="100" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Note</label>
                    <input value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} placeholder="Winamax, cashout…" style={inp} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowTxForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={saveTx} disabled={savingTx || !txForm.amount} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: VIOLET, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: savingTx || !txForm.amount ? 0.6 : 1 }}>
                    {savingTx ? '…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )}

            {transactions.length === 0 ? (
              <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Aucun dépôt ou retrait enregistré.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...transactions].reverse().map(tx => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px' }}>
                    {tx.type === 'deposit'
                      ? <ArrowDownToLine size={13} color={CYAN} />
                      : <ArrowUpFromLine size={13} color={AMBER} />}
                    <span style={{ fontSize: 12, color: SILVER, minWidth: 76 }}>{new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                    <span style={{ flex: 1, fontSize: 12, color: SILVER, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes ?? (tx.type === 'deposit' ? 'Dépôt' : 'Retrait')}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: tx.type === 'deposit' ? CYAN : AMBER }}>
                      {tx.type === 'deposit' ? '+' : '−'}{Math.round(Number(tx.amount))}€
                    </span>
                    <button onClick={() => delTx(tx.id)} aria-label="Supprimer" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'rgba(240,244,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = RED }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,244,255,0.15)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gestion de bankroll MTT (100 buy-ins) */}
        {user && tournaments.length > 0 && (
          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: SILVER, letterSpacing: '0.08em', marginBottom: 8 }}>GESTION MTT — 100 BUY-INS RECOMMANDÉS</div>
            <p style={{ fontSize: 12, color: SILVER, margin: '0 0 10px', lineHeight: 1.5 }}>
              Avec {Math.round(current)}€ de bankroll, ton buy-in moyen ne devrait pas dépasser <strong style={{ color: CREAM }}>{Math.max(0, Math.round(current / 100 * 100) / 100).toFixed(2)}€</strong> (variance MTT oblige).
            </p>
            {[['ABI 1€', 100], ['ABI 2€', 200], ['ABI 5€', 500], ['ABI 10€', 1000], ['ABI 20€', 2000], ['ABI 50€', 5000]].map(([label, min]) => {
              const ok = current >= (min as number)
              return (
                <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? GREEN : 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 12, color: ok ? CREAM : SILVER, fontWeight: ok ? 600 : 400 }}>{label}</span>
                  <span style={{ fontSize: 11, color: SILVER }}>— {min}€ minimum</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
