'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Clock, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const CARD   = 'rgba(232,228,220,0.03)'
const BORDER = 'rgba(232,228,220,0.08)'

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
    const reason = rejectionDraft[proofId] ?? ''
    await fetch('/api/admin/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofId, status, reason: reason || undefined }),
    })
    setProofs(prev => prev.filter(p => p.id !== proofId))
    setProcessing(null)
  }

  if (isAdmin === false) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 14 }}>
      Accès réservé aux admins.
    </div>
  )

  if (isAdmin === null || loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER, fontSize: 13 }}>
      Chargement…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM, padding: '48px 40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 6px', fontFamily: 'var(--font-syne,sans-serif)' }}>
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
                ? s === 'pending' ? '#f59e0b' : s === 'approved' ? '#4ade80' : '#ef4444'
                : CARD,
              color: filter === s ? '#07090e' : SILVER,
            }}>
              {s === 'pending' ? 'En attente' : s === 'approved' ? 'Validées' : 'Refusées'}
            </button>
          ))}
        </div>

        {proofs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: SILVER, fontSize: 13 }}>
            {filter === 'pending' ? '✓ Aucune preuve en attente.' : 'Aucune entrée.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {proofs.map(proof => (
              <div key={proof.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>

                {/* Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 16, padding: 16, alignItems: 'start' }}>

                  {/* Thumbnail */}
                  <div style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: '#0c0f17', cursor: 'pointer' }}
                    onClick={() => window.open(proof.url, '_blank')}>
                    <img src={proof.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  {/* Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {proof.coach?.avatar_url
                        ? <img src={proof.coach.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#7c3aed22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>
                            {(proof.coach?.username ?? '?').slice(0, 2).toUpperCase()}
                          </div>}
                      <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{proof.coach?.username ?? 'Coach inconnu'}</span>
                      <a href={`/coaches/${proof.coach?.id}`} target="_blank" rel="noreferrer"
                        style={{ color: SILVER, display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={11} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(6,182,212,0.12)', color: '#06b6d4', fontWeight: 700 }}>
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
                      <p style={{ fontSize: 11, color: '#ef4444', margin: '6px 0 0', lineHeight: 1.4 }}>
                        Motif : {proof.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions (pending only) */}
                  {filter === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 130 }}>
                      <button onClick={() => act(proof.id, 'approved')} disabled={!!processing}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: processing ? 'wait' : 'pointer' }}>
                        {processing === proof.id ? <div style={{ width: 12, height: 12, border: '1.5px solid #4ade8040', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Check size={13} />}
                        Valider
                      </button>

                      <button onClick={() => setExpanded(expanded === proof.id ? null : proof.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <X size={13} />
                        Refuser
                        {expanded === proof.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </div>
                  )}

                  {filter !== 'pending' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: filter === 'approved' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)' }}>
                      {filter === 'approved' ? <ShieldCheck size={13} color="#4ade80" /> : <AlertCircle size={13} color="#ef4444" />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: filter === 'approved' ? '#4ade80' : '#ef4444' }}>
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
                      style={{ flex: 1, background: 'rgba(232,228,220,0.04)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', color: CREAM, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                    />
                    <button onClick={() => act(proof.id, 'rejected')} disabled={!!processing}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: processing ? 'wait' : 'pointer' }}>
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
