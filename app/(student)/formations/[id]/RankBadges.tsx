'use client'
import { Award } from 'lucide-react'

/* ─── Rank SVG components (inlined from ranks.jsx) ──────────────────────── */
export function RankFish1({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rf1-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#aab8c5" /><stop offset="100%" stopColor="#6c7a89" />
        </linearGradient>
        <linearGradient id="rf1-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cfd8e0" /><stop offset="100%" stopColor="#94a2b0" />
        </linearGradient>
      </defs>
      <path d="M40 70 L18 50 L22 70 L18 92 Z" fill="#6c7a89" opacity="0.85" />
      <path d="M40 70 Q70 38 122 50 Q160 60 168 70 Q160 82 122 92 Q70 104 40 70 Z" fill="url(#rf1-body)" />
      <path d="M58 78 Q90 96 130 88 Q150 84 158 76 Q140 92 110 96 Q80 98 58 78 Z" fill="url(#rf1-belly)" opacity="0.7" />
      <path d="M88 88 L98 104 L108 90 Z" fill="#7e8c9b" />
      <path d="M132 60 Q128 70 132 82" stroke="#4d5862" strokeWidth="1.2" fill="none" />
      <circle cx="150" cy="68" r="4.5" fill="#1a2028" />
      <circle cx="151.2" cy="66.6" r="1.4" fill="#e6ecf2" />
      <path d="M166 72 Q170 74 166 76" stroke="#4d5862" strokeWidth="1.2" fill="none" />
      <circle cx="180" cy="58" r="2" fill="#aab8c5" opacity="0.5" />
      <circle cx="186" cy="50" r="1.2" fill="#aab8c5" opacity="0.4" />
    </svg>
  )
}

export function RankFish2({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rf2-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b86b8" /><stop offset="55%" stopColor="#2f5d8e" /><stop offset="100%" stopColor="#1d3f64" />
        </linearGradient>
        <linearGradient id="rf2-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7da4cf" /><stop offset="100%" stopColor="#3e6a98" />
        </linearGradient>
      </defs>
      <path d="M30 70 L8 44 L24 64 L8 96 L30 72 Z" fill="#244c77" />
      <path d="M30 70 L14 50 L26 66 L14 90 L30 72 Z" fill="#3a6a9e" opacity="0.7" />
      <path d="M30 70 Q60 30 130 44 Q170 54 180 70 Q170 86 130 96 Q60 110 30 70 Z" fill="url(#rf2-body)" />
      <path d="M48 84 Q90 102 140 92 Q160 88 172 78 Q150 100 110 102 Q72 102 48 84 Z" fill="url(#rf2-belly)" opacity="0.75" />
      <path d="M82 92 L92 110 L106 94 Z" fill="#1d3f64" />
      <path d="M110 78 Q120 96 134 88 Q124 82 110 78 Z" fill="#244c77" />
      <path d="M50 72 Q100 70 168 72" stroke="#7da4cf" strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M138 56 Q134 70 138 86" stroke="#0f2540" strokeWidth="1.4" fill="none" />
      <circle cx="158" cy="66" r="5.5" fill="#0a1422" />
      <circle cx="158" cy="66" r="3" fill="#5dc8ff" />
      <circle cx="158" cy="66" r="1.6" fill="#0a1422" />
      <circle cx="159.2" cy="64.4" r="0.9" fill="#ffffff" />
      <path d="M174 70 Q179 74 174 78" stroke="#0f2540" strokeWidth="1.4" fill="none" />
    </svg>
  )
}

