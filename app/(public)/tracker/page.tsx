'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, BarChart2, Database, Clock, Coins, Activity, ArrowRight, Lock } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Dashboard',
    desc: 'Courbe de bankroll, ROI, ITM%, résultats par tournoi. Toutes tes stats en un coup d\'œil.',
    color: VIOLET,
    available: true,
    href: '/tracker/dashboard',
  },
  {
    icon: Clock,
    title: 'Journal de sessions',
    desc: 'Logge chaque session — stakes, buy-ins, durée, cash-out. Visualise ta progression session par session.',
    color: '#a78bfa',
    available: true,
    href: '/tracker/sessions',
  },
  {
    icon: Coins,
    title: 'Suivi bankroll',
    desc: 'Courbe de bankroll en temps réel. Gestion des stakes selon ta roll (20 BI minimum recommandés).',
    color: '#4ade80',
    available: true,
    href: '/tracker/bankroll',
  },
  {
    icon: BarChart2,
    title: 'Stats live & tournois',
    desc: 'VPIP, PFR, 3-bet%, vol de blindes — importés depuis HM3/PT4/SharkScope ou saisis manuellement.',
    color: CYAN,
    available: true,
    href: '/tracker/stats',
  },
  {
    icon: Activity,
    title: 'Analyse de tendances',
    desc: 'Détecte tes leaks récurrents. Graphes win-rate par stakes, variante, room et période.',
    color: '#f59e0b',
    available: false,
  },
  {
    icon: Database,
    title: 'Import HM3 / PT4',
    desc: 'Importe ton historique de mains en un clic. Toutes les stats calculées automatiquement.',
    color: '#a78bfa',
    available: false,
  },
  {
    icon: TrendingUp,
    title: 'Objectifs & milestones',
    desc: 'Définis tes objectifs de VPP, heures de jeu, ou montée de stakes. Suivi automatique.',
    color: '#ec4899',
    available: false,
  },
]

export default function TrackerPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    void (async () => { const { data: { user } } = await createClient().auth.getUser(); setLoggedIn(!!user) })()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: 'center', padding: '140px clamp(20px,5vw,80px) 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)', marginBottom: 28 }}>
          <TrendingUp size={13} color={VIOLET} />
          <span style={{ fontSize: 12, fontWeight: 700, color: VIOLET, letterSpacing: '0.08em' }}>TRACKER POKER</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, margin: '0 0 20px' }}>
          Ton jeu,{' '}
          <span style={{ background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            sous contrôle.
          </span>
        </h1>
        <p style={{ fontSize: 18, color: SILVER, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Suis tes sessions, analyse tes stats et identifie tes leaks — tout en un seul endroit.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {loggedIn ? (
            <button
              onClick={() => document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '13px 28px', borderRadius: 10, background: VIOLET, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              Accéder au tracker <ArrowRight size={15} />
            </button>
          ) : (
            <Link href="/register" style={{ padding: '13px 28px', borderRadius: 10, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              Commencer gratuitement <ArrowRight size={15} />
            </Link>
          )}
          <Link href="/tracker/import" style={{ padding: '13px 28px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.35)', color: CYAN, textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={15} /> Importer Winamax
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section id="tools" style={{ padding: '0 clamp(20px,5vw,80px) 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, title, desc, color, available, href }) => {
              const card = (
                <div style={{ position: 'relative', background: 'rgba(232,228,220,0.03)', border: `1px solid ${available ? color + '28' : 'rgba(232,228,220,0.07)'}`, borderRadius: 18, padding: '28px 26px', overflow: 'hidden', opacity: available ? 1 : 0.5, cursor: available ? 'pointer' : 'default', transition: 'border-color 0.2s, transform 0.15s' }}
                  onMouseEnter={e => { if (available) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.borderColor = color + '55' } }}
                  onMouseLeave={e => { if (available) { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.borderColor = color + '28' } }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 0% 0%, ${color}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={color} />
                    </div>
                    {!available
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: SILVER, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99 }}><Lock size={9} /> Bientôt</span>
                      : <ArrowRight size={14} color={color} style={{ opacity: 0.6 }} />
                    }
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: CREAM, margin: '0 0 8px' }}>{title}</h3>
                  <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.6 }}>{desc}</p>
                </div>
              )
              return available
                ? <Link key={title} href={href!} style={{ textDecoration: 'none' }}>{card}</Link>
                : <div key={title}>{card}</div>
            })}
          </div>
        </div>
      </section>

      {/* CTA marketplace */}
      <section style={{ padding: '0 clamp(20px,5vw,80px) 120px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 24, padding: 'clamp(40px,5vw,64px)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 12px' }}>
            Le tracker seul ne suffit pas.
          </h2>
          <p style={{ fontSize: 16, color: SILVER, margin: '0 auto 32px', maxWidth: 480, lineHeight: 1.6 }}>
            Identifie tes leaks avec le tracker, puis corrige-les avec un coach certifié ou une formation adaptée.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/coaches" style={{ padding: '13px 28px', borderRadius: 10, background: VIOLET, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              Trouver un coach <ArrowRight size={15} />
            </Link>
            <Link href="/formations" style={{ padding: '13px 28px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.4)', color: CYAN, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Voir les formations
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
