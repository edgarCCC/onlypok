'use client'

export default function FourAcesLoader({ fullPage = true }: { fullPage?: boolean }) {
  const wrap: React.CSSProperties = fullPage
    ? { minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center' }
    : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }

  return (
    <div style={wrap}>
      <div style={{ position: 'relative', width: 140, height: 120 }}>

        {/* SVG symbol defs */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <symbol id="fal-spade" viewBox="0 0 100 100">
              <path d="M50 8 C70 38, 92 50, 92 70 C92 86, 78 94, 66 88 C58 84, 54 78, 50 70 C46 78, 42 84, 34 88 C22 94, 8 86, 8 70 C8 50, 30 38, 50 8 Z M40 92 L60 92 L55 78 L45 78 Z"/>
            </symbol>
            <symbol id="fal-heart" viewBox="0 0 100 100">
              <path d="M50 92 C30 70, 8 58, 8 38 C8 22, 22 12, 34 18 C42 22, 46 28, 50 36 C54 28, 58 22, 66 18 C78 12, 92 22, 92 38 C92 58, 70 70, 50 92 Z"/>
            </symbol>
            <symbol id="fal-diamond" viewBox="0 0 100 100">
              <path d="M50 8 L92 50 L50 92 L8 50 Z"/>
            </symbol>
            <symbol id="fal-club" viewBox="0 0 100 100">
              <circle cx="50" cy="32" r="18"/>
              <circle cx="30" cy="62" r="18"/>
              <circle cx="70" cy="62" r="18"/>
              <path d="M40 92 L60 92 L55 72 L45 72 Z"/>
            </symbol>
          </defs>
        </svg>

        {/* Card 1 — ♠ left */}
        <div className="fal-c fal-left" style={{ animationDelay: '0s', zIndex: 4 }}>
          <Pip suit="fal-spade" pos="tl" />
          <CenterSvg suit="fal-spade" />
          <Pip suit="fal-spade" pos="br" />
        </div>

        {/* Card 2 — ♥ right */}
        <div className="fal-c fal-right" style={{ animationDelay: '0.18s', zIndex: 3 }}>
          <Pip suit="fal-heart" pos="tl" />
          <CenterSvg suit="fal-heart" />
          <Pip suit="fal-heart" pos="br" />
        </div>

        {/* Card 3 — ♦ left */}
        <div className="fal-c fal-left" style={{ animationDelay: '0.36s', zIndex: 2 }}>
          <Pip suit="fal-diamond" pos="tl" />
          <CenterSvg suit="fal-diamond" />
          <Pip suit="fal-diamond" pos="br" />
        </div>

        {/* Card 4 — ♣ right */}
        <div className="fal-c fal-right" style={{ animationDelay: '0.54s', zIndex: 1 }}>
          <Pip suit="fal-club" pos="tl" />
          <CenterSvg suit="fal-club" />
          <Pip suit="fal-club" pos="br" />
        </div>
      </div>

      <style>{`
        .fal-c {
          position: absolute;
          width: 44px; height: 64px;
          border: 1.5px solid #0a0a0a;
          border-radius: 4px;
          background: #fff;
          top: 28px;
          display: flex; align-items: center; justify-content: center;
          animation-duration: 2.2s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .fal-left  { left: 8px;  animation-name: fal-left; }
        .fal-right { right: 8px; animation-name: fal-right; }
        .fal-pip {
          position: absolute;
          font-family: "Times New Roman", serif;
          font-weight: 600; font-size: 9px; line-height: 1;
          color: #0a0a0a;
          display: flex; flex-direction: column; align-items: center; gap: 1px;
        }
        .fal-pip.tl { top: 4px; left: 4px; }
        .fal-pip.br { bottom: 4px; right: 4px; transform: rotate(180deg); }
        .fal-pip svg { width: 7px; height: 7px; fill: #0a0a0a; display: block; }
        .fal-center { width: 18px; height: 18px; fill: #0a0a0a; }

        @keyframes fal-left {
          0%, 8%    { transform: translate(0,0) rotate(0deg); opacity: 1; }
          35%       { transform: translate(38px,-20px) rotate(-10deg); opacity: 1; }
          50%       { transform: translate(56px,0) rotate(0deg); opacity: 1; }
          92%, 100% { transform: translate(56px,0) rotate(0deg); opacity: 0; }
        }
        @keyframes fal-right {
          0%, 8%    { transform: translate(0,0) rotate(0deg); opacity: 1; }
          35%       { transform: translate(-38px,20px) rotate(10deg); opacity: 1; }
          50%       { transform: translate(-56px,0) rotate(0deg); opacity: 1; }
          92%, 100% { transform: translate(-56px,0) rotate(0deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function Pip({ suit, pos }: { suit: string; pos: 'tl' | 'br' }) {
  return (
    <span className={`fal-pip ${pos}`}>
      A
      <svg><use href={`#${suit}`} /></svg>
    </span>
  )
}

function CenterSvg({ suit }: { suit: string }) {
  return (
    <svg className="fal-center">
      <use href={`#${suit}`} />
    </svg>
  )
}