export function RankFish3({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rf3-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3fd2ff" /><stop offset="50%" stopColor="#1a7fb8" /><stop offset="100%" stopColor="#0c2f4a" />
        </linearGradient>
        <linearGradient id="rf3-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7fe4ff" /><stop offset="100%" stopColor="#1a7fb8" />
        </linearGradient>
        <radialGradient id="rf3-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3fd2ff" stopOpacity="0.6" /><stop offset="100%" stopColor="#3fd2ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="95" ry="40" fill="url(#rf3-glow)" opacity="0.5" />
      <path d="M28 70 L4 38 L18 56 L2 72 L18 84 L4 102 Z" fill="#0c2f4a" />
      <path d="M28 70 L10 46 L22 60 L10 86 L28 72 Z" fill="#1a7fb8" opacity="0.8" />
      <path d="M28 70 Q56 24 132 38 Q176 48 188 70 Q176 90 132 100 Q56 116 28 70 Z" fill="url(#rf3-body)" />
      <path d="M44 86 Q92 106 144 96 Q170 90 184 78 Q160 106 116 108 Q70 108 44 86 Z" fill="url(#rf3-belly)" opacity="0.6" />
      <path d="M78 96 L90 116 L112 98 Z" fill="#0c2f4a" />
      <path d="M118 80 Q132 102 150 92 Q138 84 118 80 Z" fill="#0c2f4a" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${70+i*16} 64 Q${78+i*16} 70 ${70+i*16} 76`} stroke="#7fe4ff" strokeWidth="0.6" fill="none" opacity="0.45" />
      ))}
      <path d="M142 50 L148 70 L142 90" stroke="#06121e" strokeWidth="1.6" fill="none" />
      <circle cx="166" cy="64" r="6.5" fill="#06121e" />
      <circle cx="166" cy="64" r="4" fill="#3fd2ff" />
      <path d="M163.5 62.5 Q166 60 168.5 62.5" stroke="#06121e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="166" cy="65" r="1.4" fill="#06121e" />
      <circle cx="167.4" cy="62.5" r="0.8" fill="#ffffff" />
      <path d="M180 68 L188 70 L180 74" stroke="#06121e" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    </svg>
  )
}

export function RankShark1({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rs1-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a4452" /><stop offset="55%" stopColor="#1f2731" /><stop offset="100%" stopColor="#0d1219" />
        </linearGradient>
        <linearGradient id="rs1-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6675" /><stop offset="100%" stopColor="#2a323d" />
        </linearGradient>
      </defs>
      <path d="M22 70 L4 38 L20 60 L8 70 L20 80 L4 102 Z" fill="#0d1219" />
      <path d="M22 70 L10 46 L20 64 L20 76 L10 94 Z" fill="#2a323d" opacity="0.7" />
      <path d="M22 70 Q50 42 124 48 Q170 54 188 70 Q170 86 124 92 Q50 98 22 70 Z" fill="url(#rs1-body)" />
      <path d="M40 82 Q90 96 150 88 Q174 84 184 76 L184 78 Q160 96 116 98 Q66 98 40 82 Z" fill="url(#rs1-belly)" />
      <path d="M44 80 Q92 92 152 84 Q172 80 182 74" stroke="#e8eef5" strokeWidth="0.6" fill="none" opacity="0.4" />
      <path d="M76 50 L94 18 L112 50 Z" fill="#0d1219" />
      <path d="M94 18 L112 50 L102 38 Z" fill="#3a4452" opacity="0.6" />
      <path d="M132 54 L142 42 L150 56 Z" fill="#0d1219" />
      <path d="M88 82 L72 108 L108 92 Z" fill="#0d1219" />
      <path d="M88 82 L78 100 L102 90 Z" fill="#1f2731" opacity="0.8" />
      <path d="M124 90 L132 104 L144 92 Z" fill="#0d1219" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${136+i*4} 60 Q${134+i*4} 70 ${136+i*4} 80`} stroke="#06090e" strokeWidth="1.1" fill="none" />
      ))}
      <circle cx="166" cy="66" r="3" fill="#06090e" />
      <circle cx="166" cy="66" r="1.8" fill="#e8eef5" />
      <circle cx="166.4" cy="65.4" r="0.7" fill="#06090e" />
      <path d="M178 72 L188 74 L184 78 L176 76" fill="#06090e" />
      <path d="M180 74 L181 76 L182.5 74 L183.5 76 L184.5 74" stroke="#e8eef5" strokeWidth="0.5" fill="none" />
      <circle cx="180" cy="66" r="0.8" fill="#06090e" />
    </svg>
  )
}

