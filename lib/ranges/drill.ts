/* Exercice jouable de la landing (D2 §3) : le drill de ranges d'ouverture du trainer, figé à 6-max, 100 bb,
   héros au bouton (mains 1, 3, 5) ou au cut-off (mains 2, 4), « tout le monde a passé avant toi », cinq mains.
   Tout est pur et sérialisable : le serveur construit les deux ranges et la main du jour, le composant client
   ne reçoit que des tableaux (moins de 2 Ko). Les 68 autres ranges ne quittent pas le serveur. */
import { ALL_169, RANKS, RAW, countCombos, getNeighbors, parseRange } from './gto'

export type DrillPosition = 'BTN' | 'CO'
export type Verdict = 'in' | 'border' | 'out'
export type DrillAnswer = 'Fold' | 'Raise'
export type Suit = 'h' | 'd' | 'c' | 's'

export interface PlayingCard {
  rank: string
  suit: Suit
}

/** Range d'ouverture parsée, sérialisable (tableaux, pas de Set) : ce que le serveur passe au composant client. */
export interface OpeningRange {
  position: DrillPosition
  /** Mains ouvertes (liste `Raise` du trainer). */
  raise: string[]
  /** `Tightifie` : les plus faibles de la range, qu'on peut encore folder. */
  tight: string[]
  /** `Loosifie` : hors range, à ajouter si l'on élargit. */
  loose: string[]
  /** Voisines d'une main active (raise, tight ou loose), hors range : la zone « intéressante » du tirage. */
  border: string[]
  /** Part des 1 326 combinaisons ouvertes, en pourcentage entier. */
  pct: number
  /** Répartition réelle des 1 326 combinaisons : dans la range, à la frontière, hors range (en pourcentage entier). */
  split: { in: number; border: number; out: number }
}

export interface PositionCopy {
  /** « au bouton », « au cut-off » */
  at: string
  /** « BTN · 100 bb · 6-max » */
  meta: string
  /** Début de la question, avant la main. */
  question: string
}

export const DRILL_STACK = 100
export const DRILL_HANDS = 5
export const DRILL_SEQUENCE: readonly DrillPosition[] = ['BTN', 'CO', 'BTN', 'CO', 'BTN']
export const TOTAL_COMBOS = 1326

/** Les six places du 6-max, dans l'ordre de parole préflop (mêmes noms que le trainer). */
export const SEATS = ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const

export const POSITION_COPY: Record<DrillPosition, PositionCopy> = {
  BTN: { at: 'au bouton', meta: 'BTN · 100 bb · 6-max', question: 'Tu es au bouton, tout le monde a passé. Que fais-tu avec ' },
  CO: { at: 'au cut-off', meta: 'CO · 100 bb · 6-max', question: 'Tu es au cut-off, tout le monde a passé avant toi. Que fais-tu avec ' },
}

const RANGE_KEY: Record<DrillPosition, string> = { BTN: 'BTN_100', CO: 'CO_100' }

export function buildOpeningRange(position: DrillPosition): OpeningRange {
  const raw = RAW[RANGE_KEY[position]] ?? {}
  const raise = parseRange(raw.Raise ?? '')
  const tight = parseRange(raw.Tightifie ?? '')
  const loose = parseRange(raw.Loosifie ?? '')
  const active = new Set([...raise, ...tight, ...loose])
  const border = new Set<string>()
  active.forEach((hand) => getNeighbors(hand).forEach((n) => { if (!active.has(n)) border.add(n) }))
  const combos = raise.reduce((sum, hand) => sum + countCombos(hand), 0)
  const edge = new Set([...tight, ...loose])
  const count = (hands: Iterable<string>) => [...hands].reduce((sum, hand) => sum + countCombos(hand), 0)
  const inCombos = count(raise.filter((hand) => !edge.has(hand)))
  const edgeCombos = count(edge)
  const split = {
    in: Math.round((inCombos / TOTAL_COMBOS) * 100),
    border: Math.round((edgeCombos / TOTAL_COMBOS) * 100),
    out: Math.max(0, 100 - Math.round((inCombos / TOTAL_COMBOS) * 100) - Math.round((edgeCombos / TOTAL_COMBOS) * 100)),
  }
  return { position, raise, tight, loose, border: [...border], pct: Math.round((combos / TOTAL_COMBOS) * 100), split }
}

/** Trois verdicts (D2 §3.2) : frontière = Tightifie ou Loosifie ; dans la range = Raise ; sinon hors range. */
export function verdictLookup(range: OpeningRange): (hand: string) => Verdict {
  const raise = new Set(range.raise)
  const edge = new Set([...range.tight, ...range.loose])
  return (hand) => (edge.has(hand) ? 'border' : raise.has(hand) ? 'in' : 'out')
}

