'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Upload, Trash2, TrendingUp, TrendingDown, BarChart2,
  Target, Users, Zap, RefreshCw, FileText, ChevronLeft,
  ChevronRight, Download, AlertCircle, Layers,
} from 'lucide-react'

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:      '#07090e',
  card:    'rgba(240,244,255,0.03)',
  border:  'rgba(240,244,255,0.08)',
  cream:   '#f0f4ff',
  silver:  'rgba(240,244,255,0.45)',
  dim:     'rgba(240,244,255,0.2)',
  violet:  '#7c3aed',
  cyan:    '#06b6d4',
  green:   '#4ade80',
  red:     '#ef4444',
  amber:   '#f59e0b',
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface ParsedHand {
  id:             string
  timestamp:      string        // ISO
  gameType:       string
  blindsBB:       number
  position:       string
  heroCards:      string[]
  vpip:           boolean
  pfr:            boolean
  threeBet:       boolean
  facedThreeBet:  boolean
  postflopAgg:    number        // bets + raises post-flop
  postflopCalls:  number
  wtsd:           boolean
  wsd:            boolean
  resultEuro:     number
  resultBB:       number
}

interface Stats {
  total:    number
  vpip:     number
  pfr:      number
  threeBet: number
  af:       number
  wtsd:     number
  wsd:      number
  bb100:    number
  totalEuro:number
}

// ─── Parser ─────────────────────────────────────────────────────────────────
function parseWinamaxFile(text: string): { hands: ParsedHand[]; errors: number } {
  // Split into individual hands — each starts with "Winamax Poker"
  const rawHands = text.split(/(?=Winamax Poker -)/).filter(h => h.trim().length > 20)
  const hands: ParsedHand[] = []
  let errors = 0

  for (const raw of rawHands) {
    try {
      const hand = parseSingleHand(raw)
      if (hand) hands.push(hand)
      else errors++
    } catch {
      errors++
    }
  }
  return { hands, errors }
}