export function RankShark2({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rs2-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a5260" /><stop offset="50%" stopColor="#242c38" /><stop offset="100%" stopColor="#0a0e15" />
        </linearGradient>
        <linearGradient id="rs2-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6a7585" /><stop offset="100%" stopColor="#2a323d" />
        </linearGradient>
      </defs>
      <path d="M20 70 L2 32 L18 56 L4 70 L18 84 L2 108 Z" fill="#0a0e15" />
      <path d="M20 70 L8 42 L18 60 L18 80 L8 98 Z" fill="#242c38" opacity="0.8" />
      <path d="M20 70 Q44 36 124 42 Q174 50 192 70 Q174 90 124 98 Q44 104 20 70 Z" fill="url(#rs2-body)" />
      <path d="M36 84 Q88 100 148 92 Q176 88 188 78 Q162 100 116 102 Q60 102 36 84 Z" fill="url(#rs2-belly)" />
      <path d="M70 56 L82 64" stroke="#8c98a8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M76 50 L86 62" stroke="#8c98a8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M82 52 L92 60" stroke="#8c98a8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M110 84 L122 78" stroke="#8c98a8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M114 88 L124 82" stroke="#8c98a8" strokeWidth="1.0" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M74 48 L92 14 L96 22 L100 16 L114 50 Z" fill="#0a0e15" />
      <path d="M92 14 L100 16 L96 22 Z" fill="#242c38" />
      <path d="M96 22 L114 50 L104 36 Z" fill="#4a5260" opacity="0.5" />
      <path d="M134 54 L144 40 L152 56 Z" fill="#0a0e15" />
      <path d="M88 84 L70 110 L82 102 L78 112 L106 94 Z" fill="#0a0e15" />
      <path d="M88 84 L78 100 L102 92 Z" fill="#242c38" opacity="0.8" />
      <path d="M124 92 L132 108 L146 94 Z" fill="#0a0e15" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${136+i*4} 58 Q${134+i*4} 70 ${136+i*4} 82`} stroke="#04070b" strokeWidth="1.2" fill="none" />
      ))}
      <path d="M158 56 L174 76" stroke="#8c98a8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.85" />
      <circle cx="166" cy="66" r="3.4" fill="#04070b" />
      <circle cx="166" cy="66" r="2" fill="#e8eef5" />
      <circle cx="166.5" cy="65.5" r="0.8" fill="#04070b" />
      <path d="M176 72 L192 72 L190 80 L174 78 Z" fill="#04070b" />
      <path d="M178 73 L179 76 L181 73 L182.5 76 L184 73 L185.5 76 L187 73 L188.5 76" stroke="#e8eef5" strokeWidth="0.55" fill="none" />
      <path d="M178 78 L179.5 76 L181 78 L182.5 76 L184 78" stroke="#e8eef5" strokeWidth="0.45" fill="none" opacity="0.7" />
      <circle cx="180" cy="64" r="0.9" fill="#04070b" />
    </svg>
  )
}

export function RankShark3({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rs3-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6271" /><stop offset="50%" stopColor="#262e3a" /><stop offset="100%" stopColor="#06090e" />
        </linearGradient>
        <linearGradient id="rs3-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8893a4" /><stop offset="100%" stopColor="#2c343f" />
        </linearGradient>
        <linearGradient id="rs3-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff1b5" /><stop offset="50%" stopColor="#e9c267" /><stop offset="100%" stopColor="#a87a1f" />
        </linearGradient>
        <radialGradient id="rs3-eyeglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd86b" stopOpacity="1" />
          <stop offset="60%" stopColor="#e9a52a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#e9a52a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rs3-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#e9c267" stopOpacity="0.25" /><stop offset="100%" stopColor="#e9c267" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="98" ry="48" fill="url(#rs3-aura)" />
      <path d="M16 70 L0 26 L16 54 L2 70 L16 86 L0 114 Z" fill="#06090e" />
      <path d="M16 70 L4 36 L16 58 L16 82 L4 104 Z" fill="#262e3a" opacity="0.85" />
      <path d="M0 26 L16 54" stroke="url(#rs3-gold)" strokeWidth="0.8" fill="none" opacity="0.9" />
      <path d="M0 114 L16 86" stroke="url(#rs3-gold)" strokeWidth="0.8" fill="none" opacity="0.9" />
      <path d="M16 70 Q40 32 124 40 Q178 48 196 70 Q178 92 124 100 Q40 108 16 70 Z" fill="url(#rs3-body)" />
      <path d="M32 86 Q86 102 150 94 Q180 90 192 80 Q166 102 116 104 Q56 104 32 86 Z" fill="url(#rs3-belly)" />
      <path d="M30 72 Q100 64 188 70" stroke="url(#rs3-gold)" strokeWidth="0.7" fill="none" opacity="0.8" />
      <path d="M70 46 L92 8 L116 50 Z" fill="#06090e" />
      <path d="M92 8 L116 50 L106 36 Z" fill="#262e3a" />
      <path d="M70 46 L92 8 L116 50" stroke="url(#rs3-gold)" strokeWidth="1.2" fill="none" />
      <path d="M134 52 L146 36 L156 56 Z" fill="#06090e" />
      <path d="M134 52 L146 36 L156 56" stroke="url(#rs3-gold)" strokeWidth="0.7" fill="none" opacity="0.85" />
      <path d="M86 84 L62 116 L108 96 Z" fill="#06090e" />
      <path d="M86 84 L74 104 L104 94 Z" fill="#262e3a" opacity="0.85" />
      <path d="M86 84 L62 116" stroke="url(#rs3-gold)" strokeWidth="1" fill="none" />
      <path d="M126 96 L132 112 L150 96 Z" fill="#06090e" />
      <path d="M76 56 L86 62" stroke="#a8b3c2" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M82 50 L90 60" stroke="#a8b3c2" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${134+i*4.5} 56 Q${132+i*4.5} 70 ${134+i*4.5} 84`} stroke="#02050a" strokeWidth="1.3" fill="none" />
      ))}
      <circle cx="168" cy="64" r="9" fill="url(#rs3-eyeglow)" />
      <circle cx="168" cy="64" r="4.2" fill="#02050a" />
      <circle cx="168" cy="64" r="3" fill="#ffd86b" />
      <circle cx="168" cy="64" r="1.6" fill="#02050a" />
      <circle cx="168.6" cy="63.2" r="0.7" fill="#fff7d8" />
      <path d="M174 72 L194 72 L192 82 L172 78 Z" fill="#02050a" />
      <path d="M176 73 L177 77 L179 73 L180.5 77 L182 73 L183.5 77 L185 73 L186.5 77 L188 73 L189.5 77 L191 73"
        stroke="#f3f6fa" strokeWidth="0.6" fill="none" />
      <path d="M176 78 L177.5 76 L179 78 L180.5 76 L182 78 L183.5 76 L185 78 L186.5 76 L188 78"
        stroke="#f3f6fa" strokeWidth="0.5" fill="none" opacity="0.8" />
      <circle cx="182" cy="62" r="0.9" fill="#02050a" />
      <circle cx="92" cy="6" r="1.4" fill="url(#rs3-gold)" />
      <circle cx="92" cy="6" r="3" fill="url(#rs3-gold)" opacity="0.25" />
    </svg>
  )
}

