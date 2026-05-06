'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Info } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

type StatDef = { key: string; label: string; desc: string; good: [number, number]; unit: string; color: string }

const STAT_DEFS: StatDef[] = [
  { key: 'vpip',    label: 'VPIP',     desc: 'Voluntarily Put money In Pot — % de mains jouées',   good: [22,28], unit: '%', color: VIOLET },
  { key: 'pfr',     label: 'PFR',      desc: 'Pre-Flop Raise — % de raises avant le flop',         good: [18,24], unit: '%', color: '#06b6d4' },
  { key: 'threebet', label: '3-Bet%',  desc: '% de fois tu 3-bettes face à un open',               good: [7,11],  unit: '%', color: '#f59e0b' },
  { key: 'cbet',    label: 'C-Bet flop', desc: '% de continuation bet au flop',                    good: [55,70], unit: '%', color: '#4ade80' },
  { key: 'af',      label: 'AF',       desc: 'Aggression Factor — ratio raise+bet / call',         good: [2,4],   unit: '',  color: '#a78bfa' },
  { key: 'wtsd',    label: 'WTSD%',    desc: 'Went To ShowDown — % de fois tu vas à l\'abattage',  good: [24,30], unit: '%', color: '#ec4899' },
  { key: 'wsd',     label: 'W$SD%',    desc: 'Won money at ShowDown — win rate à l\'abattage',     good: [50,56], unit: '%', color: '#4ade80' },
  { key: 'hands',   label: 'Mains',    desc: 'Nombre de mains dans ton échantillon',               good: [50000, Infinity], unit: '', color: SILVER },
]

function StatBar({ value, good, color }: { value: number; good: [number, number]; color: string }) {
  const max = good[1] === Infinity ? Math.max(value, 100000) : good[1] * 2
  const pct = Math.min((value / max) * 100, 100)
  const inRange = value >= good[0] && (good[1] === Infinity ? true : value <= good[1])
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: inRange ? color : '#ef4444', borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

export default function StatsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user,   setUser]   = useState<{ id: string } | null>(null)
  const [stats,  setStats]  = useState<Record<string, string>>({})
  const [saved,  setSaved]  = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser({ id: user.id })
      const { data: profile } = await supabase.from('profiles').select('privacy_prefs').eq('id', user.id).single()
      const stored = (profile as { privacy_prefs?: Record<string, Record<string, string>> })?.privacy_prefs?.stats ?? {}
      setStats(stored)
    }
    init()
  }, [supabase])

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { data: profile } = await supabase.from('profiles').select('privacy_prefs').eq('id', user.id).single()
    const current = (profile as { privacy_prefs?: Record<string, unknown> })?.privacy_prefs ?? {}
    await supabase.from('profiles').update({ privacy_prefs: { ...current, stats } }).eq('id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Tracker
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Stats HUD</h1>
          {user && (
            <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', background: saved ? '#4ade8033' : VIOLET, color: saved ? '#4ade80' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={13} /> {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
            </button>
          )}
        </div>
        <p style={{ fontSize: 13, color: SILVER, marginBottom: 28 }}>
          Saisis tes stats depuis HM3, PT4 ou SharkScope. La zone verte indique la fourchette GTO recommandée.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', marginBottom: 24 }}>
          <Info size={13} color={CYAN} />
          <span style={{ fontSize: 12, color: SILVER }}>Les fourchettes cibles sont pour du 6-max NL Cash 100BB. Elles varient selon le format.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {STAT_DEFS.map(({ key, label, desc, good, unit, color }) => {
            const val = parseFloat(stats[key] || '0')
            const inRange = val > 0 && val >= good[0] && (good[1] === Infinity ? true : val <= good[1])
            const outRange = val > 0 && !inRange
            return (
              <div key={key} style={{ background: CARD, border: `1px solid ${outRange ? 'rgba(239,68,68,0.25)' : BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: CREAM, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 11, color: SILVER, lineHeight: 1.4 }}>{desc}</div>
                  </div>
                  <input
                    type="number" value={stats[key] ?? ''} step="0.1"
                    onChange={e => setStats(s => ({ ...s, [key]: e.target.value }))}
                    placeholder="—"
                    style={{ width: 70, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '6px 8px', color: inRange ? color : outRange ? '#ef4444' : CREAM, fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'right' }}
                  />
                </div>
                {val > 0 && <StatBar value={val} good={good} color={color} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: SILVER }}>
                  <span>Cible : {good[0]}{unit}–{good[1] === Infinity ? '∞' : good[1]+unit}</span>
                  {val > 0 && (
                    <span style={{ color: inRange ? color : '#ef4444', fontWeight: 700 }}>
                      {inRange ? '✓ Dans la fourchette' : outRange ? (val < good[0] ? '↑ Trop bas' : '↓ Trop haut') : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!user && (
          <div style={{ marginTop: 24, textAlign: 'center', padding: '24px', background: CARD, borderRadius: 14, border: `1px solid ${BORDER}` }}>
            <p style={{ color: SILVER, margin: '0 0 12px' }}>Connecte-toi pour sauvegarder tes stats</p>
            <Link href="/login" style={{ padding: '10px 24px', borderRadius: 9, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>
          </div>
        )}
      </div>
    </div>
  )
}
