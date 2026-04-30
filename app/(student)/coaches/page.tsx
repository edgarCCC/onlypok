'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import { Search } from 'lucide-react'

const CREAM = '#E8E4DC'
const SILVER = '#8A8A8A'

const VARIANTS = ['Toutes', 'NLH', 'PLO', 'MTT', 'Cash', 'Expresso', 'Live']

function getColor(username: string) {
  const colors = ['#7c3aed','#06b6d4','#a855f7','#ef4444','#7c3aed','#8b5cf6','#ec4899']
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function CoachesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [coaches, setCoaches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [variant, setVariant] = useState('Toutes')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, formations(count)')
        .eq('role', 'coach')
        .order('created_at', { ascending: false })
      setCoaches(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = coaches.filter(c => {
    const matchSearch  = !search || (c.username ?? '').toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 4 }}>Nos coachs</h1>
          <p style={{ fontSize: 14, color: SILVER }}>Trouvez votre coach et réservez une session</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 500, marginBottom: 32 }}>
          <Search size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(232,228,220,0.25)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un coach…" style={{ width: '100%', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 10, padding: '11px 14px 11px 38px', color: CREAM, fontSize: 13, outline: 'none' }} />
        </div>

        {/* Grid */}
        {loading ? (
          <FourAcesLoader fullPage={false} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: SILVER, fontSize: 14 }}>Aucun coach trouvé</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(coach => {
              const color = getColor(coach.username ?? 'coach')
              const initials = (coach.username ?? 'C').slice(0, 2).toUpperCase()
              return (
                <Link key={coach.id} href={`/coaches/${coach.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}50`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}>

                    {/* Header gradient */}
                    <div style={{ height: 80, background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`, position: 'relative', borderBottom: `1px solid ${color}20` }}>
                      <div style={{ position: 'absolute', bottom: -24, left: 20, width: 48, height: 48, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', border: '3px solid #07090e' }}>
                        {initials}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '32px 20px 20px' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: CREAM, marginBottom: 4 }}>{coach.username ?? 'Coach'}</h3>
                      {coach.bio && <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{coach.bio}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(232,228,220,0.06)' }}>
                        <span style={{ fontSize: 11, color: SILVER }}>{coach.formations?.[0]?.count ?? 0} formation{(coach.formations?.[0]?.count ?? 0) > 1 ? 's' : ''}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color, padding: '4px 12px', background: `${color}15`, borderRadius: 99 }}>Voir profil →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