/* ─── Coach tier definitions ─────────────────────────────────────────────── */
export const COACH_TIERS = {
  fish1:  { label: 'Beginner',    sub: 'FISH · I',     tier: 'STUDENT', accent: '#94a8be', glow: 'rgba(148,168,190,0.18)' },
  fish2:  { label: 'Grinder',     sub: 'FISH · II',    tier: 'STUDENT', accent: '#5dc8ff', glow: 'rgba(93,200,255,0.22)'  },
  fish3:  { label: 'Regular',     sub: 'FISH · III',   tier: 'STUDENT', accent: '#3fd2ff', glow: 'rgba(63,210,255,0.30)'  },
  shark1: { label: 'New Coach',   sub: 'SHARK · I',    tier: 'COACH',   accent: '#e8eef5', glow: 'rgba(232,238,245,0.18)' },
  shark2: { label: 'Veteran',     sub: 'SHARK · II',   tier: 'COACH',   accent: '#cdd6e2', glow: 'rgba(205,214,226,0.22)' },
  shark3: { label: 'Apex Master', sub: 'SHARK · III',  tier: 'COACH',   accent: '#ffd86b', glow: 'rgba(255,216,107,0.28)' },
} as const
export type CoachTierKey = keyof typeof COACH_TIERS

export function getCoachTierKey(avgRating: number | null, isSuperCoach: boolean): CoachTierKey {
  if (isSuperCoach || (avgRating !== null && avgRating >= 4.8)) return 'shark3'
  if (avgRating === null)   return 'fish1'
  if (avgRating >= 4.5)     return 'shark2'
  if (avgRating >= 4.0)     return 'shark1'
  if (avgRating >= 3.5)     return 'fish3'
  if (avgRating >= 3.0)     return 'fish2'
  return 'fish1'
}

