'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarCheck, MessageSquare, Video, Hourglass } from 'lucide-react'
import { CREAM, SILVER, VIOLET, CYAN, AMBER, GREEN, EmptyState, type Booking, type StudentLite } from './request-ui'

const DIM = 'rgba(240,244,255,0.22)'

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const that  = new Date(d); that.setHours(0, 0, 0, 0)
  const diff  = Math.round((that.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function StudentAvatar({ student, size = 38 }: { student: StudentLite | null | undefined; size?: number }) {
  const name = student?.username ?? 'Élève'
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
      {student?.avatar_url
        ? <Image src={student.avatar_url} alt="" fill sizes={`${size}px`} style={{ objectFit: 'cover' }} />
        : name[0]?.toUpperCase()}
    </span>
  )
}

function messageHref(studentId: string) {
  return `/coach/messages?student_id=${encodeURIComponent(studentId)}`
}

/* Séances confirmées à venir, groupées par jour, + crédits payés dont
   l'élève n'a pas encore choisi le créneau (regroupés par élève). */
export default function UpcomingPanel({ bookings }: { bookings: Booking[] }) {
  const [now] = useState(() => Date.now())
  // Séances confirmées à venir ; celles sans date (anomalie possible) restent visibles
  const upcoming = bookings
    .filter(b => b.status === 'scheduled' && (!b.scheduled_at || new Date(b.scheduled_at).getTime() >= now - 60 * 60 * 1000))
    .sort((a, b) => (a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity) - (b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity))

  const byDay = new Map<string, Booking[]>()
  for (const b of upcoming) {
    const key = b.scheduled_at ? dayLabel(b.scheduled_at) : 'Date à confirmer'
    byDay.set(key, [...(byDay.get(key) ?? []), b])
  }

  const waiting = bookings.filter(b => b.status === 'paid_pending_schedule')
  const groups = new Map<string, { student: StudentLite | null | undefined; studentId: string; count: number; titles: Set<string> }>()
  for (const b of waiting) {
    const g = groups.get(b.student_id) ?? { student: b.student, studentId: b.student_id, count: 0, titles: new Set<string>() }
    g.count++
    if (b.formation?.title) g.titles.add(b.formation.title)
    groups.set(b.student_id, g)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {upcoming.length === 0
        ? <EmptyState icon={CalendarCheck} color={GREEN} title="Aucune séance à venir" sub="Les séances confirmées apparaîtront ici, avec le lien de visio." />
        : [...byDay.entries()].map(([day, items]) => (
            <section key={day} aria-label={day}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: day === "Aujourd'hui" ? GREEN : SILVER, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>{day}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(b => (
                  <div key={b.id} className="agenda-row">
                    <span style={{ fontSize: 18, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', minWidth: 56, fontVariantNumeric: 'tabular-nums' }}>{b.scheduled_at ? hour(b.scheduled_at) : '—'}</span>
                    <StudentAvatar student={b.student} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: 0 }}>{b.student?.username ?? 'Élève'}</p>
                      <p style={{ fontSize: 12, color: SILVER, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.formation?.title ?? 'Coaching'}{b.pack_index != null ? ` · séance du pack` : ''}
                      </p>
                    </div>
                    <div className="agenda-row-actions">
                      <Link href={messageHref(b.student_id)} className="agenda-btn" aria-label={`Écrire à ${b.student?.username ?? "l'élève"}`}>
                        <MessageSquare size={14} />
                      </Link>
                      {b.meeting_url && (
                        <a href={b.meeting_url} target="_blank" rel="noopener noreferrer" className="agenda-btn agenda-btn-primary">
                          <Video size={14} /> Rejoindre
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

      {groups.size > 0 && (
        <section aria-label="Séances payées sans créneau">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 6px' }}>
            <Hourglass size={13} color={AMBER} />
            <h3 style={{ fontSize: 12, fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Payées, créneau à choisir par l&apos;élève
            </h3>
          </div>
          <p style={{ fontSize: 12, color: DIM, margin: '0 0 12px' }}>
            Rien à faire de votre côté : l&apos;élève propose un créneau, vous le validerez dans « À valider ».
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...groups.values()].map(g => (
              <div key={g.studentId} className="agenda-row">
                <StudentAvatar student={g.student} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: 0 }}>
                    {g.student?.username ?? 'Élève'}
                    <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, marginLeft: 8 }}>{g.count} séance{g.count > 1 ? 's' : ''}</span>
                  </p>
                  <p style={{ fontSize: 12, color: SILVER, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[...g.titles].join(' · ') || 'Coaching'}</p>
                </div>
                <Link href={messageHref(g.studentId)} className="agenda-btn">
                  <MessageSquare size={14} /> <span className="agenda-btn-label">Relancer</span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
