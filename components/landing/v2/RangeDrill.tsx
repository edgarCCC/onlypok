'use client'
// Le module du hero : un vrai morceau du trainer, jouable tout de suite. Cinq mains, Fold ou Raise, verdict en aria-live,
// la grille s'ouvre à partir de la main jouée, répartition réelle de la range, récapitulatif.
// Avant l'hydratation, Fold et Raise sont les boutons d'un formulaire GET vers le trainer ; après, les gestionnaires prennent la main.
// Aucune attente sur le chemin de l'entrée (apple-design §1 et §3) : réponse et main suivante sont immédiates, jamais verrouillées.
import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import Button from '@/components/ui/Button'
import { cx } from '@/lib/cx'
import {
  DRILL_HANDS, POSITION_COPY, SEATS, explainVerdict, isAccepted, pickHand, verdictLabel, verdictOf,
  type DrillAnswer, type DrillPosition, type OpeningRange, type Verdict,
} from '@/lib/ranges/drill'
import { LANDING_ROUTES } from '@/lib/routes'
import PlayingCards from './PlayingCards'
import RangeGrid from './RangeGrid'

export interface RangeDrillProps {
  ranges: Record<DrillPosition, OpeningRange>
  sequence: DrillPosition[]
  /** Main du jour, calculée côté serveur : la première main est identique avant et après l'hydratation. */
  firstHand: string
}

interface Round { position: DrillPosition; hand: string }
interface Answer extends Round { answer: DrillAnswer; verdict: Verdict; accepted: boolean }

const CHOICES: readonly DrillAnswer[] = ['Fold', 'Raise']
const NEXT_ID = 'drill-next'
const REPLAY_ID = 'drill-replay'

function focusById(id: string) {
  document.getElementById(id)?.focus()
}

/** Le déroulé du coup, comme dans un solveur : qui a parlé, à qui c'est le tour, qui attend. */
function ActionPath({ position }: { position: DrillPosition }) {
  const hero = SEATS.indexOf(position)
  return (
    <ol className="lp-path" aria-label={`Déroulé du coup : tout le monde a passé jusqu'à ${position}`}>
      {SEATS.map((seat, index) => (
        <li key={seat} className={cx('lp-seat', index === hero && 'is-hero', index > hero && 'is-wait')} aria-current={index === hero ? 'step' : undefined}>
          <span className="lp-seat-name">{seat}</span>
          <span className="lp-seat-act">{index < hero ? 'Fold' : index === hero ? 'À toi' : '100'}</span>
        </li>
      ))}
    </ol>
  )
}

/** Répartition réelle des combinaisons de la range, en une barre (révélée avec la grille). */
function RangeSplit({ range, revealed }: { range: OpeningRange; revealed: boolean }) {
  const { split } = range
  return (
    <div className={cx('lp-split', revealed && 'is-revealed')}>
      <p className="lp-split-hint">La range s’affiche après ta réponse.</p>
      <div className="lp-split-bar" aria-hidden="true">
        <i className="in" style={{ flexBasis: `${split.in}%` }} />
        <i className="bd" style={{ flexBasis: `${split.border}%` }} />
        <i className="ou" style={{ flexBasis: `${split.out}%` }} />
      </div>
      <dl className="lp-split-legend num" aria-hidden={revealed ? undefined : 'true'}>
        <div><dt>Ouvrir</dt><dd>{split.in} %</dd></div>
        <div><dt>Frontière</dt><dd>{split.border} %</dd></div>
        <div><dt>Passer</dt><dd>{split.out} %</dd></div>
      </dl>
    </div>
  )
}