export const RANK_SVG_MAP: Record<CoachTierKey, (size: number) => React.ReactElement> = {
  fish1:  size => <RankFish1  size={size} />,
  fish2:  size => <RankFish2  size={size} />,
  fish3:  size => <RankFish3  size={size} />,
  shark1: size => <RankShark1 size={size} />,
  shark2: size => <RankShark2 size={size} />,
  shark3: size => <RankShark3 size={size} />,
}

/* ─── Coach Card (ProfileCard style) ────────────────────────────────────── */
export function CoachIridescentCard({ coach, avgRating, reviewCount, isSuperCoach }: {
  coach: any; avgRating: number | null; reviewCount: number; isSuperCoach: boolean; accentColor: string
}) {
  const tierKey = getCoachTierKey(avgRating, isSuperCoach)
  const tier    = COACH_TIERS[tierKey]

  const yearsOnPlatform = coach.created_at
    ? Math.max(0, new Date().getFullYear() - new Date(coach.created_at).getFullYear())
    : null

  return (
    <div style={{
      width: 280,
      background: 'linear-gradient(180deg, #11151c 0%, #0a0d12 100%)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 18,
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e8eef5',
      flexShrink: 0,
      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
    }}>
      {/* ── Hero ── */}
      <div style={{ height: 160, position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${tier.glow} 0%, transparent 60%), repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 24px)`,
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {RANK_SVG_MAP[tierKey](200)}
        </div>
        <div style={{
          position: 'absolute', top: 12, left: 12,
          fontSize: 9, letterSpacing: '0.18em', color: tier.accent, fontWeight: 600,
          padding: '4px 8px', borderRadius: 4,
          background: 'rgba(0,0,0,0.4)', border: `1px solid ${tier.accent}33`,
          backdropFilter: 'blur(4px)',
        }}>
          {tier.tier}
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, letterSpacing: '0.18em', color: 'rgba(232,238,245,0.6)', fontWeight: 500,
          padding: '4px 8px', borderRadius: 4,
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(4px)',
        }}>
          {tier.sub}
        </div>
        {isSuperCoach && (
          <div style={{
            position: 'absolute', bottom: 10, right: 12,
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: '#ffd86b',
            padding: '4px 8px', borderRadius: 4,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,216,107,0.3)',
          }}>
            <Award size={9} />
            SUPER COACH
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#e8eef5', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {coach.username}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,238,245,0.45)', fontFamily: 'monospace', flexShrink: 0 }}>
            @{coach.username?.toLowerCase()}
          </div>
        </div>
        <div style={{ fontSize: 10, color: tier.accent, letterSpacing: '0.04em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: tier.accent, boxShadow: `0 0 6px ${tier.accent}`, flexShrink: 0, display: 'inline-block' }} />
          {isSuperCoach ? `Super Coach · ${tier.label}` : tier.label}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <div style={{ background: '#0d1118', padding: '9px 10px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.16em', color: 'rgba(232,238,245,0.4)', fontWeight: 500, marginBottom: 3 }}>AVIS</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#e8eef5' }}>{reviewCount}</div>
          </div>
          <div style={{ background: '#0d1118', padding: '9px 10px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.16em', color: 'rgba(232,238,245,0.4)', fontWeight: 500, marginBottom: 3 }}>NOTE</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: avgRating ? '#4ade80' : 'rgba(232,238,245,0.55)' }}>
              {avgRating ? `${avgRating.toFixed(1)}★` : '—'}
            </div>
          </div>
          <div style={{ background: '#0d1118', padding: '9px 10px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.16em', color: 'rgba(232,238,245,0.4)', fontWeight: 500, marginBottom: 3 }}>ANS</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#e8eef5' }}>
              {yearsOnPlatform !== null ? (yearsOnPlatform || '<1') : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
