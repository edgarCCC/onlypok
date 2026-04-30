'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import FourAcesLoader from '@/components/FourAcesLoader'
import { TrendingUp, Download, ExternalLink, AlertCircle, BookOpen, Video, Users } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'rgba(232,228,220,0.03)',
  border: '1px solid rgba(232,228,220,0.07)',
  borderRadius: 16, padding: 24, ...extra,
})

function RevenueChart({ data }: { data: { month: string; rev: number }[] }) {
  const max = Math.max(...data.map(d => d.rev), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingBottom: 24 }}>
      {data.map(d => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 9, color: VIOLET, fontWeight: 700 }}>{d.rev > 0 ? `${d.rev}€` : ''}</span>
          <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: `linear-gradient(to top, ${VIOLET}, ${VIOLET}55)`, height: `${Math.max((d.rev / max) * 90, d.rev > 0 ? 4 : 2)}px`, opacity: d.rev > 0 ? 1 : 0.1, transition: 'height 0.5s ease' }} />
          <span style={{ fontSize: 9, color: SILVER }}>{d.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function RevenuePage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [loading, setLoading]     = useState(true)
  const [formations, setFormations] = useState<any[]>([])
  const [purchases, setPurchases]   = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from('formations').select('*, formation_purchases(count)').eq('coach_id', user.id),
        supabase.from('formation_purchases').select('created_at, formations(price, content_type, coach_id)').eq('formations.coach_id', user.id),
      ])
      setFormations(f ?? [])
      setPurchases((p ?? []).filter((x: any) => x.formations))
      setLoading(false)
    }
    load()
  }, [user, supabase])

  const totalRevenue    = formations.reduce((a, f) => a + (f.price ?? 0) * (f.formation_purchases?.[0]?.count ?? 0), 0)
  const totalSales      = formations.reduce((a, f) => a + (f.formation_purchases?.[0]?.count ?? 0), 0)
  const avgPerSale      = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0

  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const revenueMonth = purchases
    .filter(p => p.created_at?.slice(0, 7) === thisMonthKey)
    .reduce((a: number, p: any) => a + (p.formations?.price ?? 0), 0)

  const monthly12 = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now); d.setMonth(d.getMonth() - (11 - i))
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    const rev   = purchases.filter(p => p.created_at?.slice(0, 7) === key).reduce((a: number, p: any) => a + (p.formations?.price ?? 0), 0)
    return { month: label, rev }
  })

  const byType = ['formation', 'video', 'coaching'].map(type => {
    const list = formations.filter(f => (f.content_type ?? 'formation') === type)
    const rev  = list.reduce((a, f) => a + (f.price ?? 0) * (f.formation_purchases?.[0]?.count ?? 0), 0)
    const sales = list.reduce((a, f) => a + (f.formation_purchases?.[0]?.count ?? 0), 0)
    return { type, rev, sales, count: list.length }
  })

  const topFormations = [...formations]
    .sort((a, b) => ((b.price ?? 0) * (b.formation_purchases?.[0]?.count ?? 0)) - ((a.price ?? 0) * (a.formation_purchases?.[0]?.count ?? 0)))
    .slice(0, 8)

  if (loading) return <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FourAcesLoader fullPage={false} /></div>

  const MICRO_THRESHOLD = 77700
  const pct = Math.min((totalRevenue / MICRO_THRESHOLD) * 100, 100)

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 35% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)` }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '40px' }}>

        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: SILVER, marginBottom: 8, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Revenus</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 44, color: SILVER, fontWeight: 200, lineHeight: 1 }}>[</span>
            <h1 style={{ fontSize: 44, fontWeight: 700, color: CREAM, letterSpacing: '-1px', lineHeight: 1, fontFamily: 'var(--font-syne,sans-serif)', margin: 0 }}>Mes revenus</h1>
            <span style={{ fontSize: 44, color: SILVER, fontWeight: 200, lineHeight: 1 }}>]</span>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total généré',     value: `${totalRevenue}€`, sub: 'depuis le début',       color: VIOLET },
            { label: 'Ce mois-ci',       value: `${revenueMonth}€`, sub: now.toLocaleDateString('fr-FR', { month: 'long' }), color: CYAN },
            { label: 'Ventes totales',   value: totalSales,          sub: 'transactions',           color: AMBER },
            { label: 'Panier moyen',     value: `${avgPerSale}€`,    sub: 'par vente',              color: '#a855f7' },
          ].map(k => (
            <div key={k.label} style={card({ position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 100% 0%, ${k.color}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: SILVER, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{k.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: SILVER }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Graphe 12 mois */}
        <div style={{ ...card(), marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>Revenus sur 12 mois</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: SILVER }}>{monthly12.reduce((a, d) => a + d.rev, 0)}€ sur la période</span>
            </div>
          </div>
          {totalRevenue === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TrendingUp size={28} color={SILVER} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ color: SILVER, fontSize: 13 }}>Pas encore de vente</p>
            </div>
          ) : <RevenueChart data={monthly12} />}
        </div>

        {/* Par type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {byType.map(({ type, rev, sales, count }) => {
            const colors: Record<string, string> = { formation: VIOLET, video: CYAN, coaching: AMBER }
            const labels: Record<string, string> = { formation: 'Formations', video: 'Vidéos', coaching: 'Coaching' }
            const icons: Record<string, React.ElementType> = { formation: BookOpen, video: Video, coaching: Users }
            const c = colors[type]; const Icon = icons[type]
            return (
              <div key={type} style={card({ position: 'relative', overflow: 'hidden' })}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 100% 0%, ${c}08 0%, transparent 60%)`, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={c} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: CREAM }}>{labels[type]}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c, letterSpacing: '-0.5px', marginBottom: 6 }}>{rev}€</div>
                <div style={{ fontSize: 11, color: SILVER }}>{sales} vente{sales !== 1 ? 's' : ''} · {count} contenu{count !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>

        {/* Top formations */}
        <div style={{ ...card(), marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 20, margin: '0 0 20px' }}>Classement par revenu</h2>
          {topFormations.length === 0 ? (
            <p style={{ color: SILVER, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun contenu publié</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topFormations.map((f, i) => {
                const students = f.formation_purchases?.[0]?.count ?? 0
                const rev      = (f.price ?? 0) * students
                const type     = f.content_type ?? 'formation'
                const colors: Record<string, string> = { formation: VIOLET, video: CYAN, coaching: AMBER }
                const c = colors[type] ?? VIOLET
                const pctBar = topFormations[0] ? rev / Math.max((topFormations[0].price ?? 0) * (topFormations[0].formation_purchases?.[0]?.count ?? 1), 1) : 0
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(232,228,220,0.02)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pctBar * 100}%`, background: `${c}08`, transition: 'width 0.6s ease', borderRadius: 10 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? c : SILVER, width: 18, flexShrink: 0, textAlign: 'center' }}>#{i + 1}</span>
                    <div style={{ width: 3, height: 30, borderRadius: 99, background: c, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: CREAM, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
                    <span style={{ fontSize: 11, color: SILVER, flexShrink: 0 }}>{students} élève{students !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: c, flexShrink: 0, minWidth: 60, textAlign: 'right' }}>{rev}€</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Paperasse officielle ── */}
        <div style={{ height: 1, background: 'rgba(232,228,220,0.07)', marginBottom: 32 }} />
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(240,244,255,0.2)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>Paperasse officielle</p>
        </div>

        {/* Seuil micro-entrepreneur */}
        <div style={{ ...card({ marginBottom: 16 }), borderColor: pct > 80 ? 'rgba(245,158,11,0.25)' : 'rgba(232,228,220,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 4px' }}>Seuil micro-entrepreneur</h3>
              <p style={{ fontSize: 12, color: SILVER, margin: 0 }}>Plafond BNC 2024 pour les prestations de services</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: pct > 80 ? 'rgba(245,158,11,0.15)' : 'rgba(232,228,220,0.06)', color: pct > 80 ? AMBER : SILVER }}>
              {pct > 80 ? 'Attention' : 'OK'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(232,228,220,0.07)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? `linear-gradient(90deg, ${VIOLET}, ${AMBER})` : `linear-gradient(90deg, ${VIOLET}, ${CYAN})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: pct > 80 ? AMBER : CREAM, flexShrink: 0 }}>{totalRevenue}€ / {MICRO_THRESHOLD.toLocaleString('fr-FR')}€</span>
          </div>
          <p style={{ fontSize: 11, color: SILVER }}>Au-delà de 77 700€, vous passez au régime réel. Consultez un comptable.</p>
        </div>

        {/* Déclaration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertCircle size={16} color={CYAN} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>Déclaration URSSAF</h3>
            </div>
            <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.7, marginBottom: 14 }}>
              En tant qu'auto-entrepreneur, vous devez déclarer votre chiffre d'affaires mensuellement ou trimestriellement sur autoentrepreneur.urssaf.fr.
            </p>
            <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: CYAN, textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }}>
              Accéder <ExternalLink size={11} />
            </a>
          </div>
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertCircle size={16} color={VIOLET} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>TVA</h3>
            </div>
            <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.7, marginBottom: 14 }}>
              Sous le seuil de franchise en base (36 800€ pour les services), vous n'êtes pas assujetti à la TVA. Vos prix sont donc TTC.
            </p>
            <a href="https://www.impots.gouv.fr" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: VIOLET, textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8 }}>
              impots.gouv.fr <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Export */}
        <div style={{ ...card(), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 4px' }}>Export comptable</h3>
            <p style={{ fontSize: 12, color: SILVER, margin: 0 }}>Téléchargez un récapitulatif de vos ventes au format CSV pour votre comptable</p>
          </div>
          <button
            onClick={() => {
              const rows = [
                ['Date', 'Formation', 'Type', 'Montant'],
                ...formations.flatMap(f =>
                  Array(f.formation_purchases?.[0]?.count ?? 0).fill([
                    new Date(f.created_at).toLocaleDateString('fr-FR'),
                    f.title, f.content_type ?? 'formation',
                    `${f.price}€`,
                  ])
                ),
              ]
              const csv  = rows.map(r => r.join(';')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url  = URL.createObjectURL(blob)
              const a    = document.createElement('a'); a.href = url; a.download = 'revenus-onlypok.csv'; a.click()
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(232,228,220,0.05)', color: CREAM, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Download size={15} /> Exporter CSV
          </button>
        </div>

        <p style={{ fontSize: 10, color: 'rgba(240,244,255,0.15)', textAlign: 'center', marginTop: 40, lineHeight: 1.8 }}>
          Ces informations sont indicatives et ne constituent pas un conseil fiscal.<br />
          Consultez un expert-comptable pour votre situation personnelle.
        </p>
      </div>
    </div>
  )
}
