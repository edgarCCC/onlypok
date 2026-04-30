'use client'
import { useEffect, useState } from 'react'

const CREAM = '#E8E4DC'
const SILVER = '#8A8A8A'

type Props = {
  type: string
  title: string
  onDone: () => void
}

export default function PublishOverlay({ type, title, onDone }: Props) {
  const [phase, setPhase] = useState<'loading'|'success'>('loading')

  useEffect(() => {
    const t = setTimeout(() => setPhase('success'), 2200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (phase === 'success') {
      const t = setTimeout(onDone, 2800)
      return () => clearTimeout(t)
    }
  }, [phase, onDone])

  const labels: Record<string, string> = { formation: 'formation', video: 'vidéo', coaching: 'offre de coaching' }
  const label = labels[type] ?? 'contenu'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(7,9,14,0.92)',
      backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 40,
      animation: 'fadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes blob1 { 0%,100% { border-radius: 60% 40% 70% 30% / 50% 60% 40% 70%; transform: scale(1) rotate(0deg); } 33% { border-radius: 40% 70% 30% 60% / 70% 30% 60% 40%; transform: scale(1.05) rotate(120deg); } 66% { border-radius: 70% 30% 50% 50% / 30% 60% 70% 40%; transform: scale(0.97) rotate(240deg); } }
        @keyframes blob2 { 0%,100% { border-radius: 40% 70% 60% 30% / 60% 40% 70% 50%; transform: scale(1) rotate(0deg); } 33% { border-radius: 70% 30% 40% 60% / 40% 70% 50% 60%; transform: scale(1.08) rotate(-120deg); } 66% { border-radius: 30% 60% 70% 40% / 70% 50% 30% 60%; transform: scale(0.95) rotate(-240deg); } }
        @keyframes blob3 { 0%,100% { border-radius: 50% 60% 40% 70% / 40% 50% 70% 60%; transform: scale(1) rotate(0deg); } 50% { border-radius: 70% 40% 60% 30% / 60% 70% 30% 50%; transform: scale(1.1) rotate(180deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes checkIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes successGlow { 0%,100% { box-shadow: 0 0 30px rgba(16,185,129,0.3); } 50% { box-shadow: 0 0 60px rgba(16,185,129,0.6); } }
      `}</style>

      {phase === 'loading' ? (
        <>
          {/* Blobs organiques */}
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <div style={{ position: 'absolute', width: 140, height: 140, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(232,228,220,0.06)', borderRadius: '60% 40% 70% 30% / 50% 60% 40% 70%', animation: 'blob1 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', width: 100, height: 100, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(232,228,220,0.1)', borderRadius: '40% 70% 60% 30% / 60% 40% 70% 50%', animation: 'blob2 2.5s ease-in-out infinite 0.3s' }} />
            <div style={{ position: 'absolute', width: 60, height: 60, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: CREAM, opacity: 0.9, borderRadius: '50% 60% 40% 70% / 40% 50% 70% 60%', animation: 'blob3 2s ease-in-out infinite 0.6s' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: CREAM, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }}>Publication en cours…</p>
            <p style={{ fontSize: 13, color: SILVER }}>Mise en ligne de votre {label}</p>
          </div>
        </>
      ) : (
        <>
          {/* Succès */}
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', border: '2px solid #06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'checkIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275), successGlow 2s ease-in-out infinite 0.4s' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M8 20L16 28L32 12" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 40, strokeDashoffset: 0, animation: 'none' }} />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: CREAM, marginBottom: 10, letterSpacing: '-0.3px' }}>
              Félicitations !
            </p>
            <p style={{ fontSize: 15, color: SILVER, marginBottom: 6 }}>
              Votre {label} <span style={{ color: CREAM, fontWeight: 600 }}>"{title}"</span>
            </p>
            <p style={{ fontSize: 15, color: '#06b6d4', fontWeight: 600 }}>est maintenant en ligne.</p>
          </div>
        </>
      )}
    </div>
  )
}
