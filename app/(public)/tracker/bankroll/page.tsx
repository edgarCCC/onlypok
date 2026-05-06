'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, TrendingUp, TrendingDown, Coins } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'
const VIOLET = '#7c3aed'
const GREEN  = '#4ade80'
const RED    = '#ef4444'

type Session = { date: string; buy_in: number; cash_out: number; stakes: string }

function BankrollChart({ points, color }: { points: { label: string; value: number }[]; color: string }) {
  if (points.length < 2) return null
  const min = Math.min(...points.map(p => p.value))
  const max = Math.max(...points.map(p => p.value))
  const range = max - min || 1
  const W = 800; const H = 200; const PAD = 32

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const fill = `${path} L${x(points.length-1)},${H-PAD} L${x(0)},${H-PAD} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200, display: 'block' }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#bg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill={color} />
      ))}
      <text x={PAD} y={H - 4} fill={SILVER} fontSize="10">{points[0].label}</text>
      <text x={W - PAD} y={H - 4} fill={SILVER} fontSize="10" textAnchor="end">{points[points.length-1].label}</text>
      <text x={PAD} y={y(max) - 6} fill={color} fontSize="11" fontWeight="700">+{max >= 0 ? '' : ''}{max}€</text>
    </svg>
  )
}

export default function BankrollPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user,     setUser]     = useState<{ id: string } | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading,  setLoading]  = useState(true)
  const [startBr,  setStartBr]  = useState('1000')
  const [editing,  setEditing]  = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser({ id: user.id })
      const { data: rows } = await supabase.from('tracker_sessions').select('date,buy_in,cash_out,stakes').eq('user_id', user.id).order('date', { ascending: true })
      setSessions((rows as Session[]) ?? [])
      setLoading(false)
    }
    init()
  }, [supabase])

  const { points, totalProfit, bestSession, worstSession, streak } = useMemo(() => {
    const start = parseInt(startBr) || 0
    let running = start
    const pts: { label: string; value: number }[] = [{ label: 'Départ', value: start }]
    sessions.forEach(s => {
      running += s.cash_out - s.buy_in
      pts.push({ label: new Date(s.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }), value: running })
    })
    const profits = sessions.map(s => s.cash_out - s.buy_in)
    const best  = profits.length ? Math.max(...profits) : 0
    const worst = profits.length ? Math.min(...profits) : 0
    let maxStreak = 0, cur = 0
    profits.forEach(p => { if (p > 0) { cur++; maxStreak = Math.max(maxStreak, cur) } else cur = 0 })
    return { points: pts, totalProfit: running - start, bestSession: best, worstSession: worst, streak: maxStreak }
  }, [sessions, startBr])

  const chartColor = totalProfit >= 0 ? GREEN : RED

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Tracker
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>Suivi Bankroll</h1>
            <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>Courbe de progression sur {sessions.length} sessions</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editing ? (
              <>
                <input type="number" value={startBr} onChange={e => setStartBr(e.target.value)} style={{ width: 90, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '7px 10px', color: CREAM, fontSize: 13, outline: 'none' }} />
                <span style={{ fontSize: 12, color: SILVER }}>€</span>
                <button onClick={() => setEditing(false)} style={{ padding: '7px 12px', borderRadius: 7, border: 'none', background: VIOLET, color: '#fff', fontSize: 12, cursor: 'pointer' }}>OK</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: `1px solid ${BORDER}`, background: CARD, color: SILVER, fontSize: 12, cursor: 'pointer' }}>
                <Coins size={12} /> Bankroll initiale : {startBr}€
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Bankroll actuelle', value: `${(parseInt(startBr)||0) + totalProfit}€`, color: CREAM },
            { label: 'Profit total', value: `${totalProfit >= 0 ? '+' : ''}${totalProfit}€`, color: totalProfit >= 0 ? GREEN : RED },
            { label: 'Meilleure session', value: `+${bestSession}€`, color: GREEN },
            { label: 'Série gagnante', value: `${streak} sessions`, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: SILVER, fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '24px', marginBottom: 20 }}>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER }}>Chargement…</div>
          ) : !user ? (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <p style={{ color: SILVER, margin: 0 }}>Connecte-toi pour voir ta courbe</p>
              <Link href="/login" style={{ padding: '9px 20px', borderRadius: 8, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>
            </div>
          ) : sessions.length < 2 ? (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <TrendingUp size={32} style={{ opacity: 0.15 }} />
              <p style={{ color: SILVER, fontSize: 13, margin: 0 }}>Enregistre au moins 2 sessions pour voir la courbe</p>
              <Link href="/tracker/sessions" style={{ color: VIOLET, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>→ Journal de sessions</Link>
            </div>
          ) : (
            <BankrollChart points={points} color={chartColor} />
          )}
        </div>

        {/* Stakes recommandés */}
        {sessions.length > 0 && (
          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: SILVER, letterSpacing: '0.08em', marginBottom: 8 }}>RECOMMANDATION (20 BI minimum)</div>
            {[['2NL',400],['5NL',1000],['10NL',2000],['25NL',5000],['50NL',10000],['100NL',20000]].map(([stake, min]) => {
              const br = (parseInt(startBr)||0) + totalProfit
              const ok = br >= (min as number)
              return (
                <div key={stake} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? GREEN : 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 12, color: ok ? CREAM : SILVER, fontWeight: ok ? 600 : 400 }}>{stake}</span>
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
