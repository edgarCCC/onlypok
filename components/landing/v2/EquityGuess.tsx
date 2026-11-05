'use client'
// S'entraîner : le quiz d'équité du trainer, jouable sans compte. Mêmes boutons d'ajustement, même barème, quatre donnes fixes (même rendu serveur et navigateur).
import { useState } from 'react'
import { flushSync } from 'react-dom'
import Button from '@/components/ui/Button'
import { cx } from '@/lib/cx'
import { EQUITY_GUESS_STEPS, SUIT_SYMS, cardName, gradeEquity, parseCard, rc } from '@/lib/equity'
import { displayRank } from '@/lib/ranges/drill'
import { LANDING_ROUTES } from '@/lib/routes'
import { EQUITY_DEALS } from './equity-deals'

const START_GUESS = 50
const BOARD_SLOTS = [0, 1, 2, 3, 4]
const ACTION_ID = 'lp-eg-action'
const STREET: Record<number, string> = { 0: 'Préflop, cinq cartes à venir', 3: 'Flop, deux cartes à venir', 4: 'Turn, une carte à venir' }

const namesOf = (cards: string[]) => cards.map((id) => cardName(parseCard(id))).join(', ')
const formatEquity = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function PlayingCard({ id }: { id: string }) {
  const { rank, suit } = parseCard(id)
  return (
    <div className={cx('lp-pc', (suit === 1 || suit === 2) && 'lp-pc-red')} aria-hidden="true">
      <span>{displayRank(rc(rank))}</span>
      <span className="lp-pc-suit">{SUIT_SYMS[suit]}</span>
    </div>
  )
}

function Hand({ label, cards }: { label: string; cards: string[] }) {
  return (
    <div className="lp-eg-hand" role="img" aria-label={`${label} : ${namesOf(cards)}`}>
      <span className="t-caps" aria-hidden="true">{label}</span>
      <div className="lp-cards">{cards.map((id) => <PlayingCard key={id} id={id} />)}</div>
    </div>
  )
}

export default function EquityGuess() {
  const [index, setIndex] = useState(0)
  const [guess, setGuess] = useState(START_GUESS)
  const [revealed, setRevealed] = useState(false)

  const deal = EQUITY_DEALS[index]
  const isLast = index === EQUITY_DEALS.length - 1
  const grade = gradeEquity(Math.abs(guess - deal.equity))

  /* L'action change de nature à l'écran : le focus la suit, pour qu'un joueur au clavier ne reparte pas du haut de la page. */
  const update = (change: () => void) => {
    flushSync(change)
    document.getElementById(ACTION_ID)?.focus({ preventScroll: true })
  }
  const reveal = () => update(() => setRevealed(true))
  const goTo = (next: number) => update(() => {
    setIndex(next)
    setGuess(START_GUESS)
    setRevealed(false)
  })
  const adjust = (delta: number) => setGuess((value) => Math.min(100, Math.max(0, value + delta)))

  return (
    <div className="lp-eg-wrap">
      <div className="lp-eg" role="group" aria-label="Devine l’équité">
        <div key={index} className="lp-eg-deal">
          <div className="lp-eg-hands">
            <Hand label="Toi" cards={deal.hero} />
            <span className="lp-eg-vs" aria-hidden="true">contre</span>
            <Hand label="En face" cards={deal.villain} />
          </div>
          <div className="lp-eg-street">
            <p className="t-caps">{STREET[deal.board.length]}</p>
            <div className="lp-eg-board" role={deal.board.length ? 'img' : undefined} aria-label={deal.board.length ? `Board : ${namesOf(deal.board)}` : undefined}>
              {BOARD_SLOTS.map((slot) => (deal.board[slot]
                ? <PlayingCard key={slot} id={deal.board[slot]} />
                : <span key={slot} className="lp-eg-slot" aria-hidden="true" />))}
            </div>
          </div>
        </div>

        <div className="lp-eg-guess">
          <p className="t-caps">{revealed ? 'Équité réelle' : 'Ton estimation'}</p>
          <output className="lp-eg-num num">{revealed ? formatEquity(deal.equity) : guess}{' '}%</output>
          <div className={cx('lp-eg-bar', revealed && 'is-revealed')} aria-hidden="true">
            <i style={{ transform: `scaleX(${(revealed ? deal.equity : guess) / 100})` }} />
            <em style={{ left: `${guess}%` }} />
          </div>
          <div className="lp-eg-zone">
            <div className={cx('lp-eg-steps', revealed && 'is-hidden')} role="group" aria-label="Ajuster ton estimation">
              {EQUITY_GUESS_STEPS.map((delta) => (
                <button key={delta} type="button" className="lp-eg-step num" aria-label={`${delta > 0 ? 'Plus' : 'Moins'} ${Math.abs(delta)} points`} onClick={() => adjust(delta)}>
                  {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
                </button>
              ))}
            </div>
            <p className={cx('lp-verdict lp-eg-verdict', revealed && 'is-visible')} aria-live="polite">
              {revealed && <><b className={grade.good ? 'v-in' : 'v-out'}>{grade.label}.</b> Tu avais dit {guess}{' '}%. {deal.lesson}</>}
            </p>
          </div>
          {revealed && isLast ? (
            <div className="lp-tool-foot">
              <Button id={ACTION_ID} href={LANDING_ROUTES.trainerEquity}>Créer mon compte pour continuer<span aria-hidden="true"> →</span></Button>
              <Button variant="link" onClick={() => goTo(0)}>Rejouer</Button>
            </div>
          ) : (
            <Button id={ACTION_ID} className="lp-eg-action" onClick={revealed ? () => goTo(index + 1) : reveal}>
              {revealed ? <>Main suivante<span aria-hidden="true"> →</span></> : 'Vérifier'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
