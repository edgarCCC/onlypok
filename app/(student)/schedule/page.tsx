'use client'
import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Loader2, BookOpen, Video, Zap, ArrowRight, CalendarDays, ChevronDown, Link2, User,
} from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const DIM    = 'rgba(240,244,255,0.2)'
const PURPLE = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'
const EMER   = '#10b981'

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAY_NAMES   = ['Lu','Ma','Me','Je','Ve','Sa','Di']

function dowToJS(dow: number) { return dow % 7 }
function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = (firstDay + 6) % 7
  return { offset, daysInMonth }
}
function generateUpcomingSlots(
  availabilities: { day_of_week: number; slot: string }[],
  bookedTimestamps: string[],
  weeksAhead = 8
): Date[] {
  const now    = new Date()
  const cutoff = new Date(now.getTime() + weeksAhead * 7 * 24 * 3600 * 1000)
  const booked = new Set(bookedTimestamps.map(t => new Date(t).toISOString()))
  const result: Date[] = []
  for (const avail of availabilities) {
    const jsDow = dowToJS(avail.day_of_week)
    const [hh, mm] = avail.slot.split(':').map(Number)
    const current = new Date(now)
    const diff = (jsDow - current.getDay() + 7) % 7
    current.setDate(current.getDate() + (diff === 0 ? 0 : diff))
    current.setHours(hh, mm, 0, 0)
    if (current <= now) current.setDate(current.getDate() + 7)
    while (current <= cutoff) {
      if (!booked.has(current.toISOString())) result.push(new Date(current))
      current.setDate(current.getDate() + 7)
    }
  }
  result.sort((a, b) => a.getTime() - b.getTime())
  return result
}

/* ─────────────── Dashboard "Mes sessions" ─────────────── */

type Booking = {
  id: string
  created_at: string
  scheduled_at: string | null
  status: string
  formation_id: string
  coach_id: string
  meeting_url: string | null
  formation: { title: string; content_type: string; price: number } | null
  coach: { username: string | null; avatar_url: string | null } | null
}

type Purchase = {
  id: string
  created_at: string
  formation: { id: string; title: string; content_type: string; price: number } | null
  coach: { username: string | null } | null
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'scheduled') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${EMER}15`, color: EMER, border: `1px solid ${EMER}30` }}>
      <CheckCircle size={9} /> Planifiée
    </span>
  )
  if (status === 'completed') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
      <CheckCircle size={9} /> Terminée
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}30` }}>
      <AlertCircle size={9} /> À planifier
    </span>
  )
}

