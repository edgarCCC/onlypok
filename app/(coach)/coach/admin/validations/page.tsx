'use client'
import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Clock, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react'

const CREAM  = 'var(--text)'
const SILVER = 'var(--text-2)'
const CARD   = 'color-mix(in srgb, var(--brand) 3%, transparent)'
const BORDER = 'color-mix(in srgb, var(--brand) 8%, transparent)'

const CAT_LABELS: Record<string, string> = {
  stats:     'Stats officielles',
  longterme: 'Long terme',
  perf:      'Meilleures perfs',
  eleves:    'Transformations élèves',
  // legacy
  sharkscope: 'SharkScope',
  pokerstats: 'PokerStats / HM3',
  palmares:   'Palmarès',
}

type Proof = {
  id: string
  url: string
  caption: string | null
  category: string
  validation_status: string
  rejection_reason: string | null
  created_at: string
  coach: { id: string; username: string; avatar_url: string | null } | null
}

export default function AdminValidationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [proofs, setProofs] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectionDraft, setRejectionDraft] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [actErr, setActErr] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsAdmin(false); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setIsAdmin(p?.role === 'admin')
    })()
  }, [supabase])

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    fetch(`/api/admin/proofs?status=${filter}`)
      .then(r => r.json())
      .then(d => { setProofs(d.proofs ?? []); setLoading(false) })
  }, [filter, isAdmin])

  const act = async (proofId: string, status: 'approved' | 'rejected') => {
    setProcessing(proofId)
    setActErr('')
    const reason = rejectionDraft[proofId] ?? ''
    const res = await fetch('/api/admin/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofId, status, reason: reason || undefined }),
    }).catch(() => null)
    if (!res || !res.ok) {
      const json = res ? await res.json().catch(() => ({})) : {}
      setActErr(json.error ?? 'La validation a échoué — la preuve n\'a pas été mise à jour')
      setProcessing(null)
      return
    }
    // Retirée de l'onglet courant : elle apparaît maintenant dans Validées/Refusées
    setProofs(prev => prev.filter(p => p.id !== proofId))
    setProcessing(null)
  }

  if (isAdmin === false) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)', fontSize: 14 }}>
      Accès réservé aux admins.
    </div>
  )

  if (isAdmin === null || loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER, fontSize: 13 }}>
      Chargement…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: CREAM, padding: '48px 40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 6px', fontFamily: 'var(--font-syne,sans-serif)' }}>
            Validation des preuves
          </h1>
          <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>
            Vérifie et valide les screenshots uploadés par les coachs.
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: filter === s ? 'none' : `1px solid ${BORDER}`,
              background: filter === s
                ? s === 'pending' ? 'var(--brand)' : s === 'approved' ? 'var(--gain)' : 'var(--error)'
                : CARD,
              color: filter === s ? 'var(--bg)' : SILVER,
            }}>
              {s === 'pending' ? 'En attente' : s === 'approved' ? 'Validées' : 'Refusées'}
            </button>
          ))}
        </div>

        {actErr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: 'color-mix(in srgb, var(--error) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--error) 25%, transparent)', borderRadius: 10, color: 'var(--error)', fontSize: 13 }}>
            <AlertCircle size={14} /> {actErr}
          </div>
        )}

        {proofs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: SILVER, fontSize: 13 }}>
            {filter === 'pending' ? '✓ Aucune preuve en attente.' : 'Aucune entrée.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <style>{`
              @media (max-width: 560px) {
                .cadm-proof-row { grid-template-columns: 1fr !important; }
              }
            `}</style>
            {proofs.map(proof => (
              <div key={proof.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>

                {/* Row */}
                <div className="cadm-proof-row" style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 16, padding: 16, alignItems: 'start' }}>

                  {/* Thumbnail — clic = ouvrir la photo en taille réelle */}
                  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: 'var(--bg)', cursor: 'zoom-in' }}
                    onClick={() => window.open(proof.url, '_blank')}
                    title="Ouvrir la photo en taille réelle">
                    <Image src={proof.url} alt="" fill sizes="220px" style={{ objectFit: 'cover' }} />
                  </div>

                  {/* Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {proof.coach?.avatar_url
                        ? <Image src={proof.coach.avatar_url} alt="" width={24} height={24} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'color-mix(in srgb, var(--brand) 13%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--brand)' }}>
                            {(proof.coach?.username ?? '?').slice(0, 2).toUpperCase()}
                          </div>}
                      <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{proof.coach?.username ?? 'Coach inconnu'}</span>
                      <a href={`/coaches/${proof.coach?.id}`} target="_blank" rel="noreferrer"
                        style={{ color: SILVER, display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={11} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)', fontWeight: 700 }}>
                        {CAT_LABELS[proof.category] ?? proof.category}
                      </span>
                      <span style={{ fontSize: 10, color: SILVER }}>
                        {new Date(proof.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {proof.caption && (
                      <p style={{ fontSize: 12, color: SILVER, margin: 0, lineHeight: 1.5 }}>{proof.caption}</p>
                    )}

                    {proof.rejection_reason && (
                      <p style={{ fontSize: 11, color: 'var(--error)', margin: '6px 0 0', lineHeight: 1.4 }}>
                        Motif : {proof.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions (pending only) */}
                  {filter === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 130 }}>
                      <button onClick={() => act(proof.id, 'approved')} disabled={!!processing}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'color-mix(in srgb, var(--gain) 15%, transparent)', color: 'var(--gain)', fontSize: 12, fontWeight: 700, cursor: processing ? 'wait' : 'pointer' }}>
                        {processing === proof.id ? <div style={{ width: 12, height: 12, border: '1.5px solid color-mix(in srgb, var(--gain) 25%, transparent)', borderTopColor: 'var(--gain)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Check size={13} />}
                        Valider
                      </button>

                      <button onClick={() => setExpanded(expanded === proof.id ? null : proof.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid color-mix(in srgb, var(--error) 30%, transparent)`, background: 'color-mix(in srgb, var(--error) 8%, transparent)', color: 'var(--error)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <X size={13} />
                        Refuser
                        {expanded === proof.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </div>
                  )}

                  {filter !== 'pending' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: filter === 'approved' ? 'color-mix(in srgb, var(--gain) 10%, transparent)' : 'color-mix(in srgb, var(--error) 10%, transparent)' }}>
                      {filter === 'approved' ? <ShieldCheck size={13} color="var(--gain)" /> : <AlertCircle size={13} color="var(--error)" />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: filter === 'approved' ? 'var(--gain)' : 'var(--error)' }}>
                        {filter === 'approved' ? 'Validée' : 'Refusée'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rejection reason input */}
                {expanded === proof.id && filter === 'pending' && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      value={rejectionDraft[proof.id] ?? ''}
                      onChange={e => setRejectionDraft(prev => ({ ...prev, [proof.id]: e.target.value }))}
                      placeholder="Motif du refus (optionnel)…"
                      style={{ flex: 1, background: 'color-mix(in srgb, var(--brand) 4%, transparent)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', color: CREAM, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                    />
                    <button onClick={() => act(proof.id, 'rejected')} disabled={!!processing}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'color-mix(in srgb, var(--error) 15%, transparent)', color: 'var(--error)', fontSize: 12, fontWeight: 700, cursor: processing ? 'wait' : 'pointer' }}>
                      Confirmer le refus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
