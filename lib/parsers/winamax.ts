// ── Winamax hand history & summary parser ──────────────────────────────────

export type WinamaxHandStats = {
  handId: string
  tournamentId: string
  tournamentName: string
  date: Date
  level: number
  totalPlayers: number
  heroPosition: string
  heroStack: number
  buyInTotal: number      // extrait du header de la main (fallback si pas de summary)
  vpip: boolean
  pfr: boolean
  threeBet: boolean
  threeBetOpportunity: boolean
  sawFlop: boolean
  sawTurn: boolean
  sawRiver: boolean
}

export type TournamentStats = {
  tournamentId: string
  tournamentName: string
  date: Date
  handsPlayed: number
  vpipPct: number
  pfrPct: number
  threeBetPct: number
  heroName: string
}

export type TournamentSummary = {
  tournamentId: string
  tournamentName: string
  date: Date
  heroName: string
  buyInPrize: number
  buyInBounty: number
  buyInRake: number
  buyInTotal: number
  placement: number
  totalPlayers: number
  tournamentPrizePool: number   // prize pool TOTAL du tournoi (pas les gains du joueur)
  prizeWon: number              // gains cash réels du joueur (0 si hors places)
  bountiesWon: number           // bounties collectés par le joueur
  netProfit: number             // prizeWon + bountiesWon - buyInTotal
  durationSecs: number
  type: string
  speed: string
  format: TournamentFormat
}

export type ParsedTournament = {
  id: string
  name: string
  date: Date
  buyInTotal: number
  buyInPrize: number
  buyInBounty: number
  buyInRake: number
  placement: number
  totalPlayers: number
  tournamentPrizePool: number
  prizeWon: number
  bountiesWon: number
  netProfit: number
  durationSecs: number
  type: string
  speed: string
  format: TournamentFormat
  heroName: string
  handsPlayed: number
  vpipPct: number | null
  pfrPct: number | null
  threeBetPct: number | null
  hasSummary: boolean
  hasHistory: boolean
}

export type TournamentFormat = 'classic' | 'ko' | 'mystery_ko' | 'space_ko'

export function detectTournamentFormat(name: string, buyInBounty: number): TournamentFormat {
  const n = name.toUpperCase()
  if (n.includes('MYSTERY') || n.includes('MYSTÈRE')) return 'mystery_ko'
  if (n.includes('SPACE')) return 'space_ko'
  if (buyInBounty > 0) return 'ko'
  return 'classic'
}

// ── File type detection ─────────────────────────────────────────────────────

export function detectFileType(text: string): 'summary' | 'history' | 'unknown' {
  if (text.includes('Tournament summary')) return 'summary'
  if (text.includes('*** PRE-FLOP ***') || text.includes('*** ANTE/BLINDS ***')) return 'history'
  return 'unknown'
}

// ── Summary parser ──────────────────────────────────────────────────────────

