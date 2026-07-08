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

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.2)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'
const EMER   = '#10b981'

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
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${EMER}12`, color: EMER, border: `1px solid ${EMER}28` }}>
      <CheckCircle2 size={9} /> Planifiée
    </span>
  )
  if (status === 'completed') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}28` }}>
      <CheckCircle2 size={9} /> Terminée
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${AMBER}12`, color: AMBER, border: `1px solid ${AMBER}28` }}>
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
    <div style={{ minHeight: '100vh', background: '#050709', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 35% at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
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
          <h1 className="cstu-title" style={{ fontSize: 44, fontWeight: 700, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1, fontFamily: 'var(--font-syne,sans-serif)', margin: 0 }}>Mes élèves</h1>
        </div>

        {/* KPIs */}
        <div className="cstu-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Élèves uniques',   value: uniqueStudents,  sub: 'au total',           color: CYAN },
            { label: 'Ce mois-ci',       value: newThisMonth,    sub: 'nouveaux achats',     color: VIOLET },
            { label: 'Sessions terminées', value: totalSessions, sub: 'coachings effectués', color: EMER },
          ].map(k => (
            <div key={k.label} style={{ background: `${k.color}05`, border: `1px solid ${k.color}18`, borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 100% 0%, ${k.color}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{k.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: SILVER }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Liste élèves */}
        {byStudent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Users size={32} color={SILVER} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ color: SILVER, fontSize: 14 }}>Aucun élève pour l'instant</p>
            <p style={{ color: DIM, fontSize: 12, marginTop: 6 }}>Ils apparaîtront dès leur premier achat</p>
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
                <div key={id} style={{ background: 'rgba(240,244,255,0.02)', border: '1px solid rgba(240,244,255,0.07)', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,244,255,0.12)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,244,255,0.07)'}>

                  {/* Row principale */}
                  <div className="cstu-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px' }}>

                    {/* Avatar */}
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                      {avatar_url
                        ? <Image src={avatar_url} alt={username} fill sizes="44px" style={{ objectFit: 'cover' }} />
                        : username[0].toUpperCase()
                      }
                    </div>

                    {/* Infos centre */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{username}</span>
                        {newest && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: `${CYAN}18`, color: CYAN, letterSpacing: '0.1em' }}>NOUVEAU</span>}
                        {sessionCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${AMBER}12`, color: AMBER }}>{sessionCount} session{sessionCount > 1 ? 's' : ''}</span>}
                        {hasNotes && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${VIOLET}12`, color: VIOLET }}>Notes</span>}
                      </div>

                      {/* Achats */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {ps.map((p: any, j: number) => {
                          const type = p.formations?.content_type ?? 'formation'
                          const c    = TYPE_COLORS[type] ?? VIOLET
                          const Icon = TYPE_ICONS[type] ?? BookOpen
                          return (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: SILVER, padding: '3px 8px', borderRadius: 6, background: `${c}08`, border: `1px solid ${c}20` }}>
                              <Icon size={9} color={c} />
                              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.formations?.title ?? 'Formation'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Actions droite */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: DIM, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} />
                        {lastDate ? fmtDate(new Date(lastDate).toISOString()) : '—'}
                      </div>

                      {/* Bouton Message */}
                      <button
                        onClick={() => router.push(`/coach/messages?student_id=${id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: CYAN, padding: '6px 12px', borderRadius: 8, border: `1px solid ${CYAN}30`, background: `${CYAN}08`, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${CYAN}16`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${CYAN}50` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${CYAN}08`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${CYAN}30` }}
                      >
                        <MessageSquare size={12} /> Message
                      </button>

                      {/* Toggle historique sessions */}
                      {sessionCount > 0 && (
                        <button
                          onClick={() => setExpanded(isOpen ? null : id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: isOpen ? VIOLET : SILVER, padding: '6px 12px', borderRadius: 8, border: `1px solid ${isOpen ? VIOLET + '40' : 'rgba(240,244,255,0.1)'}`, background: isOpen ? `${VIOLET}10` : 'transparent', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { if (!isOpen) { (e.currentTarget as HTMLButtonElement).style.color = CREAM; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(240,244,255,0.2)' } }}
                          onMouseLeave={e => { if (!isOpen) { (e.currentTarget as HTMLButtonElement).style.color = SILVER; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(240,244,255,0.1)' } }}
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
                    <div style={{ borderTop: '1px solid rgba(240,244,255,0.06)', padding: '16px 22px 20px', background: 'rgba(240,244,255,0.015)' }}>

                      {/* Résumé progression */}
                      {completedCount > 0 && avgProgress > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: `${VIOLET}08`, border: `1px solid ${VIOLET}18` }}>
                          <TrendingUp size={14} color={VIOLET} />
                          <span style={{ fontSize: 12, color: SILVER }}>{completedCount} session{completedCount > 1 ? 's' : ''} terminée{completedCount > 1 ? 's' : ''}</span>
                          <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ width: `${avgProgress * 10}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${VIOLET},${CYAN})` }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: VIOLET }}>{avgProgress.toFixed(1)}/10</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sessions.map((s: any, idx: number) => (
                          <div key={s.id} style={{ borderRadius: 12, border: '1px solid rgba(240,244,255,0.07)', background: 'rgba(240,244,255,0.02)', overflow: 'hidden' }}>

                            {/* Header session */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: DIM, flexShrink: 0 }}>#{sessions.length - idx}</span>
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
                                <span style={{ fontSize: 11, fontWeight: 700, color: VIOLET, padding: '2px 8px', borderRadius: 99, background: `${VIOLET}12`, border: `1px solid ${VIOLET}25`, flexShrink: 0 }}>
                                  {s.progress_score}/10
                                </span>
                              )}
                            </div>

                            {/* Notes */}
                            {s.notes && (
                              <div style={{ padding: '0 16px 12px', borderTop: '1px solid rgba(240,244,255,0.05)', paddingTop: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                  <FileText size={12} color={DIM} style={{ flexShrink: 0, marginTop: 2 }} />
                                  <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{s.notes}</p>
                                </div>
                              </div>
                            )}

                            {/* Tags */}
                            {s.tags && s.tags.length > 0 && (
                              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Tag size={10} color={DIM} />
                                {s.tags.map((tag: string) => (
                                  <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: `${CYAN}10`, border: `1px solid ${CYAN}20`, color: CYAN }}>{tag}</span>
                                ))}
                              </div>
                            )}

                            {/* Empty notes hint */}
                            {!s.notes && (!s.tags || s.tags.length === 0) && (
                              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={11} color={DIM} />
                                <span style={{ fontSize: 11, color: DIM, fontStyle: 'italic' }}>Pas encore de notes pour cette session</span>
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 40, padding: '16px 20px', borderRadius: 12, background: 'rgba(240,244,255,0.015)', border: '1px solid rgba(240,244,255,0.05)' }}>
          <Shield size={16} color={SILVER} style={{ flexShrink: 0, marginTop: 1, opacity: 0.4 }} />
          <p style={{ fontSize: 11, color: DIM, lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: 'rgba(240,244,255,0.35)' }}>Confidentialité & RGPD.</strong> Vous n'avez accès qu'aux données relatives à vos propres contenus : username, contenus achetés, notes de sessions et date. Ces données sont traitées conformément au RGPD.
          </p>
        </div>
      </div>
    </div>
  )
}
