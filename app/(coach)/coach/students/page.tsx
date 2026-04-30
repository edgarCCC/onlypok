'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import { Users, MessageSquare, Clock, BookOpen, Video, Zap, Shield } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'

const TYPE_COLORS: Record<string, string> = { formation: VIOLET, video: CYAN, coaching: AMBER }
const TYPE_ICONS: Record<string, React.ElementType> = { formation: BookOpen, video: Video, coaching: Zap }
const TYPE_LABELS: Record<string, string> = { formation: 'Formation', video: 'Vidéo', coaching: 'Coaching' }

function isNew(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) < 7 * 24 * 3600 * 1000
}

export default function StudentsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [loading, setLoading]   = useState(true)
  const [purchases, setPurchases] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      /* Récupère les achats des formations du coach avec le profil de l'acheteur */
      const { data } = await supabase
        .from('formation_purchases')
        .select(`
          id, created_at,
          formations(id, title, content_type, price, coach_id),
          profiles(id, username)
        `)
        .order('created_at', { ascending: false })

      /* Filtre côté client pour ne garder que les achats liés au coach */
      const mine = (data ?? []).filter((p: any) => p.formations?.coach_id === user.id)
      setPurchases(mine)
      setLoading(false)
    }
    load()
  }, [user, supabase])

  /* Stats */
  const now = new Date()
  const thisMonthKey   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const newThisMonth   = purchases.filter(p => p.created_at?.slice(0, 7) === thisMonthKey).length
  const uniqueStudents = new Set(purchases.map(p => p.profiles?.id).filter(Boolean)).size

  /* Regroupement par élève */
  const byStudent = useMemo(() => {
    const map = new Map<string, { username: string; purchases: any[] }>()
    for (const p of purchases) {
      const uid = p.profiles?.id ?? p.id
      const username = p.profiles?.username ?? 'Élève anonyme'
      if (!map.has(uid)) map.set(uid, { username, purchases: [] })
      map.get(uid)!.purchases.push(p)
    }
    return Array.from(map.values()).sort((a, b) => {
      const aDate = Math.max(...a.purchases.map(p => new Date(p.created_at).getTime()))
      const bDate = Math.max(...b.purchases.map(p => new Date(p.created_at).getTime()))
      return bDate - aDate
    })
  }, [purchases])

  if (loading) return <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FourAcesLoader fullPage={false} /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 35% at 50% 0%, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Communauté</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 44, color: SILVER, fontWeight: 200, lineHeight: 1 }}>[</span>
            <h1 style={{ fontSize: 44, fontWeight: 700, color: CREAM, letterSpacing: '-1px', lineHeight: 1, fontFamily: 'var(--font-syne,sans-serif)', margin: 0 }}>Mes élèves</h1>
            <span style={{ fontSize: 44, color: SILVER, fontWeight: 200, lineHeight: 1 }}>]</span>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Élèves uniques',  value: uniqueStudents, sub: 'au total',        color: CYAN },
            { label: 'Ce mois-ci',      value: newThisMonth,   sub: 'nouveaux achats', color: VIOLET },
            { label: 'Achats totaux',   value: purchases.length, sub: 'transactions',  color: AMBER },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 100% 0%, ${k.color}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{k.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: SILVER }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Liste */}
        {byStudent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Users size={32} color={SILVER} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ color: SILVER, fontSize: 14 }}>Aucun élève pour l'instant</p>
            <p style={{ color: 'rgba(138,138,138,0.4)', fontSize: 12, marginTop: 6 }}>Ils apparaîtront dès leur premier achat</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byStudent.map(({ username, purchases: ps }, i) => {
              const lastDate = new Date(Math.max(...ps.map(p => new Date(p.created_at).getTime())))
              const newest = ps.some(p => isNew(p.created_at))
              const coachingSessions = ps.filter(p => p.formations?.content_type === 'coaching').length

              return (
                <div key={i} style={{ background: 'rgba(232,228,220,0.025)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 18, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.14)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.07)'}>

                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {username[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{username}</span>
                      {newest && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'rgba(6,182,212,0.15)', color: CYAN, letterSpacing: '0.1em' }}>NOUVEAU</span>}
                      {coachingSessions > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: AMBER }}>{coachingSessions} coaching{coachingSessions > 1 ? 's' : ''}</span>}
                    </div>

                    {/* Formations achetées */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ps.map((p: any, j: number) => {
                        const type = p.formations?.content_type ?? 'formation'
                        const c    = TYPE_COLORS[type] ?? VIOLET
                        const Icon = TYPE_ICONS[type] ?? BookOpen
                        return (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: SILVER, padding: '4px 10px', borderRadius: 8, background: `${c}10`, border: `1px solid ${c}25` }}>
                            <Icon size={10} color={c} />
                            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.formations?.title ?? 'Formation'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: SILVER }}>
                      <Clock size={11} />
                      {lastDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: SILVER }}>{ps.length} achat{ps.length > 1 ? 's' : ''}</div>
                    <button
                      title="Messagerie — bientôt disponible"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(240,244,255,0.2)', padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(240,244,255,0.08)', background: 'transparent', cursor: 'not-allowed' }}>
                      <MessageSquare size={11} /> Message
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Notice RGPD */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 40, padding: '16px 20px', borderRadius: 12, background: 'rgba(232,228,220,0.02)', border: '1px solid rgba(232,228,220,0.06)' }}>
          <Shield size={16} color={SILVER} style={{ flexShrink: 0, marginTop: 1, opacity: 0.5 }} />
          <p style={{ fontSize: 11, color: 'rgba(240,244,255,0.25)', lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: 'rgba(240,244,255,0.4)' }}>Confidentialité & RGPD.</strong> Vous n'avez accès qu'aux données relatives à vos propres contenus : username, contenus achetés, et date d'achat. Aucune donnée personnelle sensible (email, identité civile, historique d'achat chez d'autres coaches) n'est accessible. Ces données sont traitées conformément au RGPD. Ne les partagez pas avec des tiers.
          </p>
        </div>
      </div>
    </div>
  )
}
