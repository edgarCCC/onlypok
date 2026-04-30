'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Star, Check, Grid3X3 } from 'lucide-react'
import FourAcesLoader from '@/components/FourAcesLoader'
import FormationCard from '@/components/formations/FormationCard'
import ProofGalleryModal from '@/components/ProofGalleryModal'
import type { Proof } from '@/components/ProofGalleryModal'

const CREAM = '#E8E4DC'
const SILVER = '#8A8A8A'

function getColor(username: string) {
  const colors = ['#7c3aed','#06b6d4','#a855f7','#ef4444','#7c3aed','#8b5cf6','#ec4899']
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function CoachProfilePage() {
  const { id }   = useParams()
  const supabase = useMemo(() => createClient(), [])
  const router   = useRouter()

  const [coach, setCoach]           = useState<any>(null)
  const [formations, setFormations] = useState<any[]>([])
  const [packs, setPacks]           = useState<any[]>([])
  const [calUrl, setCalUrl]         = useState<string|null>(null)
  const [reviews, setReviews]       = useState<any[]>([])
  const [proofs, setProofs]         = useState<Proof[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedPack, setSelectedPack] = useState(0)
  const [showGallery, setShowGallery]   = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: c } = await supabase.from('profiles').select('*').eq('id', id).single()
      setCoach(c)

      const { data: f } = await supabase.from('formations').select('*, coach:profiles(username)').eq('coach_id', id).eq('published', true).order('created_at', { ascending: false })
      setFormations(f ?? [])

      const coachingF = (f ?? []).find((x: any) => x.content_type === 'coaching')
      if (coachingF?.coaching_packs) setPacks(coachingF.coaching_packs)
      if (coachingF?.cal_url) setCalUrl(coachingF.cal_url)

      const { data: r } = await supabase.from('reviews').select('*, student:profiles(username)').eq('coach_id', id).order('created_at', { ascending: false })
      setReviews(r ?? [])

      const { data: pr } = await supabase.from('coach_proofs').select('*').eq('coach_id', id).order('order_index')
      setProofs(pr ?? [])

      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) return <FourAcesLoader />
  if (!coach) return <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER }}>Coach introuvable</div>

  const color    = getColor(coach.username ?? 'coach')
  const initials = (coach.username ?? 'C').slice(0, 2).toUpperCase()
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : null
  const nonCoachingFormations = formations.filter(f => f.content_type !== 'coaching')

  const SKILLS = ['NLH 6-max', 'MTT', 'Cash Game', 'GTO', 'Exploitation', 'Mental Game']
  const ADVANTAGES = [
    'Analyse vidéo de vos sessions',
    'Suivi personnalisé entre les sessions',
    'Accès aux ressources exclusives',
    'Replay des sessions disponible',
    'Feedback détaillé hand by hand',
  ]

  const currentPack = packs[selectedPack]

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>

      {/* Glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 50% 30% at 50% 0%, ${color}12 0%, transparent 65%)` }} />

      {/* Back button fixe */}
      <button onClick={() => router.back()} style={{ position: 'fixed', top: 24, left: 24, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(7,9,14,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(232,228,220,0.12)', color: CREAM, fontSize: 13, cursor: 'pointer', padding: '8px 16px', borderRadius: 99, transition: 'all 0.15s' }}>
        <ArrowLeft size={14} /> Retour
      </button>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '80px 40px 100px' }}>

        {/* ══ HERO ══ */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 48 }}>
          {/* Grand avatar */}
          <div style={{ width: 120, height: 120, borderRadius: 24, background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: `0 8px 40px ${color}40` }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-1px', marginBottom: 6 }}>{coach.username}</h1>
            <p style={{ fontSize: 15, color: SILVER, lineHeight: 1.7, maxWidth: 600, marginBottom: 14 }}>
              {coach.bio ?? 'Coach professionnel spécialisé dans l\'accompagnement des joueurs de poker.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {avgRating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={15} color="#a855f7" fill="#a855f7" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{avgRating}</span>
                  <span style={{ fontSize: 13, color: SILVER }}>({reviews.length} avis)</span>
                </div>
              )}
              <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.1)' }} />
              <span style={{ fontSize: 13, color: SILVER }}>{nonCoachingFormations.length} formation{nonCoachingFormations.length > 1 ? 's' : ''} publiée{nonCoachingFormations.length > 1 ? 's' : ''}</span>
              <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.1)' }} />
              <span style={{ fontSize: 13, color: '#06b6d4', fontWeight: 600 }}>● Disponible</span>
            </div>
          </div>
        </div>

        {/* ══ LAYOUT 2 COLONNES ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, alignItems: 'start' }}>

          {/* ── Colonne gauche ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

            {/* Compétences */}
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', marginBottom: 6 }}>Spécialités</h2>
              <p style={{ fontSize: 13, color: SILVER, marginBottom: 18 }}>Les domaines dans lesquels ce coach excelle</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {SKILLS.map(s => (
                  <span key={s} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 99, background: `${color}15`, border: `1px solid ${color}40`, color }}>
                    {s}
                  </span>
                ))}
              </div>
            </section>

            <div style={{ height: 1, background: 'rgba(232,228,220,0.07)' }} />

            {/* Description */}
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', marginBottom: 6 }}>À propos</h2>
              <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.8 }}>
                {coach.bio ?? 'Coach professionnel avec plusieurs années d\'expérience dans l\'accompagnement de joueurs de tous niveaux. Approche axée sur l\'analyse de données, le développement du mental et la progression mesurable.'}
              </p>
            </section>

            <div style={{ height: 1, background: 'rgba(232,228,220,0.07)' }} />

            {/* Ce que vous obtenez */}
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', marginBottom: 6 }}>Ce que vous obtenez</h2>
              <p style={{ fontSize: 13, color: SILVER, marginBottom: 18 }}>Inclus dans chaque session de coaching</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {ADVANTAGES.map(a => (
                  <div key={a} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Check size={11} color={color} />
                    </div>
                    <span style={{ fontSize: 13, color: SILVER, lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ height: 1, background: 'rgba(232,228,220,0.07)' }} />

            {/* Preuves & résultats */}
            {proofs.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', marginBottom: 4 }}>Preuves &amp; résultats</h2>
                    <p style={{ fontSize: 13, color: SILVER }}>Screenshots, classements, résultats vérifiés</p>
                  </div>
                  <button onClick={() => setShowGallery(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10,
                      background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(232,228,220,0.12)',
                      color: CREAM, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.12)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.06)'}>
                    <Grid3X3 size={13} /> Voir toutes ({proofs.length})
                  </button>
                </div>

                {/* Grille 2×2 aperçu */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                  {proofs.slice(0, 4).map((proof, i) => (
                    <div key={proof.id}
                      onClick={() => setShowGallery(true)}
                      style={{ aspectRatio: '16/9', background: '#0f1218', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                      <img src={proof.url} alt={proof.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                      {/* Badge catégorie */}
                      <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                          color: 'rgba(232,228,220,0.8)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                          {proof.category === 'sharkscope' ? 'SharkScope'
                            : proof.category === 'classement' ? 'Classement'
                            : proof.category === 'tournoi' ? 'Tournoi'
                            : proof.category === 'resultats' ? 'Résultats'
                            : 'Preuve'}
                        </span>
                      </div>
                      {/* Overlay "Voir tout" sur la 4e image si plus */}
                      {i === 3 && proofs.length > 4 && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>+{proofs.length - 4} photos</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div style={{ height: 1, background: 'rgba(232,228,220,0.07)' }} />

            {/* Formations */}
            {nonCoachingFormations.length > 0 && (
              <section>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', marginBottom: 6 }}>Formations & vidéos</h2>
                <p style={{ fontSize: 13, color: SILVER, marginBottom: 18 }}>Contenus disponibles à la demande</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  {nonCoachingFormations.map(f => <FormationCard key={f.id} f={f} accentColor={color} />)}
                </div>
              </section>
            )}

            <div style={{ height: 1, background: 'rgba(232,228,220,0.07)' }} />

            {/* Avis */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px' }}>Avis</h2>
                {avgRating && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Star size={16} color="#a855f7" fill="#a855f7" />
                    <span style={{ fontSize: 16, fontWeight: 800, color: CREAM }}>{avgRating}</span>
                    <span style={{ fontSize: 13, color: SILVER }}>· {reviews.length} avis</span>
                  </div>
                )}
              </div>

              {reviews.length === 0 ? (
                <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: SILVER, fontSize: 14 }}>Pas encore d'avis — soyez le premier !</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {reviews.map(r => (
                    <div key={r.id} style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color }}>
                            {(r.student?.username ?? 'E')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{r.student?.username ?? 'Élève'}</div>
                            <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                              {[...Array(5)].map((_, i) => <Star key={i} size={10} color={i < r.rating ? '#a855f7' : 'rgba(232,228,220,0.15)'} fill={i < r.rating ? '#a855f7' : 'none'} />)}
                            </div>
                          </div>
                        </div>
                      </div>
                      {r.comment && <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.6 }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Cal.com en bas sur mobile / grand affichage */}
            {calUrl && (
              <section>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: '-0.4px', marginBottom: 6 }}>Disponibilités</h2>
                <p style={{ fontSize: 13, color: SILVER, marginBottom: 18 }}>Choisissez un créneau et réservez directement</p>
                <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(232,228,220,0.1)', height: 600 }}>
                  <iframe src={calUrl} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="Réservation" />
                </div>
              </section>
            )}
          </div>

          {/* ── Colonne droite sticky ── */}
          <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ background: '#0f1218', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

              {/* Packs selector */}
              {packs.length > 0 ? (
                <>
                  {/* Header prix */}
                  <div style={{ padding: '24px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: CREAM }}>{currentPack?.price}€</span>
                      <span style={{ fontSize: 14, color: SILVER }}>/ {currentPack?.hours}h de coaching</span>
                    </div>
                    {currentPack?.hours > 0 && currentPack?.price > 0 && (
                      <p style={{ fontSize: 12, color: SILVER }}>soit {Math.round(currentPack.price / currentPack.hours)}€/h</p>
                    )}
                  </div>

                  {/* Tabs packs */}
                  <div style={{ display: 'flex', gap: 0, padding: '16px 24px', borderBottom: '1px solid rgba(232,228,220,0.07)' }}>
                    {packs.map((pack: any, i: number) => (
                      <button key={i} onClick={() => setSelectedPack(i)} style={{ flex: 1, padding: '8px 4px', border: 'none', borderBottom: `2px solid ${selectedPack === i ? color : 'transparent'}`, background: 'transparent', color: selectedPack === i ? CREAM : SILVER, fontSize: 12, fontWeight: selectedPack === i ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                        {pack.label}
                      </button>
                    ))}
                  </div>

                  {/* Description pack */}
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(232,228,220,0.07)' }}>
                    <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.6 }}>{currentPack?.desc}</p>
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ADVANTAGES.slice(0, 3).map(a => (
                        <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Check size={12} color={color} />
                          <span style={{ fontSize: 12, color: SILVER }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: color, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 20px ${color}50`, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}>
                      Réserver ce pack
                    </button>
                    <p style={{ fontSize: 11, color: 'rgba(138,138,138,0.5)', textAlign: 'center' }}>Aucun frais avant confirmation</p>
                  </div>
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: SILVER, fontSize: 13, marginBottom: 16 }}>Contactez ce coach pour connaître ses tarifs</p>
                  <button style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${color}40`, background: `${color}15`, color, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Contacter
                  </button>
                </div>
              )}

              {/* Mini cal.com preview */}
              {calUrl && (
                <div style={{ borderTop: '1px solid rgba(232,228,220,0.07)' }}>
                  <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>Voir les disponibilités</span>
                    <span style={{ fontSize: 12, color }}>↓</span>
                  </div>
                  <div style={{ height: 400, overflow: 'hidden' }}>
                    <iframe src={calUrl} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="Cal.com" />
                  </div>
                </div>
              )}

              {/* Rating recap */}
              {avgRating && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(232,228,220,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Star size={14} color="#a855f7" fill="#a855f7" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{avgRating}</span>
                  <span style={{ fontSize: 12, color: SILVER }}>· {reviews.length} avis vérifiés</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showGallery && (
        <ProofGalleryModal
          proofs={proofs}
          coachName={coach.username}
          accentColor={color}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  )
}
