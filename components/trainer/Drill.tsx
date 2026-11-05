'use client'
// Le drill : une main, une action, la range peut rester masquée ou s'ouvrir à la demande.
// Aucune attente sur le chemin de l'entrée (apple-design §1 et §3) : une bonne réponse enchaîne seule, « Main suivante » coupe l'attente,
// une erreur reste affichée tant que tu n'as pas lu la grille.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ALL_169, GTO, countCombos, getNeighbors, makeCards, pick } from '@/lib/ranges/gto'
import { cx } from '@/lib/cx'
import { ACTION_KEY, TOTAL_COMBOS, familyOf, formatPct, type Position } from './actions'
import Matrix from './Matrix'
import { ActionPath, Table, cardsSentence } from './Spot'

const ADVANCE_MS = 1400

interface Scenario { cards: [string, string]; hand: string; position: Position; stack: number }
interface Result { hand: string; position: Position; stack: number; userAction: string; correctAction: string; pts: number; label: string }

export interface DrillProps {
  positions: Position[]
  stacks: number[]
  count: number
  onOpenSettings: () => void
  onError: (message: string) => void
}

function draw(positions: Position[], stacks: number[]): Scenario | null {
  const keys = Object.keys(GTO).filter((key) => {
    const [position, stack] = key.split('_')
    return positions.includes(position as Position) && stacks.includes(Number(stack))
  })
  if (!keys.length) return null
  const key = pick(keys)
  const [position, stack] = key.split('_')
  const range = GTO[key]
  const active = new Set<string>()
  Object.keys(range).forEach((action) => { if (action !== 'name') range[action].forEach((hand) => active.add(hand)) })
  const border = new Set<string>()
  active.forEach((hand) => getNeighbors(hand).forEach((next) => { if (!active.has(next)) border.add(next) }))
  const roll = Math.random()
  const hand = (roll < 0.45 ? pick([...active]) : roll < 0.9 ? pick([...border]) : pick(ALL_169)) || 'AA'
  return { cards: makeCards(hand), hand, position: position as Position, stack: Number(stack) }
}

function correctActionOf(rangeKey: string, hand: string) {
  const range = GTO[rangeKey]
  for (const action of Object.keys(range)) {
    if (action !== 'name' && range[action].includes(hand)) return action
  }
  return 'Fold'
}

function grade(action: string, correct: string): { label: string; pts: number } {
  const edge = correct === 'Tightifie' || correct === 'Loosifie'
  if (action === correct) return { label: 'Juste', pts: 1 }
  const accepted = (action.includes('Raise') && edge) || (action === 'Fold' && correct === 'Tightifie')
  return accepted ? { label: 'Juste', pts: 1 } : { label: 'Faux', pts: 0 }
}

