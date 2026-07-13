'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Clock } from 'lucide-react'
import SelectInput from '@/components/ui/SelectInput'
import NumberStepper from '@/components/ui/NumberStepper'
import { TrackerShell, Card, KpiStrip, SectionLabel, Th, Td, Empty, T, NUM, eur, pnlColor } from '@/components/tracker/ui'

type Session = {
  id: string; date: string; stakes: string; variant: string
  location: string; buy_in: number; cash_out: number; duration: number | null; notes: string | null
}

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
  borderRadius: 8, padding: '9px 12px', color: T.cream, fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

const GRID = '84px 1fr 110px 110px 90px 100px 36px'

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
  const winRate     = sessions.length > 0 ? sessions.filter(s => s.cash_out > s.buy_in).length / sessions.length * 100 : 0
  const totalMins   = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0)
  const hourly      = totalMins > 0 ? totalProfit / (totalMins / 60) : null

  return (
    <TrackerShell actions={
      <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: `1px solid ${T.borderStrong}`, background: T.raised, color: T.cream, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
        <Plus size={13} /> Nouvelle session
      </button>
    }>

      {sessions.length > 0 && (
        <KpiStrip items={[
          { label: 'Profit cash', value: eur(totalProfit, { sign: true, dec: 0 }), color: pnlColor(totalProfit) },
          { label: 'Win rate',    value: `${Math.round(winRate)} %`, color: winRate >= 50 ? T.green : T.red, sub: 'sessions gagnantes' },
          { label: 'Sessions',    value: String(sessions.length), color: T.cream },
          { label: '€ / heure',   value: hourly === null ? '—' : eur(hourly, { sign: true }), color: hourly === null ? T.dim : pnlColor(hourly), sub: totalMins > 0 ? `${Math.round(totalMins / 60)} h jouées` : undefined },
        ]} />
      )}

      {/* Formulaire */}
      {showForm && (
        <Card style={{ marginBottom: 14, background: 'rgba(124,58,237,0.05)', borderColor: 'rgba(124,58,237,0.18)' }}>
          <SectionLabel>Nouvelle session</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div><label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={inp} />
            </div>
            <div><label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Stakes</label>
              <SelectInput value={form.stakes} onChange={v => setForm(f => ({...f, stakes: v}))}
                options={['2NL','5NL','10NL','25NL','50NL','100NL','200NL','500NL','1KNL','Tournoi'].map(s => ({ value: s, label: s }))} />
            </div>
            <div><label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Buy-in (€)</label>
              <input type="number" value={form.buy_in} onChange={e => setForm(f => ({...f, buy_in: e.target.value}))} placeholder="100" style={inp} />
            </div>
            <div><label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Cash-out (€)</label>
              <input type="number" value={form.cash_out} onChange={e => setForm(f => ({...f, cash_out: e.target.value}))} placeholder="150" style={inp} />
            </div>
            <div><label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Variante</label>
              <SelectInput value={form.variant} onChange={v => setForm(f => ({...f, variant: v}))}
                options={['NLH','PLO','PLO5','MTT','SNG','Spin','Mixed'].map(v => ({ value: v, label: v }))} />
            </div>
            <div><label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Durée (minutes)</label>
              <NumberStepper value={Number(form.duration) || 0} onChange={v => setForm(f => ({...f, duration: String(v)}))} min={0} max={1440} step={15} suffix="min" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: T.silver, display: 'block', marginBottom: 5 }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Spots intéressants, leaks identifiés…" rows={2} style={{...inp, resize:'vertical'}} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.silver, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            <button onClick={save} disabled={saving || !form.buy_in || !form.cash_out} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: T.violet, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving || !form.buy_in || !form.cash_out ? 0.6 : 1 }}>
              {saving ? '…' : 'Enregistrer'}
            </button>
          </div>
        </Card>
      )}

      {/* Liste */}
      {loading ? (
        <Card><div style={{ textAlign: 'center', padding: '48px 0', color: T.silver, fontSize: 13 }}>Chargement…</div></Card>
      ) : !user ? (
        <Card>
          <Empty icon={<Clock size={40} color={T.cream} />} title="Connecte-toi pour ton journal de sessions"
            sub="Enregistre tes sessions cash : profit, win rate et €/h calculés automatiquement."
            cta={<Link href="/login" style={{ padding: '11px 24px', borderRadius: 10, background: T.violet, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Se connecter</Link>} />
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <Empty icon={<Clock size={40} color={T.cream} />} title="Aucune session enregistrée"
            sub="Le journal de sessions couvre ton jeu cash (live ou en ligne) : ajoute ta première session pour démarrer le suivi."
            cta={<button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 24px', borderRadius: 10, border: 'none', background: T.violet, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Ajouter une session</button>} />
        </Card>
      ) : (
        <Card pad={false}>
          <div style={{ padding: '16px 20px 0' }}>
            <SectionLabel right={<span style={{ fontSize: 11, color: T.dim }}>{sessions.length} session{sessions.length > 1 ? 's' : ''}</span>}>
              Journal de sessions
            </SectionLabel>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '8px 20px', borderBottom: `1px solid ${T.border}` }}>
            <Th>Date</Th><Th>Notes</Th><Th>Stakes</Th><Th align="right">Buy-in</Th><Th align="right">Cash-out</Th><Th align="right">Profit</Th><Th />
          </div>
          {sessions.map(s => {
            const profit = s.cash_out - s.buy_in
            return (
              <div key={s.id} className="trk-row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '11px 20px', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
                <Td color={T.dim}>{new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</Td>
                <Td color={s.notes ? T.silver : T.faint}>{s.notes ?? '—'}</Td>
                <Td color={T.cream} strong>{s.stakes} · {s.variant}</Td>
                <Td align="right">{eur(s.buy_in, { dec: 0 })}</Td>
                <Td align="right">{eur(s.cash_out, { dec: 0 })}</Td>
                <Td align="right" strong color={pnlColor(profit)}>{eur(profit, { sign: true, dec: 0 })}</Td>
                <button onClick={() => del(s.id)} aria-label="Supprimer" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: T.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', justifySelf: 'end' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T.red }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.faint }}>
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </Card>
      )}
    </TrackerShell>
  )
}
