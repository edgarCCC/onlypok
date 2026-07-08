'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Database, ChevronRight, CheckCircle2, XCircle, Loader2, Copy, Check, Lock } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CARD   = 'rgba(232,228,220,0.03)'
const BORDER = 'rgba(232,228,220,0.08)'

const MIGRATIONS = [
  {
    id: 'fix-variant-constraint',
    label: 'Formation variant constraint',
    desc: "Étend la contrainte formations_variant_check pour inclure NLH, PLO, SNG, Heads-Up, PKO. Active aussi les RLS policies sur video_comments.",
    endpoint: '/api/migrate/fix-variant-constraint',
  },
  {
    id: 'add-highlights-column',
    label: 'Colonne highlights formations',
    desc: "Ajoute la colonne highlights (jsonb) sur la table formations si elle n'existe pas encore. Nécessaire pour que les Atouts des formations fonctionnent.",
    endpoint: '/api/migrate/add-highlights-column',
  },
]

function MigrationCard({ migration }: { migration: typeof MIGRATIONS[0] }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'manual' | 'error'>('idle')
  const [sql, setSql] = useState('')
  const [copied, setCopied] = useState(false)

  const run = async () => {
    setStatus('running')
    try {
      const res = await fetch(migration.endpoint)
      const json = await res.json()
      if (json.ok) {
        setStatus('ok')
      } else if (json.sql) {
        setSql(json.sql)
        setStatus('manual')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: CREAM, marginBottom: 4 }}>{migration.label}</div>
          <div style={{ fontSize: 13, color: SILVER, lineHeight: 1.5 }}>{migration.desc}</div>
        </div>
        {status === 'idle' && (
          <button onClick={run} style={{ flexShrink: 0, padding: '8px 18px', background: VIOLET, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Appliquer
          </button>
        )}
        {status === 'running' && (
          <Loader2 size={18} color={SILVER} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
        )}
        {status === 'ok' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: 13, fontWeight: 700 }}>
            <CheckCircle2 size={16} /> Appliquée
          </div>
        )}
        {status === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontSize: 13 }}>
            <XCircle size={16} /> Erreur
          </div>
        )}
      </div>

      {status === 'manual' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 8, fontWeight: 600 }}>
            Aucun token de gestion disponible. Exécute ce SQL dans Supabase SQL Editor :
          </div>
          <div style={{ position: 'relative' }}>
            <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: SILVER, overflow: 'auto', maxHeight: 240, margin: 0, lineHeight: 1.6 }}>
              {sql.trim()}
            </pre>
            <button onClick={copy} style={{ position: 'absolute', top: 8, right: 8, background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? '#4ade80' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '4px 10px', color: copied ? '#4ade80' : SILVER, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EncryptPaymentInfoCard() {
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle')
  const [result, setResult] = useState<{ scanned?: number; profilesUpdated?: number; fieldsEncrypted?: number; failures?: unknown[] } | null>(null)
  const [errMsg, setErrMsg]  = useState('')

  const run = async () => {
    setStatus('running')
    setErrMsg('')
    try {
      const res  = await fetch('/api/admin/encrypt-payment-info', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setResult(json)
        setStatus((json.failures?.length ?? 0) > 0 ? 'error' : 'ok')
        if ((json.failures?.length ?? 0) > 0) setErrMsg(`${json.failures.length} échec(s) — voir les logs serveur`)
      } else {
        setStatus('error')
        setErrMsg(json.error ?? `HTTP ${res.status}`)
      }
    } catch {
      setStatus('error')
      setErrMsg('Erreur réseau')
    }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: CREAM, marginBottom: 4 }}>Chiffrer les coordonnées de paiement</div>
          <div style={{ fontSize: 13, color: SILVER, lineHeight: 1.5 }}>
            Chiffre (AES-256-GCM) les IBAN, PayPal, Stripe, Revolut et notes encore stockés en clair.
            Nécessite PAYMENT_INFO_ENC_KEY dans l&apos;environnement. Ré-exécutable sans risque.
          </div>
        </div>
        {(status === 'idle' || status === 'error') && (
          <button onClick={run} style={{ flexShrink: 0, padding: '8px 18px', background: VIOLET, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {status === 'error' ? 'Réessayer' : 'Lancer'}
          </button>
        )}
        {status === 'running' && (
          <Loader2 size={18} color={SILVER} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
        )}
        {status === 'ok' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: 13, fontWeight: 700 }}>
            <CheckCircle2 size={16} /> Terminé
          </div>
        )}
      </div>
      {result && (
        <div style={{ marginTop: 12, fontSize: 12, color: SILVER }}>
          {result.scanned} profils scannés · {result.profilesUpdated} mis à jour · {result.fieldsEncrypted} champs chiffrés
        </div>
      )}
      {status === 'error' && errMsg && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontSize: 12 }}>
          <XCircle size={14} /> {errMsg}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: CREAM, padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,64px)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <ShieldCheck size={20} color={VIOLET} />
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Administration</h1>
          </div>
          <p style={{ fontSize: 14, color: SILVER, margin: 0 }}>Outils réservés aux administrateurs de la plateforme.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Migrations */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Database size={15} color={SILVER} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: SILVER, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Migrations DB</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MIGRATIONS.map(m => <MigrationCard key={m.id} migration={m} />)}
            </div>
          </section>

          {/* Sécurité */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Lock size={15} color={SILVER} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: SILVER, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sécurité</h2>
            </div>
            <EncryptPaymentInfoCard />
          </section>

          {/* Validations */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ShieldCheck size={15} color={SILVER} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: SILVER, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Validations</h2>
            </div>
            <Link href="/coach/admin/validations" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 24px', textDecoration: 'none' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: CREAM, marginBottom: 4 }}>Preuves coaches</div>
                <div style={{ fontSize: 13, color: SILVER }}>Valider ou rejeter les preuves de résultats soumises par les coaches.</div>
              </div>
              <ChevronRight size={18} color={SILVER} />
            </Link>
          </section>

        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
