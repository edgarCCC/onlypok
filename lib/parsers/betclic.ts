// ── Betclic hand history parser — Expresso (Spin & Rush) + Tournois ──────────
import type { ParsedTournament, TournamentFormat } from './winamax'

export interface BetclicHand {
  gameId: string
  gameName: string
  gameMode: 'spin' | 'tournament'
  buyIn: number
  prizePool: number
  date: Date
  players: string[]
  heroName: string
  placement: number | null
  prizeWon: number
  bountiesWon: number
  vpip: boolean
  pfr: boolean
  threeBet: boolean
  threeBetOpportunity: boolean
}

export function isBetclicFile(text: string): boolean {
  return text.includes('Site: Betclic.fr')
}

// Phase 1: parse raw hands from one file
export function parseBetclicHands(content: string): BetclicHand[] {
  const blocks = content.split(/^------------$/m).map(b => b.trim()).filter(Boolean)
  const hands: BetclicHand[] = []
  for (const block of blocks) {
    const hand = parseBetclicHand(block)
    if (hand) hands.push(hand)
  }
  return hands
}

// Phase 2: group ALL hands globally by gameId — handles cross-midnight files
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
    const isSpin   = first.gameMode === 'spin'

    // For result: take the last hand that has a recorded placement
    const resultHand = [...gameHands].reverse().find(h => h.placement !== null)
    const placement  = resultHand?.placement ?? 0
    const prizeWon   = resultHand?.prizeWon  ?? 0

    // Accumulate bounties across all hands (KO tournaments)
    const bountiesWon = gameHands.reduce((acc, h) => acc + h.bountiesWon, 0)

    const buyInTotal    = first.buyIn
    const durationSecs  = Math.max(0, Math.round((last.date.getTime() - first.date.getTime()) / 1000))
    const totalPlayers  = isSpin
      ? Math.max(...gameHands.map(h => h.players.length), 2)
      : 0  // unknown for MTTs from hand history alone

    const vpipCount     = gameHands.filter(h => h.vpip).length
    const pfrCount      = gameHands.filter(h => h.pfr).length
    const threeBetCount = gameHands.filter(h => h.threeBet).length
    const threeBetOpps  = gameHands.filter(h => h.threeBetOpportunity).length

    const format = detectBetclicFormat(first.gameName, first.gameMode)
    const type   = isSpin ? 'Spin & Rush' : 'tournament'
    const speed  = isSpin ? 'hyper' : detectBetclicSpeed(first.gameName)

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
      bountiesWon,
      netProfit: Math.round((prizeWon + bountiesWon - buyInTotal) * 100) / 100,
      durationSecs,
      type,
      speed,
      format,
      heroName,
      handsPlayed: gameHands.length,
      vpipPct:     gameHands.length > 0 ? Math.round(vpipCount / gameHands.length * 100) : null,
      pfrPct:      gameHands.length > 0 ? Math.round(pfrCount  / gameHands.length * 100) : null,
      threeBetPct: threeBetOpps > 0 ? Math.round(threeBetCount / threeBetOpps * 100) : null,
      hasSummary: false,
      hasHistory: true,
    })
  }

  return results.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function detectBetclicFormat(name: string, mode: 'spin' | 'tournament'): TournamentFormat {
  if (mode === 'spin') return 'spin_rush'
  const u = name.toUpperCase()
  if (u.includes('MYSTERY')) return 'mystery_ko'
  if (u.includes('PKO') || u.includes('KO') || u.includes('BOUNTY') || u.includes('PROGRESSIF')) return 'ko'
  return 'classic'
}

function detectBetclicSpeed(name: string): string {
  const u = name.toUpperCase()
  if (u.includes('TURBO') || u.includes('HYPER')) return 'turbo'
  return 'normal'
}

function parseBetclicHand(block: string): BetclicHand | null {
  if (!block.includes('*** HEADER ***')) return null

  const headerSection  = block.match(/\*\*\* HEADER \*\*\*([\s\S]*?)(?=\*\*\*)/)?.[1] ?? ''
  const playersSection = block.match(/\*\*\* PLAYERS \*\*\*([\s\S]*?)(?=\*\*\*)/)?.[1] ?? ''
  const preFlopSection = block.match(/\*\*\* PRE-FLOP \*\*\*([\s\S]*?)(?=\*\*\* (?:FLOP|TURN|RIVER|SHOWDOWN|SUMMARY)|$)/)?.[1] ?? ''
  const summarySection = block.match(/\*\*\* SUMMARY \*\*\*([\s\S]*)$/)?.[1] ?? ''

  const gameModeRaw = headerSection.match(/Game Mode:\s*(.+)/)?.[1].trim() ?? ''
  // Only parse Spin (Expresso) and Tournament — skip Cash, Sit&Go, etc.
  if (gameModeRaw !== 'Spin' && gameModeRaw !== 'Tournament') return null
  const gameMode: 'spin' | 'tournament' = gameModeRaw === 'Spin' ? 'spin' : 'tournament'

  const gameIdMatch    = headerSection.match(/Game ID:\s*(\S+)/)
  const gameNameMatch  = headerSection.match(/Game Name:\s*(.+)/)
  const buyInMatch     = headerSection.match(/Buy In:\s*([\d.]+)/)
  const prizePoolMatch = headerSection.match(/Prize pool:\s*([\d.]+)/)
  const dateMatch      = headerSection.match(/Date & Time:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)

  if (!gameIdMatch || !dateMatch) return null

  const gameId    = gameIdMatch[1].trim()
  const gameName  = gameNameMatch?.[1].trim() ?? (gameMode === 'spin' ? 'Expresso' : 'Tournoi Betclic')
  const buyIn     = parseFloat(buyInMatch?.[1] ?? '0')
  const prizePool = parseFloat(prizePoolMatch?.[1] ?? '0')
  const date      = new Date(dateMatch[1].replace(' ', 'T') + 'Z')

  if (!gameId) return null

  const players: string[] = []
  let heroName = ''
  for (const m of playersSection.matchAll(/Seat \d+:\s*([^(]+?)\s*\(\d+\)\s*\[([^\]]+)\]/g)) {
    const name = m[1].trim()
    players.push(name)
    if (m[2].includes('Hero')) heroName = name
  }

  // Placement, prize & bounties from SUMMARY
  let placement: number | null = null
  let prizeWon = 0
  let bountiesWon = 0
  if (heroName && summarySection) {
    const escaped = heroName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Final placement line: "Name finished Xth [and wins Y.YY EUR/€]"
    const placementMatch = summarySection.match(
      new RegExp(`${escaped}\\s+finished\\s+(\\d+)(?:st|nd|rd|th)(?:\\s+and wins\\s+([\\d.]+)\\s*(?:EUR|€))?`)
    )
    if (placementMatch) {
      placement = parseInt(placementMatch[1])
      prizeWon  = placementMatch[2] ? parseFloat(placementMatch[2]) : 0
    }

    // Bounty lines: "Name won Bounty X.XX EUR/€" (can appear multiple times)
    for (const bm of summarySection.matchAll(
      new RegExp(`${escaped}\\s+won\\s+Bounty\\s+([\\d.]+)\\s*(?:EUR|€)`, 'g')
    )) {
      bountiesWon += parseFloat(bm[1])
    }
    bountiesWon = Math.round(bountiesWon * 100) / 100
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

  return {
    gameId, gameName, gameMode, buyIn, prizePool, date,
    players, heroName, placement, prizeWon, bountiesWon,
    vpip, pfr, threeBet, threeBetOpportunity,
  }
}
