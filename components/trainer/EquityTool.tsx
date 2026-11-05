'use client'
// Équité : le calculateur et son quiz. Les mains et le board à gauche, le paquet à droite ; un emplacement actif reçoit la carte choisie,
// puis l'emplacement suivant s'active tout seul.
import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Shuffle } from 'lucide-react'
import { cx } from '@/lib/cx'
import { EQUITY_GUESS_STEPS, RANK_CHARS, SUIT_SYMS, calcEquity, cardName, cid, gradeEquity, rc, shuffledDeck, type Card } from '@/lib/equity'
import ToolBar from './ToolBar'
import './trainer.css'

type SlotRef = { type: 'hand'; hi: number; ci: number } | { type: 'board'; bi: number }
type QuizType = 'preflop' | 'flop' | 'turn' | 'river'

const QUIZ_BOARD: Record<QuizType, number> = { preflop: 0, flop: 3, turn: 4, river: 5 }
const QUIZ_LABEL: Record<QuizType, string> = { preflop: 'Préflop', flop: 'Flop', turn: 'Turn', river: 'River' }
const BOARD_LABELS = ['Flop', 'Flop', 'Flop', 'Turn', 'River']
const PRECISION: [number, string][] = [[10000, 'Rapide'], [25000, 'Normal'], [100000, 'Précis']]
const SCALE: { label: string; range: string; pts: number }[] = [
  { label: 'Parfait', range: '3 % d’écart', pts: 3 },
  { label: 'Bon', range: '7 %', pts: 2 },
  { label: 'Proche', range: '15 %', pts: 1 },
]
const emptyHands = (): (Card | null)[][] => [[null, null], [null, null], [null, null]]
const emptyBoard = (): (Card | null)[] => [null, null, null, null, null]
const initGuesses = (n: number) => (n === 3 ? [34, 33, 33] : [50, 50])
const isRed = (suit: number) => suit === 1 || suit === 2
const fmt = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function CardSlot({ card, active, readonly, label, onClick }: { card: Card | null; active?: boolean; readonly?: boolean; label: string; onClick?: () => void }) {
  const content = card
    ? <><span>{rc(card.rank) === 'T' ? '10' : rc(card.rank)}</span><span className="tr-card-suit">{SUIT_SYMS[card.suit]}</span></>
    : <span className="eq-plus" aria-hidden="true">+</span>
  const className = cx('eq-slot', card && 'is-full', card && isRed(card.suit) && 'is-red', active && 'is-active')
  if (readonly) return <div className={className} role="img" aria-label={card ? cardName(card) : label}>{content}</div>
  return <button type="button" className={className} aria-label={card ? `${label} : ${cardName(card)}, retirer` : `${label}, choisir une carte`} aria-pressed={active} onClick={onClick}>{content}</button>
}

