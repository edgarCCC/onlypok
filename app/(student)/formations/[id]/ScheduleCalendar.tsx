'use client'
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle, X, Loader2 } from 'lucide-react'
import { CREAM, SILVER, MONTH_NAMES, CAL_DAYS, calFormatDate, calIsSameDay, calGetMonthDays } from './shared'

/* ─── Native slot picker (coaching) : calendar + time slots ─────────────────── */
export default function ScheduleCalendar({ typeColor, calSlots, calLoading, calYear, calMonth, setCalYear, setCalMonth, calSelDay, setCalSelDay, calSelSlot, setCalSelSlot }: {
  typeColor: string
  calSlots: Date[]
  calLoading: boolean
  calYear: number
  calMonth: number
  setCalYear: React.Dispatch<React.SetStateAction<number>>
  setCalMonth: React.Dispatch<React.SetStateAction<number>>
  calSelDay: Date | null
  setCalSelDay: (d: Date | null) => void
  calSelSlot: Date | null
  setCalSelSlot: (d: Date | null) => void
}) {
  return (
    <div id="slot-picker" style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Calendar size={18} color={typeColor} />
        <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0 }}>Choisis ton créneau</h2>
      </div>
      <p style={{ fontSize: 14, color: SILVER, marginBottom: 24 }}>Sélectionne un jour puis un horaire disponible</p>

      {calLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: SILVER }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: typeColor }} />
          <span style={{ fontSize: 13 }}>Chargement des créneaux…</span>
        </div>
      ) : calSlots.length === 0 ? (
        <div style={{ padding: '24px', borderRadius: 16, background: 'rgba(240,244,255,0.03)', border: '1px solid rgba(240,244,255,0.08)', textAlign: 'center' }}>
          <Clock size={28} color={SILVER} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: SILVER, margin: 0 }}>Aucun créneau disponible pour le moment.</p>
          <p style={{ fontSize: 12, color: SILVER, opacity: 0.6, marginTop: 6 }}>Revenez bientôt ou contactez le coach directement.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>

          {/* Calendar */}
          <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 18, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button onClick={() => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) } else setCalMonth(m => m-1); setCalSelDay(null); setCalSelSlot(null) }}
                style={{ background: 'none', border: 'none', color: SILVER, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 700, fontSize: 14, color: CREAM }}>{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) } else setCalMonth(m => m+1); setCalSelDay(null); setCalSelSlot(null) }}
                style={{ background: 'none', border: 'none', color: SILVER, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
              {CAL_DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: SILVER, paddingBottom: 4 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
              {(() => {
                const { offset, daysInMonth } = calGetMonthDays(calYear, calMonth)
                const slotDays = new Set<string>()
                calSlots.forEach(s => { if (s.getFullYear() === calYear && s.getMonth() === calMonth) slotDays.add(calFormatDate(s)) })
                const todayDate = new Date()
                return [
                  ...Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />),
                  ...Array.from({ length: daysInMonth }, (_, i) => {
                    const day  = i + 1
                    const date = new Date(calYear, calMonth, day)
                    const key  = calFormatDate(date)
                    const has  = slotDays.has(key)
                    const past = date < todayDate && !calIsSameDay(date, todayDate)
                    const sel  = calSelDay ? calIsSameDay(calSelDay, date) : false
                    const isTd = calIsSameDay(date, todayDate)
                    return (
                      <button key={day} disabled={!has || past} onClick={() => { setCalSelDay(date); setCalSelSlot(null) }}
                        style={{ aspectRatio: '1', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: sel ? 800 : 400, cursor: has && !past ? 'pointer' : 'default', background: sel ? `linear-gradient(135deg,${typeColor},#06b6d4)` : has && !past ? `${typeColor}18` : 'transparent', color: sel ? '#fff' : has && !past ? '#c4b5fd' : past ? 'rgba(138,138,138,0.25)' : SILVER, outline: isTd && !sel ? `2px solid ${typeColor}40` : 'none', outlineOffset: -2, transition: 'all 0.15s' }}>
                        {day}
                      </button>
                    )
                  }),
                ]
              })()}
            </div>
          </div>

          {/* Time slots */}
          <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 18, padding: 20, minHeight: 180 }}>
            {!calSelDay ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 10 }}>
                <Calendar size={28} color={SILVER} style={{ opacity: 0.35 }} />
                <p style={{ color: SILVER, fontSize: 12, textAlign: 'center', margin: 0 }}>Sélectionne un jour</p>
              </div>
            ) : (() => {
              const daySlots = calSlots.filter(s => calIsSameDay(s, calSelDay))
              return daySlots.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 10 }}>
                  <Clock size={28} color={SILVER} style={{ opacity: 0.35 }} />
                  <p style={{ color: SILVER, fontSize: 12, margin: 0 }}>Aucun créneau ce jour</p>
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 12 }}>
                    {calSelDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
                    {daySlots.map((slot, i) => {
                      const isSel = calSelSlot ? calSelSlot.getTime() === slot.getTime() : false
                      return (
                        <button key={i} onClick={() => setCalSelSlot(isSel ? null : slot)}
                          style={{ padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: isSel ? `linear-gradient(135deg,${typeColor},#06b6d4)` : 'rgba(232,228,220,0.05)', border: isSel ? 'none' : '1px solid rgba(232,228,220,0.1)', color: isSel ? '#fff' : CREAM, boxShadow: isSel ? `0 4px 16px ${typeColor}40` : 'none' }}>
                          {slot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {calSelSlot && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '11px 16px', borderRadius: 12, background: `${typeColor}10`, border: `1px solid ${typeColor}30` }}>
          <CheckCircle size={15} color={typeColor} />
          <span style={{ fontSize: 13, color: CREAM, fontWeight: 600 }}>
            Créneau sélectionné : {calSelSlot.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {calSelSlot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => { setCalSelSlot(null); setCalSelDay(null) }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: SILVER, cursor: 'pointer', display: 'flex', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
