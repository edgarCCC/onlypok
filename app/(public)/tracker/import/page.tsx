'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useState, useCallback, useRef } from 'react'
import { ArrowLeft, Upload, FileText, Check, AlertCircle, Loader2, Trophy, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  detectFileType, parseTournamentSummary, parseHandHistory, mergeTournamentData,
  type ParsedTournament, type TournamentFormat,
} from '@/lib/parsers/winamax'
import { isBetclicFile, parseBetclicFile } from '@/lib/parsers/betclic'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.25)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const GREEN  = '#4ade80'
const AMBER  = '#f59e0b'
const GOLD   = '#fbbf24'
const BG     = '#07090e'
const CARD   = 'rgba(232,228,220,0.03)'
const BORDER = 'rgba(255,255,255,0.08)'

function fmt(secs: number) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h${m.toString().padStart(2,'0')}`
  return `${m}min`
}

function ordinal(n: number) {
  if (!n) return '—'
  return n === 1 ? '1er' : `${n}e`
}

function placementColor(placement: number, total: number) {
  if (!placement || !total) return DIM
  const pct = placement / total
  if (placement === 1) return GOLD
  if (placement <= 3) return AMBER
  if (pct <= 0.1) return GREEN
  if (pct <= 0.2) return CYAN
  return SILVER
}

const FORMAT_META: Record<TournamentFormat, { label: string; color: string; bg: string; border: string }> = {
  classic:    { label: 'Classique',   color: SILVER,    bg: 'rgba(240,244,255,0.05)', border: 'rgba(240,244,255,0.12)' },
  ko:         { label: 'KO',          color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
  mystery_ko: { label: 'Mystery KO',  color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.25)' },
  space_ko:   { label: 'Space KO',    color: CYAN,      bg: 'rgba(6,182,212,0.08)',    border: 'rgba(6,182,212,0.25)' },
  spin_rush:  { label: 'Spin & Rush', color: '#fb923c', bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.25)' },
}

function StatPill({ val, label, color }: { val: number | null; label: string; color: string }) {
  if (val === null) return <span style={{ fontSize: 11, color: DIM }}>—</span>
  const good = label === 'VPIP' ? val >= 20 && val <= 30 : label === 'PFR' ? val >= 16 && val <= 25 : val >= 3 && val <= 9
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${color}15`, border: `1px solid ${color}30`, color }}>
      {label} {val}%
    </span>
  )
}