export function parseTournamentSummary(text: string): TournamentSummary[] {
  const results: TournamentSummary[] = []
  const blocks = text.split(/(?=Winamax Poker - Tournament summary)/).filter(b => b.trim())

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim())

    const headerLine = lines[0] || ''
    const headerMatch = headerLine.match(/Tournament summary : (.+?)\((\d+)\)/)
    if (!headerMatch) continue
    const tournamentName = headerMatch[1].trim()
    const tournamentId = headerMatch[2]

    const get = (prefix: string) =>
      lines.find(l => l.startsWith(prefix))?.replace(prefix, '').trim() ?? ''

    const heroName = get('Player : ')

    // Buy-In : "2.25€ + 2.25€ + 0.50€"  or  "1.80€ + 0.20€"
    const buyInRaw = get('Buy-In : ')
    const parts = buyInRaw.split('+').map(p => parseFloat(p.replace(/[€\s]/g, '')) || 0)
    let buyInPrize = 0, buyInBounty = 0, buyInRake = 0
    if (parts.length >= 3) { [buyInPrize, buyInBounty, buyInRake] = parts }
    else if (parts.length === 2) { [buyInPrize, buyInRake] = parts }
    const buyInTotal = Math.round((buyInPrize + buyInBounty + buyInRake) * 100) / 100

    const totalPlayers = parseInt(get('Registered players : ')) || 0
    const type = get('Type : ')
    const speed = get('Speed : ')

    // tournamentPrizePool = prize pool TOTAL du tournoi (pas les gains du joueur)
    const prizeRaw = get('Prizepool : ')
    const tournamentPrizePool = parseFloat(prizeRaw.replace(/[€\s]/g, '')) || 0

    // Gains réels du joueur via la ligne "You won"
    // Formats possibles :
    //   "You won 9.58€ + Bounty 4.07€"
    //   "You won Bounty 2.50€"
    //   "You won 4€"
    //   (absente si le joueur ne gagne rien)
    const wonLine = lines.find(l => l.startsWith('You won')) ?? ''
    let prizeWon = 0
    let bountiesWon = 0
    if (wonLine) {
      const wonBoth = wonLine.match(/You won ([\d.]+)€\s*\+\s*Bounty\s+([\d.]+)€/)
      const wonBountyOnly = wonLine.match(/You won Bounty\s+([\d.]+)€/)
      const wonPrizeOnly = wonLine.match(/You won ([\d.]+)€/)
      if (wonBoth) {
        prizeWon = parseFloat(wonBoth[1])
        bountiesWon = parseFloat(wonBoth[2])
      } else if (wonBountyOnly) {
        bountiesWon = parseFloat(wonBountyOnly[1])
      } else if (wonPrizeOnly) {
        prizeWon = parseFloat(wonPrizeOnly[1])
      }
    }
    const netProfit = Math.round((prizeWon + bountiesWon - buyInTotal) * 100) / 100

    // Date: "Tournament started 2026/04/01 10:30:00 UTC"
    const dateLine = lines.find(l => l.startsWith('Tournament started')) ?? ''
    const dateMatch = dateLine.match(/(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/)
    const date = dateMatch ? new Date(dateMatch[1].replace(/\//g, '-') + 'Z') : new Date()

    // Duration: "You played 47min 29s"  or  "You played 2h 15min 30s"
    const durationLine = lines.find(l => l.startsWith('You played')) ?? ''
    let durationSecs = 0
    const hm = durationLine.match(/(\d+)h/);    if (hm) durationSecs += parseInt(hm[1]) * 3600
    const mm = durationLine.match(/(\d+)min/);  if (mm) durationSecs += parseInt(mm[1]) * 60
    const sm = durationLine.match(/(\d+)s/);    if (sm) durationSecs += parseInt(sm[1])

    // Placement: "You finished in 170th place"
    const placeLine = lines.find(l => l.startsWith('You finished in')) ?? ''
    const placeMatch = placeLine.match(/in (\d+)/)
    const placement = placeMatch ? parseInt(placeMatch[1]) : 0

    results.push({
      tournamentId, tournamentName, heroName, date,
      buyInPrize, buyInBounty, buyInRake, buyInTotal,
      placement, totalPlayers, tournamentPrizePool,
      prizeWon, bountiesWon, netProfit,
      durationSecs, type, speed,
      format: detectTournamentFormat(tournamentName, buyInBounty),
    })
  }

  return results
}

// ── Hand history parser ─────────────────────────────────────────────────────

export function parseHandHistory(text: string): { heroName: string; hands: WinamaxHandStats[] } {
  const hands: WinamaxHandStats[] = []
  let heroName = ''

  const rawHands = text.split(/\n{2,}/).filter(h => h.includes('Winamax Poker'))

  for (const raw of rawHands) {
    const lines = raw.split('\n')
    const header = lines[0] ?? ''

    const hm = header.match(/Tournament "(.+)" buyIn:.+level: (\d+) - HandId: (#[\d-]+) - .+\((\d+)\/(\d+)\/(\d+)\) - (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) UTC/)
    if (!hm) continue

    const tournamentName = hm[1].trim()
    const level = parseInt(hm[2])
    const handId = hm[3]
    const date = new Date(hm[7].replace(/\//g, '-') + 'Z')

    // Parse buyIn from header: "buyIn: 1.80€ + 0.20€" or "buyIn: 2.25€ + 2.25€ + 0.50€"
    const buyInMatch = header.match(/buyIn:\s*([\d.]+)€\s*\+\s*([\d.]+)€(?:\s*\+\s*([\d.]+)€)?/)
    let buyInTotal = 0
    if (buyInMatch) {
      const p1 = parseFloat(buyInMatch[1]) || 0
      const p2 = parseFloat(buyInMatch[2]) || 0
      const p3 = parseFloat(buyInMatch[3] ?? '0') || 0
      buyInTotal = Math.round((p1 + p2 + p3) * 100) / 100
    }

    const tableLine = lines.find(l => l.startsWith('Table:')) ?? ''
    const tidm = tableLine.match(/\((\d+)\)/)
    const tournamentId = tidm ? tidm[1] : ''
    const btnm = tableLine.match(/Seat #(\d+) is the button/)
    const buttonSeat = btnm ? parseInt(btnm[1]) : -1

    const dealtLine = lines.find(l => l.startsWith('Dealt to ')) ?? ''
    const dm = dealtLine.match(/^Dealt to (.+) \[/)
    if (!dm) continue
    heroName = dm[1]

    const heroSeatLine = lines.find(l => /^Seat \d+: /.test(l) && l.includes(heroName)) ?? ''
    const hsm = heroSeatLine.match(/^Seat (\d+): .+\((\d+)/)
    const heroSeat = hsm ? parseInt(hsm[1]) : -1
    const heroStack = hsm ? parseInt(hsm[2]) : 0

    const seatLines = lines.filter(l => /^Seat \d+: /.test(l))
    const totalPlayers = seatLines.length

    const isButton = heroSeat === buttonSeat
    const isSB = lines.some(l => l.startsWith(`${heroName} posts small blind`))
    const isBB = lines.some(l => l.startsWith(`${heroName} posts big blind`))
    const heroPosition = isButton ? 'BTN' : isSB ? 'SB' : isBB ? 'BB' : 'other'

    let inPreflop = false
    let vpip = false
    let pfr = false
    let threeBet = false
    let threeBetOpportunity = false
    let raisesBeforeHeroActed = 0
    let heroActedPreflop = false
    let inHand = true
    let sawFlop = false
    let sawTurn = false
    let sawRiver = false

    for (const line of lines) {
      if (line.startsWith('*** PRE-FLOP ***'))  { inPreflop = true; continue }
      if (line.startsWith('*** FLOP ***'))       { inPreflop = false; if (inHand) sawFlop = true; continue }
      if (line.startsWith('*** TURN ***'))       { if (inHand) sawTurn = true; continue }
      if (line.startsWith('*** RIVER ***'))      { if (inHand) sawRiver = true; continue }
      if (line.startsWith('*** '))               { inPreflop = false; continue }

      if (inPreflop) {
        const isHeroLine = line.startsWith(`${heroName} `)

        if (!isHeroLine && !heroActedPreflop && line.includes(' raises ')) {
          raisesBeforeHeroActed++
        }

        if (isHeroLine) {
          if (line.includes(' raises ')) {
            vpip = true; pfr = true; heroActedPreflop = true
            if (raisesBeforeHeroActed === 1) threeBet = true       // exactement 1 raise avant = 3-bet
            if (raisesBeforeHeroActed >= 1) threeBetOpportunity = true
          } else if (line.includes(' calls ')) {
            vpip = true; heroActedPreflop = true
            if (raisesBeforeHeroActed === 1) threeBetOpportunity = true
          } else if (line.includes(' folds')) {
            inHand = false; heroActedPreflop = true
            if (raisesBeforeHeroActed === 1) threeBetOpportunity = true
          } else if (line.includes(' checks')) {
            heroActedPreflop = true
          }
        }
      } else {
        if (line.startsWith(`${heroName} folds`)) inHand = false
      }
    }

    hands.push({
      handId, tournamentId, tournamentName, buyInTotal, date, level, totalPlayers,
      heroPosition, heroStack, vpip, pfr, threeBet, threeBetOpportunity,
      sawFlop, sawTurn, sawRiver,
    })
  }

  return { heroName, hands }
}

// ── Stats aggregator ────────────────────────────────────────────────────────

export function aggregateHandStats(
  tournamentId: string,
  tournamentName: string,
  heroName: string,
  hands: WinamaxHandStats[],
): TournamentStats {
  const h = hands.filter(x => x.tournamentId === tournamentId)
  const total = h.length
  if (total === 0) return { tournamentId, tournamentName, heroName, date: new Date(), handsPlayed: 0, vpipPct: 0, pfrPct: 0, threeBetPct: 0 }

  const vpipCount = h.filter(x => x.vpip).length
  const pfrCount = h.filter(x => x.pfr).length
  const threeBetOpp = h.filter(x => x.threeBetOpportunity).length
  const threeBetCount = h.filter(x => x.threeBet).length
  const round1 = (n: number) => Math.round(n * 10) / 10

  return {
    tournamentId, tournamentName, heroName,
    date: h[0].date,
    handsPlayed: total,
    vpipPct: round1(vpipCount / total * 100),
    pfrPct: round1(pfrCount / total * 100),
    threeBetPct: threeBetOpp > 0 ? round1(threeBetCount / threeBetOpp * 100) : 0,
  }
}

// ── Merge summaries + hand stats ────────────────────────────────────────────

export function mergeTournamentData(
  summaries: TournamentSummary[],
  allHands: WinamaxHandStats[],
  heroName: string,
): ParsedTournament[] {
  // BUG FIX : accumulate re-entries (multiple blocks with same tournamentId)
  const summaryMap = new Map<string, TournamentSummary>()
  for (const s of summaries) {
    if (summaryMap.has(s.tournamentId)) {
      const existing = summaryMap.get(s.tournamentId)!
      existing.buyInTotal    = Math.round((existing.buyInTotal + s.buyInTotal) * 100) / 100
      existing.buyInPrize    = Math.round((existing.buyInPrize + s.buyInPrize) * 100) / 100
      existing.buyInBounty   = Math.round((existing.buyInBounty + s.buyInBounty) * 100) / 100
      existing.buyInRake     = Math.round((existing.buyInRake + s.buyInRake) * 100) / 100
      existing.durationSecs += s.durationSecs
      // Keep final result (latest block = actual finish)
      existing.placement     = s.placement
      existing.totalPlayers  = s.totalPlayers
      existing.prizeWon      = s.prizeWon
      existing.bountiesWon   = s.bountiesWon
      existing.netProfit     = Math.round((s.prizeWon + s.bountiesWon - existing.buyInTotal) * 100) / 100
    } else {
      summaryMap.set(s.tournamentId, { ...s })
    }
  }

  const historyMap = new Map<string, WinamaxHandStats[]>()
  for (const hand of allHands) {
    if (!historyMap.has(hand.tournamentId)) historyMap.set(hand.tournamentId, [])
    historyMap.get(hand.tournamentId)!.push(hand)
  }

  const allIds = new Set([...summaryMap.keys(), ...historyMap.keys()])
  const results: ParsedTournament[] = []

  for (const id of allIds) {
    const s = summaryMap.get(id)
    const hands = historyMap.get(id) ?? []
    const stats = hands.length > 0
      ? aggregateHandStats(id, s?.tournamentName ?? hands[0]?.tournamentName ?? '', heroName, hands)
      : null

    // Fallback: if no summary, use buyIn from first hand header (all hands of same tournament share same buyIn)
    const buyInTotal = s?.buyInTotal ?? hands[0]?.buyInTotal ?? 0
    const prizeWon = s?.prizeWon ?? 0
    const bountiesWon = s?.bountiesWon ?? 0

    results.push({
      id,
      name: s?.tournamentName ?? stats?.tournamentName ?? id,
      date: s?.date ?? stats?.date ?? new Date(),
      buyInTotal,
      buyInPrize: s?.buyInPrize ?? 0,
      buyInBounty: s?.buyInBounty ?? 0,
      buyInRake: s?.buyInRake ?? 0,
      placement: s?.placement ?? 0,
      totalPlayers: s?.totalPlayers ?? 0,
      tournamentPrizePool: s?.tournamentPrizePool ?? 0,
      prizeWon,
      bountiesWon,
      netProfit: s?.netProfit ?? Math.round((prizeWon + bountiesWon - buyInTotal) * 100) / 100,
      durationSecs: s?.durationSecs ?? 0,
      type: s?.type ?? 'tournament',
      speed: s?.speed ?? '',
      format: s?.format ?? detectTournamentFormat(s?.tournamentName ?? hands[0]?.tournamentName ?? '', s?.buyInBounty ?? 0),
      heroName,
      handsPlayed: hands.length,
      vpipPct: stats?.vpipPct ?? null,
      pfrPct: stats?.pfrPct ?? null,
      threeBetPct: stats?.threeBetPct ?? null,
      hasSummary: summaryMap.has(id),
      hasHistory: historyMap.has(id),
    })
  }

  return results.sort((a, b) => b.date.getTime() - a.date.getTime())
}