function Dashboard() {
  const router   = useRouter()
  const params   = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [loading,    setLoading]    = useState(true)
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [purchases,  setPurchases]  = useState<Purchase[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const paymentSuccess = params.get('payment') === 'success'

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Persist session_id in localStorage so it survives page refreshes
      const urlSessionId = params.get('session_id')
      if (params.get('payment') === 'success' && urlSessionId) {
        localStorage.setItem('onlypok_pending_session', urlSessionId)
      }
      const pendingSession = localStorage.getItem('onlypok_pending_session')
      if (pendingSession) {
        try {
          const res = await fetch('/api/stripe/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: pendingSession }),
          })
          if (res.ok) localStorage.removeItem('onlypok_pending_session')
        } catch { /* non-blocking */ }
      }

      // Bookings — simple select without FK join to avoid PostgREST cache issues
      const bookingRes = await supabase
        .from('bookings')
        .select('id, created_at, scheduled_at, status, formation_id, coach_id, pack_index, meeting_url')
        .eq('student_id', user.id)
        .in('status', ['paid_pending_schedule', 'scheduled', 'completed'])
        .order('created_at', { ascending: false })

// If meeting_url column doesn't exist yet, retry without it
      let bRows = bookingRes.data ?? []
      if (bookingRes.error?.code === '42703') {
        const fallback = await supabase
          .from('bookings')
          .select('id, created_at, scheduled_at, status, formation_id, coach_id, pack_index')
          .eq('student_id', user.id)
          .in('status', ['paid_pending_schedule', 'scheduled', 'completed'])
          .order('created_at', { ascending: false })
        bRows = fallback.data ?? []
      }

      // Purchases
      const { data: pRows } = await supabase
        .from('formation_purchases')
        .select(`id, created_at, formation:formations(id, title, content_type, price, coach_id), coach:profiles!formations.coach_id(username)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch formation + coach data for bookings separately
      const formationIds = [...new Set(bRows.map((b: any) => b.formation_id).filter(Boolean))]
      const coachIds     = [...new Set(bRows.map((b: any) => b.coach_id).filter(Boolean))]

      const [{ data: formations }, { data: coaches }] = await Promise.all([
        formationIds.length
          ? supabase.from('formations').select('id, title, content_type, price').in('id', formationIds)
          : Promise.resolve({ data: [] as any[] }),
        coachIds.length
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', coachIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const fMap = new Map<string, Booking['formation']>((formations ?? []).map((f: any) => [f.id, f]))
      const cMap = new Map<string, Booking['coach']>((coaches ?? []).map((c: any) => [c.id, c]))

      setBookings(bRows.map((r: any): Booking => ({
        id: r.id,
        created_at: r.created_at,
        scheduled_at: r.scheduled_at ?? null,
        status: r.status,
        formation_id: r.formation_id,
        coach_id: r.coach_id,
        meeting_url: r.meeting_url ?? null,
        formation: fMap.get(r.formation_id) ?? null,
        coach: cMap.get(r.coach_id) ?? null,
      })))

      const nonCoaching = (pRows ?? []).filter((p: any) => {
        const ct = Array.isArray(p.formation) ? p.formation[0]?.content_type : p.formation?.content_type
        return ct !== 'coaching'
      })
      setPurchases(nonCoaching.map((r: any): Purchase => ({
        id: r.id,
        created_at: r.created_at,
        formation: Array.isArray(r.formation) ? r.formation[0] ?? null : r.formation ?? null,
        coach: Array.isArray(r.coach) ? r.coach[0] ?? null : r.coach ?? null,
      })))
      setLoading(false)
    }
    load()
  }, [supabase, router, params])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color={PURPLE} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const pending   = bookings.filter(b => b.status === 'paid_pending_schedule')
  const scheduled = bookings.filter(b => b.status === 'scheduled')
  const completed = bookings.filter(b => b.status === 'completed')

  const Card = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
    <div style={{ background: 'rgba(232,228,220,0.025)', border: `1px solid rgba(232,228,220,${accent ? '0.12' : '0.07'})`, borderRadius: 14, padding: '16px 20px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.14)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(232,228,220,${accent ? '0.12' : '0.07'})`}
    >{children}</div>
  )

  const SectionLabel = ({ text, color, count }: { text: string; color: string; count: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: `${color}20` }} />
      <span style={{ fontSize: 11, color: DIM }}>{count}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(124,58,237,0.07) 0%,transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>

        {paymentSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 28 }}>
            <CheckCircle size={20} color={EMER} />
            <div>
              <p style={{ fontSize: 14, color: '#34d399', fontWeight: 700, margin: 0 }}>Session confirmée !</p>
              <p style={{ fontSize: 12, color: SILVER, margin: '2px 0 0' }}>Ton créneau a été enregistré. Tu le retrouves ci-dessous dans "Planifiées".</p>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Mon espace</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: CREAM, letterSpacing: '-1px', margin: 0, fontFamily: 'var(--font-syne,sans-serif)' }}>Planning & achats</h1>
          <p style={{ fontSize: 13, color: SILVER, marginTop: 8 }}>Tes sessions de coaching et tes formations achetées.</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 36 }}>
          {[
            { label: 'Sessions',     value: bookings.length,  color: PURPLE, icon: Zap },
            { label: 'Planifiées',   value: scheduled.length, color: EMER,   icon: CheckCircle },
            { label: 'À planifier',  value: pending.length,   color: AMBER,  icon: AlertCircle },
            { label: 'Formations',   value: purchases.length, color: CYAN,   icon: BookOpen },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(232,228,220,0.025)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={11} color={color} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: CREAM, letterSpacing: '-1px' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Pending — needs scheduling */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <SectionLabel text="À planifier" color={AMBER} count={pending.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map(b => (
                <Card key={b.id} accent>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${AMBER}15`, border: `1px solid ${AMBER}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertCircle size={16} color={AMBER} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{b.formation?.title ?? 'Session coaching'}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <span style={{ fontSize: 12, color: SILVER }}>Coach : {b.coach?.username ?? '—'} · Aucun créneau sélectionné</span>
                    </div>
                    <button
                      onClick={() => router.push(`/schedule?coach_id=${b.coach_id}&formation_id=${b.formation_id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: `${AMBER}18`, border: `1px solid ${AMBER}35`, color: AMBER, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Choisir un créneau <ArrowRight size={12} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <SectionLabel text="Planifiées" color={EMER} count={scheduled.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scheduled.map(b => {
                const isOpen = expandedId === b.id
                const initials = (b.coach?.username ?? '?').slice(0, 2).toUpperCase()
                return (
                  <Card key={b.id}>
                    {/* Header row — clickable */}
                    <button
                      onClick={() => setExpandedId(isOpen ? null : b.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${EMER}15`, border: `1px solid ${EMER}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CalendarDays size={16} color={EMER} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{b.formation?.title ?? 'Session coaching'}</span>
                          <StatusBadge status={b.status} />
                        </div>
                        <div style={{ fontSize: 12, color: SILVER, display: 'flex', gap: 12 }}>
                          <span>Coach : {b.coach?.username ?? '—'}</span>
                          {b.scheduled_at && (
                            <span style={{ color: EMER }}>{fmtDT(b.scheduled_at)}</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown size={16} color={SILVER} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </button>

                    {/* Detail panel */}
                    {isOpen && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(240,244,255,0.07)' }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

                          {/* Coach card — clickable */}
                          <button
                            onClick={() => router.push(`/coaches/${b.coach_id}`)}
                            style={{ flex: '1 1 160px', background: 'rgba(240,244,255,0.04)', borderRadius: 10, border: '1px solid rgba(240,244,255,0.07)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s', }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = `${PURPLE}50`)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(240,244,255,0.07)')}
                          >
                            {b.coach?.avatar_url
                              ? <img src={b.coach.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              : (
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${PURPLE}25`, border: `1px solid ${PURPLE}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: PURPLE }}>
                                  {initials}
                                </div>
                              )
                            }
                            <div>
                              <div style={{ fontSize: 11, color: SILVER, marginBottom: 2 }}>Coach</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{b.coach?.username ?? '—'}</div>
                            </div>
                          </button>

                          {/* Date/time card */}
                          {b.scheduled_at && (
                            <div style={{ flex: '1 1 160px', background: 'rgba(240,244,255,0.04)', borderRadius: 10, border: '1px solid rgba(240,244,255,0.07)', padding: '12px 14px' }}>
                              <div style={{ fontSize: 11, color: SILVER, marginBottom: 4 }}>Date & heure</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: EMER }}>{fmtDT(b.scheduled_at)}</div>
                            </div>
                          )}
                        </div>

                        {/* Meeting link */}
                        <div style={{ marginTop: 10, background: 'rgba(240,244,255,0.04)', borderRadius: 10, border: b.meeting_url ? `1px solid ${CYAN}30` : '1px solid rgba(240,244,255,0.07)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Link2 size={15} color={b.meeting_url ? CYAN : SILVER} style={{ flexShrink: 0 }} />
                          {b.meeting_url ? (
                            <a href={b.meeting_url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 13, fontWeight: 700, color: CYAN, textDecoration: 'none', wordBreak: 'break-all' }}>
                              Rejoindre la session
                            </a>
                          ) : (
                            <span style={{ fontSize: 13, color: SILVER }}>Lien de session — partagé par le coach avant la séance</span>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <SectionLabel text="Terminées" color={CYAN} count={completed.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {completed.map(b => (
                <Card key={b.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${CYAN}15`, border: `1px solid ${CYAN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={16} color={CYAN} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{b.formation?.title ?? 'Session coaching'}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <span style={{ fontSize: 12, color: SILVER }}>Coach : {b.coach?.username ?? '—'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Formations & vidéos */}
        {purchases.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <SectionLabel text="Formations & vidéos" color={PURPLE} count={purchases.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {purchases.map(p => {
                const ct   = p.formation?.content_type ?? 'formation'
                const Icon = ct === 'video' ? Video : BookOpen
                const col  = ct === 'video' ? CYAN : PURPLE
                return (
                  <Card key={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${col}15`, border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color={col} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: CREAM, display: 'block', marginBottom: 2 }}>
                          {p.formation?.title ?? 'Formation'}
                        </span>
                        <span style={{ fontSize: 12, color: SILVER }}>{p.coach?.username ?? '—'}</span>
                      </div>
                      <button
                        onClick={() => router.push(`/formations/${p.formation?.id}/learn`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: `${col}15`, border: `1px solid ${col}30`, color: col, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                      >
                        Accéder <ArrowRight size={11} />
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty */}
        {bookings.length === 0 && purchases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Calendar size={40} color={SILVER} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ color: SILVER, fontSize: 14, marginBottom: 6 }}>Aucun achat pour l'instant</p>
            <button onClick={() => router.push('/formations')} style={{ marginTop: 16, padding: '10px 24px', background: `linear-gradient(135deg,${PURPLE},${CYAN})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Explorer la marketplace
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────── Slot picker (post-payment) ─────────────── */

function SlotPicker() {
  const params   = useSearchParams()
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const coachId     = params.get('coach_id')
  const formationId = params.get('formation_id')
  const paymentOk   = params.get('payment') === 'success'

  const [authChecked, setAuthChecked] = useState(false)
  const [authorized,  setAuthorized]  = useState(false)
  const [bookingId,   setBookingId]   = useState<string | null>(null)
  const [coach,       setCoach]       = useState<any>(null)
  const [formation,   setFormation]   = useState<any>(null)
  const [slots,       setSlots]       = useState<Date[]>([])

  const today = new Date()
  const [curYear,  setCurYear]  = useState(today.getFullYear())
  const [curMonth, setCurMonth] = useState(today.getMonth())
  const [selDay,   setSelDay]   = useState<Date | null>(null)
  const [selSlot,  setSelSlot]  = useState<Date | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed,  setConfirmed]  = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (!coachId) return
    const check = async () => {
      const res  = await fetch(`/api/bookings/check?coach_id=${coachId}${formationId ? `&formation_id=${formationId}` : ''}`)
      const data = await res.json()
      if (data.authorized && data.pending_count > 0) {
        setAuthorized(true)
        const pending = data.bookings.find((b: any) => b.status === 'paid_pending_schedule')
        if (pending) setBookingId(pending.id)
      }
      setAuthChecked(true)
    }
    check()
  }, [coachId, formationId])

  useEffect(() => {
    if (!coachId) return
    const load = async () => {
      const [{ data: coachData }, { data: formData }, { data: avails }, { data: bookings }] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, bio').eq('id', coachId).single(),
        formationId
          ? supabase.from('formations').select('id, title').eq('id', formationId).single()
          : Promise.resolve({ data: null }),
        supabase.from('availabilities').select('day_of_week, slot').eq('coach_id', coachId).eq('booked', false),
        supabase.from('bookings').select('scheduled_at').eq('coach_id', coachId).eq('status', 'scheduled').not('scheduled_at', 'is', null),
      ])
      setCoach(coachData)
      setFormation(formData)
      const bookedTs = (bookings ?? []).map((b: any) => b.scheduled_at).filter(Boolean)
      setSlots(generateUpcomingSlots(avails ?? [], bookedTs))
    }
    load()
  }, [coachId, formationId, supabase])

  const slotDays = useMemo(() => {
    const set = new Set<string>()
    slots.forEach(s => { if (s.getFullYear() === curYear && s.getMonth() === curMonth) set.add(formatDate(s)) })
    return set
  }, [slots, curYear, curMonth])

  const daySlots = useMemo(() => selDay ? slots.filter(s => isSameDay(s, selDay)) : [], [slots, selDay])

  const confirmSlot = async () => {
    if (!selSlot || !bookingId) return
    setConfirming(true); setError('')
    try {
      const res  = await fetch('/api/bookings/confirm-slot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, scheduled_at: selSlot.toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setConfirmed(true)
    } catch { setError('Erreur réseau.') }
    finally { setConfirming(false) }
  }

  const { offset, daysInMonth } = getMonthDays(curYear, curMonth)

  if (confirmed) return (
    <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} color="#10b981" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: CREAM, marginBottom: 8, fontFamily: 'var(--font-syne,sans-serif)' }}>Séance confirmée !</h1>
        <p style={{ color: SILVER, fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          Ta session avec <strong style={{ color: CREAM }}>{coach?.username}</strong> est planifiée pour le&nbsp;
          <strong style={{ color: CREAM }}>
            {selSlot?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {selSlot?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </strong>.
        </p>
        <button onClick={() => router.push('/schedule')} style={{ padding: '12px 28px', background: `linear-gradient(135deg,${PURPLE},${CYAN})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Voir mon planning
        </button>
      </div>
    </div>
  )

  if (!authChecked) return (
    <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color={PURPLE} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!authorized) return (
    <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={28} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, marginBottom: 8 }}>Accès non autorisé</h2>
        <p style={{ color: SILVER, fontSize: 14, marginBottom: 28 }}>
          {!paymentOk
            ? "Tu dois d'abord acheter une session de coaching."
            : "Aucun créneau en attente. Si tu viens de payer, patiente quelques secondes et recharge."}
        </p>
        <button onClick={() => router.push('/formations')} style={{ padding: '10px 24px', background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(232,228,220,0.12)', borderRadius: 10, color: CREAM, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Voir les formations
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(124,58,237,0.09) 0%,transparent 70%)', filter: 'blur(40px)' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>

        {paymentOk && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 18px', marginBottom: 28 }}>
            <CheckCircle size={18} color="#10b981" />
            <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>Paiement confirmé ! Choisis maintenant ton créneau.</span>
          </div>
        )}

        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Calendar size={20} color={PURPLE} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px', fontFamily: 'var(--font-syne,sans-serif)' }}>Planifie ta session</h1>
          </div>
          <p style={{ color: SILVER, fontSize: 14 }}>
            {formation ? `Formation : ${formation.title} · ` : ''}
            Coach : <span style={{ color: CREAM }}>{coach?.username ?? '…'}</span>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: slots.length === 0 ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
          {/* Calendar */}
          <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button onClick={() => { if (curMonth === 0) { setCurYear(y => y-1); setCurMonth(11) } else setCurMonth(m => m-1); setSelDay(null); setSelSlot(null) }} style={{ background: 'none', border: 'none', color: SILVER, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, fontSize: 15, color: CREAM }}>{MONTH_NAMES[curMonth]} {curYear}</span>
              <button onClick={() => { if (curMonth === 11) { setCurYear(y => y+1); setCurMonth(0) } else setCurMonth(m => m+1); setSelDay(null); setSelSlot(null) }} style={{ background: 'none', border: 'none', color: SILVER, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
                <ChevronRight size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
              {DAY_NAMES.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: SILVER, paddingBottom: 4 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day   = i + 1
                const date  = new Date(curYear, curMonth, day)
                const key   = formatDate(date)
                const hasSlt = slotDays.has(key)
                const isPast = date < today && !isSameDay(date, today)
                const isSel  = selDay ? isSameDay(selDay, date) : false
                const isToday = isSameDay(date, today)
                return (
                  <button key={day} disabled={!hasSlt || isPast} onClick={() => { setSelDay(date); setSelSlot(null) }}
                    style={{ aspectRatio: '1', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: isSel ? 800 : 400, cursor: hasSlt && !isPast ? 'pointer' : 'default', background: isSel ? `linear-gradient(135deg,${PURPLE},${CYAN})` : hasSlt && !isPast ? 'rgba(124,58,237,0.12)' : 'transparent', color: isSel ? '#fff' : hasSlt && !isPast ? '#c4b5fd' : isPast ? 'rgba(138,138,138,0.3)' : SILVER, boxShadow: isSel ? `0 4px 16px ${PURPLE}40` : 'none', transition: 'all 0.15s', outline: isToday && !isSel ? `2px solid rgba(124,58,237,0.4)` : 'none', outlineOffset: -2 }}>
                    {day}
                  </button>
                )
              })}
            </div>
            {slots.length === 0 && (
              <div style={{ marginTop: 20, textAlign: 'center', padding: '20px 0' }}>
                <Clock size={24} color={SILVER} style={{ marginBottom: 10, opacity: 0.5 }} />
                <p style={{ fontSize: 13, color: SILVER }}>Aucun créneau disponible pour le moment.</p>
              </div>
            )}
          </div>

          {/* Time slots */}
          {slots.length > 0 && (
            <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 18, padding: 24 }}>
              {!selDay ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                  <Calendar size={32} color={SILVER} style={{ opacity: 0.4 }} />
                  <p style={{ color: SILVER, fontSize: 13 }}>Sélectionne un jour sur le calendrier</p>
                </div>
              ) : daySlots.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                  <Clock size={32} color={SILVER} style={{ opacity: 0.4 }} />
                  <p style={{ color: SILVER, fontSize: 13 }}>Aucun créneau ce jour</p>
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 16 }}>
                    {selDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 20 }}>
                    {daySlots.map((slot, i) => {
                      const isSel   = selSlot ? selSlot.getTime() === slot.getTime() : false
                      const timeStr = slot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <button key={i} onClick={() => setSelSlot(isSel ? null : slot)}
                          style={{ padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: isSel ? `linear-gradient(135deg,${PURPLE},${CYAN})` : 'rgba(232,228,220,0.05)', border: isSel ? 'none' : '1px solid rgba(232,228,220,0.1)', color: isSel ? '#fff' : CREAM, boxShadow: isSel ? `0 4px 16px ${PURPLE}40` : 'none' }}>
                          {timeStr}
                        </button>
                      )
                    })}
                  </div>
                  {selSlot && (
                    <div style={{ borderTop: '1px solid rgba(232,228,220,0.07)', paddingTop: 18 }}>
                      <div style={{ fontSize: 13, color: SILVER, marginBottom: 14 }}>
                        Créneau sélectionné : <strong style={{ color: CREAM }}>{selSlot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>
                      </div>
                      {error && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> {error}</div>}
                      <button onClick={confirmSlot} disabled={confirming}
                        style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: confirming ? 'rgba(124,58,237,0.4)' : `linear-gradient(135deg,${PURPLE},${CYAN})`, color: '#fff', fontWeight: 700, fontSize: 14, cursor: confirming ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: confirming ? 'none' : `0 4px 24px ${PURPLE}50`, transition: 'all 0.2s' }}>
                        {confirming ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Confirmation…</> : 'Confirmer ce créneau'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

/* ─────────────── Router: dashboard vs slot picker ─────────────── */

function ScheduleContent() {
  const params  = useSearchParams()
  const coachId = params.get('coach_id')
  return coachId ? <SlotPicker /> : <Dashboard />
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <ScheduleContent />
    </Suspense>
  )
}
