'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const CREAM  = '#E8E4DC'
const SILVER = '#8A8A8A'

const CATEGORIES: { value: string; label: string; desc: string }[] = [
  { value: 'longterme', label: 'Graphiques Long Terme', desc: 'Volume · Constance · Winrate sur PT4 ou Holdem Manager' },
  { value: 'palmares',  label: 'Palmarès & Tournois',   desc: 'Trophées Live · Hendon Mob · Résultats majeurs ITM' },
  { value: 'eleves',    label: 'Résultats Élèves',      desc: 'Progression avant/après coaching · Témoignages' },
  { value: 'setup',     label: 'Environnement',         desc: 'Setup de grind · Multi-écrans · Professionnalisme' },
  { value: 'technique', label: 'Maîtrise Technique',    desc: 'PioSolver · GTO Wizard · Sessions d\'étude solver' },
  { value: 'limites',   label: 'Historique Limites',    desc: 'Montée de bankroll · Passage aux limites supérieures' },
]

export interface Proof {
  id: string
  url: string
  caption?: string | null
  category: string
}

export default function ProofGalleryModal({
  proofs,
  coachName,
  accentColor,
  onClose,
}: {
  proofs: Proof[]
  coachName: string
  accentColor?: string
  onClose: () => void
}) {
  const scrollRef   = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const activeCats = CATEGORIES.filter(c => proofs.some(p => p.category === c.value))

  const scrollToCategory = (value: string) => {
    const el = sectionRefs.current[value]
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#07090e', display: 'flex', flexDirection: 'column',
      animation: 'galleryIn 0.2s cubic-bezier(0.4,0,0.2,1)',
    }}>

      {/* ── Bouton fermer flottant ── */}
      <button onClick={onClose} style={{
        position: 'fixed', top: 24, left: 40, zIndex: 2100,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 18px', borderRadius: 99,
        background: 'rgba(232,228,220,0.07)',
        border: '1px solid rgba(232,228,220,0.12)',
        color: CREAM, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.13)'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.07)'}>
        <X size={14} /> Fermer
      </button>

      {/* ── Contenu scrollable ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 40px 100px' }}>

          {/* Titre */}
          <h2 style={{ fontSize: 28, fontWeight: 800, color: CREAM, letterSpacing: '-0.6px', marginBottom: 8 }}>
            Visite des preuves
          </h2>
          <p style={{ fontSize: 14, color: SILVER, margin: '0 0 40px' }}>
            {coachName} · {proofs.length} photo{proofs.length > 1 ? 's' : ''}
          </p>

          {/* ── Navigation catégories (Image #23) ── */}
          {activeCats.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 16, marginBottom: 64,
            }}>
              {activeCats.map(cat => {
                const firstProof = proofs.find(p => p.category === cat.value)
                return (
                  <button key={cat.value} onClick={() => scrollToCategory(cat.value)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left', padding: 0,
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                    <div style={{
                      width: '100%', aspectRatio: '4/3',
                      borderRadius: 12, overflow: 'hidden',
                      background: firstProof ? '#0f1218' : 'rgba(232,228,220,0.04)',
                      border: '1px solid rgba(232,228,220,0.1)',
                      transition: 'opacity 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.8'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                    >
                      {firstProof
                        ? <img src={firstProof.url} alt={cat.label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <span style={{ fontSize: 24, opacity: 0.08 }}>♠</span>
                          </div>
                      }
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: CREAM, lineHeight: 1.3 }}>
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Sections par catégorie (Image #24) ── */}
          {activeCats.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 0',
              borderTop: '1px solid rgba(232,228,220,0.07)',
            }}>
              <p style={{ fontSize: 15, color: SILVER }}>Aucune preuve disponible pour ce coach.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activeCats.map(cat => {
                const catProofs  = proofs.filter(p => p.category === cat.value)
                const [first, ...rest] = catProofs
                return (
                  <section
                    key={cat.value}
                    ref={el => { sectionRefs.current[cat.value] = el }}
                    style={{
                      borderTop: '1px solid rgba(232,228,220,0.07)',
                      padding: '56px 0',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 56 }}>

                      {/* Gauche : texte — sticky comme la fiche prix sur la page de vente */}
                      <div style={{ paddingTop: 4, position: 'sticky', top: 40, alignSelf: 'start' }}>
                        <h3 style={{ fontSize: 22, fontWeight: 700, color: CREAM, letterSpacing: '-0.4px', marginBottom: 10 }}>
                          {cat.label}
                        </h3>
                        <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.65, margin: 0 }}>
                          {cat.desc}
                        </p>
                        {catProofs.length > 1 && (
                          <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.25)', marginTop: 20 }}>
                            {catProofs.length} photo{catProofs.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/* Droite : grande photo + grille en dessous */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                        {/* Grande photo principale */}
                        {first && (
                          <div style={{ borderRadius: 14, overflow: 'hidden', background: '#0f1218' }}>
                            <img src={first.url} alt={first.caption ?? ''}
                              style={{ width: '100%', display: 'block' }} />
                            {first.caption && (
                              <p style={{ fontSize: 13, color: SILVER, margin: '10px 6px 4px', lineHeight: 1.5 }}>
                                {first.caption}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Photos supplémentaires — grille 2 colonnes */}
                        {rest.length > 0 && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: rest.length === 1 ? '1fr' : '1fr 1fr',
                            gap: 8,
                          }}>
                            {rest.map(proof => (
                              <div key={proof.id} style={{ borderRadius: 12, overflow: 'hidden', background: '#0f1218' }}>
                                <img src={proof.url} alt={proof.caption ?? ''}
                                  style={{ width: '100%', display: 'block' }} loading="lazy" />
                                {proof.caption && (
                                  <p style={{ fontSize: 12, color: SILVER, margin: '8px 6px 4px' }}>
                                    {proof.caption}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes galleryIn {
          from { opacity: 0; transform: scale(0.99); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