export function verdictOf(range: OpeningRange, hand: string): Verdict {
  return verdictLookup(range)(hand)
}

/** Règle de tolérance du drill : à la frontière, les deux réponses sont acceptées. */
export function isAccepted(verdict: Verdict, answer: DrillAnswer): boolean {
  if (verdict === 'border') return true
  return verdict === 'in' ? answer === 'Raise' : answer === 'Fold'
}

export function verdictLabel(verdict: Verdict, accepted: boolean): string {
  if (verdict === 'border') return 'Accepté.'
  return accepted ? 'Juste.' : 'Raté.'
}

/** Une phrase construite à partir des données, jamais un conseil inventé. */
export function explainVerdict(range: OpeningRange, hand: string, verdict: Verdict): string {
  const { at } = POSITION_COPY[range.position]
  if (verdict === 'in') return `${hand} fait partie de la range d’ouverture ${at} à ${DRILL_STACK} bb.`
  if (verdict === 'out') {
    return `${hand} est hors range : ${at} à ${DRILL_STACK} bb, on ouvre environ ${range.pct} % des combinaisons, et celle-ci n’en fait pas partie.`
  }
  const why = range.tight.includes(hand)
    ? 'c’est l’une des mains les plus faibles qu’on ouvre encore'
    : 'on ne l’ajoute que si l’on élargit'
  return `${hand} est à la frontière de la range ${at} : ${why}. Les deux choix se défendent.`
}

/** Mains « intéressantes » : dans la range ou à sa frontière, dans l'ordre de la grille. */
export function candidateHands(range: OpeningRange): string[] {
  const interesting = new Set([...range.raise, ...range.tight, ...range.loose, ...range.border])
  return ALL_169.filter((hand) => interesting.has(hand))
}

/** Première main, déterministe : jour de l'année (UTC) modulo le nombre de mains intéressantes. Rendue côté serveur. */
export function handOfDay(range: OpeningRange, date: Date = new Date()): string {
  const list = candidateHands(range)
  if (!list.length) return 'AA'
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const dayOfYear = Math.floor((today - start) / 86_400_000)
  return list[dayOfYear % list.length]
}

/** Mains 2 à 5 : même pondération que generate() du trainer (45 % actives, 45 % frontière, 10 % n'importe laquelle). */
export function pickHand(range: OpeningRange, used: ReadonlySet<string>, random: () => number = Math.random): string {
  const roll = random()
  const pool = roll < 0.45
    ? [...range.raise, ...range.tight, ...range.loose]
    : roll < 0.9 ? range.border : ALL_169
  const fresh = pool.filter((hand) => !used.has(hand))
  const candidates = fresh.length ? fresh : ALL_169
  return candidates[Math.floor(random() * candidates.length)] ?? 'AA'
}

const SUIT_ORDER: readonly Suit[] = ['h', 's', 'd', 'c']

/** Couleurs déterministes (pas de Math.random : la main du jour est rendue côté serveur sans décalage d'hydratation). */
export function cardsForHand(hand: string): [PlayingCard, PlayingCard] {
  const first = SUIT_ORDER[(RANKS.indexOf(hand[0]) * 7 + RANKS.indexOf(hand[1]) * 3) % 4]
  const offset = hand.length === 2 ? 2 : 1
  const second = hand[2] === 's' ? first : SUIT_ORDER[(SUIT_ORDER.indexOf(first) + offset) % 4]
  return [{ rank: hand[0], suit: first }, { rank: hand[1], suit: second }]
}

export const SUIT_SYMBOL: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' }
export const SUIT_NAME: Record<Suit, string> = { h: 'cœur', d: 'carreau', c: 'trèfle', s: 'pique' }
export const RANK_NAME: Record<string, string> = {
  A: 'As', K: 'Roi', Q: 'Dame', J: 'Valet', T: 'Dix', '9': 'Neuf', '8': 'Huit', '7': 'Sept', '6': 'Six', '5': 'Cinq', '4': 'Quatre', '3': 'Trois', '2': 'Deux',
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'h' || suit === 'd'
}

/** « As de cœur, Cinq de cœur » : le nom accessible des deux cartes. */
export function cardsLabel(cards: readonly PlayingCard[]): string {
  return cards.map((card) => `${RANK_NAME[card.rank] ?? card.rank} de ${SUIT_NAME[card.suit]}`).join(', ')
}

/** Rang affiché sur la carte : « 10 » plutôt que « T ». */
export function displayRank(rank: string): string {
  return rank === 'T' ? '10' : rank
}
