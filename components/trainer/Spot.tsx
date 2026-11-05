import { cx } from '@/lib/cx'
import { SEATS, type Position } from './actions'

const SUIT: Record<string, { symbol: string; name: string; red: boolean }> = {
  h: { symbol: '♥', name: 'cœur', red: true },
  d: { symbol: '♦', name: 'carreau', red: true },
  s: { symbol: '♠', name: 'pique', red: false },
  c: { symbol: '♣', name: 'trèfle', red: false },
}
/** Six emplacements autour de la table, le héros toujours en bas : ta place ne bouge pas d'une main à l'autre (apple-design §7). */
const SLOTS = [[50, 100], [6.7, 75], [6.7, 25], [50, 0], [93.3, 25], [93.3, 75]]
const POT_BB = '1,5 bb'

const parse = (card: string) => {
  const [rank, suit] = card.split(' ')
  return { rank: rank === 'T' ? '10' : rank, ...(SUIT[suit] ?? SUIT.s) }
}

export const cardsSentence = (cards: [string, string]) => cards.map((card) => { const c = parse(card); return `${c.rank} de ${c.name}` }).join(' et ')

function seatAction(seat: string, index: number, hero: number, stack: number) {
  if (index < hero) return 'Fold'
  if (index === hero) return 'À toi'
  if (seat === 'SB') return `${stack - 0.5}`.replace('.', ',')
  if (seat === 'BB') return `${stack - 1}`
  return `${stack}`
}

/** Le déroulé du coup, comme dans un solveur : qui a parlé, à qui c'est le tour, qui attend. */
export function ActionPath({ position, stack }: { position: Position; stack: number }) {
  const hero = SEATS.indexOf(position)
  return (
    <ol className="tr-path" aria-label={`Déroulé du coup : tout le monde a passé jusqu'à ${position}`}>
      {SEATS.map((seat, index) => (
        <li key={seat} className={cx('tr-step', index === hero && 'is-hero', index > hero && 'is-wait')} aria-current={index === hero ? 'step' : undefined}>
          <span className="tr-step-name">{seat}</span>
          <span className="tr-step-act">{seatAction(seat, index, hero, stack)}</span>
        </li>
      ))}
    </ol>
  )
}

export function Table({ position, stack, cards }: { position: Position; stack: number; cards: [string, string] }) {
  const hero = SEATS.indexOf(position)
  return (
    <div className="tr-table" aria-hidden="true">
      <div className="tr-felt on-forest">
        <span className="tr-pot">Pot {POT_BB}</span>
      </div>
      {SEATS.map((seat, index) => {
        const [left, top] = SLOTS[(index - hero + SEATS.length) % SEATS.length]
        return (
          <div key={seat} className={cx('tr-seat', index === hero && 'is-hero', index < hero && 'is-out')} style={{ left: `${left}%`, top: `${top}%` }}>
            <span>{seat}</span>
            {seat === 'BTN' && <i className="tr-dealer">D</i>}
          </div>
        )
      })}
      <div className="tr-cards">
        {cards.map((card, index) => {
          const c = parse(card)
          return (
            <div key={index} className={cx('tr-card', c.red && 'is-red')}>
              <span>{c.rank}</span>
              <span className="tr-card-suit">{c.symbol}</span>
            </div>
          )
        })}
      </div>
      <span className="tr-stack">{stack} bb</span>
    </div>
  )
}
