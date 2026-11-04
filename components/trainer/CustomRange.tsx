'use client'
// Peindre sa propre range : la palette à gauche, la grille à droite. Sauvegarde locale, code d'export, lien de partage.
import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { ALL_169, countCombos } from '@/lib/ranges/gto'
import { cx } from '@/lib/cx'
import { CUSTOM_ACTIONS, TOTAL_COMBOS, familyOf, formatPct } from './actions'
import Matrix from './Matrix'

const STORAGE_KEY = 'onlypok_custom_ranges'
const ERASE = 'erase'

export type RangeMap = Record<string, string>
interface SavedRange { id: string; name: string; comboMap: RangeMap; createdAt: string }

/* Le code d'une range vient de l'extérieur (lien, collage) : on ne garde que des mains et des actions connues. */
export function sanitizeRange(value: unknown): RangeMap {
  if (!value || typeof value !== 'object') return {}
  const hands = new Set(ALL_169)
  const actions = new Set<string>(CUSTOM_ACTIONS)
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([hand, action]) => hands.has(hand) && typeof action === 'string' && actions.has(action))) as RangeMap
}
/* Base64 sur les octets UTF-8 : un nom accentué ou un emoji ne fait pas planter btoa. */
export function encodeShare(value: unknown) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
}
export function decodeShare(code: string): unknown {
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code), (char) => char.charCodeAt(0))))
}

function readSaved(): SavedRange[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed as SavedRange[] : []
  } catch { return [] }
}

export interface CustomRangeProps {
  map: RangeMap
  setMap: (update: (previous: RangeMap) => RangeMap) => void
  onError: (message: string) => void
}

