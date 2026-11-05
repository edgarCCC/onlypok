import { test, expect } from '@playwright/test'
import { EQUITY_DEALS } from '../../components/landing/v2/equity-deals'
import { bestHand, calcEquity, cid, gradeEquity, parseCard, type Card } from '../../lib/equity'

/* Les équités de la landing sont précalculées : on les revérifie avec le moteur du trainer.
   Tests unitaires, sans navigateur ni serveur :
   E2E_BASE_URL=http://127.0.0.1:9 npx playwright test equity-deals --reporter=list */

const ALL_CARDS: Card[] = Array.from({ length: 13 }, (_, rank) => [0, 1, 2, 3].map((suit) => ({ rank: rank + 2, suit }))).flat()

function* boardsFrom(deck: Card[], size: number, start = 0, picked: Card[] = []): Generator<Card[]> {
  if (size === 0) { yield picked; return }
  for (let index = start; index <= deck.length - size; index++) yield* boardsFrom(deck, size - 1, index + 1, [...picked, deck[index]])
}

/** Énumère tous les boards restants : praticable à partir du flop (990 boards au plus). */
function exactEquity(hero: Card[], villain: Card[], board: Card[]): number {
  const used = new Set([...hero, ...villain, ...board].map(cid))
  const deck = ALL_CARDS.filter((card) => !used.has(cid(card)))
  let points = 0
  let total = 0
  for (const run of boardsFrom(deck, 5 - board.length)) {
    const mine = bestHand([...hero, ...board, ...run])
    const theirs = bestHand([...villain, ...board, ...run])
    points += mine > theirs ? 1 : mine === theirs ? 0.5 : 0
    total += 1
  }
  return (points / total) * 100
}

test.describe('Donnes d’équité de la landing', () => {
  for (const deal of EQUITY_DEALS) {
    const name = `${deal.hero.join(' ')} contre ${deal.villain.join(' ')}${deal.board.length ? ` sur ${deal.board.join(' ')}` : ''}`

    test(`${name} : ${deal.equity} %`, () => {
      const hero = deal.hero.map(parseCard)
      const villain = deal.villain.map(parseCard)
      const board = deal.board.map(parseCard)
      if (board.length >= 3) {
        expect(Math.abs(exactEquity(hero, villain, board) - deal.equity)).toBeLessThan(0.05)
        return
      }
      /* Préflop, 1,7 million de boards : valeur exacte calculée à part, ici Monte Carlo à cinq écarts types. */
      const [equity] = calcEquity([hero, villain], board, 60000)
      expect(Math.abs(equity - deal.equity)).toBeLessThan(1)
    })

    test(`${name} : aucune carte en double`, () => {
      const cards = [...deal.hero, ...deal.villain, ...deal.board]
      expect(new Set(cards).size).toBe(cards.length)
      for (const card of cards) expect(cid(parseCard(card))).toBe(card)
    })
  }

  test('la note suit le barème du quiz d’équité', () => {
    expect(gradeEquity(3).label).toBe('Parfait')
    expect(gradeEquity(3.1).label).toBe('Bon')
    expect(gradeEquity(7).label).toBe('Bon')
    expect(gradeEquity(7.1).label).toBe('Proche')
    expect(gradeEquity(15).label).toBe('Proche')
    expect(gradeEquity(15.1)).toMatchObject({ label: 'Raté', good: false })
  })
})
