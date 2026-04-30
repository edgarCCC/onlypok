'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import { ChevronLeft, ChevronRight, Clock, Plus, Trash2, Check, Calendar } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.2)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

const DAYS   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const SLOTS  = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']

type Avail = { id: string; day_of_week: number; slot: string; booked: boolean }

function getDatesOfWeek(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMondayOf(date: Date) {
  const d = new Date(date)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function CoachCalendarPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [avails,   setAvails]   = useState<Avail[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const [calUrl,   setCalUrl]   = useState('')
  const [calSaved, setCalSaved] = useState(false)
  const [savingCal,setSavingCal]= useState(false)
  const [activeSlot, setActiveSlot] = useState<{ day: number; slot: string } | null>(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: profile } = await supabase.from('profiles').select('calendar_url').eq('id', user.id).single()
      setCalUrl(profile?.calendar_url ?? '')

      const { data } = await supabase
        .from('availabilities')
        .select('*')
        .eq('coach_id', user.id)
        .order('day_of_week').order('slot')
      setAvails(data ?? [])
      setLoading(false)
    }
    load()
  }, [user, supabase])

  const toggleSlot = async (dayOfWeek: number, slot: string) => {
    if (!user) return
    const key = `${dayOfWeek}-${slot}`
    setSaving(key)
    const existing = avails.find(a => a.day_of_week === dayOfWeek && a.slot === slot)
    if (existing) {
      if (existing.booked) { setSaving(null); return }
      await supabase.from('availabilities').delete().eq('id', existing.id)
      setAvails(prev => prev.filter(a => a.id !== existing.id))
    } else {
      const { data } = await supabase.from('availabilities')
        .insert({ coach_id: user.id, day_of_week: dayOfWeek, slot, booked: false })
        .select().single()
      if (data) setAvails(prev => [...prev, data])
    }
    setSaving(null)
  }

  const saveCalUrl = async () => {
    if (!user || savingCal) return
    setSavingCal(true)
    await supabase.from('profiles').update({ calendar_url: calUrl }).eq('id', user.id)
    setSavingCal(false)
    setCalSaved(true)
    setTimeout(() => setCalSaved(false), 2400)
  }

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }
  const goToday  = () => setWeekStart(getMondayOf(new Date()))

  const weekDates = getDatesOfWeek(weekStart)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const availSet = new Set(avails.map(a => `${a.day_of_week}-${a.slot}`))
  const bookedSet = new Set(avails.filter(a => a.booked).map(a => `${a.day_of_week}-${a.slot}`))

  const totalSlots  = avails.length
  const bookedSlots = avails.filter(a => a.booked).length

  if (loading) return <FourAcesLoader />

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 25% at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 4 }}>Calendrier</h1>
            <p style={{ fontSize: 13, color: SILVER }}>Gérez vos créneaux disponibles pour les sessions coaching</p>
          </div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Créneaux ouverts', value: totalSlots - bookedSlots, color: VIOLET },
              { label: 'Réservés', value: bookedSlots, color: CYAN },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: SILVER, margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cal URL */}
        <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '18px 20px', marginBottom: 28, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Calendar size={15} color={VIOLET} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: CREAM, marginBottom: 6 }}>Lien Calendly / Cal.com</p>
            <input
              value={calUrl}
              onChange={e => setCalUrl(e.target.value)}
              placeholder="https://calendly.com/votre-lien"
              style={{ width: '100%', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 8, padding: '8px 12px', color: CREAM, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={saveCalUrl} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: calSaved ? 'rgba(6,182,212,0.2)' : VIOLET, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
            {calSaved ? <><Check size={13} /> Enregistré</> : savingCal ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>

        {/* Week nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={prevWeek} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: CREAM, minWidth: 220, textAlign: 'center' }}>
            {weekDates[0].getDate()} {MONTHS[weekDates[0].getMonth()]} — {weekDates[6].getDate()} {MONTHS[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}
          </span>
          <button onClick={nextWeek} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(232,228,220,0.1)', background: 'transparent', color: SILVER, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={goToday} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.1)', color: '#c4b5fd', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Aujourd'hui
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 11, color: SILVER }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: `${VIOLET}60`, display: 'inline-block' }} />Disponible</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: `${CYAN}60`, display: 'inline-block' }} />Réservé</span>
          </div>
        </div>

        {/* Grid */}
        <div style={{ background: 'rgba(232,228,220,0.02)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, overflow: 'hidden' }}>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)', borderBottom: '1px solid rgba(232,228,220,0.07)' }}>
            <div />
            {weekDates.map((date, i) => {
              const isToday = date.getTime() === today.getTime()
              return (
                <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: '1px solid rgba(232,228,220,0.05)' }}>
                  <p style={{ fontSize: 11, color: SILVER, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{DAYS[i]}</p>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isToday ? VIOLET : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <p style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? '#fff' : CREAM, margin: 0 }}>{date.getDate()}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time slots */}
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {SLOTS.map(slot => (
              <div key={slot} style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)', borderBottom: '1px solid rgba(232,228,220,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px' }}>
                  <span style={{ fontSize: 10, color: DIM, fontVariantNumeric: 'tabular-nums' }}>{slot}</span>
                </div>
                {DAYS.map((_, dayIdx) => {
                  const dayOfWeek = dayIdx + 1
                  const key = `${dayOfWeek}-${slot}`
                  const available = availSet.has(key)
                  const booked = bookedSet.has(key)
                  const isSaving = saving === key
                  const isActive = activeSlot?.day === dayOfWeek && activeSlot?.slot === slot

                  return (
                    <div
                      key={dayIdx}
                      onClick={() => !booked && toggleSlot(dayOfWeek, slot)}
                      onMouseEnter={() => !booked && setActiveSlot({ day: dayOfWeek, slot })}
                      onMouseLeave={() => setActiveSlot(null)}
                      style={{
                        borderLeft: '1px solid rgba(232,228,220,0.04)',
                        padding: 4,
                        cursor: booked ? 'default' : 'pointer',
                        transition: 'background 0.1s',
                        background: booked
                          ? `${CYAN}12`
                          : available
                            ? `${VIOLET}15`
                            : isActive ? 'rgba(232,228,220,0.04)' : 'transparent',
                      }}
                    >
                      {isSaving ? (
                        <div style={{ height: '100%', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${VIOLET}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                        </div>
                      ) : booked ? (
                        <div style={{ height: '100%', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 9, color: CYAN, fontWeight: 700 }}>Réservé</span>
                        </div>
                      ) : available ? (
                        <div style={{ height: '100%', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Check size={11} color={VIOLET} />
                        </div>
                      ) : isActive ? (
                        <div style={{ height: '100%', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={13} color={DIM} />
                        </div>
                      ) : (
                        <div style={{ minHeight: 32 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <p style={{ fontSize: 12, color: DIM, marginTop: 16, textAlign: 'center' }}>
          Cliquez sur un créneau pour l'activer ou le désactiver · Les créneaux réservés par des élèves sont verrouillés
        </p>
      </div>
    </div>
  )
}
