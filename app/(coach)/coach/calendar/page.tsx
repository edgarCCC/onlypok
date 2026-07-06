'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import { Check, Loader2, Calendar, Plus, X, TrendingUp } from 'lucide-react'
import SelectInput from '@/components/ui/SelectInput'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.18)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const GREEN  = '#10b981'
const AMBER  = '#f59e0b'

const DAYS_LABEL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const DAYS_SHORT  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const WEEKEND_DAYS = new Set([6, 7]) /* day_of_week: 6=Sam, 7=Dim */

const TIME_OPTIONS: string[] = []
for (let h = 7; h <= 23; h++) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)

type Avail = { id: string; day_of_week: number; slot: string; booked: boolean }
type Range = { from: string; to: string }
type DaySchedule = { enabled: boolean; ranges: Range[] }

function slotsFromRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let h = parseInt(from); h < parseInt(to); h++) out.push(`${String(h).padStart(2, '0')}:00`)
  return out
}

function rangeHours(range: Range) { return parseInt(range.to) - parseInt(range.from) }

function buildScheduleFromAvails(avails: Avail[]): Record<number, DaySchedule> {
  const out: Record<number, DaySchedule> = {}
  for (let d = 1; d <= 7; d++) {
    const slots = avails.filter(a => a.day_of_week === d).map(a => a.slot).sort()
    if (slots.length === 0) { out[d] = { enabled: false, ranges: [{ from: '09:00', to: '18:00' }] }; continue }
    const ranges: Range[] = []
    let start = slots[0]; let prev = parseInt(slots[0])
    for (let i = 1; i < slots.length; i++) {
      const cur = parseInt(slots[i])
      if (cur !== prev + 1) { ranges.push({ from: start, to: `${String(prev + 1).padStart(2, '0')}:00` }); start = slots[i] }
      prev = cur
    }
    ranges.push({ from: start, to: `${String(prev + 1).padStart(2, '0')}:00` })
    out[d] = { enabled: true, ranges }
  }
  return out
}

function fmt(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }

