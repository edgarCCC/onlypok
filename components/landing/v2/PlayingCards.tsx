import { cx } from '@/lib/cx'
import { SUIT_SYMBOL, cardsForHand, cardsLabel, displayRank, isRedSuit } from '@/lib/ranges/drill'

interface PlayingCardsProps {
  /** Main en notation du trainer : « A5s », « T8o », « AA ». */
  hand: string
  /** Décoratif (la carte « Main du jour » du hero répète l'exercice) : aucun nom accessible. */
  decorative?: boolean
}

/** Deux cartes à jouer sombres (face surface-3, encre texte, cœur et carreau en rouge désaturé), couleurs déterministes. */
export default function PlayingCards({ hand, decorative = false }: PlayingCardsProps) {
  const cards = cardsForHand(hand)
  return (
    <div
      className="lp-cards"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : cardsLabel(cards)}
      aria-hidden={decorative ? 'true' : undefined}
    >
      {cards.map((card, index) => (
        <div key={index} className={cx('lp-pc', isRedSuit(card.suit) && 'lp-pc-red')} aria-hidden="true">
          <span>{displayRank(card.rank)}</span>
          <span className="lp-pc-suit">{SUIT_SYMBOL[card.suit]}</span>
        </div>
      ))}
    </div>
  )
}
