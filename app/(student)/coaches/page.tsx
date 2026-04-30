'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import { Search, Star, BookOpen } from 'lucide-react'

const CREAM  = '#E8E4DC'
const SILVER = '#8A8A8A'

const VARIANTS = ['Tous', 'NLH', 'PLO', 'MTT', 'Cash', 'Expresso', 'Live']

const PALETTE = [
  '#7c3aed','#06b6d4','#a855f7','#ef4444','#f59e0b','#8b5cf6','#ec4899','#10b981',
]

function getColor(username: string) {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function StarsDisplay({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} fill={s <= Math.round(rating) ? '#f59e0b' : 'none'} color={s <= Math.round(rating) ? '#f59e0b' : SILVER} />
      ))}
    </div>
  )
}

export default function CoachesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [coaches, setCoaches]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search,  setSearch]    = useState('')
  const [variant, setVariant]   = useState('Tous')

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

  const filtered = useMemo(() => coaches.filter(c => {
    const matchSearch  = !search || (c.username ?? '').toLowerCase().includes(search.toLowerCase())
    const matchVariant = variant === 'Tous' || (c.variants ?? []).includes(variant)
    return matchSearch && matchVariant
  }), [coaches, search, variant])

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 4 }}>Nos coachs</h1>
          <p style={{ fontSize: 14, color: SILVER }}>Trouvez votre coach et progressez à votre rythme</p>
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '0 0 320px' }}>
            <Search size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(232,228,220,0.25)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un coach…"
              style={{ width: '100%', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 10, padding: '10px 14px 10px 38px', color: CREAM, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VARIANTS.map(v => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                style={{
                  padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: variant === v ? 'rgba(124,58,237,0.25)' : 'rgba(232,228,220,0.04)',
                  border: variant === v ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(232,228,220,0.1)',
                  color: variant === v ? '#c4b5fd' : SILVER,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <FourAcesLoader fullPage={false} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: SILVER, fontSize: 14 }}>Aucun coach trouvé</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(coach => {
              const color    = getColor(coach.username ?? 'coach')
              const initials = (coach.username ?? 'C').slice(0, 2).toUpperCase()
              const fCount   = coach.formations?.[0]?.count ?? 0
              const rating   = coach.avg_rating ?? null
              const variants: string[] = coach.variants ?? []

              return (
                <Link key={coach.id} href={`/coaches/${coach.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 18, overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}50`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${color}15` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,228,220,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
                  >
                    {/* Banner */}
                    <div style={{ height: 88, background: `linear-gradient(135deg, ${color}35 0%, ${color}12 60%, transparent 100%)`, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 100% at 0% 50%, ${color}20, transparent)` }} />
                      {/* Avatar */}
                      <div style={{ position: 'absolute', bottom: -26, left: 20, width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: '#fff', border: '3px solid #07090e', boxShadow: `0 4px 16px ${color}50` }}>
                        {coach.avatar_url
                          ? <img src={coach.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : initials
                        }
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '34px 20px 20px' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: CREAM, marginBottom: 4 }}>{coach.username ?? 'Coach'}</h3>

                      {/* Rating */}
                      {rating !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <StarsDisplay rating={rating} />
                          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>{rating.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Bio */}
                      {coach.bio && (
                        <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.55, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {coach.bio}
                        </p>
                      )}

                      {/* Variants */}
                      {variants.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                          {variants.slice(0, 4).map(v => (
                            <span key={v} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: `${color}15`, color, border: `1px solid ${color}30` }}>{v}</span>
                          ))}
                          {variants.length > 4 && <span style={{ fontSize: 10, color: SILVER }}>+{variants.length - 4}</span>}
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(232,228,220,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <BookOpen size={12} color={SILVER} />
                          <span style={{ fontSize: 11, color: SILVER }}>{fCount} formation{fCount > 1 ? 's' : ''}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color, padding: '5px 14px', background: `${color}15`, borderRadius: 99, border: `1px solid ${color}25` }}>Voir profil →</span>
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