export default function Drill({ positions, stacks, count, onOpenSettings, onError }: DrillProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<Result | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [peek, setPeek] = useState(false)
  const [finished, setFinished] = useState(false)
  const timer = useRef<number | null>(null)
  const keysRef = useRef<HTMLDivElement>(null)

  const clearTimer = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null } }

  const deal = useCallback(() => {
    const next = draw(positions, stacks)
    if (!next) { onError('Aucune range pour cette combinaison : ajoute une position ou une profondeur.'); onOpenSettings(); return }
    setScenario(next)
    setAnswered(null)
    setPeek(false)
  }, [positions, stacks, onError, onOpenSettings])

  const restart = useCallback(() => {
    clearTimer()
    setIndex(0); setResults([]); setFinished(false)
    deal()
  }, [deal])

  // Une nouvelle sélection relance la série ; le tirage est aléatoire, il n'a lieu que dans le navigateur.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { restart(); return clearTimer }, [restart])

  const rangeKey = scenario ? `${scenario.position}_${scenario.stack}` : ''
  const range = rangeKey ? GTO[rangeKey] : undefined
  const actions = useMemo(() => (range ? Object.keys(range).filter((key) => key !== 'name') : []), [range])
  const buttons = useMemo(() => ['Fold', ...actions], [actions])
  const comboMap = useMemo(() => {
    const map: Record<string, string> = {}
    actions.forEach((action) => range?.[action].forEach((hand) => { map[hand] = action }))
    return map
  }, [actions, range])
  const split = useMemo(() => actions.map((action) => ({ action, combos: (range?.[action] ?? []).reduce((sum, hand) => sum + countCombos(hand), 0) })), [actions, range])

  const goNext = useCallback(() => {
    clearTimer()
    if (index + 1 >= count) { setFinished(true); return }
    setIndex((value) => value + 1)
    deal()
  }, [index, count, deal])

  const answer = useCallback((action: string) => {
    if (!scenario || answered) return
    const correctAction = correctActionOf(rangeKey, scenario.hand)
    const { label, pts } = grade(action, correctAction)
    const result: Result = { hand: scenario.hand, position: scenario.position, stack: scenario.stack, userAction: action, correctAction, pts, label }
    setAnswered(result)
    setResults((previous) => [...previous, result])
    if (pts > 0 && action === correctAction) timer.current = window.setTimeout(goNext, ADVANCE_MS)
  }, [scenario, answered, rangeKey, goNext])

  const next = useCallback(() => {
    goNext()
    keysRef.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [goNext])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || finished) return
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (answered) {
        if ((event.key === 'Enter' || event.key === ' ') && target.tagName !== 'BUTTON') { event.preventDefault(); next() }
        return
      }
      const action = buttons.find((name) => ACTION_KEY[name] === event.key.toLowerCase())
      if (action) answer(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answered, finished, buttons, answer, next])

  if (finished) return <Summary results={results} count={count} onReplay={restart} onOpenSettings={onOpenSettings} />
  if (!scenario || !range) return <div className="tr-main" />

  const points = results.reduce((sum, result) => sum + result.pts, 0)
  const revealed = !!answered || peek
  const name = range.name[0]

  return (
    <div className="tr-main">
      <section className="tr-spot" aria-label="La main à jouer">
        <header className="tr-spot-head">
          <div>
            <h2 className="tr-spot-title">{name} <span>{scenario.stack} bb</span></h2>
            <p className="tr-spot-sub">Tout le monde a passé. À toi.</p>
          </div>
          <dl className="tr-score">
            <div><dt>Main</dt><dd>{index + 1}/{count}</dd></div>
            <div><dt>Justes</dt><dd>{points}</dd></div>
          </dl>
        </header>
        <ActionPath position={scenario.position} stack={scenario.stack} />
        <Table position={scenario.position} stack={scenario.stack} cards={scenario.cards} />
        <p className="sr" aria-live="polite">Main {index + 1} sur {count}. {name}, {scenario.stack} blindes. Ta main : {cardsSentence(scenario.cards)}.</p>
        <div ref={keysRef} className="tr-keys" role="group" aria-label="Ta décision">
          {buttons.map((action) => {
            const isCorrect = answered?.correctAction === action
            const isWrongPick = answered?.userAction === action && !isCorrect
            return (
              <button
                key={action}
                type="button"
                className={cx('tr-key', isCorrect && 'is-correct', isWrongPick && 'is-wrong')}
                data-fam={familyOf(action)}
                onClick={() => answer(action)}
                aria-disabled={!!answered}
              >
                <i aria-hidden="true" />
                {action}
                {ACTION_KEY[action] && <kbd aria-hidden="true">{ACTION_KEY[action]}</kbd>}
              </button>
            )
          })}
        </div>
        <div className="tr-verdict" aria-live="polite">
          {answered ? (
            <>
              <p>
                <strong className={answered.pts > 0 ? 'ui-gain' : 'ui-loss'}>{answered.label}</strong>
                {' '}{answered.hand} : {answered.correctAction}.
              </p>
              <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={next}>{index + 1 >= count ? 'Voir le résultat' : 'Main suivante'}</button>
            </>
          ) : (
            <p className="t-3">Choisis ton action.</p>
          )}
        </div>
      </section>

      <section className="tr-panel" aria-label="La range de ce spot">
        <header className="tr-panel-head">
          <div>
            <p className="t-caps">Range d’ouverture</p>
            <p className="tr-panel-title">{name} · {scenario.stack} bb</p>
          </div>
          {!answered && (
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" aria-pressed={peek} onClick={() => setPeek((value) => !value)}>
              {peek ? 'Masquer' : 'Voir la range'}
            </button>
          )}
        </header>
        <Matrix actionOf={(combo) => comboMap[combo]} current={scenario.hand} revealed={revealed} />
        <Split split={split} visible={revealed} />
      </section>
    </div>
  )
}

function Split({ split, visible }: { split: { action: string; combos: number }[]; visible: boolean }) {
  const total = split.reduce((sum, item) => sum + item.combos, 0)
  const fold = TOTAL_COMBOS - total
  return (
    <div className={cx('tr-split', visible && 'is-on')}>
      <div className="tr-split-bar" aria-hidden="true">
        {split.map(({ action, combos }) => <i key={action} data-fam={familyOf(action)} style={{ flexGrow: combos }} />)}
        <i data-fam="fold" style={{ flexGrow: fold }} />
      </div>
      <dl className="tr-split-legend">
        {split.map(({ action, combos }) => (
          <div key={action}>
            <dt><i data-fam={familyOf(action)} aria-hidden="true" />{action}</dt>
            <dd>{formatPct(Math.round((combos / TOTAL_COMBOS) * 1000) / 10)}</dd>
          </div>
        ))}
        <div>
          <dt><i data-fam="fold" aria-hidden="true" />Fold</dt>
          <dd>{formatPct(Math.round((fold / TOTAL_COMBOS) * 1000) / 10)}</dd>
        </div>
      </dl>
    </div>
  )
}

function Summary({ results, count, onReplay, onOpenSettings }: { results: Result[]; count: number; onReplay: () => void; onOpenSettings: () => void }) {
  const good = results.filter((result) => result.pts > 0).length
  const errors = results.filter((result) => result.userAction !== result.correctAction && result.pts < 1)
  const headline = `${Math.round((good / Math.max(1, results.length)) * 100)} %`
  return (
    <div className="tr-summary">
      <header>
        <p className="t-caps">Série terminée</p>
        <p className="tr-summary-num">{headline}</p>
        <p className="t-2">{good} justes sur {count} mains</p>
      </header>
      {errors.length > 0 ? (
        <table className="tr-table-data">
          <caption className="t-caps">À revoir</caption>
          <thead><tr><th scope="col">Main</th><th scope="col">Spot</th><th scope="col">Ta réponse</th><th scope="col">La range</th></tr></thead>
          <tbody>
            {errors.map((row, i) => (
              <tr key={i}>
                <th scope="row">{row.hand}</th>
                <td>{row.position} · {row.stack} bb</td>
                <td className="ui-loss">{row.userAction}</td>
                <td>{row.correctAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="t-2">Aucune erreur sur cette série.</p>
      )}
      <div className="tr-summary-actions">
        <button type="button" className="ui-btn ui-btn-primary" onClick={onReplay}>Rejouer</button>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onOpenSettings}>Réglages</button>
      </div>
    </div>
  )
}
