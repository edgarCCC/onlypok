'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import s from './Panel.module.css'
import Flag, { FLAG_CODES, FLAG_BANK } from './Flag'
import type { AvatarKey, FormatKey, RoleKey, CardData, FxData } from './PlayerCard'

const AVATAR_OPTIONS: { id: AvatarKey; name: string }[] = [
  { id: 'fish1',  name: 'Fish · I'      },
  { id: 'fish2',  name: 'Fish · II'     },
  { id: 'fish3',  name: 'Fish · III'    },
  { id: 'fish4',  name: 'Fish · IV'     },
  { id: 'fish5',  name: 'Fish · V'      },
  { id: 'fish6',  name: 'Fish · VI'     },
  { id: 'shark1', name: 'Shark · I'     },
  { id: 'shark2', name: 'Shark · II'    },
  { id: 'shark3', name: 'Shark · III'   },
  { id: 'shark4', name: 'Shark · IV'    },
  { id: 'shark5', name: 'Shark · V'     },
  { id: 'shark6', name: 'Shark · VI'    },
]

const FORMAT_OPTIONS: { id: FormatKey; name: string }[] = [
  { id: 'MTT',       name: 'MTT'       },
  { id: 'CASH GAME', name: 'Cash Game' },
  { id: 'EXPRESSO',  name: 'Expresso'  },
]

const fmtVolume = (v: number) => {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'K'
  return String(v)
}

// ── Sub-components ────────────────────────────────────────────

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className={s.field}>
      <div className={s.fieldLabel}>
        <span>{label}</span>
        {value !== undefined && <span className={s.fieldVal}>{value}</span>}
      </div>
      {children}
    </div>
  )
}

function Picker<T extends { id: string; name: string }>({
  items, valueId, onChange,
}: { items: T[]; valueId: string; onChange: (id: string) => void }) {
  const idx = Math.max(0, items.findIndex(i => i.id === valueId))
  const go = (d: number) => {
    const next = (idx + d + items.length) % items.length
    onChange(items[next].id)
  }
  return (
    <div className={s.pickerRow}>
      <button className={s.pickerBtn} onClick={() => go(-1)}>‹</button>
      <div className={s.pickerCurrent}>{items[idx].name}</div>
      <button className={s.pickerBtn} onClick={() => go(1)}>›</button>
    </div>
  )
}