export default function CoachCalendarPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [avails,     setAvails]     = useState<Avail[]>([])
  const [schedule,   setSchedule]   = useState<Record<number, DaySchedule>>({})
  const [hourlyRate, setHourlyRate] = useState<number>(80)
  const [weekendPct, setWeekendPct] = useState<number>(0)
  const [fillRate,   setFillRate]   = useState<number>(70)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: profile }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('hourly_rate, weekend_rate_pct').eq('id', user.id).single(),
        supabase.from('availabilities').select('*').eq('coach_id', user.id).order('day_of_week').order('slot'),
      ])
      setHourlyRate(profile?.hourly_rate ?? 80)
      setWeekendPct(profile?.weekend_rate_pct ?? 0)
      setAvails(rows ?? [])
      setSchedule(buildScheduleFromAvails(rows ?? []))
      setLoading(false)
    }
    load()
  }, [user, supabase])

  const toggleDay = (day: number) =>
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))

  const setRange = (day: number, idx: number, field: 'from' | 'to', val: string) => {
    setSchedule(prev => {
      const ranges = [...prev[day].ranges]
      const range  = { ...ranges[idx], [field]: val }
      if (field === 'from' && parseInt(range.from) >= parseInt(range.to)) {
        const next = parseInt(range.from) + 1
        range.to = next <= 23 ? `${String(next).padStart(2, '0')}:00` : range.from
      }
      if (field === 'to' && parseInt(range.to) <= parseInt(range.from)) {
        const prev2 = parseInt(range.to) - 1
        range.from = prev2 >= 7 ? `${String(prev2).padStart(2, '0')}:00` : range.to
      }
      ranges[idx] = range
      return { ...prev, [day]: { ...prev[day], ranges } }
    })
  }

  const addRange = (day: number) => {
    setSchedule(prev => {
      const last   = prev[day].ranges[prev[day].ranges.length - 1]
      const from   = parseInt(last.to) <= 21 ? last.to : '19:00'
      const to     = `${String(parseInt(from) + 2).padStart(2, '0')}:00`
      return { ...prev, [day]: { ...prev[day], ranges: [...prev[day].ranges, { from, to }] } }
    })
  }

  const removeRange = (day: number, idx: number) =>
    setSchedule(prev => {
      const ranges = prev[day].ranges.filter((_, i) => i !== idx)
      return { ...prev, [day]: { ...prev[day], ranges: ranges.length ? ranges : [{ from: '09:00', to: '18:00' }] } }
    })

  const save = async () => {
    if (!user || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const desired = new Map<string, { day: number; slot: string }>()
      for (let d = 1; d <= 7; d++) {
        const cfg = schedule[d]
        if (!cfg?.enabled) continue
        for (const r of cfg.ranges) for (const slot of slotsFromRange(r.from, r.to)) desired.set(`${d}-${slot}`, { day: d, slot })
      }
      const existingKeys = new Set(avails.map(a => `${a.day_of_week}-${a.slot}`))
      const desiredKeys  = new Set(desired.keys())
      const toDelete = avails.filter(a => !desiredKeys.has(`${a.day_of_week}-${a.slot}`) && !a.booked)
      if (toDelete.length) {
        const { error } = await supabase.from('availabilities').delete().in('id', toDelete.map(a => a.id))
        if (error) throw error
      }
      const toInsert = [...desired.values()].filter(({ day, slot }) => !existingKeys.has(`${day}-${slot}`))
      if (toInsert.length) {
        const { error } = await supabase.from('availabilities').upsert(
          toInsert.map(({ day, slot }) => ({ coach_id: user.id, day_of_week: day, slot, booked: false })),
          { onConflict: 'coach_id,day_of_week,slot', ignoreDuplicates: true }
        )
        if (error) throw error
      }
      const { data, error: fetchErr } = await supabase.from('availabilities').select('*').eq('coach_id', user.id).order('day_of_week').order('slot')
      if (fetchErr) throw fetchErr
      setAvails(data ?? [])
      setSchedule(buildScheduleFromAvails(data ?? []))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Erreur lors de la sauvegarde'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  /* ─── Revenue simulator ─────────────────────────────────────────────────── */
  const weekendRate = weekendPct > 0 ? hourlyRate * (1 + weekendPct / 100) : hourlyRate

  const simStats = useMemo(() => {
    let weekdayHours = 0
    let weekendHours = 0
    for (let d = 1; d <= 7; d++) {
      const cfg = schedule[d]
      if (!cfg?.enabled) continue
      const h = cfg.ranges.reduce((acc, r) => acc + rangeHours(r), 0)
      if (WEEKEND_DAYS.has(d)) weekendHours += h
      else weekdayHours += h
    }
    const totalHours   = weekdayHours + weekendHours
    const weeklyGross  = weekdayHours * hourlyRate + weekendHours * weekendRate
    const filledWeekly = (weekdayHours * hourlyRate * fillRate / 100) + (weekendHours * weekendRate * fillRate / 100)
    const filledHours  = Math.round(totalHours * fillRate / 100)
    return { weekdayHours, weekendHours, totalHours, weeklyGross, filledWeekly, filledHours }
  }, [schedule, hourlyRate, weekendRate, fillRate])

  /* ─── Top stats ──────────────────────────────────────────────────────────── */
  const availableSlots = avails.filter(a => !a.booked).length
  const bookedSlots    = avails.filter(a => a.booked).length
  const activeDays     = Object.values(schedule).filter(d => d.enabled).length

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 25% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />

      <style>{`
        @media (max-width: 560px) {
          .cal-kpis { grid-template-columns: 1fr !important; }
          .cal-day-row { flex-wrap: wrap !important; }
          .cal-sim-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: SILVER, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Espace coach</p>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: '0 0 4px', fontFamily: 'var(--font-syne, sans-serif)' }}>Disponibilités</h1>
          <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>Définis tes plages horaires. Les élèves réservent directement depuis tes pages coaching.</p>
        </div>

        {/* KPIs */}
        <div className="cal-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Heures disponibles', value: availableSlots, color: VIOLET },
            { label: 'Sessions réservées',  value: bookedSlots,    color: CYAN   },
            { label: 'Jours actifs',         value: activeDays,     color: GREEN  },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: SILVER, margin: '3px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Day cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const day        = i + 1
            const cfg        = schedule[day] ?? { enabled: false, ranges: [{ from: '09:00', to: '18:00' }] }
            const isWeekend  = WEEKEND_DAYS.has(day)
            const bookedToday = avails.filter(a => a.day_of_week === day && a.booked).length

            return (
              <div key={day} style={{
                background: cfg.enabled
                  ? isWeekend && weekendPct > 0 ? 'rgba(245,158,11,0.05)' : 'rgba(124,58,237,0.05)'
                  : 'rgba(232,228,220,0.02)',
                border: `1px solid ${cfg.enabled
                  ? isWeekend && weekendPct > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(124,58,237,0.25)'
                  : 'rgba(232,228,220,0.07)'}`,
                borderRadius: 14, padding: '16px 20px', transition: 'all 0.2s',
              }}>
                <div className="cal-day-row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

                  {/* Toggle */}
                  <button onClick={() => toggleDay(day)} style={{ flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: cfg.enabled ? (isWeekend && weekendPct > 0 ? AMBER : VIOLET) : 'rgba(232,228,220,0.12)', transition: 'background 0.2s', position: 'relative', padding: 0 }}>
                    <span style={{ position: 'absolute', top: 3, left: cfg.enabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
                  </button>

                  {/* Day name + weekend badge */}
                  <div style={{ width: 110, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: cfg.enabled ? CREAM : SILVER }}>{DAYS_LABEL[i]}</span>
                    {isWeekend && weekendPct > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}35`, letterSpacing: '0.02em' }}>
                        +{weekendPct}%
                      </span>
                    )}
                  </div>

                  {/* Ranges */}
                  {cfg.enabled ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {cfg.ranges.map((range, ri) => (
                        <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: SILVER, flexShrink: 0 }}>de</span>
                          <SelectInput value={range.from} onChange={v => setRange(day, ri, 'from', v)}
                            options={TIME_OPTIONS.filter(t => parseInt(t) < parseInt(range.to)).map(t => ({ value: t, label: t }))}
                            style={{ width: 'auto' }}
                            selectStyle={{ background: 'rgba(232,228,220,0.07)', border: '1px solid rgba(232,228,220,0.12)', borderRadius: 8, fontSize: 13, fontWeight: 600, padding: '6px 32px 6px 10px' }} />
                          <span style={{ fontSize: 12, color: SILVER, flexShrink: 0 }}>à</span>
                          <SelectInput value={range.to} onChange={v => setRange(day, ri, 'to', v)}
                            options={TIME_OPTIONS.filter(t => parseInt(t) > parseInt(range.from)).map(t => ({ value: t, label: t }))}
                            style={{ width: 'auto' }}
                            selectStyle={{ background: 'rgba(232,228,220,0.07)', border: '1px solid rgba(232,228,220,0.12)', borderRadius: 8, fontSize: 13, fontWeight: 600, padding: '6px 32px 6px 10px' }} />
                          <span style={{ fontSize: 12, color: isWeekend && weekendPct > 0 ? AMBER : SILVER, minWidth: 80, fontWeight: isWeekend && weekendPct > 0 ? 700 : 400 }}>
                            {rangeHours(range)}h
                            {isWeekend && weekendPct > 0 && ` · ${fmt(rangeHours(range) * weekendRate)}€`}
                          </span>
                          {ri > 0 && (
                            <button onClick={() => removeRange(day, ri)} style={{ background: 'none', border: 'none', color: SILVER, cursor: 'pointer', display: 'flex', padding: 2, borderRadius: 4, opacity: 0.7 }}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {cfg.ranges.length < 3 && parseInt(cfg.ranges[cfg.ranges.length - 1].to) <= 21 && (
                        <button onClick={() => addRange(day)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px dashed ${isWeekend && weekendPct > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(124,58,237,0.35)'}`, borderRadius: 7, padding: '4px 10px', color: isWeekend && weekendPct > 0 ? AMBER : '#c4b5fd', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          <Plus size={11} /> Ajouter une plage
                        </button>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: DIM, flex: 1 }}>Non disponible</span>
                  )}

                  {/* Booked badge */}
                  {bookedToday > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30`, flexShrink: 0 }}>
                      {bookedToday} réservé{bookedToday > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── Revenue simulator ────────────────────────────────────────────── */}
        {simStats.totalHours > 0 && (
          <div style={{ background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 18, padding: '24px', marginBottom: 24 }}>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${VIOLET}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={16} color={VIOLET} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: CREAM, margin: 0 }}>Simulateur de revenus</p>
                <p style={{ fontSize: 11, color: SILVER, margin: 0 }}>Basé sur {hourlyRate}€/h{weekendPct > 0 ? ` · week-end +${weekendPct}% (${fmt(weekendRate)}€/h)` : ''}</p>
              </div>
            </div>

            {/* Slider */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: SILVER, fontWeight: 600 }}>Taux de remplissage</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: fillRate >= 70 ? GREEN : fillRate >= 40 ? AMBER : '#ef4444' }}>{fillRate}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5} value={fillRate}
                onChange={e => setFillRate(Number(e.target.value))}
                style={{ width: '100%', accentColor: VIOLET, cursor: 'pointer' }}
              />
            </div>

            {/* Projections grid */}
            <div className="cal-sim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Revenus / semaine', value: `${fmt(simStats.filledWeekly)}€`, sub: `${simStats.filledHours}h sur ${simStats.totalHours}h remplies`, color: VIOLET },
                { label: 'Revenus / mois', value: `${fmt(simStats.filledWeekly * 4.3)}€`, sub: `≈ ${Math.round(simStats.filledHours * 4.3)}h de coaching`, color: CYAN },
              ].map(c => (
                <div key={c.label} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 12, padding: '14px 18px' }}>
                  <p style={{ fontSize: 11, color: SILVER, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{c.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: c.color, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{c.value}</p>
                  <p style={{ fontSize: 11, color: DIM, margin: 0 }}>{c.sub}</p>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Tip */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 18px', borderRadius: 12, background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.12)', marginBottom: 24 }}>
          <Calendar size={15} color={CYAN} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.6, margin: 0 }}>
            Les créneaux déjà réservés sont protégés. Tu peux ajouter plusieurs plages par jour (ex : 9h–12h + 14h–18h).
            Le taux week-end se configure dans ton <a href="/coach/profile" style={{ color: CYAN, textDecoration: 'underline' }}>profil coach</a>.
          </p>
        </div>

        {/* Save error */}
        {saveError && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
              <strong>Erreur de sauvegarde :</strong> {saveError}
            </span>
          </div>
        )}

        {/* Save */}
        <button onClick={save} disabled={saving}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: saved ? 'rgba(16,185,129,0.2)' : saving ? 'rgba(124,58,237,0.4)' : `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, color: saved ? GREEN : '#fff', fontSize: 15, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: saved || saving ? 'none' : '0 4px 24px rgba(124,58,237,0.4)', transition: 'all 0.2s' }}>
          {saving ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement…</>
            : saved ? <><Check size={17} /> Disponibilités enregistrées</>
            : 'Enregistrer mes disponibilités'}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
