'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Check, AlertCircle, Loader2, Trophy, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  detectFileType, parseTournamentSummary, parseHandHistory, mergeTournamentData,
  type ParsedTournament,
} from '@/lib/parsers/winamax'
import { isBetclicFile, parseBetclicHands, buildBetclicTournaments, type BetclicHand } from '@/lib/parsers/betclic'
import { extractTxtFromZip } from '@/lib/parsers/unzip'
import { TrackerShell, Card, KpiStrip, SectionLabel, FormatBadge, RoomDot, Th, Td, T, NUM, eur, pnlColor } from '@/components/tracker/ui'

function fmt(secs: number) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h${m.toString().padStart(2,'0')}`
  return `${m}min`
}
const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`)

function placementColor(p: number, total: number) {
  if (p === 1) return T.gold
  if (p <= 3) return T.amber
  if (!total) return T.silver
  const pct = p / total
  if (pct <= 0.1) return T.green
  if (pct <= 0.2) return T.blue
  return T.silver
}

const GRID = '1fr 92px 64px 90px 76px 64px 92px'

export default function ImportPage() {
  const router = useRouter()
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
    const accepted = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.zip'))
    if (!accepted.length) { setError('Aucun fichier .txt ou .zip détecté.'); return }
    setLoading(true); setError(''); setSaved(false); setParsed([])

    // Expand ZIPs into raw text entries
    const texts: string[] = []
    for (const file of accepted) {
      if (file.name.endsWith('.zip')) {
        try {
          const extracted = await extractTxtFromZip(file)
          texts.push(...extracted.map(e => e.content))
        } catch {
          setError(`Erreur lecture ZIP : ${file.name}`); setLoading(false); return
        }
      } else {
        texts.push(await file.text())
      }
    }

    setFileCount(texts.length)

    const summaries = []
    const allHands = []
    const allBetclicHands: BetclicHand[] = []
    const roomMap: Record<string, string> = {}
    let hero = ''

    for (const text of texts) {
      if (isBetclicFile(text)) {
        const hands = parseBetclicHands(text)
        allBetclicHands.push(...hands)
        if (!hero) hero = hands.find(h => h.heroName)?.heroName ?? ''
      } else {
        const kind = detectFileType(text)
        if (kind === 'summary') {
          const s = parseTournamentSummary(text)
          summaries.push(...s)
          if (!hero && s[0]) hero = s[0].heroName
        } else if (kind === 'history') {
          const { heroName: h, hands } = parseHandHistory(text)
          allHands.push(...hands)
          if (!hero) hero = h
        }
      }
    }

    // Group ALL Betclic hands globally — handles Spins whose hands span multiple daily files
    const betclicResults = buildBetclicTournaments(allBetclicHands)
    for (const r of betclicResults) roomMap[r.id] = 'betclic'

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
    router.push('/tracker/dashboard')
  }

  const totalBuyIn     = parsed.reduce((a, t) => a + t.buyInTotal, 0)
  const totalNetProfit = parsed.reduce((a, t) => a + t.netProfit, 0)
  const vpipParsed     = parsed.filter(t => t.vpipPct !== null)
  const avgVpip        = vpipParsed.length ? vpipParsed.reduce((a, t) => a + t.vpipPct!, 0) / vpipParsed.length : null

  return (
    <TrackerShell>

      <SectionLabel>Import Winamax / Betclic</SectionLabel>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? T.violet : T.borderStrong}`,
          borderRadius: 14, padding: '40px 32px', textAlign: 'center',
          cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
          background: dragging ? 'rgba(124,58,237,0.06)' : T.surface,
          marginBottom: 14,
        }}
      >
        <input ref={fileRef} type="file" multiple accept=".txt,.zip" style={{ display: 'none' }}
          onChange={e => e.target.files && processFiles(Array.from(e.target.files))} />
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={28} color={T.violet} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: T.silver, margin: 0, fontSize: 13 }}>Analyse de {fileCount} fichier{fileCount > 1 ? 's' : ''}…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Upload size={26} color={dragging ? T.violet : T.dim} />
            <p style={{ fontSize: 14.5, fontWeight: 700, color: dragging ? T.cream : T.silver, margin: 0 }}>
              {dragging ? 'Lâche les fichiers ici' : 'Glisse tes fichiers .txt ou .zip'}
            </p>
            <p style={{ fontSize: 12, color: T.dim, margin: 0 }}>
              Winamax (résumés + historiques) et Betclic (export complet) — room détectée automatiquement, ZIP supporté
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.22)', marginBottom: 14 }}>
          <AlertCircle size={15} color={T.red} />
          <span style={{ fontSize: 12.5, color: T.red }}>{error}</span>
        </div>
      )}

      {parsed.length > 0 && (
        <>
          <KpiStrip items={[
            { label: 'Tournois',     value: String(parsed.length), color: T.cream, sub: heroName ? `joueur : ${heroName}` : undefined },
            { label: 'Buy-in total', value: eur(totalBuyIn), color: T.cream },
            { label: 'Profit net',   value: eur(totalNetProfit, { sign: true }), color: pnlColor(totalNetProfit) },
            { label: 'VPIP moyen',   value: avgVpip !== null ? `${(Math.round(avgVpip * 10) / 10).toFixed(1)} %` : '—', color: T.cream },
          ]} />

          {/* Aperçu */}
          <Card pad={false} style={{ marginBottom: 14 }}>
            <div style={{ padding: '16px 20px 0' }}>
              <SectionLabel right={<span style={{ fontSize: 11, color: T.dim }}>aperçu avant import</span>}>
                Tournois détectés
              </SectionLabel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '8px 20px', borderBottom: `1px solid ${T.border}` }}>
              <Th>Tournoi</Th><Th>Room</Th><Th align="right">Date</Th><Th align="right">Position</Th><Th align="right">KO</Th><Th align="right">Durée</Th><Th align="right">Profit</Th>
            </div>
            <div className="trk-scroll" style={{ maxHeight: 440, overflowY: 'auto' }}>
              {parsed.map(t => (
                <div key={t.id} className="trk-row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '10px 20px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    <FormatBadge format={t.format} />
                    {t.hasHistory && <span style={{ fontSize: 9.5, color: T.dim, ...NUM, flexShrink: 0 }}>{t.handsPlayed}m</span>}
                  </span>
                  <Td><RoomDot room={rooms[t.id] ?? 'winamax'} /></Td>
                  <Td align="right" color={T.dim}>{t.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</Td>
                  <Td align="right" color={t.placement > 0 ? placementColor(t.placement, t.totalPlayers) : T.dim}
                    style={t.placement > 0 ? { fontWeight: 600 } : undefined}>
                    {t.placement > 0 ? (
                      <>
                        {t.placement === 1 && <Trophy size={10} color={T.gold} style={{ marginRight: 4 }} />}
                        {ordinal(t.placement)}{t.totalPlayers > 0 ? <span style={{ color: T.faint, fontWeight: 400 }}>/{t.totalPlayers}</span> : null}
                      </>
                    ) : '—'}
                  </Td>
                  <Td align="right" color={t.bountiesWon > 0 ? T.amber : T.dim}>
                    {t.bountiesWon > 0 ? <><Zap size={9} color={T.amber} style={{ marginRight: 3 }} />{eur(t.bountiesWon)}</> : '—'}
                  </Td>
                  <Td align="right" color={T.dim}>{fmt(t.durationSecs)}</Td>
                  <Td align="right" strong color={pnlColor(t.netProfit)}>{eur(t.netProfit, { sign: true })}</Td>
                </div>
              ))}
            </div>
          </Card>

          {/* Bouton d'import */}
          {saved ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', borderRadius: 12, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)' }}>
              <Check size={17} color={T.green} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: T.green }}>{parsed.length} tournoi{parsed.length > 1 ? 's' : ''} sauvegardé{parsed.length > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <button
              onClick={save}
              disabled={saving}
              style={{ width: '100%', padding: '15px 0', borderRadius: 12, border: 'none', background: saving ? 'rgba(124,58,237,0.35)' : T.violet, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sauvegarde…</> : `Importer ${parsed.length} tournoi${parsed.length > 1 ? 's' : ''}`}
            </button>
          )}
        </>
      )}
    </TrackerShell>
  )
}
