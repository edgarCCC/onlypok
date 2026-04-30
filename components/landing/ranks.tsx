// Rank SVG illustrations — Fish I-III (students) & Shark I-III (coaches)
// IDs prefixed with "lp-" to avoid conflicts with other SVGs on the page.

export function RankFish1({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-f1-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#aab8c5" />
          <stop offset="100%" stopColor="#6c7a89" />
        </linearGradient>
        <linearGradient id="lp-f1-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cfd8e0" />
          <stop offset="100%" stopColor="#94a2b0" />
        </linearGradient>
      </defs>
      <path d="M40 70 L18 50 L22 70 L18 92 Z" fill="#6c7a89" opacity="0.85" />
      <path d="M40 70 Q70 38 122 50 Q160 60 168 70 Q160 82 122 92 Q70 104 40 70 Z" fill="url(#lp-f1-body)" />
      <path d="M58 78 Q90 96 130 88 Q150 84 158 76 Q140 92 110 96 Q80 98 58 78 Z" fill="url(#lp-f1-belly)" opacity="0.7" />
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
        <linearGradient id="lp-f2-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b86b8" />
          <stop offset="55%" stopColor="#2f5d8e" />
          <stop offset="100%" stopColor="#1d3f64" />
        </linearGradient>
        <linearGradient id="lp-f2-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7da4cf" />
          <stop offset="100%" stopColor="#3e6a98" />
        </linearGradient>
      </defs>
      <path d="M30 70 L8 44 L24 64 L8 96 L30 72 Z" fill="#244c77" />
      <path d="M30 70 L14 50 L26 66 L14 90 L30 72 Z" fill="#3a6a9e" opacity="0.7" />
      <path d="M30 70 Q60 30 130 44 Q170 54 180 70 Q170 86 130 96 Q60 110 30 70 Z" fill="url(#lp-f2-body)" />
      <path d="M48 84 Q90 102 140 92 Q160 88 172 78 Q150 100 110 102 Q72 102 48 84 Z" fill="url(#lp-f2-belly)" opacity="0.75" />
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
        <linearGradient id="lp-f3-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3fd2ff" />
          <stop offset="50%" stopColor="#1a7fb8" />
          <stop offset="100%" stopColor="#0c2f4a" />
        </linearGradient>
        <linearGradient id="lp-f3-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7fe4ff" />
          <stop offset="100%" stopColor="#1a7fb8" />
        </linearGradient>
        <radialGradient id="lp-f3-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3fd2ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3fd2ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="95" ry="40" fill="url(#lp-f3-glow)" opacity="0.5" />
      <path d="M28 70 L4 38 L18 56 L2 72 L18 84 L4 102 Z" fill="#0c2f4a" />
      <path d="M28 70 L10 46 L22 60 L10 86 L28 72 Z" fill="#1a7fb8" opacity="0.8" />
      <path d="M28 70 Q56 24 132 38 Q176 48 188 70 Q176 90 132 100 Q56 116 28 70 Z" fill="url(#lp-f3-body)" />
      <path d="M44 86 Q92 106 144 96 Q170 90 184 78 Q160 106 116 108 Q70 108 44 86 Z" fill="url(#lp-f3-belly)" opacity="0.6" />
      <path d="M78 96 L90 116 L112 98 Z" fill="#0c2f4a" />
      <path d="M118 80 Q132 102 150 92 Q138 84 118 80 Z" fill="#0c2f4a" />
      {[0,1,2,3,4].map((i) => (
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
        <linearGradient id="lp-s1-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a4452" />
          <stop offset="55%" stopColor="#1f2731" />
          <stop offset="100%" stopColor="#0d1219" />
        </linearGradient>
        <linearGradient id="lp-s1-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6675" />
          <stop offset="100%" stopColor="#2a323d" />
        </linearGradient>
      </defs>
      <path d="M22 70 L4 38 L20 60 L8 70 L20 80 L4 102 Z" fill="#0d1219" />
      <path d="M22 70 L10 46 L20 64 L20 76 L10 94 Z" fill="#2a323d" opacity="0.7" />
      <path d="M22 70 Q50 42 124 48 Q170 54 188 70 Q170 86 124 92 Q50 98 22 70 Z" fill="url(#lp-s1-body)" />
      <path d="M40 82 Q90 96 150 88 Q174 84 184 76 L184 78 Q160 96 116 98 Q66 98 40 82 Z" fill="url(#lp-s1-belly)" />
      <path d="M44 80 Q92 92 152 84 Q172 80 182 74" stroke="#e8eef5" strokeWidth="0.6" fill="none" opacity="0.4" />
      <path d="M76 50 L94 18 L112 50 Z" fill="#0d1219" />
      <path d="M94 18 L112 50 L102 38 Z" fill="#3a4452" opacity="0.6" />
      <path d="M132 54 L142 42 L150 56 Z" fill="#0d1219" />
      <path d="M88 82 L72 108 L108 92 Z" fill="#0d1219" />
      <path d="M88 82 L78 100 L102 90 Z" fill="#1f2731" opacity="0.8" />
      <path d="M124 90 L132 104 L144 92 Z" fill="#0d1219" />
      {[0,1,2,3,4].map((i) => (
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
        <linearGradient id="lp-s2-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a5260" />
          <stop offset="50%" stopColor="#242c38" />
          <stop offset="100%" stopColor="#0a0e15" />
        </linearGradient>
        <linearGradient id="lp-s2-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6a7585" />
          <stop offset="100%" stopColor="#2a323d" />
        </linearGradient>
      </defs>
      <path d="M20 70 L2 32 L18 56 L4 70 L18 84 L2 108 Z" fill="#0a0e15" />
      <path d="M20 70 L8 42 L18 60 L18 80 L8 98 Z" fill="#242c38" opacity="0.8" />
      <path d="M20 70 Q44 36 124 42 Q174 50 192 70 Q174 90 124 98 Q44 104 20 70 Z" fill="url(#lp-s2-body)" />
      <path d="M36 84 Q88 100 148 92 Q176 88 188 78 Q162 100 116 102 Q60 102 36 84 Z" fill="url(#lp-s2-belly)" />
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
      {[0,1,2,3,4].map((i) => (
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
        <linearGradient id="lp-s3-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6271" />
          <stop offset="50%" stopColor="#262e3a" />
          <stop offset="100%" stopColor="#06090e" />
        </linearGradient>
        <linearGradient id="lp-s3-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8893a4" />
          <stop offset="100%" stopColor="#2c343f" />
        </linearGradient>
        <linearGradient id="lp-s3-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff1b5" />
          <stop offset="50%" stopColor="#e9c267" />
          <stop offset="100%" stopColor="#a87a1f" />
        </linearGradient>
        <radialGradient id="lp-s3-eyeglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd86b" stopOpacity="1" />
          <stop offset="60%" stopColor="#e9a52a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#e9a52a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lp-s3-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#e9c267" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e9c267" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="98" ry="48" fill="url(#lp-s3-aura)" />
      <path d="M16 70 L0 26 L16 54 L2 70 L16 86 L0 114 Z" fill="#06090e" />
      <path d="M16 70 L4 36 L16 58 L16 82 L4 104 Z" fill="#262e3a" opacity="0.85" />
      <path d="M0 26 L16 54" stroke="url(#lp-s3-gold)" strokeWidth="0.8" fill="none" opacity="0.9" />
      <path d="M0 114 L16 86" stroke="url(#lp-s3-gold)" strokeWidth="0.8" fill="none" opacity="0.9" />
      <path d="M16 70 Q40 32 124 40 Q178 48 196 70 Q178 92 124 100 Q40 108 16 70 Z" fill="url(#lp-s3-body)" />
      <path d="M32 86 Q86 102 150 94 Q180 90 192 80 Q166 102 116 104 Q56 104 32 86 Z" fill="url(#lp-s3-belly)" />
      <path d="M30 72 Q100 64 188 70" stroke="url(#lp-s3-gold)" strokeWidth="0.7" fill="none" opacity="0.8" />
      <path d="M70 46 L92 8 L116 50 Z" fill="#06090e" />
      <path d="M92 8 L116 50 L106 36 Z" fill="#262e3a" />
      <path d="M70 46 L92 8 L116 50" stroke="url(#lp-s3-gold)" strokeWidth="1.2" fill="none" />
      <path d="M134 52 L146 36 L156 56 Z" fill="#06090e" />
      <path d="M134 52 L146 36 L156 56" stroke="url(#lp-s3-gold)" strokeWidth="0.7" fill="none" opacity="0.85" />
      <path d="M86 84 L62 116 L108 96 Z" fill="#06090e" />
      <path d="M86 84 L74 104 L104 94 Z" fill="#262e3a" opacity="0.85" />
      <path d="M86 84 L62 116" stroke="url(#lp-s3-gold)" strokeWidth="1" fill="none" />
      <path d="M126 96 L132 112 L150 96 Z" fill="#06090e" />
      <path d="M76 56 L86 62" stroke="#a8b3c2" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M82 50 L90 60" stroke="#a8b3c2" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
      {[0,1,2,3,4].map((i) => (
        <path key={i} d={`M${134+i*4.5} 56 Q${132+i*4.5} 70 ${134+i*4.5} 84`} stroke="#02050a" strokeWidth="1.3" fill="none" />
      ))}
      <circle cx="168" cy="64" r="9" fill="url(#lp-s3-eyeglow)" />
      <circle cx="168" cy="64" r="4.2" fill="#02050a" />
      <circle cx="168" cy="64" r="3" fill="#ffd86b" />
      <circle cx="168" cy="64" r="1.6" fill="#02050a" />
      <circle cx="168.6" cy="63.2" r="0.7" fill="#fff7d8" />
      <path d="M174 72 L194 72 L192 82 L172 78 Z" fill="#02050a" />
      <path d="M176 73 L177 77 L179 73 L180.5 77 L182 73 L183.5 77 L185 73 L186.5 77 L188 73 L189.5 77 L191 73" stroke="#f3f6fa" strokeWidth="0.6" fill="none" />
      <path d="M176 78 L177.5 76 L179 78 L180.5 76 L182 78 L183.5 76 L185 78 L186.5 76 L188 78" stroke="#f3f6fa" strokeWidth="0.5" fill="none" opacity="0.8" />
      <circle cx="182" cy="62" r="0.9" fill="#02050a" />
      <circle cx="92" cy="6" r="1.4" fill="url(#lp-s3-gold)" />
      <circle cx="92" cy="6" r="3" fill="url(#lp-s3-gold)" opacity="0.25" />
    </svg>
  )
}

// ─── FISH IV-VI (advanced student tiers) ───────────────────────────────────

export function RankFish4({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-f4-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7af0ff" />
          <stop offset="40%" stopColor="#1a9fd6" />
          <stop offset="100%" stopColor="#082338" />
        </linearGradient>
        <linearGradient id="lp-f4-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#bff5ff" />
          <stop offset="100%" stopColor="#1a9fd6" />
        </linearGradient>
        <linearGradient id="lp-f4-electric" x1="0" x2="1">
          <stop offset="0%" stopColor="#7af0ff" />
          <stop offset="100%" stopColor="#a86bff" />
        </linearGradient>
        <radialGradient id="lp-f4-aura" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#7af0ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7af0ff" stopOpacity="0" />
        </radialGradient>
        <filter id="lp-f4-blur"><feGaussianBlur stdDeviation="1.2" /></filter>
      </defs>
      <ellipse cx="100" cy="70" rx="98" ry="46" fill="url(#lp-f4-aura)" />
      <path d="M14 30 L26 44 L20 50 L34 60" stroke="url(#lp-f4-electric)" strokeWidth="0.9" fill="none" opacity="0.7" filter="url(#lp-f4-blur)" />
      <path d="M186 28 L172 42 L180 50 L168 62" stroke="url(#lp-f4-electric)" strokeWidth="0.9" fill="none" opacity="0.7" filter="url(#lp-f4-blur)" />
      <path d="M28 70 L2 32 L18 58 L4 70 L18 82 L2 108 Z" fill="#082338" />
      <path d="M28 70 L8 40 L20 60 L20 80 L8 100 Z" fill="#1a9fd6" opacity="0.85" />
      <path d="M2 32 L18 58" stroke="#7af0ff" strokeWidth="0.7" opacity="0.9" />
      <path d="M2 108 L18 82" stroke="#7af0ff" strokeWidth="0.7" opacity="0.9" />
      <path d="M28 70 Q56 22 132 36 Q178 46 192 70 Q178 94 132 104 Q56 118 28 70 Z" fill="url(#lp-f4-body)" />
      <path d="M44 88 Q92 108 144 98 Q172 92 186 80 Q160 108 116 110 Q70 110 44 88 Z" fill="url(#lp-f4-belly)" opacity="0.6" />
      {[0,1,2,3,4,5].map((i) => (
        <path key={i} d={`M${56+i*14} 50 Q${64+i*14} 70 ${56+i*14} 90`} stroke="#bff5ff" strokeWidth="0.5" fill="none" opacity="0.35" />
      ))}
      <path d="M114 82 Q132 108 156 96 Q142 86 114 82 Z" fill="#082338" />
      <path d="M114 82 L156 96" stroke="#7af0ff" strokeWidth="0.6" opacity="0.7" />
      <path d="M82 100 L92 118 L108 100 Z" fill="#082338" />
      <path d="M142 50 L150 70 L142 90" stroke="#7af0ff" strokeWidth="1.6" fill="none" opacity="0.95" />
      <path d="M142 50 L150 70 L142 90" stroke="#7af0ff" strokeWidth="3" fill="none" opacity="0.3" filter="url(#lp-f4-blur)" />
      <circle cx="168" cy="62" r="8" fill="#7af0ff" opacity="0.25" filter="url(#lp-f4-blur)" />
      <circle cx="168" cy="62" r="5" fill="#020912" />
      <circle cx="168" cy="62" r="3.4" fill="#7af0ff" />
      <path d="M165 60 L171 60" stroke="#020912" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="168" cy="63.5" r="1.2" fill="#020912" />
      <circle cx="169.2" cy="60.5" r="0.8" fill="#ffffff" />
      <path d="M178 66 L194 70 L188 76 L182 72 L186 80 L176 76 Z" fill="#020912" />
      <path d="M180 70 L181 73 L183 70 L184.5 73 L186 70 L187.5 73" stroke="#bff5ff" strokeWidth="0.5" fill="none" />
      <circle cx="40" cy="20" r="1.2" fill="#7af0ff" opacity="0.8" />
      <circle cx="50" cy="14" r="0.8" fill="#7af0ff" opacity="0.6" />
      <circle cx="158" cy="20" r="1.2" fill="#a86bff" opacity="0.7" />
      <circle cx="172" cy="116" r="1" fill="#7af0ff" opacity="0.7" />
    </svg>
  )
}

export function RankFish5({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-f5-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3affb6" />
          <stop offset="45%" stopColor="#0c8c7a" />
          <stop offset="100%" stopColor="#03242a" />
        </linearGradient>
        <linearGradient id="lp-f5-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a8ffe2" />
          <stop offset="100%" stopColor="#0c8c7a" />
        </linearGradient>
        <linearGradient id="lp-f5-bolt" x1="0" x2="1">
          <stop offset="0%" stopColor="#e8fff0" />
          <stop offset="100%" stopColor="#3affb6" />
        </linearGradient>
        <radialGradient id="lp-f5-aura" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#3affb6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#3affb6" stopOpacity="0" />
        </radialGradient>
        <filter id="lp-f5-glow"><feGaussianBlur stdDeviation="1.4" /></filter>
      </defs>
      <ellipse cx="100" cy="70" rx="100" ry="50" fill="url(#lp-f5-aura)" />
      <path d="M30 36 L42 48 L34 52 L48 64" stroke="url(#lp-f5-bolt)" strokeWidth="1.4" fill="none" filter="url(#lp-f5-glow)" opacity="0.85" />
      <path d="M30 36 L42 48 L34 52 L48 64" stroke="#e8fff0" strokeWidth="0.7" fill="none" opacity="0.9" />
      <path d="M170 102 L160 92 L168 88 L154 78" stroke="url(#lp-f5-bolt)" strokeWidth="1.4" fill="none" filter="url(#lp-f5-glow)" opacity="0.85" />
      <path d="M170 102 L160 92 L168 88 L154 78" stroke="#e8fff0" strokeWidth="0.7" fill="none" opacity="0.9" />
      <path d="M26 70 L4 30 L18 58 L2 70 L18 82 L4 110 Z" fill="#03242a" />
      <path d="M26 70 L8 40 L20 60 L20 80 L8 100 Z" fill="#0c8c7a" opacity="0.85" />
      <path d="M4 30 L18 58 M4 110 L18 82" stroke="#3affb6" strokeWidth="0.8" opacity="0.95" />
      <path d="M26 70 Q54 20 134 34 Q180 44 194 70 Q180 96 134 106 Q54 120 26 70 Z" fill="url(#lp-f5-body)" />
      <path d="M42 88 Q90 110 144 100 Q172 94 188 80 Q160 110 116 112 Q68 112 42 88 Z" fill="url(#lp-f5-belly)" opacity="0.55" />
      <path d="M44 70 L60 70 L66 64 L72 76 L78 70 L96 70 L102 64 L108 76 L114 70 L188 70" stroke="#3affb6" strokeWidth="0.8" fill="none" opacity="0.85" />
      <path d="M44 70 L60 70 L66 64 L72 76 L78 70 L96 70 L102 64 L108 76 L114 70 L188 70" stroke="#3affb6" strokeWidth="2" fill="none" opacity="0.25" filter="url(#lp-f5-glow)" />
      <path d="M112 84 Q130 110 154 98 Q140 88 112 84 Z" fill="#03242a" />
      <path d="M112 84 L154 98" stroke="#3affb6" strokeWidth="0.7" opacity="0.85" />
      <path d="M82 102 L92 120 L110 102 Z" fill="#03242a" />
      {([[60,82,1],[78,86,0.8],[94,90,1],[110,90,0.9],[128,86,0.7],[148,82,0.8]] as [number,number,number][]).map(([x,y,r],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r*2.5} fill="#3affb6" opacity="0.5" filter="url(#lp-f5-glow)" />
          <circle cx={x} cy={y} r={r} fill="#a8ffe2" />
        </g>
      ))}
      <path d="M144 50 L154 70 L144 90" stroke="#03242a" strokeWidth="1.6" fill="none" />
      <path d="M144 50 L154 70 L144 90" stroke="#3affb6" strokeWidth="3" fill="none" opacity="0.4" filter="url(#lp-f5-glow)" />
      <circle cx="170" cy="62" r="9" fill="#3affb6" opacity="0.35" filter="url(#lp-f5-glow)" />
      <circle cx="170" cy="62" r="5.5" fill="#020a0c" />
      <circle cx="170" cy="62" r="3.6" fill="#3affb6" />
      <circle cx="170" cy="62" r="1.6" fill="#020a0c" />
      <circle cx="171.4" cy="60.4" r="0.9" fill="#e8fff0" />
      <path d="M180 66 L194 70 L190 76 L182 74 L186 80 L178 76 Z" fill="#020a0c" />
      <path d="M180 70 L181.5 73 L183 70 L184.5 73 L186 70 L187.5 73 L189 70" stroke="#a8ffe2" strokeWidth="0.5" fill="none" />
      {([[34,22,1],[48,12,0.7],[160,18,0.8],[178,30,1],[16,90,0.7],[176,118,1]] as [number,number,number][]).map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#3affb6" opacity={0.5+r*0.3} />
      ))}
    </svg>
  )
}

export function RankFish6({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-f6-body" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#c4b5ff" />
          <stop offset="40%" stopColor="#5e4ad6" />
          <stop offset="100%" stopColor="#1a0e44" />
        </linearGradient>
        <linearGradient id="lp-f6-facet1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e8defc" />
          <stop offset="100%" stopColor="#5e4ad6" />
        </linearGradient>
        <linearGradient id="lp-f6-facet2" x1="0" x2="1">
          <stop offset="0%" stopColor="#5e4ad6" />
          <stop offset="100%" stopColor="#1a0e44" />
        </linearGradient>
        <linearGradient id="lp-f6-prism" x1="0" x2="1">
          <stop offset="0%" stopColor="#ff7ad9" />
          <stop offset="33%" stopColor="#7af0ff" />
          <stop offset="66%" stopColor="#c4b5ff" />
          <stop offset="100%" stopColor="#ffd86b" />
        </linearGradient>
        <radialGradient id="lp-f6-aura" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#c4b5ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c4b5ff" stopOpacity="0" />
        </radialGradient>
        <filter id="lp-f6-glow"><feGaussianBlur stdDeviation="1.3" /></filter>
      </defs>
      <ellipse cx="100" cy="70" rx="100" ry="48" fill="url(#lp-f6-aura)" />
      <path d="M100 70 L20 14" stroke="url(#lp-f6-prism)" strokeWidth="0.6" opacity="0.4" />
      <path d="M100 70 L180 14" stroke="url(#lp-f6-prism)" strokeWidth="0.6" opacity="0.4" />
      <path d="M100 70 L20 126" stroke="url(#lp-f6-prism)" strokeWidth="0.6" opacity="0.4" />
      <path d="M100 70 L180 126" stroke="url(#lp-f6-prism)" strokeWidth="0.6" opacity="0.4" />
      <path d="M28 70 L4 30 L20 58 Z" fill="#1a0e44" />
      <path d="M28 70 L4 30 L20 58 Z" fill="url(#lp-f6-prism)" opacity="0.25" />
      <path d="M4 30 L20 58" stroke="#c4b5ff" strokeWidth="0.9" />
      <path d="M28 70 L4 110 L20 82 Z" fill="#1a0e44" />
      <path d="M28 70 L4 110 L20 82 Z" fill="url(#lp-f6-prism)" opacity="0.25" />
      <path d="M4 110 L20 82" stroke="#c4b5ff" strokeWidth="0.9" />
      <path d="M28 70 Q56 24 134 38 Q180 48 192 70 Q180 92 134 102 Q56 116 28 70 Z" fill="url(#lp-f6-body)" />
      <path d="M28 70 L70 36 L120 50 L100 70 Z" fill="url(#lp-f6-facet1)" opacity="0.45" />
      <path d="M28 70 L70 104 L120 90 L100 70 Z" fill="url(#lp-f6-facet2)" opacity="0.5" />
      <path d="M100 70 L120 50 L170 56 L160 70 Z" fill="url(#lp-f6-facet1)" opacity="0.35" />
      <path d="M100 70 L120 90 L170 84 L160 70 Z" fill="url(#lp-f6-facet2)" opacity="0.45" />
      <path d="M160 70 L170 56 L188 64 Z" fill="url(#lp-f6-facet1)" opacity="0.5" />
      <path d="M160 70 L170 84 L188 76 Z" fill="url(#lp-f6-facet2)" opacity="0.55" />
      <g stroke="#c4b5ff" strokeWidth="0.6" fill="none" opacity="0.6">
        <path d="M28 70 L70 36 L120 50 L100 70 Z" />
        <path d="M28 70 L70 104 L120 90 L100 70 Z" />
        <path d="M100 70 L120 50 L170 56 L160 70 Z" />
        <path d="M100 70 L120 90 L170 84 L160 70 Z" />
        <path d="M160 70 L170 56 L188 64" />
        <path d="M160 70 L170 84 L188 76" />
        <path d="M70 36 L70 104" />
        <path d="M120 50 L120 90" />
        <path d="M170 56 L170 84" />
      </g>
      <path d="M104 84 L80 114 L120 94 Z" fill="#1a0e44" />
      <path d="M104 84 L80 114 L120 94" stroke="url(#lp-f6-prism)" strokeWidth="0.9" fill="none" opacity="0.8" />
      <path d="M126 96 L132 114 L150 98 Z" fill="#1a0e44" />
      <path d="M148 52 L156 70 L148 88" stroke="#5e4ad6" strokeWidth="1.4" fill="none" />
      <path d="M148 52 L156 70 L148 88" stroke="#c4b5ff" strokeWidth="3" fill="none" opacity="0.35" filter="url(#lp-f6-glow)" />
      <circle cx="170" cy="64" r="10" fill="#c4b5ff" opacity="0.3" filter="url(#lp-f6-glow)" />
      <circle cx="170" cy="64" r="6" fill="#020618" />
      <path d="M170 58 L176 64 L170 70 L164 64 Z" fill="url(#lp-f6-prism)" />
      <path d="M170 58 L176 64 L170 64 Z" fill="#e8defc" opacity="0.7" />
      <circle cx="170" cy="64" r="1.5" fill="#020618" />
      <circle cx="171.4" cy="62" r="0.8" fill="#ffffff" />
      <path d="M180 70 L194 70 L192 78 L178 76 Z" fill="#020618" />
      <path d="M181 71 L182 75 L184 71 L185.5 75 L187 71 L188.5 75" stroke="#c4b5ff" strokeWidth="0.5" fill="none" />
      {([[40,20],[170,18],[20,114],[176,118],[100,8],[64,18]] as [number,number][]).map(([x,y],i) => (
        <g key={i}>
          <path d={`M${x} ${y-3} L${x} ${y+3} M${x-3} ${y} L${x+3} ${y}`} stroke="#c4b5ff" strokeWidth="0.8" />
          <circle cx={x} cy={y} r="1" fill="#ffffff" />
        </g>
      ))}
    </svg>
  )
}

// ─── SHARK IV-VI (advanced coach tiers) ────────────────────────────────────

export function RankShark4({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-s4-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a3640" />
          <stop offset="50%" stopColor="#16131c" />
          <stop offset="100%" stopColor="#020005" />
        </linearGradient>
        <linearGradient id="lp-s4-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a5260" />
          <stop offset="100%" stopColor="#1c1822" />
        </linearGradient>
        <linearGradient id="lp-s4-blood" x1="0" x2="1">
          <stop offset="0%" stopColor="#ff3a4a" />
          <stop offset="100%" stopColor="#8a0010" />
        </linearGradient>
        <radialGradient id="lp-s4-eyered" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ff3a4a" stopOpacity="1" />
          <stop offset="100%" stopColor="#ff3a4a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lp-s4-aura" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#ff3a4a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ff3a4a" stopOpacity="0" />
        </radialGradient>
        <filter id="lp-s4-glow"><feGaussianBlur stdDeviation="1.3" /></filter>
      </defs>
      <ellipse cx="100" cy="70" rx="100" ry="50" fill="url(#lp-s4-aura)" />
      <path d="M14 70 L0 22 L14 50 L0 70 L14 90 L0 118 Z" fill="#020005" />
      <path d="M14 70 L4 32 L14 54 L14 86 L4 108 Z" fill="#16131c" opacity="0.9" />
      <path d="M0 22 L14 50" stroke="url(#lp-s4-blood)" strokeWidth="0.9" opacity="0.95" />
      <path d="M0 118 L14 90" stroke="url(#lp-s4-blood)" strokeWidth="0.9" opacity="0.95" />
      <path d="M14 70 Q40 28 124 36 Q180 44 196 70 Q180 96 124 104 Q40 112 14 70 Z" fill="url(#lp-s4-body)" />
      <path d="M14 70 Q40 28 124 36 Q160 42 180 56 Q140 50 90 56 Q50 62 14 70 Z" fill="#3a3640" opacity="0.5" />
      <path d="M30 86 Q88 102 150 94 Q180 90 192 80 Q166 102 116 104 Q56 104 30 86 Z" fill="url(#lp-s4-belly)" />
      <path d="M28 72 Q100 64 192 70" stroke="url(#lp-s4-blood)" strokeWidth="0.7" fill="none" opacity="0.8" />
      <path d="M62 50 L82 60" stroke="#7a6a78" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M70 44 L86 58" stroke="#7a6a78" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M78 46 L92 56" stroke="#7a6a78" strokeWidth="1.0" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M100 80 L116 72" stroke="#7a6a78" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d="M106 86 L120 78" stroke="#7a6a78" strokeWidth="1.0" fill="none" strokeLinecap="round" opacity="0.65" />
      <path d="M88 64 L110 76" stroke="url(#lp-s4-blood)" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M88 64 L110 76" stroke="#ff3a4a" strokeWidth="3" fill="none" opacity="0.3" filter="url(#lp-s4-glow)" />
      <path d="M68 44 L88 4 L96 14 L102 6 L116 48 Z" fill="#020005" />
      <path d="M68 44 L88 4 L96 14 L102 6 L116 48" stroke="url(#lp-s4-blood)" strokeWidth="1" fill="none" opacity="0.95" />
      <path d="M88 4 L96 14 L102 6" stroke="#ff3a4a" strokeWidth="0.8" fill="none" />
      <path d="M134 52 L144 36 L154 56 Z" fill="#020005" />
      <path d="M134 52 L144 36 L154 56" stroke="url(#lp-s4-blood)" strokeWidth="0.7" fill="none" opacity="0.85" />
      <path d="M86 86 L60 118 L78 108 L74 120 L106 96 Z" fill="#020005" />
      <path d="M86 86 L74 108 L102 96 Z" fill="#16131c" opacity="0.85" />
      <path d="M86 86 L60 118" stroke="url(#lp-s4-blood)" strokeWidth="0.9" opacity="0.9" />
      <path d="M124 96 L132 112 L150 98 Z" fill="#020005" />
      {[0,1,2,3,4].map((i) => (
        <g key={i}>
          <path d={`M${134+i*4.5} 56 Q${132+i*4.5} 70 ${134+i*4.5} 84`} stroke="#020005" strokeWidth="1.4" fill="none" />
          <path d={`M${135+i*4.5} 60 Q${133+i*4.5} 70 ${135+i*4.5} 80`} stroke="#ff3a4a" strokeWidth="0.6" fill="none" opacity="0.7" />
        </g>
      ))}
      <circle cx="168" cy="62" r="11" fill="url(#lp-s4-eyered)" opacity="0.7" />
      <circle cx="168" cy="62" r="5.5" fill="#020005" />
      <circle cx="168" cy="62" r="3.8" fill="#ff3a4a" />
      <circle cx="168" cy="62" r="1.8" fill="#020005" />
      <circle cx="169" cy="60.6" r="0.8" fill="#ffd6db" />
      <path d="M158 50 L176 78" stroke="#7a6a78" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M174 70 L196 70 L192 82 L172 78 Z" fill="#020005" />
      <path d="M176 71 L177 75 L179 71 L180.5 75 L182 71 L183.5 75 L185 71 L186.5 75 L188 71 L189.5 75 L191 71 L192.5 75" stroke="#e8eef5" strokeWidth="0.55" fill="none" />
      <path d="M176 78 L177.5 76 L179 78 L180.5 76 L182 78 L183.5 76 L185 78 L186.5 76 L188 78 L189.5 76 L191 78" stroke="#e8eef5" strokeWidth="0.45" fill="none" opacity="0.7" />
      <circle cx="182" cy="58" r="0.9" fill="#020005" />
    </svg>
  )
}

export function RankShark5({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-s5-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e8f4ff" />
          <stop offset="35%" stopColor="#7faecc" />
          <stop offset="70%" stopColor="#1e3450" />
          <stop offset="100%" stopColor="#040a16" />
        </linearGradient>
        <linearGradient id="lp-s5-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cfe6f8" />
          <stop offset="100%" stopColor="#2a4868" />
        </linearGradient>
        <linearGradient id="lp-s5-platinum" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#cfe2f5" />
          <stop offset="65%" stopColor="#8aa4c2" />
          <stop offset="100%" stopColor="#dde9f5" />
        </linearGradient>
        <linearGradient id="lp-s5-holo" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#a8e6ff" />
          <stop offset="50%" stopColor="#cfb5ff" />
          <stop offset="100%" stopColor="#a8fff0" />
        </linearGradient>
        <radialGradient id="lp-s5-eye" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#a8e6ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a8e6ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lp-s5-aura" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#a8e6ff" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#cfb5ff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#a8e6ff" stopOpacity="0" />
        </radialGradient>
        <filter id="lp-s5-glow"><feGaussianBlur stdDeviation="1.4" /></filter>
        <filter id="lp-s5-bigblur"><feGaussianBlur stdDeviation="3" /></filter>
        <clipPath id="lp-s5-bodyclip">
          <path d="M14 70 Q40 28 124 36 Q180 44 196 70 Q180 96 124 104 Q40 112 14 70 Z" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="70" rx="100" ry="52" fill="url(#lp-s5-aura)" />
      <path d="M2 30 Q40 38 80 28 Q120 18 160 26" stroke="url(#lp-s5-holo)" strokeWidth="0.7" fill="none" opacity="0.7" filter="url(#lp-s5-glow)" />
      <path d="M2 110 Q40 102 80 112 Q120 122 160 114" stroke="url(#lp-s5-holo)" strokeWidth="0.7" fill="none" opacity="0.7" filter="url(#lp-s5-glow)" />
      <path d="M2 30 Q40 38 80 28 Q120 18 160 26" stroke="#ffffff" strokeWidth="0.4" fill="none" opacity="0.8" />
      <path d="M2 110 Q40 102 80 112 Q120 122 160 114" stroke="#ffffff" strokeWidth="0.4" fill="none" opacity="0.8" />
      <g opacity="0.22" filter="url(#lp-s5-bigblur)">
        <path d="M28 70 Q54 34 130 44 Q170 50 184 70 Q170 90 130 96 Q54 106 28 70 Z" fill="#a8e6ff" />
      </g>
      <path d="M14 70 L0 22 L14 52 L2 70 L14 88 L0 118 Z" fill="#040a16" />
      <path d="M14 70 L4 32 L14 56 L14 84 L4 108 Z" fill="#1e3450" opacity="0.95" />
      <path d="M0 22 L14 52" stroke="url(#lp-s5-platinum)" strokeWidth="1.2" />
      <path d="M0 118 L14 88" stroke="url(#lp-s5-platinum)" strokeWidth="1.2" />
      <path d="M0 22 L14 52" stroke="#a8e6ff" strokeWidth="3" opacity="0.4" filter="url(#lp-s5-glow)" />
      <path d="M0 118 L14 88" stroke="#a8e6ff" strokeWidth="3" opacity="0.4" filter="url(#lp-s5-glow)" />
      <path d="M14 70 Q40 28 124 36 Q180 44 196 70 Q180 96 124 104 Q40 112 14 70 Z" fill="url(#lp-s5-body)" />
      <g clipPath="url(#lp-s5-bodyclip)">
        <path d="M14 70 Q60 30 130 40 Q140 56 70 60 Q40 62 14 70 Z" fill="url(#lp-s5-holo)" opacity="0.28" />
        <path d="M14 70 Q60 110 130 100 Q140 84 70 80 Q40 78 14 70 Z" fill="url(#lp-s5-holo)" opacity="0.22" />
        {[0,1,2,3,4,5,6,7].map((i) => (
          <path key={i} d={`M${30+i*18} 56 Q${38+i*18} 70 ${30+i*18} 84`} stroke="url(#lp-s5-platinum)" strokeWidth="0.5" fill="none" opacity="0.5" />
        ))}
        <path d="M28 70 Q100 64 188 70" stroke="url(#lp-s5-platinum)" strokeWidth="0.9" fill="none" opacity="0.85" />
        <path d="M28 70 Q100 64 188 70" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.35" filter="url(#lp-s5-glow)" />
        <path d="M22 60 Q90 40 180 56" stroke="url(#lp-s5-platinum)" strokeWidth="0.6" fill="none" opacity="0.65" />
      </g>
      <path d="M30 86 Q88 102 150 94 Q178 90 192 80 Q166 102 116 104 Q56 104 30 86 Z" fill="url(#lp-s5-belly)" opacity="0.55" />
      <path d="M14 70 Q40 28 124 36 Q180 44 196 70 Q180 96 124 104 Q40 112 14 70 Z" stroke="url(#lp-s5-platinum)" strokeWidth="1" fill="none" />
      <path d="M14 70 Q40 28 124 36 Q180 44 196 70 Q180 96 124 104 Q40 112 14 70 Z" stroke="#a8e6ff" strokeWidth="2.8" fill="none" opacity="0.32" filter="url(#lp-s5-glow)" />
      <path d="M66 44 L88 6 L96 14 L104 4 L116 48 Z" fill="#040a16" />
      <path d="M66 44 L88 6 L96 14 L104 4 L116 48 Z" fill="url(#lp-s5-holo)" opacity="0.28" />
      <path d="M76 44 L92 18 L104 44 Z" fill="url(#lp-s5-platinum)" opacity="0.25" />
      <path d="M66 44 L88 6 L96 14 L104 4 L116 48" stroke="url(#lp-s5-platinum)" strokeWidth="1.3" fill="none" />
      <path d="M66 44 L88 6 L96 14 L104 4 L116 48" stroke="#a8e6ff" strokeWidth="3" fill="none" opacity="0.35" filter="url(#lp-s5-glow)" />
      <path d="M96 12 L100 14 L100 18 L96 20 L92 18 L92 14 Z" fill="url(#lp-s5-holo)" />
      <path d="M96 12 L100 14 L100 18 L96 20 L92 18 L92 14 Z" stroke="#ffffff" strokeWidth="0.5" fill="none" />
      <path d="M132 52 L144 32 L156 56 Z" fill="#040a16" />
      <path d="M132 52 L144 32 L156 56" stroke="url(#lp-s5-platinum)" strokeWidth="1" fill="none" />
      <path d="M132 52 L144 32 L156 56" stroke="#a8e6ff" strokeWidth="2.2" fill="none" opacity="0.3" filter="url(#lp-s5-glow)" />
      <path d="M86 84 L58 116 L72 110 L66 122 L82 114 L78 124 L106 96 Z" fill="#040a16" />
      <path d="M86 84 L72 108 L102 96 Z" fill="url(#lp-s5-holo)" opacity="0.32" />
      <path d="M86 84 L58 116" stroke="url(#lp-s5-platinum)" strokeWidth="1.1" />
      <path d="M86 84 L58 116" stroke="#a8e6ff" strokeWidth="2.8" opacity="0.32" filter="url(#lp-s5-glow)" />
      <path d="M86 84 L82 114" stroke="url(#lp-s5-platinum)" strokeWidth="0.5" opacity="0.7" />
      <path d="M86 84 L72 110" stroke="url(#lp-s5-platinum)" strokeWidth="0.5" opacity="0.7" />
      <path d="M124 96 L132 116 L150 98 Z" fill="#040a16" />
      <path d="M124 96 L132 116 L150 98" stroke="url(#lp-s5-platinum)" strokeWidth="0.8" fill="none" />
      <path d="M124 96 L132 116 L150 98" stroke="#a8e6ff" strokeWidth="2" fill="none" opacity="0.3" filter="url(#lp-s5-glow)" />
      {[0,1,2,3,4].map((i) => (
        <g key={i}>
          <path d={`M${134+i*4.5} 56 Q${132+i*4.5} 70 ${134+i*4.5} 84`} stroke="#020812" strokeWidth="1.4" fill="none" />
          <path d={`M${135+i*4.5} 60 Q${133+i*4.5} 70 ${135+i*4.5} 80`} stroke="url(#lp-s5-platinum)" strokeWidth="0.7" fill="none" opacity="0.95" />
          <path d={`M${135+i*4.5} 60 Q${133+i*4.5} 70 ${135+i*4.5} 80`} stroke="#a8e6ff" strokeWidth="1.6" fill="none" opacity="0.4" filter="url(#lp-s5-glow)" />
        </g>
      ))}
      <path d="M64 52 L80 60" stroke="url(#lp-s5-platinum)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M72 48 L84 58" stroke="url(#lp-s5-platinum)" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.6" />
      <circle cx="168" cy="62" r="14" fill="url(#lp-s5-eye)" opacity="0.5" filter="url(#lp-s5-bigblur)" />
      <circle cx="168" cy="62" r="9" fill="url(#lp-s5-eye)" opacity="0.85" />
      <circle cx="168" cy="62" r="5.5" fill="#020812" />
      <circle cx="168" cy="62" r="4" fill="url(#lp-s5-holo)" />
      <circle cx="168" cy="62" r="2" fill="#020812" />
      <circle cx="168.8" cy="60.6" r="0.9" fill="#ffffff" />
      <path d="M168 52 L168 72 M158 62 L178 62" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
      <path d="M174 70 L196 70 L192 82 L172 78 Z" fill="#020812" />
      <path d="M174 70 L196 70" stroke="url(#lp-s5-platinum)" strokeWidth="0.6" />
      <path d="M176 71 L177 76 L179 71 L180.5 76 L182 71 L183.5 76 L185 71 L186.5 76 L188 71 L189.5 76 L191 71 L192.5 76" stroke="#ffffff" strokeWidth="0.6" fill="none" />
      <path d="M176 78 L177.5 75 L179 78 L180.5 75 L182 78 L183.5 75 L185 78 L186.5 75 L188 78 L189.5 75 L191 78" stroke="#cfe2f5" strokeWidth="0.5" fill="none" opacity="0.85" />
      <circle cx="182" cy="58" r="0.9" fill="#020812" />
      {([[34,18,1.4,'#ffffff'],[170,16,1.2,'#cfb5ff'],[20,116,1.3,'#a8e6ff'],[176,120,1.1,'#ffffff'],[100,4,1,'#a8fff0']] as [number,number,number,string][]).map(([x,y,r,c],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r*2.5} fill={c} opacity="0.5" filter="url(#lp-s5-glow)" />
          <circle cx={x} cy={y} r={r} fill="#ffffff" />
        </g>
      ))}
      {([[40,28],[166,22],[180,108],[24,98]] as [number,number][]).map(([x,y],i) => (
        <path key={i} d={`M${x} ${y-3.5} L${x} ${y+3.5} M${x-3.5} ${y} L${x+3.5} ${y}`} stroke="url(#lp-s5-platinum)" strokeWidth="0.7" />
      ))}
    </svg>
  )
}

export function RankShark6({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-s6-body" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#1a0e44" />
          <stop offset="40%" stopColor="#0a0524" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <linearGradient id="lp-s6-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a2a7a" />
          <stop offset="100%" stopColor="#0a0524" />
        </linearGradient>
        <linearGradient id="lp-s6-rim" x1="0" x2="1">
          <stop offset="0%" stopColor="#ff7ad9" />
          <stop offset="50%" stopColor="#7af0ff" />
          <stop offset="100%" stopColor="#ffd86b" />
        </linearGradient>
        <radialGradient id="lp-s6-eye" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor="#ffd86b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff7ad9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lp-s6-galaxy" cx="0.4" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#a86bff" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#5e2aa8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0a0524" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lp-s6-aura" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#a86bff" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#7af0ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#a86bff" stopOpacity="0" />
        </radialGradient>
        <filter id="lp-s6-glow"><feGaussianBlur stdDeviation="1.5" /></filter>
        <filter id="lp-s6-bigglow"><feGaussianBlur stdDeviation="3.5" /></filter>
        <clipPath id="lp-s6-bodyclip">
          <path d="M14 70 Q40 26 124 34 Q180 42 196 70 Q180 98 124 106 Q40 114 14 70 Z" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="70" rx="100" ry="55" fill="url(#lp-s6-aura)" />
      <ellipse cx="100" cy="70" rx="90" ry="40" fill="url(#lp-s6-rim)" opacity="0.18" filter="url(#lp-s6-bigglow)" />
      <path d="M14 70 L0 18 L14 50 L0 70 L14 90 L0 122 Z" fill="#000000" />
      <path d="M14 70 L4 28 L14 54 L14 86 L4 112 Z" fill="url(#lp-s6-galaxy)" opacity="0.7" />
      <path d="M0 18 L14 50" stroke="url(#lp-s6-rim)" strokeWidth="1.2" />
      <path d="M0 122 L14 90" stroke="url(#lp-s6-rim)" strokeWidth="1.2" />
      <path d="M0 18 L14 50" stroke="#ff7ad9" strokeWidth="3" opacity="0.4" filter="url(#lp-s6-glow)" />
      <path d="M0 122 L14 90" stroke="#ffd86b" strokeWidth="3" opacity="0.4" filter="url(#lp-s6-glow)" />
      <path d="M14 70 Q40 26 124 34 Q180 42 196 70 Q180 98 124 106 Q40 114 14 70 Z" fill="url(#lp-s6-body)" />
      <g clipPath="url(#lp-s6-bodyclip)">
        <ellipse cx="80" cy="60" rx="60" ry="22" fill="url(#lp-s6-galaxy)" opacity="0.9" />
        <ellipse cx="120" cy="80" rx="50" ry="18" fill="#ff7ad9" opacity="0.18" filter="url(#lp-s6-glow)" />
        <ellipse cx="60" cy="80" rx="40" ry="14" fill="#7af0ff" opacity="0.18" filter="url(#lp-s6-glow)" />
        <path d="M50 78 Q90 50 140 64 Q120 76 90 76 Q70 78 50 78 Z" fill="#a86bff" opacity="0.35" filter="url(#lp-s6-glow)" />
        {([
          [30,60,0.7],[42,52,1.2],[54,72,0.8],[66,58,1],[78,76,0.6],[90,52,1.1],[102,72,0.9],
          [114,58,1.3],[126,76,0.7],[138,52,1],[150,68,0.8],[162,76,0.6],[36,80,0.9],
          [48,90,0.7],[68,90,1.2],[88,92,0.6],[108,90,1],[128,92,0.8],[148,88,1.1],
          [160,60,1.4],[174,72,0.9],[180,58,0.7],[24,72,0.8],[20,84,0.6],[60,46,0.7],[100,44,0.9],[140,42,0.8]
        ] as [number,number,number][]).map(([x,y,r],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r*1.8} fill="#ffffff" opacity="0.5" filter="url(#lp-s6-glow)" />
            <circle cx={x} cy={y} r={r*0.7} fill="#ffffff" />
          </g>
        ))}
        {([[78,52],[132,84],[44,68]] as [number,number][]).map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#ffd86b" opacity="0.4" filter="url(#lp-s6-glow)" />
            <path d={`M${x} ${y-3.5} L${x} ${y+3.5} M${x-3.5} ${y} L${x+3.5} ${y}`} stroke="#ffffff" strokeWidth="0.7" />
            <circle cx={x} cy={y} r="0.9" fill="#ffffff" />
          </g>
        ))}
      </g>
      <path d="M14 70 Q40 26 124 34 Q180 42 196 70 Q180 98 124 106 Q40 114 14 70 Z" stroke="url(#lp-s6-rim)" strokeWidth="1.1" fill="none" />
      <path d="M14 70 Q40 26 124 34 Q180 42 196 70 Q180 98 124 106 Q40 114 14 70 Z" stroke="#a86bff" strokeWidth="3" fill="none" opacity="0.35" filter="url(#lp-s6-glow)" />
      <path d="M30 88 Q88 104 150 96 Q180 92 192 80 Q166 104 116 106 Q56 106 30 88 Z" fill="url(#lp-s6-belly)" opacity="0.6" />
      <path d="M68 42 L90 2 L98 12 L106 0 L116 46 Z" fill="#000000" />
      <path d="M68 42 L90 2 L98 12 L106 0 L116 46 Z" fill="url(#lp-s6-galaxy)" opacity="0.7" />
      <path d="M68 42 L90 2 L98 12 L106 0 L116 46" stroke="url(#lp-s6-rim)" strokeWidth="1.4" fill="none" />
      <path d="M68 42 L90 2 L98 12 L106 0 L116 46" stroke="#ff7ad9" strokeWidth="3.5" fill="none" opacity="0.3" filter="url(#lp-s6-glow)" />
      <circle cx="92" cy="14" r="0.8" fill="#ffffff" />
      <circle cx="100" cy="22" r="0.6" fill="#ffffff" />
      <circle cx="86" cy="26" r="0.5" fill="#ffd86b" />
      <path d="M134 50 L146 32 L156 56 Z" fill="#000000" />
      <path d="M134 50 L146 32 L156 56" stroke="url(#lp-s6-rim)" strokeWidth="0.9" fill="none" />
      <path d="M86 86 L58 122 L80 110 L76 122 L106 96 Z" fill="#000000" />
      <path d="M86 86 L74 110 L102 96 Z" fill="url(#lp-s6-galaxy)" opacity="0.6" />
      <path d="M86 86 L58 122" stroke="url(#lp-s6-rim)" strokeWidth="1.2" />
      <path d="M86 86 L58 122" stroke="#ff7ad9" strokeWidth="3" opacity="0.3" filter="url(#lp-s6-glow)" />
      <path d="M124 98 L132 116 L150 100 Z" fill="#000000" />
      <path d="M124 98 L132 116 L150 100" stroke="url(#lp-s6-rim)" strokeWidth="0.7" fill="none" />
      {[0,1,2,3,4].map((i) => (
        <g key={i}>
          <path d={`M${134+i*4.5} 56 Q${132+i*4.5} 70 ${134+i*4.5} 84`} stroke="#000000" strokeWidth="1.4" fill="none" />
          <path d={`M${135+i*4.5} 60 Q${133+i*4.5} 70 ${135+i*4.5} 80`} stroke="url(#lp-s6-rim)" strokeWidth="0.7" fill="none" opacity="0.95" />
        </g>
      ))}
      <circle cx="168" cy="62" r="16" fill="url(#lp-s6-eye)" opacity="0.7" filter="url(#lp-s6-bigglow)" />
      <circle cx="168" cy="62" r="9" fill="url(#lp-s6-eye)" opacity="0.95" />
      <circle cx="168" cy="62" r="5" fill="#000000" />
      <circle cx="168" cy="62" r="3.4" fill="#ffd86b" />
      <circle cx="168" cy="62" r="1.8" fill="#ffffff" />
      <path d="M168 50 L168 74 M156 62 L180 62" stroke="#ffffff" strokeWidth="0.6" opacity="0.7" />
      <path d="M174 72 L196 72 L194 84 L172 80 Z" fill="#000000" />
      <path d="M174 72 L196 72" stroke="url(#lp-s6-rim)" strokeWidth="0.7" />
      <path d="M176 73 L177 78 L179 73 L180.5 78 L182 73 L183.5 78 L185 73 L186.5 78 L188 73 L189.5 78 L191 73 L192.5 78 L194 73" stroke="#ffffff" strokeWidth="0.6" fill="none" />
      <path d="M176 80 L177.5 77 L179 80 L180.5 77 L182 80 L183.5 77 L185 80 L186.5 77 L188 80 L189.5 77 L191 80 L192.5 77" stroke="#ffffff" strokeWidth="0.5" fill="none" opacity="0.8" />
      <circle cx="182" cy="58" r="0.9" fill="#000000" />
      {([[26,16,1.4,'#ff7ad9'],[180,22,1.2,'#7af0ff'],[180,116,1.5,'#ffd86b'],[18,118,1.1,'#a86bff'],[100,4,1,'#ffffff'],[110,128,0.9,'#7af0ff'],[8,68,1,'#ffd86b']] as [number,number,number,string][]).map(([x,y,r,c],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r*2.5} fill={c} opacity="0.5" filter="url(#lp-s6-glow)" />
          <circle cx={x} cy={y} r={r} fill="#ffffff" />
        </g>
      ))}
      {([[34,28],[166,18],[180,108]] as [number,number][]).map(([x,y],i) => (
        <g key={i}>
          <path d={`M${x} ${y-3.5} L${x} ${y+3.5} M${x-3.5} ${y} L${x+3.5} ${y}`} stroke="url(#lp-s6-rim)" strokeWidth="0.8" />
        </g>
      ))}
    </svg>
  )
}
