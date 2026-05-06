'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain, Target, Shuffle, BookOpen, Zap, Microscope, ArrowRight, Lock } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const AMBER  = '#f59e0b'

const FEATURES = [
  {
    icon: Target,
    title: 'Entraîneur de ranges',
    desc: "Entraîne-toi à ouvrir, 3-bet, cold call les bonnes ranges depuis n'importe quelle position. Feedback immédiat.",
    color: VIOLET,
    available: true,
    href: '/trainer/ranges',
  },
  {
    icon: Brain,
    title: 'Quiz de mains',
    desc: 'Des spots réels soumis par des coachs certifiés. Choisis ta ligne — fold, call, raise — et vois le raisonnement GTO.',
    color: CYAN,
    available: false,
  },
  {
    icon: Shuffle,
    title: 'Drill équité',
    desc: 'Calcule ton équité à la main sur des boards donnés. Entraîne ton intuition sans solver.',
    color: '#4ade80',
    available: true,
    href: '/trainer/equity',
  },
  {
    icon: Microscope,
    title: 'Analyse de leaks',
    desc: 'Connecte ton tracker, identifie tes spots les moins rentables et reçois des exercices ciblés.',
    color: AMBER,
    available: false,
  },
  {
    icon: BookOpen,
    title: 'Plans d\'étude personnalisés',
    desc: 'Un coach crée un plan d\'étude sur mesure en fonction de ton niveau et tes leaks identifiés.',
    color: '#a78bfa',
    available: false,
  },
  {
    icon: Zap,
    title: 'Simulations en temps réel',
    desc: 'Rejoue des mains complexes, explore les alternatives et compare avec les solutions GTO.',
    color: '#ec4899',
    available: false,
  },
]

export default function TrainerPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    void (async () => { const { data: { user } } = await createClient().auth.getUser(); setLoggedIn(!!user) })()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '140px clamp(20px,5vw,80px) 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', marginBottom: 28 }}>
          <Brain size={13} color={CYAN} />
          <span style={{ fontSize: 12, fontWeight: 700, color: CYAN, letterSpacing: '0.08em' }}>TRAINER POKER</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, margin: '0 0 20px' }}>
          Entraîne-toi.{' '}
          <span style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Monte de stakes.
          </span>
        </h1>
        <p style={{ fontSize: 18, color: SILVER, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Ranges, quiz, drills d'équité — des exercices conçus par des pros pour progresser entre deux sessions.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {loggedIn ? (
            <button
              onClick={() => document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '13px 28px', borderRadius: 10, background: CYAN, color: '#07090e', border: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              Accéder aux outils <ArrowRight size={15} />
            </button>
          ) : (
            <Link href="/register" style={{ padding: '13px 28px', borderRadius: 10, background: CYAN, color: '#07090e', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              Commencer l'entraînement <ArrowRight size={15} />
            </Link>
          )}
          <Link href="/formations" style={{ padding: '13px 28px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', color: SILVER, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Voir les formations
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section id="tools" style={{ padding: '0 clamp(20px,5vw,80px) 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, title, desc, color, available, href }) => {
              const card = (
                <div style={{ position: 'relative', background: 'rgba(232,228,220,0.03)', border: `1px solid ${available ? color + '28' : 'rgba(232,228,220,0.07)'}`, borderRadius: 18, padding: '28px 26px', overflow: 'hidden', opacity: available ? 1 : 0.5, cursor: available ? 'pointer' : 'default', transition: 'border-color 0.2s, transform 0.15s', minHeight: 200, height: '100%', boxSizing: 'border-box' }}
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
                ? <Link key={title} href={href!} style={{ textDecoration: 'none', display: 'flex' }}>{card}</Link>
                : <div key={title} style={{ display: 'flex' }}>{card}</div>
            })}
          </div>
        </div>
      </section>

      {/* Lien marketplace */}
      <section style={{ padding: '0 clamp(20px,5vw,80px) 120px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(124,58,237,0.08))', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 24, padding: 'clamp(40px,5vw,64px)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 12px' }}>
            Les outils accélèrent, les coachs transforment.
          </h2>
          <p style={{ fontSize: 16, color: SILVER, margin: '0 auto 32px', maxWidth: 480, lineHeight: 1.6 }}>
            Combine le Trainer avec un coaching personnalisé pour une progression 10× plus rapide.
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