function parseSingleHand(raw: string): ParsedHand | null {
  // Must start with Winamax header
  if (!raw.startsWith('Winamax Poker')) return null

  // Blinds — try NLH X/Y or PLO X/Y
  const blindMatch = raw.match(/(?:NLH|PLO) ([\d.]+)\/([\d.]+)/)
  if (!blindMatch) return null
  const bigBlind = parseFloat(blindMatch[2])
  if (!bigBlind) return null

  const gameTypeMatch = raw.match(/Winamax Poker - (\w+)/)
  const gameType = gameTypeMatch?.[1] ?? 'CashGame'

  // HandId for dedup
  const idMatch = raw.match(/HandId:\s*([\w-]+)/)
  const id = idMatch?.[1] ?? `${Date.now()}_${Math.random()}`

  // Timestamp
  const tsMatch = raw.match(/(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/)
  const timestamp = tsMatch ? new Date(tsMatch[1].replace(/\//g, '-')).toISOString() : new Date().toISOString()

  // Hero seat number
  const heroSeatMatch = raw.match(/Seat (\d+): Hero\b/)
  if (!heroSeatMatch) return null
  const heroSeat = parseInt(heroSeatMatch[1])

  // All seats (count players)
  const allSeats = [...raw.matchAll(/^Seat (\d+): .+/gm)].map(m => parseInt(m[1]))
  const numPlayers = allSeats.length

  // Position from SUMMARY section labels
  const summaryPart = raw.split('*** SUMMARY ***')[1] ?? ''
  const btnSeatM  = summaryPart.match(/Seat (\d+) \(button\)/)
  const sbSeatM   = summaryPart.match(/Seat (\d+) \(small blind\)/)
  const bbSeatM   = summaryPart.match(/Seat (\d+) \(big blind\)/)
  const btnSeat   = btnSeatM ? parseInt(btnSeatM[1]) : -1
  const sbSeat    = sbSeatM  ? parseInt(sbSeatM[1])  : -1
  const bbSeat    = bbSeatM  ? parseInt(bbSeatM[1])  : -1

  let position = 'Other'
  if (heroSeat === btnSeat)     position = 'BTN'
  else if (heroSeat === sbSeat) position = 'SB'
  else if (heroSeat === bbSeat) position = 'BB'
  else if (btnSeat !== -1 && allSeats.length > 0) {
    const btnIdx  = allSeats.indexOf(btnSeat)
    const heroIdx = allSeats.indexOf(heroSeat)
    if (btnIdx >= 0 && heroIdx >= 0) {
      const dist = (heroIdx - btnIdx + numPlayers) % numPlayers
      const posMap: Record<number, Record<number, string>> = {
        6: { 1:'SB', 2:'BB', 3:'LJ', 4:'HJ', 5:'CO' },
        5: { 1:'SB', 2:'BB', 3:'LJ', 4:'CO' },
        4: { 1:'SB', 2:'BB', 3:'LJ' },
        3: { 1:'SB', 2:'BB' },
      }
      position = posMap[numPlayers]?.[dist] ?? 'Other'
    }
  }

  // Hero hole cards
  const cardsMatch = raw.match(/Dealt to Hero[^[]*\[([^\]]+)\]/)
  const heroCards  = cardsMatch ? cardsMatch[1].split(' ').filter(Boolean) : []

  // Pre-flop section
  const preFlopSection = raw.split('*** PRE-FLOP ***')[1]?.split(/\*\*\* (?:FLOP|TURN|RIVER|SHOW DOWN|SUMMARY)/)[0] ?? ''

  // VPIP: voluntary put money in preflop (not counting BB check)
  const heroCallsPF  = /Hero calls/.test(preFlopSection)
  const heroRaisesPF = /Hero raises/.test(preFlopSection)
  const vpip = heroCallsPF || heroRaisesPF
  const pfr  = heroRaisesPF

  // 3-bet: hero raises after another player has raised preflop
  let priorRaise = false
  let threeBet   = false
  let facedThreeBet = false
  let heroHasRaisedPF = false
  for (const line of preFlopSection.split('\n')) {
    if (!line.includes('Hero') && /raises/.test(line)) {
      if (heroHasRaisedPF) facedThreeBet = true
      else priorRaise = true
    }
    if (line.includes('Hero') && /raises/.test(line)) {
      if (priorRaise) threeBet = true
      heroHasRaisedPF = true
    }
  }

  // Post-flop aggression
  const postFlopText = raw.split('*** FLOP ***')[1] ?? ''
  const heroPostBets  = (postFlopText.match(/Hero bets/g)   ?? []).length
  const heroPostRaise = (postFlopText.match(/Hero raises/g)  ?? []).length
  const heroPostCalls = (postFlopText.match(/Hero calls/g)   ?? []).length

  // WTSD / WSD
  const showdownText = raw.split('*** SHOW DOWN ***')[1] ?? ''
  const wtsd = showdownText.includes('Hero') || /Hero showed/.test(raw)
  const wsd  = /Hero showed.+won/.test(raw)

  // Net result: sum collected (from *** lines and SUMMARY) minus contributed
  let contributed = 0
  // Posts
  for (const m of raw.matchAll(/Hero posts [^\d]*([\d.]+)€/g))
    contributed += parseFloat(m[1])
  // Calls
  for (const m of raw.matchAll(/Hero calls ([\d.]+)€/g))
    contributed += parseFloat(m[1])
  // Bets
  for (const m of raw.matchAll(/Hero bets ([\d.]+)€/g))
    contributed += parseFloat(m[1])
  // Raises: "raises X to Y" — add X (the increment)
  for (const m of raw.matchAll(/Hero raises ([\d.]+)€/g))
    contributed += parseFloat(m[1])

  // Collected
  let collected = 0
  // In-hand collection lines
  for (const m of raw.matchAll(/Hero collected ([\d.]+)€/g))
    collected += parseFloat(m[1])
  // Summary "won (X€)"
  for (const m of summaryPart.matchAll(new RegExp(`Seat\\s+${heroSeat}\\b[^\n]*won \\(([\\.\\d]+)€\\)`, 'g')))
    collected += parseFloat(m[1])

  const resultEuro = collected > 0 ? collected - contributed : -contributed
  const resultBB   = bigBlind > 0 ? resultEuro / bigBlind : 0

  return {
    id, timestamp, gameType, blindsBB: bigBlind,
    position, heroCards, vpip, pfr, threeBet, facedThreeBet,
    postflopAgg: heroPostBets + heroPostRaise, postflopCalls: heroPostCalls,
    wtsd, wsd, resultEuro, resultBB,
  }
}

// ─── Stats calculation ───────────────────────────────────────────────────────
function calcStats(hands: ParsedHand[]): Stats {
  const n = hands.length
  if (n === 0) return { total:0, vpip:0, pfr:0, threeBet:0, af:0, wtsd:0, wsd:0, bb100:0, totalEuro:0 }

  const vpipCount   = hands.filter(h => h.vpip).length
  const pfrCount    = hands.filter(h => h.pfr).length
  const threeBetOpps= hands.filter(h => h.facedThreeBet).length
  const threeBetDone= hands.filter(h => h.threeBet).length
  const wtsdCount   = hands.filter(h => h.wtsd).length
  const wsdCount    = hands.filter(h => h.wsd).length
  const totalAgg    = hands.reduce((s, h) => s + h.postflopAgg, 0)
  const totalCalls  = hands.reduce((s, h) => s + h.postflopCalls, 0)
  const totalEuro   = hands.reduce((s, h) => s + h.resultEuro, 0)
  const totalBB     = hands.reduce((s, h) => s + h.resultBB, 0)

  return {
    total:    n,
    vpip:     Math.round((vpipCount / n) * 100),
    pfr:      Math.round((pfrCount  / n) * 100),
    threeBet: threeBetOpps > 0 ? Math.round((threeBetDone / threeBetOpps) * 100) : 0,
    af:       totalCalls > 0 ? Math.round((totalAgg / totalCalls) * 10) / 10 : 0,
    wtsd:     Math.round((wtsdCount / n) * 100),
    wsd:      wtsdCount > 0 ? Math.round((wsdCount / wtsdCount) * 100) : 0,
    bb100:    Math.round((totalBB / n) * 100 * 10) / 10,
    totalEuro,
  }
}

// ─── Rolling bb/100 chart data ───────────────────────────────────────────────
function rollingBB100(hands: ParsedHand[], window = 200): number[] {
  return hands.map((_, i) => {
    const slice = hands.slice(Math.max(0, i - window + 1), i + 1)
    const sum   = slice.reduce((s, h) => s + h.resultBB, 0)
    return Math.round((sum / slice.length) * 100 * 10) / 10
  })
}

function cumulativeEuro(hands: ParsedHand[]): number[] {
  let acc = 0
  return hands.map(h => { acc += h.resultEuro; return Math.round(acc * 100) / 100 })
}

// ─── SVG Line Chart ──────────────────────────────────────────────────────────
function LineChart({
  data, color, fillPositive, fillNegative, label, unit = '',
  height = 160,
}: {
  data: number[]; color: string; fillPositive?: string; fillNegative?: string
  label?: string; unit?: string; height?: number
}) {
  if (data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.silver, fontSize: 12 }}>
      Pas assez de données
    </div>
  )

  const W = 700
  const H = height
  const pad = { t: 16, r: 16, b: 28, l: 48 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  const min = Math.min(...data, 0)
  const max = Math.max(...data, 0)
  const range = max - min || 1

  const toX = (i: number) => pad.l + (i / (data.length - 1)) * innerW
  const toY = (v: number) => pad.t + innerH - ((v - min) / range) * innerH
  const zeroY = toY(0)

  // Build smooth bezier path
  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }))
  let pathD = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 3
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) / 3
    pathD += ` C ${cp1x} ${pts[i-1].y} ${cp2x} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }

  // Fill above zero (positive)
  const fillAboveD = `${pathD} L ${pts[pts.length-1].x} ${zeroY} L ${pts[0].x} ${zeroY} Z`
  // Fill below zero (negative)
  const fillBelowD = `${pathD} L ${pts[pts.length-1].x} ${zeroY} L ${pts[0].x} ${zeroY} Z`

  // Y axis ticks
  const ticks = [min, 0, max].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="fillPos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillPositive ?? color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={fillPositive ?? color} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="fillNeg" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fillNegative ?? C.red} stopOpacity="0.25" />
          <stop offset="100%" stopColor={fillNegative ?? C.red} stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="clipAbove">
          <rect x={pad.l} y={pad.t} width={innerW} height={Math.max(0, zeroY - pad.t)} />
        </clipPath>
        <clipPath id="clipBelow">
          <rect x={pad.l} y={zeroY} width={innerW} height={Math.max(0, pad.t + innerH - zeroY)} />
        </clipPath>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + t * innerH
        return <line key={t} x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="rgba(232,228,220,0.05)" strokeWidth="1" />
      })}

      {/* Zero line */}
      {min < 0 && max > 0 && (
        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY}
          stroke="rgba(232,228,220,0.2)" strokeWidth="1" strokeDasharray="4,4" />
      )}

      {/* Fill positive */}
      {fillPositive !== 'none' && (
        <path d={fillAboveD} fill="url(#fillPos)" clipPath="url(#clipAbove)" />
      )}
      {/* Fill negative */}
      {fillNegative !== 'none' && min < 0 && (
        <path d={fillBelowD} fill="url(#fillNeg)" clipPath="url(#clipBelow)" />
      )}

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Y ticks */}
      {ticks.map(v => (
        <text key={v} x={pad.l - 6} y={toY(v) + 4} textAnchor="end"
          fontSize="9" fill="rgba(232,228,220,0.35)">
          {v > 0 ? '+' : ''}{Math.round(v * 10) / 10}{unit}
        </text>
      ))}

      {/* X axis labels */}
      {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle"
          fontSize="9" fill="rgba(232,228,220,0.3)">
          #{i + 1}
        </text>
      ))}
    </svg>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ElementType
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {Icon && <Icon size={11} color={C.silver} />}
        <span style={{ fontSize: 10, fontWeight: 700, color: C.silver, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color ?? C.cream, letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.silver, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── STORAGE KEY ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pokme_track_v1'

// ─── Positions ───────────────────────────────────────────────────────────────
const POSITIONS = ['BTN', 'CO', 'HJ', 'LJ', 'SB', 'BB', 'Other']

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function TrackPage() {
  const [hands,      setHands]      = useState<ParsedHand[]>([])
  const [tab,        setTab]        = useState<'overview' | 'financial' | 'position' | 'hands' | 'story'>('overview')
  const [page,       setPage]       = useState(0)
  const [importing,  setImporting]  = useState(false)
  const [parseError, setParseError] = useState('')
  const [dragOver,   setDragOver]   = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ParsedHand[]
        setHands(Array.isArray(parsed) ? parsed : [])
      }
    } catch { /* ignore */ }
  }, [])

  // Save to localStorage whenever hands change
  useEffect(() => {
    if (hands.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hands)) } catch { /* quota */ }
    }
  }, [hands])

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setImporting(true)
    setParseError('')
    let totalHands = 0
    let totalErrors = 0
    const newHands: ParsedHand[] = []

    for (const file of Array.from(files)) {
      const text = await file.text()
      const { hands: parsed, errors } = parseWinamaxFile(text)
      totalHands += parsed.length
      totalErrors += errors
      newHands.push(...parsed)
    }

    if (newHands.length === 0) {
      setParseError('Aucune main reconnue. Vérifiez que le fichier est au format Winamax (.txt).')
    } else {
      setHands(prev => {
        const existingIds = new Set(prev.map(h => h.id))
        const fresh = newHands.filter(h => !existingIds.has(h.id))
        const merged = [...prev, ...fresh].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        return merged
      })
      if (totalErrors > 0) {
        setParseError(`${newHands.length} mains importées, ${totalErrors} ignorées (format non reconnu).`)
      }
    }
    setImporting(false)
  }, [])

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }

  const clearAll = () => {
    setHands([])
    localStorage.removeItem(STORAGE_KEY)
    setConfirmClear(false)
  }

  const stats     = useMemo(() => calcStats(hands), [hands])
  const bbSeries  = useMemo(() => rollingBB100(hands), [hands])
  const euSeries  = useMemo(() => cumulativeEuro(hands), [hands])

  const posSeries = useMemo(() => {
    return POSITIONS.map(pos => {
      const ph = hands.filter(h => h.position === pos)
      const n  = ph.length
      return {
        pos,
        count: n,
        vpip:  n ? Math.round((ph.filter(h => h.vpip).length / n) * 100) : 0,
        pfr:   n ? Math.round((ph.filter(h => h.pfr).length  / n) * 100) : 0,
        bb100: n ? Math.round((ph.reduce((s, h) => s + h.resultBB, 0) / n) * 100 * 10) / 10 : 0,
      }
    }).filter(p => p.count > 0)
  }, [hands])

  const pagedHands = useMemo(() => {
    const reversed = [...hands].reverse()
    return reversed.slice(page * 20, (page + 1) * 20)
  }, [hands, page])
  const totalPages = Math.ceil(hands.length / 20)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.cream }}>
      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 25% at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '40px 24px 100px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(124,58,237,0.15)`, border: `1px solid rgba(124,58,237,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={16} color={C.violet} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: C.cream, letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--font-syne,sans-serif)' }}>Track.me</h1>
            </div>
            <p style={{ fontSize: 13, color: C.silver, margin: 0 }}>
              {hands.length > 0 ? `${hands.length.toLocaleString('fr')} mains analysées` : 'Importe tes historiques Winamax pour analyser ton jeu'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.violet}, ${C.cyan})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: importing ? 'wait' : 'pointer', boxShadow: `0 4px 20px rgba(124,58,237,0.35)` }}>
              <Upload size={14} />
              {importing ? 'Import…' : 'Importer .txt'}
            </button>
            <input ref={fileRef} type="file" accept=".txt" multiple style={{ display: 'none' }} onChange={handleFiles} />
            {hands.length > 0 && !confirmClear && (
              <button onClick={() => setConfirmClear(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.06)', color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={13} /> Effacer
              </button>
            )}
            {confirmClear && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.silver }}>Confirmer ?</span>
                <button onClick={clearAll} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Oui, tout effacer</button>
                <button onClick={() => setConfirmClear(false)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Parse error banner ── */}
        {parseError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 12, marginBottom: 20 }}>
            <AlertCircle size={14} color={C.red} />
            <span style={{ fontSize: 13, color: C.cream }}>{parseError}</span>
          </div>
        )}

        {/* ── Empty State ── */}
        {hands.length === 0 ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? C.violet : 'rgba(232,228,220,0.12)'}`,
              borderRadius: 20, padding: '64px 32px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(124,58,237,0.05)' : 'transparent',
              transition: 'all 0.2s',
            }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124,58,237,0.1)', border: `1px solid rgba(124,58,237,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Upload size={24} color={C.violet} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.cream, marginBottom: 8 }}>Glisse tes fichiers ici</h2>
            <p style={{ fontSize: 14, color: C.silver, maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.6 }}>
              Importe les historiques de mains Winamax (.txt) — trouve-les dans{' '}
              <code style={{ background: 'rgba(232,228,220,0.06)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                Documents/Winamax/accounts/[pseudo]/history/
              </code>
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['VPIP · PFR · 3-Bet', 'bb/100 rolling', 'Stats par position', 'Story Instagram'].map(f => (
                <span key={f} style={{ fontSize: 12, color: C.dim, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: C.violet }}>✦</span> {f}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
              {([
                { id: 'overview',  label: 'Vue générale', Icon: TrendingUp },
                { id: 'financial', label: 'Financier',     Icon: BarChart2 },
                { id: 'position',  label: 'Par position',  Icon: Layers },
                { id: 'hands',     label: 'Mains',         Icon: FileText },
                { id: 'story',     label: 'Story',         Icon: Zap },
              ] as const).map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontWeight: tab === id ? 700 : 500, fontSize: 13, transition: 'all 0.15s',
                    background: tab === id ? `rgba(124,58,237,0.2)` : 'transparent',
                    color: tab === id ? C.cream : C.silver,
                  }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {/* ══ TAB: Overview ══ */}
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <StatCard label="VPIP"    value={`${stats.vpip}%`}    color={stats.vpip > 30 ? C.amber : stats.vpip < 15 ? C.cyan : C.green}   icon={Target}    sub="Mains jouées volontairement" />
                  <StatCard label="PFR"     value={`${stats.pfr}%`}     color={stats.pfr > 25 ? C.amber : C.cyan}                                  icon={Zap}       sub="Raise preflop" />
                  <StatCard label="3-Bet"   value={`${stats.threeBet}%`}color={stats.threeBet > 10 ? C.amber : C.violet}                           icon={RefreshCw} sub="Quand opportunité" />
                  <StatCard label="AF"      value={stats.af}             color={stats.af > 3 ? C.green : C.silver}                                  icon={TrendingUp}sub="Aggression Factor" />
                  <StatCard label="WTSD"    value={`${stats.wtsd}%`}    color={C.silver}                                                            icon={Users}     sub="Au showdown" />
                  <StatCard label="WSD"     value={`${stats.wsd}%`}     color={stats.wsd > 55 ? C.green : stats.wsd < 45 ? C.red : C.amber}        icon={Target}    sub="Gagné au showdown" />
                </div>

                {/* BB/100 */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,228,220,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>bb/100 rolling (fenêtre 200 mains)</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: stats.bb100 >= 0 ? C.green : C.red, letterSpacing: '-1px' }}>
                        {stats.bb100 >= 0 ? '+' : ''}{stats.bb100} bb/100
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.silver }}>{stats.total} mains</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: stats.totalEuro >= 0 ? C.green : C.red }}>
                        {stats.totalEuro >= 0 ? '+' : ''}{stats.totalEuro.toFixed(2)} €
                      </div>
                    </div>
                  </div>
                  <LineChart data={bbSeries} color={C.violet} fillPositive={C.violet} unit=" bb" />
                </div>
              </div>
            )}

            {/* ══ TAB: Financial ══ */}
            {tab === 'financial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <StatCard label="Gains nets" value={`${stats.totalEuro >= 0 ? '+' : ''}${stats.totalEuro.toFixed(2)} €`}
                    color={stats.totalEuro >= 0 ? C.green : C.red} icon={TrendingUp} />
                  <StatCard label="bb/100" value={`${stats.bb100 >= 0 ? '+' : ''}${stats.bb100}`}
                    color={stats.bb100 >= 0 ? C.green : C.red} icon={BarChart2} sub="Sur l'ensemble" />
                  <StatCard label="Mains" value={stats.total.toLocaleString('fr')} icon={FileText} sub="importées" />
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,228,220,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Gains cumulés (€)</div>
                  <LineChart data={euSeries} color={C.cyan} fillPositive={C.cyan} fillNegative={C.red} unit=" €" height={200} />
                </div>
              </div>
            )}

            {/* ══ TAB: Position ══ */}
            {tab === 'position' && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(232,228,220,0.03)' }}>
                      {['Position', 'Mains', 'VPIP', 'PFR', 'bb/100'].map(h => (
                        <th key={h} style={{ padding: '14px 20px', textAlign: h === 'Position' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: C.silver, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posSeries.map((p, i) => (
                      <tr key={p.pos} style={{ borderBottom: i < posSeries.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}>{p.pos}</span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: C.silver }}>{p.count}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: p.vpip > 30 ? C.amber : p.vpip < 15 ? C.cyan : C.green }}>{p.vpip}%</span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>{p.pfr}%</span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: p.bb100 >= 0 ? C.green : C.red }}>
                            {p.bb100 >= 0 ? '+' : ''}{p.bb100}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ══ TAB: Hands ══ */}
            {tab === 'hands' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(232,228,220,0.03)' }}>
                        {['#', 'Cartes', 'Position', 'VPIP', 'PFR', '3Bet', 'Résultat (€)', 'Résultat (bb)'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: h === '#' || h === 'Cartes' || h === 'Position' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: C.silver, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedHands.map((h, idx) => {
                        const globalIdx = hands.length - page * 20 - idx
                        const euro = h.resultEuro
                        const bb   = h.resultBB
                        return (
                          <tr key={h.id} style={{ borderBottom: `1px solid rgba(232,228,220,0.04)` }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(232,228,220,0.02)'}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                            <td style={{ padding: '11px 16px', fontSize: 12, color: C.silver }}>{globalIdx}</td>
                            <td style={{ padding: '11px 16px' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {h.heroCards.length > 0
                                  ? h.heroCards.map(c => {
                                      const suit  = c.slice(-1)
                                      const isRed = suit === 'h' || suit === 'd'
                                      return (
                                        <span key={c} style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: isRed ? '#ef4444' : C.cream, background: 'rgba(232,228,220,0.06)', padding: '1px 5px', borderRadius: 4 }}>{c}</span>
                                      )
                                    })
                                  : <span style={{ fontSize: 12, color: C.silver }}>—</span>
                                }
                              </div>
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>{h.position}</span>
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: h.vpip ? C.green : C.silver }}>{h.vpip ? 'Oui' : '—'}</span>
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: h.pfr ? C.cyan : C.silver }}>{h.pfr ? 'Oui' : '—'}</span>
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: h.threeBet ? '#a78bfa' : C.silver }}>{h.threeBet ? 'Oui' : '—'}</span>
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: euro >= 0 ? C.green : C.red }}>
                                {euro >= 0 ? '+' : ''}{euro.toFixed(2)} €
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: bb >= 0 ? C.green : C.red }}>
                                {bb >= 0 ? '+' : ''}{bb.toFixed(1)} bb
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: page === 0 ? C.silver : C.cream, cursor: page === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 0 ? 0.4 : 1 }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: 13, color: C.silver }}>Page {page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: page >= totalPages - 1 ? C.silver : C.cream, cursor: page >= totalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══ TAB: Story ══ */}
            {tab === 'story' && <StoryTab stats={stats} hands={hands} bbSeries={bbSeries} />}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Story Tab ───────────────────────────────────────────────────────────────