export default function CustomRange({ map, setMap, onError }: CustomRangeProps) {
  const [paint, setPaint] = useState<string>('Raise')
  const [name, setName] = useState('')
  const [saved, setSaved] = useState<SavedRange[]>([])
  const [showSaved, setShowSaved] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importCode, setImportCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage n'existe que dans le navigateur
  useEffect(() => { setSaved(readSaved()) }, [])
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (shareUrl && !dialog.open) dialog.showModal()
    if (!shareUrl && dialog.open) dialog.close()
  }, [shareUrl])

  const persist = (ranges: SavedRange[]) => {
    setSaved(ranges)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ranges)) } catch { onError('La sauvegarde locale est indisponible dans ce navigateur.') }
  }
  const save = () => {
    const clean = name.trim()
    if (!clean) return
    persist([...saved, { id: Date.now().toString(), name: clean, comboMap: { ...map }, createdAt: new Date().toLocaleDateString('fr-FR') }])
    setName('')
  }
  const paintCombo = (combo: string) => setMap((previous) => {
    const next = { ...previous }
    if (paint === ERASE || previous[combo] === paint) delete next[combo]
    else next[combo] = paint
    return next
  })
  const exportCode = async () => {
    try {
      await navigator.clipboard.writeText(encodeShare(map))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { onError('Copie impossible : autorise le presse-papiers.') }
  }
  const importRange = () => {
    try {
      setMap(() => sanitizeRange(decodeShare(importCode.trim())))
      setShowImport(false); setImportCode('')
    } catch { onError('Code invalide : vérifie que tu as bien copié le code entier.') }
  }
  const share = () => {
    const payload = encodeURIComponent(encodeShare({ name: name.trim() || 'Ma range', comboMap: map }))
    setShareUrl(`${window.location.origin}/trainer/ranges?share=${payload}`)
    setShareCopied(false)
  }
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2500)
    } catch { onError('Copie impossible : autorise le presse-papiers.') }
  }

  const combosFor = (action: string) => Object.entries(map).filter(([, value]) => value === action).reduce((sum, [hand]) => sum + countCombos(hand), 0)
  const total = Object.keys(map).reduce((sum, hand) => sum + countCombos(hand), 0)

  return (
    <div className="tr-main tr-main-explore">
      <aside className="tr-side" aria-label="Palette et sauvegarde">
        <div className="tr-side-block">
          <p className="t-caps">Pinceau</p>
          <ul className="tr-palette">
            {CUSTOM_ACTIONS.map((action) => (
              <li key={action}>
                <button type="button" className="tr-paint" aria-pressed={paint === action} onClick={() => setPaint(action)}>
                  <i data-fam={familyOf(action)} aria-hidden="true" />{action}<b>{combosFor(action) || ''}</b>
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="tr-paint" aria-pressed={paint === ERASE} onClick={() => setPaint(ERASE)}>
                <Eraser size={12} aria-hidden="true" />Gomme
              </button>
            </li>
          </ul>
          <p className="tr-total"><span>Total</span><b>{total} combos · {formatPct(Math.round((total / TOTAL_COMBOS) * 1000) / 10)}</b></p>
        </div>
        <div className="tr-side-block">
          <label className="t-caps" htmlFor="tr-range-name">Sauvegarder</label>
          <div className="tr-inline">
            <input id="tr-range-name" className="ui-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom de la range" maxLength={60} />
            <button type="button" className="ui-btn ui-btn-secondary" disabled={!name.trim()} onClick={save}>OK</button>
          </div>
        </div>
        <div className="tr-side-block tr-side-actions">
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={exportCode}>{copied ? 'Copié' : 'Copier le code'}</button>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" aria-expanded={showImport} onClick={() => setShowImport((value) => !value)}>Importer</button>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={share}>Partager</button>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" aria-expanded={showSaved} onClick={() => setShowSaved((value) => !value)}>Mes ranges ({saved.length})</button>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={total === 0} onClick={() => setMap(() => ({}))}>Tout effacer</button>
        </div>
        {showImport && (
          <div className="tr-side-block">
            <label className="t-caps" htmlFor="tr-range-import">Code de la range</label>
            <div className="tr-inline">
              <input id="tr-range-import" className="ui-input" value={importCode} onChange={(event) => setImportCode(event.target.value)} placeholder="Colle le code" />
              <button type="button" className="ui-btn ui-btn-secondary" disabled={!importCode.trim()} onClick={importRange}>OK</button>
            </div>
          </div>
        )}
        {showSaved && (
          <div className="tr-side-block">
            {saved.length === 0 ? <p className="t-2">Aucune range sauvegardée.</p> : (
              <ul className="tr-saved">
                {saved.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="tr-saved-open" onClick={() => { setMap(() => sanitizeRange(item.comboMap)); setShowSaved(false) }}>
                      <b>{item.name}</b><span>{Object.keys(item.comboMap ?? {}).length} mains · {item.createdAt}</span>
                    </button>
                    <button type="button" className="tr-saved-del" aria-label={`Supprimer la range ${item.name}`} onClick={() => persist(saved.filter((range) => range.id !== item.id))}>Suppr.</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
      <section className="tr-panel" aria-label="Grille de la range personnalisée">
        <header className="tr-panel-head">
          <div>
            <p className="t-caps">Range personnalisée</p>
            <p className="tr-panel-title">{total === 0 ? 'Appuie et glisse sur les mains à peindre' : `${Object.keys(map).length} mains peintes`}</p>
          </div>
        </header>
        <Matrix actionOf={(combo) => map[combo]} revealed onPaint={paintCombo} />
      </section>

      <dialog ref={dialogRef} className="tr-dialog" aria-labelledby="tr-share-title" onClose={() => setShareUrl('')}>
        <h2 id="tr-share-title" className="t-heading">Envoie ce lien à tes joueurs</h2>
        <p className="t-2">Ils ouvrent le lien et importent ta range dans leur grille.</p>
        <p className={cx('tr-share-url')}>{shareUrl}</p>
        <div className="tr-dialog-actions">
          <button type="button" className="ui-btn ui-btn-primary" onClick={copyShare}>{shareCopied ? 'Lien copié' : 'Copier le lien'}</button>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setShareUrl('')}>Fermer</button>
        </div>
      </dialog>
    </div>
  )
}
