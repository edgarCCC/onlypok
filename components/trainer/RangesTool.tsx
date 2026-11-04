'use client'
// Entraîneur de ranges : trois modes dans une seule barre. L'état de la range peinte vit ici pour survivre à un changement de mode.
import { useCallback, useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { POSITIONS, STACKS, type Position } from './actions'
import CustomRange, { decodeShare, sanitizeRange, type RangeMap } from './CustomRange'
import Drill from './Drill'
import Explorer from './Explorer'
import ToolBar from './ToolBar'
import './trainer.css'

type Tab = 'drill' | 'quiz' | 'explore' | 'custom'
const TABS: { id: Tab; label: string }[] = [
  { id: 'drill', label: 'Drill' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'explore', label: 'Explorer' },
  { id: 'custom', label: 'Ma range' },
]
const COUNTS = [10, 20, 50, 100]

interface SettingsValue { positions: Position[]; stacks: number[]; count: number }

function Settings({ value, onApply, onClose }: { value: SettingsValue; onApply: (next: SettingsValue) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value)
  const togglePosition = (position: Position) => setDraft((d) => ({ ...d, positions: d.positions.includes(position) ? d.positions.filter((p) => p !== position) : [...d.positions, position] }))
  const toggleStack = (stack: number) => setDraft((d) => ({ ...d, stacks: d.stacks.includes(stack) ? d.stacks.filter((s) => s !== stack) : [...d.stacks, stack] }))
  const empty = !draft.positions.length || !draft.stacks.length
  return (
    <section className="tr-settings" aria-label="Réglages de la série">
      <div className="tr-settings-row">
        <p className="t-caps">Positions</p>
        <div className="tr-chips">{POSITIONS.map((p) => <button key={p} type="button" className="tr-chip" aria-pressed={draft.positions.includes(p)} onClick={() => togglePosition(p)}>{p}</button>)}</div>
      </div>
      <div className="tr-settings-row">
        <p className="t-caps">Profondeurs</p>
        <div className="tr-chips">
          {STACKS.map((s) => <button key={s} type="button" className="tr-chip" aria-pressed={draft.stacks.includes(s)} onClick={() => toggleStack(s)}>{s}</button>)}
          <button type="button" className="tr-chip tr-chip-all" onClick={() => setDraft((d) => ({ ...d, stacks: [...STACKS] }))}>Toutes</button>
        </div>
      </div>
      <div className="tr-settings-row">
        <p className="t-caps">Mains</p>
        <div className="tr-chips">{COUNTS.map((n) => <button key={n} type="button" className="tr-chip" aria-pressed={draft.count === n} onClick={() => setDraft((d) => ({ ...d, count: n }))}>{n}</button>)}</div>
      </div>
      <div className="tr-settings-foot">
        {empty && <p className="ui-field-error" role="alert">Choisis au moins une position et une profondeur.</p>}
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={onClose}>Annuler</button>
        <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" disabled={empty} onClick={() => onApply(draft)}>Lancer la série</button>
      </div>
    </section>
  )
}

export default function RangesTool({ backHref = '/trainer' }: { backHref?: string }) {
  const [tab, setTab] = useState<Tab>('drill')
  const [settings, setSettings] = useState<SettingsValue>({ positions: [...POSITIONS], stacks: [...STACKS], count: 20 })
  const [showSettings, setShowSettings] = useState(false)
  const [series, setSeries] = useState(0)
  const [customMap, setCustomMap] = useState<RangeMap>({})
  const [banner, setBanner] = useState<{ name: string; map: RangeMap } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const errorTimer = useRef<number | null>(null)

  const onError = useCallback((message: string) => {
    setError(message)
    if (errorTimer.current !== null) window.clearTimeout(errorTimer.current)
    errorTimer.current = window.setTimeout(() => setError(null), 4000)
  }, [])
  const onOpenSettings = useCallback(() => setShowSettings(true), [])
  const updateMap = useCallback((update: (previous: RangeMap) => RangeMap) => setCustomMap(update), [])

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get('share')
    if (!encoded) return
    try {
      const data = decodeShare(encoded) as { name?: unknown; comboMap?: unknown }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- l'adresse n'est lisible que dans le navigateur
      setBanner({ name: typeof data.name === 'string' ? data.name.slice(0, 60) : 'Range partagée', map: sanitizeRange(data.comboMap) })
      window.history.replaceState({}, '', window.location.pathname)
    } catch {
      onError('Ce lien de range est illisible.')
    }
  }, [onError])

  const playing = tab === 'drill' || tab === 'quiz'

  return (
    <div className="tr">
      <ToolBar
        backHref={backHref}
        title="Ranges"
        actions={playing ? (
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" aria-expanded={showSettings} onClick={() => setShowSettings((value) => !value)}>
            <SlidersHorizontal size={14} aria-hidden="true" /> Réglages
          </button>
        ) : undefined}
      >
        <div className="ui-seg" role="group" aria-label="Mode">
          {TABS.map(({ id, label }) => <button key={id} type="button" className="ui-seg-item" aria-pressed={tab === id} onClick={() => { setTab(id); setShowSettings(false) }}>{label}</button>)}
        </div>
      </ToolBar>

      {banner && (
        <div className="tr-banner">
          <p><span className="t-3">Range partagée</span> <b>{banner.name}</b></p>
          <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => { setCustomMap(banner.map); setTab('custom'); setBanner(null) }}>Importer</button>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setBanner(null)}>Ignorer</button>
        </div>
      )}

      {showSettings && playing && (
        <Settings value={settings} onClose={() => setShowSettings(false)} onApply={(next) => { setSettings(next); setSeries((value) => value + 1); setShowSettings(false) }} />
      )}

      {playing && <Drill key={`${tab}-${series}`} quiz={tab === 'quiz'} positions={settings.positions} stacks={settings.stacks} count={settings.count} onOpenSettings={onOpenSettings} onError={onError} />}
      {tab === 'explore' && <Explorer />}
      {tab === 'custom' && <CustomRange map={customMap} setMap={updateMap} onError={onError} />}

      {error && <div className="tr-toast" role="alert">{error}</div>}
    </div>
  )
}