export default function ImportPage() {
  const [dragging, setDragging]   = useState(false)
  const [parsed,   setParsed]     = useState<ParsedTournament[]>([])
  const [rooms,    setRooms]      = useState<Record<string, string>>({})
  const [heroName, setHeroName]   = useState('')
  const [loading,  setLoading]    = useState(false)
  const [saving,   setSaving]     = useState(false)
  const [saved,    setSaved]      = useState(false)
  const [error,    setError]      = useState('')
  const [fileCount, setFileCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: File[]) => {
    const txts = files.filter(f => f.name.endsWith('.txt'))
    if (!txts.length) { setError('Aucun fichier .txt détecté.'); return }
    setLoading(true); setError(''); setSaved(false); setParsed([])
    setFileCount(txts.length)

    const summaries = []
    const allHands = []
    const betclicResults: ParsedTournament[] = []
    const roomMap: Record<string, string> = {}
    let hero = ''

    for (const file of txts) {
      const text = await file.text()
      if (isBetclicFile(text)) {
        const results = parseBetclicFile(text)
        betclicResults.push(...results)
        for (const r of results) roomMap[r.id] = 'betclic'
        if (!hero && results[0]) hero = results[0].heroName
      } else {
        const type = detectFileType(text)
        if (type === 'summary') {
          const s = parseTournamentSummary(text)
          summaries.push(...s)
          if (!hero && s[0]) hero = s[0].heroName
        } else if (type === 'history') {
          const { heroName: h, hands } = parseHandHistory(text)
          allHands.push(...hands)
          if (!hero) hero = h
        }
      }
    }

    const winamaxResults = mergeTournamentData(summaries, allHands, hero)
    for (const r of winamaxResults) roomMap[r.id] = 'winamax'

    setHeroName(hero)
    setRooms(roomMap)
    setParsed([...winamaxResults, ...betclicResults].sort((a, b) => b.date.getTime() - a.date.getTime()))
    setLoading(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }, [processFiles])

  const save = async () => {
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Connecte-toi pour sauvegarder.'); setSaving(false); return }

    const rows = parsed.map(t => ({
      user_id: user.id,
      tournament_id: t.id,
      tournament_name: t.name,
      room: rooms[t.id] ?? 'winamax',
      date: t.date.toISOString().split('T')[0],
      buy_in_prize: t.buyInPrize,
      buy_in_bounty: t.buyInBounty,
      buy_in_rake: t.buyInRake,
      buy_in_total: t.buyInTotal,
      placement: t.placement || null,
      total_players: t.totalPlayers || null,
      prize_pool: t.tournamentPrizePool,
      prize_won: t.prizeWon,
      bounties_won: t.bountiesWon,
      net_profit: t.netProfit,
      duration_secs: t.durationSecs,
      hands_played: t.handsPlayed,
      vpip_pct: t.vpipPct,
      pfr_pct: t.pfrPct,
      three_bet_pct: t.threeBetPct,
      type: t.type,
      speed: t.speed,
      hero_name: t.heroName,
    }))

    const { error: err } = await supabase
      .from('tournament_results')
      .upsert(rows, { onConflict: 'user_id,tournament_id' })

    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true); setSaving(false)
  }

  const totalBuyIn   = parsed.reduce((a, t) => a + t.buyInTotal, 0)
  const totalNetProfit = parsed.reduce((a, t) => a + t.netProfit, 0)
  const avgVpip = parsed.filter(t => t.vpipPct !== null).length
    ? parsed.filter(t => t.vpipPct !== null).reduce((a, t) => a + t.vpipPct!, 0) / parsed.filter(t => t.vpipPct !== null).length
    : null

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM }}>
      <Navbar />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Tracker
        </Link>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 6px' }}>Import Winamax / Betclic</h1>
          <p style={{ fontSize: 14, color: SILVER, margin: 0 }}>Glisse tes fichiers <code style={{ color: CYAN }}>.txt</code> — Winamax (résumés + historiques) ou Betclic (Spin & Rush).</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? VIOLET : BORDER}`,
            borderRadius: 20, padding: '48px 32px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            background: dragging ? 'rgba(124,58,237,0.06)' : CARD,
            marginBottom: 32,
          }}
        >
          <input ref={fileRef} type="file" multiple accept=".txt" style={{ display: 'none' }}
            onChange={e => e.target.files && processFiles(Array.from(e.target.files))} />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Loader2 size={32} color={VIOLET} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: SILVER, margin: 0, fontSize: 14 }}>Analyse de {fileCount} fichier{fileCount > 1 ? 's' : ''}…</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Upload size={32} color={dragging ? VIOLET : DIM} />
              <p style={{ fontSize: 16, fontWeight: 700, color: dragging ? CREAM : SILVER, margin: 0 }}>
                {dragging ? 'Lâche les fichiers ici' : 'Glisse tes fichiers .txt Winamax ou Betclic'}
              </p>
              <p style={{ fontSize: 12, color: DIM, margin: 0 }}>ou clique pour sélectionner — détection automatique de la room</p>
            </div>
          )}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 20 }}>
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ fontSize: 13, color: '#fca5a5' }}>{error}</span>
          </div>
        )}

        {parsed.length > 0 && (
          <>
            {/* Summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Tournois', val: parsed.length.toString(), color: VIOLET },
                { label: 'Buy-in total', val: `${totalBuyIn.toFixed(2)}€`, color: '#ef4444' },
                { label: 'Profit net', val: `${totalNetProfit >= 0 ? '+' : ''}${totalNetProfit.toFixed(2)}€`, color: totalNetProfit >= 0 ? GREEN : '#ef4444' },
                { label: 'VPIP moyen', val: avgVpip !== null ? `${Math.round(avgVpip * 10) / 10}%` : '—', color: CYAN },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ padding: '16px 20px', borderRadius: 14, background: CARD, border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: DIM, margin: '0 0 6px' }}>{label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Hero name */}
            {heroName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: DIM }}>Joueur détecté :</span>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 12px', borderRadius: 99, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: CYAN }}>{heroName}</span>
              </div>
            )}

            {/* Tournament table */}
            <div style={{ borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 20 }}>
              {/* Sticky header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 76px 90px 90px 66px 76px 80px',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: `1px solid ${BORDER}`,
                position: 'sticky', top: 0, zIndex: 10,
              }}>
                {['Tournoi', 'Date', 'Format', 'Position', 'KO', 'Durée', 'Profit'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: DIM }}>{h}</span>
                ))}
              </div>

              {/* Scrollable rows */}
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {parsed.map((t, i) => {
                  const profit = t.netProfit
                  const fm = FORMAT_META[t.format]
                  const hasPlacement = t.placement > 0 && t.totalPlayers > 0
                  const pColor = hasPlacement ? placementColor(t.placement, t.totalPlayers) : DIM
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 76px 90px 90px 66px 76px 80px',
                        padding: '12px 20px',
                        borderBottom: i < parsed.length - 1 ? `1px solid ${BORDER}` : 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      {/* Name */}
                      <div style={{ minWidth: 0, paddingRight: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={13} color={DIM} style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</p>
                          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                            {t.hasSummary && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}>résumé</span>}
                            {t.hasHistory && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(6,182,212,0.1)', color: CYAN }}>{t.handsPlayed}m</span>}
                          </div>
                        </div>
                      </div>

                      {/* Date */}
                      <span style={{ fontSize: 12, color: SILVER, display: 'flex', alignItems: 'center' }}>
                        {t.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>

                      {/* Format */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, color: fm.color, background: fm.bg, border: `1px solid ${fm.border}`, whiteSpace: 'nowrap' }}>
                          {fm.label}{t.speed ? ` · ${t.speed}` : ''}
                        </span>
                      </div>

                      {/* Placement */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {hasPlacement ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: pColor, display: 'flex', alignItems: 'center', gap: 3 }}>
                            {t.placement === 1 && <Trophy size={10} color={GOLD} />}
                            {ordinal(t.placement)}<span style={{ fontWeight: 400, color: DIM }}>/{t.totalPlayers}</span>
                          </span>
                        ) : <span style={{ fontSize: 12, color: DIM }}>-</span>}
                      </div>

                      {/* KO */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {t.bountiesWon > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Zap size={9} color={AMBER} /> {t.bountiesWon.toFixed(2)}€
                          </span>
                        ) : <span style={{ fontSize: 12, color: DIM }}>-</span>}
                      </div>

                      {/* Duration */}
                      <span style={{ fontSize: 12, color: SILVER, display: 'flex', alignItems: 'center' }}>
                        {fmt(t.durationSecs)}
                      </span>

                      {/* Profit */}
                      <span style={{
                        fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center',
                        color: profit > 0 ? GREEN : profit < 0 ? '#ef4444' : SILVER,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {profit > 0 ? '+' : profit < 0 ? '-' : ''}{Math.abs(profit).toFixed(2)}€
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Save button */}
            {saved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px', borderRadius: 14, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
                <Check size={18} color={GREEN} />
                <span style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>{parsed.length} tournoi{parsed.length > 1 ? 's' : ''} sauvegardé{parsed.length > 1 ? 's' : ''} avec succès</span>
              </div>
            ) : (
              <button
                onClick={save}
                disabled={saving}
                style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: saving ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sauvegarde…</> : `Importer ${parsed.length} tournoi${parsed.length > 1 ? 's' : ''} →`}
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.35); border-radius: 99px }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.6) }
      `}</style>
    </div>
  )
}
