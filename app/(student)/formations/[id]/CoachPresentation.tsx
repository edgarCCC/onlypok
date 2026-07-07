'use client'
import { Star } from 'lucide-react'
import Link from 'next/link'
import type { Proof } from '@/components/ProofGalleryModal'
import { CREAM, SILVER, VARIANT_COLORS } from './shared'

/* ─── Coach presentation — "Faites connaissance avec votre coach" ───────────── */
export default function CoachPresentation({ coach, typeColor, avgRating, reviewCount, isSuperCoach, proofs, coCoaches, onOpenProofModal }: {
  coach: any
  typeColor: string
  avgRating: number | null
  reviewCount: number
  isSuperCoach: boolean
  proofs: Proof[]
  coCoaches: any[]
  onOpenProofModal: () => void
}) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 120px' }}>
      <div style={{ borderTop: '1px solid rgba(232,228,220,0.06)', paddingTop: 64 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-0.7px', margin: '0 0 36px' }}>
          Faites connaissance avec votre coach
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }}>

          {/* ── Colonne gauche : avatar + stats ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div style={{ width: 110, height: 110, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#fff', overflow: 'hidden', boxShadow: `0 0 0 3px #07090e, 0 0 0 5px ${typeColor}40` }}>
              {coach.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={coach.avatar_url} alt={coach.username ?? 'Coach'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (coach.username ?? 'C')[0].toUpperCase()}
            </div>
            {/* Nom + badge */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: CREAM }}>{coach.username}</span>
                {coach.is_pro && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}40` }}>PRO</span>
                )}
                {isSuperCoach && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,216,107,0.12)', color: '#ffd86b', border: '1px solid rgba(255,216,107,0.3)' }}>SUPER COACH</span>
                )}
              </div>
              {avgRating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6 }}>
                  <Star size={12} color="#a855f7" fill="#a855f7" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{avgRating.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: SILVER }}>· {reviewCount} avis</span>
                </div>
              )}
            </div>
            {/* Stats */}
            <div style={{ width: '100%', background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              {coach.years_experience != null && coach.years_experience > 0 && (
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(232,228,220,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: SILVER }}>Expérience</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{coach.years_experience} an{coach.years_experience > 1 ? 's' : ''}</span>
                </div>
              )}
              {reviewCount > 0 && (
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: SILVER }}>Avis vérifiés</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{reviewCount}</span>
                </div>
              )}
            </div>
            {/* Link to full profile */}
            <Link href={`/coaches/${coach.id}`} style={{ textDecoration: 'none', width: '100%' }}>
              <button style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(232,228,220,0.12)', color: CREAM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,228,220,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,228,220,0.06)')}>
                Voir le profil complet
              </button>
            </Link>
            {proofs.length > 0 && (
              <button onClick={onOpenProofModal} style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1px solid ${typeColor}40`, background: `${typeColor}10`, color: typeColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Voir les preuves ({proofs.length})
              </button>
            )}
          </div>

          {/* ── Colonne droite : infos ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Bio */}
            {coach.bio ? (
              <p style={{ fontSize: 15, color: 'rgba(240,244,255,0.78)', lineHeight: 1.75, margin: 0 }}>{coach.bio}</p>
            ) : (
              <p style={{ fontSize: 14, color: 'rgba(138,138,138,0.4)', fontStyle: 'italic', margin: 0 }}>Ce coach n&apos;a pas encore renseigné sa bio.</p>
            )}

            {/* Spécialités */}
            {(coach.variants as string[] | undefined)?.length ? (
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Spécialités</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(coach.variants as string[]).map((v: string) => {
                    const vc = VARIANT_COLORS[v] ?? typeColor
                    return (
                      <span key={v} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: `${vc}15`, color: vc, border: `1px solid ${vc}35` }}>{v}</span>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Rooms */}
            {(coach.rooms as string[] | undefined)?.length ? (
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Joue sur</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {(coach.rooms as string[]).filter((r: string) => r !== 'PMU Poker').map((room: string) => {
                    const logoSrc: Record<string, string> = {
                      'PokerStars': '/logos/pokerstars.svg',
                      'Winamax':    '/logos/winamax.png',
                      'Betclic':    '/logos/betclic.svg',
                      'GGPoker':    '/logos/ggpoker.webp',
                      'Unibet':     '/logos/unibet.svg',
                      'bwin':       '/logos/bwin.svg',
                      'PartyPoker': '/logos/partypoker.svg',
                      '888poker':   '/logos/888poker.png',
                      'iPoker':     '/logos/ipoker.svg',
                    }
                    const whiteFilter: Record<string, boolean> = { 'PartyPoker': true, '888poker': true }
                    const src = logoSrc[room]
                    return src ? (
                      <div key={room} title={room} style={{ width: 80, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={room} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: whiteFilter[room] ? 'brightness(0) invert(1)' : 'brightness(0.9) saturate(0.85)', opacity: 0.85 }} />
                      </div>
                    ) : (
                      <span key={room} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(240,244,255,0.05)', color: CREAM, border: '1px solid rgba(240,244,255,0.1)' }}>{room}</span>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Co-coachs */}
            {coCoaches.length > 0 && (
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Co-coachs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {coCoaches.map(cc => (
                    <div key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}30, rgba(232,228,220,0.06))`, border: '1px solid rgba(240,244,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: CREAM, flexShrink: 0 }}>
                        {(cc.username ?? 'C')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, color: CREAM }}>{cc.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