export default function EquityTool({ backHref = '/trainer' }: { backHref?: string }) {
  const [mode, setMode] = useState<'calc' | 'quiz'>('calc')
  const [numHands, setNumHands] = useState(2)

  /* Calculateur */
  const [hands, setHands] = useState(emptyHands)
  const [board, setBoard] = useState(emptyBoard)
  const [active, setActive] = useState<SlotRef | null>({ type: 'hand', hi: 0, ci: 0 })
  const [equities, setEquities] = useState<number[] | null>(null)
  const [running, setRunning] = useState(false)
  const [iters, setIters] = useState(25000)

  /* Quiz */
  const [quizType, setQuizType] = useState<QuizType>('preflop')
  const [quizHands, setQuizHands] = useState<Card[][]>([])
  const [quizBoard, setQuizBoard] = useState<Card[]>([])
  const [guesses, setGuesses] = useState<number[]>([50, 50])
  const [quizResults, setQuizResults] = useState<number[] | null>(null)
  const [quizRunning, setQuizRunning] = useState(false)
  const [score, setScore] = useState({ pts: 0, rounds: 0 })
  const [streak, setStreak] = useState(0)

  const usedCards = new Set([...hands.flat(), ...board].filter((card): card is Card => !!card).map(cid))
  const canCalculate = hands.slice(0, numHands).every((hand) => hand.every((card) => card !== null))
  const isActive = (slot: SlotRef) => !!active && JSON.stringify(active) === JSON.stringify(slot)

  const nextSlot = (current: SlotRef, n: number): SlotRef | null => {
    if (current.type === 'hand') {
      if (current.ci === 0) return { type: 'hand', hi: current.hi, ci: 1 }
      if (current.hi + 1 < n) return { type: 'hand', hi: current.hi + 1, ci: 0 }
      return { type: 'board', bi: 0 }
    }
    return current.bi < 4 ? { type: 'board', bi: current.bi + 1 } : null
  }
  const pickCard = (card: Card) => {
    if (!active || usedCards.has(cid(card))) return
    if (active.type === 'hand') setHands((previous) => previous.map((hand, hi) => (hi === active.hi ? hand.map((c, ci) => (ci === active.ci ? card : c)) : hand)))
    else setBoard((previous) => previous.map((c, bi) => (bi === active.bi ? card : c)))
    setActive(nextSlot(active, numHands))
    setEquities(null)
  }
  const onSlot = (slot: SlotRef, card: Card | null) => {
    if (card) {
      if (slot.type === 'hand') setHands((previous) => previous.map((hand, hi) => (hi === slot.hi ? hand.map((c, ci) => (ci === slot.ci ? null : c)) : hand)))
      else setBoard((previous) => previous.map((c, bi) => (bi === slot.bi ? null : c)))
      setEquities(null)
    }
    setActive(slot)
  }
  const randomize = () => {
    const deck = shuffledDeck()
    setHands(Array.from({ length: 3 }, (_, i) => [deck[i * 2], deck[i * 2 + 1]]))
    setBoard(emptyBoard()); setEquities(null); setActive({ type: 'board', bi: 0 })
  }
  const reset = () => { setHands(emptyHands()); setBoard(emptyBoard()); setEquities(null); setActive({ type: 'hand', hi: 0, ci: 0 }) }
  const calculate = () => {
    if (!canCalculate) return
    setRunning(true); setEquities(null)
    window.setTimeout(() => { setEquities(calcEquity(hands.slice(0, numHands), board, iters)); setRunning(false) }, 10)
  }

  const dealQuiz = useCallback((type: QuizType, n: number) => {
    const deck = shuffledDeck()
    setQuizHands(Array.from({ length: n }, (_, i) => [deck[i * 2], deck[i * 2 + 1]]))
    const size = QUIZ_BOARD[type]
    setQuizBoard(size > 0 ? deck.slice(n * 2, n * 2 + size) : [])
    setGuesses(initGuesses(n))
    setQuizResults(null)
  }, [])

  useEffect(() => {
    // Le tirage est aléatoire : il n'a lieu qu'au passage en mode quiz, dans le navigateur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mode === 'quiz' && quizHands.length === 0) dealQuiz(quizType, numHands)
  }, [mode, quizHands.length, dealQuiz, quizType, numHands])

  const adjustGuess = (hi: number, delta: number) => setGuesses((previous) => {
    const value = Math.max(0, Math.min(100, previous[hi] + delta))
    const next = previous.map((guess, index) => (index === hi ? value : guess))
    if (numHands === 2) next[1 - hi] = 100 - value
    return next
  })
  const verifyQuiz = () => {
    setQuizRunning(true)
    window.setTimeout(() => {
      const results = calcEquity(quizHands, quizBoard, 50000)
      setQuizResults(results)
      setQuizRunning(false)
      const g = gradeEquity(Math.max(...guesses.map((guess, i) => Math.abs(guess - results[i]))))
      setScore((s) => ({ pts: s.pts + g.pts, rounds: s.rounds + 1 }))
      setStreak((s) => (g.pts > 0 ? s + 1 : 0))
    }, 10)
  }
  const switchCount = (n: number) => {
    setNumHands(n); setEquities(null)
    if (mode === 'quiz') dealQuiz(quizType, n)
  }

  const guessTotal = guesses.reduce((sum, guess) => sum + guess, 0)
  const roundGrade = quizResults ? gradeEquity(Math.max(...guesses.map((guess, i) => Math.abs(guess - quizResults[i])))) : null

  return (
    <div className="tr">
      <ToolBar
        backHref={backHref}
        title="Équité"
        actions={mode === 'calc' ? (
          <>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={randomize}><Shuffle size={14} aria-hidden="true" /> Aléatoire</button>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={reset}><RotateCcw size={14} aria-hidden="true" /> Réinitialiser</button>
          </>
        ) : score.rounds > 0 ? (
          <dl className="tr-score tr-score-inline">
            <div><dt>Points</dt><dd>{score.pts}</dd></div>
            <div><dt>Donnes</dt><dd>{score.rounds}</dd></div>
            {streak >= 2 && <div><dt>Série</dt><dd>{streak}</dd></div>}
          </dl>
        ) : undefined}
      >
        <div className="ui-seg" role="group" aria-label="Mode">
          <button type="button" className="ui-seg-item" aria-pressed={mode === 'calc'} onClick={() => setMode('calc')}>Calculateur</button>
          <button type="button" className="ui-seg-item" aria-pressed={mode === 'quiz'} onClick={() => setMode('quiz')}>Quiz</button>
        </div>
        <div className="ui-seg" role="group" aria-label="Nombre de mains">
          {[2, 3].map((n) => <button key={n} type="button" className="ui-seg-item" aria-pressed={numHands === n} onClick={() => switchCount(n)}>{n} mains</button>)}
        </div>
      </ToolBar>

      {mode === 'calc' ? (
        <div className="eq-main">
          <section className="eq-table" aria-label="Mains et board">
            <div className="eq-hands">
              {Array.from({ length: numHands }, (_, hi) => (
                <div key={hi} className="eq-hand" data-hand={hi}>
                  <p className="t-caps"><i aria-hidden="true" />Main {hi + 1}</p>
                  <div className="eq-cards">
                    {[0, 1].map((ci) => {
                      const slot: SlotRef = { type: 'hand', hi, ci }
                      return <CardSlot key={ci} card={hands[hi][ci]} active={isActive(slot)} label={`Main ${hi + 1}, carte ${ci + 1}`} onClick={() => onSlot(slot, hands[hi][ci])} />
                    })}
                  </div>
                  <p className={cx('eq-pct', equities && 'is-on')}>{equities ? `${fmt(equities[hi])} %` : '—'}</p>
                </div>
              ))}
            </div>
            <div className={cx('eq-bar', equities && 'is-on')} aria-hidden="true">
              {Array.from({ length: numHands }, (_, hi) => <i key={hi} data-hand={hi} style={{ flexGrow: equities ? equities[hi] : 1 }} />)}
            </div>
            <div className="eq-board">
              <p className="t-caps">Board <span className="eq-optional">facultatif</span></p>
              <div className="eq-cards">
                {BOARD_LABELS.map((label, bi) => {
                  const slot: SlotRef = { type: 'board', bi }
                  return <CardSlot key={bi} card={board[bi]} active={isActive(slot)} label={`${label}, carte ${bi + 1}`} onClick={() => onSlot(slot, board[bi])} />
                })}
              </div>
            </div>
            <div className="eq-run">
              <div className="ui-seg" role="group" aria-label="Précision du calcul">
                {PRECISION.map(([n, label]) => <button key={n} type="button" className="ui-seg-item" aria-pressed={iters === n} onClick={() => setIters(n)}>{label}</button>)}
              </div>
              <button type="button" className="ui-btn ui-btn-primary" disabled={!canCalculate || running} aria-busy={running} onClick={calculate}>
                {running && <span className="ui-spinner" aria-hidden="true" />}
                {running ? 'Calcul…' : 'Calculer l’équité'}
              </button>
              <p className="eq-hint" aria-live="polite">{canCalculate ? `${iters.toLocaleString('fr-FR')} tirages Monte Carlo` : `Remplis les ${numHands} mains pour calculer.`}</p>
            </div>
          </section>
          <section className="eq-deck tr-panel" aria-label="Paquet de cartes">
            <p className="t-caps">{active ? (active.type === 'hand' ? `Carte ${active.ci + 1} de la main ${active.hi + 1}` : `${BOARD_LABELS[active.bi]}, carte ${active.bi + 1}`) : 'Choisis un emplacement'}</p>
            <div className="eq-picker">
              {[3, 1, 2, 0].map((suit) => (
                <div key={suit} className={cx('eq-suit', isRed(suit) && 'is-red')}>
                  <span className="eq-suit-sym" aria-hidden="true">{SUIT_SYMS[suit]}</span>
                  {[...RANK_CHARS].reverse().map((_, ri) => {
                    const card: Card = { rank: 14 - ri, suit }
                    const used = usedCards.has(cid(card))
                    return (
                      <button key={cid(card)} type="button" className="eq-pick" aria-label={cardName(card)} disabled={used || !active} onClick={() => pickCard(card)}>
                        {rc(card.rank)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="eq-main eq-main-quiz">
          <section className="eq-table" aria-label="La donne à estimer">
            <div className="ui-seg" role="group" aria-label="Rue">
              {(Object.keys(QUIZ_LABEL) as QuizType[]).map((type) => <button key={type} type="button" className="ui-seg-item" aria-pressed={quizType === type} onClick={() => { setQuizType(type); dealQuiz(type, numHands) }}>{QUIZ_LABEL[type]}</button>)}
            </div>
            <div className="eq-hands">
              {quizHands.slice(0, numHands).map((hand, hi) => (
                <div key={hi} className="eq-hand" data-hand={hi}>
                  <p className="t-caps"><i aria-hidden="true" />Main {hi + 1}</p>
                  <div className="eq-cards">{hand.map((card, ci) => <CardSlot key={ci} card={card} readonly label="" />)}</div>
                </div>
              ))}
            </div>
            {quizBoard.length > 0 && (
              <div className="eq-board">
                <p className="t-caps">Board</p>
                <div className="eq-cards">{quizBoard.map((card, bi) => <CardSlot key={bi} card={card} readonly label="" />)}</div>
              </div>
            )}
          </section>
          <section className="eq-guess tr-panel" aria-label="Ton estimation">
            <p className="t-caps">{quizResults ? 'Résultat' : 'Ton estimation'}</p>
            {Array.from({ length: numHands }, (_, hi) => (
              <div key={hi} className="eq-guess-row" data-hand={hi}>
                <div className="eq-guess-head">
                  <span className="eq-guess-name"><i aria-hidden="true" />Main {hi + 1}</span>
                  {quizResults
                    ? <span className="eq-guess-vals"><span className="t-3">{fmt(guesses[hi])} %</span> <b>{fmt(quizResults[hi])} %</b></span>
                    : <b className="eq-guess-num">{guesses[hi]} %</b>}
                </div>
                {quizResults ? (
                  <div className="eq-compare" aria-hidden="true">
                    <i style={{ transform: `scaleX(${quizResults[hi] / 100})` }} />
                    <em style={{ left: `${guesses[hi]}%` }} />
                  </div>
                ) : (
                  <>
                    <div className="eq-compare" aria-hidden="true"><i style={{ transform: `scaleX(${guesses[hi] / 100})` }} /></div>
                    {numHands === 2 && hi === 1 ? (
                      <p className="eq-hint">100 % moins la main 1</p>
                    ) : (
                      <div className="eq-steps" role="group" aria-label={`Ajuster la main ${hi + 1}`}>
                        {EQUITY_GUESS_STEPS.map((delta) => (
                          <button key={delta} type="button" className="eq-step" aria-label={`${delta > 0 ? 'Plus' : 'Moins'} ${Math.abs(delta)} points`} onClick={() => adjustGuess(hi, delta)}>
                            {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {numHands === 3 && !quizResults && <p className={cx('eq-hint', Math.abs(guessTotal - 100) > 1 && 'ui-loss')}>Total : {guessTotal} %</p>}
            <div aria-live="polite">
              {roundGrade && <p className="eq-grade"><strong className={roundGrade.good ? 'ui-gain' : 'ui-loss'}>{roundGrade.label} +{roundGrade.pts}</strong> <span className="t-2">sur l’écart le plus large</span></p>}
            </div>
            <div className="eq-guess-actions">
              {quizResults
                ? <button type="button" className="ui-btn ui-btn-primary" onClick={() => dealQuiz(quizType, numHands)}>Donne suivante</button>
                : <button type="button" className="ui-btn ui-btn-primary" disabled={quizRunning || quizHands.length === 0} aria-busy={quizRunning} onClick={verifyQuiz}>{quizRunning && <span className="ui-spinner" aria-hidden="true" />}Vérifier</button>}
              {!quizResults && <button type="button" className="ui-btn ui-btn-secondary" onClick={() => dealQuiz(quizType, numHands)}>Passer</button>}
            </div>
            <ul className="eq-scale">
              {SCALE.map(({ label, range, pts }) => <li key={label}><b>{label}</b> jusqu’à {range} · +{pts}</li>)}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
