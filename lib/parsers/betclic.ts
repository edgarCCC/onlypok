// ── Betclic Spin & Rush hand history parser ──────────────────────────────────
import type { ParsedTournament } from './winamax'

export interface BetclicHand {
  gameId: string
  gameName: string
  buyIn: number
  prizePool: number
  date: Date
  players: string[]
  heroName: string
  placement: number | null
  prizeWon: number
  vpip: boolean
  pfr: boolean
  threeBet: boolean
  threeBetOpportunity: boolean
}

export function isBetclicFile(text: string): boolean {
  return text.includes('Site: Betclic.fr')
}

// Parse raw hands from one file — call for each file, then pass all hands to buildBetclicTournaments
export function parseBetclicHands(content: string): BetclicHand[] {
  const blocks = content.split(/^------------$/m).map(b => b.trim()).filter(Boolean)
  const hands: BetclicHand[] = []
  for (const block of blocks) {
    const hand = parseBetclicHand(block)
    if (hand) hands.push(hand)
  }
  return hands
}

// Group all hands (potentially from multiple files) by gameId and build one ParsedTournament per Spin
export function buildBetclicTournaments(allHands: BetclicHand[]): ParsedTournament[] {
  const gameMap = new Map<string, BetclicHand[]>()
  for (const hand of allHands) {
    if (!gameMap.has(hand.gameId)) gameMap.set(hand.gameId, [])
    gameMap.get(hand.gameId)!.push(hand)
  }

  const results: ParsedTournament[] = []

  for (const [gameId, gameHands] of gameMap) {
    gameHands.sort((a, b) => a.date.getTime() - b.date.getTime())

    const first    = gameHands[0]
    const last     = gameHands[gameHands.length - 1]
    const heroName = gameHands.find(h => h.heroName)?.heroName ?? ''

    const resultHand  = [...gameHands].reverse().find(h => h.placement !== null)
    const placement   = resultHand?.placement ?? 0
    const prizeWon    = resultHand?.prizeWon  ?? 0
    const buyInTotal  = first.buyIn

    const durationSecs = Math.max(0, Math.round((last.date.getTime() - first.date.getTime()) / 1000))
    const totalPlayers = Math.max(...gameHands.map(h => h.players.length), 2)

    const vpipCount     = gameHands.filter(h => h.vpip).length
    const pfrCount      = gameHands.filter(h => h.pfr).length
    const threeBetCount = gameHands.filter(h => h.threeBet).length
    const threeBetOpps  = gameHands.filter(h => h.threeBetOpportunity).length

    results.push({
      id: gameId,
      name: first.gameName,
      date: first.date,
      buyInTotal,
      buyInPrize: buyInTotal,
      buyInBounty: 0,
      buyInRake: 0,
      placement,
      totalPlayers,
      tournamentPrizePool: first.prizePool,
      prizeWon,
      bountiesWon: 0,
      netProfit: Math.round((prizeWon - buyInTotal) * 100) / 100,
      durationSecs,
      type: 'Spin & Rush',
      speed: 'hyper',
      format: 'spin_rush',
      heroName,
      handsPlayed: gameHands.length,
      vpipPct: gameHands.length > 0 ? Math.round(vpipCount / gameHands.length * 100) : null,
      pfrPct:  gameHands.length > 0 ? Math.round(pfrCount  / gameHands.length * 100) : null,
      threeBetPct: threeBetOpps > 0 ? Math.round(threeBetCount / threeBetOpps * 100) : null,
      hasSummary: false,
      hasHistory: true,
    })
  }

  return results.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function parseBetclicHand(block: string): BetclicHand | null {
  if (!block.includes('*** HEADER ***')) return null

  const headerSection  = block.match(/\*\*\* HEADER \*\*\*([\s\S]*?)(?=\*\*\*)/)?.[1] ?? ''
  const playersSection = block.match(/\*\*\* PLAYERS \*\*\*([\s\S]*?)(?=\*\*\*)/)?.[1] ?? ''
  const preFlopSection = block.match(/\*\*\* PRE-FLOP \*\*\*([\s\S]*?)(?=\*\*\* (?:FLOP|TURN|RIVER|SHOWDOWN|SUMMARY)|$)/)?.[1] ?? ''
  const summarySection = block.match(/\*\*\* SUMMARY \*\*\*([\s\S]*)$/)?.[1] ?? ''

  const gameModeMatch  = headerSection.match(/Game Mode:\s*(.+)/)
  if (gameModeMatch?.[1].trim() !== 'Spin') return null   // ignore MTTs, cash games, etc.

  const gameIdMatch    = headerSection.match(/Game ID:\s*(\S+)/)
  const gameNameMatch  = headerSection.match(/Game Name:\s*(.+)/)
  const buyInMatch     = headerSection.match(/Buy In:\s*([\d.]+)/)
  const prizePoolMatch = headerSection.match(/Prize pool:\s*([\d.]+)/)
  const dateMatch      = headerSection.match(/Date & Time:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)

  if (!gameIdMatch || !dateMatch) return null

  const gameId   = gameIdMatch[1].trim()
  const gameName = gameNameMatch?.[1].trim() ?? 'Spin & Rush'
  const buyIn    = parseFloat(buyInMatch?.[1] ?? '0')
  const prizePool = parseFloat(prizePoolMatch?.[1] ?? '0')
  const date     = new Date(dateMatch[1].replace(' ', 'T') + 'Z')

  if (!gameId) return null

  const players: string[] = []
  let heroName = ''
  for (const m of playersSection.matchAll(/Seat \d+:\s*([^(]+?)\s*\(\d+\)\s*\[([^\]]+)\]/g)) {
    const name = m[1].trim()
    players.push(name)
    if (m[2].includes('Hero')) heroName = name
  }

  // Placement & prize from SUMMARY
  let placement: number | null = null
  let prizeWon = 0
  if (heroName && summarySection) {
    const escaped = heroName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = summarySection.match(
      new RegExp(`${escaped}\\s+finished\\s+(\\d+)(?:st|nd|rd|th)(?:\\s+and wins\\s+([\\d.]+)\\s+EUR)?`)
    )
    if (m) {
      placement = parseInt(m[1])
      prizeWon  = m[2] ? parseFloat(m[2]) : 0
    }
  }

  // VPIP / PFR / 3-bet from pre-flop actions (ignore blind posts)
  let vpip = false, pfr = false, threeBet = false, threeBetOpportunity = false
  if (heroName && preFlopSection) {
    let raiseCount = 0
    for (const line of preFlopSection.split('\n')) {
      if (line.includes(' Posts ')) continue
      const m = line.match(/\d{2}:\d{2}:\d{2} - ([^:]+):(.+)/)
      if (!m) continue
      const actor  = m[1].trim()
      const action = m[2].toLowerCase()
      if (actor === heroName) {
        if (action.includes('raises') || action.includes('bets')) {
          if (raiseCount >= 1) threeBet = true
          pfr = true; vpip = true
        } else if (action.includes('calls')) {
          vpip = true
        }
      } else {
        if (action.includes('raises') || action.includes('bets')) {
          raiseCount++
          if (raiseCount === 1) threeBetOpportunity = true
        }
      }
    }
  }

  return { gameId, gameName, buyIn, prizePool, date, players, heroName, placement, prizeWon, vpip, pfr, threeBet, threeBetOpportunity }
}
