'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'
const VIOLET = '#7c3aed'
const GREEN  = '#4ade80'
const RED    = '#ef4444'

type Session = {
  id: string; date: string; stakes: string; variant: string
  location: string; buy_in: number; cash_out: number; duration: number | null; notes: string | null
}

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: '9px 12px', color: CREAM, fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

export default function SessionsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user,     setUser]     = useState<{ id: string } | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), stakes: '25NL', variant: 'NLH', location: 'online', buy_in: '', cash_out: '', duration: '', notes: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser({ id: user.id })
      const { data: rows } = await supabase.from('tracker_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false })
      setSessions(rows ?? [])
      setLoading(false)
    }
    init()
  }, [supabase])

  const save = async () => {
    if (!user || !form.buy_in || !form.cash_out) return
    setSaving(true)
    const { data } = await supabase.from('tracker_sessions').insert({
      user_id: user.id, date: form.date, stakes: form.stakes, variant: form.variant,
      location: form.location, buy_in: parseInt(form.buy_in), cash_out: parseInt(form.cash_out),
      duration: form.duration ? parseInt(form.duration) : null, notes: form.notes || null,
    }).select().single()
    if (data) setSessions(prev => [data, ...prev])
    setShowForm(false)
    setForm({ date: new Date().toISOString().slice(0,10), stakes: '25NL', variant: 'NLH', location: 'online', buy_in: '', cash_out: '', duration: '', notes: '' })
    setSaving(false)
  }

  const del = async (id: string) => {
    await supabase.from('tracker_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const totalProfit = sessions.reduce((acc, s) => acc + (s.cash_out - s.buy_in), 0)
  const winRate = sessions.length > 0 ? sessions.filter(s => s.cash_out > s.buy_in).length / sessions.length * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Tracker
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>Journal de Sessions</h1>
            <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} enregistrée{sessions.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, border: 'none', background: VIOLET, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {/* Stats */}
        {sessions.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Profit total', value: `${totalProfit >= 0 ? '+' : ''}${totalProfit}€`, color: totalProfit >= 0 ? GREEN : RED, icon: DollarSign },
              { label: 'Win rate', value: `${Math.round(winRate)}%`, color: winRate >= 50 ? GREEN : RED, icon: TrendingUp },
              { label: 'Sessions', value: sessions.length.toString(), color: '#a78bfa', icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize: 11, color: SILVER, fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Nouvelle session</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={inp} />
              </div>
              <div><label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Stakes</label>
                <select value={form.stakes} onChange={e => setForm(f => ({...f, stakes: e.target.value}))} style={{...inp, cursor:'pointer'}}>
                  {['2NL','5NL','10NL','25NL','50NL','100NL','200NL','500NL','1KNL','Tournoi'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Buy-in (€)</label>
                <input type="number" value={form.buy_in} onChange={e => setForm(f => ({...f, buy_in: e.target.value}))} placeholder="100" style={inp} />
              </div>
              <div><label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Cash-out (€)</label>
                <input type="number" value={form.cash_out} onChange={e => setForm(f => ({...f, cash_out: e.target.value}))} placeholder="150" style={inp} />
              </div>
              <div><label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Variante</label>
                <select value={form.variant} onChange={e => setForm(f => ({...f, variant: e.target.value}))} style={{...inp, cursor:'pointer'}}>
                  {['NLH','PLO','PLO5','MTT','SNG','Spin','Mixed'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Durée (minutes)</label>
                <input type="number" value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))} placeholder="120" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: SILVER, display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Spots intéressants, leaks identifiés…" rows={2} style={{...inp, resize:'vertical'}} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button onClick={save} disabled={saving || !form.buy_in || !form.cash_out} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: VIOLET, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: SILVER }}>Chargement…</div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: SILVER, marginBottom: 16 }}>Connecte-toi pour enregistrer tes sessions.</p>
            <Link href="/login" style={{ padding: '11px 24px', borderRadius: 9, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: SILVER }}>
            <p>Aucune session enregistrée. Clique sur "Ajouter" pour commencer.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(s => {
              const profit = s.cash_out - s.buy_in
              return (
                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto auto', gap: 12, alignItems: 'center', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: SILVER }}>{new Date(s.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{s.stakes} · {s.variant}</div>
                    {s.notes && <div style={{ fontSize: 11, color: SILVER, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{s.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 70 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: profit > 0 ? GREEN : profit < 0 ? RED : SILVER }}>
                      {profit > 0 ? '+' : ''}{profit}€
                    </div>
                    {s.duration && <div style={{ fontSize: 10, color: SILVER }}>{s.duration}min</div>}
                  </div>
                  <button onClick={() => del(s.id)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'rgba(240,244,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = RED; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,244,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
