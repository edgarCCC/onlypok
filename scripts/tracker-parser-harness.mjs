/* Harness de test des parsers tracker sur les fichiers réels */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { detectFileType, parseTournamentSummary, parseHandHistory, mergeTournamentData } from '../lib/parsers/winamax.ts'
import { isBetclicFile, parseBetclicHands, buildBetclicTournaments } from '../lib/parsers/betclic.ts'

const eur = n => `${n >= 0 ? '+' : ''}${n.toFixed(2)}€`

/* ═══ BETCLIC ═══ */
console.log('════════ BETCLIC ════════')
const bcDir = '/Users/caillaud/Downloads/betclic/Betclic_59431916_ExportHH_2026-7-13_0-30-26'
const bcFiles = readdirSync(bcDir).filter(f => f.endsWith('.txt'))
let bcHands = []
const gameModes = {}
for (const f of bcFiles) {
  const text = readFileSync(join(bcDir, f), 'utf8')
  if (!isBetclicFile(text)) { console.log(`  ✗ non reconnu Betclic : ${f}`); continue }
  // recense les Game Modes présents dans le fichier brut
  for (const m of text.matchAll(/Game Mode:\s*(.+)/g)) {
    const mode = m[1].trim()
    gameModes[mode] = (gameModes[mode] ?? 0) + 1
  }
  const hands = parseBetclicHands(text)
  bcHands.push(...hands)
}
console.log(`fichiers: ${bcFiles.length} | mains brutes par mode:`, gameModes)
console.log(`mains parsées (Spin+Tournament): ${bcHands.length}`)
const bcTournois = buildBetclicTournaments(bcHands)
const bcSpins = bcTournois.filter(t => t.format === 'spin_rush')
const bcMtts  = bcTournois.filter(t => t.format !== 'spin_rush')
console.log(`tournois reconstruits: ${bcTournois.length} (${bcSpins.length} spins, ${bcMtts.length} MTT)`)
console.log(`sans placement: ${bcTournois.filter(t => !t.placement).length}`)
console.log(`buy-in total: ${bcTournois.reduce((a, t) => a + t.buyInTotal, 0).toFixed(2)}€ | profit net: ${eur(bcTournois.reduce((a, t) => a + t.netProfit, 0))}`)
console.log('héros:', [...new Set(bcHands.map(h => h.heroName).filter(Boolean))])
// échantillon
for (const t of bcTournois.slice(0, 4)) {
  console.log(`  ex: ${t.name} | ${t.date.toISOString().slice(0, 10)} | buyin ${t.buyInTotal}€ | place ${t.placement}/${t.totalPlayers} | gain ${t.prizeWon}€ | net ${eur(t.netProfit)} | ${t.handsPlayed} mains | vpip ${t.vpipPct}%`)
}

/* ═══ WINAMAX ═══ */
console.log('\n════════ WINAMAX (Mia WaIIace) ════════')
const wDir = '/Users/caillaud/Library/Application Support/winamax/documents/accounts/Mia WaIIace/history'
const wFiles = readdirSync(wDir).filter(f => f.endsWith('.txt'))
const summaries = []
const allHands = []
let hero = ''
let nSummary = 0, nHistory = 0, nUnknown = 0
const unknownSamples = []
for (const f of wFiles) {
  const text = readFileSync(join(wDir, f), 'utf8')
  const kind = detectFileType(text)
  if (kind === 'summary') {
    nSummary++
    const s = parseTournamentSummary(text)
    if (s.length === 0) console.log(`  ✗ summary non parsé : ${f}`)
    summaries.push(...s)
    if (!hero && s[0]) hero = s[0].heroName
  } else if (kind === 'history') {
    nHistory++
    const { heroName: h, hands } = parseHandHistory(text)
    if (hands.length === 0) console.log(`  ✗ history 0 mains : ${f}`)
    allHands.push(...hands)
    if (!hero) hero = h
  } else {
    nUnknown++
    if (unknownSamples.length < 3) unknownSamples.push(f)
  }
}
console.log(`fichiers: ${wFiles.length} | summaries: ${nSummary} | histories: ${nHistory} | inconnus: ${nUnknown}`, unknownSamples)
console.log(`summaries parsés: ${summaries.length} | mains parsées: ${allHands.length} | héros: ${hero}`)
const wTournois = mergeTournamentData(summaries, allHands, hero)
console.log(`tournois fusionnés: ${wTournois.length}`)
console.log(`  avec summary: ${wTournois.filter(t => t.hasSummary).length} | avec history: ${wTournois.filter(t => t.hasHistory).length} | history SEUL (pas de résumé): ${wTournois.filter(t => !t.hasSummary).length}`)
console.log(`  sans placement: ${wTournois.filter(t => !t.placement).length} | buy-in 0: ${wTournois.filter(t => !t.buyInTotal).length}`)
console.log(`buy-in total: ${wTournois.reduce((a, t) => a + t.buyInTotal, 0).toFixed(2)}€ | profit net: ${eur(wTournois.reduce((a, t) => a + t.netProfit, 0))}`)
const formats = {}
for (const t of wTournois) formats[t.format] = (formats[t.format] ?? 0) + 1
console.log('formats:', formats)
for (const t of wTournois.slice(0, 5)) {
  console.log(`  ex: ${t.name} | ${t.date.toISOString().slice(0, 10)} | buyin ${t.buyInTotal}€ | place ${t.placement}/${t.totalPlayers} | gain ${t.prizeWon}€ + KO ${t.bountiesWon}€ | net ${eur(t.netProfit)} | ${t.handsPlayed} mains`)
}
