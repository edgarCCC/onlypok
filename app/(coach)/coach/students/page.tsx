'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import {
  Users, MessageSquare, Clock, BookOpen, Video, Zap, Shield,
  ChevronDown, ChevronRight, CalendarDays, FileText, Tag, TrendingUp,
  CheckCircle2, AlertCircle,
} from 'lucide-react'

const CREAM  = 'var(--text)'
const SILVER = 'var(--text-2)'
const DIM    = 'color-mix(in srgb, var(--brand) 20%, transparent)'
const VIOLET = 'var(--brand)'
const CYAN   = 'var(--brand)'
const AMBER  = 'var(--brand)'
const EMER   = 'var(--gain)'

const TYPE_COLORS: Record<string, string>          = { formation: VIOLET, video: CYAN, coaching: AMBER }
const TYPE_ICONS: Record<string, React.ElementType> = { formation: BookOpen, video: Video, coaching: Zap }

function isNew(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) < 7 * 24 * 3600 * 1000
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StatusDot({ status }: { status: string }) {
  if (status === 'scheduled') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${EMER} 7%, transparent)`, color: EMER, border: `1px solid color-mix(in srgb, ${EMER} 16%, transparent)` }}>
      <CheckCircle2 size={9} /> Planifiée
    </span>
  )
  if (status === 'completed') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${CYAN} 7%, transparent)`, color: CYAN, border: `1px solid color-mix(in srgb, ${CYAN} 16%, transparent)` }}>
      <CheckCircle2 size={9} /> Terminée
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${AMBER} 7%, transparent)`, color: AMBER, border: `1px solid color-mix(in srgb, ${AMBER} 16%, transparent)` }}>
      <AlertCircle size={9} /> En attente
    </span>
  )
}

export default function StudentsPage() {
  const router   = useRouter()
  const { user } = useUser()
  const [loading,   setLoading]   = useState(true)
  const [purchases, setPurchases] = useState<any[]>([])
  const [bookings,  setBookings]  = useState<any[]>([])
  const [expanded,  setExpanded]  = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetch('/api/coach/students')
      .then(r => r.ok ? r.json() : { purchases: [], bookings: [] })
      .then(({ purchases: p, bookings: b }) => {
        setPurchases(p ?? [])
        setBookings(b ?? [])
        setLoading(false)
      })
  }, [user])

  const now          = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const newThisMonth = purchases.filter(p => p.created_at?.slice(0, 7) === thisMonthKey).length

  const byStudent = useMemo(() => {
    const map = new Map<string, { id: string; username: string; avatar_url: string | null; purchases: any[]; sessions: any[] }>()

    for (const p of purchases) {
      const uid      = p.profiles?.id ?? p.user_id ?? p.id
      const username = p.profiles?.username ?? 'Élève anonyme'
      const avatar   = p.profiles?.avatar_url ?? null
      if (!map.has(uid)) map.set(uid, { id: uid, username, avatar_url: avatar, purchases: [], sessions: [] })
      map.get(uid)!.purchases.push(p)
    }

    for (const b of bookings) {
      const uid      = b.student_id
      const username = b.student?.username ?? 'Élève anonyme'
      const avatar   = b.student?.avatar_url ?? null
      if (!map.has(uid)) map.set(uid, { id: uid, username, avatar_url: avatar, purchases: [], sessions: [] })
      map.get(uid)!.sessions.push(b)
    }

    return Array.from(map.values()).sort((a, b) => {
      const aDate = Math.max(...[...a.purchases, ...a.sessions].map(x => new Date(x.created_at).getTime()), 0)
      const bDate = Math.max(...[...b.purchases, ...b.sessions].map(x => new Date(x.created_at).getTime()), 0)
      return bDate - aDate
    })
  }, [purchases, bookings])

  const uniqueStudents = byStudent.length
  const totalSessions  = bookings.filter(b => b.status === 'completed').length

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FourAcesLoader fullPage={false} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'transparent' }} />
      <style>{`
        @media (max-width: 860px) {
          .cstu-container { padding: 24px 16px !important; }
          .cstu-title { font-size: 32px !important; }
          .cstu-row { flex-wrap: wrap !important; }
        }
        @media (max-width: 700px) {
          .cstu-kpis { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="cstu-container" style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Communauté</p>
          <h1 className="cstu-title" style={{ fontSize: 'var(--text-title)', fontWeight: 600, color: CREAM, letterSpacing: '-.022em', lineHeight: 1.14, fontFamily: 'var(--font-syne,sans-serif)', margin: 0 }}>Mes élèves</h1>
        </div>

        {/* KPIs */}
        <div className="cstu-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Élèves uniques',   value: uniqueStudents,  sub: 'au total',           color: CYAN },
            { label: 'Ce mois-ci',       value: newThisMonth,    sub: 'nouveaux achats',     color: VIOLET },
            { label: 'Sessions terminées', value: totalSessions, sub: 'coachings effectués', color: EMER },
          ].map(k => (
            <div key={k.label} style={{ background: `color-mix(in srgb, ${k.color} 2%, transparent)`, border: `1px solid color-mix(in srgb, ${k.color} 9%, transparent)`, borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{k.label}</div>
              <div style={{ fontSize: 32, fontWeight: 600, color: CREAM, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: SILVER }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Liste élèves */}
        {byStudent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Users size={32} color={SILVER} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ color: SILVER, fontSize: 14 }}>Aucun élève pour l'instant</p>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 6 }}>Ils apparaîtront dès leur premier achat</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byStudent.map(({ id, username, avatar_url, purchases: ps, sessions }) => {
              const lastDate        = Math.max(...[...ps, ...sessions].map(x => new Date(x.created_at).getTime()), 0)
              const newest          = ps.some(p => isNew(p.created_at))
              const sessionCount    = sessions.length
              const completedCount  = sessions.filter(s => s.status === 'completed').length
              const isOpen          = expanded === id
              const avgProgress     = sessions.filter(s => s.progress_score != null).reduce((a, s, _, arr) => a + s.progress_score / arr.length, 0)
              const hasNotes        = sessions.some(s => s.notes)

              return (
                <div key={id} style={{ background: 'color-mix(in srgb, var(--brand) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 7%, transparent)', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'color-mix(in srgb, var(--brand) 12%, transparent)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'color-mix(in srgb, var(--brand) 7%, transparent)'}>

                  {/* Row principale */}
                  <div className="cstu-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px' }}>

                    {/* Avatar */}
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${VIOLET}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--on-brand)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                      {avatar_url
                        ? <Image src={avatar_url} alt={username} fill sizes="44px" style={{ objectFit: 'cover' }} />
                        : username[0].toUpperCase()
                      }
                    </div>

                    {/* Infos centre */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{username}</span>
                        {newest && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${CYAN} 9%, transparent)`, color: CYAN, letterSpacing: '0.1em' }}>NOUVEAU</span>}
                        {sessionCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${AMBER} 7%, transparent)`, color: AMBER }}>{sessionCount} session{sessionCount > 1 ? 's' : ''}</span>}
                        {hasNotes && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${VIOLET} 7%, transparent)`, color: VIOLET }}>Notes</span>}
                      </div>

                      {/* Achats */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {ps.map((p: any, j: number) => {
                          const type = p.formations?.content_type ?? 'formation'
                          const c    = TYPE_COLORS[type] ?? VIOLET
                          const Icon = TYPE_ICONS[type] ?? BookOpen
                          return (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: SILVER, padding: '3px 8px', borderRadius: 6, background: `color-mix(in srgb, ${c} 3%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 13%, transparent)` }}>
                              <Icon size={9} color={c} />
                              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.formations?.title ?? 'Formation'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Actions droite */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} />
                        {lastDate ? fmtDate(new Date(lastDate).toISOString()) : '—'}
                      </div>

                      {/* Bouton Message */}
                      <button
                        onClick={() => router.push(`/coach/messages?student_id=${id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: CYAN, padding: '6px 12px', borderRadius: 8, border: `1px solid color-mix(in srgb, ${CYAN} 19%, transparent)`, background: `color-mix(in srgb, ${CYAN} 3%, transparent)`, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${CYAN} 9%, transparent)`; (e.currentTarget as HTMLButtonElement).style.borderColor = `color-mix(in srgb, ${CYAN} 31%, transparent)` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${CYAN} 3%, transparent)`; (e.currentTarget as HTMLButtonElement).style.borderColor = `color-mix(in srgb, ${CYAN} 19%, transparent)` }}
                      >
                        <MessageSquare size={12} /> Message
                      </button>

                      {/* Toggle historique sessions */}
                      {sessionCount > 0 && (
                        <button
                          onClick={() => setExpanded(isOpen ? null : id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: isOpen ? VIOLET : SILVER, padding: '6px 12px', borderRadius: 8, border: `1px solid ${isOpen ? `color-mix(in srgb, ${VIOLET} 25%, transparent)` : 'color-mix(in srgb, var(--brand) 10%, transparent)'}`, background: isOpen ? `color-mix(in srgb, ${VIOLET} 6%, transparent)` : 'transparent', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { if (!isOpen) { (e.currentTarget as HTMLButtonElement).style.color = CREAM; (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in srgb, var(--brand) 20%, transparent)' } }}
                          onMouseLeave={e => { if (!isOpen) { (e.currentTarget as HTMLButtonElement).style.color = SILVER; (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in srgb, var(--brand) 10%, transparent)' } }}
                        >
                          <CalendarDays size={12} />
                          Sessions
                          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Historique sessions — dépliable */}
                  {isOpen && sessionCount > 0 && (
                    <div style={{ borderTop: '1px solid color-mix(in srgb, var(--brand) 6%, transparent)', padding: '16px 22px 20px', background: 'color-mix(in srgb, var(--brand) 2%, transparent)' }}>

                      {/* Résumé progression */}
                      {completedCount > 0 && avgProgress > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: `color-mix(in srgb, ${VIOLET} 3%, transparent)`, border: `1px solid color-mix(in srgb, ${VIOLET} 9%, transparent)` }}>
                          <TrendingUp size={14} color={VIOLET} />
                          <span style={{ fontSize: 12, color: SILVER }}>{completedCount} session{completedCount > 1 ? 's' : ''} terminée{completedCount > 1 ? 's' : ''}</span>
                          <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'color-mix(in srgb, var(--overlay) 6%, transparent)' }}>
                            <div style={{ width: `${avgProgress * 10}%`, height: '100%', borderRadius: 99, background: `${VIOLET}` }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: VIOLET }}>{avgProgress.toFixed(1)}/10</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sessions.map((s: any, idx: number) => (
                          <div key={s.id} style={{ borderRadius: 12, border: '1px solid color-mix(in srgb, var(--brand) 7%, transparent)', background: 'color-mix(in srgb, var(--brand) 2%, transparent)', overflow: 'hidden' }}>

                            {/* Header session */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', flexShrink: 0 }}>#{sessions.length - idx}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: CREAM, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {s.formation?.title ?? 'Session coaching'}
                                </div>
                                {s.scheduled_at && (
                                  <div style={{ fontSize: 11, color: SILVER, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={10} /> {fmtDateTime(s.scheduled_at)}
                                  </div>
                                )}
                              </div>
                              <StatusDot status={s.status} />
                              {s.progress_score != null && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: VIOLET, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${VIOLET} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${VIOLET} 15%, transparent)`, flexShrink: 0 }}>
                                  {s.progress_score}/10
                                </span>
                              )}
                            </div>

                            {/* Notes */}
                            {s.notes && (
                              <div style={{ padding: '0 16px 12px', borderTop: '1px solid color-mix(in srgb, var(--brand) 5%, transparent)', paddingTop: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                  <FileText size={12} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 2 }} />
                                  <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{s.notes}</p>
                                </div>
                              </div>
                            )}

                            {/* Tags */}
                            {s.tags && s.tags.length > 0 && (
                              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Tag size={10} color="var(--text-3)" />
                                {s.tags.map((tag: string) => (
                                  <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: `color-mix(in srgb, ${CYAN} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${CYAN} 13%, transparent)`, color: CYAN }}>{tag}</span>
                                ))}
                              </div>
                            )}

                            {/* Empty notes hint */}
                            {!s.notes && (!s.tags || s.tags.length === 0) && (
                              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={11} color="var(--text-3)" />
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Pas encore de notes pour cette session</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* RGPD */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 40, padding: '16px 20px', borderRadius: 12, background: 'color-mix(in srgb, var(--brand) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 5%, transparent)' }}>
          <Shield size={16} color={SILVER} style={{ flexShrink: 0, marginTop: 1, opacity: 0.4 }} />
          <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: 'var(--text-3)' }}>Confidentialité & RGPD.</strong> Tu n'as accès qu'aux données relatives à tes propres contenus : username, contenus achetés, notes de sessions et date. Ces données sont traitées conformément au RGPD.
          </p>
        </div>
      </div>
    </div>
  )
}
