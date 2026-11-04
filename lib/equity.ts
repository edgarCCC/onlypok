/* Calcul d'équité : évaluateur de mains 5 cartes et Monte Carlo, extraits tels quels du calculateur du trainer. */
export type Card = { rank: number; suit: number }

export const RANK_CHARS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
export const SUIT_CHARS = ['s','h','d','c']
export const SUIT_SYMS = ['♠','♥','♦','♣']
export const SUIT_NAMES = ['pique','cœur','carreau','trèfle']
export const RANK_NAMES: Record<string, string> = { A: 'As', K: 'Roi', Q: 'Dame', J: 'Valet', T: '10' }

export const rc = (rank: number) => RANK_CHARS[rank - 2]
export const cid = (c: Card) => `${rc(c.rank)}${SUIT_CHARS[c.suit]}`
export const cardName = (c: Card) => `${RANK_NAMES[rc(c.rank)] ?? rc(c.rank)} de ${SUIT_NAMES[c.suit]}`

/* ─── Evaluator ─── */
export function evaluate5(cards: Card[]): number {
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

export function bestHand(cards: Card[]): number {
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
export function calcEquity(hands: (Card | null)[][], board: (Card | null)[], iterations = 25000): number[] {
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
export function shuffledDeck(): Card[] {
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