function StoryTab({ stats, hands, bbSeries }: { stats: Stats; hands: ParsedHand[]; bbSeries: number[] }) {
  const storyRef = useRef<HTMLDivElement>(null)

  const downloadStory = () => {
    const el = storyRef.current
    if (!el) return
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>OnlyPok Story</title><style>*{margin:0;padding:0;box-sizing:border-box;}</style></head><body style="background:#07090e;">${el.outerHTML}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'onlypok-story.html'; a.click()
    URL.revokeObjectURL(url)
  }

  // Mini ASCII chart for story (20 chars wide)
  const miniChart = () => {
    if (bbSeries.length < 2) return ''
    const slice = bbSeries.slice(-20)
    const min   = Math.min(...slice)
    const max   = Math.max(...slice)
    const rng   = max - min || 1
    const rows  = 5
    const cols  = slice.length
    const grid  = Array.from({ length: rows }, () => Array(cols).fill(' '))
    slice.forEach((v, i) => {
      const row = Math.floor(rows - 1 - ((v - min) / rng) * (rows - 1))
      grid[Math.max(0, Math.min(rows - 1, row))][i] = '█'
    })
    return grid.map(r => r.join('')).join('\n')
  }

  const positive = stats.totalEuro >= 0
  const accent   = positive ? '#4ade80' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
      <p style={{ fontSize: 13, color: C.silver, textAlign: 'center' }}>
        Prévisualisation de ta story Instagram · Télécharge le HTML puis screenshot (ou utilise un outil de capture)
      </p>

      {/* Story preview (scaled down 50%) */}
      <div style={{ transform: 'scale(0.45)', transformOrigin: 'top center', marginBottom: -530, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div ref={storyRef} style={{
          width: 1080, height: 1920,
          background: 'linear-gradient(160deg, #07090e 0%, #0e0b1a 50%, #07090e 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: 200, left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, borderRadius: '50%', background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`, filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', bottom: 300, right: 100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

          {/* Logo */}
          <div style={{ position: 'absolute', top: 80, left: 80 }}>
            <span style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>OnlyPok</span>
          </div>
          <div style={{ position: 'absolute', top: 140, left: 80, fontSize: 28, color: 'rgba(232,228,220,0.4)', fontWeight: 500 }}>Track.me</div>

          {/* Main result */}
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div style={{ fontSize: 32, color: 'rgba(232,228,220,0.5)', fontWeight: 600, marginBottom: 16, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {stats.total.toLocaleString('fr')} mains
            </div>
            <div style={{ fontSize: 160, fontWeight: 900, color: accent, letterSpacing: '-6px', lineHeight: 1, marginBottom: 8 }}>
              {positive ? '+' : ''}{stats.totalEuro.toFixed(0)}€
            </div>
            <div style={{ fontSize: 44, color: 'rgba(232,228,220,0.5)', fontWeight: 500 }}>
              {positive ? '+' : ''}{stats.bb100} bb/100
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 40, marginBottom: 80 }}>
            {[
              { label: 'VPIP', value: `${stats.vpip}%` },
              { label: 'PFR',  value: `${stats.pfr}%` },
              { label: '3-Bet',value: `${stats.threeBet}%` },
              { label: 'AF',   value: `${stats.af}` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '28px 36px', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 24 }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: C.cream, marginBottom: 8 }}>{s.value}</div>
                <div style={{ fontSize: 26, color: 'rgba(232,228,220,0.45)', fontWeight: 600, letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mini chart using SVG */}
          {bbSeries.length > 2 && (
            <div style={{ width: 900, height: 200, marginBottom: 60 }}>
              <svg viewBox="0 0 900 200" width="900" height="200">
                {(() => {
                  const slice = bbSeries.slice(-100)
                  const min   = Math.min(...slice, 0)
                  const max   = Math.max(...slice, 0)
                  const rng   = max - min || 1
                  const toX   = (i: number) => (i / (slice.length - 1)) * 900
                  const toY   = (v: number) => 190 - ((v - min) / rng) * 180
                  let d = `M ${toX(0)} ${toY(slice[0])}`
                  for (let i = 1; i < slice.length; i++) {
                    const cx1 = toX(i-1) + (toX(i) - toX(i-1)) / 3
                    const cx2 = toX(i)   - (toX(i) - toX(i-1)) / 3
                    d += ` C ${cx1} ${toY(slice[i-1])} ${cx2} ${toY(slice[i])} ${toX(i)} ${toY(slice[i])}`
                  }
                  const fill = d + ` L 900 190 L 0 190 Z`
                  return (
                    <>
                      <defs>
                        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={accent} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={fill} fill="url(#sg)" />
                      <path d={d} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
                    </>
                  )
                })()}
              </svg>
            </div>
          )}

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 26, color: 'rgba(232,228,220,0.3)', fontWeight: 500 }}>onlypok.fr · Track · Train · Coach</div>
          </div>
        </div>
      </div>

      <button onClick={downloadStory}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.violet}, ${C.cyan})`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px rgba(124,58,237,0.35)`, marginTop: 16 }}>
        <Download size={15} /> Télécharger le HTML
      </button>
    </div>
  )
}
