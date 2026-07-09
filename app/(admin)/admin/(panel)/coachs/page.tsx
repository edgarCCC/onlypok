'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Users, Search, ExternalLink, ChevronDown, ChevronUp, Clock, ShieldCheck, AlertCircle, Eye, Loader2, BadgeCheck } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CARD   = 'rgba(232,228,220,0.03)'
const BORDER = 'rgba(232,228,220,0.08)'

type CoachRow = {
  id: string
  username: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  is_pro: boolean | null
  years_experience: number | null
  phone: string | null
  city: string | null
  country: string | null
  is_company: boolean | null
  company_name: string | null
  siret: string | null
  vat_number: string | null
  preferred_payment: string | null
  formations_count: number
  proofs: { pending: number; approved: number; rejected: number }
}

type CoachDetail = CoachRow & {
  bio: string | null
  vision: string | null
  address_line: string | null
  zip_code: string | null
  iban: string | null
  paypal_email: string | null
  stripe_account: string | null
  revolut_tag: string | null
  payment_notes: string | null
}

function InfoLine({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.7 }}>
      <span style={{ color: SILVER, minWidth: 150 }}>{label}</span>
      <span style={{ color: value ? CREAM : 'rgba(240,244,255,0.25)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
      </span>
    </div>
  )
}

function CoachCard({ coach }: { coach: CoachRow }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<CoachDetail | null>(null)
  const [detailErr, setDetailErr] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !detail && !loadingDetail) {
      setLoadingDetail(true)
      setDetailErr('')
      try {
        const res  = await fetch(`/api/admin/coaches?id=${coach.id}`)
        const json = await res.json()
        if (res.ok) setDetail(json.coach)
        else setDetailErr(json.error ?? `HTTP ${res.status}`)
      } catch {
        setDetailErr('Erreur réseau')
      }
      setLoadingDetail(false)
    }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Ligne principale */}
      <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        {coach.avatar_url
          ? <Image src={coach.avatar_url} alt="" width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#7c3aed22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: VIOLET, flexShrink: 0 }}>
              {(coach.username ?? '?').slice(0, 2).toUpperCase()}
            </div>}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{coach.username ?? 'Sans pseudo'}</span>
            {coach.is_pro && <BadgeCheck size={14} color="#06b6d4" />}
            <span style={{ fontSize: 11, color: SILVER }}>{coach.email ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: SILVER, flexWrap: 'wrap' }}>
            <span>{coach.formations_count} formation{coach.formations_count > 1 ? 's' : ''}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} color="#f59e0b" /> {coach.proofs.pending}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><ShieldCheck size={10} color="#4ade80" /> {coach.proofs.approved}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><AlertCircle size={10} color="#ef4444" /> {coach.proofs.rejected}</span>
            <span>inscrit le {new Date(coach.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        <a href={`/coaches/${coach.id}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          title="Voir le profil public"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, color: SILVER, fontSize: 11, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
          <ExternalLink size={11} /> Profil public
        </a>
        {open ? <ChevronUp size={16} color={SILVER} /> : <ChevronDown size={16} color={SILVER} />}
      </button>

      {/* Détail */}
      {open && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 18px' }}>
          {loadingDetail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: SILVER, fontSize: 12 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Chargement du profil…
            </div>
          )}
          {detailErr && <div style={{ color: '#ef4444', fontSize: 12 }}>{detailErr}</div>}
          {detail && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Identité</div>
                <InfoLine label="Pseudo" value={detail.username} />
                <InfoLine label="Email" value={detail.email} />
                <InfoLine label="Téléphone" value={detail.phone} />
                <InfoLine label="Expérience" value={detail.years_experience != null ? `${detail.years_experience} ans` : null} />
                <InfoLine label="Adresse" value={[detail.address_line, detail.zip_code, detail.city, detail.country].filter(Boolean).join(', ') || null} />
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Entreprise</div>
                <InfoLine label="Statut" value={detail.is_company ? 'Société' : 'Particulier / auto-entrepreneur'} />
                <InfoLine label="Raison sociale" value={detail.company_name} />
                <InfoLine label="SIRET" value={detail.siret} />
                <InfoLine label="N° TVA" value={detail.vat_number} />
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Paiement</div>
                <InfoLine label="Méthode préférée" value={detail.preferred_payment} />
                {showPayment ? (
                  <>
                    <InfoLine label="IBAN" value={detail.iban} />
                    <InfoLine label="PayPal" value={detail.paypal_email} />
                    <InfoLine label="Stripe" value={detail.stripe_account} />
                    <InfoLine label="Revolut" value={detail.revolut_tag} />
                    <InfoLine label="Notes" value={detail.payment_notes} />
                  </>
                ) : (
                  <button onClick={() => setShowPayment(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '7px 14px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, color: VIOLET, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <Eye size={12} /> Afficher les coordonnées
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminCoachsPage() {
  const [coaches, setCoaches] = useState<CoachRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res  = await fetch('/api/admin/coaches')
        const json = await res.json()
        if (res.ok) setCoaches(json.coaches ?? [])
        else setErr(json.error ?? `HTTP ${res.status}`)
      } catch {
        setErr('Erreur réseau')
      }
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return coaches
    return coaches.filter(c =>
      (c.username ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.company_name ?? '').toLowerCase().includes(q) ||
      (c.siret ?? '').includes(q)
    )
  }, [coaches, query])

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM, padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,64px)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Users size={20} color={VIOLET} />
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Coachs</h1>
            {!loading && <span style={{ fontSize: 13, color: SILVER }}>({filtered.length})</span>}
          </div>
          <p style={{ fontSize: 14, color: SILVER, margin: 0 }}>
            Profils complets des coachs : identité, entreprise, coordonnées de paiement, preuves.
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 24, maxWidth: 380 }}>
          <Search size={14} color={SILVER} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher pseudo, email, société, SIRET…"
            style={{ width: '100%', padding: '10px 12px 10px 34px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: CREAM, fontSize: 13, outline: 'none' }}
          />
        </div>

        {loading && <div style={{ color: SILVER, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Chargement…</div>}
        {err && <div style={{ color: '#ef4444', fontSize: 13 }}>{err}</div>}
        {!loading && !err && filtered.length === 0 && (
          <div style={{ color: SILVER, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Aucun coach trouvé.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => <CoachCard key={c.id} coach={c} />)}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