function Slider({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void
  min: number; max: number; step: number
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={s.sliderRow}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function RoleToggle({ value, onChange }: { value: RoleKey; onChange: (v: RoleKey) => void }) {
  return (
    <div className={s.roleToggle}>
      <button
        className={`${s.rtOpt} ${value === 'student' ? s.rtOptActive : ''}`}
        onClick={() => onChange('student')}
      >
        STUDENT
      </button>
      <button
        className={`${s.rtOpt} ${value === 'coach' ? s.rtOptActive : ''}`}
        onClick={() => onChange('coach')}
      >
        COACH
      </button>
      <div className={`${s.rtThumb} ${value === 'coach' ? s.rtThumbCoach : ''}`} />
    </div>
  )
}

function FlagDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const list = FLAG_CODES.filter(c => {
    if (!q) return true
    const name = FLAG_BANK[c]?.name || ''
    return c.toLowerCase().includes(q.toLowerCase()) || name.toLowerCase().includes(q.toLowerCase())
  })

  const current = FLAG_BANK[value]

  return (
    <div className={s.dropdown} ref={ref}>
      <button
        className={`${s.ddTrigger} ${open ? s.ddTriggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {current && <Flag code={value} />}
        <span className={s.ddName}>{current?.name || value}</span>
        <span className={`${s.ddCaret} ${open ? s.ddCaretOpen : ''}`}>▾</span>
      </button>
      {open && (
        <div className={s.ddPanel}>
          <div className={s.ddSearchWrap}>
            <input
              className={s.ddSearch}
              autoFocus
              placeholder="Search countries…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className={s.ddList}>
            {list.map(c => (
              <button
                key={c}
                className={`${s.ddItem} ${c === value ? s.ddItemSelected : ''}`}
                onClick={() => { onChange(c); setOpen(false); setQ('') }}
              >
                <Flag code={c} />
                <span>{FLAG_BANK[c].name}</span>
              </button>
            ))}
            {list.length === 0 && <div className={s.ddEmpty}>No matches</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────

interface Props {
  data: CardData
  setData: React.Dispatch<React.SetStateAction<CardData>>
  fx: FxData
  setFx: React.Dispatch<React.SetStateAction<FxData>>
}

export default function Panel({ data, setData, fx, setFx }: Props) {
  const set = <K extends keyof CardData>(k: K, v: CardData[K]) =>
    setData(d => ({ ...d, [k]: v }))
  const setF = <K extends keyof FxData>(k: K, v: FxData[K]) =>
    setFx(f => ({ ...f, [k]: v }))

  const volumeRaw = (() => {
    const m = String(data.volume).match(/^([\d.]+)(K)?/i)
    if (!m) return 10000
    return parseFloat(m[1]) * (m[2] ? 1000 : 1)
  })()

  return (
    <aside className={s.panel}>
      <header className={s.panelHead}>
        <div className={s.panelEyebrow}>SANDBOX</div>
        <h2 className={s.panelTitle}>Build your card</h2>
      </header>

      <section className={s.panelSection}>
        <div className={s.sectionTitle}>Identity</div>
        <Field label="Pseudonym">
          <input
            className={s.textIn}
            value={data.pseudo}
            maxLength={14}
            placeholder="ENTER PSEUDO"
            onChange={e => set('pseudo', e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Country">
          <FlagDropdown value={data.country} onChange={v => set('country', v)} />
        </Field>
      </section>

      <section className={s.panelSection}>
        <div className={s.sectionTitle}>Rating &amp; role</div>
        <Field label="Overall rating" value={String(data.rating)}>
          <Slider value={data.rating} onChange={v => set('rating', v)} min={40} max={99} step={1} />
        </Field>
        <Field label="Role">
          <RoleToggle value={data.role} onChange={v => set('role', v)} />
        </Field>
        <Field label="Avatar" value={AVATAR_OPTIONS.find(a => a.id === data.avatar)?.name}>
          <Picker items={AVATAR_OPTIONS} valueId={data.avatar} onChange={v => set('avatar', v as AvatarKey)} />
        </Field>
        <Field label="Format" value={data.format}>
          <Picker items={FORMAT_OPTIONS} valueId={data.format} onChange={v => set('format', v as FormatKey)} />
        </Field>
      </section>

      <section className={s.panelSection}>
        <div className={s.sectionTitle}>Core stats</div>
        <Field label="ABI" value={`$${data.abi}`}>
          <Slider value={data.abi} onChange={v => set('abi', v)} min={1} max={2000} step={1} />
        </Field>
        <Field label="Volume" value={`${data.volume} hands`}>
          <Slider value={volumeRaw} onChange={v => set('volume', fmtVolume(v))} min={500} max={5000000} step={500} />
        </Field>
        <Field label="ROI" value={`${data.roi}%`}>
          <Slider value={data.roi} onChange={v => set('roi', v)} min={-30} max={80} step={1} />
        </Field>
      </section>

      {data.role === 'student' ? (
        <section className={s.panelSection}>
          <div className={s.sectionTitle}>Student stats</div>
          <Field label="GTO Score" value={`${data.gto}%`}>
            <Slider value={data.gto} onChange={v => set('gto', v)} min={0} max={100} step={1} />
          </Field>
          <Field label="Streak" value={`${data.streak} days`}>
            <Slider value={data.streak} onChange={v => set('streak', v)} min={0} max={365} step={1} />
          </Field>
          <Field label="Trophies" value={`${data.trophies} / 50`}>
            <Slider value={data.trophies} onChange={v => set('trophies', v)} min={0} max={50} step={1} />
          </Field>
        </section>
      ) : (
        <section className={s.panelSection}>
          <div className={s.sectionTitle}>Coach stats</div>
          <Field label="Rating" value={`${data.coachRating} / 5`}>
            <Slider value={data.coachRating} onChange={v => set('coachRating', parseFloat(v.toFixed(1)))} min={0} max={5} step={0.1} />
          </Field>
          <Field label="Reach" value={`${data.coachReach} players`}>
            <Slider
              value={Number(String(data.coachReach).replace('K', '')) * (String(data.coachReach).includes('K') ? 1000 : 1)}
              onChange={v => set('coachReach', fmtVolume(v))}
              min={100} max={500000} step={100}
            />
          </Field>
          <Field label="Students trained" value={`${data.coachStudents}+`}>
            <Slider value={data.coachStudents} onChange={v => set('coachStudents', v)} min={1} max={5000} step={1} />
          </Field>
        </section>
      )}

      <section className={s.panelSection}>
        <div className={s.sectionTitle}>Effects</div>
        <Field label="Tilt" value={`${fx.tilt}°`}>
          <Slider value={fx.tilt} onChange={v => setF('tilt', v)} min={0} max={25} step={1} />
        </Field>
        <Field label="Noise" value={fx.noise.toFixed(2)}>
          <Slider value={fx.noise} onChange={v => setF('noise', parseFloat(v.toFixed(2)))} min={0} max={1} step={0.05} />
        </Field>
        <Field label="Iridescence" value={fx.iris.toFixed(2)}>
          <Slider value={fx.iris} onChange={v => setF('iris', parseFloat(v.toFixed(2)))} min={0} max={1} step={0.05} />
        </Field>
      </section>
    </aside>
  )
}
