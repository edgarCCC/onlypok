'use client'
import { useMemo, useState } from 'react'
import { GTO, countCombos } from '@/lib/ranges/gto'
import { POSITIONS, STACKS, TOTAL_COMBOS, familyOf, formatPct, type Position } from './actions'
import Matrix from './Matrix'

const pctOf = (combos: number) => Math.round((combos / TOTAL_COMBOS) * 1000) / 10

/** Parcourir les ranges : position et profondeur à gauche, répartition cliquable, grille à droite. */
export default function Explorer() {
  const [position, setPosition] = useState<Position>('BTN')
  const [stack, setStack] = useState(100)
  const [hover, setHover] = useState<string | null>(null)
  const [filter, setFilter] = useState<string[]>([])

  const key = `${position}_${stack}`
  const range = GTO[key]
  const { map, stats, total } = useMemo(() => {
    const nextMap: Record<string, string> = {}
    const nextStats: { action: string; combos: number }[] = []
    if (range) {
      Object.keys(range).filter((action) => action !== 'name').forEach((action) => {
        range[action].forEach((hand) => { nextMap[hand] = action })
        nextStats.push({ action, combos: range[action].reduce((sum, hand) => sum + countCombos(hand), 0) })
      })
    }
    return { map: nextMap, stats: nextStats, total: nextStats.reduce((sum, item) => sum + item.combos, 0) }
  }, [range])

  const toggle = (action: string) => setFilter((previous) => (previous.includes(action) ? previous.filter((item) => item !== action) : [...previous, action]))
  const pickSpot = (nextPosition: Position, nextStack: number) => { setPosition(nextPosition); setStack(nextStack); setFilter([]); setHover(null) }
  const hoverAction = hover ? map[hover] ?? 'Fold' : null

  return (
    <div className="tr-main tr-main-explore">
      <aside className="tr-side" aria-label="Choisir une range">
        <div className="tr-side-block">
          <p className="t-caps">Position</p>
          <div className="ui-seg" role="group" aria-label="Position">
            {POSITIONS.map((item) => <button key={item} type="button" className="ui-seg-item" aria-pressed={item === position} onClick={() => pickSpot(item, stack)}>{item}</button>)}
          </div>
        </div>
        <div className="tr-side-block">
          <p className="t-caps">Profondeur</p>
          <div className="tr-chips" role="group" aria-label="Profondeur en blindes">
            {STACKS.map((item) => <button key={item} type="button" className="tr-chip" aria-pressed={item === stack} onClick={() => pickSpot(position, item)}>{item}</button>)}
          </div>
        </div>
        <div className="tr-side-block">
          <p className="t-caps">Répartition</p>
          <ul className="tr-stats-list">
            {stats.map(({ action, combos }) => (
              <li key={action}>
                <button type="button" className="tr-stat" aria-pressed={filter.includes(action)} onClick={() => toggle(action)}>
                  <span className="tr-stat-top"><i data-fam={familyOf(action)} aria-hidden="true" />{action}<b>{formatPct(pctOf(combos))}</b></span>
                  <span className="tr-stat-bar" aria-hidden="true"><i data-fam={familyOf(action)} style={{ transform: `scaleX(${total ? combos / total : 0})` }} /></span>
                  <span className="tr-stat-sub">{combos} combos</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="tr-total"><span>Range jouée</span><b>{total} combos · {formatPct(pctOf(total))}</b></p>
        </div>
        <div className="tr-hover" aria-live="polite">
          {hover ? <><b>{hover}</b><span>{hoverAction} · {countCombos(hover)} combos</span></> : <span className="t-3">Survole une main pour lire son action.</span>}
        </div>
      </aside>
      <section className="tr-panel" aria-label={`Range ${range?.name[0] ?? ''} à ${stack} blindes`}>
        <header className="tr-panel-head">
          <div>
            <p className="t-caps">Range d’ouverture</p>
            <p className="tr-panel-title">{range?.name[0]} · {stack} bb</p>
          </div>
          {filter.length > 0 && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setFilter([])}>Tout afficher</button>}
        </header>
        {range
          ? <Matrix actionOf={(combo) => map[combo]} current={hover} revealed filter={filter} onHover={setHover} />
          : <p className="t-2">Pas de range pour cette combinaison.</p>}
      </section>
    </div>
  )
}
