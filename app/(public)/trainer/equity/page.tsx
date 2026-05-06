'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { ArrowLeft, RotateCcw, Play, Shuffle, Brain, Calculator, ChevronRight, Zap } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'
const VIOLET = '#7c3aed'
const GREEN  = '#4ade80'
const ORANGE = '#f59e0b'
const RED    = '#ef4444'

type Card = { rank: number; suit: number }

const RANK_CHARS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
const SUIT_CHARS = ['s','h','d','c']
const SUIT_SYMS  = ['♠','♥','♦','♣']
const SUIT_COLS  = ['#94a3b8','#f87171','#60a5fa','#94a3b8']
const HAND_COLS  = ['#a78bfa','#06b6d4','#4ade80']

const fmtK = (n: number) => n >= 1000 ? `${n / 1000}k` : `${n}`
const rc   = (rank: number) => RANK_CHARS[rank - 2]
const cid  = (c: Card) => `${rc(c.rank)}${SUIT_CHARS[c.suit]}`

/* ─── Evaluator ─── */
function evaluate5(cards: Card[]): number {
  const r = cards.map(c => c.rank).sort((a, b) => b - a)
  const s = cards.map(c => c.suit)
  const isFlush = s.every(x => x === s[0])
  let straightTop = 0
  if (r[0] - r[4] === 4 && new Set(r).size === 5) straightTop = r[0]
  else if (r[0] === 14 && r[1] === 5 && r[2] === 4 && r[3] === 3 && r[4] === 2) straightTop = 5
  const cnt = new Map<number, number>()
  r.forEach(x => cnt.set(x, (cnt.get(x) || 0) + 1))
  const g = [...cnt.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const B = (cat: number, ...rs: number[]) => rs.reduce((v, x, i) => v + x * 15 ** (4 - i), cat * 15 ** 5)
  if (isFlush && straightTop) return B(8, straightTop)
  if (g[0][1] === 4) return B(7, g[0][0], g[1][0])
  if (g[0][1] === 3 && g[1]?.[1] === 2) return B(6, g[0][0], g[1][0])
  if (isFlush) return B(5, r[0], r[1], r[2], r[3], r[4])
  if (straightTop) return B(4, straightTop)
  if (g[0][1] === 3) { const k = g.filter(x => x[1] === 1).map(x => x[0]); return B(3, g[0][0], k[0], k[1]) }
  if (g[0][1] === 2 && g[1]?.[1] === 2) {
    const [hi, lo] = [Math.max(g[0][0], g[1][0]), Math.min(g[0][0], g[1][0])]
    return B(2, hi, lo, g.find(x => x[1] === 1)![0])
  }
  if (g[0][1] === 2) { const k = g.filter(x => x[1] === 1).map(x => x[0]); return B(1, g[0][0], k[0], k[1], k[2]) }
  return B(0, r[0], r[1], r[2], r[3], r[4])
}

function bestHand(cards: Card[]): number {
  if (cards.length <= 5) return evaluate5(cards)
  let best = 0
  for (let i = 0; i < cards.length - 4; i++)
    for (let j = i + 1; j < cards.length - 3; j++)
      for (let k = j + 1; k < cards.length - 2; k++)
        for (let l = k + 1; l < cards.length - 1; l++)
          for (let m = l + 1; m < cards.length; m++) {
            const v = evaluate5([cards[i], cards[j], cards[k], cards[l], cards[m]])
            if (v > best) best = v
          }
  return best
}

/* ─── Monte Carlo ─── */
function calcEquity(hands: (Card | null)[][], board: (Card | null)[], iterations = 25000): number[] {
  const vh = hands.map(h => h.filter(Boolean) as Card[])
  const vb = board.filter(Boolean) as Card[]
  const used = new Set([...vh.flat(), ...vb].map(cid))
  const deck: Card[] = []
  for (let rank = 2; rank <= 14; rank++)
    for (let suit = 0; suit < 4; suit++)
      if (!used.has(cid({ rank, suit }))) deck.push({ rank, suit })
  const need = 5 - vb.length
  const wins = new Array(vh.length).fill(0)
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]]
    }
    const run = [...vb, ...deck.slice(0, need)]
    const scores = vh.map(h => h.length === 2 ? bestHand([...h, ...run]) : 0)
    const mx = Math.max(...scores)
    const nw = scores.filter(s => s === mx).length
    scores.forEach((s, i) => { if (s === mx) wins[i] += 1 / nw })
  }
  return wins.map(w => (w / iterations) * 100)
}

