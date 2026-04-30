'use client'

import { useState, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import PlayerCard, { type CardData, type FxData, type AvatarKey, type FormatKey } from './PlayerCard'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SIDE_CARDS: { card: CardData; fx: FxData }[] = [
  {
    card: {
      pseudo: 'SHADOW_K', country: 'FR', rating: 74, role: 'student',
      avatar: 'fish5', format: 'MTT', abi: 50, volume: '14K',
      roi: 12, gto: 72, streak: 8, trophies: 19,
      coachRating: 4.2, coachReach: '200', coachStudents: 45,
    },
    fx: { tilt: 0, noise: 0.45, iris: 0.45 },
  },
  {
    card: {
      pseudo: 'GHOST_V', country: 'BE', rating: 68, role: 'student',
      avatar: 'fish3', format: 'CASH GAME', abi: 25, volume: '9K',
      roi: 6, gto: 63, streak: 3, trophies: 11,
      coachRating: 3.9, coachReach: '150', coachStudents: 31,
    },
    fx: { tilt: 0, noise: 0.45, iris: 0.4 },
  },
]

const FISH: AvatarKey[] = ['fish1','fish2','fish3','fish4','fish5','fish6']
const SHARKS: AvatarKey[] = ['shark1','shark2','shark3','shark4','shark5','shark6']
const AVATARS: AvatarKey[] = [...FISH, ...SHARKS]

const AVATAR_LABELS: Record<AvatarKey, string> = {
  fish1:'F1', fish2:'F2', fish3:'F3', fish4:'F4', fish5:'F5', fish6:'F6',
  shark1:'S1', shark2:'S2', shark3:'S3', shark4:'S4', shark5:'S5', shark6:'S6',
}

const AVATAR_ACCENTS: Record<AvatarKey, string> = {
  fish1:'oklch(0.60 0.10 145)', fish2:'oklch(0.66 0.13 175)', fish3:'oklch(0.72 0.16 200)',
  fish4:'oklch(0.74 0.18 210)', fish5:'oklch(0.78 0.20 160)', fish6:'oklch(0.72 0.22 295)',
  shark1:'oklch(0.68 0.14 235)', shark2:'oklch(0.70 0.16 245)', shark3:'oklch(0.78 0.18 75)',
  shark4:'oklch(0.62 0.22 15)', shark5:'oklch(0.82 0.10 220)', shark6:'oklch(0.72 0.24 300)',
}

const FORMATS: FormatKey[] = ['MTT', 'CASH GAME', 'EXPRESSO']
const COUNTRIES = ['FR','BE','DE','ES','IT','GB','PT','US','BR','CA']

const DEFAULT_CARD: CardData = {
  pseudo: 'YOU', country: 'FR', rating: 85, role: 'student',
  avatar: 'shark3', format: 'MTT', abi: 100, volume: '30K',
  roi: 18, gto: 84, streak: 14, trophies: 27,
  coachRating: 4.8, coachReach: '500', coachStudents: 120,
}

const labelStyle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.2em', fontWeight: 700,
  color: 'rgba(240,244,255,0.28)',
  fontFamily: 'var(--font-dm-mono,monospace)',
  marginBottom: 6, display: 'block',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#f0f4ff',
  fontSize: 13,
  fontFamily: 'var(--font-dm-mono,monospace)',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function CoachesSpotlight() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [card, setCard] = useState<CardData>(DEFAULT_CARD)

  useGSAP(() => {
    gsap.from('.podium-side', {
      opacity: 0, x: (i) => i === 0 ? -40 : 40,
      duration: 0.9, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: containerRef.current, start: 'top 70%' },
    })
    gsap.from('.podium-center', {
      opacity: 0, scale: 0.88, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: containerRef.current, start: 'top 70%' },
    })
    gsap.from('.podium-left-col', {
      opacity: 0, x: -30, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: containerRef.current, start: 'top 75%' },
    })
  }, { scope: containerRef })

  const accent = AVATAR_ACCENTS[card.avatar]

  return (
    <section
      ref={containerRef}
      style={{
        background: '#04040a',
        padding: 'clamp(60px,8vh,100px) clamp(20px,5vw,60px)',
        overflow: 'hidden',
      }}
    >
      {/* Title — centré au-dessus */}
      <div className="podium-left-col" style={{ textAlign: 'center', marginBottom: 56, maxWidth: 1280, margin: '0 auto 56px' }}>
        <div style={{
          fontSize: 10, letterSpacing: '0.26em', fontWeight: 700,
          color: '#06b6d4', marginBottom: 16,
          fontFamily: 'var(--font-space,sans-serif)',
        }}>TON PROFIL</div>
        <h2 style={{
          fontFamily: 'var(--font-syne,sans-serif)',
          fontSize: 'clamp(36px,5vw,72px)',
          fontWeight: 800, color: '#f0f4ff',
          letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 16,
        }}>
          Deviens le joueur<br />que tu rêves d'être
        </h2>
        <p style={{
          fontSize: 15, color: 'rgba(240,244,255,0.35)',
          fontFamily: 'var(--font-space,sans-serif)',
          lineHeight: 1.65, maxWidth: 440, margin: '0 auto',
        }}>
          Crée ta carte et visualise ton profil avant même de commencer.
        </p>
      </div>

      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(40px,5vw,72px)',
        alignItems: 'center',
      }}>

        {/* ── Left: controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Pseudo + Pays */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div>
              <label style={labelStyle}>PSEUDO</label>
              <input
                style={inputStyle}
                value={card.pseudo}
                maxLength={12}
                onChange={e => setCard(c => ({ ...c, pseudo: e.target.value.toUpperCase() }))}
                placeholder="TON PSEUDO"
              />
            </div>
            <div>
              <label style={labelStyle}>PAYS</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer', width: 80 }}
                value={card.country}
                onChange={e => setCard(c => ({ ...c, country: e.target.value }))}
              >
                {COUNTRIES.map(co => <option key={co} value={co}>{co}</option>)}
              </select>
            </div>
          </div>

          {/* Stats — adaptées au rôle */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {(card.role === 'coach'
              ? [
                  { key: 'abi',           label: 'ABI ($)',    type: 'number', step: 1,   min: 1,   max: undefined },
                  { key: 'volume',        label: 'VOLUME',     type: 'text',   step: undefined },
                  { key: 'roi',           label: 'ROI (%)',    type: 'number', step: 1                             },
                  { key: 'coachRating',   label: 'NOTE /5',    type: 'number', step: 0.1, min: 0,   max: 5        },
                  { key: 'coachReach',    label: 'PORTÉE',     type: 'text',   step: undefined },
                  { key: 'coachStudents', label: 'ÉTUDIANTS',  type: 'number', step: 1,   min: 0                  },
                ]
              : [
                  { key: 'abi',    label: 'ABI ($)',  type: 'number', step: 1 },
                  { key: 'volume', label: 'VOLUME',   type: 'text'           },
                  { key: 'roi',    label: 'ROI (%)',  type: 'number', step: 1 },
                  { key: 'gto',    label: 'SCORE GTO',type: 'number', step: 1, min: 0, max: 100 },
                  { key: 'streak', label: 'SÉRIE',    type: 'number', step: 1, min: 0           },
                  { key: 'trophies',label:'TROPHÉES', type: 'number', step: 1, min: 0, max: 50  },
                ]
            ).map(({ key, label, type, step, min, max }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input
                  style={inputStyle}
                  type={type}
                  step={step}
                  min={min}
                  max={max}
                  value={(card as unknown as Record<string, string | number>)[key]}
                  onChange={e => {
                    let val: string | number = e.target.value
                    if (type === 'number') {
                      val = Number(e.target.value)
                      if (max !== undefined && val > max) val = max
                      if (min !== undefined && val < min) val = min
                    }
                    setCard(c => ({ ...c, [key]: val }))
                  }}
                />
              </div>
            ))}
          </div>

          {/* Format + Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>FORMAT</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {FORMATS.map(fmt => {
                  const isActive = card.format === fmt
                  return (
                    <button key={fmt} onClick={() => setCard(c => ({ ...c, format: fmt }))} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: isActive ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      background: isActive ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                      color: isActive ? '#06b6d4' : 'rgba(240,244,255,0.28)',
                      fontFamily: 'var(--font-dm-mono,monospace)',
                      transition: 'all 0.16s', whiteSpace: 'nowrap',
                      boxShadow: isActive ? '0 0 10px rgba(6,182,212,0.15)' : 'none',
                    }}>{fmt}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>RÔLE</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['student', 'coach'] as const).map(role => {
                  const isActive = card.role === role
                  return (
                    <button key={role} onClick={() => setCard(c => ({ ...c, role }))} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: isActive ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      background: isActive ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                      color: isActive ? '#a855f7' : 'rgba(240,244,255,0.28)',
                      fontFamily: 'var(--font-dm-mono,monospace)',
                      transition: 'all 0.16s', textTransform: 'uppercase',
                      boxShadow: isActive ? '0 0 10px rgba(124,58,237,0.15)' : 'none',
                    }}>{role === 'student' ? 'ÉLÈVE' : 'COACH'}</button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Avatar grid: fish row + shark row */}
          <div>
            <label style={labelStyle}>AVATAR</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[FISH, SHARKS].map((row, rowIdx) => (
                <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
                  {row.map(av => {
                    const isActive = card.avatar === av
                    const avAccent = AVATAR_ACCENTS[av]
                    return (
                      <button
                        key={av}
                        onClick={() => setCard(c => ({
                          ...c,
                          avatar: av,
                          role: av.startsWith('shark') ? 'coach' : 'student',
                        }))}
                        style={{
                          height: 42, borderRadius: 8,
                          border: isActive
                            ? `1px solid color-mix(in oklab, ${avAccent} 70%, transparent)`
                            : '1px solid rgba(255,255,255,0.08)',
                          background: isActive
                            ? `color-mix(in oklab, ${avAccent} 14%, transparent)`
                            : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                          transition: 'all 0.16s',
                          boxShadow: isActive ? `0 0 12px color-mix(in oklab, ${avAccent} 20%, transparent)` : 'none',
                        }}
                      >
                        <span style={{ fontSize: 12, lineHeight: 1 }}>{av.startsWith('fish') ? '🐟' : '🦈'}</span>
                        <span style={{
                          fontSize: 7, fontWeight: 800,
                          color: isActive ? avAccent : 'rgba(240,244,255,0.25)',
                          fontFamily: 'var(--font-dm-mono,monospace)',
                        }}>{AVATAR_LABELS[av]}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Right: podium ── */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 'clamp(8px,1.5vw,16px)',
        }}>
          <div className="podium-side" style={{
            transform: 'rotate(-7deg) translateY(36px) scale(0.72)',
            transformOrigin: 'bottom center',
            opacity: 0.35, filter: 'blur(1.5px)', flexShrink: 0, zoom: 0.75,
          }}>
            <PlayerCard data={SIDE_CARDS[0].card} fx={SIDE_CARDS[0].fx} />
          </div>

          <div className="podium-center" style={{
            flexShrink: 0, position: 'relative', zIndex: 2, zoom: 0.75,
            filter: `drop-shadow(0 0 50px color-mix(in oklab, ${accent} 28%, transparent))`,
          }}>
            <div style={{
              position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)',
              whiteSpace: 'nowrap', zIndex: 3,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
              color: accent, opacity: 0.9,
              fontFamily: 'var(--font-dm-mono,monospace)',
            }}>✦ TON RANG</div>
            <PlayerCard data={card} fx={{ tilt: 14, noise: 0.35, iris: 0.85 }} />
          </div>

          <div className="podium-side" style={{
            transform: 'rotate(7deg) translateY(36px) scale(0.72)',
            transformOrigin: 'bottom center',
            opacity: 0.35, filter: 'blur(1.5px)', flexShrink: 0, zoom: 0.75,
          }}>
            <PlayerCard data={SIDE_CARDS[1].card} fx={SIDE_CARDS[1].fx} />
          </div>
        </div>

      </div>
    </section>
  )
}
