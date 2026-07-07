'use client'
import { BookOpen, PlayCircle, Clock, Zap, MessageSquare, Shield, CheckCircle, X, Loader2, Calendar } from 'lucide-react'
import { CREAM, SILVER } from './shared'

/* ─── Feature row ──────────────────────────────────────────────────────────── */
export function Feature({ icon, label, color }: { icon: React.ReactNode, label: string, color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: color ?? SILVER, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: SILVER }}>{label}</span>
    </div>
  )
}

/* ─── Credit confirmation modal (sessions déjà en attente) ──────────────────── */
export function CreditConfirmModal({ typeColor, pendingCount, onConfirm, onClose }: {
  typeColor: string
  pendingCount: number
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,9,14,0.88)',
      backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ background: '#0f1218', border: `1px solid ${typeColor}35`, borderRadius: 20, padding: '32px', maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${typeColor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={18} color={typeColor} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px', margin: 0 }}>
              Sessions existantes
            </h3>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(240,244,255,0.08)',
              background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.6, margin: '0 0 24px' }}>
          Tu as déjà{' '}
          <span style={{ color: CREAM, fontWeight: 700 }}>
            {pendingCount} session{pendingCount > 1 ? 's' : ''} avec ce coach
          </span>{' '}
          en attente de planification. Es-tu sûr de vouloir acheter ce pack en plus ?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none',
              background: typeColor, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Acheter ce pack
          </button>
          <button
            onClick={onClose}
            style={{ width: '100%', padding: '13px', borderRadius: 11,
              border: '1px solid rgba(232,228,220,0.12)', background: 'transparent',
              color: SILVER, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Colonne droite sticky : prix + CTA + features ─────────────────────────── */
export default function PurchaseSidebar({ formation, contentType, typeColor, packs, selectedPack, setSelectedPack, currentPack, applyWeekend, hasPurchased, paying, ctaLabel, ctaDisabled, onCTA, onBuyLater, checkoutError, isCoachingPaid, calSelSlot, effectivePrice, allLessonsCount, chaptersCount, freeLessons }: {
  formation: any
  contentType: string
  typeColor: string
  packs: any[]
  selectedPack: number
  setSelectedPack: (i: number) => void
  currentPack: any
  applyWeekend: (price: number) => number
  hasPurchased: boolean
  paying: boolean
  ctaLabel: string
  ctaDisabled: boolean
  onCTA: () => void
  onBuyLater: () => void
  checkoutError: string | null
  isCoachingPaid: boolean
  calSelSlot: Date | null
  effectivePrice: number
  allLessonsCount: number
  chaptersCount: number
  freeLessons: number
}) {
  return (
    <div style={{ position: 'sticky', top: 200 }}>
      <div style={{
        background: 'linear-gradient(180deg, #0e1118 0%, #0a0d12 100%)',
        border: '1px solid rgba(240,244,255,0.09)',
        borderRadius: 22, overflow: 'hidden',
        boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
        {/* Glow accent bande en haut */}
        <div style={{ height: 3, background: `linear-gradient(to right, ${typeColor}, ${typeColor}80, transparent)` }} />

        {contentType !== 'coaching' && formation.thumbnail_url && (
          <div style={{ height: 165, backgroundImage: `url(${formation.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, #0e1118 100%)' }} />
          </div>
        )}

        <div style={{ padding: '24px 24px 20px' }}>
          {contentType === 'coaching' && packs.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
                {packs.map((pack: any, i: number) => (
                  <button key={i} onClick={() => setSelectedPack(i)}
                    style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, background: selectedPack === i ? typeColor : 'transparent', color: selectedPack === i ? '#fff' : SILVER, fontSize: 11, fontWeight: selectedPack === i ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedPack === i ? `0 2px 10px ${typeColor}50` : 'none' }}>
                    {pack.label}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{currentPack?.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1 }}>{currentPack ? applyWeekend(currentPack.price) : ''}</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: SILVER }}>€</span>
                  <span style={{ fontSize: 13, color: 'rgba(232,228,220,0.35)', marginLeft: 2 }}>/ {currentPack?.hours}h</span>
                </div>
                {currentPack?.hours > 0 && <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.3)', margin: '6px 0 0' }}>soit {Math.round(applyWeekend(currentPack.price) / currentPack.hours)}€/h</p>}
              </div>
            </>
          )}
          {contentType !== 'coaching' && (
            <div style={{ marginBottom: 22 }}>
              {formation.price === 0 ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: '#06b6d4', letterSpacing: '-1.5px', lineHeight: 1 }}>Gratuit</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1 }}>{formation.price}</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: SILVER }}>€</span>
                </div>
              )}
              {hasPurchased && formation.price > 0 && (
                <span style={{ fontSize: 12, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                  <CheckCircle size={12} /> Déjà acheté — accès illimité
                </span>
              )}
            </div>
          )}

          {/* CTA button */}
          <button onClick={onCTA} disabled={ctaDisabled}
            style={{
              width: '100%', padding: '15px 20px', borderRadius: 13, border: 'none',
              background: hasPurchased
                ? 'rgba(6,182,212,0.12)'
                : ctaDisabled && !paying
                  ? 'rgba(255,255,255,0.05)'
                  : `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}cc 100%)`,
              color: hasPurchased ? '#06b6d4' : ctaDisabled && !paying ? SILVER : '#fff',
              fontSize: 14, fontWeight: 800, cursor: ctaDisabled ? 'default' : 'pointer',
              opacity: paying ? 0.75 : 1,
              boxShadow: hasPurchased || ctaDisabled ? 'none' : `0 8px 32px ${typeColor}45, inset 0 1px 0 rgba(255,255,255,0.15)`,
              transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              letterSpacing: '0.01em', marginBottom: checkoutError ? 12 : 20,
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (!ctaDisabled) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 16px 48px ${typeColor}65, inset 0 1px 0 rgba(255,255,255,0.25)` } }}
            onMouseLeave={e => { if (!ctaDisabled) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${typeColor}45, inset 0 1px 0 rgba(255,255,255,0.15)` } }}>
            {paying ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Redirection…
              </span>
            ) : ctaLabel}
          </button>

          {/* Acheter à nouveau — visible si coaching déjà acheté */}
          {hasPurchased && contentType === 'coaching' && isCoachingPaid && (
            <button onClick={onBuyLater} disabled={paying} style={{
              width: '100%', padding: '13px', borderRadius: 12,
              border: `1.5px solid ${typeColor}`,
              background: `${typeColor}18`,
              color: typeColor, fontSize: 13, fontWeight: 700,
              cursor: paying ? 'wait' : 'pointer', marginBottom: 16,
              transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
              letterSpacing: '0.01em',
            }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${typeColor}30`; b.style.boxShadow = `0 0 24px ${typeColor}40`; b.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${typeColor}18`; b.style.boxShadow = 'none'; b.style.transform = 'translateY(0)' }}>
              Racheter — {applyWeekend(effectivePrice)}€ →
            </button>
          )}

          {/* Acheter sans créneau — visible si coaching non acheté et pas de slot sélectionné */}
          {contentType === 'coaching' && isCoachingPaid && !calSelSlot && !hasPurchased && (
            <button onClick={onBuyLater} disabled={paying} style={{
              width: '100%', padding: '13px', borderRadius: 12,
              border: `1.5px solid ${typeColor}`,
              background: `${typeColor}18`,
              color: typeColor, fontSize: 13, fontWeight: 700,
              cursor: paying ? 'wait' : 'pointer', marginBottom: 16,
              transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: `0 0 0 0 ${typeColor}00`,
              letterSpacing: '0.01em',
            }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = `${typeColor}30`
                b.style.boxShadow = `0 0 24px ${typeColor}40`
                b.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = `${typeColor}18`
                b.style.boxShadow = `0 0 0 0 ${typeColor}00`
                b.style.transform = 'translateY(0)'
              }}>
              Acheter{effectivePrice > 0 ? ` — ${applyWeekend(effectivePrice)}€` : ''} · planifier plus tard →
            </button>
          )}

          {checkoutError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '9px 13px', marginBottom: 16, fontSize: 12, color: '#fca5a5' }}>
              <X size={13} style={{ flexShrink: 0 }} /> {checkoutError}
            </div>
          )}

          {/* Features list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {contentType === 'formation' && (
              <>
                {allLessonsCount > 0 && <Feature icon={<BookOpen size={13} />} label={`${allLessonsCount} leçons · ${chaptersCount} chapitres`} />}
                {freeLessons > 0 && <Feature icon={<PlayCircle size={13} />} label={`${freeLessons} leçons gratuites`} color="#06b6d4" />}
                <Feature icon={<Clock size={13} />} label="Accès à vie" />
                <Feature icon={<Zap size={13} />} label="Mises à jour incluses" />
              </>
            )}
            {contentType === 'video' && (
              <>
                <Feature icon={<PlayCircle size={13} />} label="Vidéo HD" />
                <Feature icon={<Clock size={13} />} label="Accès à vie" />
                <Feature icon={<MessageSquare size={13} />} label="Commentaires" />
              </>
            )}
            {contentType === 'coaching' && currentPack && (
              <>
                <Feature icon={<Clock size={13} />} label={`${currentPack.hours}h de coaching`} />
                <Feature icon={<PlayCircle size={13} />} label="Replay des sessions" />
                <Feature icon={<Shield size={13} />} label="Annulation gratuite 24h avant" />
              </>
            )}
            <Feature icon={<Shield size={13} />} label="Paiement sécurisé" />
          </div>

          {!hasPurchased && formation.price > 0 && contentType !== 'coaching' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <Shield size={11} color="rgba(232,228,220,0.25)" />
              <p style={{ fontSize: 11, color: 'rgba(232,228,220,0.25)', margin: 0 }}>
                Satisfait ou remboursé · 7 jours
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