/* ─── Random deck ─── */
function shuffledDeck(): Card[] {
  const deck: Card[] = []
  for (let rank = 2; rank <= 14; rank++)
    for (let suit = 0; suit < 4; suit++)
      deck.push({ rank, suit })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/* ─── Quiz grade ─── */
type Grade = { label: string; pts: number; color: string }
function grade(delta: number): Grade {
  if (delta <= 3)  return { label: 'Parfait', pts: 3, color: GREEN  }
  if (delta <= 7)  return { label: 'Bon',     pts: 2, color: GREEN  }
  if (delta <= 15) return { label: 'Proche',  pts: 1, color: ORANGE }
  return               { label: 'Raté',    pts: 0, color: RED    }
}

/* ─── Card chip ─── */
function CardChip({ card, active, readonly, onClick }: { card: Card | null; active: boolean; readonly?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={readonly} style={{
      width: 44, height: 60, borderRadius: 8,
      border: `2px solid ${active ? VIOLET : card ? 'rgba(255,255,255,0.18)' : BORDER}`,
      background: card ? (card.suit === 1 || card.suit === 2 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.07)') : CARD,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      cursor: readonly ? 'default' : 'pointer', gap: 1,
      boxShadow: active ? '0 0 0 3px rgba(124,58,237,0.25)' : 'none',
      transition: 'all 0.15s', flexShrink: 0,
    }}>
      {card ? (
        <>
          <span style={{ color: SUIT_COLS[card.suit], fontSize: 13, fontWeight: 800, lineHeight: 1 }}>{rc(card.rank)}</span>
          <span style={{ color: SUIT_COLS[card.suit], fontSize: 18, lineHeight: 1 }}>{SUIT_SYMS[card.suit]}</span>
        </>
      ) : (
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 18 }}>+</span>
      )}
    </button>
  )
}

/* ─── Equity stepper ─── */
function EquityStepper({ hi, value, color, onAdjust, auto }: {
  hi: number; value: number; color: string; onAdjust: (delta: number) => void; auto: boolean
}) {
  const steps: [number, string][] = [[-10,'-10'],[-5,'-5'],[-1,'-1'],[1,'+1'],[5,'+5'],[10,'+10']]
  return (
    <div style={{ flex: 1, minWidth: 160, background: 'rgba(232,228,220,0.04)', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.1em' }}>MAIN {hi + 1}</span>
        {auto && (
          <span style={{ fontSize: 9, color: SILVER, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.05em' }}>AUTO</span>
        )}
      </div>

      {/* Big number */}
      <div style={{ textAlign: 'center', lineHeight: 1, padding: '4px 0' }}>
        <span style={{ fontSize: 52, fontWeight: 900, color, letterSpacing: '-2px' }}>{value.toFixed(1)}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color, opacity: 0.55 }}>%</span>
      </div>

      {/* Stepper buttons — hidden when auto */}
      {!auto ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
          {steps.map(([delta, label]) => (
            <button key={delta} onClick={() => onAdjust(delta as number)} style={{
              padding: '8px 0', borderRadius: 7, border: `1px solid ${BORDER}`,
              background: (delta as number) > 0 ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
              color: (delta as number) > 0 ? '#a78bfa' : 'rgba(240,244,255,0.4)',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'background 0.1s, color 0.1s',
            }}
              onMouseEnter={e => {
                const btn = e.currentTarget as HTMLButtonElement
                btn.style.background = (delta as number) > 0 ? 'rgba(124,58,237,0.24)' : 'rgba(255,255,255,0.09)'
                btn.style.color = (delta as number) > 0 ? '#c4b5fd' : CREAM
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget as HTMLButtonElement
                btn.style.background = (delta as number) > 0 ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)'
                btn.style.color = (delta as number) > 0 ? '#a78bfa' : 'rgba(240,244,255,0.4)'
              }}
            >{label}</button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 11, color: SILVER, padding: '6px 0' }}>= 100% − Main 1</div>
      )}

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: color, borderRadius: 99, transition: 'width 0.12s ease-out' }} />
      </div>
    </div>
  )
}