export default function RangeDrill({ ranges, sequence, firstHand }: RangeDrillProps) {
  const initialRound = (): Round => ({ position: sequence[0], hand: firstHand })
  const [rounds, setRounds] = useState<Round[]>([initialRound()])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [finished, setFinished] = useState(false)
  const questionRef = useRef<HTMLParagraphElement>(null)

  const current = rounds[index]
  const range = ranges[current.position]
  const copy = POSITION_COPY[current.position]
  const answered = answers.length > index
  const last = answered ? answers[index] : null
  const isLast = index === DRILL_HANDS - 1

  function answer(choice: DrillAnswer, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (answered) return
    const verdict = verdictOf(range, current.hand)
    flushSync(() => setAnswers((prev) => [...prev, { ...current, answer: choice, verdict, accepted: isAccepted(verdict, choice) }]))
    focusById(NEXT_ID)
  }

  function next() {
    if (!answered) return
    if (isLast) {
      flushSync(() => setFinished(true))
      focusById(REPLAY_ID)
      return
    }
    const nextIndex = index + 1
    flushSync(() => {
      setRounds((prev) => {
        if (prev.length > nextIndex) return prev
        const position = sequence[nextIndex]
        return [...prev, { position, hand: pickHand(ranges[position], new Set(prev.map((round) => round.hand))) }]
      })
      setIndex(nextIndex)
    })
    questionRef.current?.focus()
  }

  function replay() {
    flushSync(() => { setRounds([initialRound()]); setIndex(0); setAnswers([]); setFinished(false) })
    questionRef.current?.focus()
  }

  const toolbar = (position: DrillPosition) => (
    <div className="lp-tool-bar">
      <ActionPath position={position} />
      <p className="lp-tool-meta num"><span>100 bb · 6-max</span><span className="lp-tool-count">{finished ? DRILL_HANDS : index + 1} / {DRILL_HANDS}</span></p>
    </div>
  )

  if (finished) {
    const score = answers.filter((item) => item.accepted).length
    const lastRound = rounds[DRILL_HANDS - 1]
    return (
      <div className="lp-tool" id="exercice">
        {toolbar(lastRound.position)}
        <div className="lp-tool-body">
          <div className="lp-tool-grid">
            <RangeGrid range={ranges[lastRound.position]} hand={lastRound.hand} revealed />
            <RangeSplit range={ranges[lastRound.position]} revealed />
          </div>
          <div className="lp-tool-panel">
            <h2 id="exercice-title" className="t-caps">Ton résultat</h2>
            <p className="big-num num">{score} sur {DRILL_HANDS}</p>
            <ul className="lp-sum" aria-label="Tes cinq réponses">
              {answers.map((item, i) => (
                <li key={`${item.hand}-${i}`} className="num">
                  <span>{item.hand}</span><span className="t-3">{item.answer}</span>
                  <span className={item.accepted ? 'ok' : 'ko'}><span className="sr">{item.accepted ? 'juste' : 'raté'}</span><span aria-hidden="true">{item.accepted ? '✓' : '✗'}</span></span>
                </li>
              ))}
            </ul>
            <div className="lp-tool-foot">
              <Button href={LANDING_ROUTES.trainerRanges}>Continuer au trainer<span aria-hidden="true"> →</span></Button>
              <Button id={REPLAY_ID} variant="link" onClick={replay}>Rejouer</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const explanation = last ? explainVerdict(range, current.hand, last.verdict) : ''
  return (
    <div className="lp-tool" id="exercice">
      {toolbar(current.position)}
      <div className="lp-tool-body">
        <div className="lp-tool-grid">
          <RangeGrid range={range} hand={current.hand} revealed={answered} />
          <RangeSplit range={range} revealed={answered} />
        </div>
        <div className="lp-tool-panel">
          <h2 id="exercice-title" className="t-caps">{index === 0 ? 'Main du jour' : `Main ${index + 1}`}</h2>
          <div key={index} className="lp-hand-in">
            <PlayingCards hand={current.hand} />
            <p ref={questionRef} className="lp-question" tabIndex={-1}>{copy.question}<span className="num">{current.hand}</span> ?</p>
          </div>
          <form className="lp-choices" action={LANDING_ROUTES.trainerRanges} method="get" onSubmit={(event: FormEvent) => event.preventDefault()}>
            {CHOICES.map((choice) => (
              <button
                key={choice}
                type="submit"
                name="action"
                value={choice}
                className="lp-choice"
                disabled={answered}
                data-state={last ? (last.answer === choice ? 'chosen' : 'dim') : undefined}
                onClick={(event) => answer(choice, event)}
              >
                {choice}
              </button>
            ))}
          </form>
          <p className={cx('lp-verdict', answered && 'is-visible')} aria-live="polite">
            {last ? (
              <><b className={cx(last.verdict !== 'border' && (last.accepted ? 'v-in' : 'v-out'))}>{verdictLabel(last.verdict, last.accepted)}</b> {explanation}</>
            ) : null}
          </p>
          <div className="lp-tool-foot">
            <Button id={NEXT_ID} className={cx('lp-next', answered && 'is-visible')} onClick={next}>
              {isLast ? 'Voir le résultat' : 'Main suivante'}<span aria-hidden="true"> →</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