type SlotRef = { type: 'hand'; hi: number; ci: number } | { type: 'board'; bi: number }
type QuizType = 'preflop' | 'flop' | 'turn' | 'river'
const QUIZ_BOARD: Record<QuizType, number>  = { preflop: 0, flop: 3, turn: 4, river: 5 }
const QUIZ_LABEL: Record<QuizType, string>  = { preflop: 'Préflop', flop: 'Flop', turn: 'Turn', river: 'River' }

const initGuesses = (n: number) => n === 2 ? [50, 50] : n === 3 ? [34, 33, 33] : [50, 50]

export default function EquityPage() {
  /* Shared */
  const [numHands, setNumHands] = useState(2)
  const [mode,     setMode]     = useState<'calc' | 'quiz'>('calc')

  /* Calculator */
  const [hands,    setHands]    = useState<(Card | null)[][]>([[null,null],[null,null],[null,null]])
  const [board,    setBoard]    = useState<(Card | null)[]>([null,null,null,null,null])
  const [active,   setActive]   = useState<SlotRef | null>(null)
  const [equities, setEquities] = useState<number[] | null>(null)
  const [running,  setRunning]  = useState(false)
  const [iters,    setIters]    = useState(25000)

  /* Quiz */
  const [quizType,    setQuizType]    = useState<QuizType>('preflop')
  const [quizHands,   setQuizHands]   = useState<Card[][]>([])
  const [quizBoard,   setQuizBoard]   = useState<Card[]>([])
  const [quizPhase,   setQuizPhase]   = useState<'guessing' | 'revealed'>('guessing')
  const [guesses,     setGuesses]     = useState<number[]>([50, 50])
  const [quizResults, setQuizResults] = useState<number[] | null>(null)
  const [quizRunning, setQuizRunning] = useState(false)
  const [score,       setScore]       = useState({ pts: 0, rounds: 0 })
  const [streak,      setStreak]      = useState(0)

  /* ── Calc helpers ── */
  const usedCards = new Set([
    ...hands.flat().filter(Boolean).map(c => cid(c!)),
    ...board.filter(Boolean).map(c => cid(c!)),
  ])

  const slotEq = (a: SlotRef, b: SlotRef) => {
    if (a.type === 'hand' && b.type === 'hand') return a.hi === b.hi && a.ci === b.ci
    if (a.type === 'board' && b.type === 'board') return a.bi === b.bi
    return false
  }

  const nextSlot = useCallback((cur: SlotRef, n: number): SlotRef | null => {
    if (cur.type === 'hand') {
      if (cur.ci === 0) return { type: 'hand', hi: cur.hi, ci: 1 }
      if (cur.hi + 1 < n) return { type: 'hand', hi: cur.hi + 1, ci: 0 }
      return { type: 'board', bi: 0 }
    }
    if (cur.bi < 4) return { type: 'board', bi: cur.bi + 1 }
    return null
  }, [])

  const pickCard = (card: Card) => {
    if (!active || usedCards.has(cid(card))) return
    if (active.type === 'hand')
      setHands(prev => { const n = prev.map(h => [...h]); n[active.hi][active.ci] = card; return n })
    else
      setBoard(prev => { const n = [...prev]; n[active.bi] = card; return n })
    setActive(nextSlot(active, numHands))
    setEquities(null)
  }

  const clearSlot = (slot: SlotRef) => {
    if (slot.type === 'hand') setHands(prev => { const n = prev.map(h => [...h]); n[slot.hi][slot.ci] = null; return n })
    else setBoard(prev => { const n = [...prev]; n[slot.bi] = null; return n })
    setActive(slot); setEquities(null)
  }

  const calculate = () => {
    if (hands.slice(0, numHands).some(h => h.some(c => !c))) return
    setRunning(true); setEquities(null)
    setTimeout(() => { setEquities(calcEquity(hands.slice(0, numHands), board, iters)); setRunning(false) }, 10)
  }

  const canCalculate = hands.slice(0, numHands).every(h => h.every(c => c !== null))

  /* ── Quiz helpers ── */
  const dealQuiz = useCallback((type: QuizType, n: number) => {
    const deck = shuffledDeck()
    setQuizHands(Array.from({ length: n }, (_, i) => [deck[i * 2], deck[i * 2 + 1]]))
    const bs = QUIZ_BOARD[type]
    setQuizBoard(bs > 0 ? deck.slice(n * 2, n * 2 + bs) : [])
    setGuesses(initGuesses(n))
    setQuizPhase('guessing')
    setQuizResults(null)
  }, [])

  const enterQuiz = () => { setMode('quiz'); dealQuiz(quizType, numHands) }

  const adjustGuess = (hi: number, delta: number) => {
    setGuesses(prev => {
      const next = [...prev]
      next[hi] = parseFloat(Math.max(0, Math.min(100, prev[hi] + delta)).toFixed(1))
      if (numHands === 2) next[1 - hi] = parseFloat((100 - next[hi]).toFixed(1))
      return next
    })
  }

  const verifyQuiz = () => {
    setQuizRunning(true)
    setTimeout(() => {
      const results = calcEquity(quizHands, quizBoard, 50000)
      setQuizResults(results)
      setQuizPhase('revealed')
      setQuizRunning(false)
      const worstDelta = Math.max(...guesses.map((g, i) => Math.abs(g - results[i])))
      const g = grade(worstDelta)
      setScore(s => ({ pts: s.pts + g.pts, rounds: s.rounds + 1 }))
      setStreak(s => g.pts > 0 ? s + 1 : 0)
    }, 10)
  }

  const HAND_NAMES = ['Main 1', 'Main 2', 'Main 3']

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/trainer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Trainer
        </Link>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>Équité</h1>
            <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>
              {mode === 'calc' ? `Calculateur Monte Carlo · ${fmtK(iters)} itérations` : 'Mode entraînement — estime l\'équité sans aide'}
            </p>
          </div>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4 }}>
            <button onClick={() => setMode('calc')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: mode === 'calc' ? VIOLET : 'transparent', color: mode === 'calc' ? '#fff' : SILVER, transition: 'all 0.15s' }}>
              <Calculator size={12} /> Calculateur
            </button>
            <button onClick={enterQuiz} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: mode === 'quiz' ? VIOLET : 'transparent', color: mode === 'quiz' ? '#fff' : SILVER, transition: 'all 0.15s' }}>
              <Brain size={12} /> Quiz
              {mode === 'quiz' && score.rounds > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '1px 7px', fontSize: 10 }}>{score.pts}pts</span>
              )}
            </button>
          </div>
        </div>

        {/* ══════════════════ CALCULATOR ══════════════════ */}
        {mode === 'calc' && (<>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[2, 3].map(n => (
                <button key={n} onClick={() => { setNumHands(n); setEquities(null) }} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: numHands === n ? VIOLET : 'rgba(255,255,255,0.06)', color: numHands === n ? '#fff' : SILVER, transition: 'all 0.15s' }}>
                  {n} mains
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { const d = shuffledDeck(); setHands(Array.from({length:3},(_,i)=>[d[i*2],d[i*2+1]])); setBoard([null,null,null,null,null]); setActive(null); setEquities(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, color: SILVER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Shuffle size={12} /> Aléatoire
              </button>
              <button onClick={() => { setHands([[null,null],[null,null],[null,null]]); setBoard([null,null,null,null,null]); setActive(null); setEquities(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, color: SILVER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

          {/* Hands + Board */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-start' }}>
              {Array.from({ length: numHands }, (_, hi) => (
                <div key={hi} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: HAND_COLS[hi], letterSpacing: '0.08em', marginBottom: 8 }}>{HAND_NAMES[hi]}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1].map(ci => {
                      const slot: SlotRef = { type: 'hand', hi, ci }
                      const isActive = !!(active && active.type === 'hand' && slotEq(active, slot))
                      return <CardChip key={ci} card={hands[hi][ci]} active={isActive} onClick={() => hands[hi][ci] ? clearSlot(slot) : setActive(slot)} />
                    })}
                  </div>
                  {equities && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: HAND_COLS[hi], letterSpacing: '-0.5px' }}>{equities[hi].toFixed(1)}%</div>
                      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginTop: 4 }}>
                        <div style={{ height: '100%', width: `${equities[hi]}%`, background: HAND_COLS[hi], borderRadius: 99, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.08em', marginBottom: 8 }}>BOARD (optionnel)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[0,1,2,3,4].map(bi => {
                  const slot: SlotRef = { type: 'board', bi }
                  const isActive = !!(active && active.type === 'board' && slotEq(active, slot))
                  return (
                    <div key={bi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <CardChip card={board[bi]} active={isActive} onClick={() => board[bi] ? clearSlot(slot) : setActive(slot)} />
                      <span style={{ fontSize: 9, color: 'rgba(240,244,255,0.2)', fontWeight: 600 }}>{['Flop 1','Flop 2','Flop 3','Turn','River'][bi]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div style={{ background: CARD, border: `1px solid ${active ? 'rgba(124,58,237,0.3)' : BORDER}`, borderRadius: 18, padding: '20px', marginBottom: 16, transition: 'border-color 0.2s' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#a78bfa' : SILVER, letterSpacing: '0.08em', marginBottom: 14 }}>
              {active
                ? active.type === 'hand' ? `Choisir carte ${active.ci + 1} de la Main ${active.hi + 1}` : `Choisir ${['Flop 1','Flop 2','Flop 3','Turn','River'][active.bi]}`
                : 'Clique sur un emplacement pour sélectionner une carte'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, minmax(0,1fr))', gap: 4 }}>
              {[3,1,2,0].map(suit =>
                RANK_CHARS.slice().reverse().map((_, ri) => {
                  const rank = 14 - ri
                  const card: Card = { rank, suit }
                  const id = cid(card)
                  const used = usedCards.has(id)
                  return (
                    <button key={id} onClick={() => !used && pickCard(card)} style={{
                      aspectRatio: '1', borderRadius: 5, border: 'none', fontSize: 'clamp(8px,1.1vw,12px)', fontWeight: 800,
                      background: used ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.07)',
                      color: used ? 'rgba(255,255,255,0.1)' : SUIT_COLS[suit],
                      cursor: used || !active ? 'default' : 'pointer', transition: 'all 0.1s', lineHeight: 1, padding: 0, opacity: !active && !used ? 0.7 : 1,
                    }}
                      onMouseEnter={e => { if (!used && active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.25)' }}
                      onMouseLeave={e => { if (!used) (e.currentTarget as HTMLButtonElement).style.background = used ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.07)' }}
                    >{rc(rank)}</button>
                  )
                })
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[3,1,2,0].map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: SUIT_COLS[s] }}>
                  {SUIT_SYMS[s]} {['Piques','Cœurs','Carreaux','Trèfles'][s]}
                </div>
              ))}
            </div>
          </div>

          {/* Iterations + Calculate */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: SILVER }}>Précision :</span>
            {([[10000,'Rapide'],[25000,'Normal'],[100000,'Précis']] as [number,string][]).map(([n, label]) => (
              <button key={n} onClick={() => setIters(n)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: iters === n ? 'rgba(124,58,237,0.25)' : CARD, color: iters === n ? '#a78bfa' : SILVER, outline: iters === n ? '1px solid rgba(124,58,237,0.4)' : `1px solid ${BORDER}` }}>
                {label} ({fmtK(n)})
              </button>
            ))}
          </div>
          <button onClick={calculate} disabled={!canCalculate || running} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, border: 'none', background: !canCalculate ? 'rgba(124,58,237,0.2)' : VIOLET, color: '#fff', fontSize: 15, fontWeight: 800, cursor: !canCalculate || running ? 'not-allowed' : 'pointer', opacity: !canCalculate ? 0.5 : 1 }}>
            {running
              ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Calcul…</>
              : <><Play size={15} /> Calculer l'équité</>}
          </button>
          {!canCalculate && <p style={{ textAlign: 'center', fontSize: 12, color: SILVER, marginTop: 8 }}>Remplis les {numHands} mains pour lancer le calcul</p>}
        </>)}

        {/* ══════════════════ QUIZ ══════════════════ */}
        {mode === 'quiz' && (<>

          {/* Controls bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Nb mains */}
              {[2, 3].map(n => (
                <button key={n} onClick={() => { setNumHands(n); dealQuiz(quizType, n) }} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: numHands === n ? VIOLET : 'rgba(255,255,255,0.06)', color: numHands === n ? '#fff' : SILVER, transition: 'all 0.15s' }}>
                  {n} mains
                </button>
              ))}
            </div>
            {/* Score + streak */}
            {score.rounds > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {streak >= 3 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: ORANGE }}>
                    <Zap size={12} fill={ORANGE} /> {streak} de suite
                  </div>
                )}
                <div style={{ fontSize: 12, color: SILVER }}>
                  <span style={{ color: CREAM, fontWeight: 800, fontSize: 16 }}>{score.pts}</span>
                  <span style={{ marginLeft: 4 }}>pts · {score.rounds} question{score.rounds > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quiz type */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {(Object.keys(QUIZ_LABEL) as QuizType[]).map(type => (
              <button key={type} onClick={() => { setQuizType(type); dealQuiz(type, numHands) }} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${quizType === type ? 'rgba(124,58,237,0.35)' : BORDER}`, background: quizType === type ? 'rgba(124,58,237,0.15)' : CARD, color: quizType === type ? '#c4b5fd' : SILVER, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                {QUIZ_LABEL[type]}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: quizBoard.length > 0 ? 20 : 0, alignItems: 'flex-start' }}>
              {quizHands.slice(0, numHands).map((hand, hi) => (
                <div key={hi} style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: HAND_COLS[hi], letterSpacing: '0.08em', marginBottom: 8 }}>{HAND_NAMES[hi]}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {hand.map((card, ci) => <CardChip key={ci} card={card} active={false} readonly onClick={() => {}} />)}
                  </div>
                </div>
              ))}
            </div>
            {quizBoard.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.08em', marginBottom: 8 }}>BOARD</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {quizBoard.map((card, bi) => <CardChip key={bi} card={card} active={false} readonly onClick={() => {}} />)}
                </div>
              </div>
            )}
          </div>

          {/* ── Guessing phase: steppers ── */}
          {quizPhase === 'guessing' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.08em', marginBottom: 12 }}>TON ESTIMATION</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Array.from({ length: numHands }, (_, hi) => (
                  <EquityStepper
                    key={hi} hi={hi} value={guesses[hi]} color={HAND_COLS[hi]}
                    onAdjust={(delta) => adjustGuess(hi, delta)}
                    auto={numHands === 2 && hi === 1}
                  />
                ))}
              </div>
              {numHands === 3 && (
                <div style={{ marginTop: 10, fontSize: 11, color: SILVER }}>
                  Total : <span style={{ color: Math.abs(guesses.reduce((a, b) => a + b, 0) - 100) < 2 ? GREEN : ORANGE, fontWeight: 700 }}>
                    {guesses.reduce((a, b) => a + b, 0).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Revealed phase: results ── */}
          {quizPhase === 'revealed' && quizResults && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.08em', marginBottom: 12 }}>RÉSULTATS</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                {Array.from({ length: numHands }, (_, hi) => {
                  const g = grade(Math.abs(guesses[hi] - quizResults[hi]))
                  return (
                    <div key={hi} style={{ flex: 1, minWidth: 160, background: 'rgba(232,228,220,0.04)', border: `1px solid ${g.color}22`, borderRadius: 16, padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: HAND_COLS[hi], letterSpacing: '0.1em' }}>MAIN {hi + 1}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: g.color, background: `${g.color}18`, padding: '3px 10px', borderRadius: 99 }}>{g.label}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ fontSize: 10, color: SILVER, marginBottom: 2 }}>Estimation</div>
                          <div style={{ fontSize: 32, fontWeight: 900, color: SILVER, lineHeight: 1 }}>{guesses[hi].toFixed(1)}<span style={{ fontSize: 14 }}>%</span></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: SILVER, marginBottom: 2 }}>Réalité</div>
                          <div style={{ fontSize: 32, fontWeight: 900, color: HAND_COLS[hi], lineHeight: 1 }}>{quizResults[hi].toFixed(1)}<span style={{ fontSize: 14 }}>%</span></div>
                        </div>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', width: `${quizResults[hi]}%`, background: HAND_COLS[hi], borderRadius: 99 }} />
                      </div>
                      <div style={{ fontSize: 11, color: SILVER }}>
                        Écart <span style={{ color: g.color, fontWeight: 700 }}>±{Math.abs(guesses[hi] - quizResults[hi]).toFixed(1)}%</span>
                        <span style={{ marginLeft: 8, color: g.color, fontWeight: 700 }}>{g.pts > 0 ? `+${g.pts}` : '0'} pt{g.pts !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Round summary */}
              {(() => {
                const worstDelta = Math.max(...Array.from({ length: numHands }, (_, i) => Math.abs(guesses[i] - quizResults[i])))
                const g = grade(worstDelta)
                return (
                  <div style={{ padding: '12px 18px', borderRadius: 12, background: `${g.color}0d`, border: `1px solid ${g.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{g.pts === 3 ? 'Excellent !' : g.pts === 2 ? 'Bien joué !' : g.pts === 1 ? 'Pas loin…' : 'À retravailler'}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: g.color }}>+{g.pts} pt{g.pts !== 1 ? 's' : ''}</span>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {quizPhase === 'guessing' && (
              <button onClick={verifyQuiz} disabled={quizRunning || quizHands.length === 0} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, border: 'none', background: VIOLET, color: '#fff', fontSize: 15, fontWeight: 800, cursor: quizRunning ? 'wait' : 'pointer', opacity: quizRunning ? 0.7 : 1 }}>
                {quizRunning
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Calcul…</>
                  : <><Play size={14} /> Vérifier</>}
              </button>
            )}
            {quizPhase === 'revealed' && (
              <button onClick={() => dealQuiz(quizType, numHands)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, border: 'none', background: VIOLET, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                Suivante <ChevronRight size={16} />
              </button>
            )}
            <button onClick={() => dealQuiz(quizType, numHands)} title="Nouvelle donne" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 18px', borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: SILVER, cursor: 'pointer' }}>
              <Shuffle size={14} />
            </button>
          </div>

          {/* Scoring legend */}
          <div style={{ display: 'flex', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
            {([['Parfait','≤3%',GREEN,3],['Bon','≤7%',GREEN,2],['Proche','≤15%',ORANGE,1],['Raté','>15%',RED,0]] as [string,string,string,number][]).map(([label,range,c,pts]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: SILVER }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ color: c, fontWeight: 700 }}>{label}</span>
                <span>{range} · {pts > 0 ? `+${pts}pts` : '0pt'}</span>
              </div>
            ))}
          </div>
        </>)}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
